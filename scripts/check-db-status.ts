import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function checkDbStatus() {
  try {
    await client.connect();
    console.log("=== YEREL VERİTABANI DURUM KONTROLÜ ===\n");

    const results = await Promise.all([
      client.query("SELECT COUNT(*) as count FROM customers"),
      client.query("SELECT COUNT(*) as count FROM products"),
      client.query("SELECT COUNT(*) as count FROM transactions"),
      client.query("SELECT COUNT(*) as count FROM transaction_items"),
      client.query("SELECT COUNT(*) as count FROM payments"),
      client.query(
        "SELECT COUNT(*) as count FROM customers WHERE balance != 0",
      ),
      client.query("SELECT SUM(balance) as total FROM customers"),
    ]);

    console.log("📊 TABLO İSTATİSTİKLERİ:");
    console.log(`   Müşteriler: ${results[0].rows[0].count}`);
    console.log(`   Ürünler: ${results[1].rows[0].count}`);
    console.log(`   İşlemler (Transactions): ${results[2].rows[0].count}`);
    console.log(`   İşlem Kalemleri: ${results[3].rows[0].count}`);
    console.log(`   Ödemeler: ${results[4].rows[0].count}`);
    console.log(`   Bakiyesi Olan Müşteri: ${results[5].rows[0].count}`);
    console.log(
      `   Toplam Bakiye: ${parseFloat(results[6].rows[0].total || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );

    console.log("\n✅ Veritabanı temiz ve hazır!");
    console.log(
      "\n📝 Sonraki adım: Excel verilerini yüklemek için import script'ini çalıştır.",
    );

    await client.end();
  } catch (error: any) {
    console.error("Hata:", error.message);
    await client.end();
  }
}

checkDbStatus();
