import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function recalculateAllBalances() {
  try {
    await client.connect();
    console.log("=== TÜM MÜŞTERİ BAKİYELERİ YENİDEN HESAPLANIYOR ===\n");

    await client.query("BEGIN");

    // Step 1: Reset all balances
    console.log("1️⃣ Tüm bakiyeler sıfırlanıyor...");
    await client.query("UPDATE customers SET balance = 0");
    console.log("✅ Bakiyeler sıfırlandı\n");

    // Step 2: Add sales to balances
    console.log("2️⃣ Satışlar bakiyelere ekleniyor...");
    const salesResult = await client.query(`
      UPDATE customers c
      SET balance = balance + COALESCE(
        (SELECT SUM(t.total) 
         FROM transactions t 
         WHERE t."customerId" = c.id 
         AND t.type = 'SALE'),
        0
      )
    `);
    console.log("✅ Satışlar eklendi\n");

    // Step 3: Subtract payments from balances
    console.log("3️⃣ Tahsilatlar bakiyelerden çıkarılıyor...");
    const paymentsResult = await client.query(`
      UPDATE customers c
      SET balance = balance - COALESCE(
        (SELECT SUM(t.total) 
         FROM transactions t 
         WHERE t."customerId" = c.id 
         AND t.type = 'CUSTOMER_PAYMENT'),
        0
      )
    `);
    console.log("✅ Tahsilatlar çıkarıldı\n");

    await client.query("COMMIT");

    // Step 4: Verification
    console.log("4️⃣ Doğrulama yapılıyor...\n");

    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN balance > 0 THEN 1 END) as positive_balance,
        COUNT(CASE WHEN balance < 0 THEN 1 END) as negative_balance,
        COUNT(CASE WHEN balance = 0 THEN 1 END) as zero_balance,
        SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END) as total_receivable,
        SUM(CASE WHEN balance < 0 THEN ABS(balance) ELSE 0 END) as total_payable
      FROM customers
    `);

    const stats = statsResult.rows[0];

    console.log("=== ÖZET ===");
    console.log(`Toplam Müşteri: ${stats.total_customers}`);
    console.log(`Alacaklı Müşteri: ${stats.positive_balance}`);
    console.log(`Borçlu Müşteri: ${stats.negative_balance}`);
    console.log(`Bakiye Sıfır: ${stats.zero_balance}\n`);
    console.log(
      `Toplam Alacak: ${parseFloat(stats.total_receivable).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(
      `Toplam Borç: ${parseFloat(stats.total_payable).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL\n`,
    );

    // Top 10 customers with highest balance
    const topResult = await client.query(`
      SELECT 
        name,
        code,
        balance,
        (SELECT COUNT(*) FROM transactions WHERE "customerId" = customers.id) as transaction_count
      FROM customers
      WHERE balance > 0
      ORDER BY balance DESC
      LIMIT 10
    `);

    console.log("=== EN YÜKSEK ALACAKLI 10 MÜŞTERİ ===");
    topResult.rows.forEach((row, idx) => {
      console.log(
        `${idx + 1}. ${row.name} (${row.code}) - ${parseFloat(row.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL - ${row.transaction_count} işlem`,
      );
    });

    // Transaction summary
    console.log("\n=== İŞLEM ÖZETİ ===");
    const transactionSummary = await client.query(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(total) as total_amount
      FROM transactions
      WHERE type IN ('SALE', 'CUSTOMER_PAYMENT')
      GROUP BY type
      ORDER BY type
    `);

    transactionSummary.rows.forEach((row) => {
      const typeName = row.type === "SALE" ? "Satış" : "Tahsilat";
      console.log(
        `${typeName}: ${row.count} adet - ${parseFloat(row.total_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
      );
    });

    await client.end();
    console.log("\n✅ Bakiyeler başarıyla yeniden hesaplandı!");
  } catch (error: any) {
    console.error("\n❌ HATA:", error.message);
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
    process.exit(1);
  }
}

recalculateAllBalances();
