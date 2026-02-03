/**
 * COMPREHENSIVE ERROR TRACKING SYSTEM
 *
 * Features:
 * - Database logging
 * - Email notifications for critical errors
 * - Error statistics and analytics
 * - Automatic cleanup
 * - Error resolution tracking
 */

import { prisma } from "@/lib/prisma";
import { sendErrorNotification } from "@/lib/email";
import type { ErrorSeverity } from "@prisma/client";

// =====================================================
// ERROR TRACKING TYPES
// =====================================================

export interface ErrorTrackingEntry {
  code: string;
  message: string;
  severity?: ErrorSeverity;
  stack?: string;
  component?: string;
  function?: string;
  context?: Record<string, any>;

  // User context
  userId?: string;
  userEmail?: string;
  userName?: string;

  // Request context
  requestPath?: string;
  requestMethod?: string;
  requestBody?: any;
  requestQuery?: any;
  ipAddress?: string;
  userAgent?: string;

  // Classification
  isOperational?: boolean;
  notifyAdmin?: boolean;
}

// =====================================================
// CRITICAL ERROR CODES (Auto-notify admin)
// =====================================================

const CRITICAL_ERROR_CODES = [
  "DATABASE_CONNECTION_ERROR",
  "DATABASE_PANIC",
  "INTERNAL_SERVER_ERROR",
  "SERVICE_UNAVAILABLE",
  "PAYMENT_PROCESSING_ERROR",
  "DATA_CORRUPTION",
  "SECURITY_BREACH",
];

// =====================================================
// ERROR TRACKING FUNCTIONS
// =====================================================

/**
 * Track error to database and send notifications
 */
export async function trackError(
  entry: ErrorTrackingEntry,
): Promise<string | null> {
  try {
    // Determine severity
    const severity = entry.severity || determineSeverity(entry.code);

    // Determine if admin should be notified
    const notifyAdmin =
      entry.notifyAdmin ?? shouldNotifyAdmin(entry.code, severity);

    // Sanitize sensitive data
    const sanitizedEntry = sanitizeErrorData(entry);

    // Save to database
    const errorLog = await prisma.errorLog.create({
      data: {
        code: sanitizedEntry.code,
        message: sanitizedEntry.message,
        severity,
        stack: sanitizedEntry.stack,
        component: sanitizedEntry.component,
        function: sanitizedEntry.function,
        context: sanitizedEntry.context,

        userId: sanitizedEntry.userId,
        userEmail: sanitizedEntry.userEmail,
        userName: sanitizedEntry.userName,

        requestPath: sanitizedEntry.requestPath,
        requestMethod: sanitizedEntry.requestMethod,
        requestBody: sanitizedEntry.requestBody,
        requestQuery: sanitizedEntry.requestQuery,
        ipAddress: sanitizedEntry.ipAddress,
        userAgent: sanitizedEntry.userAgent,

        isOperational: sanitizedEntry.isOperational ?? true,
        notifyAdmin,
      },
    });

    // Send email notification for critical errors
    if (notifyAdmin && (severity === "HIGH" || severity === "CRITICAL")) {
      const emailSent = await sendErrorNotification({
        code: sanitizedEntry.code,
        message: sanitizedEntry.message,
        severity,
        stack: sanitizedEntry.stack,
        component: sanitizedEntry.component,
        function: sanitizedEntry.function,
        requestPath: sanitizedEntry.requestPath,
        requestMethod: sanitizedEntry.requestMethod,
        userId: sanitizedEntry.userId,
        userEmail: sanitizedEntry.userEmail,
        context: sanitizedEntry.context,
      });

      // Update email sent status
      if (emailSent) {
        await prisma.errorLog.update({
          where: { id: errorLog.id },
          data: {
            emailSent: true,
            emailSentAt: new Date(),
          },
        });
      }
    }

    console.log(`[ERROR TRACKING] Logged error: ${errorLog.id} (${severity})`);
    return errorLog.id;
  } catch (error) {
    // Error tracking should never break the application
    console.error("[ERROR TRACKING FAILED]", error);
    return null;
  }
}

/**
 * Track error from Error object
 */
export async function trackErrorFromException(
  error: unknown,
  context?: Partial<ErrorTrackingEntry>,
): Promise<string | null> {
  const entry: ErrorTrackingEntry = {
    code: "UNKNOWN_ERROR",
    message: "An unknown error occurred",
    ...context,
  };

  // Extract error details
  if (error instanceof Error) {
    entry.code = error.name || "ERROR";
    entry.message = error.message;
    entry.stack = error.stack;
  } else if (typeof error === "string") {
    entry.message = error;
  } else {
    entry.message = JSON.stringify(error);
  }

  return trackError(entry);
}

/**
 * Determine error severity based on code
 */
function determineSeverity(code: string): ErrorSeverity {
  if (CRITICAL_ERROR_CODES.includes(code)) {
    return "CRITICAL";
  }

  if (code.includes("DATABASE") || code.includes("CONNECTION")) {
    return "HIGH";
  }

  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
    return "MEDIUM";
  }

  if (code === "VALIDATION_ERROR" || code === "NOT_FOUND") {
    return "LOW";
  }

  return "MEDIUM";
}

/**
 * Determine if admin should be notified
 */
function shouldNotifyAdmin(code: string, severity: ErrorSeverity): boolean {
  // Always notify for critical errors
  if (severity === "CRITICAL") {
    return true;
  }

  // Notify for high severity errors
  if (severity === "HIGH") {
    return true;
  }

  // Notify for specific error codes
  if (CRITICAL_ERROR_CODES.includes(code)) {
    return true;
  }

  return false;
}

/**
 * Sanitize sensitive data from error entry
 */
function sanitizeErrorData(entry: ErrorTrackingEntry): ErrorTrackingEntry {
  const sanitized = { ...entry };

  // Sanitize request body
  if (sanitized.requestBody) {
    sanitized.requestBody = sanitizeObject(sanitized.requestBody);
  }

  // Sanitize context
  if (sanitized.context) {
    sanitized.context = sanitizeObject(sanitized.context);
  }

  return sanitized;
}

/**
 * Sanitize object (remove sensitive fields)
 */
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const sensitiveFields = [
    "password",
    "passwordHash",
    "token",
    "accessToken",
    "refreshToken",
    "apiKey",
    "secret",
    "creditCard",
    "ssn",
  ];

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (
      sensitiveFields.some((field) =>
        key.toLowerCase().includes(field.toLowerCase()),
      )
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
}

// =====================================================
// ERROR RESOLUTION
// =====================================================

/**
 * Mark error as resolved
 */
export async function resolveError(
  errorId: string,
  resolution: string,
  resolvedBy?: string,
): Promise<boolean> {
  try {
    await prisma.errorLog.update({
      where: { id: errorId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        resolution,
      },
    });

    console.log(`[ERROR TRACKING] Error resolved: ${errorId}`);
    return true;
  } catch (error) {
    console.error("[ERROR TRACKING] Failed to resolve error:", error);
    return false;
  }
}

/**
 * Bulk resolve errors by code
 */
export async function bulkResolveErrors(
  code: string,
  resolution: string,
  resolvedBy?: string,
): Promise<number> {
  try {
    const result = await prisma.errorLog.updateMany({
      where: {
        code,
        isResolved: false,
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        resolution,
      },
    });

    console.log(
      `[ERROR TRACKING] Bulk resolved ${result.count} errors with code: ${code}`,
    );
    return result.count;
  } catch (error) {
    console.error("[ERROR TRACKING] Failed to bulk resolve errors:", error);
    return 0;
  }
}

// =====================================================
// ERROR STATISTICS
// =====================================================

/**
 * Get error statistics
 */
export async function getErrorStats(
  timeRange: "hour" | "day" | "week" | "month" = "day",
): Promise<{
  total: number;
  unresolved: number;
  bySeverity: Record<string, number>;
  byCode: Array<{ code: string; count: number }>;
  recentErrors: Array<{
    id: string;
    code: string;
    message: string;
    severity: string;
    createdAt: Date;
  }>;
}> {
  try {
    // Calculate time range
    const now = new Date();
    const startDate = new Date(now);

    switch (timeRange) {
      case "hour":
        startDate.setHours(now.getHours() - 1);
        break;
      case "day":
        startDate.setDate(now.getDate() - 1);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // Get errors in time range
    const errors = await prisma.errorLog.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        code: true,
        message: true,
        severity: true,
        isResolved: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate statistics
    const total = errors.length;
    const unresolved = errors.filter((e) => !e.isResolved).length;

    // Group by severity
    const bySeverity: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    errors.forEach((e) => {
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
    });

    // Group by code
    const codeMap = new Map<string, number>();
    errors.forEach((e) => {
      codeMap.set(e.code, (codeMap.get(e.code) || 0) + 1);
    });
    const byCode = Array.from(codeMap.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent errors
    const recentErrors = errors.slice(0, 10);

    return {
      total,
      unresolved,
      bySeverity,
      byCode,
      recentErrors,
    };
  } catch (error) {
    console.error("[ERROR TRACKING] Failed to get error stats:", error);
    return {
      total: 0,
      unresolved: 0,
      bySeverity: {},
      byCode: [],
      recentErrors: [],
    };
  }
}

// =====================================================
// ERROR CLEANUP
// =====================================================

/**
 * Cleanup old resolved errors
 */
export async function cleanupOldErrors(
  daysToKeep: number = 90,
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.errorLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isResolved: true,
      },
    });

    console.log(`[ERROR TRACKING] Cleaned up ${result.count} old errors`);
    return result.count;
  } catch (error) {
    console.error("[ERROR TRACKING] Failed to cleanup old errors:", error);
    return 0;
  }
}

/**
 * Export errors for analysis
 */
export async function exportErrors(
  startDate: Date,
  endDate: Date,
  filters?: {
    severity?: ErrorSeverity;
    code?: string;
    isResolved?: boolean;
  },
): Promise<any[]> {
  try {
    const errors = await prisma.errorLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...filters,
      },
      orderBy: { createdAt: "desc" },
    });

    return errors;
  } catch (error) {
    console.error("[ERROR TRACKING] Failed to export errors:", error);
    return [];
  }
}
