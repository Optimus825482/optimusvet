# 🔐 Login Credentials

## Default Admin User

**Email:** `admin@optimusvet.com`  
**Password:** `admin123`

---

## Sorun: "E-posta veya şifre hatalı" Hatası

### Olası Nedenler:

1. **Veritabanı seed edilmemiş**
2. **Şifre hash'i yanlış**
3. **User tablosu boş**

---

## Çözüm Adımları

### 1. Veritabanını Seed Et

```bash
cd optimus-vet
npx prisma db seed
```

**Beklenen Çıktı:**

```
✅ Admin user created
📧 Admin Login:
   Email: admin@optimusvet.com
   Password: admin123
```

### 2. Manuel User Oluştur (Eğer Seed Çalışmazsa)

Prisma Studio'da:

```bash
npx prisma studio
```

Veya SQL ile:

```sql
-- Şifreyi hash'le (bcrypt)
-- admin123 -> $2a$10$... (bcrypt hash)

INSERT INTO "users" ("id", "name", "email", "password", "role", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Admin',
  'admin@optimusvet.com',
  '$2a$10$0nz7Vz7P6qH6q6q6q6q6q6Xz8X8X8X8X8X8X8X8X8X8X8X8X8X8X8',
  'ADMIN',
  NOW(),
  NOW()
);
```

### 3. Şifre Hash'ini Kontrol Et

Node.js console'da:

```javascript
const bcrypt = require("bcryptjs");

// Şifreyi hash'le
const hash = await bcrypt.hash("admin123", 10);
console.log("Hash:", hash);

// Hash'i doğrula
const isValid = await bcrypt.compare("admin123", hash);
console.log("Valid:", isValid); // true olmalı
```

### 4. Veritabanında User'ı Kontrol Et

```sql
SELECT id, email, name, role, password
FROM users
WHERE email = 'admin@optimusvet.com';
```

**Kontrol Et:**

- ✅ User var mı?
- ✅ Password field'i dolu mu?
- ✅ Password bcrypt hash'i mi? (başı `$2a$` veya `$2b$` ile başlamalı)

---

## Production'da Şifre Değiştirme

### API Endpoint Kullan

```bash
curl -X PATCH https://optimus.celilturan.com.tr/api/user/password \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "yeni_guvenli_sifre_123"
  }'
```

### Veya Dashboard'dan

1. Login ol
2. Profil > Şifre Değiştir
3. Yeni şifreyi gir

---

## Güvenlik Notları

⚠️ **ÖNEMLİ:**

1. **Production'da default şifreyi DEĞİŞTİR!**
2. Güçlü şifre kullan (min 8 karakter, büyük/küçük harf, rakam, özel karakter)
3. Admin şifresini kimseyle paylaşma
4. Düzenli olarak şifre değiştir

---

## Test Kullanıcıları (Seed'den)

### Admin

- **Email:** admin@optimusvet.com
- **Password:** admin123
- **Role:** ADMIN

### Manager

- **Email:** manager@optimusvet.com
- **Password:** manager123
- **Role:** MANAGER

### Veteriner

- **Email:** vet@optimusvet.com
- **Password:** vet123
- **Role:** VETERINARIAN

### Muhasebeci

- **Email:** accountant@optimusvet.com
- **Password:** accountant123
- **Role:** ACCOUNTANT

---

## Hata Mesajları

### "E-posta veya şifre hatalı"

**Neden:**

- Email yanlış yazılmış
- Şifre yanlış
- User veritabanında yok
- Şifre hash'i bozuk

**Çözüm:**

1. Email'i kontrol et (küçük harf, boşluk yok)
2. Şifreyi kontrol et (büyük/küçük harf duyarlı)
3. Veritabanını seed et
4. User'ı manuel oluştur

### "Kullanıcı bulunamadı"

**Neden:**

- Email veritabanında yok

**Çözüm:**

- Seed script'i çalıştır
- Manuel user oluştur

### "Bir hata oluştu"

**Neden:**

- Veritabanı bağlantı hatası
- NextAuth configuration hatası

**Çözüm:**

- `.env` dosyasını kontrol et
- `DATABASE_URL` doğru mu?
- `NEXTAUTH_SECRET` tanımlı mı?

---

## Environment Variables

`.env` dosyasında olması gerekenler:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_URL="https://optimus.celilturan.com.tr"
NEXTAUTH_SECRET="your-secret-key-here"
```

---

## Debug

### 1. Console Logları

Browser console'da (F12):

- Network tab'inde `/api/auth/callback/credentials` isteğini kontrol et
- Response'u incele
- Error mesajını oku

### 2. Server Logları

Coolify'da:

- Logs sekmesine git
- Login denemesi sırasındaki logları oku
- Prisma query hatalarını kontrol et

### 3. Database Logları

```sql
-- Son login denemelerini gör
SELECT * FROM "sessions" ORDER BY "createdAt" DESC LIMIT 10;

-- User'ları listele
SELECT id, email, name, role FROM "users";
```

---

**Son Güncelleme:** 2025-01-31  
**Status:** ✅ Aktif  
**Default Password:** admin123 (Production'da değiştir!)
