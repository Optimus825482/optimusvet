import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)

cur = conn.cursor()

# List all tables
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
""")

tables = cur.fetchall()

print("=== POSTGRESQL TABLOLARI ===\n")
for table in tables:
    print(f"  - {table[0]}")

print(f"\nToplam {len(tables)} tablo")

cur.close()
conn.close()
