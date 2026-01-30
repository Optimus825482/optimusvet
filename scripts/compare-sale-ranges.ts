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

async function compareSaleRanges() {
  try {
    await client.connect();

    // Read Excel sales
    const saleWorkbook = XLSX.readFile("D:\\VTCLN\\satis.xlsx");
    const sales: any[] = XLSX.utils.sheet_to_json(
      saleWorkbook.Sheets[saleWorkbook.SheetNames[0]],
    );

    const excelIds = sales.map((s) => s.satisid).sort((a, b) => a - b);

    console.log("=== EXCEL SATIŞLARI ===");
    console.log(`Toplam: ${excelIds.length}`);
    console.log(`En küçük ID: ${excelIds[0]}`);
    console.log(`En büyük ID: ${excelIds[excelIds.length - 1]}`);
    console.log(`İlk 10: ${excelIds.slice(0, 10).join(", ")}`);
    console.log(`Son 10: ${excelIds.slice(-10).join(", ")}\n`);

    // Get database sales
    const dbResult = await client.query(`
      SELECT code
      FROM transactions
      WHERE type = 'SALE'
      ORDER BY code
    `);

    const dbIds: number[] = [];
    dbResult.rows.forEach((row) => {
      const match = row.code.match(/SAT-(\d+)/);
      if (match) {
        dbIds.push(parseInt(match[1]));
      }
    });

    dbIds.sort((a, b) => a - b);

    console.log("=== DATABASE SATIŞLARI ===");
    console.log(`Toplam: ${dbIds.length}`);
    console.log(`En küçük ID: ${dbIds[0]}`);
    console.log(`En büyük ID: ${dbIds[dbIds.length - 1]}`);
    console.log(`İlk 10: ${dbIds.slice(0, 10).join(", ")}`);
    console.log(`Son 10: ${dbIds.slice(-10).join(", ")}\n`);

    // Find extras in database
    const excelSet = new Set(excelIds);
    const dbExtras = dbIds.filter((id) => !excelSet.has(id));

    console.log("=== FAZLA SATIŞLAR (DATABASE'DE VAR, EXCEL'DE YOK) ===");
    console.log(`Toplam: ${dbExtras.length}`);
    if (dbExtras.length > 0) {
      console.log(`İlk 20: ${dbExtras.slice(0, 20).join(", ")}`);
      console.log(`Son 20: ${dbExtras.slice(-20).join(", ")}`);
    }

    // Find missing in database
    const dbSet = new Set(dbIds);
    const dbMissing = excelIds.filter((id) => !dbSet.has(id));

    console.log("\n=== EKSİK SATIŞLAR (EXCEL'DE VAR, DATABASE'DE YOK) ===");
    console.log(`Toplam: ${dbMissing.length}`);
    if (dbMissing.length > 0) {
      console.log(`İlk 20: ${dbMissing.slice(0, 20).join(", ")}`);
    }

    await client.end();
  } catch (error) {
    console.error("Hata:", error);
    await client.end();
  }
}

compareSaleRanges();
