import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)

cur = conn.cursor()

# Check payments table columns
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'payments'
    ORDER BY ordinal_position
""")

columns = cur.fetchall()

print("=== PAYMENTS TABLOSU KOLONLARI ===\n")
for col_name, data_type in columns:
    print(f"  {col_name}: {data_type}")

cur.close()
conn.close()
