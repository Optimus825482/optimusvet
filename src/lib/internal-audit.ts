/**
 * İÇ DENETİM SİSTEMİ (INTERNAL AUDIT)
 *
 * Mutabakat sonuçlarını veritabanına kaydeder ve zamanlanmış denetimleri
 * yönetir. Amaç: müşteri hesap tutarsızlıklarını (eksik işlem, yanlış bakiye,
 * mükerrer kayıt, yetim işlem) düzenli olarak tespit edip kayıt altına almak.
 *
 * Kullanım:
 *   const result = await runInternalAudit({ trigger: "SCHEDULED" });
 *   const last = await getLastAuditRun();
 */

import { prisma } from "@/lib/prisma";
import {
  reconcileAllCustomers,
  type ReconciliationResult,
  type ReconciliationIssue,
} from "@/lib/reconciliation";

export type AuditTrigger = "MANUAL" | "SCHEDULED" | "API";

export interface RunInternalAuditOptions {
  trigger?: AuditTrigger;
  /** Kaç müşteri taranacak (test için sınırlama) */
  limitCustomers?: number;
  /** Aynı anda işlenecek müşteri sayısı */
  batchSize?: number;
  /** Pasif müşterileri de dahil et */
  includeInactive?: boolean;
}

export interface InternalAuditSummary {
  runId: string;
  status: "COMPLETED" | "FAILED";
  trigger: AuditTrigger;
  customersChecked: number;
  customersConsistent: number;
  customersInconsistent: number;
  issueCount: number;
  highSeverityCount: number;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  errorMessage?: string;
}

const HIGH_SEVERITIES = new Set(["HIGH"]);

/**
 * İç denetimi çalıştırır, sonucu reconciliation_runs / reconciliation_issues
 * tablolarına yazar ve özet döner.
 */
export async function runInternalAudit(
  options: RunInternalAuditOptions = {},
): Promise<InternalAuditSummary> {
  const trigger: AuditTrigger = options.trigger ?? "MANUAL";

  // Çalışma kaydı aç (RUNNING)
  const run = await prisma.reconciliationRun.create({
    data: { trigger, status: "RUNNING" },
  });

  try {
    let result = await reconcileAllCustomers({
      batchSize: options.batchSize ?? 200,
      includeInactive: options.includeInactive ?? false,
    });

    // Test/sınırlama amaçlı: ilk N tutarsız müşteriyi bırak
    if (options.limitCustomers && result.issues.length > options.limitCustomers) {
      result = {
        ...result,
        issues: result.issues.slice(0, options.limitCustomers),
      };
    }

    const highSeverityCount = result.issues.filter((i) =>
      HIGH_SEVERITIES.has(i.severity),
    ).length;

    // Bulguları toplu yaz
    if (result.issues.length > 0) {
      await prisma.reconciliationIssue.createMany({
        data: result.issues.map((i: ReconciliationIssue) => ({
          runId: run.id,
          type: i.type,
          severity: i.severity,
          entityId: i.entityId,
          entityCode: i.entityCode ?? null,
          entityName: i.entityName ?? null,
          message: i.message,
          details: i.details ?? undefined,
        })),
      });
    }

    // Çalışmayı tamamla
    await prisma.reconciliationRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        durationMs: result.durationMs,
        status: "COMPLETED",
        customersChecked: result.customersChecked,
        customersConsistent: result.customersConsistent,
        customersInconsistent: result.customersInconsistent,
        issueCount: result.issueCount,
        highSeverityCount,
        storedBalanceSum: result.totals.storedBalanceSum,
        formulaASum: result.totals.ledgerSum,
        formulaBSum: result.totals.modernSum,
      },
    });

    return {
      runId: run.id,
      status: "COMPLETED",
      trigger,
      customersChecked: result.customersChecked,
      customersConsistent: result.customersConsistent,
      customersInconsistent: result.customersInconsistent,
      issueCount: result.issueCount,
      highSeverityCount,
      durationMs: result.durationMs,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
    };
  } catch (error: any) {
    await prisma.reconciliationRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: "FAILED",
        errorMessage: error?.message ?? String(error),
      },
    });
    return {
      runId: run.id,
      status: "FAILED",
      trigger,
      customersChecked: 0,
      customersConsistent: 0,
      customersInconsistent: 0,
      issueCount: 0,
      highSeverityCount: 0,
      durationMs: 0,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      errorMessage: error?.message ?? String(error),
    };
  }
}

/** Son denetim çalışmasını özetiyle döner */
export async function getLastAuditRun() {
  return prisma.reconciliationRun.findFirst({
    orderBy: { startedAt: "desc" },
  });
}

/** Son N çalışmayı döner */
export async function getAuditRuns(limit = 20) {
  return prisma.reconciliationRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

/** Bir çalışmanın bulguları */
export async function getRunIssues(
  runId: string,
  opts?: { unresolvedOnly?: boolean; severity?: string },
) {
  return prisma.reconciliationIssue.findMany({
    where: {
      runId,
      ...(opts?.unresolvedOnly ? { isResolved: false } : {}),
      ...(opts?.severity ? { severity: opts.severity } : {}),
    },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });
}

/** Çözülmemiş bulgular (tüm çalışmalardan) */
export async function getOpenIssues(limit = 200) {
  return prisma.reconciliationIssue.findMany({
    where: { isResolved: false },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Bir bulguyu çözüldü olarak işaretle */
export async function resolveIssue(
  issueId: string,
  resolvedBy: string,
  note?: string,
) {
  return prisma.reconciliationIssue.update({
    where: { id: issueId },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      resolutionNote: note,
    },
  });
}

// =====================================================
// ZAMANLANMIŞ DENETİM
// =====================================================

let schedulerStarted = false;
let schedulerTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Arka plan denetim zamanlayıcısını başlatır.
 *
 * Not: Next.js sunucusu tek örnek (single instance) çalıştığında bu
 * yeterlidir. Çok örnekli (cluster) kurulumda harici bir cron (ör. Coolify
 * Scheduled Task → POST /api/internal-audit/run) tercih edilmelidir.
 *
 * @param intervalMinutes Denetim aralığı (dakika), varsayılan 360 (6 saat)
 */
export function startAuditScheduler(intervalMinutes = 360) {
  if (schedulerStarted) {
    console.log("[INTERNAL AUDIT] Zamanlayıcı zaten çalışıyor");
    return;
  }
  schedulerStarted = true;

  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
  console.log(
    `[INTERNAL AUDIT] Zamanlayıcı başlatıldı — her ${intervalMinutes} dakikada bir`,
  );

  const tick = async () => {
    try {
      console.log("[INTERNAL AUDIT] Zamanlanmış denetim başlıyor...");
      const summary = await runInternalAudit({ trigger: "SCHEDULED" });
      console.log(
        `[INTERNAL AUDIT] Tamamlandı: ${summary.customersInconsistent} tutarsız, ` +
          `${summary.issueCount} bulgu (${summary.durationMs}ms)`,
      );
    } catch (error) {
      console.error("[INTERNAL AUDIT] Zamanlanmış denetim hatası:", error);
    } finally {
      schedulerTimer = setTimeout(tick, intervalMs);
      if (schedulerTimer.unref) schedulerTimer.unref();
    }
  };

  // İlk çalışmayı kısa bir gecikmeyle yap (sunucu açılışını bloklamasın)
  schedulerTimer = setTimeout(tick, 60 * 1000);
  if (schedulerTimer.unref) schedulerTimer.unref();
}

export function stopAuditScheduler() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
  schedulerStarted = false;
  console.log("[INTERNAL AUDIT] Zamanlayıcı durduruldu");
}
