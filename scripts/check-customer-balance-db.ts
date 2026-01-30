import { PrismaClient } from "@prisma/client";

// Set production database URL
process.env.DATABASE_URL =
  "postgresql://postgres:518518Erkan@77.42.68.4:5437/optimusvet";

const prisma = new PrismaClient();

async function checkBalances() {
  console.log("=== DATABASE MUSTERI BAKIYE KONTROLU ===\n");

  // Toplam müşteri sayısı
  const totalCustomers = await prisma.customer.count();

  // Alacaklı müşteriler (balance > 0)
  const alacakliCount = await prisma.customer.count({
    where: { balance: { gt: 0 } },
  });

  // Borçlu müşteriler (balance < 0)
  const borcluCount = await prisma.customer.count({
    where: { balance: { lt: 0 } },
  });

  // Toplam alacak
  const totalAlacak = await prisma.customer.aggregate({
    where: { balance: { gt: 0 } },
    _sum: { balance: true },
  });

  // Toplam borç
  const totalBorc = await prisma.customer.aggregate({
    where: { balance: { lt: 0 } },
    _sum: { balance: true },
  });

  const alacakAmount = Number(totalAlacak._sum.balance || 0);
  const borcAmount = Math.abs(Number(totalBorc._sum.balance || 0));

  console.log(`Toplam Musteri: ${totalCustomers}`);
  console.log(`Alacakli Musteri: ${alacakliCount}`);
  console.log(`Borclu Musteri: ${borcluCount}`);
  console.log(`Bakiye Sifir: ${totalCustomers - alacakliCount - borcluCount}`);
  console.log(
    `\nToplam Alacak: ${alacakAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );
  console.log(
    `Toplam Borc: ${borcAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
  );

  // En yüksek alacaklı 10 müşteri
  const topAlacakli = await prisma.customer.findMany({
    where: { balance: { gt: 0 } },
    orderBy: { balance: "desc" },
    take: 10,
    select: {
      name: true,
      code: true,
      balance: true,
      _count: {
        select: { transactions: true },
      },
    },
  });

  console.log("\n=== EN YUKSEK ALACAKLI 10 MUSTERI ===");
  topAlacakli.forEach((customer, index) => {
    const balanceAmount = Number(customer.balance);
    console.log(`${index + 1}. ${customer.name} (${customer.code})`);
    console.log(
      `   Alacak: ${balanceAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(`   Islem Sayisi: ${customer._count.transactions}`);
  });

  console.log("\n=== MUSTERI NASIL ALACAKLI OLUR? ===");
  console.log("1. Musteri'ye satis yapilir (Transaction type: SALE)");
  console.log("2. Satis tutari customer.balance'a EKLENIR");
  console.log("3. Musteri odeme yapar (Payment)");
  console.log("4. Odeme tutari customer.balance'tan CIKARILIR");
  console.log("5. Kalan bakiye > 0 ise musteri ALACAKLI");
  console.log("\nOrnek:");
  console.log("- Baslangic: balance = 0");
  console.log("- 1000 TL satis: balance = 0 + 1000 = 1000 TL (ALACAKLI)");
  console.log("- 600 TL odeme: balance = 1000 - 600 = 400 TL (ALACAKLI)");
  console.log("- 400 TL odeme: balance = 400 - 400 = 0 TL (SIFIR)");

  await prisma.$disconnect();
}

checkBalances().catch(console.error);
