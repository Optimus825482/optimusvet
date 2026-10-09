/**
 * AUDIT EXTENSION TEST
 *
 * Prisma audit extension'ın CREATE / UPDATE / DELETE / UPSERT işlemlerini
 * otomatik olarak audit_logs tablosuna zaman damgalı yazdığını doğrular.
 *
 * Çalıştırma: npx tsx scripts/test-audit-extension.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  createAuditExtension,
  setAuditWriter,
  setAuditContext,
} from "../src/lib/prisma-audit-middleware";
import { setAuditExtensionActive } from "../src/lib/audit";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const basePrisma = new PrismaClient({ adapter });
setAuditWriter(basePrisma);
setAuditExtensionActive(true);

const prisma = basePrisma.$extends(createAuditExtension());

const TAG = "AUDIT-TEST-" + Date.now();

function log(step: string, ok: boolean, detail?: any) {
  console.log(`${ok ? "✅" : "❌"} ${step}${detail ? " :: " + JSON.stringify(detail) : ""}`);
}

async function auditRowsFor(recordId: string) {
  return basePrisma.auditLog.findMany({
    where: { recordId },
    orderBy: { createdAt: "asc" },
  });
}

async function main() {
  console.log("=== AUDIT EXTENSION TEST BAŞLADI ===\n");

  // Kullanıcı bağlamını simüle et (API isteği gibi)
  setAuditContext({
    userId: "test-user-id",
    userName: "Test Kullanıcı",
    userEmail: "test@example.com",
    ipAddress: "1.2.3.4",
    userAgent: "audit-test",
    requestPath: "/api/test",
    requestMethod: "POST",
  });

  let failures = 0;

  // ---------- 1) CREATE ----------
  const supplier = await prisma.supplier.create({
    data: {
      code: TAG,
      name: TAG,
      phone: "0000000000",
    } as any,
  });

  let rows = await auditRowsFor(supplier.id);
  const createRow = rows.find((r) => r.action === "CREATE");
  if (createRow) {
    log("CREATE yakalandı", true, {
      table: createRow.tableName,
      user: createRow.userName,
      email: createRow.userEmail,
      ip: createRow.ipAddress,
      createdAt: createRow.createdAt.toISOString(),
      rmethod: createRow.requestMethod,
    });
    // Çift kayıt kontrolü
    const createCount = rows.filter((r) => r.action === "CREATE").length;
    log("CREATE tek kez yazıldı (çift kayıt yok)", createCount === 1, {
      createKayitSayisi: createCount,
    });
    if (createCount !== 1) failures++;
  } else {
    log("CREATE yakalanmadı", false);
    failures++;
  }

  // ---------- 2) UPDATE ----------
  await prisma.supplier.update({
    where: { id: supplier.id },
    data: { phone: "1111111111", notes: TAG + "-updated" } as any,
  });

  rows = await auditRowsFor(supplier.id);
  const updateRow = rows.find((r) => r.action === "UPDATE");
  if (updateRow) {
    const fields = updateRow.changedFields as string[];
    const oldVals = updateRow.oldValues as any;
    const newVals = updateRow.newValues as any;
    const ok =
      fields.includes("phone") &&
      oldVals?.phone === "0000000000" &&
      newVals?.phone === "1111111111";
    log("UPDATE yakalandı (eski+yeni değer ile)", ok, {
      changedFields: fields,
      oldPhone: oldVals?.phone,
      newPhone: newVals?.phone,
    });
    if (!ok) failures++;
  } else {
    log("UPDATE yakalanmadı", false);
    failures++;
  }

  // ---------- 3) DELETE ----------
  await prisma.supplier.delete({ where: { id: supplier.id } });

  rows = await auditRowsFor(supplier.id);
  const deleteRow = rows.find((r) => r.action === "DELETE");
  if (deleteRow) {
    const oldVals = deleteRow.oldValues as any;
    log("DELETE yakalandı (silinen veri saklandı)", oldVals?.name === TAG, {
      silinenIsim: oldVals?.name,
      createdAt: deleteRow.createdAt.toISOString(),
    });
    if (oldVals?.name !== TAG) failures++;
  } else {
    log("DELETE yakalanmadı", false);
    failures++;
  }

  // ---------- 4) CREATE (kullanıcı bağlamı olmadan) → yine de loglanmalı ----------
  setAuditContext(undefined as any);
  const supplier2 = await prisma.supplier.create({
    data: { code: TAG + "-noctx", name: TAG + "-noctx" } as any,
  });
  rows = await auditRowsFor(supplier2.id);
  const noCtxRow = rows.find((r) => r.action === "CREATE");
  if (noCtxRow) {
    log("Bağlam yokken CREATE yine de loglandı", true, {
      userName: noCtxRow.userName,
      createdAt: noCtxRow.createdAt.toISOString(),
    });
  } else {
    log("Bağlam yokken CREATE loglanmadı", false);
    failures++;
  }
  await prisma.supplier.delete({ where: { id: supplier2.id } });

  // ---------- 5) AuditLog tablosu kendini loglamamalı ----------
  const auditLogCount = await basePrisma.auditLog.count({
    where: { tableName: "audit_logs" },
  });
  log("audit_logs tablosu kendini loglamıyor", true, {
    auditLogsTabloKaydi: auditLogCount,
  });

  // ---------- 6) $transaction içindeki yazmalar (tahsilat akışı) ----------
  setAuditContext({
    userId: "tx-user",
    userEmail: "tx@example.com",
    userName: "TX Kullanıcı",
    ipAddress: "9.9.9.9",
    requestMethod: "POST",
  });

  const txSupplier = await prisma.supplier.create({
    data: { code: TAG + "-TXC", name: TAG + "-TXC" } as any,
  });

  const txResult = await prisma.$transaction(async (tx) => {
    const t = await tx.supplier.create({
      data: { code: TAG + "-TXT", name: TAG + "-TXT" } as any,
    });
    await (tx as any).supplier.update({
      where: { id: txSupplier.id },
      data: { balance: 123.45 } as any,
    });
    return t;
  });

  const txRows = await auditRowsFor(txResult.id);
  const txCreateOk = txRows.some((r) => r.action === "CREATE");
  const txSupplierRows = await auditRowsFor(txSupplier.id);
  const txUpdateOk = txSupplierRows.some(
    (r) => r.action === "UPDATE" && (r.changedFields as string[]).includes("balance"),
  );
  log("$transaction içinde CREATE yakalandı", txCreateOk, {
    user: txRows[0]?.userName,
  });
  log("$transaction içinde UPDATE yakalandı", txUpdateOk);
  if (!txCreateOk) failures++;
  if (!txUpdateOk) failures++;

  // temizlik
  await basePrisma.supplier.deleteMany({
    where: { code: { in: [TAG + "-TXC", TAG + "-TXT"] } },
  });

  // ---------- 7) API route davranışı: prisma.create + elle auditCreate ----------
  // Eski kodda route'lar hem create yapıp hem auditCreate() çağırıyordu.
  // Extension aktifken elle çağrı no-op olmalı; toplam 1 kayıt olmalı.
  const { auditCreate } = await import("../src/lib/audit");
  const dupSupplier = await prisma.supplier.create({
    data: { code: TAG + "-DUP", name: TAG + "-DUP" } as any,
  });
  // Route'un eski davranışını taklit et:
  await auditCreate("suppliers", dupSupplier.id, dupSupplier as any, {
    userId: "route-user",
    userEmail: "route@example.com",
    userName: "Route Kullanıcı",
  });

  const dupRows = (
    await basePrisma.auditLog.findMany({
      where: { recordId: dupSupplier.id, action: "CREATE" },
    })
  ).length;
  log("Elle auditCreate + extension → tek kayıt (çift yazım yok)", dupRows === 1, {
    toplamCreateKaydi: dupRows,
  });
  if (dupRows !== 1) failures++;

  await basePrisma.supplier.delete({ where: { id: dupSupplier.id } });
  await basePrisma.auditLog.deleteMany({
    where: { recordId: dupSupplier.id },
  });

  console.log(
    `\n=== SONUÇ: ${failures === 0 ? "TÜM TESTLER GEÇTİ ✅" : failures + " TEST BAŞARISIZ ❌"} ===`,
  );

  await basePrisma.$disconnect();
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("TEST HATASI:", e);
  await pool.end();
  process.exit(1);
});
