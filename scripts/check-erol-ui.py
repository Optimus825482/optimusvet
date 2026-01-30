import psycopg2

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)

cur = conn.cursor()

print("=== TURKAY DEMIRHAN (MUS-063) KONTROL ===\n")

# Müşteriyi kod ile bul
cur.execute("""
    SELECT id, name, code, balance
    FROM customers
    WHERE code = 'MUS-063'
""")

customer = cur.fetchone()

if not customer:
    print("❌ Müşteri bulunamadı!")
    cur.close()
    conn.close()
    exit()

customer_id, customer_name, customer_code, customer_balance = customer

print(f"Müşteri: {customer_name}")
print(f"Kod: {customer_code}")
print(f"Güncel Bakiye: {float(customer_balance):,.2f} TL\n")

# Tüm satışlar
cur.execute("""
    SELECT COUNT(*), SUM(total)
    FROM transactions
    WHERE "customerId" = %s
    AND type = 'SALE'
""", (customer_id,))

sales_count, sales_total = cur.fetchone()

print(f"=== SATIŞLAR ===")
print(f"Toplam: {sales_count} adet")
print(f"Tutar: {float(sales_total or 0):,.2f} TL\n")

# Tüm tahsilatlar (CUSTOMER_PAYMENT type'ı)
cur.execute("""
    SELECT COUNT(*), SUM(total)
    FROM transactions
    WHERE "customerId" = %s
    AND type = 'CUSTOMER_PAYMENT'
""", (customer_id,))

payments_count, payments_total = cur.fetchone()

print(f"=== TAHSİLATLAR ===")
print(f"Toplam: {payments_count} adet")
print(f"Tutar: {float(payments_total or 0):,.2f} TL\n")

# Hesaplanan bakiye
calculated_balance = float(sales_total or 0) - float(payments_total or 0)

print(f"=== HESAP ÖZETİ ===")
print(f"Satış Toplamı: {float(sales_total or 0):,.2f} TL")
print(f"Tahsilat Toplamı: {float(payments_total or 0):,.2f} TL")
print(f"Hesaplanan Bakiye: {calculated_balance:,.2f} TL")
print(f"Database Bakiye: {float(customer_balance):,.2f} TL")

if abs(calculated_balance - float(customer_balance)) < 0.01:
    print("✅ Bakiye doğru!")
else:
    print(f"⚠️ Bakiye farkı: {abs(calculated_balance - float(customer_balance)):,.2f} TL")

print("\n=== ESKİ SİSTEM KARŞILAŞTIRMASI ===")
print("Eski Sistem:")
print("  Toplam Borç: 68.003,00 TL (94 satış)")
print("  Toplam Ödeme: 58.529,00 TL (40 tahsilat)")
print("  Bakiye: 9.474,00 TL")
print("\nYeni Sistem:")
print(f"  Toplam Satış: {float(sales_total or 0):,.2f} TL ({sales_count} satış)")
print(f"  Toplam Tahsilat: {float(payments_total or 0):,.2f} TL ({payments_count} tahsilat)")
print(f"  Bakiye: {calculated_balance:,.2f} TL")

sales_diff = float(sales_total or 0) - 68003
payments_diff = float(payments_total or 0) - 58529
balance_diff = calculated_balance - 9474

print("\nFarklar:")
print(f"  Satış Farkı: {sales_diff:,.2f} TL")
print(f"  Tahsilat Farkı: {payments_diff:,.2f} TL")
print(f"  Bakiye Farkı: {balance_diff:,.2f} TL")

# Durum dağılımı
cur.execute("""
    SELECT status, COUNT(*), SUM(total)
    FROM transactions
    WHERE "customerId" = %s
    AND type = 'SALE'
    GROUP BY status
    ORDER BY status
""", (customer_id,))

status_breakdown = cur.fetchall()

print("\n=== DURUM DAĞILIMI ===")
for status, count, total in status_breakdown:
    print(f"{status}: {count} adet - {float(total):,.2f} TL")

print("\n=== SONUÇ ===")
if abs(balance_diff) < 100:
    print("✅ Veriler eski sistemle uyumlu!")
else:
    print("⚠️ Yeni sistemde daha fazla kayıt var!")
    print(f"   Eski sistem: 94 satış, 40 tahsilat")
    print(f"   Yeni sistem: {sales_count} satış, {payments_count} tahsilat")
    print(f"   Fark: {sales_count - 94} satış, {payments_count - 40} tahsilat")

cur.close()
conn.close()
