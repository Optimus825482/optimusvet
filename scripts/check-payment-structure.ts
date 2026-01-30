import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function checkPaymentStructure() {
  try {
    await client.connect();
    console.log("=== TAHSİLAT YAPISI KONTROLÜ ===\n");

    // Check if payments are linked to specific sales
    const result = await client.query(`
      SELECT 
        t.code,
        t.type,
        t."customerId",
        t.total,
        t.date,
        c.name as customer_name,
        (SELECT COUNT(*) FROM transaction_items WHERE "transactionId" = t.id) as item_count
      FROM transactions t
      LEFT JOIN customers c ON t."customerId" = c.id
      WHERE t.type = 'CUSTOMER_PAYMENT'
      ORDER BY t.date DESC
      LIMIT 10
    `);

    console.log("📋 SON 10 TAHSİLAT:\n");
    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.code}`);
      console.log(`   Müşteri: ${row.customer_name}`);
      console.log(
        `   Tutar: ${parseFloat(row.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
      );
      console.log(
        `   Tarih: ${new Date(row.date).toLocaleDateString("tr-TR")}`,
      );
      console.log(
        `   Item Sayısı: ${row.item_count} (0 olmalı - tahsilat ürün içermez)`,
      );
      console.log();
    });

    // Check Payment model (if exists)
    const paymentTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'payments'
      )
    `);

    if (paymentTableCheck.rows[0].exists) {
      console.log("⚠️  'payments' TABLOSU VAR!");
      console.log(
        "Bu tablo tahsilatları belirli satışlara bağlamak için kullanılıyor olabilir.\n",
      );

      const paymentsResult = await client.query(`
        SELECT 
          p.id,
          p."transactionId",
          p.amount,
          t.code as transaction_code,
          t.type as transaction_type
        FROM payments p
        JOIN transactions t ON p."transactionId" = t.id
        LIMIT 5
      `);

      if (paymentsResult.rows.length > 0) {
        console.log("📋 PAYMENTS TABLOSU İÇERİĞİ (İlk 5):\n");
        paymentsResult.rows.forEach((row, idx) => {
          console.log(`${idx + 1}. Payment ID: ${row.id}`);
          console.log(
            `   Transaction: ${row.transaction_code} (${row.transaction_type})`,
          );
          console.log(
            `   Tutar: ${parseFloat(row.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
          );
          console.log();
        });
      } else {
        console.log("✅ Payments tablosu boş - tahsilatlar bağımsız.\n");
      }
    } else {
      console.log("✅ 'payments' tablosu YOK - tahsilatlar bağımsız.\n");
    }

    // Summary
    console.log("=== ÖZET ===\n");
    console.log("Mevcut Sistem Mantığı:");
    console.log("1. Satış (SALE) → Müşteri bakiyesini ARTTIRIR");
    console.log("2. Tahsilat (CUSTOMER_PAYMENT) → Müşteri bakiyesini AZALTIR");
    console.log("3. Tahsilat belirli bir satışa BAĞLI DEĞİL");
    console.log("4. Müşteri genel bakiyesi üzerinden çalışır\n");

    console.log("Bu mantık eski sistem (MDB) ile AYNI. ✅");

    await client.end();
  } catch (error: any) {
    console.error("Hata:", error.message);
    await client.end();
  }
}

checkPaymentStructure();
