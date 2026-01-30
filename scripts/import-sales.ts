import { prisma } from '../src/lib/prisma';
import * as XLSX from 'xlsx';

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

    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      console.error('❌ Sistemde kullanıcı bulunamadı!');
      return;
    }

    for (const satis of satisData) {
      try {
        const customer = await prisma.customer.findFirst({
          where: { code: satis['MUSTERI KODU'] }
        });

        if (!customer) {
          console.log(`⚠ Müşteri bulunamadı: ${satis['MUSTERI KODU']}`);
          errorCount++;
          continue;
        }

        const items = detayData.filter(d => d['SATIS NO'] === satis['SATIS NO']);

        if (items.length === 0) {
          console.log(`⚠ Satış detayı bulunamadı: ${satis['SATIS NO']}`);
          errorCount++;
          continue;
        }

        const saleDate = parseDate(satis['TARIH']);
        const dueDate = satis['VADE TARIHI'] ? parseDate(satis['VADE TARIHI']) : null;

        const total = Number(satis['GENEL TOPLAM'] || 0);
        const paid = Number(satis['ODENEN'] || 0);
        let status: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING';
        if (paid >= total) {
          status = 'PAID';
        } else if (paid > 0) {
          status = 'PARTIAL';
        }

        let paymentMethod: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CHECK' | null = null;
        const odeme = satis['ODEME SEKLI']?.toUpperCase();
        if (odeme?.includes('NAK')) paymentMethod = 'CASH';
        else if (odeme?.includes('KART') || odeme?.includes('KREDI')) paymentMethod = 'CREDIT_CARD';
        else if (odeme?.includes('HAVALE') || odeme?.includes('EFT')) paymentMethod = 'BANK_TRANSFER';
        else if (odeme?.includes('ÇEK')) paymentMethod = 'CHECK';

        const existing = await prisma.transaction.findFirst({
          where: { code: satis['SATIS NO'] }
        });

        if (existing) {
          await prisma.transaction.update({
            where: { id: existing.id },
            data: {
              date: saleDate,
              dueDate: dueDate,
            }
          });
          console.log(`✓ Güncellendi: ${satis['SATIS NO']} - ${saleDate.toLocaleDateString('tr-TR')}`);
        } else {
          const transaction = await prisma.transaction.create({
            data: {
              code: satis['SATIS NO'],
              type: 'SALE',
              customerId: customer.id,
              userId: firstUser.id,
              date: saleDate,
              dueDate: dueDate,
              subtotal: Number(satis['ARA TOPLAM'] || 0),
              vatTotal: Number(satis['KDV TOPLAM'] || 0),
              discount: Number(satis['ISKONTO'] || 0),
              total: total,
              paidAmount: paid,
              paymentMethod: paymentMethod,
              status: status,
              notes: satis['ACIKLAMA'] || null,
            }
          });

          for (const item of items) {
            const product = await prisma.product.findFirst({
              where: { code: item['URUN KODU'] }
            });

            if (product) {
              await prisma.transactionItem.create({
                data: {
                  transactionId: transaction.id,
                  productId: product.id,
                  quantity: Number(item['MIKTAR'] || 1),
                  unitPrice: Number(item['BIRIM FIYAT'] || 0),
                  vatRate: Number(item['KDV ORANI'] || 0),
                  discount: Number(item['ISKONTO'] || 0),
                  total: Number(item['TOPLAM'] || 0),
                }
              });
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
    await prisma.$disconnect();
  }
}

importSales();