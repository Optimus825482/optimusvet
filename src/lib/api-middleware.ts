/**
 * API MIDDLEWARE HELPERS
 *
 * Composable middleware for API routes:
 * - Error handling
 * - Rate limiting
 * - Authentication
 * - Request validation
 * - Logging
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createErrorResponse, logError } from "@/lib/error-handler";
import { withRateLimit, RateLimitPresets } from "@/lib/rate-limit";
import { withRetry } from "@/lib/retry";
import { ZodSchema } from "zod";
import type { UserRole } from "@prisma/client";

// =====================================================
// TYPES
// =====================================================

export interface ApiContext {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
  requestId: string;
  ipAddress: string;
  userAgent: string;
}

export type ApiHandler<T = any> = (
  request: NextRequest,
  context: ApiContext,
) => Promise<NextResponse<T>>;

// =====================================================
// MIDDLEWARE FUNCTIONS
// =====================================================

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Get client IP address
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

/**
 * Create API context
 */
async function createContext(request: NextRequest): Promise<ApiContext> {
  const session = await auth();

  return {
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
        }
      : undefined,
    requestId: generateRequestId(),
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

/**
 * With error handling
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context: ApiContext) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Log error with context
      logError(error, {
        requestId: context.requestId,
        userId: context.user?.id,
        userEmail: context.user?.email,
        requestPath: request.nextUrl.pathname,
        requestMethod: request.method,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      // Return error response
      return createErrorResponse(error, context.requestId);
    }
  };
}

/**
 * With authentication
 */
export function withAuth(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context: ApiContext) => {
    if (!context.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Kimlik doğrulama gerekli",
            timestamp: new Date().toISOString(),
            requestId: context.requestId,
          },
        },
        { status: 401 },
      );
    }

    return handler(request, context);
  };
}

/**
 * With role-based authorization
 */
export function withRole(...allowedRoles: UserRole[]) {
  return function (handler: ApiHandler): ApiHandler {
    return async (request: NextRequest, context: ApiContext) => {
      if (!context.user) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Kimlik doğrulama gerekli",
              timestamp: new Date().toISOString(),
              requestId: context.requestId,
            },
          },
          { status: 401 },
        );
      }

      if (!allowedRoles.includes(context.user.role)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Bu işlem için yetkiniz yok",
              timestamp: new Date().toISOString(),
              requestId: context.requestId,
            },
          },
          { status: 403 },
        );
      }

      return handler(request, context);
    };
  };
}

/**
 * With request body validation
 */
export function withValidation<T>(schema: ZodSchema<T>) {
  return function (
    handler: (
      request: NextRequest,
      context: ApiContext,
      data: T,
    ) => Promise<NextResponse>,
  ): ApiHandler {
    return async (request: NextRequest, context: ApiContext) => {
      try {
        const body = await request.json();
        const validatedData = schema.parse(body);
        return handler(request, context, validatedData);
      } catch (error) {
        return createErrorResponse(error, context.requestId);
      }
    };
  };
}

/**
 * With logging
 */
export function withLogging(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context: ApiContext) => {
    const startTime = Date.now();

    console.log(`[API REQUEST] ${request.method} ${request.nextUrl.pathname}`, {
      requestId: context.requestId,
      userId: context.user?.id,
      ipAddress: context.ipAddress,
    });

    const response = await handler(request, context);

    const duration = Date.now() - startTime;

    console.log(
      `[API RESPONSE] ${request.method} ${request.nextUrl.pathname}`,
      {
        requestId: context.requestId,
        status: response.status,
        duration: `${duration}ms`,
      },
    );

    return response;
  };
}

/**
 * Compose multiple middleware functions
 */
export function compose(
  ...middlewares: Array<(handler: ApiHandler) => ApiHandler>
) {
  return function (handler: ApiHandler): ApiHandler {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler,
    );
  };
}

/**
 * Create API route with all standard middleware
 */
export function createApiRoute(handler: ApiHandler) {
  return async (request: NextRequest) => {
    const context = await createContext(request);

    const wrappedHandler = compose(withErrorHandling, withLogging)(handler);

    return wrappedHandler(request, context);
  };
}

/**
 * Create protected API route (with auth)
 */
export function createProtectedApiRoute(handler: ApiHandler) {
  return async (request: NextRequest) => {
    const context = await createContext(request);

    const wrappedHandler = compose(
      withErrorHandling,
      withLogging,
      withAuth,
    )(handler);

    return wrappedHandler(request, context);
  };
}

/**
 * Create admin API route (admin only)
 */
export function createAdminApiRoute(handler: ApiHandler) {
  return async (request: NextRequest) => {
    const context = await createContext(request);

    const wrappedHandler = compose(
      withErrorHandling,
      withLogging,
      withAuth,
      withRole("ADMIN"),
    )(handler);

    return wrappedHandler(request, context);
  };
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, meta?: Record<string, any>) {
  return NextResponse.json({
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

/**
 * Paginated response helper
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
) {
  return NextResponse.json({
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      pagination: {
        ...pagination,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page * pagination.limit < pagination.total,
        hasPrev: pagination.page > 1,
      },
    },
  });
}
