import * as XLSX from "xlsx";
import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function resetSalesFast() {
  try {
    await client.connect();
    console.log("=== HIZLI SATIŞ SIFIRLAMA ===\n");

    // STEP 1: Delete existing sales
    console.log("Mevcut satışlar siliniyor...");

    await client.query("BEGIN");

    const deleteItemsResult = await client.query(`
      DELETE FROM transaction_items
      WHERE "transactionId" IN (
        SELECT id FROM transactions WHERE type = 'SALE'
      )
    `);
    console.log(`✓ ${deleteItemsResult.rowCount} item silindi`);

    const deleteTransResult = await client.query(`
      DELETE FROM transactions WHERE type = 'SALE'
    `);
    console.log(`✓ ${deleteTransResult.rowCount} satış silindi`);

    await client.query(`UPDATE customers SET balance = 0`);
    console.log(`✓ Müşteri bakiyeleri sıfırlandı`);

    await client.query("COMMIT");

    console.log("\n✅ Satışlar başarıyla silindi!");
    console.log("\nŞimdi yeni satışları eklemek için:");
    console.log("  npx tsx scripts/import-sales-batch.ts\n");

    await client.end();
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("HATA:", error);
    await client.end();
    process.exit(1);
  }
}

resetSalesFast();
