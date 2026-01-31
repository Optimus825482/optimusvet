#!/usr/bin/env python3
"""
Admin user oluşturma script'i
Usage: python scripts/create-admin.py
"""

import os
import sys
import bcrypt
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

def get_db_connection():
    """PostgreSQL bağlantısı oluştur"""
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL environment variable bulunamadı!")
        print("📝 .env dosyasını kontrol edin")
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"❌ Veritabanı bağlantı hatası: {e}")
        sys.exit(1)

def hash_password(password):
    """Şifreyi bcrypt ile hash'le"""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_admin_user(conn):
    """Admin user oluştur"""
    cursor = conn.cursor()
    
    # Önce user var mı kontrol et
    cursor.execute(
        "SELECT id, email FROM users WHERE email = %s",
        ('admin@optimusvet.com',)
    )
    existing_user = cursor.fetchone()
    
    if existing_user:
        print(f"⚠️  Admin user zaten mevcut: {existing_user[1]}")
        print("🔄 Şifreyi güncellemek ister misiniz? (y/n): ", end='')
        response = input().strip().lower()
        
        if response == 'y':
            # Şifreyi güncelle
            hashed_password = hash_password('admin123')
            cursor.execute(
                """
                UPDATE users 
                SET password = %s, "updatedAt" = %s
                WHERE email = %s
                """,
                (hashed_password, datetime.now(), 'admin@optimusvet.com')
            )
            conn.commit()
            print("✅ Admin şifresi güncellendi!")
        else:
            print("❌ İşlem iptal edildi")
        
        cursor.close()
        return
    
    # Yeni admin user oluştur
    print("🔐 Admin şifresi hash'leniyor...")
    hashed_password = hash_password('admin123')
    
    print("👤 Admin user oluşturuluyor...")
    cursor.execute(
        """
        INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s)
        RETURNING id, email
        """,
        (
            'Admin',
            'admin@optimusvet.com',
            hashed_password,
            'ADMIN',
            datetime.now(),
            datetime.now()
        )
    )
    
    user = cursor.fetchone()
    conn.commit()
    cursor.close()
    
    print("\n✅ Admin user başarıyla oluşturuldu!")
    print(f"📧 Email: {user[1]}")
    print(f"🔑 Password: admin123")
    print(f"🆔 User ID: {user[0]}")

def verify_user(conn):
    """User'ı doğrula"""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, name, role FROM users WHERE email = %s",
        ('admin@optimusvet.com',)
    )
    user = cursor.fetchone()
    cursor.close()
    
    if user:
        print("\n✅ Doğrulama başarılı!")
        print(f"   ID: {user[0]}")
        print(f"   Email: {user[1]}")
        print(f"   Name: {user[2]}")
        print(f"   Role: {user[3]}")
        return True
    else:
        print("\n❌ User bulunamadı!")
        return False

def main():
    print("=" * 60)
    print("🚀 OPTIMUS VET - Admin User Oluşturma")
    print("=" * 60)
    print()
    
    # Veritabanı bağlantısı
    print("🔌 Veritabanına bağlanılıyor...")
    conn = get_db_connection()
    print("✅ Bağlantı başarılı!")
    print()
    
    try:
        # Admin user oluştur
        create_admin_user(conn)
        
        # Doğrula
        verify_user(conn)
        
    except Exception as e:
        print(f"\n❌ Hata oluştu: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()
    
    print()
    print("=" * 60)
    print("🎉 İşlem tamamlandı!")
    print("=" * 60)
    print()
    print("📝 Giriş bilgileri:")
    print("   URL: https://optimus.celilturan.com.tr/auth/login")
    print("   Email: admin@optimusvet.com")
    print("   Password: admin123")
    print()
    print("⚠️  ÖNEMLİ: Production'da şifreyi değiştirin!")
    print()

if __name__ == "__main__":
    main()
