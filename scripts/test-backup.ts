/**
 * YEDEKLEME / GERİ YÜKLEME TESTİ
 *
 * Kanıtlar:
 *   1) createBackup → tüm iş verisini dışa aktarır
 *   2) wipeAllData → veriyi siler
 *   3) restoreBackup → veriyi birebir geri getirir
 *   4) Satır sayıları ve bakiye örnekleri eşleşir
 *
 * Güvenlik: bu test'i GERÇEK veritabanında çalıştırırken önce tam yedek alınır;
 * test sonunda veri geri yüklenir.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// backup.ts'i doğrudan import etmek yerine aynı prisma'yı kullanalım:
// (script'ten src/lib import'u tsconfig paths gerektirir; lib fonksiyonlarını
//  burada prisma üzerinden taklit etmek yerine gerçek lib'i kullanıyoruz.)

let fail = 0;
const check = (name: string, ok: boolean, d?: any) => {
  console.log(`${ok ? "✅" : "❌"} ${name}${d ? " :: " + JSON.stringify(d) : ""}`);
  if (!ok) fail++;
};

async function counts() {
  return {
    customers: await prisma.customer.count(),
    transactions: await prisma.transaction.count(),
    transaction_items: await prisma.transactionItem.count(),
    products: await prisma.product.count(),
  };
}

async function main() {
  const { createBackup, wipeAllData, restoreBackup } = await import(
    "../src/lib/backup"
  );

  console.log("=== YEDEKLEME / GERİ YÜKLEME TESTİ ===\n");

  const before = await counts();
  console.log("Önce:", before);

  // 1) YEDEK AL
  const backup = await createBackup({ includeLogs: false });
  check(
    "Yedek alındı (veri var)",
    backup.meta.totalRows > 0 && backup.data.customers?.length === before.customers,
    { tablolar: backup.meta.tables.length, toplam: backup.meta.totalRows,
      musteriler: backup.data.customers?.length },
  );

  // 2) VERİYİ SİL (kullanıcılar korunur)
  const wipe = await wipeAllData({ keepUsers: true, keepSettings: true });
  check("Veri silindi", wipe.deletedRows > 0, { silinen: wipe.deletedRows });
  const mid = await counts();
  check(
    "Silme sonrası müşteri 0",
    mid.customers === 0 && mid.transactions === 0,
    mid,
  );

  // 3) GERİ YÜKLE
  const restored = await restoreBackup(backup, true);
  const after = await counts();
  check(
    "Geri yükleme satır sayıları eşleşti",
    after.customers === before.customers &&
      after.transactions === before.transactions &&
      after.transaction_items === before.transaction_items &&
      after.products === before.products,
    { before, after },
  );
  check("Geri yüklenen satır > 0", restored.restoredRows > 0, {
    tablo: restored.restoredTables,
    satir: restored.restoredRows,
  });

  // 4) Bakiye örnekleri (düzeltilmiş 6 müşteri)
  const samples = await prisma.customer.findMany({
    where: { code: { in: ["MUS-192", "MUS-2535", "MUS-2448"] } },
    select: { code: true, balance: true },
    orderBy: { code: "asc" },
  });
  console.log("Örnek bakiyeler (geri yükleme sonrası):", JSON.stringify(samples));
  check(
    "Düzeltilmiş bakiyeler korundu",
    samples.some((s) => s.code === "MUS-192" && Number(s.balance) === 14100) &&
      samples.some((s) => s.code === "MUS-2535" && Number(s.balance) === 0),
    samples.map((s) => `${s.code}=${s.balance}`),
  );

  console.log(
    `\n=== SONUÇ: ${fail === 0 ? "TÜM TESTLER GEÇTİ ✅" : fail + " TEST BAŞARISIZ ❌"} ===`,
  );
  await prisma.$disconnect();
  await pool.end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("TEST HATASI:", e);
  await pool.end();
  process.exit(1);
});
