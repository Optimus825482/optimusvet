import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "77.42.68.4",
  port: 5437,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function checkCodes() {
  await client.connect();
  const result = await client.query(
    "SELECT code FROM transactions WHERE type='SALE' ORDER BY code LIMIT 10",
  );
  console.log("İlk 10 satış kodu:");
  result.rows.forEach((row) => console.log(`  - ${row.code}`));
  await client.end();
}

checkCodes();
