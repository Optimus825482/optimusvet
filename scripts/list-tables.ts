import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  host: "77.42.68.4",
  port: 5437,
  database: "optimusvet",
  user: "postgres",
  password: "518518Erkan",
});

async function listTables() {
  try {
    await client.connect();
    console.log("=== DATABASE TABLOLARI ===\n");

    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log("Tablolar:");
    result.rows.forEach((row) => {
      console.log(`- ${row.table_name}`);
    });
  } catch (error) {
    console.error("Hata:", error);
  } finally {
    await client.end();
  }
}

listTables();
