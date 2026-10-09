/**
 * YEDEKLEME / GERİ YÜKLEME (Backup & Restore)
 *
 * Tüm iş verisini JSON olarak dışa/içe aktarır.
 *
 * TASARIM KARARLARI:
 *  - FK bağımlılık sırası: geri yükleme "parent → child" sırasında yapılır;
 *    silme ise ters sırada (child → parent).
 *  - Tek seferde tek transaction: geri yükleme ya tamamen başarılı ya da
 *    tamamen geri alınır (atomik).
 *  - Kimlikler (id) korunur → FK ilişkileri bozulmaz.
 *  - `audit_logs`, `error_logs`, `sessions`, `_prisma_migrations`,
 *    `app_migrations`, `reconciliation_*` gibi teknik/log tabloları
 *    varsayılan olarak DIŞARIDA bırakılır (istenirse dahil edilir).
 *  - Geri yükleme öncesi mevcut verinin otomatik güvenlik yedeği alınır.
 */

import { prisma } from "@/lib/prisma";

/** Geri yükleme sırası: parent → child (FK güvenli) */
export const RESTORE_ORDER = [
  "users",
  "accounts",
  "verification_tokens",
  "customers",
  "suppliers",
  "product_categories",
  "products",
  "animals",
  "protocols",
  "protocol_steps",
  "animal_protocols",
  "protocol_records",
  "illnesses",
  "treatments",
  "price_history",
  "stock_movements",
  "transactions",
  "transaction_items",
  "payments",
  "collections",
  "collection_allocations",
  "reminders",
  "settings",
  "reconciliation_runs",
  "reconciliation_issues",
  "audit_logs",
  "error_logs",
] as const;

/** Silme sırası: child → parent */
export const DELETE_ORDER = [...RESTORE_ORDER].reverse();

/** Kullanıcı oturumları — hiçbir zaman yedeğe dahil edilmez/geri yüklenmez */
const NEVER_BACKUP = new Set(["sessions", "_prisma_migrations", "app_migrations"]);

/** Varsayılan yedek dışı teknik/log tablolar */
const DEFAULT_EXCLUDED = new Set([
  "sessions",
  "_prisma_migrations",
  "app_migrations",
  "audit_logs",
  "error_logs",
  "reconciliation_runs",
  "reconciliation_issues",
]);

export interface BackupOptions {
  includeLogs?: boolean; // audit_logs, error_logs dahil edilsin mi
}

export interface BackupFile {
  meta: {
    app: string;
    version: string;
    createdAt: string;
    tables: string[];
    rowCounts: Record<string, number>;
    totalRows: number;
    includeLogs: boolean;
  };
  data: Record<string, any[]>;
}

/**
 * Tüm veriyi dışa aktarır (JSON).
 */
export async function createBackup(
  options: BackupOptions = {},
): Promise<BackupFile> {
  const includeLogs = options.includeLogs ?? false;
  const data: Record<string, any[]> = {};
  const rowCounts: Record<string, number> = {};
  let totalRows = 0;

  for (const table of RESTORE_ORDER) {
    if (NEVER_BACKUP.has(table)) continue;
    if (!includeLogs && DEFAULT_EXCLUDED.has(table)) continue;

    // Model adı: tablo adıyla aynı (Prisma delegate adı = tablo adı burada
    // camelCase değil; modeller @map ile tabloya bağlı ama delegate adları
    // model adıdır. Bu yüzden delegate eşlemesi ayrı tutulur.)
    const delegate = getDelegate(table);
    if (!delegate) continue;

    const rows = await delegate.findMany();
    data[table] = rows;
    rowCounts[table] = rows.length;
    totalRows += rows.length;
  }

  return {
    meta: {
      app: "optimusvet",
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      tables: Object.keys(data),
      rowCounts,
      totalRows,
      includeLogs,
    },
    data,
  };
}

// Prisma delegate eşlemesi (tablo adı -> client model adı)
const TABLE_TO_MODEL: Record<string, string> = {
  users: "user",
  accounts: "account",
  verification_tokens: "verificationToken",
  customers: "customer",
  suppliers: "supplier",
  product_categories: "category",
  products: "product",
  animals: "animal",
  protocols: "protocol",
  protocol_steps: "protocolStep",
  animal_protocols: "animalProtocol",
  protocol_records: "protocolRecord",
  illnesses: "illness",
  treatments: "treatment",
  price_history: "priceHistory",
  stock_movements: "stockMovement",
  transactions: "transaction",
  transaction_items: "transactionItem",
  payments: "payment",
  collections: "collection",
  collection_allocations: "collectionAllocation",
  reminders: "reminder",
  settings: "setting",
  reconciliation_runs: "reconciliationRun",
  reconciliation_issues: "reconciliationIssue",
  audit_logs: "auditLog",
  error_logs: "errorLog",
};

function getDelegate(table: string): any {
  const model = TABLE_TO_MODEL[table];
  if (!model) return null;
  return (prisma as any)[model] ?? null;
}

/**
 * Bir yedek dosyasını doğrular (şema + içerik).
 */
export function validateBackupFile(obj: any): { ok: boolean; error?: string } {
  if (!obj || typeof obj !== "object") return { ok: false, error: "Geçersiz dosya" };
  if (!obj.meta || typeof obj.meta !== "object")
    return { ok: false, error: "meta bölümü yok" };
  if (obj.meta.app !== "optimusvet")
    return { ok: false, error: "Bu dosya OptimusVet yedeği değil" };
  if (!obj.data || typeof obj.data !== "object")
    return { ok: false, error: "data bölümü yok" };

  const tables = Object.keys(obj.data);
  const known = tables.filter((t) => TABLE_TO_MODEL[t]);
  if (known.length === 0)
    return { ok: false, error: "Tanınan tablo yok" };
  return { ok: true };
}

export interface RestoreResult {
  restoredTables: number;
  restoredRows: number;
  perTable: Record<string, number>;
  safetyBackup: BackupFile;
}

/**
 * Yedeği geri yükler.
 *
 * @param backup       Yedek içeriği
 * @param cleanFirst   true → mevcut veri silinip yedek yüklenir (tam geri yükleme)
 *                     false → yalnızca eksik kayıtlar eklenir (birleştirme değil,
 *                             var olanlar atlanır)
 */
export async function restoreBackup(
  backup: BackupFile,
  cleanFirst = true,
): Promise<RestoreResult> {
  // 1) Güvenlik yedeği (mevcut durum) — geri dönüş için
  const safetyBackup = await createBackup({ includeLogs: true });

  const perTable: Record<string, number> = {};
  let total = 0;

  await prisma.$transaction(
    async (tx) => {
      // 2) Mevcut veriyi temizle (child → parent)
      if (cleanFirst) {
        for (const table of DELETE_ORDER) {
          if (NEVER_BACKUP.has(table)) continue;
          const delegate = (tx as any)[TABLE_TO_MODEL[table]];
          if (delegate) await delegate.deleteMany({});
        }
      }

      // 3) Yedekten yükle (parent → child)
      for (const table of RESTORE_ORDER) {
        if (NEVER_BACKUP.has(table)) continue;
        const rows = backup.data[table];
        if (!rows || rows.length === 0) continue;

        const delegate = (tx as any)[TABLE_TO_MODEL[table]];
        if (!delegate) continue;

        // Tarih alanları string olarak gelir; Prisma DateTime bekler.
        const prepared = rows.map((r) => coerceDates(r));

        // createMany varsa toplu; yoksa tek tek
        await delegate.createMany({ data: prepared, skipDuplicates: true });
        perTable[table] = prepared.length;
        total += prepared.length;
      }
    },
    { timeout: 120000 },
  );

  return {
    restoredTables: Object.keys(perTable).length,
    restoredRows: total,
    perTable,
    safetyBackup,
  };
}

/** ISO tarih string'lerini Date'e çevirir (bilinen tarih alanları) */
const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "date",
  "dueDate",
  "emailVerified",
  "expires",
  "birthDate",
  "expiryDate",
  "resolvedAt",
  "emailSentAt",
  "checkDate",
  "startedAt",
  "finishedAt",
  "appliedAt",
]);

function coerceDates(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && typeof v === "string" && DATE_FIELDS.has(k)) {
      const d = new Date(v);
      out[k] = isNaN(d.getTime()) ? v : d;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Tüm iş verisini siler (kullanıcılar ve ayarlar hariç tutulabilir).
 * Geri dönüşü yoktur → öncesinde yedek alınmalıdır.
 */
export async function wipeAllData(options?: {
  keepUsers?: boolean;
  keepSettings?: boolean;
}): Promise<{ deletedRows: number; perTable: Record<string, number> }> {
  const keepUsers = options?.keepUsers ?? true;
  const keepSettings = options?.keepSettings ?? true;

  const perTable: Record<string, number> = {};
  let total = 0;

  await prisma.$transaction(
    async (tx) => {
      for (const table of DELETE_ORDER) {
        if (NEVER_BACKUP.has(table)) continue;
        if (keepUsers && table === "users") continue;
        if (keepUsers && (table === "accounts" || table === "verification_tokens")) continue;
        if (keepSettings && table === "settings") continue;

        const delegate = (tx as any)[TABLE_TO_MODEL[table]];
        if (!delegate) continue;
        const res = await delegate.deleteMany({});
        if (res.count > 0) {
          perTable[table] = res.count;
          total += res.count;
        }
      }
    },
    { timeout: 120000 },
  );

  return { deletedRows: total, perTable };
}

/** Özet (yedek dosyası hakkında) */
export function summarizeBackup(b: BackupFile): string {
  const lines = [
    `Yedek: ${b.meta.createdAt}`,
    `Tablo: ${b.meta.tables.length}, Toplam kayıt: ${b.meta.totalRows}`,
    ...b.meta.tables
      .slice(0, 12)
      .map((t) => `  - ${t}: ${b.meta.rowCounts[t]}`),
  ];
  if (b.meta.tables.length > 12) lines.push(`  ... +${b.meta.tables.length - 12} tablo`);
  return lines.join("\n");
}
