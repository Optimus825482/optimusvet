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

const BATCH_SIZE = 500;

interface Customer {
  musid: number;
  ad: string;
}

interface Sale {
  satisid: number;
  musid: number;
  tarih: number;
  tutar: number;
  tur: number;
}

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

async function resetAndImportAllSales() {
  try {
    await client.connect();
    console.log("=== SATIŞ VERİLERİ SIFIRLAMA VE YENİDEN YÜKLEME ===\n");

    // Step 1: Reset database
    console.log("1️⃣ Database temizleniyor...");
    await client.query("BEGIN");

    // Delete in correct order (foreign key constraints)
    await client.query("DELETE FROM transaction_items");
    const deletedItems = await client.query(
      "SELECT COUNT(*) FROM transaction_items",
    );

    await client.query("DELETE FROM transactions WHERE type = 'SALE'");
    const deletedSales = await client.query(
      "SELECT COUNT(*) FROM transactions WHERE type = 'SALE'",
    );

    // Reset customer balances
    await client.query("UPDATE customers SET balance = 0");

    await client.query("COMMIT");
    console.log("✅ Database temizlendi\n");

    // Step 2: Read Excel files
    console.log("2️⃣ Excel dosyaları okunuyor...");
    const customerWorkbook = XLSX.readFile("D:\\VTCLN\\musteri.xlsx");
    const saleWorkbook = XLSX.readFile("D:\\VTCLN\\satis.xlsx");
    const saleDetailWorkbook = XLSX.readFile("D:\\VTCLN\\satisdetay.xlsx");

    const customers: Customer[] = XLSX.utils.sheet_to_json(
      customerWorkbook.Sheets[customerWorkbook.SheetNames[0]],
    );
    const sales: Sale[] = XLSX.utils.sheet_to_json(
      saleWorkbook.Sheets[saleWorkbook.SheetNames[0]],
    );
    const saleDetails: SaleDetail[] = XLSX.utils.sheet_to_json(
      saleDetailWorkbook.Sheets[saleDetailWorkbook.SheetNames[0]],
    );

    console.log(`✓ ${customers.length} müşteri`);
    console.log(`✓ ${sales.length} satış`);
    console.log(`✓ ${saleDetails.length} satış detayı\n`);

    // Step 3: Create mappings
    console.log("3️⃣ Eşleştirmeler hazırlanıyor...");

    // Customer mapping
    const customersResult = await client.query(
      `SELECT id, code FROM customers`,
    );
    const customerMap = new Map<number, string>();
    customersResult.rows.forEach((row) => {
      const match = row.code.match(/MUS-(\d+)/);
      if (match) customerMap.set(parseInt(match[1]), row.id);
    });

    // Product mapping
    const productsResult = await client.query(`SELECT id, code FROM products`);
    const productMap = new Map<number, string>();
    productsResult.rows.forEach((row) => {
      const match = row.code.match(/URN-(\d+)/);
      if (match) productMap.set(parseInt(match[1]), row.id);
    });

    // User ID
    const userResult = await client.query(`SELECT id FROM users LIMIT 1`);
    const userId = userResult.rows[0].id;

    console.log(`✓ ${customerMap.size} müşteri eşleşmesi`);
    console.log(`✓ ${productMap.size} ürün eşleşmesi\n`);

    // Step 4: Group sale details by sale ID
    console.log("4️⃣ Satış detayları gruplandırılıyor...");
    const detailsBySale = new Map<number, SaleDetail[]>();
    saleDetails.forEach((detail) => {
      if (!detailsBySale.has(detail.satisid)) {
        detailsBySale.set(detail.satisid, []);
      }
      detailsBySale.get(detail.satisid)!.push(detail);
    });
    console.log(`✓ ${detailsBySale.size} satışa detay eşleştirildi\n`);

    // Step 5: Import sales in batches
    console.log("5️⃣ Satışlar yükleniyor...\n");

    let imported = 0;
    let skipped = 0;
    let itemsAdded = 0;
    const errors: string[] = [];

    for (let i = 0; i < sales.length; i += BATCH_SIZE) {
      const batch = sales.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(sales.length / BATCH_SIZE);

      await client.query("BEGIN");

      try {
        for (const sale of batch) {
          // Skip if customer not found
          const customerId = customerMap.get(sale.musid);
          if (!customerId) {
            skipped++;
            errors.push(
              `Satış ${sale.satisid}: Müşteri ${sale.musid} bulunamadı`,
            );
            continue;
          }

          // Skip if no amount and no details
          const details = detailsBySale.get(sale.satisid) || [];
          if (!sale.tutar && details.length === 0) {
            skipped++;
            errors.push(`Satış ${sale.satisid}: Tutar ve detay yok`);
            continue;
          }

          // Convert Excel date to JS date
          const jsDate = new Date((sale.tarih - 25569) * 86400 * 1000);
          const code = `SAT-${String(sale.satisid).padStart(5, "0")}`;

          // Calculate totals
          let subtotal = 0;
          let vatTotal = 0;

          if (details.length > 0) {
            details.forEach((d) => {
              const itemSubtotal = (d.satisfiyat || 0) * (d.adet || 1);
              const itemVat = (itemSubtotal * (d.kdv || 0)) / 100;
              subtotal += itemSubtotal;
              vatTotal += itemVat;
            });
          } else {
            // No details, use sale total
            subtotal = sale.tutar || 0;
            vatTotal = 0;
          }

          const total = sale.tutar || subtotal + vatTotal;

          // Insert transaction
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

          // Insert transaction items
          for (const detail of details) {
            const productId = productMap.get(detail.urunid);
            if (!productId) {
              errors.push(
                `Satış ${sale.satisid}: Ürün ${detail.urunid} bulunamadı`,
              );
              continue;
            }

            const quantity = detail.adet || 1;
            const unitPrice = detail.satisfiyat || 0;
            const vatRate = detail.kdv || 0;
            const itemTotal = detail.satistutar || unitPrice * quantity;

            await client.query(
              `INSERT INTO transaction_items (
                id, "transactionId", "productId", quantity, "unitPrice", "vatRate", discount, total
              ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, $6)`,
              [
                transactionId,
                productId,
                quantity,
                unitPrice,
                vatRate,
                itemTotal,
              ],
            );
            itemsAdded++;
          }

          // Update customer balance
          await client.query(
            `UPDATE customers SET balance = balance + $1 WHERE id = $2`,
            [total, customerId],
          );

          imported++;
        }

        await client.query("COMMIT");

        const progress = Math.round((imported / sales.length) * 100);
        console.log(
          `✓ Batch ${batchNum}/${totalBatches} | ${imported}/${sales.length} (${progress}%) | Items: ${itemsAdded}`,
        );
      } catch (error: any) {
        await client.query("ROLLBACK");
        console.error(`❌ Batch ${batchNum} hatası:`, error.message);
        errors.push(`Batch ${batchNum}: ${error.message}`);
        skipped += batch.length;
      }
    }

    console.log("\n=== ÖZET ===");
    console.log(`✅ ${imported} satış eklendi`);
    console.log(`✅ ${itemsAdded} satış kalemi eklendi`);
    console.log(`⏭️  ${skipped} satış atlandı`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log(`\n⚠️  Hatalar (${errors.length}):`);
      errors.forEach((err) => console.log(`   ${err}`));
    } else if (errors.length > 10) {
      console.log(`\n⚠️  ${errors.length} hata oluştu (ilk 10):`);
      errors.slice(0, 10).forEach((err) => console.log(`   ${err}`));
    }

    // Verification
    console.log("\n=== DOĞRULAMA ===");
    const finalSalesResult = await client.query(
      "SELECT COUNT(*) as count FROM transactions WHERE type = 'SALE'",
    );
    const finalItemsResult = await client.query(
      "SELECT COUNT(*) as count FROM transaction_items",
    );

    console.log(`Database Satış: ${finalSalesResult.rows[0].count}`);
    console.log(`Database Satış Kalemi: ${finalItemsResult.rows[0].count}`);
    console.log(`Excel Satış: ${sales.length}`);
    console.log(`Excel Satış Detayı: ${saleDetails.length}`);

    await client.end();
    console.log("\n✅ İşlem tamamlandı!");
  } catch (error: any) {
    console.error("\n❌ HATA:", error.message);
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
    process.exit(1);
  }
}

resetAndImportAllSales();
