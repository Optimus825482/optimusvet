/**
 * BAKİYE ONARIM ARACI
 *
 * Tutarsız müşteri bakiyelerini, işlem (transaction) geçmişinden yeniden
 * hesaplayarak düzeltir. Varsayılan olarak KURU ÇALIŞTIRMA (dry-run) yapar;
 * hiçbir şeyi değiştirmez, sadece rapor üretir.
 *
 * Kullanım:
 *   # Kuru çalıştırma (güvenli - önerilen ilk adım)
 *   npx tsx scripts/repair-customer-balances.ts
 *
 *   # Uygula (gerçekten yaz)
 *   npx tsx scripts/repair-customer-balances.ts --apply
 *
 *   # Tek müşteri
 *   npx tsx scripts/repair-customer-balances.ts --code=MUS-2535 --apply
 *
 * Her uygulanan düzeltme, audit_logs'a yazılır (kim/ne zaman/neden).
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  buildSnapshot,
  computeLedgerBalance,
  computeModernBalance,
  computeOpenSaleBalance,
  detectConvention,
  isSaleType,
  isPaymentType,
  type BalanceConvention,
  type BalanceTx,
} from "../src/lib/customer-balance";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FORCE = args.includes("--force"); // silinmiş işlem güvenlik kontrolünü atla
const codeArg = args.find((a) => a.startsWith("--code="))?.split("=")[1];

const r2 = (v: number) => Math.round(v * 100) / 100;

async function main() {
  console.log("=== BAKİYE ONARIM ARACI ===");
  console.log(APPLY ? "MOD: UYGULA (yazma açık)" : "MOD: KURU ÇALIŞTIRMA (yazma kapalı)");
  if (codeArg) console.log(`Filtre: ${codeArg}`);
  console.log("");

  const where = codeArg ? { code: codeArg } : {};
  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      balance: true,
      transactions: {
        select: { id: true, code: true, type: true, total: true, paidAmount: true },
      },
    },
    orderBy: { code: "asc" },
  });

  console.log(`İncelenen müşteri: ${customers.length}\n`);

  type Finding = {
    id: string;
    code: string;
    name: string;
    stored: number;
    expected: number;
    difference: number;
    convention: BalanceConvention;
    ledger: number;
    modern: number;
    deletedTxCount: number;
    expectedWithDeleted: number;
    safe: boolean; // otomatik düzeltmeye uygun mu?
    reconcilesWithDeleted: boolean;
    skipReason: string;
  };
  const findings: Finding[] = [];

  for (const c of customers) {
    const snap = buildSnapshot(c, c.transactions as any);
    if (!snap.consistent) {
      // Bu müşteride silinmiş işlem var mı? Varsa "işlemlerden hesaplanan
      // bakiye" güvenilmez olabilir (silinen kayıt borcu/ödemeyi açıklıyor).
      const deletedRows = await prisma.auditLog.findMany({
        where: {
          action: "DELETE",
          tableName: "transactions",
          oldValues: { path: ["customerId"], equals: c.id },
        },
        select: { oldValues: true },
      });

      // Silinen işlemlerin bakiye etkisini de hesaba katarak
      // "beklenen toplam bakiye"yi hesapla (kayıtlar hâlâ mevcutmuş gibi).
      const deletedTx = deletedRows
        .map((r) => r.oldValues as any)
        .filter((v) => v && typeof v === "object");
      const allTx: Array<BalanceTx & { code?: string }> = [
        ...(c.transactions as any),
        ...deletedTx.map((v) => ({
          type: v.type,
          total: v.total,
          paidAmount: v.paidAmount,
          code: v.code,
        })),
      ];

      const conv = detectConvention(snap.storedBalance, allTx as any);
      const expectedWithDeleted =
        conv === "LEDGER"
          ? computeLedgerBalance(allTx)
          : conv === "OPEN_SALE"
            ? computeOpenSaleBalance(allTx)
            : computeModernBalance(allTx);

      // Kayıtlı bakiye silinen işlemler dahil hesaba tutuyorsa düzeltme gerekmez.
      const reconcilesWithDeleted =
        Math.abs(snap.storedBalance - expectedWithDeleted) < 0.01;

      // ⚠️ GÜVENLİK: Hiç işlem kaydı kalmamışsa bakiye hesaplanamaz.
      // (Örn. MUS-2535: tüm işlemler silinmiş → işlemlerden 0 çıkar, ama gerçek
      // borç olabilir. Sıfırlamak borcu yok ederdi → ASLA otomatik yapılmaz.)
      const hasNoTransactions = c.transactions.length === 0;
      const safe = !hasNoTransactions && (deletedTx.length === 0 || FORCE) && !reconcilesWithDeleted;
      const skipReason = hasNoTransactions
        ? "İşlem kaydı hiç kalmamış — bakiye hesaplanamaz, elle karar gerekir"
        : "";

      findings.push({
        id: c.id,
        code: c.code,
        name: c.name,
        stored: snap.storedBalance,
        expected: snap.expectedBalance,
        difference: snap.difference,
        convention: snap.convention,
        ledger: snap.ledgerBalance,
        modern: snap.modernBalance,
        deletedTxCount: deletedTx.length,
        expectedWithDeleted,
        safe,
        reconcilesWithDeleted,
        skipReason,
      });
    }
  }

  if (findings.length === 0) {
    console.log("✅ Tutarsız bakiye bulunamadı. Hiçbir işlem gerekmiyor.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const safeFindings = findings.filter((f) => f.safe);
  const unsafeFindings = findings.filter((f) => !f.safe);
  const reconcileWithDeleted = findings.filter((f) => f.reconcilesWithDeleted);

  console.log(`⚠️  ${findings.length} müşteride tutarsızlık bulundu:\n`);
  console.log("Kod | Ad | Kayıtlı | Hedef | Konv | Silinen | Durum");
  for (const f of findings.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))) {
    const durum = f.safe
      ? "✅ UYGULANACAK"
      : f.skipReason
        ? `⛔ ATLA — ${f.skipReason}`
        : f.reconcilesWithDeleted
          ? "✅ DENK (düzeltme gerekmez)"
          : "⚠️ İNCELE";
    console.log(
      `${f.code} | ${f.name} | ${f.stored.toFixed(2)} → ${f.expected.toFixed(2)} | ` +
        `${f.convention} | ${f.deletedTxCount} | ${durum}`,
    );
  }

  const totalAbs = r2(findings.reduce((s, f) => s + Math.abs(f.difference), 0));
  console.log(`\nToplam mutlak fark: ${totalAbs.toFixed(2)} TL`);
  console.log(`  ✅ Uygulanacak: ${safeFindings.length}`);
  console.log(`  ✅ Zaten denk : ${reconcileWithDeleted.length}`);
  const skipped = findings.filter((f) => f.skipReason);
  console.log(`  ⛔ Atlanan (işlem kaydı yok): ${skipped.length}`);

  if (skipped.length > 0) {
    console.log("\n⛔ ATLANAN MÜŞTERİLER (bakiye hesaplanamaz — işlem kaydı yok):");
    for (const f of skipped) console.log(`    - ${f.code} ${f.name}: ${f.stored.toFixed(2)} TL — ${f.skipReason}`);
  }

  if (!APPLY) {
    console.log(
      "\n(KURU ÇALIŞTIRMA) Değişiklik yapılmadı. Uygulamak için --apply ekleyin.",
    );
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  // ---- UYGULA (yalnızca güvenli olanlar) ----
  console.log(
    `\n--- DÜZELTMELER UYGULANIYOR (${safeFindings.length} güvenli kayıt) ---`,
  );
  let fixed = 0;
  for (const f of safeFindings) {
    await prisma.customer.update({
      where: { id: f.id },
      data: { balance: f.expected },
    });
    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        tableName: "customers",
        recordId: f.id,
        changedFields: ["balance"],
        oldValues: { balance: f.stored },
        newValues: { balance: f.expected },
        userName: "SISTEM-BAKIYE-ONARIM",
        userEmail: "system@internal",
        requestPath: "/scripts/repair-customer-balances",
        requestMethod: "SCRIPT",
      },
    });
    console.log(
      `✅ ${f.code} ${f.name}: ${f.stored.toFixed(2)} → ${f.expected.toFixed(2)} TL`,
    );
    fixed++;
  }
  console.log(`\n🎉 ${fixed} müşteri bakiyesi düzeltildi ve audit'e kaydedildi.`);
  if (unsafeFindings.length > 0) {
    console.log(
      `⚠️  ${unsafeFindings.length} müşteri (silinmiş işlemli) manuel inceleme için ATLANDI.`,
    );
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  console.error("HATA:", e);
  await pool.end();
  process.exit(1);
});
