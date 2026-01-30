"""
GÜVENLI VERİTABANI TEMİZLEME VE MDB IMPORT
- Sadece transactions ve payments tablolarını temizler
- Müşteriler, ürünler, ayarlar korunur
- MDB'den temiz import yapar
"""

import psycopg2
import pyodbc
import pandas as pd
from datetime import datetime
from decimal import Decimal

print("=" * 80)
print("VERİTABANI TEMİZLEME VE MDB IMPORT")
print("=" * 80)

# PostgreSQL bağlantısı
pg_conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)
pg_conn.autocommit = False
pg_cur = pg_conn.cursor()

# MDB bağlantısı
mdb_path = r"D:\VTCLN\pm.mdb"
mdb_conn_str = r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=" + mdb_path
mdb_conn = pyodbc.connect(mdb_conn_str)

try:
    print("\n📊 MEVCUT VERİ DURUMU")
    print("-" * 80)
    
    # Mevcut kayıt sayıları
    pg_cur.execute("SELECT COUNT(*) FROM transactions WHERE type = 'SALE'")
    current_sales = pg_cur.fetchone()[0]
    
    pg_cur.execute("SELECT COUNT(*) FROM transactions WHERE type = 'CUSTOMER_PAYMENT'")
    current_payments = pg_cur.fetchone()[0]
    
    pg_cur.execute("SELECT COUNT(*) FROM transaction_items")
    current_items = pg_cur.fetchone()[0]
    
    print(f"Mevcut Satışlar: {current_sales}")
    print(f"Mevcut Tahsilatlar: {current_payments}")
    print(f"Mevcut Satış Detayları: {current_items}")
    
    # MDB'deki kayıt sayıları
    satis_df = pd.read_sql("SELECT COUNT(*) as cnt FROM satis", mdb_conn)
    tahsilat_df = pd.read_sql("SELECT COUNT(*) as cnt FROM musteritahsilat", mdb_conn)
    satisdetay_df = pd.read_sql("SELECT COUNT(*) as cnt FROM satisdetay", mdb_conn)
    
    print(f"\nMDB'deki Satışlar: {satis_df['cnt'][0]}")
    print(f"MDB'deki Tahsilatlar: {tahsilat_df['cnt'][0]}")
    print(f"MDB'deki Satış Detayları: {satisdetay_df['cnt'][0]}")
    
    # Kullanıcı onayı
    print("\n" + "=" * 80)
    print("⚠️  UYARI: Tüm satış ve tahsilat kayıtları silinecek!")
    print("=" * 80)
    response = input("\nDevam etmek için 'EVET' yazın: ")
    
    if response != "EVET":
        print("\n❌ İşlem iptal edildi.")
        pg_conn.rollback()
        pg_cur.close()
        pg_conn.close()
        mdb_conn.close()
        exit()
    
    print("\n🗑️  VERİTABANI TEMİZLENİYOR...")
    print("-" * 80)
    
    # Transaction başlat
    pg_cur.execute("BEGIN")
    
    # 1. Transaction items sil
    print("1. Transaction items siliniyor...")
    pg_cur.execute("DELETE FROM transaction_items")
    deleted_items = pg_cur.rowcount
    print(f"   ✓ {deleted_items} kayıt silindi")
    
    # 2. Payments sil
    print("2. Payments siliniyor...")
    pg_cur.execute("DELETE FROM payments")
    deleted_payments_records = pg_cur.rowcount
    print(f"   ✓ {deleted_payments_records} kayıt silindi")
    
    # 3. Transactions sil
    print("3. Transactions siliniyor...")
    pg_cur.execute("DELETE FROM transactions")
    deleted_transactions = pg_cur.rowcount
    print(f"   ✓ {deleted_transactions} kayıt silindi")
    
    # 4. Müşteri bakiyelerini sıfırla
    print("4. Müşteri bakiyeleri sıfırlanıyor...")
    pg_cur.execute("UPDATE customers SET balance = 0")
    updated_customers = pg_cur.rowcount
    print(f"   ✓ {updated_customers} müşteri güncellendi")
    
    # Commit temizleme
    pg_conn.commit()
    print("\n✅ Temizleme tamamlandı!")
    
    print("\n📥 MDB'DEN IMPORT BAŞLIYOR...")
    print("-" * 80)
    
    # Müşteri mapping oluştur (MDB ID -> PostgreSQL ID)
    print("\n1. Müşteri mapping oluşturuluyor...")
    pg_cur.execute("SELECT id, name FROM customers")
    pg_customers = {name.lower().strip(): id for id, name in pg_cur.fetchall()}
    
    mdb_customers_df = pd.read_sql("SELECT musid, ad FROM musteri", mdb_conn)
    customer_mapping = {}
    
    for _, row in mdb_customers_df.iterrows():
        mdb_id = row['musid']
        mdb_name = row['ad'].lower().strip() if row['ad'] else ''
        
        if mdb_name in pg_customers:
            customer_mapping[mdb_id] = pg_customers[mdb_name]
    
    print(f"   ✓ {len(customer_mapping)} müşteri eşleştirildi")
    
    print("\n2. Satışlar import ediliyor...")
    
    # Default user ID al
    pg_cur.execute("SELECT id FROM users LIMIT 1")
    default_user_id = pg_cur.fetchone()
    if not default_user_id:
        print("   ❌ Sistemde kullanıcı bulunamadı!")
        raise Exception("En az bir kullanıcı olmalı")
    default_user_id = default_user_id[0]
    print(f"   → Default user ID: {default_user_id}")
    
    # Default product ID al veya oluştur
    pg_cur.execute("SELECT id FROM products WHERE name = 'Genel Ürün' LIMIT 1")
    default_product = pg_cur.fetchone()
    
    if not default_product:
        # Dummy ürün oluştur
        pg_cur.execute("""
            INSERT INTO products (id, code, name, "purchasePrice", "salePrice", stock, "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), 'GENEL-001', 'Genel Ürün', 0, 0, 0, NOW(), NOW())
            RETURNING id
        """)
        default_product_id = pg_cur.fetchone()[0]
        pg_conn.commit()
        print(f"   → Dummy ürün oluşturuldu: {default_product_id}")
    else:
        default_product_id = default_product[0]
        print(f"   → Default product ID: {default_product_id}")
    
    satis_full_df = pd.read_sql("SELECT * FROM satis ORDER BY tarih, satisid", mdb_conn)
    
    imported_sales = 0
    skipped_sales = 0
    
    for _, satis in satis_full_df.iterrows():
        mdb_customer_id = satis['musid']
        
        if mdb_customer_id not in customer_mapping:
            skipped_sales += 1
            continue
        
        pg_customer_id = customer_mapping[mdb_customer_id]
        tutar = float(satis['tutar']) if satis['tutar'] else 0
        
        if tutar <= 0:
            skipped_sales += 1
            continue
        
        tarih = satis['tarih']
        if pd.isna(tarih):
            tarih = datetime.now()
        
        # Transaction oluştur
        pg_cur.execute("""
            INSERT INTO transactions (
                id, code, type, "customerId", "userId", date, 
                subtotal, "vatTotal", discount, total, "paidAmount",
                status, "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid(), %s, 'SALE', %s, %s, %s,
                %s, 0, 0, %s, 0,
                'PENDING', NOW(), NOW()
            ) RETURNING id
        """, (
            f"SAT-{satis['satisid']:05d}",
            pg_customer_id,
            default_user_id,
            tarih,
            tutar,
            tutar
        ))
        
        transaction_id = pg_cur.fetchone()[0]
        
        # Satış detaylarını ekle
        satisdetay_df = pd.read_sql(
            f"SELECT * FROM satisdetay WHERE satisid = {satis['satisid']}", 
            mdb_conn
        )
        
        for _, detay in satisdetay_df.iterrows():
            adet = detay.get('adet', 1) or 1
            satisfiyat = float(detay.get('satisfiyat', 0) or 0)
            
            if satisfiyat > 0:
                pg_cur.execute("""
                    INSERT INTO transaction_items (
                        id, "transactionId", "productId", quantity, 
                        "unitPrice", "vatRate", discount, total
                    ) VALUES (
                        gen_random_uuid(), %s, %s, %s, %s, 0, 0, %s
                    )
                """, (
                    transaction_id,
                    default_product_id,
                    adet,
                    satisfiyat,
                    adet * satisfiyat
                ))
        
        imported_sales += 1
        
        if imported_sales % 1000 == 0:
            print(f"   → {imported_sales} satış import edildi...")
            pg_conn.commit()
    
    pg_conn.commit()
    print(f"   ✓ {imported_sales} satış import edildi")
    print(f"   ⚠ {skipped_sales} satış atlandı (müşteri bulunamadı veya tutar=0)")
    
    # TAHSİLATLARI IMPORT ET
    print("\n3. Tahsilatlar import ediliyor...")
    tahsilat_full_df = pd.read_sql("SELECT * FROM musteritahsilat ORDER BY tarih, tahsilatid", mdb_conn)
    
    imported_payments = 0
    skipped_payments = 0
    
    for _, tahsilat in tahsilat_full_df.iterrows():
        mdb_customer_id = tahsilat['musid']
        
        if mdb_customer_id not in customer_mapping:
            skipped_payments += 1
            continue
        
        pg_customer_id = customer_mapping[mdb_customer_id]
        tutar = float(tahsilat['odemetutar']) if tahsilat['odemetutar'] else 0
        
        if tutar <= 0:
            skipped_payments += 1
            continue
        
        tarih = tahsilat['tarih']
        if pd.isna(tarih):
            tarih = datetime.now()
        
        # Transaction oluştur
        pg_cur.execute("""
            INSERT INTO transactions (
                id, code, type, "customerId", "userId", date,
                subtotal, "vatTotal", discount, total, "paidAmount",
                "paymentMethod", status, "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid(), %s, 'CUSTOMER_PAYMENT', %s, %s, %s,
                0, 0, 0, %s, %s,
                'CASH', 'PAID', NOW(), NOW()
            ) RETURNING id
        """, (
            f"THS-{tahsilat['tahsilatid']:05d}",
            pg_customer_id,
            default_user_id,
            tarih,
            tutar,
            tutar
        ))
        
        transaction_id = pg_cur.fetchone()[0]
        
        # Payment kaydı oluştur
        pg_cur.execute("""
            INSERT INTO payments (
                id, "transactionId", amount, method, "createdAt"
            ) VALUES (
                gen_random_uuid(), %s, %s, 'CASH', NOW()
            )
        """, (transaction_id, tutar))
        
        imported_payments += 1
        
        if imported_payments % 1000 == 0:
            print(f"   → {imported_payments} tahsilat import edildi...")
            pg_conn.commit()
    
    pg_conn.commit()
    print(f"   ✓ {imported_payments} tahsilat import edildi")
    print(f"   ⚠ {skipped_payments} tahsilat atlandı (müşteri bulunamadı veya tutar=0)")
    
    # MÜŞTERİ BAKİYELERİNİ GÜNCELLE
    print("\n4. Müşteri bakiyeleri hesaplanıyor...")
    
    pg_cur.execute("""
        WITH customer_totals AS (
            SELECT 
                "customerId",
                SUM(CASE WHEN type = 'SALE' THEN total ELSE 0 END) as total_sales,
                SUM(CASE WHEN type = 'CUSTOMER_PAYMENT' THEN total ELSE 0 END) as total_payments
            FROM transactions
            GROUP BY "customerId"
        )
        UPDATE customers c
        SET balance = COALESCE(ct.total_sales, 0) - COALESCE(ct.total_payments, 0)
        FROM customer_totals ct
        WHERE c.id = ct."customerId"
    """)
    
    updated_balances = pg_cur.rowcount
    pg_conn.commit()
    print(f"   ✓ {updated_balances} müşteri bakiyesi güncellendi")
    
    # SATIŞ DURUMLARINI GÜNCELLE (FIFO)
    print("\n5. Satış durumları güncelleniyor (FIFO)...")
    
    pg_cur.execute("""
        SELECT DISTINCT "customerId" 
        FROM transactions 
        WHERE type = 'CUSTOMER_PAYMENT'
    """)
    
    customers_with_payments = [row[0] for row in pg_cur.fetchall()]
    
    for customer_id in customers_with_payments:
        # Bu müşterinin satışlarını tarihe göre sırala
        pg_cur.execute("""
            SELECT id, total, "paidAmount"
            FROM transactions
            WHERE "customerId" = %s AND type = 'SALE'
            ORDER BY date, code
        """, (customer_id,))
        
        sales = pg_cur.fetchall()
        
        # Bu müşterinin toplam tahsilatı
        pg_cur.execute("""
            SELECT COALESCE(SUM(total), 0)
            FROM transactions
            WHERE "customerId" = %s AND type = 'CUSTOMER_PAYMENT'
        """, (customer_id,))
        
        total_payments = float(pg_cur.fetchone()[0])
        remaining_payment = total_payments
        
        # FIFO ile dağıt
        for sale_id, sale_total, paid_amount in sales:
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
    
    pg_conn.commit()
    print(f"   ✓ Satış durumları güncellendi")
    
    print("\n" + "=" * 80)
    print("✅ IMPORT TAMAMLANDI!")
    print("=" * 80)
    
    # Final istatistikler
    pg_cur.execute("SELECT COUNT(*) FROM transactions WHERE type = 'SALE'")
    final_sales = pg_cur.fetchone()[0]
    
    pg_cur.execute("SELECT COUNT(*) FROM transactions WHERE type = 'CUSTOMER_PAYMENT'")
    final_payments = pg_cur.fetchone()[0]
    
    pg_cur.execute("SELECT COUNT(*) FROM transaction_items")
    final_items = pg_cur.fetchone()[0]
    
    print(f"\nFinal Durum:")
    print(f"  Satışlar: {final_sales}")
    print(f"  Tahsilatlar: {final_payments}")
    print(f"  Satış Detayları: {final_items}")
    
    print("\n✅ Tüm işlemler başarıyla tamamlandı!")
    
except Exception as e:
    print(f"\n❌ HATA: {e}")
    print("Rollback yapılıyor...")
    pg_conn.rollback()
    raise

finally:
    pg_cur.close()
    pg_conn.close()
    mdb_conn.close()
