/**
 * UNIFIED API ROUTE HANDLER
 *
 * Bu modül tüm API route'ları için:
 * - Error tracking (veritabanı + email)
 * - Audit logging (eski veri dahil)
 * - User context yönetimi
 * sağlar.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { trackError } from "@/lib/error-tracking";
import { AuditContext } from "@/lib/audit";

// =====================================================
// TYPES
// =====================================================

export interface ApiRouteContext {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  auditContext: AuditContext;
  request: NextRequest;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  errorId?: string;
  code?: string;
  timestamp: string;
}

// Custom API Error class
export class ApiError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
  }

  private getDefaultCode(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return "BAD_REQUEST";
      case 401:
        return "UNAUTHORIZED";
      case 403:
        return "FORBIDDEN";
      case 404:
        return "NOT_FOUND";
      case 409:
        return "CONFLICT";
      case 422:
        return "VALIDATION_ERROR";
      case 500:
      default:
        return "INTERNAL_SERVER_ERROR";
    }
  }
}

// =====================================================
// MAIN HANDLER WRAPPER
// =====================================================

/**
 * Tüm API route'ları için unified wrapper.
 *
 * Otomatik olarak:
 * - User authentication
 * - Audit context setup
 * - Error tracking (veritabanı + email)
 * - Structured error responses
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withApiHandler(request, async (ctx) => {
 *     const data = await prisma.model.create({ ... });
 *     await auditCreate("table", data.id, data, ctx.auditContext);
 *     return NextResponse.json(data);
 *   });
 * }
 * ```
 */
export async function withApiHandler(
  request: NextRequest,
  handler: (context: ApiRouteContext) => Promise<NextResponse>,
  options?: {
    requireAuth?: boolean;
    component?: string;
  },
): Promise<NextResponse> {
  const { requireAuth = true, component = "API" } = options || {};

  try {
    // 1. Get user session
    const session = await auth();

    // 2. Check authentication if required
    if (requireAuth && !session?.user) {
      return createErrorResponse("Yetkisiz erişim", 401, "UNAUTHORIZED");
    }

    // 3. Build context
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const context: ApiRouteContext = {
      user: {
        id: session?.user?.id || "anonymous",
        name: session?.user?.name || null,
        email: session?.user?.email || null,
      },
      auditContext: {
        userId: session?.user?.id,
        userName: session?.user?.name || undefined,
        userEmail: session?.user?.email || undefined,
        ipAddress,
        userAgent,
        requestPath: request.nextUrl.pathname,
        requestMethod: request.method,
      },
      request,
    };

    // 4. Execute handler
    return await handler(context);
  } catch (error) {
    // 5. Handle errors
    return await handleApiError(error, request, component);
  }
}

/**
 * Auth gerektirmeyen route'lar için wrapper
 */
export async function withPublicApiHandler(
  request: NextRequest,
  handler: (context: ApiRouteContext) => Promise<NextResponse>,
  options?: { component?: string },
): Promise<NextResponse> {
  return withApiHandler(request, handler, { requireAuth: false, ...options });
}

// =====================================================
// ERROR HANDLING
// =====================================================

/**
 * API hatalarını işle:
 * 1. Veritabanına kaydet
 * 2. Severity HIGH ise email gönder
 * 3. Structured error response döndür
 */
async function handleApiError(
  error: unknown,
  request: NextRequest,
  component: string,
): Promise<NextResponse> {
  // Determine error details
  let message = "Beklenmeyen bir hata oluştu";
  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let stack: string | undefined;

  if (error instanceof ApiError) {
    message = error.message;
    statusCode = error.statusCode;
    code = error.code;
    stack = error.stack;
  } else if (error instanceof Error) {
    message = error.message;
    stack = error.stack;

    // Prisma error handling
    if ("code" in error) {
      const prismaCode = (error as any).code;
      switch (prismaCode) {
        case "P2002":
          message = "Bu kayıt zaten mevcut";
          statusCode = 409;
          code = "DUPLICATE_ENTRY";
          break;
        case "P2025":
          message = "Kayıt bulunamadı";
          statusCode = 404;
          code = "NOT_FOUND";
          break;
        case "P2003":
          message = "İlişkili kayıt bulunamadı";
          statusCode = 400;
          code = "FOREIGN_KEY_VIOLATION";
          break;
      }
    }
  }

  // Determine severity based on status code
  const severity = statusCode >= 500 ? "HIGH" : "MEDIUM";

  // Track error to database and send email for HIGH severity
  let errorId: string | null = null;
  try {
    errorId = await trackError({
      code,
      message,
      severity,
      stack,
      component,
      function: `${request.method} ${request.nextUrl.pathname}`,
      requestPath: request.nextUrl.pathname,
      requestMethod: request.method,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      notifyAdmin: severity === "HIGH", // Email gönder
    });
  } catch (trackingError) {
    console.error("[API ERROR HANDLER] Error tracking failed:", trackingError);
  }

  // Return structured error response
  return createErrorResponse(message, statusCode, code, errorId || undefined);
}

/**
 * Create structured error response
 */
function createErrorResponse(
  message: string,
  statusCode: number,
  code: string,
  errorId?: string,
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
  };

  if (errorId) {
    response.errorId = errorId;
  }

  return NextResponse.json(response, { status: statusCode });
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  fields: string[],
): void {
  const missing = fields.filter(
    (field) =>
      data[field] === undefined || data[field] === null || data[field] === "",
  );

  if (missing.length > 0) {
    throw new ApiError(
      `Zorunlu alanlar eksik: ${missing.join(", ")}`,
      400,
      "VALIDATION_ERROR",
    );
  }
}

/**
 * Parse request body safely
 */
export async function parseBody<T = any>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("Geçersiz JSON formatı", 400, "INVALID_JSON");
  }
}
