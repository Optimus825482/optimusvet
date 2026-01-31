/**
 * AUDIT LOG VALIDATION SCHEMAS
 *
 * Zod schemas for validating audit log data
 * - Input validation
 * - Type safety
 * - Runtime validation
 */

import { z } from "zod";
import type { AuditAction } from "@prisma/client";

// Allowed tables (whitelist)
export const ALLOWED_TABLES = [
  "users",
  "customers",
  "suppliers",
  "animals",
  "products",
  "product_categories",
  "transactions",
  "transaction_items",
  "payments",
  "collections",
  "collection_allocations",
  "stock_movements",
  "illnesses",
  "treatments",
  "reminders",
  "protocols",
  "protocol_steps",
  "animal_protocols",
  "protocol_records",
  "price_history",
  "settings",
] as const;

// Allowed actions
export const ALLOWED_ACTIONS: AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "READ",
];

// Audit Context Schema
export const AuditContextSchema = z.object({
  userId: z.string().cuid().optional(),
  userEmail: z.string().email().max(255).optional(),
  userName: z.string().max(255).optional(),
  ipAddress: z
    .string()
    .max(45) // IPv4 or IPv6
    .optional(),
  userAgent: z.string().max(500).optional(),
  requestPath: z.string().max(500).optional(),
  requestMethod: z
    .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "SERVER_ACTION"])
    .optional(),
});

// Audit Log Entry Schema
export const AuditLogEntrySchema = z.object({
  action: z.enum(["CREATE", "UPDATE", "DELETE", "READ"]),
  tableName: z.enum(ALLOWED_TABLES),
  recordId: z.string().cuid(),
  oldValues: z.record(z.string(), z.unknown()).optional(),
  newValues: z.record(z.string(), z.unknown()).optional(),
  changedFields: z.array(z.string().max(100)).max(100).optional(),
  context: AuditContextSchema.optional(),
});

// API Query Parameters Schema
export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  tableName: z.enum(ALLOWED_TABLES).optional(),
  action: z.enum(["CREATE", "UPDATE", "DELETE", "READ"]).optional(),
  userId: z.string().cuid().optional(),
  recordId: z.string().cuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// Cleanup Query Schema
export const CleanupQuerySchema = z.object({
  daysToKeep: z.coerce.number().int().min(1).max(3650).default(365), // Max 10 years
});

// Export types
export type AuditContextInput = z.infer<typeof AuditContextSchema>;
export type AuditLogEntryInput = z.infer<typeof AuditLogEntrySchema>;
export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;
export type CleanupQueryInput = z.infer<typeof CleanupQuerySchema>;

/**
 * Validate and sanitize audit log entry
 */
export function validateAuditLogEntry(entry: unknown): AuditLogEntryInput {
  return AuditLogEntrySchema.parse(entry);
}

/**
 * Validate query parameters
 */
export function validateAuditLogQuery(params: unknown): AuditLogQueryInput {
  return AuditLogQuerySchema.parse(params);
}

/**
 * Validate cleanup parameters
 */
export function validateCleanupQuery(params: unknown): CleanupQueryInput {
  return CleanupQuerySchema.parse(params);
}

/**
 * Safe JSON stringify (handles circular references)
 */
export function safeStringify(obj: unknown): string {
  const seen = new WeakSet();

  return JSON.stringify(obj, (key, value) => {
    // Handle circular references
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular Reference]";
      }
      seen.add(value);
    }

    // Handle BigInt
    if (typeof value === "bigint") {
      return value.toString();
    }

    // Handle undefined
    if (value === undefined) {
      return null;
    }

    return value;
  });
}

/**
 * Safe JSON comparison (handles circular references)
 */
export function safeCompare(oldValue: unknown, newValue: unknown): boolean {
  try {
    const oldStr = safeStringify(oldValue);
    const newStr = safeStringify(newValue);
    return oldStr === newStr;
  } catch (error) {
    console.error("[SAFE COMPARE ERROR]", error);
    return false; // Assume different if comparison fails
  }
}

/**
 * Sanitize JSON for safe display (prevent XSS)
 */
export function sanitizeJSON(obj: unknown): string {
  const jsonString = safeStringify(obj);

  // Escape HTML special characters
  return jsonString
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Truncate long strings (prevent DoS)
 */
export function truncateString(str: string, maxLength: number = 10000): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + "... [truncated]";
}

/**
 * Validate and sanitize JSON object (prevent deep nesting DoS)
 */
export function validateJSONDepth(
  obj: unknown,
  maxDepth: number = 10,
  currentDepth: number = 0,
): boolean {
  if (currentDepth > maxDepth) {
    throw new Error(`JSON depth exceeds maximum allowed depth of ${maxDepth}`);
  }

  if (typeof obj === "object" && obj !== null) {
    for (const value of Object.values(obj)) {
      validateJSONDepth(value, maxDepth, currentDepth + 1);
    }
  }

  return true;
}
