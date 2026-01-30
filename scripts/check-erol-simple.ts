import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    "postgresql://postgres:518518Erkan@localhost:5432/optimusvet",
});

async function checkErolDemir() {
  const client = await pool.connect();

  try {
    console.log("🔍 EROL DEMİR - BAKİYE KONTROL RAPORU\n");
    console.log("=".repeat(80));

    // Müşteriyi bul
    const customerResult = await client.query(`
      SELECT * FROM customers WHERE code = 'MUS-173'
    `);

    if (customerResult.rows.length === 0) {
      console.log("❌ Müşteri bulunamadı: MUS-173");
      return;
    }

    const customer = customerResult.rows[0];

    console.log(`\n👤 MÜŞTERİ BİLGİLERİ:`);
    console.log(`   ID: ${customer.id}`);
    console.log(`   Kod: ${customer.code}`);
    console.log(`   Ad: ${customer.name}`);
    console.log(`   Telefon: ${customer.phone || "Yok"}`);
    console.log(
      `   Bakiye: ₺${parseFloat(customer.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
    );

    // Satışları kontrol et
    const salesResult = await client.query(
      `
      SELECT * FROM transactions 
      WHERE "customerId" = $1 AND type = 'SALE'
      ORDER BY date DESC
    `,
      [customer.id],
    );

    console.log(`\n📊 SATIŞ İŞLEMLERİ:`);
    console.log(`   Toplam Satış Sayısı: ${salesResult.rows.length}`);

    if (salesResult.rows.length > 0) {
      console.log(`\n   İlk 10 Satış:`);
      salesResult.rows.slice(0, 10).forEach((sale, idx) => {
        const saleTotal = parseFloat(sale.total);

        console.log(
          `   ${idx + 1}. ${new Date(sale.date).toLocaleDateString("tr-TR")} - ₺${saleTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} - ${sale.status}`,
        );
      });

      // Toplam hesapla
      const totalResult = await client.query(
        `
        SELECT SUM(total) as total_sales
        FROM transactions
        WHERE "customerId" = $1 AND type = 'SALE'
      `,
        [customer.id],
      );

      const totalSales = parseFloat(totalResult.rows[0].total_sales || 0);
      console.log(
        `\n   Toplam Satış Tutarı: ₺${totalSales.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
    } else {
      console.log(`   ⚠️  Bu müşteriye ait satış kaydı bulunamadı!`);
    }

    // Ödemeleri kontrol et
    const paymentsResult = await client.query(
      `
      SELECT COUNT(*) as count, SUM(total) as total_payments
      FROM transactions
      WHERE "customerId" = $1 AND type = 'CUSTOMER_PAYMENT'
    `,
      [customer.id],
    );

    const paymentData = paymentsResult.rows[0];
    console.log(`\n💰 ÖDEME İŞLEMLERİ:`);
    console.log(`   Toplam Ödeme Sayısı: ${paymentData.count}`);
    if (parseInt(paymentData.count) > 0) {
      console.log(
        `   Toplam Ödeme Tutarı: ₺${parseFloat(paymentData.total_payments || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
    }

    // Tüm işlemleri say
    const allTransactionsResult = await client.query(
      `
      SELECT COUNT(*) as count FROM transactions WHERE "customerId" = $1
    `,
      [customer.id],
    );

    console.log(
      `\n📝 TOPLAM İŞLEM SAYISI: ${allTransactionsResult.rows[0].count}`,
    );

    // Sonuç
    console.log(`\n\n📋 SONUÇ:`);
    console.log(
      `   Sistemdeki Bakiye: ₺${parseFloat(customer.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
    );
    console.log(`   Satış Sayısı: ${salesResult.rows.length}`);
    console.log(`   Ödeme Sayısı: ${paymentData.count}`);
    console.log(`   Toplam İşlem: ${allTransactionsResult.rows[0].count}`);

    if (salesResult.rows.length === 0 && parseFloat(customer.balance) > 0) {
      console.log(`\n   ⚠️  SORUN TESPİT EDİLDİ!`);
      console.log(
        `   Müşterinin ₺${parseFloat(customer.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} alacağı var ama satış kaydı yok!`,
      );
      console.log(`\n   🔍 Olası Nedenler:`);
      console.log(
        `   1. Excel'deki satış kayıtlarında müşteri kodu (musid) eşleşmemiş`,
      );
      console.log(`   2. Satış import scripti çalıştırılmamış`);
      console.log(
        `   3. Excel'deki musid ile customers tablosundaki code eşleşmiyor`,
      );

      // Excel'de bu müşterinin satışlarını kontrol et
      console.log(`\n   📊 Excel Kontrol Önerisi:`);
      console.log(`   Excel'de "musid = 173" olan satışları kontrol edin`);
      console.log(`   Import script: scripts/import-sales-final.ts`);
    }

    console.log("\n" + "=".repeat(80));
  } catch (error) {
    console.error("❌ HATA:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkErolDemir();
