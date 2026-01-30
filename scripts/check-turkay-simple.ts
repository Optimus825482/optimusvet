import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== TURKAY DEMIRHAN TARİH ARALIĞI ANALİZİ ===\n");

  // Müşteriyi bul
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { name: { contains: "Turkay", mode: "insensitive" } },
        { name: { contains: "DEMIRHAN", mode: "insensitive" } },
      ],
    },
  });

  if (!customer) {
    console.log("❌ Müşteri bulunamadı!");
    return;
  }

  console.log(`Müşteri: ${customer.name}`);
  console.log(`Kod: ${customer.code}\n`);

  // Eski sistemdeki tarih aralığı: 7.03.2017 - 31.12.2025
  const oldSystemStart = new Date("2017-03-07");
  const oldSystemEnd = new Date("2025-12-31");

  console.log(
    `Eski Sistem Tarih Aralığı: ${oldSystemStart.toLocaleDateString("tr-TR")} - ${oldSystemEnd.toLocaleDateString("tr-TR")}\n`,
  );

  // Bu tarih aralığındaki satışlar
  const salesInRange = await prisma.sale.findMany({
    where: {
      customerId: customer.id,
      date: {
        gte: oldSystemStart,
        lte: oldSystemEnd,
      },
    },
    orderBy: { date: "asc" },
  });

  const totalSalesInRange = salesInRange.reduce(
    (sum, sale) => sum + sale.totalAmount,
    0,
  );

  console.log(`=== SATIŞLAR (${salesInRange.length} adet) ===`);
  console.log(
    `Toplam Tutar: ${totalSalesInRange.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL\n`,
  );

  // İlk 10 satış
  console.log("İlk 10 Satış:");
  salesInRange.slice(0, 10).forEach((sale) => {
    console.log(
      `${sale.invoiceNumber} - ${sale.date.toLocaleDateString("tr-TR")} - ${sale.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
  });

  // Son 10 satış
  console.log("\nSon 10 Satış:");
  salesInRange.slice(-10).forEach((sale) => {
    console.log(
      `${sale.invoiceNumber} - ${sale.date.toLocaleDateString("tr-TR")} - ${sale.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
  });

  // Bu tarih aralığındaki tahsilatlar
  const paymentsInRange = await prisma.transaction.findMany({
    where: {
      customerId: customer.id,
      type: "PAYMENT",
      date: {
        gte: oldSystemStart,
        lte: oldSystemEnd,
      },
    },
    orderBy: { date: "asc" },
  });

  const totalPaymentsInRange = paymentsInRange.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  console.log(`\n=== TAHSİLATLAR (${paymentsInRange.length} adet) ===`);
  console.log(
    `Toplam Tutar: ${totalPaymentsInRange.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL\n`,
  );

  // Tüm tahsilatları göster
  console.log("Tüm Tahsilatlar:");
  paymentsInRange.forEach((payment) => {
    console.log(
      `${payment.transactionNumber} - ${payment.date.toLocaleDateString("tr-TR")} - ${payment.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL - ${payment.paymentMethod}`,
    );
  });

  // Hesaplanan bakiye
  const calculatedBalance = totalSalesInRange - totalPaymentsInRange;

  console.log("\n=== HESAP ÖZETİ ===");
  console.log(
    `Toplam Satış: ${totalSalesInRange.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );
  console.log(
    `Toplam Tahsilat: ${totalPaymentsInRange.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );
  console.log(
    `Hesaplanan Bakiye: ${calculatedBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );

  console.log("\n=== ESKİ SİSTEM KARŞILAŞTIRMASI ===");
  console.log("Eski Sistem:");
  console.log("  Toplam Borç: 68.003,00 TL");
  console.log("  Toplam Ödeme: 58.529,00 TL");
  console.log("  Bakiye: 9.474,00 TL");
  console.log("\nYeni Sistem (Aynı Tarih Aralığı):");
  console.log(
    `  Toplam Satış: ${totalSalesInRange.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );
  console.log(
    `  Toplam Tahsilat: ${totalPaymentsInRange.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );
  console.log(
    `  Bakiye: ${calculatedBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );

  const salesDiff = totalSalesInRange - 68003;
  const paymentsDiff = totalPaymentsInRange - 58529;
  const balanceDiff = calculatedBalance - 9474;

  console.log("\nFarklar:");
  console.log(
    `  Satış Farkı: ${salesDiff.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );
  console.log(
    `  Tahsilat Farkı: ${paymentsDiff.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );
  console.log(
    `  Bakiye Farkı: ${balanceDiff.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
