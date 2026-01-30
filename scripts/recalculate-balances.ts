import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    "postgresql://postgres:518518Erkan@localhost:5432/optimusvet",
});

async function recalculateBalances() {
  const client = await pool.connect();

  try {
    console.log("🔄 MÜŞTERİ BAKİYELERİNİ YENİDEN HESAPLAMA\n");
    console.log("=".repeat(80));

    // Tüm müşterileri al
    const customersResult = await client.query(`
      SELECT id, code, name, balance FROM customers ORDER BY code
    `);

    console.log(`\n📊 Toplam Müşteri Sayısı: ${customersResult.rows.length}\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const customer of customersResult.rows) {
      try {
        // Satışları topla
        const salesResult = await client.query(
          `
          SELECT COALESCE(SUM(total), 0) as total_sales
          FROM transactions
          WHERE "customerId" = $1 AND type IN ('SALE', 'TREATMENT')
        `,
          [customer.id],
        );

        // Ödemeleri topla
        const paymentsResult = await client.query(
          `
          SELECT COALESCE(SUM(total), 0) as total_payments
          FROM transactions
          WHERE "customerId" = $1 AND type = 'CUSTOMER_PAYMENT'
        `,
          [customer.id],
        );

        const totalSales = parseFloat(salesResult.rows[0].total_sales || 0);
        const totalPayments = parseFloat(
          paymentsResult.rows[0].total_payments || 0,
        );
        const calculatedBalance = totalSales - totalPayments;
        const currentBalance = parseFloat(customer.balance);

        // Bakiye farklıysa güncelle
        if (Math.abs(calculatedBalance - currentBalance) > 0.01) {
          await client.query(
            `
            UPDATE customers 
            SET balance = $1, "updatedAt" = NOW()
            WHERE id = $2
          `,
            [calculatedBalance, customer.id],
          );

          console.log(`✅ ${customer.code} - ${customer.name}`);
          console.log(
            `   Eski Bakiye: ₺${currentBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
          );
          console.log(
            `   Yeni Bakiye: ₺${calculatedBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
          );
          console.log(
            `   Satış: ₺${totalSales.toFixed(2)} | Ödeme: ₺${totalPayments.toFixed(2)}\n`,
          );

          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Hata (${customer.code}):`, error);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`\n📋 ÖZET:`);
    console.log(`   Toplam Müşteri: ${customersResult.rows.length}`);
    console.log(`   Güncellenen: ${updatedCount}`);
    console.log(`   Hata: ${errorCount}`);
    console.log(
      `   Değişmeyen: ${customersResult.rows.length - updatedCount - errorCount}`,
    );

    // Erol Demir'i tekrar kontrol et
    console.log(`\n\n🔍 EROL DEMİR KONTROL:`);
    const erolResult = await client.query(`
      SELECT * FROM customers WHERE code = 'MUS-173'
    `);

    if (erolResult.rows.length > 0) {
      const erol = erolResult.rows[0];
      console.log(
        `   Yeni Bakiye: ₺${parseFloat(erol.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
    }

    console.log("\n✅ BAKİYE YENİDEN HESAPLAMA TAMAMLANDI!\n");
  } catch (error) {
    console.error("❌ HATA:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

recalculateBalances();
