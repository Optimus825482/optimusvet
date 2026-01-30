import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'optimusvet',
  user: 'postgres',
  password: '518518Erkan'
});

async function checkData() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, code, name FROM customers LIMIT 5');
    console.log('=== İLK 5 MÜŞTERİ ===');
    console.log(result.rows);
    
    const result2 = await client.query('SELECT id, code, name FROM products LIMIT 5');
    console.log('\n=== İLK 5 ÜRÜN ===');
    console.log(result2.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

checkData();