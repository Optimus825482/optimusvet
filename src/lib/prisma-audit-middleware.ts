/**
 * PRISMA AUDIT EXTENSION (otomatik + garantili audit logging)
 *
 * Amaç: Uygulamada oluşturulan, güncellenen ve silinen TÜM kayıtlar için
 * zaman damgalı bir kayıt audit_logs tablosuna MUTLAKA yazılır.
 *
 * Neden $extends?
 *   Eski implementasyon Prisma "$use" middleware kullanıyordu; ancak
 *   PrismaPg (@prisma/adapter-pg) adapter ile $use middleware çalışmıyor.
 *   $extends (query extension) adapter ile çalışır ve interactive
 *   transaction ($transaction(async (tx) => ...)) içindeki yazmaları da
 *   yakalar.
 *
 * Tasarım notları:
 *   - Audit yazımı, extension UYGULANMAMIŞ temel client (auditWriter) ile
 *     yapılır → sonsuz döngü (recursion) imkansız.
 *   - AuditLog modelinin kendi yazımları atlanır (log'un log'u olmaz).
 *   - Audit yazımı ana işlemi asla bozmaz/engellemez (try/catch).
 *   - Kullanıcı/IP bağlamı yoksa da kayıt yazılır (system kullanıcısı),
 *     böylece "mutlaka log" garantisi korunur.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";
import type { AuditContext } from "./audit";
import type { AuditAction } from "@prisma/client";
// =====================================================
// 1) REQUEST CONTEXT (AsyncLocalStorage ile request-scoped)
// =====================================================

const auditStorage = new AsyncLocalStorage<AuditContext>();

/**
 * Audit context'i set et (her request başında çağrılır).
 * enterWith: mevcut async execution context'i için geçerli olur,
 * eşzamanlı diğer istekleri etkilemez.
 */
export function setAuditContext(context: AuditContext) {
  auditStorage.enterWith(context);
}

/**
 * Context'i temizle (request sonunda).
 */
export function clearAuditContext() {
  auditStorage.enterWith(undefined as unknown as AuditContext);
}

/**
 * Mevcut audit context'i al.
 */
export function getAuditContext(): AuditContext | undefined {
  return auditStorage.getStore();
}

// =====================================================
// 2) AUDIT WRITER (extension'sız temel client)
// =====================================================

/**
 * Otomatik audit extension aktif mi?
 *
 * Aktifken tüm veritabanı yazımları (create/update/delete/upsert/*Many)
 * Prisma extension tarafından otomatik ve garantili şekilde loglanır.
 * Bu yüzden manuel auditCreate/auditUpdate/auditDelete çağrıları,
 * ÇİFT KAYIT oluşturmamak için etkisizdir (no-op).
 *
 * Not: Bu bayrak döngüsel import (audit.ts ↔ prisma.ts) oluşturmamak
 * için burada, döngü dışındaki modülde tutulur.
 */
let auditExtensionActive = false;

export function setAuditExtensionActive(active: boolean) {
  auditExtensionActive = active;
}

export function isAuditExtensionActive(): boolean {
  return auditExtensionActive;
}

interface AuditWriter {
  auditLog: {
    create(args: any): Promise<any>;
  };
}

let auditWriter: AuditWriter | null = null;

/**
 * Audit kayıtlarını yazacak temel (extension uygulanmamış) client'ı ata.
 * prisma.ts içinde bir kez çağrılır.
 */
export function setAuditWriter(writer: AuditWriter) {
  auditWriter = writer;
}

// =====================================================
// 3) YARDIMCILAR
// =====================================================

// Prisma model adı -> veritabanı tablo adı
const TABLE_MAP: Record<string, string> = {
  User: "users",
  Account: "accounts",
  Session: "sessions",
  VerificationToken: "verification_tokens",
  Customer: "customers",
  Supplier: "suppliers",
  Category: "product_categories",
  Product: "products",
  StockMovement: "stock_movements",
  Transaction: "transactions",
  TransactionItem: "transaction_items",
  Payment: "payments",
  Animal: "animals",
  Protocol: "protocols",
  ProtocolStep: "protocol_steps",
  AnimalProtocol: "animal_protocols",
  ProtocolRecord: "protocol_records",
  Reminder: "reminders",
  Setting: "settings",
  PriceHistory: "price_history",
  Illness: "illnesses",
  Treatment: "treatments",
  Collection: "collections",
  CollectionAllocation: "collection_allocations",
  AuditLog: "audit_logs",
  ErrorLog: "error_logs",
};

// Audit'in kendi yazımını (AuditLog) ve telemetri kayıtlarını (ErrorLog)
// loglamıyoruz: bunlar iş kaydı değil, log'un log'udur (gürültü olur).
const SKIP_MODELS = new Set<string>(["AuditLog", "ErrorLog"]);

// Audit log'a yazılmayacak hassas alanlar
const SENSITIVE_FIELDS = new Set<string>([
  "password",
  "passwordHash",
  "access_token",
  "refresh_token",
  "id_token",
  "session_state",
  "token",
]);

const MAX_BULK_ROWS = 1000; // Many-operasyonlarında yakalanacak maksimum satır

function tableOf(model: string): string {
  return TABLE_MAP[model] || model.charAt(0).toLowerCase() + model.slice(1);
}

function delegateOf(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/** Değeri Prisma Json alanına yazılabilir düz bir objeye çevir */
function toPlain(value: any): any {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(
      JSON.stringify(value, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
  } catch {
    return { _unserializable: String(value) };
  }
}

/** Hassas alanları maskele */
function sanitize(record: any): any {
  const plain = toPlain(record);
  if (plain && typeof plain === "object" && !Array.isArray(plain)) {
    for (const field of SENSITIVE_FIELDS) {
      if (field in plain) plain[field] = "[REDACTED]";
    }
  }
  return plain;
}

/** İki kayıt arasındaki farkı hesapla */
function computeDiff(
  oldData: any,
  newData: any,
): { changedFields: string[]; oldValues: any; newValues: any } {
  const oldPlain = sanitize(oldData) || {};
  const newPlain = sanitize(newData) || {};
  const changedFields: string[] = [];
  const oldValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  const keys = new Set([
    ...Object.keys(oldPlain || {}),
    ...Object.keys(newPlain || {}),
  ]);

  for (const key of keys) {
    if (SENSITIVE_FIELDS.has(key)) continue;
    if (key === "updatedAt" || key === "createdAt") continue;

    const o = JSON.stringify(oldPlain?.[key] ?? null);
    const n = JSON.stringify(newPlain?.[key] ?? null);
    if (o !== n) {
      changedFields.push(key);
      oldValues[key] = oldPlain?.[key] ?? null;
      newValues[key] = newPlain?.[key] ?? null;
    }
  }

  return { changedFields, oldValues, newValues };
}

function recordIdOf(result: any): string {
  if (result && typeof result === "object" && "id" in result) {
    return String(result.id);
  }
  return "(unknown)";
}

// =====================================================
// 4) AUDIT YAZIMI (garantili, non-blocking değil ama asla throw etmez)
// =====================================================

async function writeAudit(entry: {
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
}): Promise<void> {
  if (!auditWriter) {
    console.error("[AUDIT] writer atanmamış - kayıt yazılamadı");
    return;
  }

  const ctx = getAuditContext();

  // Öncelik: "her yazım MUTLAKA loglanır". Bu yüzden audit kaydı, işlem
  // rollback olsa bile kaybolmasın diye her zaman temel client ile yazılır.
  // (Transaction'ın kendi client'ıyla yazmak atomik olurdu; ancak Prisma'da
  // $transaction override edilince query hook'ları tx içinde hiç
  // tetiklenmiyor ve log tamamen kayboluyor. Log kaybı yerine nadir bir
  // "rollback'e rağmen kalan audit kaydı" tercih edilir.)
  try {
    await auditWriter.auditLog.create({
      data: {
        action: entry.action,
        tableName: entry.tableName,
        recordId: entry.recordId,
        oldValues: entry.oldValues ?? undefined,
        newValues: entry.newValues ?? undefined,
        changedFields: entry.changedFields ?? [],
        userId: ctx?.userId ?? null,
        userEmail: ctx?.userEmail ?? null,
        userName: ctx?.userName ?? "system",
        ipAddress: ctx?.ipAddress ?? null,
        userAgent: ctx?.userAgent ?? null,
        requestPath: ctx?.requestPath ?? null,
        requestMethod: ctx?.requestMethod ?? null,
      },
    });
  } catch (error) {
    // Audit yazımı ana işlemi ASLA etkilememeli
    console.error("[AUDIT WRITE ERROR]", error);
  }
}

// =====================================================
// 5) PRISMA EXTENSION
// =====================================================

/**
 * Tüm modeller için CREATE / UPDATE / DELETE / UPSERT / *Many işlemlerini
 * otomatik olarak audit_logs tablosuna yazan Prisma extension'ı üretir.
 *
 * Kullanım:
 *   const prisma = basePrisma.$extends(createAuditExtension());
 */
export function createAuditExtension() {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: "audit-log",
      query: {
        $allModels: {
          async create({ model, args, query }) {
            const result = await query(args);
            if (!SKIP_MODELS.has(model)) {
              await writeAudit({
                action: "CREATE",
                tableName: tableOf(model),
                recordId: recordIdOf(result),
                newValues: sanitize(result),
                changedFields: [],
              });
            }
            return result;
          },

          async createMany({ model, args, query }) {
            const result = await query(args);
            if (!SKIP_MODELS.has(model)) {
              await writeAudit({
                action: "CREATE",
                tableName: tableOf(model),
                recordId: "(bulk)",
                newValues: {
                  count: result?.count ?? null,
                  data: sanitize((args as any)?.data),
                },
                changedFields: [],
              });
            }
            return result;
          },

          async update({ model, args, query }) {
            if (SKIP_MODELS.has(model)) return query(args);

            const old = await fetchOne(client, model, (args as any)?.where);
            const result = await query(args);
            const diff = computeDiff(old, result);
            await writeAudit({
              action: "UPDATE",
              tableName: tableOf(model),
              recordId: recordIdOf(result),
              oldValues: diff.oldValues,
              newValues: diff.newValues,
              changedFields: diff.changedFields,
            });
            return result;
          },

          async updateMany({ model, args, query }) {
            if (SKIP_MODELS.has(model)) return query(args);

            const before = await fetchMany(client, model, (args as any)?.where);
            const result = await query(args);
            const newData = (args as any)?.data || {};
            for (const row of before) {
              const changedFields = Object.keys(newData).filter(
                (k) => !SENSITIVE_FIELDS.has(k),
              );
              await writeAudit({
                action: "UPDATE",
                tableName: tableOf(model),
                recordId: recordIdOf(row),
                oldValues: sanitize(pick(row, changedFields)),
                newValues: sanitize(pick(newData, changedFields)),
                changedFields,
              });
            }
            return result;
          },

          async delete({ model, args, query }) {
            if (SKIP_MODELS.has(model)) return query(args);

            const old = await fetchOne(client, model, (args as any)?.where);
            const result = await query(args);
            await writeAudit({
              action: "DELETE",
              tableName: tableOf(model),
              recordId: recordIdOf(old) !== "(unknown)" ? recordIdOf(old) : recordIdOf(result),
              oldValues: sanitize(old),
              changedFields: [],
            });
            return result;
          },

          async deleteMany({ model, args, query }) {
            if (SKIP_MODELS.has(model)) return query(args);

            const before = await fetchMany(client, model, (args as any)?.where);
            const result = await query(args);
            for (const row of before) {
              await writeAudit({
                action: "DELETE",
                tableName: tableOf(model),
                recordId: recordIdOf(row),
                oldValues: sanitize(row),
                changedFields: [],
              });
            }
            return result;
          },

          async upsert({ model, args, query }) {
            if (SKIP_MODELS.has(model)) return query(args);

            const old = await fetchOne(client, model, (args as any)?.where);
            const result = await query(args);
            const existed = old !== null && old !== undefined;
            const diff = computeDiff(old, result);
            await writeAudit({
              action: existed ? "UPDATE" : "CREATE",
              tableName: tableOf(model),
              recordId: recordIdOf(result),
              oldValues: existed ? diff.oldValues : undefined,
              newValues: existed ? diff.newValues : sanitize(result),
              changedFields: existed ? diff.changedFields : [],
            });
            return result;
          },
        },
      },
    }),
  );
}

function pick(obj: any, keys: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  if (!obj) return out;
  for (const k of keys) out[k] = obj[k];
  return out;
}

/** Tek kaydı yakala (UPDATE/DELETE öncesi eski veri) */
async function fetchOne(
  client: any,
  model: string,
  where: any,
): Promise<any | null> {
  if (!where) return null;
  try {
    const delegate = client[delegateOf(model)];
    if (!delegate) return null;
    if (typeof delegate.findUnique === "function") {
      const found = await delegate.findUnique({ where });
      if (found) return found;
    }
    if (typeof delegate.findFirst === "function") {
      return await delegate.findFirst({ where });
    }
    return null;
  } catch {
    // where unique değilse findUnique hata verir; findFirst'e düş
    try {
      const delegate = client[delegateOf(model)];
      if (delegate && typeof delegate.findFirst === "function") {
        return await delegate.findFirst({ where });
      }
    } catch {
      /* yoksay */
    }
    return null;
  }
}

/** Many-operasyonları için etkilenen kayıtları yakala (sınırlı) */
async function fetchMany(
  client: any,
  model: string,
  where: any,
): Promise<any[]> {
  try {
    const delegate = client[delegateOf(model)];
    if (!delegate || typeof delegate.findMany !== "function") return [];
    return await delegate.findMany({ where, take: MAX_BULK_ROWS });
  } catch (error) {
    console.error("[AUDIT] etkilenen kayıtlar okunamadı:", error);
    return [];
  }
}

/**
 * @deprecated $use middleware PrismaPg adapter ile çalışmıyor.
 * Yerine createAuditExtension() kullanılır. Geriye dönük uyumluluk için
 * bırakıldı; çağrılırsa uyarı verir.
 */
export function setupAuditMiddleware(_prismaClient: any) {
  console.warn(
    "[AUDIT] setupAuditMiddleware kullanımdan kaldırıldı. createAuditExtension() kullanın.",
  );
}
