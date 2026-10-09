/**
 * VERESİYE DEFTERİ (CSV) ↔ VERİTABANI MUTABAKATI
 *
 * Dış kaynak (muhasebe/veresiye defteri dışa aktarımı) ile uygulama
 * veritabanındaki müşteri bakiyelerini ve işlem bütünlüğünü karşılaştırır.
 *
 * Örnek:
 *   npx tsx scripts/reconcile-with-ledger.ts "C:/Users/erkan/Desktop/veresiye-defteri-2026-10-08.csv"
 *
 * Çıktı: mutabakat-raporu.json + konsol özeti
 */

import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TOL = 0.01;

// CSV tutarı: "232037.00" (nokta ondalık) veya "1.234,56" (TR) destekle
function parseAmount(v: string | undefined): number {
  const s = String(v ?? "0").trim().replace(/\s/g, "");
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(normalized) || 0;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function main() {
  const csvPath =
    process.argv[2] || "veresiye-defteri.csv";
  const raw = readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const csvRows = lines.slice(1).map((l) => {
    const c = splitCsvLine(l);
    return {
      code: (c[0] ?? "").trim(),
      name: (c[1] ?? "").trim(),
      ledgerBalance: parseAmount(c[4]),
    };
  });

  console.log(`CSV satırı: ${csvRows.length}`);

  const customers = await prisma.customer.findMany({
    select: { id: true, code: true, name: true, balance: true },
  });
  const byCode = new Map(customers.map((c) => [c.code, c]));

  const agg = await prisma.$queryRaw<
    Array<{ code: string; formulaA: number; formulaB: number }>
  >`
    SELECT c.code,
      COALESCE(SUM(CASE WHEN t.type IN ('SALE','TREATMENT') THEN t.total ELSE 0 END),0)::float
        - COALESCE(SUM(CASE WHEN t.type='CUSTOMER_PAYMENT' THEN t.total ELSE 0 END),0)::float AS "formulaA",
      COALESCE(SUM(CASE WHEN t.type IN ('SALE','TREATMENT') THEN t.total - t."paidAmount" ELSE 0 END),0)::float
        - COALESCE(SUM(CASE WHEN t.type='CUSTOMER_PAYMENT' THEN t.total ELSE 0 END),0)::float AS "formulaB"
    FROM customers c
    LEFT JOIN transactions t ON t."customerId"=c.id
    GROUP BY c.code
  `;
  const aggByCode = new Map(agg.map((a) => [a.code, a]));

  type Row = {
    code: string;
    name: string;
    ledgerBalance: number;
    dbBalance: number;
    formulaA: number;
    formulaB: number;
    status: "OK" | "LEDGER_DIFF" | "INTERNAL_MISMATCH" | "MISSING_IN_DB";
    ledgerDiff: number;
  };
  const rows: Row[] = [];

  for (const r of csvRows) {
    const db = byCode.get(r.code);
    if (!db) {
      rows.push({
        code: r.code, name: r.name, ledgerBalance: r.ledgerBalance,
        dbBalance: NaN, formulaA: NaN, formulaB: NaN,
        status: "MISSING_IN_DB", ledgerDiff: NaN,
      });
      continue;
    }
    const a = aggByCode.get(r.code);
    const dbBalance = Number(db.balance);
    const formulaA = a ? Number(a.formulaA) : 0;
    const formulaB = a ? Number(a.formulaB) : 0;
    const internalOk =
      Math.abs(dbBalance - formulaA) < TOL || Math.abs(dbBalance - formulaB) < TOL;
    const ledgerOk = Math.abs(r.ledgerBalance - dbBalance) < TOL;

    rows.push({
      code: r.code, name: r.name, ledgerBalance: r.ledgerBalance,
      dbBalance, formulaA, formulaB,
      status: !ledgerOk ? "LEDGER_DIFF" : !internalOk ? "INTERNAL_MISMATCH" : "OK",
      ledgerDiff: +(r.ledgerBalance - dbBalance).toFixed(2),
    });
  }

  const counts = {
    OK: rows.filter((r) => r.status === "OK").length,
    LEDGER_DIFF: rows.filter((r) => r.status === "LEDGER_DIFF").length,
    INTERNAL_MISMATCH: rows.filter((r) => r.status === "INTERNAL_MISMATCH").length,
    MISSING_IN_DB: rows.filter((r) => r.status === "MISSING_IN_DB").length,
  };

  console.log("\n---- ÖZET ----");
  console.log(`Tam mutabık (defter=DB=işlemler): ${counts.OK}`);
  console.log(`Defter ≠ DB bakiye            : ${counts.LEDGER_DIFF}`);
  console.log(`İç tutarsızlık (DB ≠ işlemler) : ${counts.INTERNAL_MISMATCH}`);
  console.log(`DB'de eksik müşteri            : ${counts.MISSING_IN_DB}`);

  const problems = rows.filter((r) => r.status !== "OK");
  if (problems.length) {
    console.log("\n---- SORUNLU KAYITLAR ----");
    for (const p of problems.slice(0, 60)) {
      console.log(
        `[${p.status}] ${p.code} ${p.name}: defter=${p.ledgerBalance.toFixed(2)} ` +
          `DB=${Number.isNaN(p.dbBalance) ? "-" : p.dbBalance.toFixed(2)} ` +
          `A=${Number.isNaN(p.formulaA) ? "-" : p.formulaA.toFixed(2)} ` +
          `B=${Number.isNaN(p.formulaB) ? "-" : p.formulaB.toFixed(2)}`,
      );
    }
    if (problems.length > 60) console.log(`... +${problems.length - 60} kayıt daha`);
  }

  writeFileSync(
    "mutabakat-raporu.json",
    JSON.stringify(
      { generatedAt: new Date().toISOString(), csvPath, counts, problems, all: rows },
      null,
      2,
    ),
  );
  console.log("\nRapor: mutabakat-raporu.json");

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  console.error("HATA:", e);
  await pool.end();
  process.exit(1);
});
