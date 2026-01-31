# ⛔ YASAKLI KOMUTLAR - ASLA KULLANMA!

Bu komutlar **VERİTABANINI SİLER** veya **GERİ DÖNÜŞÜ OLMAYAN** değişiklikler yapar.

## 🚫 KESINLIKLE YASAK

### 1. Database Reset Komutları

```bash
# ❌ YASAK - Tüm veritabanını siler!
npx prisma migrate reset
npx prisma migrate reset --force
npx prisma migrate reset --skip-seed

# ❌ YASAK - Database'i drop eder!
npx prisma db push --force-reset
npx prisma migrate reset --skip-generate
```

### 2. Direct Database Drop

```bash
# ❌ YASAK - Database'i siler!
DROP DATABASE optimusvet;
psql -c "DROP DATABASE optimusvet;"
```

### 3. Truncate/Delete All

```sql
-- ❌ YASAK - Tüm tabloları temizler!
TRUNCATE TABLE "Customer" CASCADE;
DELETE FROM "Customer";
```

---

## ✅ GÜVENLİ ALTERNATİFLER

### Migration Ekleme (Veri Koruyarak)

```bash
# ✅ GÜVENLİ - Sadece yeni field ekler
npx prisma migrate dev --name add_new_field

# ✅ GÜVENLİ - Schema'yı kontrol et
npx prisma migrate status

# ✅ GÜVENLİ - Migration'ları uygula
npx prisma migrate deploy
```

### Schema Değişiklikleri

```bash
# ✅ GÜVENLİ - Prisma client'ı yeniden oluştur
npx prisma generate

# ✅ GÜVENLİ - Schema'yı format et
npx prisma format
```

### Database Backup

```bash
# ✅ GÜVENLİ - Backup al
pg_dump -U postgres optimusvet > backup_$(date +%Y%m%d_%H%M%S).sql

# ✅ GÜVENLİ - Backup'tan geri yükle
psql -U postgres optimusvet < backup.sql
```

---

## 📋 ONAY GEREKTİREN KOMUTLAR

Bu komutları çalıştırmadan önce **MUTLAKA ONAY AL**:

1. `prisma migrate reset` - Tüm veriyi siler
2. `DROP DATABASE` - Database'i siler
3. `TRUNCATE TABLE` - Tablo içeriğini siler
4. `DELETE FROM` (WHERE olmadan) - Tüm kayıtları siler
5. `ALTER TABLE ... DROP COLUMN` - Sütunu ve verisini siler

---

## 🔒 GÜVENLİK KURALLARI

### Kural 1: Her Zaman Backup Al

```bash
# Migration öncesi
pg_dump -U postgres optimusvet > backup_before_migration.sql
```

### Kural 2: Development'ta Test Et

```bash
# Önce local'de test et
DATABASE_URL="postgresql://localhost:5432/optimusvet_test" npx prisma migrate dev
```

### Kural 3: Production'da Dikkatli Ol

```bash
# Production'da sadece deploy kullan
npx prisma migrate deploy
```

---

## 🚨 ACİL DURUM - Yanlışlıkla Reset Yapıldıysa

1. **PANIK YAPMA!**
2. **Backup'tan geri yükle:**
   ```bash
   psql -U postgres optimusvet < backup.sql
   ```
3. **Eğer backup yoksa:**
   - Coolify/Supabase backup'larını kontrol et
   - Point-in-time recovery kullan (varsa)

---

## 📝 NOTLAR

- **Development**: `migrate dev` kullan (veri korur)
- **Production**: `migrate deploy` kullan (sadece uygula)
- **ASLA**: `migrate reset` kullanma!

**SON UYARI**: Bu komutları çalıştırmadan önce 3 kez düşün ve backup al!
