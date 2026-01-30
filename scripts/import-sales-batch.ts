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

const BATCH_SIZE = 100;

async function importSalesBatch() {
  try {
    await client.connect();
    console.log("=== TOPLU SATIŞ İMPORT ===\n");

    // Read Excel files
    console.log("Excel dosyaları okunuyor...");
    const saleWorkbook = XLSX.readFile("D:\\VTCLN\\satis.xlsx");
    const saleDetailWorkbook = XLSX.readFile("D:\\VTCLN\\satisdetay.xlsx");

    const sales: any[] = XLSX.utils.sheet_to_json(
      saleWorkbook.Sheets[saleWorkbook.SheetNames[0]],
    );
    const saleDetails: any[] = XLSX.utils.sheet_to_json(
      saleDetailWorkbook.Sheets[saleDetailWorkbook.SheetNames[0]],
    );

    console.log(`✓ ${sales.length} satış`);
    console.log(`✓ ${saleDetails.length} detay\n`);

    // Get mappings
    console.log("Eşleştirmeler alınıyor...");
    const customersResult = await client.query(
      `SELECT id, code FROM customers`,
    );
    const customerMap = new Map<number, string>();
    customersResult.rows.forEach((row) => {
      const match = row.code.match(/MUS-(\d+)/);
      if (match) customerMap.set(parseInt(match[1]), row.id);
    });

    const productsResult = await client.query(`SELECT id, code FROM products`);
    const productMap = new Map<number, string>();
    productsResult.rows.forEach((row) => {
      const match = row.code.match(/URN-(\d+)/);
      if (match) productMap.set(parseInt(match[1]), row.id);
    });

    const userResult = await client.query(`SELECT id FROM users LIMIT 1`);
    const userId = userResult.rows[0].id;

    console.log(`✓ ${customerMap.size} müşteri`);
    console.log(`✓ ${productMap.size} ürün\n`);

    // Group details
    const detailsBySale = new Map<number, any[]>();
    saleDetails.forEach((d) => {
      if (!detailsBySale.has(d.satisid)) detailsBySale.set(d.satisid, []);
      detailsBySale.get(d.satisid)!.push(d);
    });

    console.log("İmport başlıyor...\n");

    let imported = 0;
    let skipped = 0;
    let itemsAdded = 0;

    for (let i = 0; i < sales.length; i += BATCH_SIZE) {
      const batch = sales.slice(i, i + BATCH_SIZE);

      await client.query("BEGIN");

      try {
        for (const sale of batch) {
          const customerId = customerMap.get(sale.musid);
          if (!customerId) {
            skipped++;
            continue;
          }

          const jsDate = new Date((sale.tarih - 25569) * 86400 * 1000);
          const code = `SAT-${String(sale.satisid).padStart(5, "0")}`;
          const total = sale.tutar || 0;
          const details = detailsBySale.get(sale.satisid) || [];

          let subtotal = 0;
          let vatTotal = 0;
          details.forEach((d) => {
            subtotal += d.satisfiyat * d.adet;
            vatTotal += (d.satisfiyat * d.adet * d.kdv) / 100;
          });
          if (details.length === 0) subtotal = total;

          const transResult = await client.query(
            `INSERT INTO transactions (
              id, code, type, "customerId", "userId", date, "createdAt", "updatedAt",
              subtotal, "vatTotal", discount, total, "paidAmount", "paymentMethod", status
            ) VALUES (
              gen_random_uuid(), $1, 'SALE', $2, $3, $4, $4, $4,
              $5, $6, 0, $7, 0, 'CASH', 'PENDING'
            ) RETURNING id`,
            [code, customerId, userId, jsDate, subtotal, vatTotal, total],
          );

          const transactionId = transResult.rows[0].id;

          for (const detail of details) {
            const productId = productMap.get(detail.urunid);
            if (!productId) continue;

            await client.query(
              `INSERT INTO transaction_items (
                id, "transactionId", "productId", quantity, "unitPrice", "vatRate", discount, total
              ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, $6)`,
              [
                transactionId,
                productId,
                detail.adet || 1,
                detail.satisfiyat || 0,
                detail.kdv || 0,
                detail.satistutar || 0,
              ],
            );
            itemsAdded++;
          }

          await client.query(
            `UPDATE customers SET balance = balance + $1 WHERE id = $2`,
            [total, customerId],
          );

          imported++;
        }

        await client.query("COMMIT");
        console.log(
          `✓ ${imported}/${sales.length} (${Math.round((imported / sales.length) * 100)}%)`,
        );
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`❌ Batch ${i}-${i + BATCH_SIZE} hatası:`, error.message);
        skipped += batch.length;
      }
    }

    console.log("\n=== TAMAMLANDI ===");
    console.log(`✅ ${imported} satış eklendi`);
    console.log(`✅ ${itemsAdded} item eklendi`);
    console.log(`⏭️ ${skipped} atlandı`);

    await client.end();
  } catch (error) {
    console.error("HATA:", error);
    await client.end();
    process.exit(1);
  }
}

importSalesBatch();
