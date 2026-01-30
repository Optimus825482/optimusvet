import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifySalesData() {
  console.log("🔍 SATIŞ VERİLERİ KONTROL RAPORU\n");
  console.log("=".repeat(80));

  try {
    // 1. Toplam satış sayısı
    const totalSales = await prisma.transaction.count({
      where: { type: "SALE" },
    });
    console.log(
      `\n📊 TOPLAM SATIŞ SAYISI: ${totalSales.toLocaleString("tr-TR")}`,
    );

    // 2. Tarih aralığı kontrolü
    const dateRange = await prisma.transaction.aggregate({
      where: { type: "SALE" },
      _min: { date: true },
      _max: { date: true },
    });
    console.log(`\n📅 TARİH ARALIĞI:`);
    console.log(
      `   En Eski Satış: ${dateRange._min.date?.toLocaleDateString("tr-TR")}`,
    );
    console.log(
      `   En Yeni Satış: ${dateRange._max.date?.toLocaleDateString("tr-TR")}`,
    );

    // 3. Yıllara göre dağılım
    const salesByYear = await prisma.$queryRaw<
      Array<{ year: string; count: bigint; total: any }>
    >`
      SELECT 
        EXTRACT(YEAR FROM date)::text as year,
        COUNT(*)::bigint as count,
        SUM(total) as total
      FROM transactions
      WHERE type = 'SALE'
      GROUP BY EXTRACT(YEAR FROM date)
      ORDER BY year DESC
    `;

    console.log(`\n📈 YILLARA GÖRE DAĞILIM:`);
    salesByYear.forEach((row) => {
      const total = parseFloat(row.total?.toString() || "0");
      console.log(
        `   ${row.year}: ${Number(row.count).toLocaleString("tr-TR")} satış - ₺${total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
    });

    // 4. Müşteri bağlantısı kontrolü
    const salesWithCustomer = await prisma.transaction.count({
      where: {
        type: "SALE",
        customerId: { not: null },
      },
    });
    const salesWithoutCustomer = totalSales - salesWithCustomer;

    console.log(`\n👥 MÜŞTERİ BAĞLANTISI:`);
    console.log(
      `   Müşterili Satışlar: ${salesWithCustomer.toLocaleString("tr-TR")} (${((salesWithCustomer / totalSales) * 100).toFixed(2)}%)`,
    );
    console.log(
      `   Müşterisiz Satışlar: ${salesWithoutCustomer.toLocaleString("tr-TR")} (${((salesWithoutCustomer / totalSales) * 100).toFixed(2)}%)`,
    );

    // 5. Satış kalemleri kontrolü
    const totalItems = await prisma.transactionItem.count();
    const itemsWithProduct = await prisma.transactionItem.count({
      where: { productId: { not: null } },
    });

    console.log(`\n🛒 SATIŞ KALEMLERİ:`);
    console.log(`   Toplam Kalem: ${totalItems.toLocaleString("tr-TR")}`);
    console.log(
      `   Ürün Bağlantılı: ${itemsWithProduct.toLocaleString("tr-TR")} (${((itemsWithProduct / totalItems) * 100).toFixed(2)}%)`,
    );
    console.log(
      `   Ortalama Kalem/Satış: ${(totalItems / totalSales).toFixed(2)}`,
    );

    // 6. Durum kontrolü
    const statusBreakdown = await prisma.transaction.groupBy({
      by: ["status"],
      where: { type: "SALE" },
      _count: true,
    });

    console.log(`\n📋 DURUM DAĞILIMI:`);
    statusBreakdown.forEach((row) => {
      const statusLabels: Record<string, string> = {
        PENDING: "Bekliyor",
        PARTIAL: "Kısmi Ödeme",
        COMPLETED: "Tamamlandı",
        CANCELLED: "İptal",
      };
      console.log(
        `   ${statusLabels[row.status] || row.status}: ${row._count.toLocaleString("tr-TR")}`,
      );
    });

    // 7. Toplam tutar kontrolü
    const totalAmount = await prisma.transaction.aggregate({
      where: { type: "SALE" },
      _sum: { total: true },
    });

    console.log(`\n💰 TOPLAM SATIŞ TUTARI:`);
    const total = parseFloat(totalAmount._sum.total?.toString() || "0");
    console.log(
      `   ₺${total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );

    // 8. Örnek satışlar (ilk 5 ve son 5)
    console.log(`\n📝 ÖRNEK SATIŞLAR (İlk 5):`);
    const firstSales = await prisma.transaction.findMany({
      where: { type: "SALE" },
      orderBy: { date: "asc" },
      take: 5,
      include: {
        customer: { select: { name: true } },
        items: {
          select: { productName: true, quantity: true, unitPrice: true },
        },
      },
    });

    firstSales.forEach((sale, idx) => {
      const total = parseFloat(sale.total.toString());
      console.log(
        `\n   ${idx + 1}. Tarih: ${sale.date.toLocaleDateString("tr-TR")}`,
      );
      console.log(`      Müşteri: ${sale.customer?.name || "Bilinmiyor"}`);
      console.log(
        `      Tutar: ₺${total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
      console.log(`      Kalem Sayısı: ${sale.items.length}`);
    });

    console.log(`\n📝 ÖRNEK SATIŞLAR (Son 5):`);
    const lastSales = await prisma.transaction.findMany({
      where: { type: "SALE" },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        customer: { select: { name: true } },
        items: {
          select: { productName: true, quantity: true, unitPrice: true },
        },
      },
    });

    lastSales.forEach((sale, idx) => {
      const total = parseFloat(sale.total.toString());
      console.log(
        `\n   ${idx + 1}. Tarih: ${sale.date.toLocaleDateString("tr-TR")}`,
      );
      console.log(`      Müşteri: ${sale.customer?.name || "Bilinmiyor"}`);
      console.log(
        `      Tutar: ₺${total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
      console.log(`      Kalem Sayısı: ${sale.items.length}`);
    });

    // 9. Veri bütünlüğü kontrolleri
    console.log(`\n\n🔍 VERİ BÜTÜNLÜĞÜ KONTROLLERI:`);

    // Negatif tutarlar
    const negativeTotals = await prisma.transaction.count({
      where: {
        type: "SALE",
        total: { lt: 0 },
      },
    });
    console.log(`   ❌ Negatif Tutarlı Satışlar: ${negativeTotals}`);

    // Sıfır tutarlı satışlar
    const zeroTotals = await prisma.transaction.count({
      where: {
        type: "SALE",
        total: 0,
      },
    });
    console.log(`   ⚠️  Sıfır Tutarlı Satışlar: ${zeroTotals}`);

    // Kalemsiz satışlar
    const salesWithoutItems = await prisma.transaction.count({
      where: {
        type: "SALE",
        items: { none: {} },
      },
    });
    console.log(`   ⚠️  Kalemsiz Satışlar: ${salesWithoutItems}`);

    // Gelecek tarihli satışlar
    const futureSales = await prisma.transaction.count({
      where: {
        type: "SALE",
        date: { gt: new Date() },
      },
    });
    console.log(`   ⚠️  Gelecek Tarihli Satışlar: ${futureSales}`);

    console.log("\n" + "=".repeat(80));
    console.log("✅ KONTROL TAMAMLANDI\n");
  } catch (error) {
    console.error("❌ HATA:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySalesData();
