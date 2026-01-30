import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "77.42.68.4",
  port: 5437,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function checkSalesWithoutItems() {
  await client.connect();

  const result = await client.query(`
    SELECT t.code, t.total
    FROM transactions t
    LEFT JOIN transaction_items ti ON ti."transactionId" = t.id
    WHERE t.type = 'SALE'
    GROUP BY t.id, t.code, t.total
    HAVING COUNT(ti.id) = 0
    LIMIT 20
  `);

  console.log(`Detaysız satış sayısı: ${result.rows.length}`);
  result.rows.forEach((row) => {
    console.log(`  - ${row.code}: ${row.total} TL`);
  });

  await client.end();
}

checkSalesWithoutItems();
