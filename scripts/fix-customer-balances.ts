/**
 * Müşteri Bakiyelerini Düzeltme Scripti
 *
 * Bu script tüm müşterilerin bakiyelerini yeniden hesaplar.
 * Eski sistemde yanlış kaydedilmiş bakiyeleri düzeltir.
 *
 * KULLANIM:
 * npx tsx scripts/fix-customer-balances.ts
 *
 * VEYA
 * npm run fix-balances
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface BalanceReport {
  customerId: string;
  customerName: string;
  oldBalance: number;
  newBalance: number;
  difference: number;
  totalSales: number;
  totalPayments: number;
  salesCount: number;
  paymentsCount: number;
}

async function fixCustomerBalances() {
  console.log("🔧 Müşteri bakiyelerini düzeltme işlemi başlatılıyor...\n");

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    include: {
      transactions: {
        where: {
          type: {
            in: ["SALE", "TREATMENT", "CUSTOMER_PAYMENT"],
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  console.log(`📊 Toplam ${customers.length} müşteri bulundu.\n`);

  const reports: BalanceReport[] = [];
  let fixedCount = 0;
  let errorCount = 0;

  for (const customer of customers) {
    try {
      console.log(`\n🔍 İşleniyor: ${customer.name} (${customer.code})`);

      // Mevcut bakiye
      const oldBalance = Number(customer.balance);

      // Satışları hesapla (borç)
      const sales = customer.transactions.filter(
        (t) => t.type === "SALE" || t.type === "TREATMENT",
      );
      const totalSales = sales.reduce((sum, sale) => {
        const total = Number(sale.total);
        const paid = Number(sale.paidAmount);
        return sum + (total - paid); // Sadece ödenmemiş kısım
      }, 0);

      // Tahsilatları hesapla (alacak)
      const payments = customer.transactions.filter(
        (t) => t.type === "CUSTOMER_PAYMENT",
      );
      const totalPayments = payments.reduce(
        (sum, payment) => sum + Number(payment.total),
        0,
      );

      // Yeni bakiye = Satışlar - Tahsilatlar
      const newBalance = totalSales - totalPayments;

      // Fark
      const difference = newBalance - oldBalance;

      // Rapor ekle
      reports.push({
        customerId: customer.id,
        customerName: customer.name,
        oldBalance,
        newBalance,
        difference,
        totalSales,
        totalPayments,
        salesCount: sales.length,
        paymentsCount: payments.length,
      });

      console.log(`  Eski Bakiye: ${oldBalance.toFixed(2)} TL`);
      console.log(`  Yeni Bakiye: ${newBalance.toFixed(2)} TL`);
      console.log(`  Fark: ${difference.toFixed(2)} TL`);
      console.log(
        `  Satışlar: ${totalSales.toFixed(2)} TL (${sales.length} adet)`,
      );
      console.log(
        `  Tahsilatlar: ${totalPayments.toFixed(2)} TL (${payments.length} adet)`,
      );

      // Bakiyeyi güncelle (fark varsa)
      if (Math.abs(difference) > 0.01) {
        // 1 kuruş tolerans
        await prisma.customer.update({
          where: { id: customer.id },
          data: { balance: newBalance },
        });
        console.log(`  ✅ Bakiye güncellendi!`);
        fixedCount++;
      } else {
        console.log(`  ✓ Bakiye zaten doğru.`);
      }
    } catch (error) {
      console.error(`  ❌ HATA: ${error}`);
      errorCount++;
    }
  }

  // Özet rapor
  console.log("\n" + "=".repeat(80));
  console.log("📊 ÖZET RAPOR");
  console.log("=".repeat(80));
  console.log(`Toplam Müşteri: ${customers.length}`);
  console.log(`Düzeltilen: ${fixedCount}`);
  console.log(`Hata: ${errorCount}`);
  console.log(`Değişiklik Yok: ${customers.length - fixedCount - errorCount}`);

  // Detaylı rapor (fark olanlar)
  const changedReports = reports.filter((r) => Math.abs(r.difference) > 0.01);
  if (changedReports.length > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("📋 DETAYLI RAPOR (Değişenler)");
    console.log("=".repeat(80));
    console.table(
      changedReports.map((r) => ({
        Müşteri: r.customerName,
        "Eski Bakiye": r.oldBalance.toFixed(2),
        "Yeni Bakiye": r.newBalance.toFixed(2),
        Fark: r.difference.toFixed(2),
        "Satış Sayısı": r.salesCount,
        "Tahsilat Sayısı": r.paymentsCount,
      })),
    );
  }

  // Toplam fark
  const totalDifference = reports.reduce((sum, r) => sum + r.difference, 0);
  console.log(`\n💰 Toplam Fark: ${totalDifference.toFixed(2)} TL`);

  console.log("\n✅ İşlem tamamlandı!");
}

async function recalculateSalesStatus() {
  console.log("\n🔧 Satış durumlarını yeniden hesaplama başlatılıyor...\n");

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let updatedSalesCount = 0;

  for (const customer of customers) {
    console.log(`\n🔍 İşleniyor: ${customer.name}`);

    // Tüm tahsilatları topla
    const paymentsResult = await prisma.transaction.aggregate({
      where: {
        customerId: customer.id,
        type: "CUSTOMER_PAYMENT",
      },
      _sum: {
        total: true,
      },
    });

    const totalPayments = Number(paymentsResult._sum.total || 0);

    // Tüm satışları getir (en eskiden yeniye)
    const sales = await prisma.transaction.findMany({
      where: {
        customerId: customer.id,
        type: {
          in: ["SALE", "TREATMENT"],
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    let remainingPayment = totalPayments;

    // Her satışı güncelle (FIFO)
    for (const sale of sales) {
      const saleTotal = Number(sale.total);
      let newPaidAmount = 0;
      let newStatus: "PAID" | "PARTIAL" | "PENDING" = "PENDING";

      if (remainingPayment >= saleTotal) {
        // Tam ödendi
        newPaidAmount = saleTotal;
        newStatus = "PAID";
        remainingPayment -= saleTotal;
      } else if (remainingPayment > 0) {
        // Kısmi ödendi
        newPaidAmount = remainingPayment;
        newStatus = "PARTIAL";
        remainingPayment = 0;
      } else {
        // Ödenmedi
        newPaidAmount = 0;
        newStatus = "PENDING";
      }

      // Güncelle (değişiklik varsa)
      const oldPaidAmount = Number(sale.paidAmount);
      const oldStatus = sale.status;

      if (
        Math.abs(newPaidAmount - oldPaidAmount) > 0.01 ||
        newStatus !== oldStatus
      ) {
        await prisma.transaction.update({
          where: { id: sale.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
          },
        });
        console.log(
          `  ✅ ${sale.code}: ${oldStatus} (${oldPaidAmount.toFixed(2)}) → ${newStatus} (${newPaidAmount.toFixed(2)})`,
        );
        updatedSalesCount++;
      }
    }
  }

  console.log(`\n✅ Toplam ${updatedSalesCount} satış güncellendi!`);
}

async function main() {
  try {
    console.log("🚀 Bakiye Düzeltme Scripti Başlatılıyor...\n");

    // 1. Müşteri bakiyelerini düzelt
    await fixCustomerBalances();

    // 2. Satış durumlarını yeniden hesapla
    await recalculateSalesStatus();

    console.log("\n🎉 Tüm işlemler başarıyla tamamlandı!");
  } catch (error) {
    console.error("\n❌ HATA:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
main();
