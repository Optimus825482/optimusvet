import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function verifyCustomerBalance(customerCode: string) {
  try {
    await client.connect();
    console.log(`=== MÜŞTERİ BAKİYE DOĞRULAMA: ${customerCode} ===\n`);

    // Get customer
    const customerResult = await client.query(
      `SELECT id, code, name, balance FROM customers WHERE code = $1`,
      [customerCode],
    );

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

    // Get sales
    const salesResult = await client.query(
      `SELECT 
        code, 
        date, 
        total,
        status
      FROM transactions 
      WHERE "customerId" = $1 AND type = 'SALE'
      ORDER BY date DESC`,
      [customer.id],
    );

    console.log(`=== SATIŞLAR (${salesResult.rows.length} adet) ===`);
    let totalSales = 0;
    salesResult.rows.slice(0, 5).forEach((sale) => {
      const amount = parseFloat(sale.total);
      totalSales += amount;
      console.log(
        `${sale.code} - ${new Date(sale.date).toLocaleDateString("tr-TR")} - ${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
      );
    });

    if (salesResult.rows.length > 5) {
      console.log(`... ve ${salesResult.rows.length - 5} satış daha`);
    }

    // Calculate total sales
    const totalSalesResult = await client.query(
      `SELECT SUM(total) as total FROM transactions WHERE "customerId" = $1 AND type = 'SALE'`,
      [customer.id],
    );
    const allSalesTotal = parseFloat(totalSalesResult.rows[0].total || 0);
    console.log(
      `\nToplam Satış: ${allSalesTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL\n`,
    );

    // Get payments
    const paymentsResult = await client.query(
      `SELECT 
        code, 
        date, 
        total
      FROM transactions 
      WHERE "customerId" = $1 AND type = 'CUSTOMER_PAYMENT'
      ORDER BY date DESC`,
      [customer.id],
    );

    console.log(`=== TAHSİLATLAR (${paymentsResult.rows.length} adet) ===`);
    paymentsResult.rows.slice(0, 5).forEach((payment) => {
      const amount = parseFloat(payment.total);
      console.log(
        `${payment.code} - ${new Date(payment.date).toLocaleDateString("tr-TR")} - ${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
      );
    });

    if (paymentsResult.rows.length > 5) {
      console.log(`... ve ${paymentsResult.rows.length - 5} tahsilat daha`);
    }

    // Calculate total payments
    const totalPaymentsResult = await client.query(
      `SELECT SUM(total) as total FROM transactions WHERE "customerId" = $1 AND type = 'CUSTOMER_PAYMENT'`,
      [customer.id],
    );
    const allPaymentsTotal = parseFloat(totalPaymentsResult.rows[0].total || 0);
    console.log(
      `\nToplam Tahsilat: ${allPaymentsTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL\n`,
    );

    // Verification
    const calculatedBalance = allSalesTotal - allPaymentsTotal;
    const dbBalance = parseFloat(customer.balance);

    console.log("=== DOĞRULAMA ===");
    console.log(
      `Hesaplanan Bakiye: ${calculatedBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );
    console.log(
      `Database Bakiye: ${dbBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
    );

    if (Math.abs(calculatedBalance - dbBalance) < 0.01) {
      console.log("✅ Bakiye doğru!");
    } else {
      console.log(
        `❌ Bakiye uyuşmuyor! Fark: ${(calculatedBalance - dbBalance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
      );
    }

    await client.end();
  } catch (error: any) {
    console.error("Hata:", error.message);
    await client.end();
  }
}

// Test with top customer
verifyCustomerBalance("MUS-159");
