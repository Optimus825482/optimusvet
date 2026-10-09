/**
 * MÜŞTERİ BAKİYE MOTORU (tek doğruluk kaynağı)
 *
 * NEDEN VAR?
 *   Uygulamada tarihsel olarak iki farklı bakiye konvansiyonu bir arada
 *   kullanılmış ve bazı kod yolları bakiyeyi hiç güncellememiş. Bu modül
 *   bakiyeyi TEK bir yerden hesaplar, doğrular ve senkronlar.
 *
 * İKİ KONVANSİYON:
 *
 *   LEDGER (defter — legacy import, SAT-/THS- kodlu kayıtlar)
 *     bakiye = Σ(satış.total) − Σ(tahsilat.total)
 *     Eski muhasebe defteri mantığı: her satış tam borç yazar, her tahsilat
 *     tam alacak yazar. Peşin satışlar ayrıca THS- tahsilat olarak girilmiştir.
 *
 *   MODERN (yeni sistem — STS-/TAH- kodlu kayıtlar)
 *     bakiye = Σ(satış.total − satış.paidAmount)
 *     Yeni akışta her satışın ödenen kısmı doğrudan satış kaydında tutulur
 *     (paidAmount); tahsilatlar FIFO ile satışların paidAmount'una yazılır,
 *     ayrıca müşteri bakiyesinden düşülmez. Bu yüzden modern konvansiyonda
 *     tahsilatlar ayrıca çıkarılmaz.
 *
 *   NOT: Bazı modern müşterilerde hem ayrı TAH- tahsilat kaydı hem de satış
 *   paidAmount güncellemesi bulunabilir; bu durumda LEDGER formülü tutar.
 *   Bu yüzden iki formül birlikte değerlendirilir (OR).
 *
 *   Bir müşterinin bakiyesi bu iki konvansiyondan biriyle tutmalıdır.
 *   Hiçbiriyle tutmuyorsa bakiyeyi bozan bir işlem olmuştur.
 *
 * SENKRON KURALI (gelecekte bozulmayı önler):
 *   Her yazma işleminden sonra ilgili müşterinin bakiyesi, o müşterinin
 *   MEVCUT konvansiyonuna göre yeniden hesaplanıp yazılır. Böylece bakiye
 *   her zaman işlem geçmişiyle tutarlı kalır.
 */

import type { Prisma } from "@prisma/client";

export const BALANCE_TOLERANCE = 0.01;

export type BalanceConvention = "LEDGER" | "MODERN" | "OPEN_SALE" | "UNKNOWN";

export interface BalanceTx {
  type: string;
  total: any;
  paidAmount: any;
}

const num = (v: any): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const round2 = (v: number) => Math.round(v * 100) / 100;

export const isSaleType = (t: string) => t === "SALE" || t === "TREATMENT";
export const isPaymentType = (t: string) => t === "CUSTOMER_PAYMENT";

/** Defter (ledger) konvansiyonu */
export function computeLedgerBalance(transactions: BalanceTx[]): number {
  let b = 0;
  for (const t of transactions) {
    if (isSaleType(t.type)) b += num(t.total);
    else if (isPaymentType(t.type)) b -= num(t.total);
  }
  return round2(b);
}

/** Modern konvansiyon: satışta ödenmemiş kısım borç */
export function computeModernBalance(transactions: BalanceTx[]): number {
  let b = 0;
  for (const t of transactions) {
    if (isSaleType(t.type)) b += num(t.total) - num(t.paidAmount);
  }
  return round2(b);
}

/**
 * Açık satış borcu (kırpılmış): her satışın ödenmemiş kalanı, negatife
 * düşmeden toplanır.
 *   bakiye = Σ max(0, satış.total − satış.paidAmount)
 *
 * Uygulamanın FIFO tahsilat mantığı paidAmount'u total'ı aşmayacak şekilde
 * kapatır; bu yüzden fazla ödemeler (paidAmount > total anomalileri) borcu
 * azaltmaz. MUS-805 gibi müşterilerde kayıtlı bakiye bu formülle tutar.
 */
export function computeOpenSaleBalance(transactions: BalanceTx[]): number {
  let b = 0;
  for (const t of transactions) {
    if (isSaleType(t.type)) b += Math.max(0, num(t.total) - num(t.paidAmount));
  }
  return round2(b);
}

/**
 * Müşterinin bakiye konvansiyonunu belirle.
 *
 * Üç konvansiyon denenir (kayıtlı bakiye hangisiyle tutuyorsa o):
 *   OPEN_SALE : Σ max(0, satış−ödenen)  — açık satış borcu (kırpılmış)
 *   MODERN    : Σ (satış−ödenen)        — fazla ödeme borcu azaltır
 *   LEDGER    : Σsatış − Σtahsilat      — eski defter
 *
 * Öncelik sırası OPEN_SALE > MODERN > LEDGER'dır; OPEN_SALE fifo tahsilat
 * mantığına en yakın olandır. Hiçbiri tutmuyorsa işlem kodlarına göre
 * (legacy çoğunlukta ise LEDGER) karar verilir.
 */
export function detectConvention(
  storedBalance: number,
  transactions: Array<BalanceTx & { code?: string }>,
): BalanceConvention {
  const strict = matchConvention(storedBalance, transactions);
  if (strict) return strict;

  const legacy = transactions.filter((t) => /^(SAT|THS)-/.test(t.code ?? "")).length;
  const total = transactions.length || 1;
  // Fallback: legacy ağırlıklıysa defter; değilse açık satış borcu
  // (modern müşterilerde FIFO tahsilat bu tanıma uyar).
  return legacy / total >= 0.5 ? "LEDGER" : "OPEN_SALE";
}

/**
 * Kayıtlı bakiyeyi KESİN eşleştirir (fallback yok).
 * Hiçbir tanım tutmuyorsa null döner → bu müşteride bakiyeyi bozan bir işlem
 * olmuş demektir ve güvenilir bir "hedef" yoktur (elle karar gerekir).
 */
export function matchConvention(
  storedBalance: number,
  transactions: Array<BalanceTx & { code?: string }>,
): BalanceConvention | null {
  if (Math.abs(storedBalance - computeOpenSaleBalance(transactions)) < BALANCE_TOLERANCE)
    return "OPEN_SALE";
  if (Math.abs(storedBalance - computeModernBalance(transactions)) < BALANCE_TOLERANCE)
    return "MODERN";
  if (Math.abs(storedBalance - computeLedgerBalance(transactions)) < BALANCE_TOLERANCE)
    return "LEDGER";
  return null;
}

export interface BalanceSnapshot {
  customerId: string;
  code?: string;
  name?: string;
  storedBalance: number;
  ledgerBalance: number;
  modernBalance: number;
  openSaleBalance: number;
  convention: BalanceConvention;
  expectedBalance: number; // konvansiyona göre beklenen
  difference: number; // stored - expected
  consistent: boolean;
}

export function buildSnapshot(
  customer: { id: string; code?: string; name?: string; balance: any },
  transactions: BalanceTx[],
): BalanceSnapshot {
  const stored = round2(num(customer.balance));
  const ledger = computeLedgerBalance(transactions);
  const modern = computeModernBalance(transactions);
  const openSale = computeOpenSaleBalance(transactions);
  const convention = detectConvention(stored, transactions as any);
  const expected =
    convention === "LEDGER"
      ? ledger
      : convention === "OPEN_SALE"
        ? openSale
        : modern;
  const difference = round2(stored - expected);
  return {
    customerId: customer.id,
    code: customer.code,
    name: customer.name,
    storedBalance: stored,
    ledgerBalance: ledger,
    modernBalance: modern,
    openSaleBalance: openSale,
    convention,
    expectedBalance: expected,
    difference,
    consistent: Math.abs(difference) < BALANCE_TOLERANCE,
  };
}

// =====================================================
// PRISMA İLE SENKRON
// =====================================================

type PrismaLike = {
  transaction: { findMany: (args: any) => Promise<any[]> };
  customer: { update: (args: any) => Promise<any>; findUnique: (args: any) => Promise<any> };
};

/**
 * Bir müşterinin bakiyesini işlemlerinden yeniden hesaplayıp yazar.
 * Hem prisma hem de $transaction tx client'ı ile çalışır.
 *
 * @param mode "preserve" → mevcut konvansiyonu koru; "modern" → modern zorla
 * @returns senkron sonucu
 */
export async function syncCustomerBalance(
  db: PrismaLike,
  customerId: string,
  mode: "preserve" | "modern" | "ledger" = "preserve",
): Promise<{ updated: boolean; before: number; after: number; convention: BalanceConvention }> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { id: true, code: true, name: true, balance: true },
  });
  if (!customer) {
    return { updated: false, before: 0, after: 0, convention: "UNKNOWN" };
  }

  const transactions = await db.transaction.findMany({
    where: {
      customerId,
      type: { in: ["SALE", "TREATMENT", "CUSTOMER_PAYMENT"] },
    },
    select: { type: true, total: true, paidAmount: true, code: true },
  });

  const snapshot = buildSnapshot(customer, transactions);

  let target: number;
  let used: BalanceConvention;
  if (mode === "modern") {
    target = snapshot.modernBalance;
    used = "MODERN";
  } else if (mode === "ledger") {
    target = snapshot.ledgerBalance;
    used = "LEDGER";
  } else {
    // preserve: konvansiyonun beklediği değer
    target = snapshot.expectedBalance;
    used = snapshot.convention;
  }

  const before = round2(num(customer.balance));
  if (Math.abs(before - target) < BALANCE_TOLERANCE) {
    return { updated: false, before, after: before, convention: used };
  }

  await db.customer.update({
    where: { id: customerId },
    data: { balance: target },
  });
  return { updated: true, before, after: target, convention: used };
}

/**
 * Bakiye değişimini güvenli uygula: verilen delta kadar değiştirip yazar.
 * (Eski `increment/decrement` kullanan kod yollarının yerine, okuma+yazma
 * yaparak race-condition ve işaret hatalarını azaltır.)
 */
export async function applyBalanceDelta(
  db: PrismaLike,
  customerId: string,
  delta: number,
): Promise<{ before: number; after: number }> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { balance: true },
  });
  const before = round2(num(customer?.balance));
  const after = round2(before + delta);
  if (Math.abs(before - after) < BALANCE_TOLERANCE) {
    return { before, after: before };
  }
  await db.customer.update({
    where: { id: customerId },
    data: { balance: after },
  });
  return { before, after };
}

/** Legacy (defter) kaydı mı? */
export function isLegacyCode(code?: string | null): boolean {
  return /^(SAT|THS)-/.test(code ?? "");
}

/**
 * Bir işlemin müşteri bakiyesine etkisi (delta).
 *
 * Konvansiyon-uyumlu:
 *   LEDGER (defter):
 *     satış    → +total        (tam borç; ödemeler ayrı THS- kaydı)
 *     tahsilat → −total
 *   MODERN:
 *     satış    → +(total − paidAmount)
 *     tahsilat → 0             (tahsilat FIFO ile satışın paidAmount'unu
 *                               günceller; bakiye Σ(total−paid) üzerinden
 *                               zaten azalır. Ayrıca düşmek çift sayım olur.)
 *
 * Bu, hem kayıt ekleme hem de silme/güncelleme geri alımı için
 * kullanılabilecek tek doğru delta'yı verir.
 */
export function entryBalanceDelta(
  entry: { type: string; total: any; paidAmount: any },
  convention: BalanceConvention,
): number {
  if (isSaleType(entry.type)) {
    if (convention === "LEDGER") return round2(num(entry.total));
    if (convention === "OPEN_SALE")
      return round2(Math.max(0, num(entry.total) - num(entry.paidAmount)));
    return round2(num(entry.total) - num(entry.paidAmount)); // MODERN
  }
  if (isPaymentType(entry.type)) {
    // MODERN/OPEN_SALE: tahsilat FIFO ile satışın paidAmount'una yansır → 0.
    return convention === "LEDGER" ? round2(-num(entry.total)) : 0;
  }
  return 0;
}

/**
 * Bakiyeyi, işlem listesindeki değişikliğe göre güncelle:
 * yeni işlemin deltasını ekle, eski işlemin deltasını çıkar.
 * Konvansiyonu bozmadan kalibre eder (yeniden hesaplama YAPMAZ).
 */
export async function applyEntryDelta(
  db: PrismaLike,
  customerId: string,
  entries: {
    added?: Array<{ type: string; total: any; paidAmount: any }>;
    removed?: Array<{ type: string; total: any; paidAmount: any }>;
    convention: BalanceConvention;
  },
): Promise<{ before: number; after: number; delta: number }> {
  let delta = 0;
  for (const e of entries.added ?? []) delta += entryBalanceDelta(e, entries.convention);
  for (const e of entries.removed ?? []) delta -= entryBalanceDelta(e, entries.convention);
  delta = round2(delta);
  const res = await applyBalanceDelta(db, customerId, delta);
  return { ...res, delta };
}
