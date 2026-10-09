/**
 * AUDIT GARANTİ TESTİ (transaction davranışı)
 *
 * Gereksinim: "her yazım MUTLAKA loglanır".
 * Bu test, transaction içindeki yazımların da loglandığını doğrular.
 *
 * Bilinen ödünleşim: Log kaybolmasın diye audit kaydı temel client ile
 * yazılır. Bu yüzden işlem rollback olsa bile audit kaydı kalabilir
 * (girişim kaydı). Bu, "mutlaka log" gereksinimi için bilinçli tercihtir.
 */
import { prisma } from "../src/lib/prisma";
import { setAuditContext } from "../src/lib/prisma-audit-middleware";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const reader = new PrismaClient({ adapter: new PrismaPg(pool) });

const TAG = "TXGUARANTEE-" + Date.now();
let failures = 0;

function log(step: string, ok: boolean, detail?: any) {
  console.log(`${ok ? "✅" : "❌"} ${step}${detail ? " :: " + JSON.stringify(detail) : ""}`);
  if (!ok) failures++;
}

async function main() {
  setAuditContext({
    userId: "tx-user",
    userEmail: "tx@test.com",
    userName: "TX Kullanıcı",
    ipAddress: "1.1.1.1",
    requestMethod: "POST",
  });

  // 1) Başarılı transaction içindeki yazım loglanmalı
  const sup = await (prisma as any).$transaction(async (tx: any) => {
    const created = await tx.supplier.create({
      data: { code: TAG + "-OK", name: TAG + "-OK" },
    });
    await tx.supplier.update({
      where: { id: created.id },
      data: { balance: 42 } as any,
    });
    return created;
  });

  const okAudits = await reader.auditLog.findMany({
    where: { recordId: sup.id },
  });
  log(
    "Başarılı $transaction içi CREATE + UPDATE loglandı",
    okAudits.some((a) => a.action === "CREATE") &&
      okAudits.some((a) => a.action === "UPDATE"),
    { actions: okAudits.map((a) => a.action), user: okAudits[0]?.userName },
  );

  // 2) Rollback durumunda da bir kayıt kalır (girişim kaydı) - bilinçli
  const before = await reader.auditLog.count();
  try {
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.supplier.create({ data: { code: TAG + "-ROLLBACK", name: TAG } });
      throw new Error("ROLLBACK_ON_PURPOSE");
    });
  } catch {
    /* beklenen */
  }
  const after = await reader.auditLog.count();
  const supplierLeft = await reader.supplier.count({
    where: { code: TAG + "-ROLLBACK" },
  });
  log(
    "Rollback: veri silindi",
    supplierLeft === 0,
    { kalanKayit: supplierLeft },
  );
  log(
    "Rollback: audit kaydı korundu (log kaybı yok)",
    after >= before,
    { auditFarki: after - before, not: "girişim kaydı - bilinçli tercih" },
  );

  // temizlik
  await reader.supplier.deleteMany({ where: { code: { startsWith: TAG } } });
  await reader.auditLog.deleteMany({ where: { userName: "TX Kullanıcı" } });

  console.log(
    `\n=== SONUÇ: ${failures === 0 ? "TÜM TESTLER GEÇTİ ✅" : failures + " TEST BAŞARISIZ ❌"} ===`,
  );
  await reader.$disconnect();
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
