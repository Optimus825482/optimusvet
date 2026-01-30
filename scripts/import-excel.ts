import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();
const EXCEL_PATH = "D:/VTCLN/";

// Helper to read Excel
function readExcel(filename: string) {
  const filePath = path.join(EXCEL_PATH, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Dosya bulunamadı: ${filename}`);
    return null;
  }
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

async function main() {
  console.log("🚀 Veri aktarımı başlıyor...");

  // 0. İlk kullanıcıyı al
  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    console.error(
      "❌ Veritabanında kullanıcı bulunamadı. Lütfen önce bir kullanıcı oluşturun.",
    );
    return;
  }
  const userId = defaultUser.id;

  // Mapping maps
  const categoryMap = new Map<number, string>();
  const customerMap = new Map<number, string>();
  const supplierMap = new Map<number, string>();
  const productMap = new Map<number, string>();
  const saleMap = new Map<number, string>();
  const purchaseMap = new Map<number, string>();

  // 1. Kategoriler (stokgrup.xlsx)
  console.log("📈 Kategoriler aktarılıyor...");
  const categoryData = readExcel("stokgrup.xlsx") as any[];
  if (categoryData) {
    for (const row of categoryData) {
      const cat = await prisma.category.create({
        data: { name: row.grup || `Grup ${row.grupid}` },
      });
      categoryMap.set(row.grupid, cat.id);
    }
  }

  // 2. Müşteriler (musteri.xlsx)
  console.log("👥 Müşteriler aktarılıyor...");
  const customerData = readExcel("musteri.xlsx") as any[];
  if (customerData) {
    let count = 1;
    for (const row of customerData) {
      const cust = await prisma.customer.create({
        data: {
          code: `MUS-${count.toString().padStart(3, "0")}`,
          name: row.ad || row.unvan || "İsimsiz Müşteri",
          phone: row.tel ? String(row.tel) : null,
          taxNumber: row.vergino ? String(row.vergino) : null,
          taxOffice: row.vergidaire || null,
          address: row.adres || null,
          notes: `Eski ID: ${row.musid}`,
        },
      });
      customerMap.set(row.musid, cust.id);
      count++;
    }
  }

  // 3. Tedarikçiler (firma.xlsx)
  console.log("🏢 Tedarikçiler aktarılıyor...");
  const supplierData = readExcel("firma.xlsx") as any[];
  if (supplierData) {
    let count = 1;
    for (const row of supplierData) {
      const supp = await prisma.supplier.create({
        data: {
          code: `TED-${count.toString().padStart(3, "0")}`,
          name: row.ad || row.unvan || "İsimsiz Firma",
          phone: row.tel ? String(row.tel) : null,
          taxNumber: row.vergino ? String(row.vergino) : null,
          taxOffice: row.vergidaire || null,
          address: row.adres || null,
          notes: `Eski ID: ${row.firid}`,
        },
      });
      supplierMap.set(row.firid, supp.id);
      count++;
    }
  }

  // 4. Ürünler (urunler.xlsx)
  console.log("📦 Ürünler aktarılıyor...");
  const productData = readExcel("urunler.xlsx") as any[];
  if (productData) {
    let count = 1;
    for (const row of productData) {
      const prod = await prisma.product.create({
        data: {
          code: row.stokkodu || `URN-${count.toString().padStart(3, "0")}`,
          name: row.urun,
          vatRate: row.kdv || 10,
          criticalLevel: row.stoklimit || 0,
          purchasePrice: row.alisfiyat || 0,
          salePrice: row.satisfiyat || 0,
          categoryId: categoryMap.get(row.stokgrubu) || null,
          description: `Eski ID: ${row.urunid}`,
        },
      });
      productMap.set(row.urunid, prod.id);
      count++;
    }
  }

  // 5. Satışlar (satis.xlsx)
  console.log("💰 Satışlar aktarılıyor...");
  const saleData = readExcel("satis.xlsx") as any[];
  if (saleData) {
    for (const row of saleData) {
      const sale = await prisma.transaction.create({
        data: {
          code: row.fno || `SAT-${row.satisid}`,
          type: "SALE",
          customerId: customerMap.get(row.musid) || null,
          userId: userId,
          date: row.tarih ? new Date(row.tarih) : new Date(),
          total: row.tutar || 0,
          subtotal: row.tutar || 0,
          status: "PAID",
          notes: `Eski Satış ID: ${row.satisid}`,
        },
      });
      saleMap.set(row.satisid, sale.id);
    }
  }

  // 6. Satış Detayları (satisdetay.xlsx)
  console.log("📋 Satış kalemleri aktarılıyor...");
  const saleDetailData = readExcel("satisdetay.xlsx") as any[];
  if (saleDetailData) {
    for (const row of saleDetailData) {
      const tId = saleMap.get(row.satisid);
      const pId = productMap.get(row.urunid);
      if (tId && pId) {
        await prisma.transactionItem.create({
          data: {
            transactionId: tId,
            productId: pId,
            quantity: row.adet || 1,
            unitPrice: row.satisfiyat || 0,
            vatRate: row.kdv || 10,
            total: row.satistutar || 0,
          },
        });
      }
    }
  }

  // 7. Alımlar (alisislem.xlsx)
  console.log("🛒 Alımlar aktarılıyor...");
  const purchaseData = readExcel("alisislem.xlsx") as any[];
  if (purchaseData) {
    for (const row of purchaseData) {
      const pur = await prisma.transaction.create({
        data: {
          code: row.fno || `ALM-${row.alisislemid}`,
          type: "PURCHASE",
          supplierId: supplierMap.get(row.firid) || null,
          userId: userId,
          date: row.tarih ? new Date(row.tarih) : new Date(),
          total: row.tutar || 0,
          subtotal: row.tutar || 0,
          status: "PAID",
          notes: `Eski Alım ID: ${row.alisislemid}`,
        },
      });
      purchaseMap.set(row.alisislemid, pur.id);
    }
  }

  // 8. Alım Detayları (alisdetay.xlsx)
  console.log("📋 Alım kalemleri aktarılıyor...");
  const purchaseDetailData = readExcel("alisdetay.xlsx") as any[];
  if (purchaseDetailData) {
    for (const row of purchaseDetailData) {
      const tId = purchaseMap.get(row.alisislemid);
      const pId = productMap.get(row.urunid);
      if (tId && pId) {
        await prisma.transactionItem.create({
          data: {
            transactionId: tId,
            productId: pId,
            quantity: row.adet || 1,
            unitPrice: row.birimfiyat || 0,
            vatRate: row.kdv || 10,
            total: row.tutar || 0,
          },
        });
      }
    }
  }

  // 9. Tahsilatlar (musteritahsilat.xlsx) -> Önemli: Cari bakiye güncelleme
  console.log("💸 Müşteri tahsilatları aktarılıyor...");
  const collectionData = readExcel("musteritahsilat.xlsx") as any[];
  if (collectionData) {
    for (const row of collectionData) {
      const custId = customerMap.get(row.musid);
      if (custId) {
        await prisma.transaction.create({
          data: {
            code: `THS-${row.tahsilatid}`,
            type: "CUSTOMER_PAYMENT",
            customerId: custId,
            userId: userId,
            date: row.tarih ? new Date(row.tarih) : new Date(),
            total: row.odemetutar || 0,
            subtotal: row.odemetutar || 0,
            paidAmount: row.odemetutar || 0,
            status: "PAID",
            paymentMethod: row.odemetur === "Nakit" ? "CASH" : "CREDIT_CARD",
            notes: `Eski Tahsilat ID: ${row.tahsilatid}`,
          },
        });

        // Bakiyeyi güncelle
        await prisma.customer.update({
          where: { id: custId },
          data: { balance: { increment: row.odemetutar } },
        });
      }
    }
  }

  // 10. Firma Ödemeleri (firmaodeme.xlsx)
  console.log("💸 Firma ödemeleri aktarılıyor...");
  const paymentData = readExcel("firmaodeme.xlsx") as any[];
  if (paymentData) {
    for (const row of paymentData) {
      const suppId = supplierMap.get(row.firid);
      if (suppId) {
        await prisma.transaction.create({
          data: {
            code: `ODM-${row.firodemeid}`,
            type: "SUPPLIER_PAYMENT",
            supplierId: suppId,
            userId: userId,
            date: row.tarih ? new Date(row.tarih) : new Date(),
            total: row.odemetutar || 0,
            subtotal: row.odemetutar || 0,
            paidAmount: row.odemetutar || 0,
            status: "PAID",
            paymentMethod: row.odemetur === "Nakit" ? "CASH" : "CREDIT_CARD",
            notes: `Eski Ödeme ID: ${row.firodemeid}`,
          },
        });

        // Bakiyeyi güncelle
        await prisma.supplier.update({
          where: { id: suppId },
          data: { balance: { decrement: row.odemetutar } },
        });
      }
    }
  }

  console.log("✅ Tüm veriler başarıyla aktarıldı!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
