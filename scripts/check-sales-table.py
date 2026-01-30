import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)

cur = conn.cursor()

# Check if sales table exists
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'sales'
    ORDER BY ordinal_position
""")

columns = cur.fetchall()

if columns:
    print("=== SALES TABLOSU KOLONLARI ===\n")
    for col_name, data_type in columns:
        print(f"  {col_name}: {data_type}")
else:
    print("❌ 'sales' tablosu bulunamadı!")
    
    # Try transactions table
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'transactions'
        ORDER BY ordinal_position
    """)
    
    trans_columns = cur.fetchall()
    print("\n=== TRANSACTIONS TABLOSU KOLONLARI ===\n")
    for col_name, data_type in trans_columns:
        print(f"  {col_name}: {data_type}")

cur.close()
conn.close()
