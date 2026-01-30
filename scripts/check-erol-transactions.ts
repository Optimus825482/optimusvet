import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    "postgresql://postgres:518518Erkan@localhost:5432/optimusvet",
});

async function checkErolTransactions() {
  const client = await pool.connect();

  try {
    console.log("🔍 EROL DEMİR - TÜM İŞLEMLER DETAYLI RAPOR\n");
    console.log("=".repeat(80));

    // Müşteriyi bul
    const customerResult = await client.query(`
      SELECT * FROM customers WHERE code = 'MUS-173'
    `);

    if (customerResult.rows.length === 0) {
      console.log("❌ Müşteri bulunamadı: MUS-173");
      return;
    }

    const customer = customerResult.rows[0];

    console.log(`\n👤 MÜŞTERİ: ${customer.name} (${customer.code})`);
    console.log(
      `   Bakiye: ₺${parseFloat(customer.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}\n`,
    );

    // TÜM işlemleri getir
    const allTransactions = await client.query(
      `
      SELECT 
        id,
        type,
        date,
        total,
        status,
        description,
        "createdAt"
      FROM transactions
      WHERE "customerId" = $1
      ORDER BY date DESC
    `,
      [customer.id],
    );

    console.log(`📝 TOPLAM İŞLEM SAYISI: ${allTransactions.rows.length}\n`);

    // Tipe göre grupla
    const salesCount = allTransactions.rows.filter(
      (t) => t.type === "SALE",
    ).length;
    const paymentsCount = allTransactions.rows.filter(
      (t) => t.type === "CUSTOMER_PAYMENT",
    ).length;
    const treatmentsCount = allTransactions.rows.filter(
      (t) => t.type === "TREATMENT",
    ).length;

    console.log(`📊 İŞLEM TİPLERİ:`);
    console.log(`   🛒 Satış: ${salesCount}`);
    console.log(`   💰 Ödeme: ${paymentsCount}`);
    console.log(`   🏥 Tedavi: ${treatmentsCount}\n`);

    console.log("=".repeat(80));
    console.log("TÜM İŞLEMLER (Tarih Sırasına Göre):\n");

    allTransactions.rows.forEach((tx, idx) => {
      const typeIcons: Record<string, string> = {
        SALE: "🛒",
        CUSTOMER_PAYMENT: "💰",
        TREATMENT: "🏥",
        PURCHASE: "📦",
        RETURN: "↩️",
      };

      const typeLabels: Record<string, string> = {
        SALE: "Satış",
        CUSTOMER_PAYMENT: "Ödeme",
        TREATMENT: "Tedavi",
        PURCHASE: "Alım",
        RETURN: "İade",
      };

      const icon = typeIcons[tx.type] || "📄";
      const label = typeLabels[tx.type] || tx.type;
      const amount = parseFloat(tx.total);
      const date = new Date(tx.date);

      console.log(`${idx + 1}. ${icon} ${label}`);
      console.log(
        `   Tarih: ${date.toLocaleDateString("tr-TR")} ${date.toLocaleTimeString("tr-TR")}`,
      );
      console.log(
        `   Tutar: ₺${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      );
      console.log(`   Durum: ${tx.status}`);
      if (tx.description) {
        console.log(`   Açıklama: ${tx.description}`);
      }
      console.log(`   ID: ${tx.id}`);
      console.log("");
    });

    // Satışları detaylı göster
    console.log("\n" + "=".repeat(80));
    console.log("🛒 SATIŞLAR DETAYLI:\n");

    const sales = allTransactions.rows.filter((t) => t.type === "SALE");

    if (sales.length > 0) {
      for (const sale of sales) {
        const itemsResult = await client.query(
          `
          SELECT * FROM transaction_items WHERE "transactionId" = $1
        `,
          [sale.id],
        );

        console.log(`Satış ID: ${sale.id}`);
        console.log(
          `Tarih: ${new Date(sale.date).toLocaleDateString("tr-TR")}`,
        );
        console.log(`Tutar: ₺${parseFloat(sale.total).toFixed(2)}`);
        console.log(`Durum: ${sale.status}`);
        console.log(`Kalem Sayısı: ${itemsResult.rows.length}`);

        if (itemsResult.rows.length > 0) {
          console.log(`Ürünler:`);
          itemsResult.rows.forEach((item) => {
            console.log(
              `  - ${item.productName}: ${item.quantity} x ₺${parseFloat(item.unitPrice).toFixed(2)} = ₺${parseFloat(item.total).toFixed(2)}`,
            );
          });
        }
        console.log("");
      }
    } else {
      console.log("⚠️  Satış kaydı bulunamadı!\n");
    }

    // Ödemeleri detaylı göster
    console.log("=".repeat(80));
    console.log("💰 ÖDEMELER DETAYLI:\n");

    const payments = allTransactions.rows.filter(
      (t) => t.type === "CUSTOMER_PAYMENT",
    );

    if (payments.length > 0) {
      payments.forEach((payment) => {
        console.log(`Ödeme ID: ${payment.id}`);
        console.log(
          `Tarih: ${new Date(payment.date).toLocaleDateString("tr-TR")}`,
        );
        console.log(`Tutar: ₺${parseFloat(payment.total).toFixed(2)}`);
        console.log(`Durum: ${payment.status}`);
        if (payment.description) {
          console.log(`Açıklama: ${payment.description}`);
        }
        console.log("");
      });
    } else {
      console.log("ℹ️  Ödeme kaydı bulunamadı.\n");
    }

    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ HATA:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkErolTransactions();
