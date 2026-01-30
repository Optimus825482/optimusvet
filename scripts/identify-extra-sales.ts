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

async function identifyExtraSales() {
  try {
    await client.connect();
    console.log("=== FAZLA SATIŞLARI TESPIT ETME ===\n");

    // Read Excel sales
    const saleWorkbook = XLSX.readFile("D:\\VTCLN\\satis.xlsx");
    const sales: Sale[] = XLSX.utils.sheet_to_json(
      saleWorkbook.Sheets[saleWorkbook.SheetNames[0]],
    );

    console.log(`Excel'de ${sales.length} satış var\n`);

    // Create set of valid sale IDs from Excel
    const validSaleIds = new Set(sales.map((s) => s.satisid));
    console.log(`Geçerli satış ID'leri: ${validSaleIds.size}\n`);

    // Get all sales from database
    const dbSalesResult = await client.query(`
      SELECT id, code, total, "customerId", date
      FROM transactions
      WHERE type = 'SALE'
      ORDER BY code
    `);

    console.log(`Database'de ${dbSalesResult.rows.length} satış var\n`);

    // Identify sales to delete
    const salesToDelete: any[] = [];

    dbSalesResult.rows.forEach((row) => {
      // Extract satisid from code (SAT-00006 -> 6)
      const match = row.code.match(/SAT-(\d+)/);
      if (match) {
        const satisid = parseInt(match[1]);

        // If not in Excel, mark for deletion
        if (!validSaleIds.has(satisid)) {
          salesToDelete.push({
            id: row.id,
            code: row.code,
            satisid,
            total: parseFloat(row.total),
            customerId: row.customerId,
            date: row.date,
          });
        }
      }
    });

    console.log(`Silinecek satış sayısı: ${salesToDelete.length}\n`);

    if (salesToDelete.length > 0) {
      console.log("İlk 20 silinecek satış:");
      salesToDelete.slice(0, 20).forEach((sale, idx) => {
        console.log(
          `  ${idx + 1}. ${sale.code} (ID: ${sale.satisid}) - ${sale.total.toFixed(2)} TL - ${new Date(sale.date).toLocaleDateString("tr-TR")}`,
        );
      });

      // Group by customer
      const customerGroups = new Map<string, number>();
      salesToDelete.forEach((sale) => {
        const customerId = sale.customerId || "NULL";
        customerGroups.set(
          customerId,
          (customerGroups.get(customerId) || 0) + 1,
        );
      });

      console.log(`\nMüşteri bazında dağılım:`);
      console.log(`  Farklı müşteri sayısı: ${customerGroups.size}`);

      // Total amount
      const totalAmount = salesToDelete.reduce(
        (sum, sale) => sum + sale.total,
        0,
      );
      console.log(
        `\nToplam tutar: ${totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
      );

      // Check if these sales have items
      const saleIds = salesToDelete.map((s) => s.id);
      const itemsResult = await client.query(
        `
        SELECT "transactionId", COUNT(*) as item_count
        FROM transaction_items
        WHERE "transactionId" = ANY($1)
        GROUP BY "transactionId"
      `,
        [saleIds],
      );

      console.log(`\nDetaylı satış sayısı: ${itemsResult.rows.length}`);
      const totalItems = itemsResult.rows.reduce(
        (sum, row) => sum + parseInt(row.item_count),
        0,
      );
      console.log(`Toplam item sayısı: ${totalItems}`);
    }

    await client.end();

    console.log("\n=== ÖZET ===");
    console.log(`Excel satış: ${sales.length}`);
    console.log(`Database satış: ${dbSalesResult.rows.length}`);
    console.log(`Silinecek: ${salesToDelete.length}`);
    console.log(`Kalacak: ${dbSalesResult.rows.length - salesToDelete.length}`);
  } catch (error) {
    console.error("Hata:", error);
    await client.end();
  }
}

identifyExtraSales();
