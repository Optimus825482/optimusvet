import { prisma } from "../src/lib/prisma";

async function checkErolDemir() {
  const customerCode = "MUS-173"; // Erol DEMİR

  console.log("🔍 EROL DEMİR - BAKİYE KONTROL RAPORU");
  console.log("=".repeat(80));

  try {
    // Müşteriyi bul
    const customer = await prisma.customer.findFirst({
      where: { code: customerCode },
    });

    if (!customer) {
      console.log(`❌ Müşteri bulunamadı: ${customerCode}`);
      return;
    }

    console.log(`\n👤 MÜŞTERİ BİLGİLERİ:`);
    console.log(`   Kod: ${customer.code}`);
    console.log(`   Ad: ${customer.name}`);
    console.log(`   Telefon: ${customer.phone || "Yok"}`);
    console.log(
      `   Bakiye: ₺${parseFloat(customer.balance.toString()).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
    );

    // Satışları kontrol et
    const sales = await prisma.transaction.findMany({
      where: {
        customerId: customer.id,
        type: "SALE",
      },
      orderBy: { date: "desc" },
      include: {
        items: true,
      },
    });

    console.log(`\n📊 SATIŞ İŞLEMLERİ:`);
    console.log(`   Toplam Satış Sayısı: ${sales.length}`);

    if (sales.length > 0) {
      let totalSalesAmount = 0;

      console.log(`\n   Satış Detayları:`);
      sales.slice(0, 10).forEach((sale, idx) => {
        const saleTotal = parseFloat(sale.total.toString());
        totalSalesAmount += saleTotal;

        console.log(`\n   ${idx + 1}. Satış:`);
        console.log(`      ID: ${sale.id}`);
        console.log(`      Tarih: ${sale.date.toLocaleDateString("tr-TR")}`);
        console.log(
          `      Tutar: ₺${saleTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
        );
        console.log(`      Durum: ${sale.status}`);
        console.log(`      Kalem Sayısı: ${sale.items.length}`);
      });

      // Toplam hesapla
      sales.forEach((sale) => {
        totalSalesAmount += parseFloat(sale.total.toString());
      });

      console.log(
        `\n   Toplam Satış Tutarı: ₺${totalSalesAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
    } else {
      console.log(`   ⚠️  Bu müşteriye ait satış kaydı bulunamadı!`);
    }

    // Ödemeleri kontrol et
    const payments = await prisma.transaction.findMany({
      where: {
        customerId: customer.id,
        type: "CUSTOMER_PAYMENT",
      },
      orderBy: { date: "desc" },
    });

    console.log(`\n💰 ÖDEME İŞLEMLERİ:`);
    console.log(`   Toplam Ödeme Sayısı: ${payments.length}`);

    if (payments.length > 0) {
      let totalPayments = 0;

      payments.forEach((payment) => {
        totalPayments += parseFloat(payment.total.toString());
      });

      console.log(
        `   Toplam Ödeme Tutarı: ₺${totalPayments.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
    }

    // Tüm işlemleri say
    const allTransactions = await prisma.transaction.count({
      where: { customerId: customer.id },
    });

    console.log(`\n📝 TOPLAM İŞLEM SAYISI: ${allTransactions}`);

    // Sonuç
    console.log(`\n\n📋 SONUÇ:`);
    console.log(
      `   Sistemdeki Bakiye: ₺${parseFloat(customer.balance.toString()).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
    );
    console.log(`   Satış Sayısı: ${sales.length}`);
    console.log(`   Ödeme Sayısı: ${payments.length}`);
    console.log(`   Toplam İşlem: ${allTransactions}`);

    if (sales.length === 0 && parseFloat(customer.balance.toString()) > 0) {
      console.log(`\n   ⚠️  SORUN TESPİT EDİLDİ!`);
      console.log(`   Müşterinin ₺29.250,00 alacağı var ama satış kaydı yok!`);
      console.log(`   Bu bakiye Excel'den import edilmiş başlangıç bakiyesi.`);
      console.log(
        `   Satış kayıtları ya yüklenmemiş ya da müşteri eşleşmesi yanlış.`,
      );
    }

    console.log("\n" + "=".repeat(80));
  } catch (error) {
    console.error("❌ HATA:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkErolDemir();
