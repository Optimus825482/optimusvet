"""
TÜM MÜŞTERİLER İÇİN MDB VS POSTGRESQL DOĞRULAMA
"""
import psycopg2
import pyodbc
import pandas as pd

# PostgreSQL
pg_conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)
pg_cur = pg_conn.cursor()

# MDB
mdb_conn = pyodbc.connect(r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=D:\VTCLN\pm.mdb;')

print("=" * 80)
print("TÜM MÜŞTERİLER İÇİN DOĞRULAMA")
print("=" * 80)

# MDB'den müşteri mapping
mdb_customers_df = pd.read_sql("SELECT musid, ad FROM musteri", mdb_conn)
pg_cur.execute("SELECT id, name, code FROM customers")
pg_customers = {name.lower().strip(): (id, code) for id, name, code in pg_cur.fetchall()}

customer_mapping = {}
for _, row in mdb_customers_df.iterrows():
    mdb_id = row['musid']
    mdb_name = row['ad'].lower().strip() if row['ad'] else ''
    if mdb_name in pg_customers:
        pg_id, pg_code = pg_customers[mdb_name]
        customer_mapping[mdb_id] = (pg_id, pg_code, row['ad'])

print(f"\nEşleşen Müşteri: {len(customer_mapping)}\n")

# Doğrulama
mismatches = []
perfect_matches = 0
total_checked = 0

print("Doğrulama yapılıyor...")

for mdb_id, (pg_id, pg_code, name) in customer_mapping.items():
    total_checked += 1
    
    # MDB'den satış ve tahsilat
    mdb_sales_df = pd.read_sql(f"SELECT COUNT(*) as cnt, SUM(tutar) as total FROM satis WHERE musid = {mdb_id}", mdb_conn)
    mdb_sales_count = mdb_sales_df['cnt'][0]
    mdb_sales_total = float(mdb_sales_df['total'][0] or 0)
    
    mdb_payments_df = pd.read_sql(f"SELECT COUNT(*) as cnt, SUM(odemetutar) as total FROM musteritahsilat WHERE musid = {mdb_id}", mdb_conn)
    mdb_payments_count = mdb_payments_df['cnt'][0]
    mdb_payments_total = float(mdb_payments_df['total'][0] or 0)
    
    mdb_balance = mdb_sales_total - mdb_payments_total
    
    # PostgreSQL'den satış ve tahsilat
    pg_cur.execute("""
        SELECT COUNT(*), COALESCE(SUM(total), 0)
        FROM transactions
        WHERE "customerId" = %s AND type = 'SALE'
    """, (pg_id,))
    pg_sales_count, pg_sales_total = pg_cur.fetchone()
    pg_sales_total = float(pg_sales_total)
    
    pg_cur.execute("""
        SELECT COUNT(*), COALESCE(SUM(total), 0)
        FROM transactions
        WHERE "customerId" = %s AND type = 'CUSTOMER_PAYMENT'
    """, (pg_id,))
    pg_payments_count, pg_payments_total = pg_cur.fetchone()
    pg_payments_total = float(pg_payments_total)
    
    pg_cur.execute("SELECT balance FROM customers WHERE id = %s", (pg_id,))
    pg_balance = float(pg_cur.fetchone()[0])
    
    # Karşılaştır
    sales_match = abs(mdb_sales_total - pg_sales_total) < 0.01
    payments_match = abs(mdb_payments_total - pg_payments_total) < 0.01
    balance_match = abs(mdb_balance - pg_balance) < 0.01
    
    if sales_match and payments_match and balance_match:
        perfect_matches += 1
    else:
        mismatches.append({
            'code': pg_code,
            'name': name,
            'mdb_sales': mdb_sales_total,
            'pg_sales': pg_sales_total,
            'mdb_payments': mdb_payments_total,
            'pg_payments': pg_payments_total,
            'mdb_balance': mdb_balance,
            'pg_balance': pg_balance
        })
    
    if total_checked % 100 == 0:
        print(f"  → {total_checked} müşteri kontrol edildi...")

print(f"\n✓ {total_checked} müşteri kontrol edildi")

print("\n" + "=" * 80)
print("SONUÇLAR")
print("=" * 80)

print(f"\n✅ Tam Eşleşen: {perfect_matches} müşteri ({perfect_matches/total_checked*100:.1f}%)")
print(f"⚠️  Uyuşmayan: {len(mismatches)} müşteri ({len(mismatches)/total_checked*100:.1f}%)")

if mismatches:
    print("\n" + "=" * 80)
    print("UYUŞMAYAN MÜŞTERİLER (İlk 20)")
    print("=" * 80)
    
    for i, m in enumerate(mismatches[:20], 1):
        print(f"\n{i}. {m['code']} - {m['name']}")
        
        if abs(m['mdb_sales'] - m['pg_sales']) > 0.01:
            print(f"   Satış: MDB={m['mdb_sales']:,.2f} TL, PG={m['pg_sales']:,.2f} TL, Fark={m['mdb_sales']-m['pg_sales']:,.2f} TL")
        
        if abs(m['mdb_payments'] - m['pg_payments']) > 0.01:
            print(f"   Tahsilat: MDB={m['mdb_payments']:,.2f} TL, PG={m['pg_payments']:,.2f} TL, Fark={m['mdb_payments']-m['pg_payments']:,.2f} TL")
        
        if abs(m['mdb_balance'] - m['pg_balance']) > 0.01:
            print(f"   Bakiye: MDB={m['mdb_balance']:,.2f} TL, PG={m['pg_balance']:,.2f} TL, Fark={m['mdb_balance']-m['pg_balance']:,.2f} TL")
    
    if len(mismatches) > 20:
        print(f"\n... ve {len(mismatches) - 20} müşteri daha")

print("\n" + "=" * 80)

if len(mismatches) == 0:
    print("🎉 TÜM MÜŞTERİLER DOĞRU! SİSTEM %100 UYUMLU!")
else:
    print(f"⚠️  {len(mismatches)} müşteride uyumsuzluk var. Detaylı inceleme gerekli.")

print("=" * 80)

pg_cur.close()
pg_conn.close()
mdb_conn.close()
