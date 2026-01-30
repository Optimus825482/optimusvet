import pkg from 'pg';
const { Pool } = pkg;
import * as XLSX from 'xlsx';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'optimusvet',
  user: 'postgres',
  password: '518518Erkan'
});

interface SatisRow {
  'SATIS NO': string;
  'MUSTERI KODU': string;
  'TARIH': string | number;
  'VADE TARIHI'?: string | number;
  'ARA TOPLAM': number;
  'ISKONTO': number;
  'KDV TOPLAM': number;
  'GENEL TOPLAM': number;
  'ODENEN': number;
  'ODEME SEKLI'?: string;
  'ACIKLAMA'?: string;
}

interface SatisDetayRow {
  'SATIS NO': string;
  'URUN KODU': string;
  'MIKTAR': number;
  'BIRIM FIYAT': number;
  'KDV ORANI': number;
  'ISKONTO': number;
  'TOPLAM': number;
}

function excelDateToJSDate(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

function parseDate(value: string | number): Date {
  if (typeof value === 'number') {
    return excelDateToJSDate(value);
  }
  const parts = String(value).split('.');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return new Date(value);
}

async function importSales() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Excel dosyaları okunuyor...');

    const satisWorkbook = XLSX.readFile('D:\\VTCLN\\satis.xlsx');
    const satisSheet = satisWorkbook.Sheets[satisWorkbook.SheetNames[0]];
    const satisData: SatisRow[] = XLSX.utils.sheet_to_json(satisSheet);

    const detayWorkbook = XLSX.readFile('D:\\VTCLN\\satisdetay.xlsx');
    const detaySheet = detayWorkbook.Sheets[detayWorkbook.SheetNames[0]];
    const detayData: SatisDetayRow[] = XLSX.utils.sheet_to_json(detaySheet);

    console.log(`✓ ${satisData.length} satış kaydı bulundu`);
    console.log(`✓ ${detayData.length} satış detay kaydı bulundu`);

    let successCount = 0;
    let errorCount = 0;

    // İlk kullanıcıyı al
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.error('❌ Sistemde kullanıcı bulunamadı!');
      return;
    }
    const userId = userResult.rows[0].id;

    for (const satis of satisData) {
      try {
        // Müşteriyi bul
        const customerResult = await client.query(
          'SELECT id FROM customers WHERE code = $1',
          [satis['MUSTERI KODU']]
        );

        if (customerResult.rows.length === 0) {
          console.log(`⚠ Müşteri bulunamadı: ${satis['MUSTERI KODU']}`);
          errorCount++;
          continue;
        }
        const customerId = customerResult.rows[0].id;

        // Bu satışın detaylarını bul
        const items = detayData.filter(d => d['SATIS NO'] === satis['SATIS NO']);

        if (items.length === 0) {
          console.log(`⚠ Satış detayı bulunamadı: ${satis['SATIS NO']}`);
          errorCount++;
          continue;
        }

        // Tarihi parse et
        const saleDate = parseDate(satis['TARIH']);
        const dueDate = satis['VADE TARIHI'] ? parseDate(satis['VADE TARIHI']) : null;

        // Ödeme durumunu belirle
        const total = Number(satis['GENEL TOPLAM'] || 0);
        const paid = Number(satis['ODENEN'] || 0);
        let status = 'PENDING';
        if (paid >= total) {
          status = 'PAID';
        } else if (paid > 0) {
          status = 'PARTIAL';
        }

        // Ödeme yöntemini belirle
        let paymentMethod = null;
        const odeme = satis['ODEME SEKLI']?.toUpperCase();
        if (odeme?.includes('NAK')) paymentMethod = 'CASH';
        else if (odeme?.includes('KART') || odeme?.includes('KREDI')) paymentMethod = 'CREDIT_CARD';
        else if (odeme?.includes('HAVALE') || odeme?.includes('EFT')) paymentMethod = 'BANK_TRANSFER';
        else if (odeme?.includes('ÇEK')) paymentMethod = 'CHECK';

        // Mevcut satışı kontrol et
        const existingResult = await client.query(
          'SELECT id FROM transactions WHERE code = $1',
          [satis['SATIS NO']]
        );

        if (existingResult.rows.length > 0) {
          // Sadece tarihi güncelle
          await client.query(
            'UPDATE transactions SET date = $1, "dueDate" = $2, "updatedAt" = NOW() WHERE id = $3',
            [saleDate, dueDate, existingResult.rows[0].id]
          );
          console.log(`✓ Güncellendi: ${satis['SATIS NO']} - ${saleDate.toLocaleDateString('tr-TR')}`);
        } else {
          // Yeni satış oluştur
          const transactionResult = await client.query(
            `INSERT INTO transactions (code, type, "customerId", "userId", date, "dueDate", subtotal, "vatTotal", discount, total, "paidAmount", "paymentMethod", status, notes, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
             RETURNING id`,
            [
              satis['SATIS NO'],
              'SALE',
              customerId,
              userId,
              saleDate,
              dueDate,
              Number(satis['ARA TOPLAM'] || 0),
              Number(satis['KDV TOPLAM'] || 0),
              Number(satis['ISKONTO'] || 0),
              total,
              paid,
              paymentMethod,
              status,
              satis['ACIKLAMA'] || null
            ]
          );
          const transactionId = transactionResult.rows[0].id;

          // Satış kalemlerini ekle
          for (const item of items) {
            const productResult = await client.query(
              'SELECT id FROM products WHERE code = $1',
              [item['URUN KODU']]
            );

            if (productResult.rows.length > 0) {
              await client.query(
                `INSERT INTO transaction_items ("transactionId", "productId", quantity, "unitPrice", "vatRate", discount, total)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  transactionId,
                  productResult.rows[0].id,
                  Number(item['MIKTAR'] || 1),
                  Number(item['BIRIM FIYAT'] || 0),
                  Number(item['KDV ORANI'] || 0),
                  Number(item['ISKONTO'] || 0),
                  Number(item['TOPLAM'] || 0)
                ]
              );
            }
          }

          console.log(`✓ Oluşturuldu: ${satis['SATIS NO']} - ${saleDate.toLocaleDateString('tr-TR')}`);
        }

        successCount++;
      } catch (error) {
        console.error(`✗ Hata: ${satis['SATIS NO']}`, error);
        errorCount++;
      }
    }

    console.log('\n📊 İşlem Tamamlandı:');
    console.log(`✓ Başarılı: ${successCount}`);
    console.log(`✗ Hatalı: ${errorCount}`);

  } catch (error) {
    console.error('❌ Genel hata:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importSales();