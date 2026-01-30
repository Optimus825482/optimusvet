import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function checkPayments() {
  try {
    await client.connect();
    console.log("=== TAHSİLAT KONTROLÜ ===\n");

    // Count payments
    const paymentResult = await client.query(
      "SELECT COUNT(*) as count FROM transactions WHERE type = 'CUSTOMER_PAYMENT'",
    );
    console.log(`Database'de ${paymentResult.rows[0].count} tahsilat var\n`);

    // Sample payments
    const sampleResult = await client.query(`
      SELECT 
        t.code,
        t.date,
        t.total,
        c.name as customer_name
      FROM transactions t
      JOIN customers c ON t."customerId" = c.id
      WHERE t.type = 'CUSTOMER_PAYMENT'
      ORDER BY t.date DESC
      LIMIT 5
    `);

    if (sampleResult.rows.length > 0) {
      console.log("Son 5 Tahsilat:");
      sampleResult.rows.forEach((row, idx) => {
        console.log(
          `${idx + 1}. ${row.code} - ${row.customer_name} - ${row.total} TL - ${new Date(row.date).toLocaleDateString("tr-TR")}`,
        );
      });
    } else {
      console.log("⚠️  Hiç tahsilat kaydı yok!");
      console.log("\nTahsilatları yüklemek için:");
      console.log("1. musteritahsilat.xlsx dosyasını kontrol et");
      console.log("2. Tahsilat import script'i çalıştır");
    }

    await client.end();
  } catch (error: any) {
    console.error("Hata:", error.message);
    await client.end();
  }
}

checkPayments();
