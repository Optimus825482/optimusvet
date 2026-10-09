/**
 * MÜŞTERİ HESAP MUTABAKATI (RECONCILIATION)
 *
 * Bir müşterinin kayıtlı bakiyesinin (customers.balance) işlem
 * kayıtlarıyla (transactions) tutarlı olup olmadığını denetler.
 *
 * Bakiye formülleri ve senkron mantığı için tek doğruluk kaynağı:
 *   src/lib/customer-balance.ts
 *
 * İki konvansiyon birlikte değerlendirilir (OR):
 *   LEDGER  : Σsatış.total − Σtahsilat.total          (eski defter)
 *   MODERN  : Σ(satış.total − satış.paidAmount)       (yeni sistem)
 *
 * Kullanıcı gereksinimi: "kayıtlı işlemler ile bakiyelerin karşılaştırılması"
 * → reconcileCustomer() tam olarak bunu yapar ve farkı TL cinsinden raporlar.
 */

import { prisma } from "@/lib/prisma";
import {
  BALANCE_TOLERANCE,
  buildSnapshot,
  computeLedgerBalance,
  computeModernBalance,
  detectConvention,
  isSaleType,
  isPaymentType,
  type BalanceTx,
} from "@/lib/customer-balance";

export type ReconciliationSeverity = "HIGH" | "MEDIUM" | "LOW";

export type ReconciliationIssueType =
  | "BALANCE_MISMATCH" // bakiye hiçbir konvansiyonla tutmuyor
  | "ORPHAN_TRANSACTION" // müşterisi olmayan işlem
  | "OVERPAID_SALE" // paidAmount > total
  | "NEGATIVE_BALANCE" // beklenmedik negatif bakiye
  | "DUPLICATE_SUSPECT" // aynı tutarlı mükerrer işlem şüphesi
  | "PAID_STATUS_INCONSISTENT" // status ile paidAmount uyuşmuyor
  | "ZERO_BALANCE_WITH_DEBT" // bakiye 0 ama işlemlerde borç var
  | "DELETED_TX_AFFECTS_BALANCE"; // tutarsızlık silinmiş işlemden kaynaklı olabilir

export interface ReconciliationIssue {
  type: ReconciliationIssueType;
  severity: ReconciliationSeverity;
  entityId: string;
  entityCode?: string;
  entityName?: string;
  message: string;
  details?: Record<string, any>;
}

export interface BalanceSnapshot {
  customerId: string;
  code: string;
  name: string;
  storedBalance: number;
  ledgerBalance: number;
  modernBalance: number;
  expectedBalance: number;
  convention: string;
  difference: number;
  consistent: boolean;
  salesCount: number;
  paymentsCount: number;
  transactionCount: number;
}

export interface ReconciliationResult {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  customersChecked: number;
  customersConsistent: number;
  customersInconsistent: number;
  issueCount: number;
  issues: ReconciliationIssue[];
  inconsistentCustomers: BalanceSnapshot[];
  totals: {
    storedBalanceSum: number;
    ledgerSum: number;
    modernSum: number;
    absoluteDifference: number;
  };
}

// Not: Bakiye formülleri (LEDGER/MODERN) ve tolerans customer-balance.ts'te
// tanımlıdır; burada yeniden tanımlanmaz.

// =====================================================
// TEK MÜŞTERİ MUTABAKATI (işlem ↔ bakiye karşılaştırması)
// =====================================================

type CustomerWithTx = {
  id: string;
  code: string;
  name: string;
  balance: any;
  transactions: Array<BalanceTx & { code?: string; id?: string }>;
};

export function reconcileCustomer(customer: CustomerWithTx): {
  snapshot: BalanceSnapshot;
  issues: ReconciliationIssue[];
} {
  const issues: ReconciliationIssue[] = [];
  const snap = buildSnapshot(
    { id: customer.id, code: customer.code, name: customer.name, balance: customer.balance },
    customer.transactions,
  );

  const salesCount = customer.transactions.filter((t) => isSaleType(t.type)).length;
  const paymentsCount = customer.transactions.filter((t) => isPaymentType(t.type)).length;

  const snapshot: BalanceSnapshot = {
    customerId: snap.customerId,
    code: snap.code ?? customer.code,
    name: snap.name ?? customer.name,
    storedBalance: snap.storedBalance,
    ledgerBalance: snap.ledgerBalance,
    modernBalance: snap.modernBalance,
    expectedBalance: snap.expectedBalance,
    convention: snap.convention,
    difference: snap.difference,
    consistent: snap.consistent,
    salesCount,
    paymentsCount,
    transactionCount: customer.transactions.length,
  };

  if (!snap.consistent) {
    const diff = snap.difference;
    const severity: ReconciliationSeverity =
      Math.abs(diff) >= 1000 ? "HIGH" : Math.abs(diff) >= 100 ? "MEDIUM" : "LOW";
    issues.push({
      type: "BALANCE_MISMATCH",
      severity,
      entityId: customer.id,
      entityCode: customer.code,
      entityName: customer.name,
      message:
        `İşlem-bakiye uyuşmazlığı: kayıtlı bakiye ${snap.storedBalance.toFixed(2)} TL, ` +
        `işlemlerden hesaplanan ${snap.expectedBalance.toFixed(2)} TL ` +
        `(fark ${diff.toFixed(2)} TL, konvansiyon: ${snap.convention})`,
      details: {
        storedBalance: snap.storedBalance,
        ledgerBalance: snap.ledgerBalance,
        modernBalance: snap.modernBalance,
        expectedBalance: snap.expectedBalance,
        difference: diff,
        convention: snap.convention,
        salesCount,
        paymentsCount,
        transactionCount: customer.transactions.length,
      },
    });

    if (snap.storedBalance === 0 && snap.expectedBalance > BALANCE_TOLERANCE) {
      issues.push({
        type: "ZERO_BALANCE_WITH_DEBT",
        severity: "HIGH",
        entityId: customer.id,
        entityCode: customer.code,
        entityName: customer.name,
        message:
          `Bakiye 0 görünüyor ama işlemlerde ${snap.expectedBalance.toFixed(2)} TL borç var ` +
          `(müşteri defterde/panele borçsuz görünüyor olabilir)`,
        details: { storedBalance: 0, expectedBalance: snap.expectedBalance },
      });
    }
  }

  // Fazla ödeme kontrolü (işlem bazlı)
  for (const t of customer.transactions as any[]) {
    if (isSaleType(t.type) && Number(t.paidAmount) > Number(t.total) + BALANCE_TOLERANCE) {
      issues.push({
        type: "OVERPAID_SALE",
        severity: "MEDIUM",
        entityId: t.id ?? customer.id,
        entityCode: t.code ?? customer.code,
        entityName: customer.name,
        message: `Satışta ödenen tutar toplamdan fazla (${t.paidAmount} > ${t.total})`,
        details: { code: t.code, total: Number(t.total), paidAmount: Number(t.paidAmount) },
      });
    }
  }

  return { snapshot, issues };
}

// =====================================================
// TÜM MÜŞTERİLER İÇİN MUTABAKAT
// =====================================================

export async function reconcileAllCustomers(options?: {
  batchSize?: number;
  includeInactive?: boolean;
}): Promise<ReconciliationResult> {
  const startedAt = new Date();
  const batchSize = options?.batchSize ?? 200;
  const where = options?.includeInactive ? {} : { isActive: true };

  const total = await prisma.customer.count({ where });
  const issues: ReconciliationIssue[] = [];
  const inconsistent: BalanceSnapshot[] = [];
  let checked = 0;
  let consistentCount = 0;
  let storedSum = 0;
  let ledgerSum = 0;
  let modernSum = 0;
  let absDiffSum = 0;

  // Silinen işlem sayısı (müşteri başına) — tutarsızlığın kaynağını ayırt eder.
  // Tek sorguda toplanır; audit_logs'taki transactions DELETE kayıtlarından.
  const deletedMap = await getDeletedTransactionCounts();

  for (let skip = 0; skip < total; skip += batchSize) {
    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: batchSize,
      select: {
        id: true,
        code: true,
        name: true,
        balance: true,
        transactions: {
          select: { id: true, code: true, type: true, total: true, paidAmount: true },
        },
      },
    });

    for (const c of customers) {
      const { snapshot, issues: cIssues } = reconcileCustomer({
        id: c.id,
        code: c.code,
        name: c.name,
        balance: c.balance,
        transactions: c.transactions as any,
      });
      checked++;
      storedSum += snapshot.storedBalance;
      ledgerSum += snapshot.ledgerBalance;
      modernSum += snapshot.modernBalance;
      absDiffSum += Math.abs(snapshot.difference);

      if (snapshot.consistent) {
        consistentCount++;
      } else {
        inconsistent.push(snapshot);

        // Silinmiş işlem varsa, tutarsızlık muhtemelen ondan kaynaklanıyor:
        // bulguya bu bilgiyi ekle ve ayrı bir işaret koy (otomatik düzeltmeyi
        // engellemek için kritik).
        const deletedCount = deletedMap.get(c.id) ?? 0;
        if (deletedCount > 0) {
          for (const iss of cIssues) {
            if (iss.type === "BALANCE_MISMATCH" || iss.type === "ZERO_BALANCE_WITH_DEBT") {
              iss.details = { ...(iss.details ?? {}), deletedTxCount: deletedCount };
            }
          }
          issues.push({
            type: "DELETED_TX_AFFECTS_BALANCE",
            severity: "HIGH",
            entityId: c.id,
            entityCode: c.code,
            entityName: c.name,
            message:
              `Bu müşteride ${deletedCount} silinmiş işlem var; bakiye tutarsızlığı ` +
              `bundan kaynaklanabilir. Otomatik düzeltme YAPILMAMALI, elle incelenmeli.`,
            details: { deletedTxCount: deletedCount, difference: snapshot.difference },
          });
        }

        issues.push(...cIssues);
      }
    }
  }

  issues.push(...(await globalIntegrityChecks()));

  const finishedAt = new Date();
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    customersChecked: checked,
    customersConsistent: consistentCount,
    customersInconsistent: inconsistent.length,
    issueCount: issues.length,
    issues,
    inconsistentCustomers: inconsistent.sort(
      (a, b) => Math.abs(b.difference) - Math.abs(a.difference),
    ),
    totals: {
      storedBalanceSum: r2(storedSum),
      ledgerSum: r2(ledgerSum),
      modernSum: r2(modernSum),
      absoluteDifference: r2(absDiffSum),
    },
  };
}

// =====================================================
// SİLİNMİŞ İŞLEM SAYILARI
// =====================================================

/**
 * Müşteri başına silinmiş işlem sayısını tek sorguda döner.
 * Kaynak: audit_logs'taki transactions DELETE kayıtları (oldValues.customerId).
 */
export async function getDeletedTransactionCounts(): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ customerId: string; cnt: number }>>`
    SELECT (a."oldValues"->>'customerId') AS "customerId", COUNT(*)::int AS cnt
    FROM audit_logs a
    WHERE a.action = 'DELETE'
      AND a."tableName" = 'transactions'
      AND a."oldValues"->>'customerId' IS NOT NULL
    GROUP BY 1
  `;
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.customerId) map.set(r.customerId, r.cnt);
  }
  return map;
}

// =====================================================
// SİSTEM GENELİ BÜTÜNLÜK KONTROLLERİ
// =====================================================

export async function globalIntegrityChecks(): Promise<ReconciliationIssue[]> {
  const issues: ReconciliationIssue[] = [];

  const orphans = await prisma.$queryRaw<Array<{ id: string; code: string }>>`
    SELECT t.id, t.code FROM transactions t
    WHERE t."customerId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = t."customerId")
    LIMIT 500
  `;
  for (const o of orphans) {
    issues.push({
      type: "ORPHAN_TRANSACTION",
      severity: "HIGH",
      entityId: o.id,
      entityCode: o.code,
      message: `Yetim işlem: müşterisi bulunamadı (${o.code})`,
    });
  }

  const overpaid = await prisma.$queryRaw<
    Array<{ id: string; code: string; total: number; paidAmount: number; customerCode: string | null }>
  >`
    SELECT t.id, t.code, t.total::float, t."paidAmount"::float, c.code AS "customerCode"
    FROM transactions t LEFT JOIN customers c ON c.id = t."customerId"
    WHERE t.type IN ('SALE','TREATMENT') AND t."paidAmount" > t.total
    LIMIT 500
  `;
  for (const o of overpaid) {
    issues.push({
      type: "OVERPAID_SALE",
      severity: "MEDIUM",
      entityId: o.id,
      entityCode: o.code,
      entityName: o.customerCode ?? undefined,
      message: `Fazla ödenmiş satış: ödenen ${o.paidAmount} > toplam ${o.total}`,
      details: o,
    });
  }

  const dupes = await prisma.$queryRaw<
    Array<{ customerId: string; total: number; day: string; cnt: number }>
  >`
    SELECT "customerId", total::float, date_trunc('day', date)::text AS day, COUNT(*)::int AS cnt
    FROM transactions
    WHERE type = 'CUSTOMER_PAYMENT' AND "customerId" IS NOT NULL
    GROUP BY "customerId", total, date_trunc('day', date)
    HAVING COUNT(*) > 1
    LIMIT 500
  `;
  for (const d of dupes) {
    issues.push({
      type: "DUPLICATE_SUSPECT",
      severity: "LOW",
      entityId: d.customerId,
      message: `Aynı gün aynı tutarlı ${d.cnt} tahsilat (${d.total} TL, ${d.day.slice(0, 10)}) — mükerrer olabilir`,
      details: d,
    });
  }

  return issues;
}

export function summarizeReconciliation(r: ReconciliationResult): string {
  const byType: Record<string, number> = {};
  for (const i of r.issues) byType[i.type] = (byType[i.type] ?? 0) + 1;

  return [
    `Mutabakat: ${r.customersChecked} müşteri tarandı, ` +
      `${r.customersConsistent} tutarlı, ${r.customersInconsistent} tutarsız`,
    `Sorun sayısı: ${r.issueCount}`,
    `Dağılım: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(", ") || "-"}`,
    `Toplam kayıtlı bakiye: ${r.totals.storedBalanceSum.toFixed(2)} TL | ` +
      `ledger: ${r.totals.ledgerSum.toFixed(2)} TL | ` +
      `modern: ${r.totals.modernSum.toFixed(2)} TL | ` +
      `mutlak fark: ${r.totals.absoluteDifference.toFixed(2)} TL`,
  ].join("\n");
}

// Eski API uyumluluğu için yeniden dışa aktarım
export { computeLedgerBalance, computeModernBalance, detectConvention };
