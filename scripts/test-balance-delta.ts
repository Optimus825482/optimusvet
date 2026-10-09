/**
 * BAKİYE DAVRANIŞ TESTİ
 *
 * Gerçek API akışını (satış → tahsilat) taklit ederek, bakiye
 * konvansiyonlarının nasıl davrandığını ve entryBalanceDelta mantığının
 * tutarlılığını doğrular.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  entryBalanceDelta,
  computeLedgerBalance,
  computeModernBalance,
  detectConvention,
} from "../src/lib/customer-balance";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const TAG = "BALTEST-" + Date.now();
let fail = 0;
const check = (name: string, ok: boolean, d?: any) => {
  console.log(`${ok ? "✅" : "❌"} ${name}${d ? " :: " + JSON.stringify(d) : ""}`);
  if (!ok) fail++;
};

async function main() {
  console.log("=== BAKİYE DELTA MANTIĞI TESTİ ===\n");

  // --- Saf fonksiyon testleri ---
  // MODERN: satış 1000, 400 ödenmiş → delta +600; tahsilat → 0
  check(
    "MODERN satış deltası (1000, 400 ödenmiş) = +600",
    entryBalanceDelta({ type: "SALE", total: 1000, paidAmount: 400 }, "MODERN") === 600,
  );
  check(
    "MODERN tahsilat deltası = 0 (FIFO paidAmount'a yansır)",
    entryBalanceDelta({ type: "CUSTOMER_PAYMENT", total: 500, paidAmount: 500 }, "MODERN") === 0,
  );
  // LEDGER: satış 1000 → +1000; tahsilat 500 → -500
  check(
    "LEDGER satış deltası (1000) = +1000",
    entryBalanceDelta({ type: "SALE", total: 1000, paidAmount: 400 }, "LEDGER") === 1000,
  );
  check(
    "LEDGER tahsilat deltası (500) = -500",
    entryBalanceDelta({ type: "CUSTOMER_PAYMENT", total: 500, paidAmount: 500 }, "LEDGER") === -500,
  );

  // --- Formül tutarlılığı ---
  const modernTx = [
    { type: "SALE", total: 1000, paidAmount: 400 },
    { type: "SALE", total: 500, paidAmount: 500 },
    { type: "CUSTOMER_PAYMENT", total: 300, paidAmount: 300 },
  ];
  const sumDeltaModern = modernTx.reduce(
    (s, t) => s + entryBalanceDelta(t, "MODERN"),
    0,
  );
  check(
    "MODERN: delta toplamı = modern formül",
    Math.abs(sumDeltaModern - computeModernBalance(modernTx)) < 0.01,
    { sumDeltaModern, formula: computeModernBalance(modernTx) },
  );

  const ledgerTx = [
    { type: "SALE", total: 1000, paidAmount: 1000 },
    { type: "CUSTOMER_PAYMENT", total: 1000, paidAmount: 0 },
  ];
  const sumDeltaLedger = ledgerTx.reduce(
    (s, t) => s + entryBalanceDelta(t, "LEDGER"),
    0,
  );
  check(
    "LEDGER: delta toplamı = ledger formül",
    Math.abs(sumDeltaLedger - computeLedgerBalance(ledgerTx)) < 0.01,
    { sumDeltaLedger, formula: computeLedgerBalance(ledgerTx) },
  );

  // --- Konvansiyon tespiti ---
  // OPEN_SALE öncelikli: modernTx açık satış borcu 600 + tahsilatlar paidAmount'a
  // yansımış → stored=600 hem OPEN_SALE hem MODERN'a uyar; OPEN_SALE seçilir.
  check(
    "Konvansiyon tespiti: 600 → OPEN_SALE (en yakın tanım)",
    detectConvention(600, modernTx as any) === "OPEN_SALE",
  );
  // LEDGER'ı ayırt eden örnek: eski defterde peşin satış da tam borç yazar.
  // Bu müşteride 1000 TL peşin satış var (paidAmount=total), ayrı tahsilat yok.
  //   ledger = 1000, openSale = 0, modern = 0 → stored 1000 ise LEDGER demektir.
  const ledgerOnly = [{ type: "SALE", total: 1000, paidAmount: 1000 }];
  check(
    "Konvansiyon tespiti: peşin legacy satış (1000) → LEDGER",
    detectConvention(1000, ledgerOnly as any) === "LEDGER",
  );
  check(
    "Konvansiyon tespiti: tutmayan bakiye → fallback (null değil)",
    detectConvention(99999, ledgerTx as any) !== "UNKNOWN",
  );

  console.log(
    `\n=== SONUÇ: ${fail === 0 ? "TÜM TESTLER GEÇTİ ✅" : fail + " TEST BAŞARISIZ ❌"} ===`,
  );
  await prisma.$disconnect();
  await pool.end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
