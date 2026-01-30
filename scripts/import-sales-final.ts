import pkg from "pg";
const { Pool } = pkg;
import * as XLSX from "xlsx";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

function excelDateToJSDate(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(
    date_info.getFullYear(),
    date_info.getMonth(),
    date_info.getDate(),
  );
}

async function importSalesWithMapping() {
  const client = await pool.connect();

  try {
    console.log("📊 1. Excel dosyaları okunuyor...");

    // Müşteri mapping (musid -> database id)
    const musteriWorkbook = XLSX.readFile("D:\\VTCLN\\musteri.xlsx");
    const musteriSheet = musteriWorkbook.Sheets[musteriWorkbook.SheetNames[0]];
    const musteriData: any[] = XLSX.utils.sheet_to_json(musteriSheet);

    const customerMap = new Map<number, string>();
    for (const row of musteriData) {
      const musid = row["musid"];
      const ad = row["ad"];
      if (musid && ad) {
        // Database'den müşteriyi bul
        const result = await client.query(
          "SELECT id FROM customers WHERE name = $1 LIMIT 1",
          [ad.trim()],
        );
        if (result.rows.length > 0) {
          customerMap.set(musid, result.rows[0].id);
        }
      }
    }
    console.log(`✓ ${customerMap.size} müşteri eşleştirildi`);

    // Ürün mapping (urunid -> database id)
    const urunWorkbook = XLSX.readFile("D:\\VTCLN\\urunler.xlsx");
    const urunSheet = urunWorkbook.Sheets[urunWorkbook.SheetNames[0]];
    const urunData: any[] = XLSX.utils.sheet_to_json(urunSheet);

    const productMap = new Map<number, string>();
    for (const row of urunData) {
      const urunid = row["urunid"];
      const urun = row["urun"];
      if (urunid && urun) {
        // Database'den ürünü bul
        const result = await client.query(
          "SELECT id FROM products WHERE name = $1 LIMIT 1",
          [urun.trim()],
        );
        if (result.rows.length > 0) {
          productMap.set(urunid, result.rows[0].id);
        }
      }
    }
    console.log(`✓ ${productMap.size} ürün eşleştirildi`);

    // Satış verilerini oku
    const satisWorkbook = XLSX.readFile("D:\\VTCLN\\satis.xlsx");
    const satisSheet = satisWorkbook.Sheets[satisWorkbook.SheetNames[0]];
    const satisData: any[] = XLSX.utils.sheet_to_json(satisSheet);

    const detayWorkbook = XLSX.readFile("D:\\VTCLN\\satisdetay.xlsx");
    const detaySheet = detayWorkbook.Sheets[detayWorkbook.SheetNames[0]];
    const detayData: any[] = XLSX.utils.sheet_to_json(detaySheet);

    console.log(`✓ ${satisData.length} satış kaydı bulundu`);
    console.log(`✓ ${detayData.length} satış detay kaydı bulundu`);

    console.log("\n📊 2. Satışlar import ediliyor...");

    // İlk kullanıcıyı al
    const userResult = await client.query("SELECT id FROM users LIMIT 1");
    if (userResult.rows.length === 0) {
      console.error("❌ Sistemde kullanıcı bulunamadı!");
      return;
    }
    const userId = userResult.rows[0].id;

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const satis of satisData) {
      try {
        const satisid = satis["satisid"];
        const musid = satis["musid"];
        const tarih = satis["tarih"];
        const tutar = satis["tutar"] || 0;

        // Müşteri ID'sini bul
        const customerId = customerMap.get(musid);
        if (!customerId) {
          skippedCount++;
          continue;
        }

        // Bu satışın detaylarını bul
        const items = detayData.filter((d) => d["satisid"] === satisid);
        if (items.length === 0) {
          skippedCount++;
          continue;
        }

        // Tarihi parse et
        const saleDate =
          typeof tarih === "number"
            ? excelDateToJSDate(tarih)
            : new Date(tarih);

        // Satış kodunu oluştur
        const code = `SAT-${String(satisid).padStart(5, "0")}`;

        // Mevcut satışı kontrol et
        const existingResult = await client.query(
          "SELECT id FROM transactions WHERE code = $1",
          [code],
        );

        if (existingResult.rows.length > 0) {
          // Sadece tarihi güncelle
          await client.query(
            'UPDATE transactions SET date = $1, "updatedAt" = NOW() WHERE id = $2',
            [saleDate, existingResult.rows[0].id],
          );
          successCount++;
          if (successCount % 100 === 0) {
            console.log(`✓ ${successCount} satış güncellendi...`);
          }
        } else {
          // Toplam tutarı hesapla
          let subtotal = 0;
          let vatTotal = 0;
          let total = 0;

          for (const item of items) {
            const itemTotal = Number(item["satistutar"] || 0);
            const kdvTutar = Number(item["kdvtutar"] || 0);
            subtotal += itemTotal - kdvTutar;
            vatTotal += kdvTutar;
            total += itemTotal;
          }

          // Yeni satış oluştur
          const transactionResult = await client.query(
            `INSERT INTO transactions (id, code, type, "customerId", "userId", date, subtotal, "vatTotal", discount, total, "paidAmount", status, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
             RETURNING id`,
            [
              code,
              "SALE",
              customerId,
              userId,
              saleDate,
              subtotal,
              vatTotal,
              0,
              total,
              total, // Tamamı ödenmiş kabul et
              "PAID",
            ],
          );
          const transactionId = transactionResult.rows[0].id;

          // Satış kalemlerini ekle
          for (const item of items) {
            const urunid = item["urunid"];
            const productId = productMap.get(urunid);

            if (productId) {
              const adet = Number(item["adet"] || 1);
              const satisfiyat = Number(item["satisfiyat"] || 0);
              const kdvOran = Number(item["kdv"] || 0);
              const kdvTutar = Number(item["kdvtutar"] || 0);
              const itemTotal = Number(item["satistutar"] || 0);

              await client.query(
                `INSERT INTO transaction_items (id, "transactionId", "productId", quantity, "unitPrice", "vatRate", discount, total)
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
                [
                  transactionId,
                  productId,
                  adet,
                  satisfiyat,
                  kdvOran,
                  0,
                  itemTotal,
                ],
              );
            }
          }

          successCount++;
          if (successCount % 100 === 0) {
            console.log(`✓ ${successCount} satış oluşturuldu...`);
          }
        }
      } catch (error) {
        console.error(`✗ Hata (satisid: ${satis["satisid"]}):`, error);
        errorCount++;
      }
    }

    console.log("\n📊 İşlem Tamamlandı:");
    console.log(`✓ Başarılı: ${successCount}`);
    console.log(`⚠ Atlanan: ${skippedCount} (müşteri/ürün eşleşmedi)`);
    console.log(`✗ Hatalı: ${errorCount}`);
  } catch (error) {
    console.error("❌ Genel hata:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

importSalesWithMapping();
