import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    "postgresql://postgres:518518Erkan@localhost:5432/optimusvet",
});

async function checkErolUI() {
  const client = await pool.connect();

  try {
    console.log("🔍 EROL DEMİR - UI GÖRÜNÜM KONTROLÜ\n");
    console.log("=".repeat(80));

    // Müşteriyi bul
    const customerResult = await client.query(`
      SELECT * FROM customers WHERE code = 'MUS-173'
    `);

    const customer = customerResult.rows[0];

    console.log(`\n👤 MÜŞTERİ: ${customer.name}`);
    console.log(
      `   Bakiye: ₺${parseFloat(customer.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}\n`,
    );

    // Satışları say
    const salesResult = await client.query(
      `
      SELECT COUNT(*) as count, SUM(total) as total
      FROM transactions
      WHERE "customerId" = $1 AND type = 'SALE'
    `,
      [customer.id],
    );

    const salesData = salesResult.rows[0];
    console.log(`🛒 SATIŞLAR:`);
    console.log(`   Sayı: ${salesData.count}`);
    console.log(
      `   Toplam: ₺${parseFloat(salesData.total || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}\n`,
    );

    // Ödemeleri say
    const paymentsResult = await client.query(
      `
      SELECT COUNT(*) as count, SUM(total) as total
      FROM transactions
      WHERE "customerId" = $1 AND type = 'CUSTOMER_PAYMENT'
    `,
      [customer.id],
    );

    const paymentsData = paymentsResult.rows[0];
    console.log(`💰 ÖDEMELER:`);
    console.log(`   Sayı: ${paymentsData.count}`);
    console.log(
      `   Toplam: ₺${parseFloat(paymentsData.total || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}\n`,
    );

    // UI'da gösterilen işlemleri kontrol et (Son işlemler tablosu)
    console.log("=".repeat(80));
    console.log("📋 UI'DA GÖSTERILEN İŞLEMLER (Son İşlemler Tablosu):\n");

    const uiTransactions = await client.query(
      `
      SELECT 
        t.id,
        t.type,
        t.date,
        t.total,
        t.status,
        c.name as customer_name,
        a.name as animal_name
      FROM transactions t
      LEFT JOIN customers c ON c.id = t."customerId"
      LEFT JOIN animals a ON a.id = t."animalId"
      WHERE t."customerId" = $1
      ORDER BY t.date DESC
      LIMIT 20
    `,
      [customer.id],
    );

    console.log(`Toplam ${uiTransactions.rows.length} işlem bulundu:\n`);

    uiTransactions.rows.forEach((tx, idx) => {
      const typeLabels: Record<string, string> = {
        SALE: "🛒 Satış",
        CUSTOMER_PAYMENT: "💰 Ödeme",
        TREATMENT: "🏥 Tedavi",
      };

      const typeLabel = typeLabels[tx.type] || tx.type;
      const amount = parseFloat(tx.total);
      const date = new Date(tx.date);

      console.log(`${idx + 1}. ${typeLabel}`);
      console.log(`   Tarih: ${date.toLocaleDateString("tr-TR")}`);
      console.log(
        `   Tutar: ₺${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
      console.log(`   Durum: ${tx.status}`);
      if (tx.animal_name) {
        console.log(`   Hayvan: ${tx.animal_name}`);
      }
      console.log("");
    });

    // Satış ve ödeme dağılımı
    console.log("=".repeat(80));
    console.log("📊 İŞLEM DAĞILIMI:\n");

    const typeDistribution = await client.query(
      `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(total) as total
      FROM transactions
      WHERE "customerId" = $1
      GROUP BY type
      ORDER BY count DESC
    `,
      [customer.id],
    );

    typeDistribution.rows.forEach((row) => {
      const typeLabels: Record<string, string> = {
        SALE: "Satış",
        CUSTOMER_PAYMENT: "Ödeme",
        TREATMENT: "Tedavi",
      };

      console.log(`${typeLabels[row.type] || row.type}:`);
      console.log(`  Sayı: ${row.count}`);
      console.log(
        `  Toplam: ₺${parseFloat(row.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}\n`,
      );
    });

    // SORUN TESPİTİ
    console.log("=".repeat(80));
    console.log("🔍 SORUN ANALİZİ:\n");

    if (parseInt(salesData.count) === 0) {
      console.log("❌ SORUN: Satış kaydı yok!");
      console.log("   Ama ödeme var. Bu normal değil.\n");
    } else if (parseInt(salesData.count) < parseInt(paymentsData.count)) {
      console.log("⚠️  UYARI: Ödeme sayısı satış sayısından fazla!");
      console.log(
        `   Satış: ${salesData.count} | Ödeme: ${paymentsData.count}\n`,
      );
    } else {
      console.log("✅ Satış ve ödeme kayıtları dengeli görünüyor.\n");
    }

    // UI filtreleme kontrolü
    console.log("💡 UI KONTROL ÖNERİSİ:");
    console.log('   Müşteri detay sayfasındaki "Son İşlemler" tablosunda:');
    console.log(
      "   - Tüm işlem tipleri gösteriliyor mu? (SALE, CUSTOMER_PAYMENT, TREATMENT)",
    );
    console.log("   - Tarih filtresi var mı?");
    console.log("   - Pagination doğru çalışıyor mu?\n");

    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ HATA:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkErolUI();
