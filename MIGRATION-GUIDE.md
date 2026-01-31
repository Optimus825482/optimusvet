# 🔄 Database Migration Guide

## Sunucuda Migration Çalıştırma

### Adım 1: Backup Al (ÖNEMLİ!)

```bash
# Sunucuya bağlan
ssh user@server

# Backup al
pg_dump -U postgres -h localhost -d optimusvet > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup'ı kontrol et
ls -lh backup_*.sql
```

### Adım 2: Migration Dosyasını Yükle

```bash
# Local'den sunucuya kopyala
scp prisma/migrations/20260131_add_reminder_treatment_fields.sql user@server:/tmp/

# VEYA Coolify üzerinden:
# 1. Coolify dashboard'a git
# 2. Database > Execute SQL
# 3. SQL dosyasını yapıştır
```

### Adım 3: Migration'ı Çalıştır

#### Yöntem 1: psql ile (Önerilen)

```bash
# Sunucuda
psql -U postgres -d optimusvet -f /tmp/20260131_add_reminder_treatment_fields.sql

# Çıktıyı kontrol et - "COMMIT" görmelisin
```

#### Yöntem 2: Coolify Dashboard

```sql
-- Coolify > Database > Execute SQL
-- Dosyanın içeriğini kopyala yapıştır
-- "Execute" butonuna bas
```

### Adım 4: Doğrulama

```bash
# Sunucuda
psql -U postgres -d optimusvet

# Aşağıdaki sorguları çalıştır:
```

```sql
-- Yeni kolonları kontrol et
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'reminders'
AND column_name IN ('treatmentId', 'illnessId', 'isActive', 'dismissedAt', 'dismissedBy');

-- Index'leri kontrol et
SELECT indexname FROM pg_indexes
WHERE tablename = 'reminders'
AND indexname LIKE '%treatment%' OR indexname LIKE '%illness%';

-- Mevcut reminder sayısını kontrol et
SELECT COUNT(*) FROM reminders;
```

### Adım 5: Uygulama Restart

```bash
# Coolify'da
# Application > Restart

# VEYA manuel
pm2 restart optimus-vet
```

---

## 🚨 Sorun Çıkarsa

### Hata: "column already exists"

```sql
-- Normal, migration zaten çalışmış demektir
-- Doğrulama sorgularını çalıştır
```

### Hata: "foreign key constraint"

```sql
-- Önce constraint'leri kaldır
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_treatmentId_fkey;
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_illnessId_fkey;

-- Sonra migration'ı tekrar çalıştır
```

### Rollback Gerekirse

```bash
# Backup'tan geri yükle
psql -U postgres -d optimusvet < backup_20260131_XXXXXX.sql
```

---

## ✅ Başarı Kontrol Listesi

- [ ] Backup alındı
- [ ] Migration dosyası sunucuya yüklendi
- [ ] Migration başarıyla çalıştırıldı
- [ ] Doğrulama sorguları çalıştırıldı
- [ ] Yeni kolonlar görünüyor
- [ ] Index'ler oluşturuldu
- [ ] Uygulama restart edildi
- [ ] Production'da test edildi

---

## 📝 Migration Detayları

### Eklenen Kolonlar

| Kolon       | Tip       | Nullable | Default | Açıklama          |
| ----------- | --------- | -------- | ------- | ----------------- |
| treatmentId | TEXT      | YES      | NULL    | Tedavi ID'si      |
| illnessId   | TEXT      | YES      | NULL    | Hastalık ID'si    |
| isActive    | BOOLEAN   | NO       | true    | Aktif mi?         |
| dismissedAt | TIMESTAMP | YES      | NULL    | Kapatılma zamanı  |
| dismissedBy | TEXT      | YES      | NULL    | Kapatan kullanıcı |

### Eklenen Index'ler

- `reminders_treatmentId_idx`
- `reminders_illnessId_idx`
- `reminders_isActive_idx`
- `reminders_dismissedBy_idx`
- `reminders_dueDate_isActive_idx` (composite)

### Foreign Key'ler

- `treatmentId` → `treatments(id)` ON DELETE CASCADE
- `illnessId` → `illnesses(id)` ON DELETE CASCADE
- `dismissedBy` → `users(id)` ON DELETE SET NULL

---

## 🔒 Güvenlik Notları

1. **ASLA production'da `migrate reset` kullanma!**
2. Her zaman backup al
3. Migration'ı önce staging'de test et
4. Peak saatlerde migration yapma
5. Rollback planı hazır olsun
