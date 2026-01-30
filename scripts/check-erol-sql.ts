import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    "postgresql://postgres:518518Erkan@localhost:5432/optimusvet",
});

async function checkErolDemir() {
  const client = await pool.connect();

  try {
    console.log("🔍 EROL DEMİR - BAKİYE KONTROL RAPORU");
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
      SELECT 
        t.*,
        COUNT(ti.id) as item_count
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE t.customer_id = $1 AND t.type = 'SALE'
      GROUP BY t.id
      ORDER BY t.date DESC
    `,
      [customer.id],
    );

    console.log(`\n📊 SATIŞ İŞLEMLERİ:`);
    console.log(`   Toplam Satış Sayısı: ${salesResult.rows.length}`);

    if (salesResult.rows.length > 0) {
      let totalSalesAmount = 0;

      console.log(`\n   İlk 10 Satış:`);
      salesResult.rows.slice(0, 10).forEach((sale, idx) => {
        const saleTotal = parseFloat(sale.total);
        totalSalesAmount += saleTotal;

        console.log(`\n   ${idx + 1}. Satış:`);
        console.log(
          `      Tarih: ${new Date(sale.date).toLocaleDateString("tr-TR")}`,
        );
        console.log(
          `      Tutar: ₺${saleTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
        );
        console.log(`      Durum: ${sale.status}`);
        console.log(`      Kalem Sayısı: ${sale.item_count}`);
      });

      // Toplam hesapla
      const totalResult = await client.query(
        `
        SELECT SUM(total) as total_sales
        FROM transactions
        WHERE customer_id = $1 AND type = 'SALE'
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
      WHERE customer_id = $1 AND type = 'CUSTOMER_PAYMENT'
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
      SELECT COUNT(*) as count FROM transactions WHERE customer_id = $1
    `,
      [customer.id],
    );

    console.log(
      `\n📝 TOPLAM İŞLEM SAYISI: ${allTransactionsResult.rows[0].count}`,
    );

    // Excel'den import edilen satışları kontrol et
    console.log(`\n\n🔍 EXCEL SATIŞ KAYITLARI KONTROLÜ:`);

    // Müşteri koduna göre Excel'den gelen satışları ara
    const excelSalesResult = await client.query(`
      SELECT 
        t.*,
        c.code as customer_code,
        c.name as customer_name
      FROM transactions t
      LEFT JOIN customers c ON c.id = t.customer_id
      WHERE c.code = 'MUS-173' AND t.type = 'SALE'
      ORDER BY t.date DESC
      LIMIT 5
    `);

    if (excelSalesResult.rows.length > 0) {
      console.log(
        `   ✅ Excel'den ${excelSalesResult.rows.length} satış bulundu:`,
      );
      excelSalesResult.rows.forEach((sale, idx) => {
        console.log(
          `   ${idx + 1}. ${new Date(sale.date).toLocaleDateString("tr-TR")} - ₺${parseFloat(sale.total).toFixed(2)}`,
        );
      });
    } else {
      console.log(`   ❌ Excel'den bu müşteriye ait satış bulunamadı!`);

      // Müşteri ID'sine göre kontrol et
      const directSalesResult = await client.query(
        `
        SELECT COUNT(*) as count
        FROM transactions
        WHERE customer_id = $1 AND type = 'SALE'
      `,
        [customer.id],
      );

      console.log(
        `   Müşteri ID'sine göre satış sayısı: ${directSalesResult.rows[0].count}`,
      );
    }

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
      console.log(`   Bu bakiye Excel'den import edilmiş başlangıç bakiyesi.`);
      console.log(
        `   Satış kayıtları ya yüklenmemiş ya da müşteri eşleşmesi yanlış.`,
      );

      // Excel dosyasındaki orijinal müşteri kodunu kontrol et
      console.log(`\n   🔍 Olası Nedenler:`);
      console.log(
        `   1. Excel'deki satış kayıtlarında müşteri kodu (musid) eşleşmemiş olabilir`,
      );
      console.log(`   2. Satış import scripti çalıştırılmamış olabilir`);
      console.log(
        `   3. Excel'deki musid ile customers tablosundaki code eşleşmiyor olabilir`,
      );
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
