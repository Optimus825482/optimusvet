# 🚨 Error Tracking & Email Notification System

## ✅ Sistem Kurulumu Tamamlandı

**Tarih:** 2026-02-04  
**Durum:** ✅ AKTIF

---

## 📊 Özellikler

### 1. Kapsamlı Hata Takibi

- ✅ Tüm hatalar veritabanına kaydedilir
- ✅ Stack trace ve context bilgisi
- ✅ Kullanıcı ve request bilgileri
- ✅ Hata severity seviyeleri (LOW, MEDIUM, HIGH, CRITICAL)
- ✅ Hata çözüm takibi

### 2. Email Bildirimleri

- ✅ CRITICAL ve HIGH severity hatalar için otomatik email
- ✅ Gmail SMTP entegrasyonu
- ✅ Detaylı HTML email template
- ✅ Stack trace ve context bilgisi

### 3. Hata İstatistikleri

- ✅ Zaman bazlı istatistikler (hour, day, week, month)
- ✅ Severity bazlı gruplama
- ✅ En sık görülen hatalar
- ✅ Çözülmemiş hata sayısı

### 4. Otomatik Temizleme

- ✅ Eski çözülmüş hataların otomatik silinmesi
- ✅ Configurable retention policy

---

## 🔧 Konfigürasyon

### Environment Variables (.env)

```env
# Email Configuration (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="ikinciyenikitap54@gmail.com"
SMTP_PASS="fsft gfby uvip rarh"
ADMIN_EMAIL="ikinciyenikitap54@gmail.com"

# Error Tracking
ERROR_TRACKING_ENABLED="true"
ERROR_EMAIL_NOTIFICATIONS="true"
```

### Database Schema

```sql
-- error_logs tablosu
CREATE TABLE error_logs (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,
    severity "ErrorSeverity" NOT NULL DEFAULT 'MEDIUM',
    context JSONB,
    component TEXT,
    function TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "requestPath" TEXT,
    "requestMethod" TEXT,
    "requestBody" JSONB,
    "requestQuery" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isOperational" BOOLEAN NOT NULL DEFAULT true,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP,
    "resolvedBy" TEXT,
    resolution TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP,
    "notifyAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ErrorSeverity ENUM
CREATE TYPE "ErrorSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
```

---

## 💻 Kullanım

### 1. Hata Takibi

```typescript
import { trackError } from "@/lib/error-tracking";

// Manuel hata takibi
await trackError({
  code: "PAYMENT_FAILED",
  message: "Ödeme işlemi başarısız oldu",
  severity: "HIGH",
  component: "PaymentService",
  function: "processPayment",
  context: {
    orderId: "12345",
    amount: 100,
    currency: "TRY",
  },
  userId: user.id,
  userEmail: user.email,
  requestPath: "/api/payments",
  requestMethod: "POST",
  notifyAdmin: true, // Email gönder
});
```

### 2. Exception'dan Hata Takibi

```typescript
import { trackErrorFromException } from "@/lib/error-tracking";

try {
  // Risky operation
  await processPayment(orderId);
} catch (error) {
  // Otomatik hata takibi
  await trackErrorFromException(error, {
    component: "PaymentService",
    function: "processPayment",
    context: { orderId },
    userId: user.id,
  });

  throw error;
}
```

### 3. API Route'larda Kullanım

```typescript
import { NextRequest, NextResponse } from "next/server";
import { trackError } from "@/lib/error-tracking";

export async function POST(request: NextRequest) {
  try {
    // Your logic here
    const result = await someOperation();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    // Track error
    await trackError({
      code: "API_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      severity: "HIGH",
      component: "API",
      function: "POST /api/endpoint",
      stack: error instanceof Error ? error.stack : undefined,
      requestPath: request.nextUrl.pathname,
      requestMethod: request.method,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

### 4. Hata Çözümü

```typescript
import { resolveError, bulkResolveErrors } from "@/lib/error-tracking";

// Tek hata çözümü
await resolveError(errorId, "Database connection pool artırıldı", userId);

// Toplu hata çözümü
await bulkResolveErrors(
  "DATABASE_CONNECTION_ERROR",
  "Connection pool configuration updated",
  userId,
);
```

### 5. İstatistikler

```typescript
import { getErrorStats } from "@/lib/error-tracking";

// Son 24 saatin istatistikleri
const stats = await getErrorStats("day");

console.log({
  total: stats.total,
  unresolved: stats.unresolved,
  bySeverity: stats.bySeverity,
  topErrors: stats.byCode,
  recentErrors: stats.recentErrors,
});
```

---

## 🧪 Test

### 1. Email Konfigürasyonu Testi

```bash
# Test email gönder
curl -X POST http://localhost:3002/api/test-error-tracking \
  -H "Content-Type: application/json" \
  -d '{"action": "test-email"}'

# Email config doğrula
curl -X POST http://localhost:3002/api/test-error-tracking \
  -H "Content-Type: application/json" \
  -d '{"action": "verify-email"}'
```

### 2. Hata Takibi Testi

```bash
# Test error track et
curl -X POST http://localhost:3002/api/test-error-tracking \
  -H "Content-Type: application/json" \
  -d '{"action": "test-error"}'

# Critical error test (email gönderir)
curl -X GET http://localhost:3002/api/test-error-tracking
```

### 3. İstatistik Testi

```bash
# Error stats al
curl -X POST http://localhost:3002/api/test-error-tracking \
  -H "Content-Type: application/json" \
  -d '{"action": "get-stats"}'
```

---

## 📧 Email Template

Email bildirimleri şu bilgileri içerir:

### Header

- 🚨 Severity emoji
- Severity badge (LOW, MEDIUM, HIGH, CRITICAL)

### Hata Detayları

- Error code
- Error message
- Timestamp
- Component
- Function

### İstek Bilgileri

- HTTP Method
- Request Path

### Kullanıcı Bilgileri

- User ID
- User Email

### Stack Trace

- Full stack trace (formatted)

### Ek Bilgiler

- Context data (JSON formatted)

---

## 🔍 Audit Log Sistemi Kontrolü

### Neden Boş?

Audit log sistemi şu anda **middleware aktif değil** çünkü:

1. ✅ Audit log tablosu mevcut
2. ✅ Audit fonksiyonları hazır
3. ❌ Prisma middleware aktif değil
4. ❌ API route'larda context set edilmiyor

### Audit Log Aktivasyonu

#### 1. Prisma Client'a Middleware Ekle

```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { setupAuditMiddleware } from "@/lib/prisma-audit-middleware";

const prismaClientSingleton = () => {
  const client = new PrismaClient();

  // Audit middleware'i aktive et
  setupAuditMiddleware(client);

  return client;
};

// ... rest of the code
```

#### 2. API Route'larda Context Set Et

```typescript
import { setAuditContext, clearAuditContext } from '@/lib/prisma-audit-middleware';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();

    // Set audit context
    if (session?.user) {
      setAuditContext({
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        requestPath: request.nextUrl.pathname,
        requestMethod: request.method,
      });
    }

    // Your logic here
    const result = await prisma.customer.create({ data: {...} });

    // Clear context
    clearAuditContext();

    return NextResponse.json({ success: true, result });
  } catch (error) {
    clearAuditContext();
    throw error;
  }
}
```

---

## 📊 Monitoring Dashboard (Gelecek)

### Planlanan Özellikler

- [ ] Error dashboard UI
- [ ] Real-time error monitoring
- [ ] Error trend charts
- [ ] Alert configuration
- [ ] Error grouping and deduplication
- [ ] Integration with external monitoring tools (Sentry, DataDog)

---

## 🔒 Güvenlik

### Sensitive Data Sanitization

Sistem otomatik olarak şu bilgileri temizler:

- Passwords
- Tokens (access, refresh)
- API keys
- Credit card numbers
- SSN
- Other sensitive fields

### Email Security

- ✅ Gmail App Password kullanımı
- ✅ TLS encryption
- ✅ Rate limiting
- ✅ Sanitized error data

---

## 🛠️ Bakım

### Otomatik Temizleme

```typescript
import { cleanupOldErrors } from "@/lib/error-tracking";

// 90 günden eski çözülmüş hataları sil
const deletedCount = await cleanupOldErrors(90);
console.log(`Deleted ${deletedCount} old errors`);
```

### Cron Job (Önerilen)

```typescript
// Günlük cleanup job
// 0 2 * * * (Her gün saat 02:00)
import { cleanupOldErrors } from "@/lib/error-tracking";

export async function dailyCleanup() {
  await cleanupOldErrors(90);
}
```

---

## 📝 Notlar

### Critical Error Codes (Otomatik Email)

Şu error code'lar otomatik olarak email gönderir:

- `DATABASE_CONNECTION_ERROR`
- `DATABASE_PANIC`
- `INTERNAL_SERVER_ERROR`
- `SERVICE_UNAVAILABLE`
- `PAYMENT_PROCESSING_ERROR`
- `DATA_CORRUPTION`
- `SECURITY_BREACH`

### Severity Seviyeleri

- **LOW**: Minor issues, doesn't affect functionality
- **MEDIUM**: Moderate issues, some features affected
- **HIGH**: Serious issues, major features affected
- **CRITICAL**: System-breaking issues, immediate attention required

---

## ✅ Checklist

- [x] Error tracking schema oluşturuldu
- [x] Email service implementasyonu
- [x] Error tracking service implementasyonu
- [x] Test API endpoint'leri
- [x] Gmail SMTP konfigürasyonu
- [x] Database migration uygulandı
- [x] Dokümantasyon oluşturuldu
- [ ] Audit log middleware aktivasyonu (opsiyonel)
- [ ] Production test
- [ ] Monitoring dashboard (gelecek)

---

**Sistem Hazır! 🚀**

Test için: `GET http://localhost:3002/api/test-error-tracking`
