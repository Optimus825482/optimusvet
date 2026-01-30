import psycopg2
from datetime import datetime
from decimal import Decimal

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)

cur = conn.cursor()

print("=== TURKAY DEMIRHAN TARİH ARALIĞI ANALİZİ ===\n")

# Müşteriyi bul
cur.execute("""
    SELECT id, name, code, balance
    FROM customers
    WHERE LOWER(name) LIKE %s OR LOWER(name) LIKE %s
    LIMIT 1
""", ('%turkay%', '%demirhan%'))

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

# Eski sistemdeki tarih aralığı: 7.03.2017 - 31.12.2025
old_system_start = datetime(2017, 3, 7)
old_system_end = datetime(2025, 12, 31)

print(f"Eski Sistem Tarih Aralığı: {old_system_start.strftime('%d.%m.%Y')} - {old_system_end.strftime('%d.%m.%Y')}\n")

# Bu tarih aralığındaki satışlar (transactions tablosunda type='SALE')
cur.execute("""
    SELECT code, date, total, status
    FROM transactions
    WHERE "customerId" = %s
    AND type = 'SALE'
    AND date >= %s
    AND date <= %s
    ORDER BY date ASC
""", (customer_id, old_system_start, old_system_end))

sales_in_range = cur.fetchall()
total_sales_in_range = sum(float(sale[2]) for sale in sales_in_range)

print(f"=== SATIŞLAR ({len(sales_in_range)} adet) ===")
print(f"Toplam Tutar: {total_sales_in_range:,.2f} TL\n")

# İlk 10 satış
print("İlk 10 Satış:")
for sale in sales_in_range[:10]:
    code, date, amount, status = sale
    print(f"{code} - {date.strftime('%d.%m.%Y')} - {float(amount):,.2f} TL - {status}")

# Son 10 satış
print("\nSon 10 Satış:")
for sale in sales_in_range[-10:]:
    code, date, amount, status = sale
    print(f"{code} - {date.strftime('%d.%m.%Y')} - {float(amount):,.2f} TL - {status}")

# Bu tarih aralığındaki tahsilatlar (transactions tablosunda type='PAYMENT')
cur.execute("""
    SELECT code, date, total, "paymentMethod"
    FROM transactions
    WHERE "customerId" = %s
    AND type = 'PAYMENT'
    AND date >= %s
    AND date <= %s
    ORDER BY date ASC
""", (customer_id, old_system_start, old_system_end))

payments_in_range = cur.fetchall()
total_payments_in_range = sum(float(payment[2]) for payment in payments_in_range)

print(f"\n=== TAHSİLATLAR ({len(payments_in_range)} adet) ===")
print(f"Toplam Tutar: {total_payments_in_range:,.2f} TL\n")

# Tüm tahsilatları göster
print("Tüm Tahsilatlar:")
for payment in payments_in_range:
    code, date, amount, payment_method = payment
    print(f"{code} - {date.strftime('%d.%m.%Y')} - {float(amount):,.2f} TL - {payment_method}")

# Hesaplanan bakiye
calculated_balance = total_sales_in_range - total_payments_in_range

print("\n=== HESAP ÖZETİ (Tarih Aralığı İçinde) ===")
print(f"Toplam Satış: {total_sales_in_range:,.2f} TL")
print(f"Toplam Tahsilat: {total_payments_in_range:,.2f} TL")
print(f"Hesaplanan Bakiye: {calculated_balance:,.2f} TL")

print("\n=== ESKİ SİSTEM KARŞILAŞTIRMASI ===")
print("Eski Sistem:")
print("  Toplam Borç: 68.003,00 TL")
print("  Toplam Ödeme: 58.529,00 TL")
print("  Bakiye: 9.474,00 TL")
print("\nYeni Sistem (Aynı Tarih Aralığı):")
print(f"  Toplam Satış: {total_sales_in_range:,.2f} TL")
print(f"  Toplam Tahsilat: {total_payments_in_range:,.2f} TL")
print(f"  Bakiye: {calculated_balance:,.2f} TL")

sales_diff = total_sales_in_range - 68003
payments_diff = total_payments_in_range - 58529
balance_diff = calculated_balance - 9474

print("\nFarklar:")
print(f"  Satış Farkı: {sales_diff:,.2f} TL")
print(f"  Tahsilat Farkı: {payments_diff:,.2f} TL")
print(f"  Bakiye Farkı: {balance_diff:,.2f} TL")

# Tarih aralığı dışındaki kayıtlar
cur.execute("""
    SELECT COUNT(*)
    FROM transactions
    WHERE "customerId" = %s
    AND type = 'SALE'
    AND (date < %s OR date > %s)
""", (customer_id, old_system_start, old_system_end))

sales_out_of_range = cur.fetchone()[0]

cur.execute("""
    SELECT COUNT(*)
    FROM transactions
    WHERE "customerId" = %s
    AND type = 'PAYMENT'
    AND (date < %s OR date > %s)
""", (customer_id, old_system_start, old_system_end))

payments_out_of_range = cur.fetchone()[0]

print("\n=== TARİH ARALIĞI DIŞI KAYITLAR ===")
print(f"Satış: {sales_out_of_range} adet")
print(f"Tahsilat: {payments_out_of_range} adet")

# Durum analizi
cur.execute("""
    SELECT status, COUNT(*), SUM(total)
    FROM transactions
    WHERE "customerId" = %s
    AND type = 'SALE'
    AND date >= %s
    AND date <= %s
    GROUP BY status
    ORDER BY status
""", (customer_id, old_system_start, old_system_end))

status_breakdown = cur.fetchall()

print("\n=== DURUM ANALİZİ (Tarih Aralığı İçinde) ===")
for status, count, total in status_breakdown:
    print(f"{status}: {count} adet - {float(total):,.2f} TL")

cur.close()
conn.close()
