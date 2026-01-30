import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkCustomerBalance() {
  const customerCode = "MUS-173"; // Erol DEMİR

  console.log("🔍 MÜŞTERİ BAKİYE KONTROL RAPORU");
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
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
        },
      },
    });

    console.log(`\n📊 SATIŞ İŞLEMLERİ:`);
    console.log(`   Toplam Satış Sayısı: ${sales.length}`);

    if (sales.length > 0) {
      let totalSalesAmount = 0;

      console.log(`\n   Satış Detayları:`);
      sales.forEach((sale, idx) => {
        const saleTotal = parseFloat(sale.total.toString());
        totalSalesAmount += saleTotal;

        console.log(`\n   ${idx + 1}. Satış:`);
        console.log(`      Tarih: ${sale.date.toLocaleDateString("tr-TR")}`);
        console.log(
          `      Tutar: ₺${saleTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
        );
        console.log(`      Durum: ${sale.status}`);
        console.log(`      Kalem Sayısı: ${sale.items.length}`);

        if (sale.items.length > 0) {
          console.log(`      Ürünler:`);
          sale.items.forEach((item) => {
            const itemTotal = parseFloat(item.total.toString());
            console.log(
              `         - ${item.productName}: ${item.quantity} x ₺${parseFloat(item.unitPrice.toString()).toFixed(2)} = ₺${itemTotal.toFixed(2)}`,
            );
          });
        }
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

      console.log(`\n   Ödeme Detayları:`);
      payments.forEach((payment, idx) => {
        const paymentAmount = parseFloat(payment.total.toString());
        totalPayments += paymentAmount;

        console.log(`\n   ${idx + 1}. Ödeme:`);
        console.log(`      Tarih: ${payment.date.toLocaleDateString("tr-TR")}`);
        console.log(
          `      Tutar: ₺${paymentAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
        );
        console.log(`      Açıklama: ${payment.description || "Yok"}`);
      });

      console.log(
        `\n   Toplam Ödeme Tutarı: ₺${totalPayments.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
    } else {
      console.log(`   ℹ️  Bu müşteriye ait ödeme kaydı bulunamadı.`);
    }

    // Tedavi kayıtları
    const treatments = await prisma.transaction.findMany({
      where: {
        customerId: customer.id,
        type: "TREATMENT",
      },
      orderBy: { date: "desc" },
    });

    console.log(`\n🏥 TEDAVİ İŞLEMLERİ:`);
    console.log(`   Toplam Tedavi Sayısı: ${treatments.length}`);

    if (treatments.length > 0) {
      let totalTreatments = 0;

      treatments.forEach((treatment, idx) => {
        const treatmentAmount = parseFloat(treatment.total.toString());
        totalTreatments += treatmentAmount;

        console.log(`\n   ${idx + 1}. Tedavi:`);
        console.log(
          `      Tarih: ${treatment.date.toLocaleDateString("tr-TR")}`,
        );
        console.log(
          `      Tutar: ₺${treatmentAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
        );
      });

      console.log(
        `\n   Toplam Tedavi Tutarı: ₺${totalTreatments.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
    }

    // Excel'den gelen orijinal bakiye
    console.log(`\n\n📋 BAKİYE ANALİZİ:`);
    console.log(
      `   Sistemdeki Bakiye: ₺${parseFloat(customer.balance.toString()).toLocaleString("tr-TR", { minimumFractionDigints: 2 })}`,
    );
    console.log(`   Satış Sayısı: ${sales.length}`);
    console.log(`   Ödeme Sayısı: ${payments.length}`);
    console.log(`   Tedavi Sayısı: ${treatments.length}`);

    if (sales.length === 0 && parseFloat(customer.balance.toString()) > 0) {
      console.log(
        `\n   ⚠️  UYARI: Müşterinin bakiyesi var ama satış kaydı yok!`,
      );
      console.log(
        `   Bu bakiye muhtemelen Excel'den import edilmiş başlangıç bakiyesi.`,
      );
      console.log(
        `   Satış kayıtları eksik veya müşteri eşleşmesi yanlış olabilir.`,
      );
    }

    // Tüm işlemleri göster
    const allTransactions = await prisma.transaction.findMany({
      where: { customerId: customer.id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        type: true,
        date: true,
        total: true,
        status: true,
        description: true,
      },
    });

    console.log(`\n\n📝 TÜM İŞLEMLER (${allTransactions.length} adet):`);
    allTransactions.forEach((tx, idx) => {
      const amount = parseFloat(tx.total.toString());
      const typeLabels: Record<string, string> = {
        SALE: "🛒 Satış",
        CUSTOMER_PAYMENT: "💰 Ödeme",
        TREATMENT: "🏥 Tedavi",
        PURCHASE: "📦 Alım",
        RETURN: "↩️  İade",
      };

      console.log(
        `   ${idx + 1}. ${typeLabels[tx.type] || tx.type} - ${tx.date.toLocaleDateString("tr-TR")} - ₺${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} - ${tx.status}`,
      );
    });

    console.log("\n" + "=".repeat(80));
  } catch (error) {
    console.error("❌ HATA:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomerBalance();
