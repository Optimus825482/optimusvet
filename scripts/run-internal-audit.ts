/**
 * İÇ DENETİM TESTİ
 * Mutabakat sistemini gerçek veritabanı üzerinde çalıştırır ve sonucu kaydeder.
 *
 * Kullanım: npx tsx scripts/run-internal-audit.ts
 */

import { runInternalAudit, getLastAuditRun, getRunIssues } from "../src/lib/internal-audit";

async function main() {
  console.log("=== İÇ DENETİM ÇALIŞTIRILIYOR ===\n");

  const summary = await runInternalAudit({ trigger: "MANUAL" });

  console.log("--- ÖZET ---");
  console.log(`Çalışma ID      : ${summary.runId}`);
  console.log(`Durum           : ${summary.status}`);
  console.log(`Taranan müşteri : ${summary.customersChecked}`);
  console.log(`Tutarlı         : ${summary.customersConsistent}`);
  console.log(`Tutarsız        : ${summary.customersInconsistent}`);
  console.log(`Bulgu sayısı    : ${summary.issueCount} (yüksek: ${summary.highSeverityCount})`);
  console.log(`Süre            : ${summary.durationMs}ms`);

  if (summary.errorMessage) console.log(`HATA: ${summary.errorMessage}`);

  console.log("\n--- İLK 20 BULGU ---");
  const issues = await getRunIssues(summary.runId);
  for (const i of issues.slice(0, 20)) {
    console.log(`[${i.severity}] ${i.type} — ${i.entityCode ?? i.entityId}: ${i.message}`);
  }
  if (issues.length > 20) console.log(`... +${issues.length - 20} bulgu daha`);

  const last = await getLastAuditRun();
  console.log(`\nSon çalışma DB'de kayıtlı: ${last?.id} (${last?.status})`);
}

main().catch((e) => {
  console.error("HATA:", e);
  process.exit(1);
});
