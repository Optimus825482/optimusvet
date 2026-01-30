import pyodbc
import pandas as pd
import psycopg2
from datetime import datetime
from decimal import Decimal

# MDB bağlantısı
mdb_file = r"D:\VTCLN\pm.mdb"
mdb_conn_str = (
    r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
    f'DBQ={mdb_file};'
)

# PostgreSQL bağlantısı
pg_conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="optimusvet",
    user="postgres",
    password="518518Erkan"
)

BATCH_SIZE = 500

def import_from_mdb():
    try:
        print("=== MDB'DEN POSTGRESQL'E AKTARIM ===\n")
        
        # MDB'den veri oku
        print("1️⃣ MDB dosyası okunuyor...")
        mdb_conn = pyodbc.connect(mdb_conn_str)
        
        satis_df = pd.read_sql("SELECT * FROM satis", mdb_conn)
        satisdetay_df = pd.read_sql("SELECT * FROM satisdetay", mdb_conn)
        
        print(f"   ✓ {len(satis_df)} satış")
        print(f"   ✓ {len(satisdetay_df)} satış detayı\n")
        
        mdb_conn.close()
        
        # PostgreSQL'den mapping'leri al
        print("2️⃣ Eşleştirmeler hazırlanıyor...")
        pg_cursor = pg_conn.cursor()
        
        # Customer mapping
        pg_cursor.execute("SELECT id, code FROM customers")
        customer_map = {}
        for row in pg_cursor.fetchall():
            code_match = row[1].split('-')
            if len(code_match) == 2:
                customer_map[int(code_match[1])] = row[0]
        
        # Product mapping
        pg_cursor.execute("SELECT id, code FROM products")
        product_map = {}
        for row in pg_cursor.fetchall():
            code_match = row[1].split('-')
            if len(code_match) == 2:
                product_map[int(code_match[1])] = row[0]
        
        # User ID
        pg_cursor.execute("SELECT id FROM users LIMIT 1")
        user_id = pg_cursor.fetchone()[0]
        
        print(f"   ✓ {len(customer_map)} müşteri eşleşmesi")
        print(f"   ✓ {len(product_map)} ürün eşleşmesi\n")
        
        # Satış detaylarını grupla
        print("3️⃣ Satış detayları gruplandırılıyor...")
        details_by_sale = {}
        for _, detail in satisdetay_df.iterrows():
            sale_id = int(detail['satisid'])
            if sale_id not in details_by_sale:
                details_by_sale[sale_id] = []
            details_by_sale[sale_id].append(detail)
        print(f"   ✓ {len(details_by_sale)} satışa detay eşleştirildi\n")
        
        # Satışları yükle
        print("4️⃣ Satışlar yükleniyor...\n")
        
        imported = 0
        skipped = 0
        items_added = 0
        errors = []
        
        for i in range(0, len(satis_df), BATCH_SIZE):
            batch = satis_df.iloc[i:i+BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            total_batches = (len(satis_df) + BATCH_SIZE - 1) // BATCH_SIZE
            
            pg_cursor.execute("BEGIN")
            
            try:
                for _, sale in batch.iterrows():
                    sale_id = int(sale['satisid'])
                    customer_id_key = int(sale['musid'])
                    
                    # Müşteri kontrolü
                    if customer_id_key not in customer_map:
                        skipped += 1
                        errors.append(f"Satış {sale_id}: Müşteri {customer_id_key} bulunamadı")
                        continue
                    
                    customer_id = customer_map[customer_id_key]
                    
                    # Detayları al
                    details = details_by_sale.get(sale_id, [])
                    
                    # Tutar kontrolü
                    sale_total = float(sale['tutar']) if pd.notna(sale['tutar']) else 0
                    if sale_total == 0 and len(details) == 0:
                        skipped += 1
                        errors.append(f"Satış {sale_id}: Tutar ve detay yok")
                        continue
                    
                    # Tarih dönüşümü
                    if pd.notna(sale['tarih']):
                        sale_date = sale['tarih']
                        if isinstance(sale_date, str):
                            sale_date = datetime.strptime(sale_date, '%Y-%m-%d')
                    else:
                        sale_date = datetime.now()
                    
                    # Kod oluştur
                    code = f"SAT-{str(sale_id).zfill(5)}"
                    
                    # Toplamları hesapla
                    subtotal = 0
                    vat_total = 0
                    
                    if len(details) > 0:
                        for detail in details:
                            unit_price = float(detail['satisfiyat']) if pd.notna(detail['satisfiyat']) else 0
                            quantity = float(detail['adet']) if pd.notna(detail['adet']) else 1
                            vat_rate = float(detail['kdv']) if pd.notna(detail['kdv']) else 0
                            
                            item_subtotal = unit_price * quantity
                            item_vat = (item_subtotal * vat_rate) / 100
                            
                            subtotal += item_subtotal
                            vat_total += item_vat
                    else:
                        subtotal = sale_total
                        vat_total = 0
                    
                    total = sale_total if sale_total > 0 else subtotal + vat_total
                    
                    # Transaction ekle
                    pg_cursor.execute("""
                        INSERT INTO transactions (
                            id, code, type, "customerId", "userId", date, "createdAt", "updatedAt",
                            subtotal, "vatTotal", discount, total, "paidAmount", "paymentMethod", status
                        ) VALUES (
                            gen_random_uuid(), %s, 'SALE', %s, %s, %s, %s, %s,
                            %s, %s, 0, %s, 0, 'CASH', 'PENDING'
                        ) RETURNING id
                    """, (code, customer_id, user_id, sale_date, sale_date, sale_date,
                          subtotal, vat_total, total))
                    
                    transaction_id = pg_cursor.fetchone()[0]
                    
                    # Transaction items ekle
                    for detail in details:
                        product_id_key = int(detail['urunid'])
                        if product_id_key not in product_map:
                            errors.append(f"Satış {sale_id}: Ürün {product_id_key} bulunamadı")
                            continue
                        
                        product_id = product_map[product_id_key]
                        quantity = float(detail['adet']) if pd.notna(detail['adet']) else 1
                        unit_price = float(detail['satisfiyat']) if pd.notna(detail['satisfiyat']) else 0
                        vat_rate = float(detail['kdv']) if pd.notna(detail['kdv']) else 0
                        item_total = float(detail['satistutar']) if pd.notna(detail['satistutar']) else unit_price * quantity
                        
                        pg_cursor.execute("""
                            INSERT INTO transaction_items (
                                id, "transactionId", "productId", quantity, "unitPrice", "vatRate", discount, total
                            ) VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, 0, %s)
                        """, (transaction_id, product_id, quantity, unit_price, vat_rate, item_total))
                        
                        items_added += 1
                    
                    # Müşteri bakiyesini güncelle
                    pg_cursor.execute("""
                        UPDATE customers SET balance = balance + %s WHERE id = %s
                    """, (total, customer_id))
                    
                    imported += 1
                
                pg_cursor.execute("COMMIT")
                
                progress = int((imported / len(satis_df)) * 100)
                print(f"✓ Batch {batch_num}/{total_batches} | {imported}/{len(satis_df)} ({progress}%) | Items: {items_added}")
                
            except Exception as e:
                pg_cursor.execute("ROLLBACK")
                print(f"❌ Batch {batch_num} hatası: {e}")
                errors.append(f"Batch {batch_num}: {e}")
                skipped += len(batch)
        
        print("\n=== ÖZET ===")
        print(f"✅ {imported} satış eklendi")
        print(f"✅ {items_added} satış kalemi eklendi")
        print(f"⏭️  {skipped} satış atlandı")
        
        if len(errors) > 0 and len(errors) <= 10:
            print(f"\n⚠️  Hatalar ({len(errors)}):")
            for err in errors:
                print(f"   {err}")
        elif len(errors) > 10:
            print(f"\n⚠️  {len(errors)} hata oluştu (ilk 10):")
            for err in errors[:10]:
                print(f"   {err}")
        
        # Doğrulama
        print("\n=== DOĞRULAMA ===")
        pg_cursor.execute("SELECT COUNT(*) FROM transactions WHERE type = 'SALE'")
        db_sales = pg_cursor.fetchone()[0]
        
        pg_cursor.execute("SELECT COUNT(*) FROM transaction_items")
        db_items = pg_cursor.fetchone()[0]
        
        print(f"Database Satış: {db_sales}")
        print(f"Database Satış Kalemi: {db_items}")
        print(f"MDB Satış: {len(satis_df)}")
        print(f"MDB Satış Detayı: {len(satisdetay_df)}")
        
        pg_cursor.close()
        pg_conn.close()
        
        print("\n✅ İşlem tamamlandı!")
        
    except Exception as e:
        print(f"\n❌ HATA: {e}")
        import traceback
        traceback.print_exc()
        pg_conn.rollback()
        pg_conn.close()

if __name__ == "__main__":
    import_from_mdb()
