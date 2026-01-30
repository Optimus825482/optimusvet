# PostgreSQL Migration & Setup - SQL Dosyaları

## 📋 Dosya Yapısı

```
prisma/
├── schema.prisma       ← Prisma ORM tanımı (referans)
├── seed.ts             ← TypeScript seed (Node.js ile çalışır)
├── migrations/
│   └── init/
│       └── migration.sql  ← ✅ KULLANILACAK: Başlangıç migration
└── seed.sql            ← ✅ KULLANILACAK: Demo data (SQL format)
```

---

## 🚀 Hızlı Kurulum

### ADIM 1: PostgreSQL Veritabanı Oluşturma

```bash
# Linux/Mac/Windows PowerShell
psql -U postgres

# PostgreSQL shell'de:
CREATE DATABASE optimusvet;
CREATE USER optimusvet_user WITH PASSWORD 'securepassword123';
ALTER ROLE optimusvet_user SET client_encoding TO 'utf8';
ALTER ROLE optimusvet_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE optimusvet_user SET default_transaction_deferrable TO on;
ALTER ROLE optimusvet_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE optimusvet TO optimusvet_user;
\q
```

### ADIM 2: Şema Oluşturma (Migration)

```bash
# Komut satırından (Linux/Mac)
psql -U optimusvet_user -d optimusvet -h localhost < prisma/migrations/init/migration.sql

# Windows PowerShell
psql -U optimusvet_user -d optimusvet -h localhost < ./prisma/migrations/init/migration.sql

# Docker ile (eğer PostgreSQL container çalışıyorsa)
docker exec -i postgres_container psql -U optimusvet_user -d optimusvet < prisma/migrations/init/migration.sql
```

**Çıktı:**
```
CREATE TYPE
CREATE TYPE
...
CREATE TABLE
...
CREATE UNIQUE INDEX
...
ALTER TABLE
ALTER TABLE
...
```

### ADIM 3: Demo Veri Yükleme (Seed)

```bash
# Komut satırından (Linux/Mac)
psql -U optimusvet_user -d optimusvet -h localhost < prisma/seed.sql

# Windows PowerShell
psql -U optimusvet_user -d optimusvet -h localhost < ./prisma/seed.sql

# Docker ile
docker exec -i postgres_container psql -U optimusvet_user -d optimusvet < prisma/seed.sql
```

**Çıktı:**
```
INSERT 0 1
INSERT 0 1
...
INSERT 0 100+
```

---

## 🔧 Environment Variable Ayarı

### `.env.local` oluştur:

```env
# Database
DATABASE_URL="postgresql://optimusvet_user:securepassword123@localhost:5432/optimusvet"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-string-min-32-chars-xxxxxxxxxx"

# API
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# Upload (Uploadthing)
UPLOADTHING_SECRET="sk_test_xxxxxxxxxxxxxxx"
NEXT_PUBLIC_UPLOADTHING_APP_ID="xxxxxxxxxxxxxxx"

# Email (isteğe bağlı)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
```

---

## ✅ Doğrulama

### Veri tabanında verileri kontrol et:

```sql
-- PostgreSQL shell'de:
psql -U optimusvet_user -d optimusvet

-- Tablolar
\dt

-- Kullanıcı sayısı
SELECT COUNT(*) FROM "users";
-- Çıktı: 4

-- Ürün sayısı
SELECT COUNT(*) FROM "products";
-- Çıktı: 10

-- Müşteri sayısı
SELECT COUNT(*) FROM "customers";
-- Çıktı: 5

-- İşlem sayısı
SELECT COUNT(*) FROM "transactions";
-- Çıktı: 5

-- Hayvan sayısı
SELECT COUNT(*) FROM "animals";
-- Çıktı: 7
```

### Node.js ile doğrula:

```bash
npm install @prisma/client bcryptjs
npx prisma generate
npx prisma db push  # (opsiyonel, zaten push edildi)
npm run dev
```

Tarayıcı: `http://localhost:3000`

**Test Hesapları:**
- Admin: `admin@optimusvet.com` / `admin123`
- Manager: `manager@optimusvet.com` / `manager123`
- Vet: `vet@optimusvet.com` / `vet123`
- Accountant: `accountant@optimusvet.com` / `accountant123`

---

## 🔄 Yeniden Başlangıç (Reset)

### Veritabanı Sıfırla (Delete & Recreate):

```bash
# Linux/Mac
dropdb -U optimusvet_user optimusvet
createdb -U optimusvet_user optimusvet
psql -U optimusvet_user -d optimusvet < prisma/migrations/init/migration.sql
psql -U optimusvet_user -d optimusvet < prisma/seed.sql

# Windows
dropdb -U optimusvet_user optimusvet
createdb -U optimusvet_user optimusvet
psql -U optimusvet_user -d optimusvet < .\prisma\migrations\init\migration.sql
psql -U optimusvet_user -d optimusvet < .\prisma\seed.sql

# Docker
docker exec postgres_container dropdb -U optimusvet_user optimusvet
docker exec postgres_container createdb -U optimusvet_user optimusvet
docker exec -i postgres_container psql -U optimusvet_user -d optimusvet < prisma/migrations/init/migration.sql
docker exec -i postgres_container psql -U optimusvet_user -d optimusvet < prisma/seed.sql
```

---

## 📊 Veritabanı Yedekleme & Geri Yükleme

### Yedek Al:

```bash
# Full backup
pg_dump -U optimusvet_user -d optimusvet -F custom > optimusvet_backup.sql

# SQL format
pg_dump -U optimusvet_user -d optimusvet > optimusvet_backup_plain.sql

# Docker ile
docker exec postgres_container pg_dump -U optimusvet_user -d optimusvet > optimusvet_backup.sql
```

### Yedekten Geri Yükle:

```bash
# Custom format
pg_restore -U optimusvet_user -d optimusvet -c < optimusvet_backup.sql

# Plain SQL format
psql -U optimusvet_user -d optimusvet < optimusvet_backup_plain.sql

# Docker ile
docker exec -i postgres_container pg_restore -U optimusvet_user -d optimusvet -c < optimusvet_backup.sql
```

---

## 🐳 Docker ile Kurulum

### docker-compose.yml (eğer varsa):

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: optimusvet
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./prisma/migrations/init/migration.sql:/docker-entrypoint-initdb.d/01_migration.sql
      - ./prisma/seed.sql:/docker-entrypoint-initdb.d/02_seed.sql

volumes:
  postgres_data:
```

### Başlat:

```bash
docker-compose up -d
```

---

## 🔗 Connection String Örnekleri

```bash
# Local
postgresql://optimusvet_user:securepassword123@localhost:5432/optimusvet

# Docker Compose
postgresql://optimusvet_user:securepassword123@postgres:5432/optimusvet

# Cloud (Vercel, Fly.io, vb.)
postgresql://user:password@host:5432/database

# Prisma .env.local
DATABASE_URL="postgresql://optimusvet_user:securepassword123@localhost:5432/optimusvet"
```

---

## 🛠️ Prisma CLI Komutları (İsteğe Bağlı)

```bash
# Prisma client oluştur
npx prisma generate

# Veritabanı push et (dev için)
npx prisma db push

# Seed'i çalıştır (TypeScript)
npx prisma db seed

# Studio açır (Web UI)
npx prisma studio

# Migration oluştur
npx prisma migrate dev --name <name>

# Migration geçmişini göster
npx prisma migrate status
```

---

## 📝 Notlar

1. **SQL Seed Dosyası (`seed.sql`)**
   - Bağımsız SQL dosyası
   - Herhangi bir framework gerekmez
   - Doğrudan PostgreSQL ile çalışır
   - Demo veriler hızlı yüklenir

2. **TypeScript Seed (`seed.ts`)**
   - Node.js ortamında çalışır
   - Prisma ORM kullanır
   - Daha esnek ve güçlü
   - `npm run seed` komutuyla çalıştırılır

3. **Hangisini Kullan?**
   - SQL Seed: Manuel setup, DevOps, Docker entegrasyonu
   - TypeScript Seed: Development, Node.js project management

4. **Üretim Ortamında:**
   - SQL Seed kullan (daha güvenli, daha hızlı)
   - Sensitive veri (.env) ile yönet
   - Backup ve restore senaryoları planla

---

## ❌ Sorun Giderme

### Hata: "database "optimusvet" does not exist"
```bash
createdb -U optimusvet_user optimusvet
```

### Hata: "permission denied for schema public"
```sql
GRANT ALL PRIVILEGES ON SCHEMA public TO optimusvet_user;
```

### Hata: "role optimusvet_user does not exist"
```bash
# Kullanıcı oluştur
psql -U postgres -c "CREATE USER optimusvet_user WITH PASSWORD 'securepassword123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE optimusvet TO optimusvet_user;"
```

### PostgreSQL Port Hatası (5432 kullanımda):
```bash
# Kullanılan port bul
lsof -i :5432

# Farklı port kullan
postgresql://optimusvet_user:pass@localhost:5433/optimusvet
```

---

## 📚 Yararlanılan Kaynaklar

- [PostgreSQL Official](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [psql CLI Reference](https://www.postgresql.org/docs/current/app-psql.html)
- [pg_dump Backup Guide](https://www.postgresql.org/docs/current/backup-dump.html)

---

**✅ Kurulum Tamamlandı!**

Sorularınız varsa veya sorun yaşarsanız, lütfen `DATABASE_URL` ayarınızı kontrol edin.
