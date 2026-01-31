/**
 * ERROR LOGGING SERVICE
 *
 * Logs errors to database and monitoring services:
 * - Database logging for audit trail
 * - Critical error alerts
 * - Error metrics collection
 * - Automatic cleanup of old logs
 */

import { prisma } from "@/lib/prisma";
import { AppError, isOperationalError } from "./error-handler";

// =====================================================
// ERROR LOG TYPES
// =====================================================

export interface ErrorLogEntry {
  code: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  userEmail?: string;
  requestPath?: string;
  requestMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  isOperational?: boolean;
  severity?: "low" | "medium" | "high" | "critical";
}

// =====================================================
// CRITICAL ERROR CODES
// =====================================================

const CRITICAL_ERROR_CODES = [
  "DATABASE_CONNECTION_ERROR",
  "DATABASE_PANIC",
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
];

// =====================================================
// ERROR LOGGER
// =====================================================

/**
 * Log error to database
 */
export async function logErrorToDatabase(entry: ErrorLogEntry): Promise<void> {
  try {
    // Determine severity
    const severity = entry.severity || determineSeverity(entry.code);

    // Create error log (using a generic table or create a new ErrorLog model)
    // For now, we'll use console logging and can extend to database later
    const logData = {
      timestamp: new Date().toISOString(),
      code: entry.code,
      message: entry.message,
      stack: entry.stack,
      context: entry.context,
      userId: entry.userId,
      userEmail: entry.userEmail,
      requestPath: entry.requestPath,
      requestMethod: entry.requestMethod,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      isOperational: entry.isOperational ?? true,
      severity,
    };

    // Log to console (can be replaced with database insert)
    console.error("[ERROR LOG]", JSON.stringify(logData, null, 2));

    // TODO: Insert into database
    // await prisma.errorLog.create({ data: logData });

    // Send alert for critical errors
    if (severity === "critical") {
      await sendCriticalErrorAlert(logData);
    }
  } catch (error) {
    // Logging errors should never break the application
    console.error("[ERROR LOGGER FAILED]", error);
  }
}

/**
 * Determine error severity
 */
function determineSeverity(
  code: string,
): "low" | "medium" | "high" | "critical" {
  if (CRITICAL_ERROR_CODES.includes(code)) {
    return "critical";
  }

  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
    return "medium";
  }

  if (code === "VALIDATION_ERROR" || code === "NOT_FOUND") {
    return "low";
  }

  return "high";
}

/**
 * Send critical error alert
 */
async function sendCriticalErrorAlert(logData: any): Promise<void> {
  try {
    // TODO: Implement alert mechanism
    // Options:
    // 1. Email notification
    // 2. Slack/Discord webhook
    // 3. SMS alert
    // 4. PagerDuty/Opsgenie

    console.error("[CRITICAL ERROR ALERT]", {
      alertMessage: "🚨 CRITICAL ERROR DETECTED 🚨",
      code: logData.code,
      errorMessage: logData.message,
      timestamp: logData.timestamp,
      userId: logData.userId,
      requestPath: logData.requestPath,
    });

    // Example: Send to Slack
    // await fetch(process.env.SLACK_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     text: `🚨 Critical Error: ${logData.code}`,
    //     blocks: [
    //       {
    //         type: 'section',
    //         text: {
    //           type: 'mrkdwn',
    //           text: `*Error:* ${logData.message}\n*Code:* ${logData.code}\n*Path:* ${logData.requestPath}`
    //         }
    //       }
    //     ]
    //   })
    // });
  } catch (error) {
    console.error("[ALERT FAILED]", error);
  }
}

/**
 * Log error with automatic context extraction
 */
export async function logError(
  error: unknown,
  context?: Partial<ErrorLogEntry>,
): Promise<void> {
  try {
    const entry: ErrorLogEntry = {
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred",
      isOperational: isOperationalError(error),
      ...context,
    };

    // Extract error details
    if (error instanceof AppError) {
      entry.code = error.code;
      entry.message = error.message;
      entry.stack = error.stack;
    } else if (error instanceof Error) {
      entry.code = error.name || "ERROR";
      entry.message = error.message;
      entry.stack = error.stack;
    } else if (typeof error === "string") {
      entry.message = error;
    }

    await logErrorToDatabase(entry);
  } catch (logError) {
    console.error("[LOG ERROR FAILED]", logError);
  }
}

/**
 * Get error statistics
 */
export async function getErrorStats(
  timeRange: "hour" | "day" | "week" | "month" = "day",
): Promise<{
  total: number;
  bySeverity: Record<string, number>;
  byCode: Record<string, number>;
  topErrors: Array<{ code: string; count: number }>;
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

    // TODO: Query from database
    // For now, return mock data
    return {
      total: 0,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      byCode: {},
      topErrors: [],
    };

    // Real implementation:
    // const logs = await prisma.errorLog.findMany({
    //   where: { createdAt: { gte: startDate } },
    // });
    //
    // return {
    //   total: logs.length,
    //   bySeverity: groupBy(logs, 'severity'),
    //   byCode: groupBy(logs, 'code'),
    //   topErrors: getTopErrors(logs, 10),
    // };
  } catch (error) {
    console.error("[GET ERROR STATS FAILED]", error);
    return {
      total: 0,
      bySeverity: {},
      byCode: {},
      topErrors: [],
    };
  }
}

/**
 * Cleanup old error logs
 */
export async function cleanupOldErrorLogs(
  daysToKeep: number = 90,
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // TODO: Delete from database
    // const result = await prisma.errorLog.deleteMany({
    //   where: { createdAt: { lt: cutoffDate } },
    // });
    //
    // return result.count;

    console.log(`[CLEANUP] Would delete error logs older than ${cutoffDate}`);
    return 0;
  } catch (error) {
    console.error("[CLEANUP FAILED]", error);
    return 0;
  }
}

/**
 * Export error logs (for analysis)
 */
export async function exportErrorLogs(
  startDate: Date,
  endDate: Date,
): Promise<ErrorLogEntry[]> {
  try {
    // TODO: Query from database
    // const logs = await prisma.errorLog.findMany({
    //   where: {
    //     createdAt: {
    //       gte: startDate,
    //       lte: endDate,
    //     },
    //   },
    //   orderBy: { createdAt: 'desc' },
    // });
    //
    // return logs;

    return [];
  } catch (error) {
    console.error("[EXPORT FAILED]", error);
    return [];
  }
}
