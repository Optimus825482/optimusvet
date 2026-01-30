import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function checkTurkayDemirhan() {
  try {
    await client.connect();
    console.log("=== TURKAY DEMIRHAN KAYIT KONTROLÜ ===\n");

    // Müşteriyi bul
    const customerResult = await client.query(`
      SELECT id, code, name, balance 
      FROM customers 
      WHERE name ILIKE '%Turkay%DEMIRHAN%'
    `);

    if (customerResult.rows.length === 0) {
      console.log("❌ Müşteri bulunamadı!");
      await client.end();
      return;
    }

    const customer = customerResult.rows[0];
    console.log(`Müşteri: ${customer.name}`);
    console.log(`Kod: ${customer.code}`);
    console.log(
      `Bakiye: ${parseFloat(customer.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL\n`,
    );

    // Satışları getir
    const salesResult = await client.query(
      `
      SELECT 
        code,
        date,
        total,
        status,
        "paidAmount"
      FROM transactions
      WHERE "customerId" = $1 AND type = 'SALE'
      ORDER BY date DESC
    `,
      [customer.id],
    );

    console.log(`=== SATIŞLAR (${salesResult.rows.length} adet) ===`);
    let totalSales = 0;
    salesResult.rows.forEach((sale, idx) => {
      const amount = parseFloat(sale.total);
      totalSales += amount;
      if (idx < 10) {
        console.log(
          `${sale.code} - ${new Date(sale.date).toLocaleDateString("tr-TR")} - ${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL - ${sale.status}`,
        );
      }
    });
    if (salesResult.rows.length > 10) {
      console.log(`... ve ${salesResult.rows.length - 10} satış daha`);
    }
    console.log(
      `\nToplam Satış: ${totalSales.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL\n`,
    );

    // Tahsilatları getir
    const paymentsResult = await client.query(
      `
      SELECT 
        code,
        date,
        total,
        "paymentMethod"
      FROM transactions
      WHERE "customerId" = $1 AND type = 'CUSTOMER_PAYMENT'
      ORDER BY date DESC
    `,
      [customer.id],
    );

    console.log(`=== TAHSİLATLAR (${paymentsResult.rows.length} adet) ===`);
    let totalPayments = 0;
    paymentsResult.rows.forEach((payment, idx) => {
      const amount = parseFloat(payment.total);
      totalPayments += amount;
      if (idx < 10) {
        console.log(
          `${payment.code} - ${new Date(payment.date).toLocaleDateString("tr-TR")} - ${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL - ${payment.paymentMethod || "CASH"}`,
        );
      }
    });
    if (paymentsResult.rows.length > 10) {
      console.log(`... ve ${paymentsResult.rows.length - 10} tahsilat daha`);
    }
    console.log(
      `\nToplam Tahsilat: ${totalPayments.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL\n`,
    );

    // Hesap özeti
    console.log("=== HESAP ÖZETİ ===");
    console.log(
      `Toplam Satış: ${totalSales.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(
      `Toplam Tahsilat: ${totalPayments.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(
      `Hesaplanan Bakiye: ${(totalSales - totalPayments).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(
      `Database Bakiye: ${parseFloat(customer.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );

    const diff = Math.abs(
      totalSales - totalPayments - parseFloat(customer.balance),
    );
    if (diff < 0.01) {
      console.log("✅ Bakiye doğru!");
    } else {
      console.log(
        `❌ Bakiye uyuşmuyor! Fark: ${diff.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
      );
    }

    // Eski sistem ile karşılaştırma
    console.log("\n=== ESKİ SİSTEM KARŞILAŞTIRMASI ===");
    console.log("Eski Sistem:");
    console.log("  Toplam Borç: 68.003,00 TL");
    console.log("  Toplam Ödeme: 58.529,00 TL");
    console.log("  Bakiye: 9.474,00 TL");
    console.log("\nYeni Sistem:");
    console.log(
      `  Toplam Satış: ${totalSales.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(
      `  Toplam Tahsilat: ${totalPayments.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(
      `  Bakiye: ${parseFloat(customer.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );

    const salesDiff = totalSales - 68003;
    const paymentsDiff = totalPayments - 58529;
    const balanceDiff = parseFloat(customer.balance) - 9474;

    console.log("\nFarklar:");
    console.log(
      `  Satış Farkı: ${salesDiff.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(
      `  Tahsilat Farkı: ${paymentsDiff.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(
      `  Bakiye Farkı: ${balanceDiff.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );

    // Durum analizi
    console.log("\n=== DURUM ANALİZİ ===");
    const statusResult = await client.query(
      `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total) as total
      FROM transactions
      WHERE "customerId" = $1 AND type = 'SALE'
      GROUP BY status
    `,
      [customer.id],
    );

    statusResult.rows.forEach((row) => {
      const statusName =
        row.status === "PAID"
          ? "Ödendi"
          : row.status === "PARTIAL"
            ? "Kısmi Ödendi"
            : row.status === "PENDING"
              ? "Bekliyor"
              : row.status;

      console.log(
        `${statusName}: ${row.count} adet - ${parseFloat(row.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
      );
    });

    await client.end();
  } catch (error: any) {
    console.error("Hata:", error.message);
    await client.end();
  }
}

checkTurkayDemirhan();
