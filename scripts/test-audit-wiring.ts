/**
 * AUDIT WIRING ENTEGRASYON TESTİ
 *
 * Uygulamanın GERÇEK prisma export'unu (src/lib/prisma.ts) kullanarak
 * otomatik audit log'un uçtan uca bağlı olduğunu doğrular.
 *
 * Test, extension'ı yeniden kurmaz; uygulamanın kendi modülünü import eder.
 * Böylece "production'da gerçekten çalışıyor mu?" sorusu kanıtlanır.
 */

import { prisma } from "../src/lib/prisma";
import { setAuditContext } from "../src/lib/prisma-audit-middleware";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Audit kayıtlarını okumak için ayrı okuma client'ı
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const reader = new PrismaClient({ adapter: new PrismaPg(pool) });

const TAG = "WIRING-TEST-" + Date.now();
let failures = 0;

function log(step: string, ok: boolean, detail?: any) {
  console.log(`${ok ? "✅" : "❌"} ${step}${detail ? " :: " + JSON.stringify(detail) : ""}`);
  if (!ok) failures++;
}

async function main() {
  console.log("=== AUDIT WIRING ENTEGRASYON TESTİ ===\n");

  // Gerçek API isteği gibi kullanıcı bağlamı kur
  setAuditContext({
    userId: "wiring-user",
    userName: "Wiring Kullanıcı",
    userEmail: "wiring@optimusvet.com",
    ipAddress: "5.6.7.8",
    userAgent: "wiring-test",
    requestPath: "/api/customers",
    requestMethod: "POST",
  });

  // 1) Gerçek prisma export'u üzerinden müşteri oluştur
  const customer = await prisma.customer.create({
    data: {
      code: TAG,
      name: TAG,
    } as any,
  });

  let audits = await reader.auditLog.findMany({
    where: { recordId: customer.id },
    orderBy: { createdAt: "asc" },
  });

  const c = audits.find((a) => a.action === "CREATE");
  log("Gerçek prisma export: CREATE audit oluştu", !!c, {
    table: c?.tableName,
    user: c?.userName,
    ip: c?.ipAddress,
    createdAt: c?.createdAt?.toISOString(),
    method: c?.requestMethod,
  });

  // 2) Güncelleme → eski/yeni değer farkı
  await prisma.customer.update({
    where: { id: customer.id },
    data: { name: TAG + "-GUNCELLENDI", phone: "05559998877" } as any,
  });

  audits = await reader.auditLog.findMany({
    where: { recordId: customer.id },
    orderBy: { createdAt: "asc" },
  });
  const u = audits.find((a) => a.action === "UPDATE");
  const fields = (u?.changedFields as string[]) || [];
  log(
    "Gerçek prisma export: UPDATE audit (eski+yeni değer)",
    !!u && fields.includes("name") && fields.includes("phone"),
    {
      changedFields: fields,
      eskiAd: (u?.oldValues as any)?.name,
      yeniAd: (u?.newValues as any)?.name,
    },
  );

  // 3) Silme → silinen veri saklanmalı
  await prisma.customer.delete({ where: { id: customer.id } });
  audits = await reader.auditLog.findMany({
    where: { recordId: customer.id },
  });
  const d = audits.find((a) => a.action === "DELETE");
  const deletedName = (d?.oldValues as any)?.name;
  log(
    "Gerçek prisma export: DELETE audit (silinen veri saklandı)",
    deletedName === TAG + "-GUNCELLENDI",
    { silinenAd: deletedName },
  );

  // 4) Toplam kayıt: 1 CREATE + 1 UPDATE + 1 DELETE = 3 (çift yok)
  const total = audits.length;
  log("Toplam 3 kayıt (çift kayıt yok)", total === 3, {
    toplam: total,
    detay: audits.map((a) => a.action),
  });

  // Temizlik
  await reader.auditLog.deleteMany({ where: { recordId: customer.id } });

  console.log(
    `\n=== SONUÇ: ${failures === 0 ? "GERÇEK EXPORT DOĞRULANDI ✅" : failures + " SORUN ❌"} ===`,
  );

  await reader.$disconnect();
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("TEST HATASI:", e);
  await pool.end();
  process.exit(1);
});
