# 🚀 AUDIT & ERROR TRACKING - HIZLI KULLANIM REHBERİ

## ✅ SİSTEM AKTİF

Her iki sistem de aktif ve çalışıyor:

- ✅ Error Tracking (console.error → database + email)
- ✅ Audit Logging (CRUD → database with old/new data)

---

## 📝 YENİ API'YE AUDIT NASIL EKLENİR?

### 1. Import Ekle

```typescript
import { withAuditContext } from "@/lib/audit-api-helper";
```

### 2. Handler'ı Wrap Et

```typescript
// CREATE
export async function POST(request: NextRequest) {
  return withAuditContext(request, "CREATE", async () => {
    const data = await prisma.model.create({ ... });
    return NextResponse.json(data);
  });
}

// UPDATE
export async function PUT(request: NextRequest, { params }) {
  return withAuditContext(request, "UPDATE", async () => {
    const data = await prisma.model.update({ ... });
    return NextResponse.json(data);
  });
}

// DELETE
export async function DELETE(request: NextRequest, { params }) {
  return withAuditContext(request, "DELETE", async () => {
    await prisma.model.delete({ ... });
    return NextResponse.json({ message: "Silindi" });
  });
}
```

**O KADAR!** Middleware otomatik olarak:

- Eski veriyi yakalar (UPDATE/DELETE için)
- Yeni veriyi yakalar (CREATE/UPDATE için)
- User bilgisini ekler
- IP ve User Agent'ı ekler
- audit_logs tablosuna kaydeder

---

## 🔍 AUDIT LOG'LARI NASIL GÖRÜNTÜLENIR?

### SQL ile

```sql
-- Son 20 işlem
SELECT
  action,
  "tableName",
  "userName",
  "createdAt"
FROM audit_logs
ORDER BY "createdAt" DESC
LIMIT 20;

-- Belirli bir kullanıcının işlemleri
SELECT * FROM audit_logs
WHERE "userName" = 'Admin User'
ORDER BY "createdAt" DESC;

-- Belirli bir tablodaki değişiklikler
SELECT * FROM audit_logs
WHERE "tableName" = 'customers'
ORDER BY "createdAt" DESC;

-- UPDATE işlemlerinde değişen alanları gör
SELECT
  "userName",
  "oldData",
  "newData",
  "createdAt"
FROM audit_logs
WHERE action = 'UPDATE' AND "tableName" = 'customers'
ORDER BY "createdAt" DESC;
```

### Dashboard'da

Audit log sayfası zaten mevcut:

- URL: `/dashboard/audit-logs`
- Filtreleme: Action, Table, User, Date
- Detay görüntüleme: Old/New data comparison

---

## 🚨 ERROR LOG'LARI NASIL GÖRÜNTÜLENIR?

### SQL ile

```sql
-- Son 20 hata
SELECT
  code,
  message,
  severity,
  component,
  "createdAt"
FROM error_logs
ORDER BY "createdAt" DESC
LIMIT 20;

-- CRITICAL hatalar
SELECT * FROM error_logs
WHERE severity = 'CRITICAL'
ORDER BY "createdAt" DESC;

-- Belirli bir component'in hataları
SELECT * FROM error_logs
WHERE component = 'DashboardAPI'
ORDER BY "createdAt" DESC;
```

### Email Bildirimleri

HIGH ve CRITICAL seviyedeki hatalar otomatik olarak email ile gönderilir:

- Email: ikinciyenikitap54@gmail.com
- Konu: [OPTIMUS VET] Error Alert - {severity}
- İçerik: Hata detayları, stack trace, request bilgileri

---

## 🧪 TEST NASIL YAPILIR?

### 1. Error Tracking Testi

```bash
# Test endpoint'i çağır
curl http://localhost:3002/api/test-error-tracking

# Veya tarayıcıda aç:
http://localhost:3002/api/test-error-tracking
```

**Beklenen:**

- ✅ error_logs tablosunda yeni kayıt
- ✅ Email gelir (HIGH severity)

### 2. Audit Log Testi - CREATE

```bash
# Yeni müşteri ekle (Postman veya UI'dan)
POST /api/customers
{
  "name": "Test Müşteri",
  "phone": "5551234567"
}
```

**Beklenen:**

- ✅ audit_logs tablosunda CREATE kaydı
- ✅ newData dolu
- ✅ userName, ipAddress, userAgent dolu

### 3. Audit Log Testi - UPDATE

```bash
# Müşteri güncelle
PUT /api/customers/{id}
{
  "name": "Güncellenmiş İsim"
}
```

**Beklenen:**

- ✅ audit_logs tablosunda UPDATE kaydı
- ✅ oldData ve newData dolu
- ✅ Değişiklikler görünüyor

### 4. Audit Log Testi - DELETE

```bash
# Müşteri sil
DELETE /api/customers/{id}
```

**Beklenen:**

- ✅ audit_logs tablosunda DELETE kaydı
- ✅ oldData dolu (silinen veri)

---

## 📊 HANGI İŞLEMLER LOGLANIYOR?

### Otomatik Loglanan (Middleware)

Tüm Prisma işlemleri otomatik loglanır:

- ✅ `prisma.model.create()` → CREATE log
- ✅ `prisma.model.update()` → UPDATE log (old + new)
- ✅ `prisma.model.delete()` → DELETE log (deleted data)
- ✅ `prisma.model.createMany()` → Her kayıt için CREATE log
- ✅ `prisma.model.updateMany()` → Her kayıt için UPDATE log
- ✅ `prisma.model.deleteMany()` → Her kayıt için DELETE log

### Manuel Context Gerekli

Sadece API route'larda `withAuditContext()` kullanılması gerekir.
Middleware otomatik çalışır ama user bilgisi için context şart.

---

## ⚠️ ÖNEMLİ NOTLAR

### 1. Context Olmadan Audit Yapılmaz

Eğer API route'da `withAuditContext()` kullanılmazsa:

- ❌ Audit log oluşturulmaz
- ✅ Prisma işlemi normal çalışır

Bu kasıtlı bir tasarım (background jobs, seed scripts için).

### 2. Error Tracking Her Zaman Aktif

`console.error()` her zaman loglanır:

- ✅ API route'larda
- ✅ Server component'lerde
- ✅ Background job'larda
- ✅ Her yerde

### 3. Email Sadece HIGH/CRITICAL İçin

Email bildirimleri sadece şu durumlarda gönderilir:

- severity = "HIGH"
- severity = "CRITICAL"
- notifyAdmin = true

LOW ve MEDIUM hatalar sadece veritabanına kaydedilir.

### 4. Performance

Audit logging async çalışır:

- ✅ API response'u bloklamaz
- ✅ Hata olsa bile API çalışır
- ✅ Background'da kaydedilir

---

## 🔧 SORUN GİDERME

### Audit Log Oluşmuyor

1. Context set edilmiş mi?

   ```typescript
   return withAuditContext(request, "CREATE", async () => { ... });
   ```

2. User login olmuş mu?

   ```typescript
   const session = await auth();
   console.log(session); // null ise audit yapılmaz
   ```

3. Middleware aktif mi?
   ```typescript
   // src/lib/prisma.ts
   setupAuditMiddleware(prisma); // Bu satır var mı?
   ```

### Error Log Oluşmuyor

1. Global handler aktif mi?

   ```typescript
   // src/app/layout.tsx
   initializeGlobalErrorHandler(); // Bu satır var mı?
   ```

2. console.error kullanılıyor mu?
   ```typescript
   console.error("Hata mesajı"); // ✅ Doğru
   console.log("Hata mesajı"); // ❌ Loglanmaz
   ```

### Email Gelmiyor

1. SMTP ayarları doğru mu?

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=ikinciyenikitap54@gmail.com
   SMTP_PASS=fsft gfby uvip rarh
   SMTP_FROM=ikinciyenikitap54@gmail.com
   ```

2. Severity HIGH/CRITICAL mi?

   ```typescript
   trackError({
     severity: "HIGH", // veya "CRITICAL"
     notifyAdmin: true,
   });
   ```

3. Test endpoint çalışıyor mu?
   ```
   GET /api/test-error-tracking
   ```

---

## 📚 İLGİLİ DOSYALAR

### Core Files

- `src/lib/global-error-handler.ts` - Error tracking
- `src/lib/error-tracking.ts` - Error database operations
- `src/lib/email.ts` - Email service
- `src/lib/prisma-audit-middleware.ts` - Audit middleware
- `src/lib/audit.ts` - Audit database operations
- `src/lib/audit-api-helper.ts` - API helper functions

### Configuration

- `src/app/layout.tsx` - Global error handler init
- `src/lib/prisma.ts` - Audit middleware init
- `.env` - SMTP configuration

### Examples

- `src/app/api/customers/route.ts` - CREATE example
- `src/app/api/customers/[id]/route.ts` - UPDATE/DELETE example
- `src/lib/auth.ts` - Login audit example

---

**Hazır! Sistem tamamen aktif ve çalışıyor.** 🚀
