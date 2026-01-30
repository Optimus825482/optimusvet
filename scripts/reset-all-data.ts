import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function resetAllData() {
  try {
    await client.connect();
    console.log("=== YEREL VERİTABANI SIFIRLAMA ===\n");

    await client.query("BEGIN");

    // 1. Transaction Items (Foreign key olduğu için önce silinmeli)
    console.log("1️⃣ Transaction Items siliniyor...");
    const itemsResult = await client.query("DELETE FROM transaction_items");
    console.log(`   ✅ ${itemsResult.rowCount} kayıt silindi\n`);

    // 2. Payments (Foreign key olduğu için önce silinmeli)
    console.log("2️⃣ Payments siliniyor...");
    const paymentsResult = await client.query("DELETE FROM payments");
    console.log(`   ✅ ${paymentsResult.rowCount} kayıt silindi\n`);

    // 3. Transactions (Satış ve Tahsilat)
    console.log("3️⃣ Transactions siliniyor...");
    const transactionsResult = await client.query("DELETE FROM transactions");
    console.log(`   ✅ ${transactionsResult.rowCount} kayıt silindi\n`);

    // 4. Customer Balances Reset
    console.log("4️⃣ Müşteri bakiyeleri sıfırlanıyor...");
    const balanceResult = await client.query(
      "UPDATE customers SET balance = 0",
    );
    console.log(
      `   ✅ ${balanceResult.rowCount} müşteri bakiyesi sıfırlandı\n`,
    );

    // 5. Customers (İsteğe bağlı - şimdilik sadece bakiye sıfırlıyoruz)
    // Eğer müşterileri de silmek istersen aşağıdaki satırı aktif et:
    // const customersResult = await client.query("DELETE FROM customers");
    // console.log(`   ✅ ${customersResult.rowCount} müşteri silindi\n`);

    await client.query("COMMIT");

    // Verification
    console.log("=== DOĞRULAMA ===\n");

    const verifyResults = await Promise.all([
      client.query("SELECT COUNT(*) FROM transaction_items"),
      client.query("SELECT COUNT(*) FROM payments"),
      client.query("SELECT COUNT(*) FROM transactions"),
      client.query("SELECT COUNT(*) FROM customers WHERE balance != 0"),
      client.query("SELECT COUNT(*) FROM customers"),
    ]);

    console.log(`Transaction Items: ${verifyResults[0].rows[0].count}`);
    console.log(`Payments: ${verifyResults[1].rows[0].count}`);
    console.log(`Transactions: ${verifyResults[2].rows[0].count}`);
    console.log(`Bakiyesi Olan Müşteri: ${verifyResults[3].rows[0].count}`);
    console.log(`Toplam Müşteri: ${verifyResults[4].rows[0].count}`);

    console.log("\n✅ Veritabanı başarıyla sıfırlandı!");
    console.log(
      "\n📝 NOT: Müşteri kayıtları korundu, sadece bakiyeler sıfırlandı.",
    );
    console.log("   Müşterileri de silmek için script'i düzenle.\n");

    await client.end();
  } catch (error: any) {
    console.error("\n❌ HATA:", error.message);
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
    process.exit(1);
  }
}

resetAllData();
