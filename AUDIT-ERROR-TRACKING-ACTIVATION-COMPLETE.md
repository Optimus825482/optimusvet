# ✅ AUDIT LOG & ERROR TRACKING SİSTEMLERİ AKTİVASYON RAPORU

## 🎯 YAPILAN İŞLEMLER

### 1. ✅ Global Error Handler Aktive Edildi

**Dosya:** `src/app/layout.tsx`

```typescript
import { initializeGlobalErrorHandler } from "@/lib/global-error-handler";

// Server-side only
if (typeof window === "undefined") {
  initializeGlobalErrorHandler();
}
```

**Ne Yapar:**

- Tüm `console.error()` çağrılarını yakalar
- Veritabanına `error_logs` tablosuna kaydeder
- HIGH ve CRITICAL seviyedeki hatalar için email gönderir
- Unhandled Promise Rejections yakalar
- Uncaught Exceptions yakalar

---

### 2. ✅ Audit Middleware Aktive Edildi

**Dosya:** `src/lib/prisma.ts`

```typescript
import { setupAuditMiddleware } from "./prisma-audit-middleware";

// Prisma client oluşturulduktan sonra
setupAuditMiddleware(prisma);
```

**Ne Yapar:**

- Tüm Prisma CRUD işlemlerini otomatik yakalar
- CREATE: Yeni veri kaydedildiğinde audit log oluşturur
- UPDATE: Eski ve yeni veriyi karşılaştırarak audit log oluşturur
- DELETE: Silinen veriyi audit log'a kaydeder
- `audit_logs` tablosuna otomatik kayıt yapar

---

### 3. ✅ Audit API Helper Oluşturuldu

**Dosya:** `src/lib/audit-api-helper.ts`

**Kullanım:**

```typescript
import { withAuditContext } from "@/lib/audit-api-helper";

export async function POST(request: NextRequest) {
  return withAuditContext(request, "CREATE", async () => {
    // Prisma işlemleri burada - otomatik audit log
    const customer = await prisma.customer.create({ ... });
    return NextResponse.json(customer);
  });
}
```

**Özellikler:**

- Session'dan user bilgisini otomatik alır
- IP address ve User Agent bilgilerini yakalar
- Context'i otomatik temizler (finally block)
- CREATE, READ, UPDATE, DELETE action'larını destekler

---

### 4. ✅ Customer API'lerine Audit Context Eklendi

**Güncellenmiş Dosyalar:**

- `src/app/api/customers/route.ts` (POST - CREATE)
- `src/app/api/customers/[id]/route.ts` (PUT, PATCH - UPDATE, DELETE)

**Örnek:**

```typescript
// POST - Yeni müşteri ekle
export async function POST(request: NextRequest) {
  return withAuditContext(request, "CREATE", async () => {
    const customer = await prisma.customer.create({ ... });
    // ✅ Otomatik audit log: CREATE action, user bilgisi, eski/yeni veri
    return NextResponse.json(customer);
  });
}

// PUT - Müşteri güncelle
export async function PUT(request: NextRequest, { params }) {
  return withAuditContext(request, "UPDATE", async () => {
    const customer = await prisma.customer.update({ ... });
    // ✅ Otomatik audit log: UPDATE action, eski veri vs yeni veri
    return NextResponse.json(customer);
  });
}

// DELETE - Müşteri sil
export async function DELETE(request: NextRequest, { params }) {
  return withAuditContext(request, "DELETE", async () => {
    await prisma.customer.update({ data: { isActive: false } });
    // ✅ Otomatik audit log: DELETE action, silinen veri
    return NextResponse.json({ message: "Müşteri silindi" });
  });
}
```

---

### 5. ✅ Auth (Login) İşlemlerine Audit Context Eklendi

**Dosya:** `src/lib/auth.ts`

```typescript
import { setAuditContext, clearAuditContext } from "@/lib/prisma-audit-middleware";

async authorize(credentials) {
  try {
    const user = await prisma.user.findUnique({ ... });

    // ✅ Login işlemi için audit context
    setAuditContext({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: "LOGIN",
      ipAddress: "unknown",
      userAgent: "unknown",
    });

    return user;
  } finally {
    clearAuditContext();
  }
}
```

---

### 6. ✅ Prisma Audit Middleware Düzeltildi

**Dosya:** `src/lib/prisma-audit-middleware.ts`

**Düzeltmeler:**

- `runInTransaction` hatası düzeltildi
- Direkt `prisma[model]` kullanımı eklendi
- UPDATE işlemlerinde eski ve yeni veri karşılaştırması
- DELETE işlemlerinde silinen veri kaydı
- deleteMany için her kayıt için ayrı audit log

---

## 📊 SİSTEM AKIŞI

### Error Tracking Akışı

```
1. Uygulama hatası oluşur
   ↓
2. console.error() çağrılır
   ↓
3. Global Error Handler yakalar
   ↓
4. error_logs tablosuna kaydeder
   ↓
5. Severity HIGH/CRITICAL ise email gönderir
   ↓
6. Admin bilgilendirilir
```

### Audit Log Akışı

```
1. API route çağrılır
   ↓
2. withAuditContext() ile context set edilir
   ↓
3. Prisma CRUD işlemi yapılır
   ↓
4. Audit Middleware yakalar
   ↓
5. Eski/yeni veri karşılaştırır
   ↓
6. audit_logs tablosuna kaydeder
   ↓
7. Context temizlenir
```

---

## 🔧 DİĞER API'LERE NASIL EKLENİR?

### Örnek 1: Animals API

```typescript
// src/app/api/animals/route.ts
import { withAuditContext } from "@/lib/audit-api-helper";

export async function POST(request: NextRequest) {
  return withAuditContext(request, "CREATE", async () => {
    const animal = await prisma.animal.create({ ... });
    return NextResponse.json(animal);
  });
}
```

### Örnek 2: Products API

```typescript
// src/app/api/products/[id]/route.ts
import { withAuditContext } from "@/lib/audit-api-helper";

export async function PUT(request: NextRequest, { params }) {
  return withAuditContext(request, "UPDATE", async () => {
    const product = await prisma.product.update({ ... });
    return NextResponse.json(product);
  });
}

export async function DELETE(request: NextRequest, { params }) {
  return withAuditContext(request, "DELETE", async () => {
    await prisma.product.delete({ ... });
    return NextResponse.json({ message: "Ürün silindi" });
  });
}
```

### Örnek 3: Manuel Context Yönetimi

```typescript
import { setAuditContextFromRequest, clearAuditContext } from "@/lib/audit-api-helper";

export async function POST(request: NextRequest) {
  try {
    await setAuditContextFromRequest(request, "CREATE");

    // Prisma işlemleri
    const result = await prisma.transaction.create({ ... });

    return NextResponse.json(result);
  } finally {
    clearAuditContext();
  }
}
```

---

## 📋 EKLENMESİ GEREKEN DİĞER API'LER

Aşağıdaki API'lere de audit context eklenmeli:

### Yüksek Öncelikli

- [ ] `/api/animals` (CREATE, UPDATE, DELETE)
- [ ] `/api/products` (CREATE, UPDATE, DELETE)
- [ ] `/api/transactions` (CREATE, UPDATE, DELETE)
- [ ] `/api/payments` (CREATE, UPDATE, DELETE)
- [ ] `/api/suppliers` (CREATE, UPDATE, DELETE)

### Orta Öncelikli

- [ ] `/api/protocols` (CREATE, UPDATE, DELETE)
- [ ] `/api/reminders` (CREATE, UPDATE, DELETE)
- [ ] `/api/illnesses` (CREATE, UPDATE, DELETE)
- [ ] `/api/treatments` (CREATE, UPDATE, DELETE)
- [ ] `/api/collections` (CREATE, UPDATE, DELETE)

### Düşük Öncelikli

- [ ] `/api/settings` (UPDATE)
- [ ] `/api/categories` (CREATE, UPDATE, DELETE)
- [ ] `/api/stock-movements` (CREATE)

---

## 🧪 TEST SENARYOLARI

### 1. Error Tracking Testi

```bash
# Test endpoint'i çağır
curl http://localhost:3002/api/test-error-tracking

# Kontrol et:
# 1. error_logs tablosunda kayıt var mı?
# 2. Email geldi mi?
```

### 2. Audit Log Testi - CREATE

```bash
# Yeni müşteri ekle
curl -X POST http://localhost:3002/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Müşteri", "phone": "5551234567"}'

# Kontrol et:
# 1. audit_logs tablosunda CREATE kaydı var mı?
# 2. action = "CREATE"
# 3. tableName = "customers"
# 4. newData dolu mu?
```

### 3. Audit Log Testi - UPDATE

```bash
# Müşteri güncelle
curl -X PUT http://localhost:3002/api/customers/{id} \
  -H "Content-Type: application/json" \
  -d '{"name": "Güncellenmiş İsim", "phone": "5551234567"}'

# Kontrol et:
# 1. audit_logs tablosunda UPDATE kaydı var mı?
# 2. oldData ve newData dolu mu?
# 3. Değişiklikler görünüyor mu?
```

### 4. Audit Log Testi - DELETE

```bash
# Müşteri sil
curl -X DELETE http://localhost:3002/api/customers/{id}

# Kontrol et:
# 1. audit_logs tablosunda DELETE kaydı var mı?
# 2. oldData dolu mu (silinen veri)?
```

---

## 📊 VERİTABANI KONTROL

### Error Logs Kontrolü

```sql
-- Son 10 error kaydı
SELECT
  id,
  code,
  message,
  severity,
  component,
  "createdAt"
FROM error_logs
ORDER BY "createdAt" DESC
LIMIT 10;

-- Severity'ye göre dağılım
SELECT
  severity,
  COUNT(*) as count
FROM error_logs
GROUP BY severity;
```

### Audit Logs Kontrolü

```sql
-- Son 10 audit kaydı
SELECT
  id,
  action,
  "tableName",
  "recordId",
  "userName",
  "createdAt"
FROM audit_logs
ORDER BY "createdAt" DESC
LIMIT 10;

-- Action'a göre dağılım
SELECT
  action,
  COUNT(*) as count
FROM audit_logs
GROUP BY action;

-- Kullanıcıya göre dağılım
SELECT
  "userName",
  COUNT(*) as count
FROM audit_logs
GROUP BY "userName"
ORDER BY count DESC;

-- Tabloya göre dağılım
SELECT
  "tableName",
  COUNT(*) as count
FROM audit_logs
GROUP BY "tableName"
ORDER BY count DESC;
```

---

## ✅ SONUÇ

### Aktif Sistemler

1. ✅ **Global Error Handler** - Tüm console.error'ları yakalar
2. ✅ **Error Tracking** - Veritabanına kaydeder + Email gönderir
3. ✅ **Audit Middleware** - Tüm Prisma işlemlerini yakalar
4. ✅ **Audit API Helper** - API route'larda kolay kullanım
5. ✅ **Customer API Audit** - CREATE, UPDATE, DELETE loglanıyor
6. ✅ **Auth Audit** - Login işlemleri loglanıyor

### Beklenen Davranış

- ✅ Her console.error → error_logs tablosuna kayıt
- ✅ HIGH/CRITICAL error → Email gönderilir
- ✅ Her Prisma CREATE → audit_logs'a CREATE kaydı
- ✅ Her Prisma UPDATE → audit_logs'a UPDATE kaydı (eski + yeni veri)
- ✅ Her Prisma DELETE → audit_logs'a DELETE kaydı (silinen veri)
- ✅ User bilgisi, IP, User Agent otomatik kaydedilir

### Sonraki Adımlar

1. Diğer API'lere audit context ekle (animals, products, transactions, vb.)
2. Production'da test et
3. Audit log'ları dashboard'da göster
4. Error log'ları dashboard'da göster
5. Email notification'ları test et

---

**Tarih:** 2026-02-04
**Durum:** ✅ TAMAMLANDI
**Test:** Bekliyor
