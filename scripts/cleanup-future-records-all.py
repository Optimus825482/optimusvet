"""
TÜM MÜŞTERİLER İÇİN 26.01.2026 VE SONRASI KAYITLARI TEMİZLE
"""
import psycopg2
from datetime import datetime

pg_conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)
pg_conn.autocommit = False
pg_cur = pg_conn.cursor()

print("=" * 80)
print("TÜM MÜŞTERİLER İÇİN GELECEK TARİHLİ KAYITLARI TEMİZLEME")
print("=" * 80)

try:
    cutoff_date = datetime(2026, 1, 26)
    print(f"\nKesim Tarihi: {cutoff_date.strftime('%d.%m.%Y')}")
    print("Bu tarih ve sonrası tüm kayıtlar silinecek!\n")
    
    # Silinecek satışları bul
    pg_cur.execute("""
        SELECT COUNT(*), SUM(total)
        FROM transactions
        WHERE type = 'SALE'
        AND date >= %s
    """, (cutoff_date,))
    
    sales_count, sales_total = pg_cur.fetchone()
    sales_total = float(sales_total or 0)
    
    print(f"Silinecek Satışlar: {sales_count} adet - {sales_total:,.2f} TL")
    
    # Silinecek tahsilatları bul
    pg_cur.execute("""
        SELECT COUNT(*), SUM(total)
        FROM transactions
        WHERE type = 'CUSTOMER_PAYMENT'
        AND date >= %s
    """, (cutoff_date,))
    
    payments_count, payments_total = pg_cur.fetchone()
    payments_total = float(payments_total or 0)
    
    print(f"Silinecek Tahsilatlar: {payments_count} adet - {payments_total:,.2f} TL")
    
    # Etkilenecek müşterileri göster
    pg_cur.execute("""
        SELECT DISTINCT c.code, c.name
        FROM transactions t
        JOIN customers c ON t."customerId" = c.id
        WHERE t.date >= %s
        ORDER BY c.code
    """, (cutoff_date,))
    
    affected_customers = pg_cur.fetchall()
    
    print(f"\nEtkilenecek Müşteriler: {len(affected_customers)}")
    for code, name in affected_customers[:10]:
        print(f"  {code} - {name}")
    if len(affected_customers) > 10:
        print(f"  ... ve {len(affected_customers) - 10} müşteri daha")
    
    # Onay
    print("\n" + "=" * 80)
    response = input("Bu kayıtları silmek için 'EVET' yazın: ")
    
    if response != "EVET":
        print("\n❌ İşlem iptal edildi.")
        pg_conn.rollback()
        exit()
    
    print("\n🗑️  KAYITLAR SİLİNİYOR...")
    
    # Transaction başlat
    pg_cur.execute("BEGIN")
    
    # Silinecek transaction ID'lerini al
    pg_cur.execute("""
        SELECT id FROM transactions WHERE date >= %s
    """, (cutoff_date,))
    
    transaction_ids = [row[0] for row in pg_cur.fetchall()]
    
    print(f"Toplam {len(transaction_ids)} transaction silinecek...")
    
    # Transaction items sil
    for tx_id in transaction_ids:
        pg_cur.execute('DELETE FROM transaction_items WHERE "transactionId" = %s', (tx_id,))
    
    deleted_items = pg_cur.rowcount
    print(f"✓ {deleted_items} transaction item silindi")
    
    # Payments sil
    for tx_id in transaction_ids:
        pg_cur.execute('DELETE FROM payments WHERE "transactionId" = %s', (tx_id,))
    
    deleted_payments = pg_cur.rowcount
    print(f"✓ {deleted_payments} payment kaydı silindi")
    
    # Transactions sil
    pg_cur.execute('DELETE FROM transactions WHERE date >= %s', (cutoff_date,))
    deleted_transactions = pg_cur.rowcount
    print(f"✓ {deleted_transactions} transaction silindi")
    
    # Etkilenen müşterilerin bakiyelerini güncelle
    print("\n💰 MÜŞTERİ BAKİYELERİ GÜNCELLENİYOR...")
    
    affected_customer_ids = [cust_id for cust_id, _ in affected_customers]
    
    # Her müşteri için bakiye hesapla
    for customer_code, customer_name in affected_customers:
        pg_cur.execute("SELECT id FROM customers WHERE code = %s", (customer_code,))
        customer_id = pg_cur.fetchone()[0]
        
        # Bakiye hesapla
        pg_cur.execute("""
            WITH customer_totals AS (
                SELECT 
                    SUM(CASE WHEN type = 'SALE' THEN total ELSE 0 END) as total_sales,
                    SUM(CASE WHEN type = 'CUSTOMER_PAYMENT' THEN total ELSE 0 END) as total_payments
                FROM transactions
                WHERE "customerId" = %s
            )
            UPDATE customers
            SET balance = COALESCE((SELECT total_sales - total_payments FROM customer_totals), 0)
            WHERE id = %s
        """, (customer_id, customer_id))
        
        # FIFO ile satış durumlarını güncelle
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
        
        total_payments_amount = float(pg_cur.fetchone()[0])
        remaining_payment = total_payments_amount
        
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
    
    print(f"✓ {len(affected_customers)} müşteri güncellendi")
    
    pg_conn.commit()
    
    print("\n" + "=" * 80)
    print("✅ TEMİZLEME TAMAMLANDI!")
    print("=" * 80)
    
    # Final istatistikler
    pg_cur.execute("SELECT COUNT(*) FROM transactions WHERE type = 'SALE'")
    final_sales = pg_cur.fetchone()[0]
    
    pg_cur.execute("SELECT COUNT(*) FROM transactions WHERE type = 'CUSTOMER_PAYMENT'")
    final_payments = pg_cur.fetchone()[0]
    
    print(f"\nFinal Durum:")
    print(f"  Satışlar: {final_sales}")
    print(f"  Tahsilatlar: {final_payments}")
    
    print("\n✅ Tüm işlemler başarıyla tamamlandı!")

except Exception as e:
    print(f"\n❌ HATA: {e}")
    pg_conn.rollback()
    raise

finally:
    pg_cur.close()
    pg_conn.close()
