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

async function resetAndImportSales() {
  try {
    await client.connect();
    console.log("=== SATIŞ VERİLERİNİ SIFIRLAMA VE YENİDEN YÜKLEME ===\n");

    // Read Excel files
    console.log("Excel dosyaları okunuyor...");
    const saleWorkbook = XLSX.readFile("D:\\VTCLN\\satis.xlsx");
    const saleDetailWorkbook = XLSX.readFile("D:\\VTCLN\\satisdetay.xlsx");

    const sales: Sale[] = XLSX.utils.sheet_to_json(
      saleWorkbook.Sheets[saleWorkbook.SheetNames[0]],
    );
    const saleDetails: SaleDetail[] = XLSX.utils.sheet_to_json(
      saleDetailWorkbook.Sheets[saleDetailWorkbook.SheetNames[0]],
    );

    console.log(`✓ ${sales.length} satış okundu`);
    console.log(`✓ ${saleDetails.length} satış detayı okundu\n`);

    // Get customer and product mappings
    console.log("Müşteri ve ürün eşleştirmeleri alınıyor...");

    const customersResult = await client.query(`
      SELECT id, code FROM customers
    `);
    const customerMap = new Map<number, string>();
    customersResult.rows.forEach((row) => {
      const match = row.code.match(/MUS-(\d+)/);
      if (match) {
        customerMap.set(parseInt(match[1]), row.id);
      }
    });

    const productsResult = await client.query(`
      SELECT id, code FROM products
    `);
    const productMap = new Map<number, string>();
    productsResult.rows.forEach((row) => {
      const match = row.code.match(/URN-(\d+)/);
      if (match) {
        productMap.set(parseInt(match[1]), row.id);
      }
    });

    console.log(`✓ ${customerMap.size} müşteri eşleşmesi`);
    console.log(`✓ ${productMap.size} ürün eşleşmesi\n`);

    // Group details by sale
    const detailsBySale = new Map<number, SaleDetail[]>();
    saleDetails.forEach((detail) => {
      if (!detailsBySale.has(detail.satisid)) {
        detailsBySale.set(detail.satisid, []);
      }
      detailsBySale.get(detail.satisid)!.push(detail);
    });

    // STEP 1: Delete existing sales
    console.log("=== ADIM 1: Mevcut satışlar siliniyor ===");

    await client.query("BEGIN");

    try {
      // Delete transaction items first (foreign key)
      const deleteItemsResult = await client.query(`
        DELETE FROM transaction_items
        WHERE "transactionId" IN (
          SELECT id FROM transactions WHERE type = 'SALE'
        )
      `);
      console.log(`✓ ${deleteItemsResult.rowCount} transaction item silindi`);

      // Delete transactions
      const deleteTransResult = await client.query(`
        DELETE FROM transactions WHERE type = 'SALE'
      `);
      console.log(`✓ ${deleteTransResult.rowCount} satış silindi`);

      // Reset customer balances to 0
      await client.query(`
        UPDATE customers SET balance = 0
      `);
      console.log(`✓ Müşteri bakiyeleri sıfırlandı\n`);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    // STEP 2: Import sales
    console.log("=== ADIM 2: Satışlar ekleniyor ===");

    let importedCount = 0;
    let skippedCount = 0;
    let itemsAdded = 0;

    for (const sale of sales) {
      try {
        const customerId = customerMap.get(sale.musid);

        if (!customerId) {
          console.log(
            `  ⚠️ Müşteri bulunamadı: ${sale.musid} (Satış: ${sale.satisid})`,
          );
          skippedCount++;
          continue;
        }

        // Convert Excel date (days since 1900) to JS date
        const excelDate = sale.tarih;
        const jsDate = new Date((excelDate - 25569) * 86400 * 1000);

        const code = `SAT-${String(sale.satisid).padStart(5, "0")}`;
        const total = sale.tutar || 0;

        // Get details for this sale
        const details = detailsBySale.get(sale.satisid) || [];

        // Calculate subtotal and VAT from details
        let subtotal = 0;
        let vatTotal = 0;

        details.forEach((detail) => {
          const itemSubtotal = detail.satisfiyat * detail.adet;
          const itemVat = (itemSubtotal * detail.kdv) / 100;
          subtotal += itemSubtotal;
          vatTotal += itemVat;
        });

        // If no details, use total as subtotal
        if (details.length === 0) {
          subtotal = total;
        }

        // Insert transaction
        const transResult = await client.query(
          `
          INSERT INTO transactions (
            id, code, type, "customerId", "userId", date, "createdAt", "updatedAt",
            subtotal, "vatTotal", discount, total, "paidAmount",
            "paymentMethod", status, notes
          ) VALUES (
            gen_random_uuid(), $1, 'SALE', $2, 
            (SELECT id FROM users LIMIT 1),
            $3, $3, $3, $4, $5, 0, $6, 0, 'CASH', 'PENDING', NULL
          )
          RETURNING id
        `,
          [code, customerId, jsDate, subtotal, vatTotal, total],
        );

        const transactionId = transResult.rows[0].id;

        // Insert transaction items
        for (const detail of details) {
          const productId = productMap.get(detail.urunid);

          if (!productId) {
            continue;
          }

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

        // Update customer balance
        await client.query(
          `
          UPDATE customers
          SET balance = balance + $1
          WHERE id = $2
        `,
          [total, customerId],
        );

        importedCount++;

        if (importedCount % 1000 === 0) {
          console.log(`  ✓ ${importedCount} satış eklendi...`);
        }
      } catch (error) {
        console.log(`  ❌ Hata (Satış: ${sale.satisid}):`, error.message);
        skippedCount++;
      }
    }

    console.log("\n=== TAMAMLANDI ===");
    console.log(`✅ Eklenen satış: ${importedCount}`);
    console.log(`✅ Eklenen item: ${itemsAdded}`);
    console.log(`⏭️ Atlanan satış: ${skippedCount}`);

    // Verify
    const verifyResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM transactions WHERE type = 'SALE') as sales_count,
        (SELECT COUNT(*) FROM transaction_items) as items_count,
        (SELECT SUM(balance) FROM customers WHERE balance > 0) as total_receivable
    `);

    console.log("\n=== DOĞRULAMA ===");
    console.log(`Database satış: ${verifyResult.rows[0].sales_count}`);
    console.log(`Database items: ${verifyResult.rows[0].items_count}`);
    console.log(
      `Toplam alacak: ${parseFloat(verifyResult.rows[0].total_receivable || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );

    await client.end();
  } catch (error) {
    console.error("HATA:", error);
    await client.end();
    process.exit(1);
  }
}

resetAndImportSales();
