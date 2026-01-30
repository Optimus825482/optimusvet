import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)

cur = conn.cursor()

# Check transaction types
cur.execute("""
    SELECT type, COUNT(*)
    FROM transactions
    GROUP BY type
""")

types = cur.fetchall()

print("=== TRANSACTION TYPES ===\n")
for type_name, count in types:
    print(f"{type_name}: {count} adet")

# Check for MUS-063 customer
cur.execute("""
    SELECT id FROM customers WHERE code = 'MUS-063'
""")
customer_id = cur.fetchone()[0]

print(f"\n=== MUS-063 TRANSACTIONS ===\n")

cur.execute("""
    SELECT type, COUNT(*), SUM(total)
    FROM transactions
    WHERE "customerId" = %s
    GROUP BY type
""", (customer_id,))

customer_types = cur.fetchall()

for type_name, count, total in customer_types:
    print(f"{type_name}: {count} adet - {float(total):,.2f} TL")

cur.close()
conn.close()
