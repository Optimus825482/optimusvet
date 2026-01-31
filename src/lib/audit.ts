/**
 * COMPREHENSIVE AUDIT LOG SYSTEM
 *
 * Bu servis tüm CRUD işlemlerini otomatik olarak loglar.
 * - CREATE: Yeni kayıt oluşturma
 * - UPDATE: Kayıt güncelleme (değişiklikleri tespit eder)
 * - DELETE: Kayıt silme
 * - READ: Kritik kayıtları okuma (opsiyonel)
 */

import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

// Sensitive fields - Bu alanlar audit log'a kaydedilmez
const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "access_token",
  "refresh_token",
  "session_state",
  "id_token",
  "token",
];

// Request context type
export interface AuditContext {
  userId?: string;
  userEmail?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
}

// Audit log entry type
export interface AuditLogEntry {
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  context?: AuditContext;
}

/**
 * Sensitive field'ları temizle
 */
function sanitizeData(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };

  SENSITIVE_FIELDS.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
}

/**
 * İki obje arasındaki farkları tespit et (IMPROVED with circular reference handling)
 */
export function detectChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
): {
  changedFields: string[];
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
} {
  const changedFields: string[] = [];
  const oldValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  // Tüm alanları kontrol et
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  allKeys.forEach((key) => {
    // Sensitive field'ları atla
    if (SENSITIVE_FIELDS.includes(key)) {
      return;
    }

    // Timestamp alanlarını atla (otomatik güncellenir)
    if (key === "updatedAt" || key === "createdAt") {
      return;
    }

    const oldValue = oldData[key];
    const newValue = newData[key];

    // Değer değiştiyse kaydet (SAFE comparison with circular reference handling)
    try {
      const oldStr = safeStringify(oldValue);
      const newStr = safeStringify(newValue);

      if (oldStr !== newStr) {
        changedFields.push(key);
        oldValues[key] = oldValue;
        newValues[key] = newValue;
      }
    } catch (error) {
      // If comparison fails, assume changed
      console.error(`[DETECT CHANGES ERROR] Field: ${key}`, error);
      changedFields.push(key);
      oldValues[key] = "[Error comparing value]";
      newValues[key] = "[Error comparing value]";
    }
  });

  return { changedFields, oldValues, newValues };
}

/**
 * Safe JSON stringify (handles circular references)
 */
function safeStringify(obj: any): string {
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
 * Audit log oluştur (Async - non-blocking)
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Sensitive data'yı temizle
    const sanitizedOldValues = entry.oldValues
      ? sanitizeData(entry.oldValues)
      : undefined;
    const sanitizedNewValues = entry.newValues
      ? sanitizeData(entry.newValues)
      : undefined;

    // Audit log'u veritabanına kaydet
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        tableName: entry.tableName,
        recordId: entry.recordId,
        oldValues: sanitizedOldValues,
        newValues: sanitizedNewValues,
        changedFields: entry.changedFields || [],
        userId: entry.context?.userId,
        userEmail: entry.context?.userEmail,
        userName: entry.context?.userName,
        ipAddress: entry.context?.ipAddress,
        userAgent: entry.context?.userAgent,
        requestPath: entry.context?.requestPath,
        requestMethod: entry.context?.requestMethod,
      },
    });
  } catch (error) {
    // Audit logging ASLA ana işlemi etkilememeli
    console.error("[AUDIT LOG ERROR]", error);
  }
}

/**
 * CREATE action için audit log
 */
export async function auditCreate(
  tableName: string,
  recordId: string,
  data: Record<string, any>,
  context?: AuditContext,
): Promise<void> {
  await createAuditLog({
    action: "CREATE",
    tableName,
    recordId,
    newValues: data,
    context,
  });
}

/**
 * UPDATE action için audit log
 */
export async function auditUpdate(
  tableName: string,
  recordId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  context?: AuditContext,
): Promise<void> {
  const { changedFields, oldValues, newValues } = detectChanges(
    oldData,
    newData,
  );

  // Değişiklik yoksa log'lama
  if (changedFields.length === 0) {
    return;
  }

  await createAuditLog({
    action: "UPDATE",
    tableName,
    recordId,
    oldValues,
    newValues,
    changedFields,
    context,
  });
}

/**
 * DELETE action için audit log
 */
export async function auditDelete(
  tableName: string,
  recordId: string,
  data: Record<string, any>,
  context?: AuditContext,
): Promise<void> {
  await createAuditLog({
    action: "DELETE",
    tableName,
    recordId,
    oldValues: data,
    context,
  });
}

/**
 * READ action için audit log (opsiyonel - sadece kritik tablolar için)
 */
export async function auditRead(
  tableName: string,
  recordId: string,
  context?: AuditContext,
): Promise<void> {
  // Sadece kritik tablolar için READ log'la
  const criticalTables = ["users", "settings", "payments"];

  if (!criticalTables.includes(tableName)) {
    return;
  }

  await createAuditLog({
    action: "READ",
    tableName,
    recordId,
    context,
  });
}

/**
 * Batch operations için audit log
 */
export async function auditBatch(entries: AuditLogEntry[]): Promise<void> {
  try {
    // Tüm entry'leri paralel olarak kaydet
    await Promise.all(entries.map((entry) => createAuditLog(entry)));
  } catch (error) {
    console.error("[AUDIT BATCH ERROR]", error);
  }
}

/**
 * Eski audit log'ları temizle (retention policy)
 * Örnek: 1 yıldan eski logları sil
 */
export async function cleanupOldAuditLogs(
  daysToKeep: number = 365,
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error("[AUDIT CLEANUP ERROR]", error);
    return 0;
  }
}
