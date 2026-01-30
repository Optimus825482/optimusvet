import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)

cur = conn.cursor()

print("=== TURKAY DEMIRHAN İSİMLİ MÜŞTERİLER ===\n")

# Turkay veya Demirhan içeren tüm müşteriler
cur.execute("""
    SELECT id, name, code, balance
    FROM customers
    WHERE LOWER(name) LIKE '%turkay%' OR LOWER(name) LIKE '%demirhan%'
    ORDER BY code
""")

customers = cur.fetchall()

print(f"Toplam {len(customers)} müşteri bulundu:\n")

for customer_id, name, code, balance in customers:
    # Bu müşterinin satış ve tahsilat sayısı
    cur.execute("""
        SELECT COUNT(*), SUM(total)
        FROM transactions
        WHERE "customerId" = %s AND type = 'SALE'
    """, (customer_id,))
    
    sales_count, sales_total = cur.fetchone()
    
    cur.execute("""
        SELECT COUNT(*), SUM(total)
        FROM transactions
        WHERE "customerId" = %s AND type = 'CUSTOMER_PAYMENT'
    """, (customer_id,))
    
    payments_count, payments_total = cur.fetchone()
    
    print(f"Kod: {code}")
    print(f"İsim: {name}")
    print(f"Bakiye: {float(balance):,.2f} TL")
    print(f"Satışlar: {sales_count} adet - {float(sales_total or 0):,.2f} TL")
    print(f"Tahsilatlar: {payments_count} adet - {float(payments_total or 0):,.2f} TL")
    print("-" * 60)

cur.close()
conn.close()
