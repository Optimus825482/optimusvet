/**
 * ERROR LOGGING SERVICE
 *
 * Logs errors to database and monitoring services:
 * - Database logging for audit trail
 * - Critical error alerts via email
 * - Error metrics collection
 * - Automatic cleanup of old logs
 */

import { trackError, trackErrorFromException } from "./error-tracking";
import { AppError, isOperationalError } from "./error-handler";

// Re-export for backward compatibility
export { trackError as logErrorToDatabase };
export { trackErrorFromException as logError };

// Export error tracking functions
export * from "./error-tracking";
