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

interface Payment {
  tahsilatid: number;
  musid: number;
  tarih: number;
  odemetutar: number;
}

async function analyzeSalesDetails() {
  try {
    console.log("=== EXCEL DOSYALARI ANALIZI ===\n");

    // Read Excel files
    const customerWorkbook = XLSX.readFile("D:\\VTCLN\\musteri.xlsx");
    const saleWorkbook = XLSX.readFile("D:\\VTCLN\\satis.xlsx");
    const saleDetailWorkbook = XLSX.readFile("D:\\VTCLN\\satisdetay.xlsx");
    const paymentWorkbook = XLSX.readFile("D:\\VTCLN\\musteritahsilat.xlsx");

    const customers: Customer[] = XLSX.utils.sheet_to_json(
      customerWorkbook.Sheets[customerWorkbook.SheetNames[0]],
    );
    const sales: Sale[] = XLSX.utils.sheet_to_json(
      saleWorkbook.Sheets[saleWorkbook.SheetNames[0]],
    );
    const saleDetails: SaleDetail[] = XLSX.utils.sheet_to_json(
      saleDetailWorkbook.Sheets[saleDetailWorkbook.SheetNames[0]],
    );
    const payments: Payment[] = XLSX.utils.sheet_to_json(
      paymentWorkbook.Sheets[paymentWorkbook.SheetNames[0]],
    );

    console.log(`Müşteri Sayısı: ${customers.length}`);
    console.log(`Satış Sayısı: ${sales.length}`);
    console.log(`Satış Detay Sayısı: ${saleDetails.length}`);
    console.log(`Tahsilat Sayısı: ${payments.length}\n`);

    // Analyze relationships
    console.log("=== İLİŞKİ ANALİZİ ===\n");

    // 1. Sales -> SaleDetails mapping
    const salesWithDetails = new Map<number, SaleDetail[]>();
    saleDetails.forEach((detail) => {
      if (!salesWithDetails.has(detail.satisid)) {
        salesWithDetails.set(detail.satisid, []);
      }
      salesWithDetails.get(detail.satisid)!.push(detail);
    });

    const salesWithoutDetails = sales.filter(
      (sale) => !salesWithDetails.has(sale.satisid),
    );
    const salesWithDetailsCount = sales.filter((sale) =>
      salesWithDetails.has(sale.satisid),
    ).length;

    console.log(`Detaylı Satış: ${salesWithDetailsCount}`);
    console.log(`Detaysız Satış: ${salesWithoutDetails.length}`);

    if (salesWithoutDetails.length > 0) {
      console.log("\nDetaysız İlk 5 Satış:");
      salesWithoutDetails.slice(0, 5).forEach((sale) => {
        console.log(
          `  - Satış ID: ${sale.satisid}, Müşteri: ${sale.musid}, Tutar: ${sale.tutar}`,
        );
      });
    }

    // 2. Sales -> Customer mapping
    const customerMap = new Map(customers.map((c) => [c.musid, c]));
    const salesWithoutCustomer = sales.filter(
      (sale) => !customerMap.has(sale.musid),
    );

    console.log(`\nMüşterisi Olmayan Satış: ${salesWithoutCustomer.length}`);

    // 3. Payments -> Customer mapping
    const paymentsWithoutCustomer = payments.filter(
      (payment) => !customerMap.has(payment.musid),
    );

    console.log(
      `Müşterisi Olmayan Tahsilat: ${paymentsWithoutCustomer.length}`,
    );

    // 4. Detail totals vs Sale totals
    console.log("\n=== TUTAR KONTROLÜ ===\n");

    let matchCount = 0;
    let mismatchCount = 0;
    const mismatches: any[] = [];

    sales.forEach((sale) => {
      const details = salesWithDetails.get(sale.satisid);
      if (details) {
        const detailTotal = details.reduce(
          (sum, detail) => sum + Number(detail.satistutar),
          0,
        );
        const saleTotal = Number(sale.tutar);

        if (Math.abs(detailTotal - saleTotal) < 0.01) {
          matchCount++;
        } else {
          mismatchCount++;
          if (mismatches.length < 5) {
            mismatches.push({
              satisid: sale.satisid,
              saleTotal,
              detailTotal,
              diff: detailTotal - saleTotal,
            });
          }
        }
      }
    });

    console.log(`Tutar Eşleşen: ${matchCount}`);
    console.log(`Tutar Eşleşmeyen: ${mismatchCount}`);

    if (mismatches.length > 0) {
      console.log("\nTutar Eşleşmeyen İlk 5 Satış:");
      mismatches.forEach((m) => {
        console.log(
          `  - Satış ID: ${m.satisid}, Satış Tutar: ${m.saleTotal.toFixed(2)}, Detay Toplam: ${m.detailTotal.toFixed(2)}, Fark: ${m.diff.toFixed(2)}`,
        );
      });
    }

    // 5. Database comparison
    await client.connect();
    console.log("\n=== DATABASE KARŞILAŞTIRMASI ===\n");

    const dbSalesResult = await client.query(
      "SELECT COUNT(*) as count FROM transactions WHERE type = 'SALE'",
    );
    const dbSalesCount = parseInt(dbSalesResult.rows[0].count);

    const dbItemsResult = await client.query(
      "SELECT COUNT(*) as count FROM transaction_items",
    );
    const dbItemsCount = parseInt(dbItemsResult.rows[0].count);

    console.log(`Excel Satış: ${sales.length}`);
    console.log(`Database Satış: ${dbSalesCount}`);
    console.log(`Fark: ${sales.length - dbSalesCount}\n`);

    console.log(`Excel Satış Detay: ${saleDetails.length}`);
    console.log(`Database Transaction Items: ${dbItemsCount}`);
    console.log(`Fark: ${saleDetails.length - dbItemsCount}\n`);

    // 6. Sample data check
    console.log("=== ÖRNEK VERİ KONTROLÜ ===\n");

    const sampleSale = sales[0];
    const sampleDetails = salesWithDetails.get(sampleSale.satisid);

    console.log("İlk Satış:");
    console.log(`  Satış ID: ${sampleSale.satisid}`);
    console.log(`  Müşteri ID: ${sampleSale.musid}`);
    console.log(`  Tarih: ${sampleSale.tarih}`);
    console.log(`  Tutar: ${sampleSale.tutar}`);

    if (sampleDetails) {
      console.log(`  Detay Sayısı: ${sampleDetails.length}`);
      console.log("  İlk 3 Detay:");
      sampleDetails.slice(0, 3).forEach((detail, idx) => {
        console.log(
          `    ${idx + 1}. Ürün ID: ${detail.urunid}, Adet: ${detail.adet}, Fiyat: ${detail.satisfiyat}, Tutar: ${detail.satistutar}`,
        );
      });
    }

    await client.end();

    console.log("\n=== ANALİZ TAMAMLANDI ===");
  } catch (error) {
    console.error("Hata:", error);
    await client.end();
  }
}

analyzeSalesDetails();
