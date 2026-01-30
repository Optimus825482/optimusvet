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

print("=== TURKAY DEMIRHAN DETAYLI KARŞILAŞTIRMA ===\n")

# PostgreSQL'deki Turkay DEMIRHAN (MUS-063)
pg_cur.execute("SELECT id FROM customers WHERE code = 'MUS-063'")
pg_customer_id = pg_cur.fetchone()[0]

# PostgreSQL'deki satışlar
pg_cur.execute("""
    SELECT code, date, total
    FROM transactions
    WHERE "customerId" = %s AND type = 'SALE'
    ORDER BY date, code
""", (pg_customer_id,))

pg_sales = pg_cur.fetchall()

print(f"PostgreSQL'de {len(pg_sales)} satış var\n")

# MDB'deki Turkay DEMIRHAN (musid=64)
mdb_sales_df = pd.read_sql("SELECT satisid, tarih, tutar FROM satis WHERE musid = 64 ORDER BY tarih, satisid", mdb_conn)

print(f"MDB'de {len(mdb_sales_df)} satış var\n")

# Toplam tutarları karşılaştır
pg_total = sum(float(s[2]) for s in pg_sales)
mdb_total = mdb_sales_df['tutar'].sum()

print(f"PostgreSQL Toplam: {pg_total:,.2f} TL")
print(f"MDB Toplam: {mdb_total:,.2f} TL")
print(f"Fark: {pg_total - mdb_total:,.2f} TL\n")

# Eğer fark varsa, fazladan satışları bul
if len(pg_sales) > len(mdb_sales_df):
    print(f"⚠️ PostgreSQL'de {len(pg_sales) - len(mdb_sales_df)} FAZLA SATIŞ VAR!\n")
    
    # MDB'deki satış ID'lerini al
    mdb_ids = set(f"SAT-{int(sid):05d}" for sid in mdb_sales_df['satisid'])
    
    # PostgreSQL'de olup MDB'de olmayan satışlar
    extra_sales = [s for s in pg_sales if s[0] not in mdb_ids]
    
    print("FAZLADAN SATIŞLAR:")
    for code, date, total in extra_sales:
        print(f"  {code} - {date.strftime('%d.%m.%Y')} - {float(total):,.2f} TL")

# Tahsilatları kontrol et
print("\n" + "="*60)
print("TAHSİLATLAR")
print("="*60 + "\n")

pg_cur.execute("""
    SELECT code, date, total
    FROM transactions
    WHERE "customerId" = %s AND type = 'CUSTOMER_PAYMENT'
    ORDER BY date, code
""", (pg_customer_id,))

pg_payments = pg_cur.fetchall()

mdb_payments_df = pd.read_sql("SELECT tahsilatid, tarih, odemetutar FROM musteritahsilat WHERE musid = 64 ORDER BY tarih, tahsilatid", mdb_conn)

print(f"PostgreSQL'de {len(pg_payments)} tahsilat var")
print(f"MDB'de {len(mdb_payments_df)} tahsilat var\n")

pg_payment_total = sum(float(p[2]) for p in pg_payments)
mdb_payment_total = mdb_payments_df['odemetutar'].sum()

print(f"PostgreSQL Toplam: {pg_payment_total:,.2f} TL")
print(f"MDB Toplam: {mdb_payment_total:,.2f} TL")
print(f"Fark: {pg_payment_total - mdb_payment_total:,.2f} TL\n")

# Eğer fark varsa, fazladan tahsilatları bul
if pg_payment_total != mdb_payment_total:
    print("⚠️ TAHSİLAT TUTARLARI FARKLI!\n")
    
    # Her tahsilatı karşılaştır
    print("PostgreSQL Tahsilatlar:")
    for code, date, total in pg_payments[:10]:
        print(f"  {code} - {date.strftime('%d.%m.%Y')} - {float(total):,.2f} TL")
    
    print("\nMDB Tahsilatlar:")
    for _, row in mdb_payments_df.head(10).iterrows():
        print(f"  THS-{int(row['tahsilatid']):05d} - {row['tarih'].strftime('%d.%m.%Y')} - {row['odemetutar']:,.2f} TL")

pg_cur.close()
pg_conn.close()
mdb_conn.close()
