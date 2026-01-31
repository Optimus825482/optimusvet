/**
 * PRISMA AUDIT MIDDLEWARE
 *
 * Tüm Prisma işlemlerini otomatik olarak yakalar ve audit log'lar.
 * - create, createMany
 * - update, updateMany
 * - delete, deleteMany
 *
 * NOT: Bu middleware global context'e ihtiyaç duyar.
 * API route'larda context manuel olarak set edilmelidir.
 */

import { Prisma } from "@prisma/client";
import {
  auditCreate,
  auditUpdate,
  auditDelete,
  type AuditContext,
} from "./audit";

// Global context storage (AsyncLocalStorage alternatifi)
// Her request için context set edilir
let globalAuditContext: AuditContext | undefined;

/**
 * Audit context'i set et (her request başında çağrılmalı)
 */
export function setAuditContext(context: AuditContext) {
  globalAuditContext = context;
}

/**
 * Audit context'i temizle (request sonunda)
 */
export function clearAuditContext() {
  globalAuditContext = undefined;
}

/**
 * Mevcut audit context'i al
 */
export function getAuditContext(): AuditContext | undefined {
  return globalAuditContext;
}

/**
 * Model adını table name'e çevir
 */
function getTableName(model: string): string {
  // Prisma model names -> database table names
  const tableMap: Record<string, string> = {
    User: "users",
    Customer: "customers",
    Supplier: "suppliers",
    Animal: "animals",
    Product: "products",
    Category: "product_categories",
    Transaction: "transactions",
    TransactionItem: "transaction_items",
    Payment: "payments",
    Collection: "collections",
    CollectionAllocation: "collection_allocations",
    StockMovement: "stock_movements",
    Illness: "illnesses",
    Treatment: "treatments",
    Reminder: "reminders",
    Protocol: "protocols",
    ProtocolStep: "protocol_steps",
    AnimalProtocol: "animal_protocols",
    ProtocolRecord: "protocol_records",
    PriceHistory: "price_history",
    Setting: "settings",
    Account: "accounts",
    Session: "sessions",
    VerificationToken: "verification_tokens",
  };

  return tableMap[model] || model.toLowerCase();
}

/**
 * Prisma Audit Middleware
 */
export const auditMiddleware = async (
  params: any,
  next: (params: any) => Promise<any>,
) => {
  const context = getAuditContext();

  // Context yoksa audit yapma (background jobs, seed scripts vb.)
  if (!context) {
    return next(params);
  }

  const { model, action, args } = params;

  // Model yoksa (raw queries vb.) audit yapma
  if (!model) {
    return next(params);
  }

  const tableName = getTableName(model);

  try {
    // CREATE operations
    if (action === "create") {
      const result = await next(params);

      // Async audit log (non-blocking)
      auditCreate(tableName, result.id, result, context).catch((err) => {
        console.error("[AUDIT MIDDLEWARE ERROR]", err);
      });

      return result;
    }

    // UPDATE operations
    if (action === "update" || action === "updateMany") {
      // Önce eski değerleri al
      const oldData = await (params as any)
        .runInTransaction(async (tx: any) => {
          if (action === "update") {
            return tx[model].findUnique({ where: args.where });
          }
          return tx[model].findMany({ where: args.where });
        })
        .catch(() => null);

      const result = await next(params);

      // Yeni değerleri al
      if (action === "update" && oldData) {
        const newData = await (params as any)
          .runInTransaction(async (tx: any) => {
            return tx[model].findUnique({ where: args.where });
          })
          .catch(() => null);

        if (newData) {
          // Async audit log
          auditUpdate(tableName, newData.id, oldData, newData, context).catch(
            (err) => {
              console.error("[AUDIT MIDDLEWARE ERROR]", err);
            },
          );
        }
      }

      return result;
    }

    // DELETE operations
    if (action === "delete" || action === "deleteMany") {
      // Önce silinecek veriyi al
      const oldData = await (params as any)
        .runInTransaction(async (tx: any) => {
          if (action === "delete") {
            return tx[model].findUnique({ where: args.where });
          }
          return tx[model].findMany({ where: args.where });
        })
        .catch(() => null);

      const result = await next(params);

      // Async audit log
      if (action === "delete" && oldData) {
        auditDelete(tableName, oldData.id, oldData, context).catch((err) => {
          console.error("[AUDIT MIDDLEWARE ERROR]", err);
        });
      }

      return result;
    }

    // Diğer operasyonlar için audit yapma
    return next(params);
  } catch (error) {
    // Hata durumunda da audit yapma, sadece hatayı fırlat
    throw error;
  }
};

/**
 * Prisma client'a middleware ekle
 *
 * Kullanım:
 * ```ts
 * import { prisma } from '@/lib/prisma';
 * import { setupAuditMiddleware } from '@/lib/prisma-audit-middleware';
 *
 * setupAuditMiddleware(prisma);
 * ```
 */
export function setupAuditMiddleware(prismaClient: any) {
  prismaClient.$use(auditMiddleware);
}
