/**
 * GLOBAL ERROR HANDLER
 *
 * Comprehensive error handling system:
 * - Catches all types of errors
 * - Logs errors with context
 * - Returns user-friendly messages
 * - Automatic recovery mechanisms
 * - Type-safe error handling
 */

import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { NextResponse } from "next/server";

// =====================================================
// ERROR TYPES & CLASSES
// =====================================================

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public details?: any,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super("VALIDATION_ERROR", message, 400, true, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Kimlik doğrulama başarısız") {
    super("UNAUTHORIZED", message, 401, true);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Bu işlem için yetkiniz yok") {
    super("FORBIDDEN", message, 403, true);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Kaynak") {
    super("NOT_FOUND", `${resource} bulunamadı`, 404, true);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super("CONFLICT", message, 409, true, details);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(
      "RATE_LIMITED",
      "Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.",
      429,
      true,
      { retryAfter },
    );
    this.name = "RateLimitError";
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string = "Servis") {
    super(
      "SERVICE_UNAVAILABLE",
      `${service} şu anda kullanılamıyor`,
      503,
      true,
    );
    this.name = "ServiceUnavailableError";
  }
}

// =====================================================
// ERROR RESPONSE TYPE
// =====================================================

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
    timestamp?: string;
    requestId?: string;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// =====================================================
// ERROR HANDLERS
// =====================================================

/**
 * Handle Prisma errors
 */
function handlePrismaError(error: any): ErrorResponse["error"] {
  // Prisma Client Known Request Error
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        // Unique constraint violation
        const field = error.meta?.target as string[] | undefined;
        return {
          code: "CONFLICT",
          message: `Bu ${field?.[0] || "değer"} zaten kullanılıyor`,
          details: { field: field?.[0] },
          field: field?.[0],
        };

      case "P2025":
        // Record not found
        return {
          code: "NOT_FOUND",
          message: "Kayıt bulunamadı",
        };

      case "P2003":
        // Foreign key constraint failed
        return {
          code: "CONFLICT",
          message: "İlişkili kayıtlar nedeniyle işlem yapılamıyor",
        };

      case "P2014":
        // Required relation violation
        return {
          code: "VALIDATION_ERROR",
          message: "Gerekli ilişki eksik",
        };

      default:
        return {
          code: "DATABASE_ERROR",
          message: "Veritabanı hatası oluştu",
          details:
            process.env.NODE_ENV === "development"
              ? { prismaCode: error.code, meta: error.meta }
              : undefined,
        };
    }
  }

  // Prisma Client Validation Error
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      code: "VALIDATION_ERROR",
      message: "Geçersiz veri formatı",
      details:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    };
  }

  // Prisma Client Initialization Error
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      code: "DATABASE_CONNECTION_ERROR",
      message: "Veritabanı bağlantısı kurulamadı",
    };
  }

  // Prisma Client Rust Panic Error
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      code: "DATABASE_PANIC",
      message: "Kritik veritabanı hatası",
    };
  }

  // Unknown Prisma error
  return {
    code: "DATABASE_ERROR",
    message: "Veritabanı hatası oluştu",
  };
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError): ErrorResponse["error"] {
  const firstIssue = error.issues[0];

  return {
    code: "VALIDATION_ERROR",
    message: firstIssue?.message || "Geçersiz veri",
    field: firstIssue?.path.join("."),
    details:
      process.env.NODE_ENV === "development"
        ? { issues: error.issues }
        : undefined,
  };
}

/**
 * Main error handler
 */
export function handleError(error: unknown): ErrorResponse["error"] {
  // Known AppError
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  // Prisma errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return handlePrismaError(error);
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // Standard Error
  if (error instanceof Error) {
    // Log unexpected errors
    console.error("[UNEXPECTED ERROR]", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Bir hata oluştu",
      details:
        process.env.NODE_ENV === "development"
          ? { stack: error.stack }
          : undefined,
    };
  }

  // Unknown error type
  console.error("[UNKNOWN ERROR TYPE]", error);

  return {
    code: "INTERNAL_ERROR",
    message: "Beklenmeyen bir hata oluştu",
  };
}

/**
 * Create error response for API routes
 */
export function createErrorResponse(
  error: unknown,
  requestId?: string,
): NextResponse<ErrorResponse> {
  const errorData = handleError(error);

  // Determine status code
  let statusCode = 500;
  if (error instanceof AppError) {
    statusCode = error.statusCode;
  } else if (errorData.code === "VALIDATION_ERROR") {
    statusCode = 400;
  } else if (errorData.code === "NOT_FOUND") {
    statusCode = 404;
  } else if (errorData.code === "CONFLICT") {
    statusCode = 409;
  } else if (errorData.code === "UNAUTHORIZED") {
    statusCode = 401;
  } else if (errorData.code === "FORBIDDEN") {
    statusCode = 403;
  } else if (errorData.code === "RATE_LIMITED") {
    statusCode = 429;
  } else if (errorData.code === "SERVICE_UNAVAILABLE") {
    statusCode = 503;
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      ...errorData,
      timestamp: new Date().toISOString(),
      requestId,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }

  // Prisma and Zod errors are operational
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof ZodError
  ) {
    return true;
  }

  return false;
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const isOperational = isOperationalError(error);

  const logData = {
    timestamp: new Date().toISOString(),
    isOperational,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    context,
  };

  if (isOperational) {
    console.warn("[OPERATIONAL ERROR]", logData);
  } else {
    console.error("[PROGRAMMING ERROR]", logData);
  }

  // TODO: Send to monitoring service (Sentry, DataDog, etc.)
  // Example:
  // if (!isOperational) {
  //   Sentry.captureException(error, { contexts: { custom: context } });
  // }
}
