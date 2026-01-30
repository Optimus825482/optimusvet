import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Veritabanı temizleme işlemi başlıyor...");

  // Silme sırası (Constraint'ler nedeniyle önemli)
  const tables = [
    "protocol_records",
    "animal_protocols",
    "protocol_steps",
    "protocols",
    "payments",
    "transaction_items",
    "stock_movements",
    "transactions",
    "reminders",
    "animals",
    "products",
    "product_categories",
    "customers",
    "suppliers",
  ];

  try {
    for (const table of tables) {
      console.log(`🗑️ ${table} tablosu temizleniyor...`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
    console.log(
      "✅ Veritabanı başarıyla temizlendi (Kullanıcılar ve Ayarlar korundu).",
    );
  } catch (error) {
    console.error("❌ Hata oluştu:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
