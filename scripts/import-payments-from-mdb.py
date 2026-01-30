import pyodbc
import pandas as pd
import psycopg2
from datetime import datetime

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

def import_payments_from_mdb():
    try:
        print("=== TAHSİLATLAR MDB'DEN POSTGRESQL'E AKTARIM ===\n")
        
        # MDB'den veri oku
        print("1️⃣ MDB dosyası okunuyor...")
        mdb_conn = pyodbc.connect(mdb_conn_str)
        
        payments_df = pd.read_sql("SELECT * FROM musteritahsilat", mdb_conn)
        
        print(f"   ✓ {len(payments_df)} tahsilat\n")
        print(f"   Kolonlar: {list(payments_df.columns)}\n")
        
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
        
        # User ID
        pg_cursor.execute("SELECT id FROM users LIMIT 1")
        user_id = pg_cursor.fetchone()[0]
        
        print(f"   ✓ {len(customer_map)} müşteri eşleşmesi\n")
        
        # Tahsilatları yükle
        print("3️⃣ Tahsilatlar yükleniyor...\n")
        
        imported = 0
        skipped = 0
        errors = []
        
        for i in range(0, len(payments_df), BATCH_SIZE):
            batch = payments_df.iloc[i:i+BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            total_batches = (len(payments_df) + BATCH_SIZE - 1) // BATCH_SIZE
            
            pg_cursor.execute("BEGIN")
            
            try:
                for _, payment in batch.iterrows():
                    payment_id = int(payment['tahsilatid'])
                    customer_id_key = int(payment['musid'])
                    
                    # Müşteri kontrolü
                    if customer_id_key not in customer_map:
                        skipped += 1
                        errors.append(f"Tahsilat {payment_id}: Müşteri {customer_id_key} bulunamadı")
                        continue
                    
                    customer_id = customer_map[customer_id_key]
                    
                    # Tutar kontrolü
                    amount = float(payment['odemetutar']) if pd.notna(payment['odemetutar']) else 0
                    if amount == 0:
                        skipped += 1
                        errors.append(f"Tahsilat {payment_id}: Tutar 0")
                        continue
                    
                    # Tarih dönüşümü
                    if pd.notna(payment['tarih']):
                        payment_date = payment['tarih']
                        if isinstance(payment_date, str):
                            payment_date = datetime.strptime(payment_date, '%Y-%m-%d')
                    else:
                        payment_date = datetime.now()
                    
                    # Kod oluştur
                    code = f"THS-{str(payment_id).zfill(5)}"
                    
                    # Transaction ekle
                    pg_cursor.execute("""
                        INSERT INTO transactions (
                            id, code, type, "customerId", "userId", date, "createdAt", "updatedAt",
                            subtotal, "vatTotal", discount, total, "paidAmount", "paymentMethod", status
                        ) VALUES (
                            gen_random_uuid(), %s, 'CUSTOMER_PAYMENT', %s, %s, %s, %s, %s,
                            %s, 0, 0, %s, %s, 'CASH', 'PAID'
                        )
                    """, (code, customer_id, user_id, payment_date, payment_date, payment_date,
                          amount, amount, amount))
                    
                    # Müşteri bakiyesini güncelle (tahsilat bakiyeyi azaltır)
                    pg_cursor.execute("""
                        UPDATE customers SET balance = balance - %s WHERE id = %s
                    """, (amount, customer_id))
                    
                    imported += 1
                
                pg_cursor.execute("COMMIT")
                
                progress = int((imported / len(payments_df)) * 100)
                print(f"✓ Batch {batch_num}/{total_batches} | {imported}/{len(payments_df)} ({progress}%)")
                
            except Exception as e:
                pg_cursor.execute("ROLLBACK")
                print(f"❌ Batch {batch_num} hatası: {e}")
                errors.append(f"Batch {batch_num}: {e}")
                skipped += len(batch)
        
        print("\n=== ÖZET ===")
        print(f"✅ {imported} tahsilat eklendi")
        print(f"⏭️  {skipped} tahsilat atlandı")
        
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
        pg_cursor.execute("SELECT COUNT(*) FROM transactions WHERE type = 'CUSTOMER_PAYMENT'")
        db_payments = pg_cursor.fetchone()[0]
        
        print(f"Database Tahsilat: {db_payments}")
        print(f"MDB Tahsilat: {len(payments_df)}")
        
        # Bakiye özeti
        pg_cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN balance > 0 THEN 1 END) as positive,
                COUNT(CASE WHEN balance < 0 THEN 1 END) as negative,
                SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END) as total_receivable,
                SUM(CASE WHEN balance < 0 THEN ABS(balance) ELSE 0 END) as total_payable
            FROM customers
        """)
        
        stats = pg_cursor.fetchone()
        print(f"\n=== MÜŞTERİ BAKİYELERİ ===")
        print(f"Alacaklı Müşteri: {stats[1]}")
        print(f"Borçlu Müşteri: {stats[2]}")
        print(f"Toplam Alacak: {float(stats[3]):,.2f} TL")
        print(f"Toplam Borç: {float(stats[4]):,.2f} TL")
        
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
    import_payments_from_mdb()
