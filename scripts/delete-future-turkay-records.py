"""
26.01.2026 tarihli Turkay DEMIRHAN kayıtlarını sil
"""
import psycopg2

pg_conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)
pg_conn.autocommit = False
pg_cur = pg_conn.cursor()

print("=== 26.01.2026 TARİHLİ KAYITLARI SİLME ===\n")

try:
    # Turkay DEMIRHAN müşterisini bul
    pg_cur.execute("SELECT id, name FROM customers WHERE code = 'MUS-063'")
    customer = pg_cur.fetchone()
    
    if not customer:
        print("❌ Müşteri bulunamadı!")
        exit()
    
    customer_id, customer_name = customer
    print(f"Müşteri: {customer_name} ({customer_id})\n")
    
    # 26.01.2026 tarihli satışları bul
    pg_cur.execute("""
        SELECT id, code, date, total
        FROM transactions
        WHERE "customerId" = %s 
        AND type = 'SALE'
        AND date >= '2026-01-26'
        AND date < '2026-01-27'
    """, (customer_id,))
    
    sales_to_delete = pg_cur.fetchall()
    
    print(f"Silinecek Satışlar: {len(sales_to_delete)}")
    for sale_id, code, date, total in sales_to_delete:
        print(f"  {code} - {date.strftime('%d.%m.%Y')} - {float(total):,.2f} TL")
    
    # 26.01.2026 tarihli tahsilatları bul
    pg_cur.execute("""
        SELECT id, code, date, total
        FROM transactions
        WHERE "customerId" = %s 
        AND type = 'CUSTOMER_PAYMENT'
        AND date >= '2026-01-26'
        AND date < '2026-01-27'
    """, (customer_id,))
    
    payments_to_delete = pg_cur.fetchall()
    
    print(f"\nSilinecek Tahsilatlar: {len(payments_to_delete)}")
    for payment_id, code, date, total in payments_to_delete:
        print(f"  {code} - {date.strftime('%d.%m.%Y')} - {float(total):,.2f} TL")
    
    # Onay
    print("\n" + "="*60)
    response = input("Bu kayıtları silmek için 'EVET' yazın: ")
    
    if response != "EVET":
        print("\n❌ İşlem iptal edildi.")
        pg_conn.rollback()
        exit()
    
    # Transaction başlat
    pg_cur.execute("BEGIN")
    
    # Satışları sil
    for sale_id, code, _, _ in sales_to_delete:
        # Önce transaction_items'ı sil
        pg_cur.execute('DELETE FROM transaction_items WHERE "transactionId" = %s', (sale_id,))
        # Sonra transaction'ı sil
        pg_cur.execute('DELETE FROM transactions WHERE id = %s', (sale_id,))
        print(f"✓ {code} silindi")
    
    # Tahsilatları sil
    for payment_id, code, _, _ in payments_to_delete:
        # Önce payments'ı sil
        pg_cur.execute('DELETE FROM payments WHERE "transactionId" = %s', (payment_id,))
        # Sonra transaction'ı sil
        pg_cur.execute('DELETE FROM transactions WHERE id = %s', (payment_id,))
        print(f"✓ {code} silindi")
    
    # Müşteri bakiyesini güncelle
    pg_cur.execute("""
        WITH customer_totals AS (
            SELECT 
                SUM(CASE WHEN type = 'SALE' THEN total ELSE 0 END) as total_sales,
                SUM(CASE WHEN type = 'CUSTOMER_PAYMENT' THEN total ELSE 0 END) as total_payments
            FROM transactions
            WHERE "customerId" = %s
        )
        UPDATE customers
        SET balance = (SELECT total_sales - total_payments FROM customer_totals)
        WHERE id = %s
        RETURNING balance
    """, (customer_id, customer_id))
    
    new_balance = pg_cur.fetchone()[0]
    
    # Satış durumlarını güncelle (FIFO)
    pg_cur.execute("""
        SELECT id, total
        FROM transactions
        WHERE "customerId" = %s AND type = 'SALE'
        ORDER BY date, code
    """, (customer_id,))
    
    sales = pg_cur.fetchall()
    
    pg_cur.execute("""
        SELECT COALESCE(SUM(total), 0)
        FROM transactions
        WHERE "customerId" = %s AND type = 'CUSTOMER_PAYMENT'
    """, (customer_id,))
    
    total_payments = float(pg_cur.fetchone()[0])
    remaining_payment = total_payments
    
    for sale_id, sale_total in sales:
        sale_total = float(sale_total)
        
        if remaining_payment >= sale_total:
            pg_cur.execute("""
                UPDATE transactions
                SET "paidAmount" = %s, status = 'PAID'
                WHERE id = %s
            """, (sale_total, sale_id))
            remaining_payment -= sale_total
        elif remaining_payment > 0:
            pg_cur.execute("""
                UPDATE transactions
                SET "paidAmount" = %s, status = 'PARTIAL'
                WHERE id = %s
            """, (remaining_payment, sale_id))
            remaining_payment = 0
        else:
            pg_cur.execute("""
                UPDATE transactions
                SET "paidAmount" = 0, status = 'PENDING'
                WHERE id = %s
            """, (sale_id,))
    
    pg_conn.commit()
    
    print("\n" + "="*60)
    print("✅ İŞLEM TAMAMLANDI!")
    print("="*60)
    print(f"\nYeni Bakiye: {float(new_balance):,.2f} TL")
    print(f"Beklenen: 9.474,00 TL")
    
    if abs(float(new_balance) - 9474) < 0.01:
        print("\n🎉 BAKİYE DOĞRU!")
    else:
        print(f"\n⚠️ Bakiye farkı: {float(new_balance) - 9474:,.2f} TL")

except Exception as e:
    print(f"\n❌ HATA: {e}")
    pg_conn.rollback()
    raise

finally:
    pg_cur.close()
    pg_conn.close()
