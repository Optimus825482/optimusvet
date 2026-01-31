"""
FINAL CLEAN IMPORT WITH SALE ITEMS
Ürünler + Satış Detayları dahil tam import
"""
import psycopg2
import pyodbc
from datetime import datetime
import uuid

def final_clean_import_with_items():
    start_time = datetime.now()
    
    pg_conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="optimusvet",
        user="postgres",
        password="518518Erkan"
    )
    pg_cur = pg_conn.cursor()
    
    mdb_conn = pyodbc.connect(r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=D:\VTCLN\pm.mdb;')
    mdb_cur = mdb_conn.cursor()
    
    print("=" * 100)
    print("FINAL CLEAN IMPORT WITH SALE ITEMS")
    print("=" * 100)
    
    # Get default user ID
    pg_cur.execute("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1")
    default_user_id = pg_cur.fetchone()[0]
    
    # Category ID - NULL olabilir
    default_category_id = None
    
    # ADIM 1: TRANSACTION ITEMS SİL
    print("\n[1/9] Transaction items siliniyor...")
    pg_cur.execute("DELETE FROM transaction_items")
    pg_conn.commit()
    print("✅ Transaction items silindi")
    
    # ADIM 2: TRANSACTION'LARI SİL
    print("\n[2/9] Transaction'lar siliniyor...")
    pg_cur.execute("DELETE FROM transactions")
    pg_conn.commit()
    print("✅ Transaction'lar silindi")
    
    # ADIM 3: STOCK MOVEMENTS SİL
    print("\n[3/10] Stock movements siliniyor...")
    pg_cur.execute("DELETE FROM stock_movements")
    pg_conn.commit()
    print("✅ Stock movements silindi")
    
    # ADIM 4: ÜRÜNLER SİL
    print("\n[4/10] Ürünler siliniyor...")
    pg_cur.execute("DELETE FROM products WHERE code LIKE 'URN-%'")
    pg_conn.commit()
    print("✅ Ürünler silindi")
    
    # ADIM 5: MÜŞTERİLERİ SİL
    print("\n[5/10] Müşteriler siliniyor...")
    pg_cur.execute("SELECT COUNT(*) FROM customers")
    customer_count = pg_cur.fetchone()[0]
    pg_cur.execute("DELETE FROM customers")
    pg_conn.commit()
    print(f"✅ {customer_count} müşteri silindi")
    
    # ADIM 6: ÜRÜNLER İMPORT ET
    print("\n[6/10] Ürünler import ediliyor...")
    mdb_cur.execute("SELECT urunid, urun, satisfiyat, kdv FROM urunler ORDER BY urunid")
    products = mdb_cur.fetchall()
    
    product_values = []
    for urunid, urun, satisfiyat, kdv in products:
        product_values.append((
            str(uuid.uuid4()),
            f"URN-{urunid:03d}",
            urun or f"Ürün {urunid}",
            float(satisfiyat or 0),
            float(kdv or 0),
            0  # stock
        ))
    
    pg_cur.executemany(
        """
        INSERT INTO products (id, code, name, "salePrice", "vatRate", stock, "isActive", "createdAt", "updatedAt")
        VALUES (%s, %s, %s, %s, %s, %s, true, NOW(), NOW())
        """,
        product_values
    )
    pg_conn.commit()
    print(f"✅ {len(products)} ürün import edildi")
    
    # ADIM 7: MÜŞTERİLERİ İMPORT ET
    print("\n[7/10] Müşteriler import ediliyor...")
    mdb_cur.execute("SELECT musid, ad FROM musteri ORDER BY musid")
    customers = mdb_cur.fetchall()
    
    customer_values = []
    for musid, ad in customers:
        customer_values.append((str(uuid.uuid4()), f"MUS-{musid:03d}", musid, ad))
    
    pg_cur.executemany(
        """
        INSERT INTO customers (id, code, "musId", name, balance, "isActive", "createdAt", "updatedAt")
        VALUES (%s, %s, %s, %s, 0, true, NOW(), NOW())
        """,
        customer_values
    )
    pg_conn.commit()
    print(f"✅ {len(customers)} müşteri import edildi")
    
    # ADIM 8: MAPPING'LERİ HAZIRLA
    print("\n[8/10] Mapping'ler hazırlanıyor...")
    
    # Customer mapping
    pg_cur.execute('SELECT id, "musId" FROM customers WHERE "musId" IS NOT NULL')
    customer_map = {musid: cust_id for cust_id, musid in pg_cur.fetchall()}
    
    # Product mapping
    pg_cur.execute("SELECT id, code FROM products WHERE code LIKE 'URN-%'")
    product_map = {}
    for prod_id, code in pg_cur.fetchall():
        urunid = int(code.split('-')[1])
        product_map[urunid] = prod_id
    
    print(f"✅ {len(customer_map)} müşteri + {len(product_map)} ürün mapping hazır")
    
    # ADIM 9: SATIŞLARI İMPORT ET
    print("\n[9/10] Satışlar import ediliyor...")
    mdb_cur.execute("SELECT satisid, musid, tarih, tutar FROM satis ORDER BY satisid")
    sales = mdb_cur.fetchall()
    
    sale_values = []
    sale_map = {}  # satisid -> transaction_id mapping
    skipped = 0
    
    for satisid, musid, tarih, tutar in sales:
        if musid in customer_map:
            trans_id = str(uuid.uuid4())
            sale_map[satisid] = trans_id
            sale_values.append((
                trans_id,
                customer_map[musid],
                default_user_id,
                f"SAT-{satisid:05d}",
                tarih,
                float(tutar or 0),
                float(tutar or 0)
            ))
        else:
            skipped += 1
    
    # Batch insert
    batch_size = 1000
    for i in range(0, len(sale_values), batch_size):
        batch = sale_values[i:i+batch_size]
        pg_cur.executemany(
            """
            INSERT INTO transactions (id, "customerId", "userId", type, code, date, subtotal, total, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, 'SALE', %s, %s, %s, %s, NOW(), NOW())
            """,
            batch
        )
        pg_conn.commit()
        print(f"   → {min(i+batch_size, len(sale_values))}/{len(sale_values)} satış import edildi...")
    
    print(f"✅ {len(sale_values)} satış import edildi, {skipped} atlandı")
    
    # ADIM 10: SATIŞ DETAYLARINI İMPORT ET
    print("\n[10/10] Satış detayları import ediliyor...")
    mdb_cur.execute("""
        SELECT satisdetayid, satisid, urunid, adet, satisfiyat, satistutar, kdv
        FROM satisdetay
        ORDER BY satisdetayid
    """)
    sale_items = mdb_cur.fetchall()
    
    item_values = []
    skipped_items = 0
    
    for satisdetayid, satisid, urunid, adet, satisfiyat, satistutar, kdv in sale_items:
        # Check if sale and product exist
        if satisid in sale_map and urunid in product_map:
            item_values.append((
                str(uuid.uuid4()),
                sale_map[satisid],
                product_map[urunid],
                float(adet or 1),
                float(satisfiyat or 0),
                float(kdv or 0),
                float(satistutar or 0)
            ))
        else:
            skipped_items += 1
    
    # Batch insert
    for i in range(0, len(item_values), batch_size):
        batch = item_values[i:i+batch_size]
        pg_cur.executemany(
            """
            INSERT INTO transaction_items (id, "transactionId", "productId", quantity, "unitPrice", "vatRate", total)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            batch
        )
        pg_conn.commit()
        print(f"   → {min(i+batch_size, len(item_values))}/{len(item_values)} detay import edildi...")
    
    print(f"✅ {len(item_values)} satış detayı import edildi, {skipped_items} atlandı")
    
    # ADIM 11: TAHSİLATLARI İMPORT ET
    print("\n[11/12] Tahsilatlar import ediliyor...")
    mdb_cur.execute("SELECT tahsilatid, musid, tarih, odemetutar FROM musteritahsilat ORDER BY tahsilatid")
    payments = mdb_cur.fetchall()
    
    payment_values = []
    skipped = 0
    for tahsilatid, musid, tarih, odemetutar in payments:
        if musid in customer_map:
            payment_values.append((
                str(uuid.uuid4()),
                customer_map[musid],
                default_user_id,
                f"THS-{tahsilatid:05d}",
                tarih,
                float(odemetutar or 0),
                float(odemetutar or 0)
            ))
        else:
            skipped += 1
    
    # Batch insert
    for i in range(0, len(payment_values), batch_size):
        batch = payment_values[i:i+batch_size]
        pg_cur.executemany(
            """
            INSERT INTO transactions (id, "customerId", "userId", type, code, date, subtotal, total, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, 'CUSTOMER_PAYMENT', %s, %s, %s, %s, NOW(), NOW())
            """,
            batch
        )
        pg_conn.commit()
        print(f"   → {min(i+batch_size, len(payment_values))}/{len(payment_values)} tahsilat import edildi...")
    
    print(f"✅ {len(payment_values)} tahsilat import edildi, {skipped} atlandı")
    
    # ADIM 12: ÖDEME DAĞITIMI (FIFO)
    print("\n[12/13] Ödemeler satışlara dağıtılıyor (FIFO)...")
    
    # Her müşteri için FIFO payment allocation
    processed_customers = 0
    for musid, customer_id in customer_map.items():
        # Müşterinin toplam tahsilatı
        pg_cur.execute("""
            SELECT COALESCE(SUM(total), 0)
            FROM transactions
            WHERE "customerId" = %s AND type = 'CUSTOMER_PAYMENT'
        """, (customer_id,))
        total_payments = float(pg_cur.fetchone()[0])
        
        if total_payments <= 0:
            continue
        
        # Müşterinin satışlarını tarihe göre sırala (en eski önce)
        pg_cur.execute("""
            SELECT id, total
            FROM transactions
            WHERE "customerId" = %s AND type = 'SALE'
            ORDER BY date ASC
        """, (customer_id,))
        sales = pg_cur.fetchall()
        
        remaining_payment = total_payments
        
        for sale_id, sale_total in sales:
            sale_total = float(sale_total)
            
            if remaining_payment >= sale_total:
                # Tam ödendi
                pg_cur.execute("""
                    UPDATE transactions
                    SET "paidAmount" = %s, status = 'PAID'
                    WHERE id = %s
                """, (sale_total, sale_id))
                remaining_payment -= sale_total
            elif remaining_payment > 0:
                # Kısmi ödendi
                pg_cur.execute("""
                    UPDATE transactions
                    SET "paidAmount" = %s, status = 'PARTIAL'
                    WHERE id = %s
                """, (remaining_payment, sale_id))
                remaining_payment = 0
            else:
                # Ödenmedi
                pg_cur.execute("""
                    UPDATE transactions
                    SET "paidAmount" = 0, status = 'PENDING'
                    WHERE id = %s
                """, (sale_id,))
        
        processed_customers += 1
        if processed_customers % 100 == 0:
            pg_conn.commit()
            print(f"   → {processed_customers}/{len(customer_map)} müşteri işlendi...")
    
    pg_conn.commit()
    print(f"✅ {processed_customers} müşteri için ödeme dağıtımı yapıldı")
    
    # ADIM 13: BAKİYELERİ HESAPLA
    print("\n[13/13] Bakiyeler hesaplanıyor...")
    pg_cur.execute("""
        UPDATE customers c
        SET balance = COALESCE(
            (SELECT SUM(CASE WHEN type = 'SALE' THEN total ELSE -total END)
             FROM transactions t
             WHERE t."customerId" = c.id
             AND type IN ('SALE', 'CUSTOMER_PAYMENT')),
            0
        )
    """)
    pg_conn.commit()
    print("✅ Bakiyeler hesaplandı")
    
    # SONUÇLAR
    print("\n" + "=" * 100)
    print("SONUÇLAR")
    print("=" * 100)
    
    # MDB
    mdb_cur.execute("SELECT COUNT(*) FROM musteri")
    mdb_customers = mdb_cur.fetchone()[0]
    
    mdb_cur.execute("SELECT COUNT(*) FROM urunler")
    mdb_products = mdb_cur.fetchone()[0]
    
    mdb_cur.execute("SELECT COUNT(*), SUM(tutar) FROM satis")
    mdb_sales_count, mdb_sales_total = mdb_cur.fetchone()
    
    mdb_cur.execute("SELECT COUNT(*) FROM satisdetay")
    mdb_items_count = mdb_cur.fetchone()[0]
    
    mdb_cur.execute("SELECT COUNT(*), SUM(odemetutar) FROM musteritahsilat")
    mdb_payments_count, mdb_payments_total = mdb_cur.fetchone()
    
    # PG
    pg_cur.execute('SELECT COUNT(*) FROM customers WHERE "musId" IS NOT NULL')
    pg_customers = pg_cur.fetchone()[0]
    
    pg_cur.execute("SELECT COUNT(*) FROM products WHERE code LIKE 'URN-%'")
    pg_products = pg_cur.fetchone()[0]
    
    pg_cur.execute("SELECT COUNT(*), SUM(total) FROM transactions WHERE type = 'SALE'")
    pg_sales_count, pg_sales_total = pg_cur.fetchone()
    
    pg_cur.execute("SELECT COUNT(*) FROM transaction_items")
    pg_items_count = pg_cur.fetchone()[0]
    
    pg_cur.execute("SELECT COUNT(*), SUM(total) FROM transactions WHERE type = 'CUSTOMER_PAYMENT'")
    pg_payments_count, pg_payments_total = pg_cur.fetchone()
    
    print(f"\nMÜŞTERİLER:")
    print(f"  MDB: {mdb_customers}")
    print(f"  PG:  {pg_customers}")
    if mdb_customers == pg_customers:
        print(f"  ✅ %100 EŞLEŞME!")
    
    print(f"\nÜRÜNLER:")
    print(f"  MDB: {mdb_products}")
    print(f"  PG:  {pg_products}")
    if mdb_products == pg_products:
        print(f"  ✅ %100 EŞLEŞME!")
    
    print(f"\nSATIŞLAR:")
    print(f"  MDB: {mdb_sales_count} satış, {float(mdb_sales_total or 0):,.2f} TL")
    print(f"  PG:  {pg_sales_count} satış, {float(pg_sales_total or 0):,.2f} TL")
    if mdb_sales_count == pg_sales_count:
        print(f"  ✅ %100 EŞLEŞME!")
    
    print(f"\nSATIŞ DETAYLARI:")
    print(f"  MDB: {mdb_items_count} detay")
    print(f"  PG:  {pg_items_count} detay")
    if mdb_items_count == pg_items_count:
        print(f"  ✅ %100 EŞLEŞME!")
    
    print(f"\nTAHSİLATLAR:")
    print(f"  MDB: {mdb_payments_count} tahsilat, {float(mdb_payments_total or 0):,.2f} TL")
    print(f"  PG:  {pg_payments_count} tahsilat, {float(pg_payments_total or 0):,.2f} TL")
    if mdb_payments_count == pg_payments_count:
        print(f"  ✅ %100 EŞLEŞME!")
    
    elapsed = datetime.now() - start_time
    print(f"\n⏱️  Toplam süre: {elapsed.total_seconds():.1f} saniye")
    
    print("\n" + "=" * 100)
    print("✅ IMPORT TAMAMLANDI!")
    print("=" * 100)
    
    pg_cur.close()
    pg_conn.close()
    mdb_cur.close()
    mdb_conn.close()

if __name__ == "__main__":
    final_clean_import_with_items()
