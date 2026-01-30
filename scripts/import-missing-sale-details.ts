import * as XLSX from "xlsx";
import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "77.42.68.4",
  port: 5437,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

interface SaleDetail {
  satisdetayid: number;
  satisid: number;
  urunid: number;
  adet: number;
  satisfiyat: number;
  satistutar: number;
  kdv: number;
  kdvtutar: number;
}

async function importMissingSaleDetails() {
  try {
    await client.connect();
    console.log("=== EKSIK SATIŞ DETAYLARI EKLEME ===\n");

    // Read Excel files
    const saleDetailWorkbook = XLSX.readFile("D:\\VTCLN\\satisdetay.xlsx");
    const saleDetails: SaleDetail[] = XLSX.utils.sheet_to_json(
      saleDetailWorkbook.Sheets[saleDetailWorkbook.SheetNames[0]],
    );

    console.log(`Excel'den ${saleDetails.length} satış detayı okundu\n`);

    // Get existing transactions from database
    const transactionsResult = await client.query(`
      SELECT id, code
      FROM transactions
      WHERE type = 'SALE'
      AND code LIKE 'SAT-%'
    `);

    const transactionMap = new Map<string, string>();
    transactionsResult.rows.forEach((row) => {
      // Extract satisid from code (SAT-00006 -> 6)
      const match = row.code.match(/SAT-(\d+)/);
      if (match) {
        const satisid = parseInt(match[1]);
        transactionMap.set(satisid.toString(), row.id);
      }
    });

    console.log(`Database'de ${transactionMap.size} satış bulundu\n`);

    // Get existing transaction items
    const existingItemsResult = await client.query(`
      SELECT "transactionId", COUNT(*) as item_count
      FROM transaction_items
      GROUP BY "transactionId"
    `);

    const existingItemsMap = new Map<string, number>();
    existingItemsResult.rows.forEach((row) => {
      existingItemsMap.set(row.transactionId, parseInt(row.item_count));
    });

    // Get product mapping
    const productsResult = await client.query(`
      SELECT id, code
      FROM products
    `);

    const productMap = new Map<string, string>();
    productsResult.rows.forEach((row) => {
      // Extract urunid from code (URN-000001 -> 1)
      const match = row.code.match(/URN-(\d+)/);
      if (match) {
        const urunid = parseInt(match[1]);
        productMap.set(urunid.toString(), row.id);
      }
    });

    console.log(`${productMap.size} ürün eşleşmesi bulundu\n`);

    // Group details by satisid
    const detailsBySale = new Map<number, SaleDetail[]>();
    saleDetails.forEach((detail) => {
      if (!detailsBySale.has(detail.satisid)) {
        detailsBySale.set(detail.satisid, []);
      }
      detailsBySale.get(detail.satisid)!.push(detail);
    });

    console.log("=== DETAY EKLEME BAŞLIYOR ===\n");

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [satisid, details] of detailsBySale.entries()) {
      const transactionId = transactionMap.get(satisid.toString());

      if (!transactionId) {
        skippedCount += details.length;
        continue;
      }

      // Check if transaction already has items
      const existingItemCount = existingItemsMap.get(transactionId) || 0;

      if (existingItemCount > 0) {
        // Already has items, skip
        skippedCount += details.length;
        continue;
      }

      // Add items for this transaction
      for (const detail of details) {
        try {
          const productId = productMap.get(detail.urunid.toString());

          if (!productId) {
            console.log(
              `  ⚠️ Ürün bulunamadı: ${detail.urunid} (Satış: ${satisid})`,
            );
            errorCount++;
            continue;
          }

          const quantity = detail.adet || 1;
          const unitPrice = detail.satisfiyat || 0;
          const total = detail.satistutar || 0;
          const vatRate = detail.kdv || 0;

          await client.query(
            `
            INSERT INTO transaction_items (
              id, "transactionId", "productId", description,
              quantity, "unitPrice", "vatRate", discount, total
            ) VALUES (
              gen_random_uuid(), $1, $2, NULL,
              $3, $4, $5, 0, $6
            )
          `,
            [transactionId, productId, quantity, unitPrice, vatRate, total],
          );

          addedCount++;
        } catch (error) {
          console.log(
            `  ❌ Hata (Satış: ${satisid}, Ürün: ${detail.urunid}):`,
            error.message,
          );
          errorCount++;
        }
      }
    }

    console.log("\n=== ÖZET ===");
    console.log(`✅ Eklenen detay: ${addedCount}`);
    console.log(`⏭️ Atlanan detay: ${skippedCount}`);
    console.log(`❌ Hata: ${errorCount}`);

    await client.end();
  } catch (error) {
    console.error("Hata:", error);
    await client.end();
  }
}

importMissingSaleDetails();
