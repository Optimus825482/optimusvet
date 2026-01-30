import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "localhost",
  port: 5432,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function updateSaleStatus() {
  try {
    await client.connect();
    console.log("=== SATIŞ DURUMLARI GÜNCELLENİYOR ===\n");

    await client.query("BEGIN");

    // Müşteri bazında bakiye kontrolü yaparak satış durumlarını güncelle
    console.log(
      "1️⃣ Müşteri bakiyelerine göre satış durumları güncelleniyor...\n",
    );

    // Stratejimiz:
    // - Müşterinin bakiyesi 0 ise → Tüm satışları PAID
    // - Müşterinin bakiyesi > 0 ise → En eski satışları PAID, en yenileri PENDING/PARTIAL

    // Önce tüm müşterileri al
    const customersResult = await client.query(`
      SELECT 
        id, 
        name, 
        balance,
        (SELECT SUM(total) FROM transactions WHERE "customerId" = customers.id AND type = 'SALE') as total_sales,
        (SELECT SUM(total) FROM transactions WHERE "customerId" = customers.id AND type = 'CUSTOMER_PAYMENT') as total_payments
      FROM customers
      WHERE balance != 0 OR 
            EXISTS (SELECT 1 FROM transactions WHERE "customerId" = customers.id AND type = 'SALE')
      ORDER BY balance DESC
    `);

    console.log(`Toplam ${customersResult.rows.length} müşteri işlenecek...\n`);

    let updatedPaid = 0;
    let updatedPartial = 0;
    let updatedPending = 0;

    for (const customer of customersResult.rows) {
      const balance = parseFloat(customer.balance);
      const totalSales = parseFloat(customer.total_sales || 0);
      const totalPayments = parseFloat(customer.total_payments || 0);

      if (totalSales === 0) continue;

      // Bakiye 0 ise tüm satışlar ödendi
      if (Math.abs(balance) < 0.01) {
        const result = await client.query(
          `
          UPDATE transactions 
          SET status = 'PAID', "paidAmount" = total
          WHERE "customerId" = $1 AND type = 'SALE' AND status != 'PAID'
        `,
          [customer.id],
        );
        updatedPaid += result.rowCount || 0;
      }
      // Bakiye > 0 ise kısmi ödeme var
      else if (balance > 0 && totalPayments > 0) {
        // Ödenen miktar
        const paidAmount = totalPayments;

        // En eski satışları ödendi olarak işaretle
        const salesResult = await client.query(
          `
          SELECT id, total 
          FROM transactions 
          WHERE "customerId" = $1 AND type = 'SALE'
          ORDER BY date ASC
        `,
          [customer.id],
        );

        let remainingPayment = paidAmount;

        for (const sale of salesResult.rows) {
          const saleTotal = parseFloat(sale.total);

          if (remainingPayment >= saleTotal) {
            // Tam ödendi
            await client.query(
              `
              UPDATE transactions 
              SET status = 'PAID', "paidAmount" = total
              WHERE id = $1
            `,
              [sale.id],
            );
            remainingPayment -= saleTotal;
            updatedPaid++;
          } else if (remainingPayment > 0) {
            // Kısmi ödendi
            await client.query(
              `
              UPDATE transactions 
              SET status = 'PARTIAL', "paidAmount" = $1
              WHERE id = $2
            `,
              [remainingPayment, sale.id],
            );
            remainingPayment = 0;
            updatedPartial++;
          } else {
            // Ödenmedi
            await client.query(
              `
              UPDATE transactions 
              SET status = 'PENDING', "paidAmount" = 0
              WHERE id = $1
            `,
              [sale.id],
            );
            updatedPending++;
          }
        }
      }
      // Bakiye > 0 ve hiç ödeme yok
      else if (balance > 0 && totalPayments === 0) {
        const result = await client.query(
          `
          UPDATE transactions 
          SET status = 'PENDING', "paidAmount" = 0
          WHERE "customerId" = $1 AND type = 'SALE' AND status != 'PENDING'
        `,
          [customer.id],
        );
        updatedPending += result.rowCount || 0;
      }
    }

    await client.query("COMMIT");

    console.log("=== ÖZET ===");
    console.log(`✅ ${updatedPaid} satış → PAID (Ödendi)`);
    console.log(`✅ ${updatedPartial} satış → PARTIAL (Kısmi Ödendi)`);
    console.log(`✅ ${updatedPending} satış → PENDING (Bekliyor)`);

    // Doğrulama
    console.log("\n=== DOĞRULAMA ===");
    const statusResult = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total) as total_amount
      FROM transactions
      WHERE type = 'SALE'
      GROUP BY status
      ORDER BY status
    `);

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
        `${statusName}: ${row.count} adet - ${parseFloat(row.total_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`,
      );
    });

    await client.end();
    console.log("\n✅ Satış durumları güncellendi!");
  } catch (error: any) {
    console.error("\n❌ HATA:", error.message);
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
    process.exit(1);
  }
}

updateSaleStatus();
