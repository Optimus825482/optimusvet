import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "77.42.68.4",
  port: 5437,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function checkBalances() {
  try {
    await client.connect();
    console.log("=== DATABASE MUSTERI BAKIYE KONTROLU ===\n");

    // Toplam müşteri sayısı
    const totalResult = await client.query("SELECT COUNT(*) FROM customers");
    const totalCustomers = parseInt(totalResult.rows[0].count);

    // Alacaklı müşteriler (balance > 0)
    const alacakliResult = await client.query(
      "SELECT COUNT(*) FROM customers WHERE balance > 0",
    );
    const alacakliCount = parseInt(alacakliResult.rows[0].count);

    // Borçlu müşteriler (balance < 0)
    const borcluResult = await client.query(
      "SELECT COUNT(*) FROM customers WHERE balance < 0",
    );
    const borcluCount = parseInt(borcluResult.rows[0].count);

    // Toplam alacak
    const totalAlacakResult = await client.query(
      "SELECT SUM(balance) as total FROM customers WHERE balance > 0",
    );
    const totalAlacak = parseFloat(totalAlacakResult.rows[0].total || 0);

    // Toplam borç
    const totalBorcResult = await client.query(
      "SELECT SUM(balance) as total FROM customers WHERE balance < 0",
    );
    const totalBorc = Math.abs(parseFloat(totalBorcResult.rows[0].total || 0));

    console.log(`Toplam Musteri: ${totalCustomers}`);
    console.log(`Alacakli Musteri: ${alacakliCount}`);
    console.log(`Borclu Musteri: ${borcluCount}`);
    console.log(
      `Bakiye Sifir: ${totalCustomers - alacakliCount - borcluCount}`,
    );
    console.log(
      `\nToplam Alacak: ${totalAlacak.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(
      `Toplam Borc: ${totalBorc.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );

    // En yüksek alacaklı 10 müşteri
    const topAlacakliResult = await client.query(`
      SELECT 
        c.name, 
        c.code, 
        c.balance,
        COUNT(t.id) as transaction_count
      FROM customers c
      LEFT JOIN transactions t ON t."customerId" = c.id
      WHERE c.balance > 0
      GROUP BY c.id, c.name, c.code, c.balance
      ORDER BY c.balance DESC
      LIMIT 10
    `);

    console.log("\n=== EN YUKSEK ALACAKLI 10 MUSTERI ===");
    topAlacakliResult.rows.forEach((customer, index) => {
      const balance = parseFloat(customer.balance);
      console.log(`${index + 1}. ${customer.name} (${customer.code})`);
      console.log(
        `   Alacak: ${balance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
      );
      console.log(`   Islem Sayisi: ${customer.transaction_count}`);
    });

    console.log("\n=== MUSTERI NASIL ALACAKLI OLUR? ===");
    console.log("1. Musteri'ye satis yapilir (Transaction type: SALE)");
    console.log("2. Satis tutari customer.balance'a EKLENIR");
    console.log("3. Musteri odeme yapar (Payment)");
    console.log("4. Odeme tutari customer.balance'tan CIKARILIR");
    console.log("5. Kalan bakiye > 0 ise musteri ALACAKLI");
    console.log("\nOrnek:");
    console.log("- Baslangic: balance = 0");
    console.log("- 1000 TL satis: balance = 0 + 1000 = 1000 TL (ALACAKLI)");
    console.log("- 600 TL odeme: balance = 1000 - 600 = 400 TL (ALACAKLI)");
    console.log("- 400 TL odeme: balance = 400 - 400 = 0 TL (SIFIR)");
  } catch (error) {
    console.error("Hata:", error);
  } finally {
    await client.end();
  }
}

checkBalances();
