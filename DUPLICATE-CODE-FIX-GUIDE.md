# Duplicate Transaction Code Fix Guide

## 🔍 Problem

Log'larda görülen hata:

```
ERROR: duplicate key value violates unique constraint "transactions_code_key"
Key (code)=(ALS-015153) already exists.
```

## 📊 Analiz

### Mevcut Korumalar ✅

1. **Database Unique Constraint:** `transactions_code_key` (ÇALIŞIYOR)
2. **Code Generation Retry:** 5 deneme + UUID fallback (ÇALIŞIYOR)
3. **Crypto-based UUID:** Collision riski çok düşük (ÇALIŞIYOR)

### Sorunun Kaynağı

**Race Condition:** Kullanıcı submit butonuna çift tıklıyor veya ağ gecikmesi nedeniyle aynı istek 2 kez gönderiliyor.

```
User Click 1 → API Request 1 → Generate Code: ALS-015153 → Insert ✅
User Click 2 → API Request 2 → Generate Code: ALS-015153 → Insert ❌ (Duplicate)
     ↑
   100ms fark
```

## 🛡️ Çözümler

### 1. Frontend: Double-Click Prevention (ÖNERİLEN)

Form submit butonlarına loading state ve disabled ekle:

```typescript
// Örnek: Sales form
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (data) => {
  if (isSubmitting) return; // Prevent double submission

  setIsSubmitting(true);
  try {
    await createSale(data);
  } finally {
    setIsSubmitting(false);
  }
};

<Button
  type="submit"
  disabled={isSubmitting}
>
  {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
</Button>
```

### 2. Backend: Idempotency Key (GELİŞMİŞ)

Her request için unique key kullan:

```typescript
// Client tarafı
const idempotencyKey = crypto.randomUUID();
await fetch("/api/transactions", {
  headers: {
    "Idempotency-Key": idempotencyKey,
  },
});

// Server tarafı
const key = request.headers.get("Idempotency-Key");
const cached = await redis.get(`idempotency:${key}`);
if (cached) {
  return NextResponse.json(JSON.parse(cached)); // Return cached response
}
```

### 3. Database: Advisory Lock (EN GÜÇLÜ)

PostgreSQL advisory lock kullan:

```typescript
await prisma.$executeRaw`SELECT pg_advisory_lock(${customerId})`;
try {
  // Transaction işlemleri
} finally {
  await prisma.$executeRaw`SELECT pg_advisory_unlock(${customerId})`;
}
```

## 🎯 Önerilen Uygulama

### Hızlı Çözüm (5 dakika)

Frontend'de tüm form submit butonlarına loading state ekle.

### Orta Vadeli (1 saat)

Idempotency key sistemi ekle (Redis ile).

### Uzun Vadeli (2 saat)

Advisory lock + idempotency key kombinasyonu.

## 📝 Etkilenen Sayfalar

1. ✅ Satış İşlemleri (`/dashboard/sales/new`)
2. ✅ Alım İşlemleri (`/dashboard/purchases/new`)
3. ✅ Tedavi Kayıtları (`/dashboard/animals/[id]`)
4. ✅ Tahsilat İşlemleri (`/dashboard/receivables`)

## 🔧 Hızlı Fix: Loading State Pattern

Tüm form component'lerinde kullanılabilecek generic pattern:

```typescript
// hooks/use-form-submit.ts
export function useFormSubmit<T>(onSubmit: (data: T) => Promise<void>) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: T) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting };
}

// Kullanım
const { handleSubmit, isSubmitting } = useFormSubmit(createSale);
```

## 📊 Monitoring

Duplicate hatalarını takip etmek için:

```sql
-- Son 24 saatteki duplicate hataları
SELECT
  COUNT(*) as error_count,
  MIN(created_at) as first_error,
  MAX(created_at) as last_error
FROM audit_logs
WHERE
  action = 'CREATE'
  AND table_name = 'transactions'
  AND created_at > NOW() - INTERVAL '24 hours'
  AND old_values::text LIKE '%duplicate%';
```

## ✅ Sonuç

**Mevcut Durum:** Database constraint çalışıyor, hata yakalanıyor ✅
**Kullanıcı Deneyimi:** Hata mesajı gösteriliyor ❌
**Önerilen:** Frontend'de double-click prevention ✅

**Öncelik:** ORTA (Sistem çalışıyor ama UX iyileştirilebilir)

---

**Not:** Bu hata kritik değil, database constraint sayesinde veri bütünlüğü korunuyor. Sadece kullanıcı deneyimi için frontend iyileştirmesi yapılmalı.
