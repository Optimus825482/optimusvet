# 💰 TAHSİLAT SİSTEMİ KURULUM KILAVUZU

## 📋 Genel Bakış

Bu sistem müşterilerden yapılan tahsilatları (ödemeleri) kaydetmek ve bu tahsilatları otomatik olarak bekleyen satışlara (FIFO mantığıyla) dağıtmak için tasarlanmıştır.

## 🎯 Özellikler

- ✅ Müşteri tahsilatı kaydı
- ✅ Otomatik tahsilat kodu oluşturma (TAH-YYYYMMDD-0001)
- ✅ FIFO mantığıyla tahsilatın satışlara dağıtımı
- ✅ Çoklu ödeme yöntemi desteği (Nakit, Kredi Kartı, Havale, Çek)
- ✅ Çek ve banka transfer detayları
- ✅ Müşteri bakiyesi otomatik güncelleme
- ✅ Transaction-safe işlemler (Atomicity garantisi)

## 📊 Veritabanı Yapısı

### 1. Collections Tablosu

Müşterilerden yapılan tahsilatları kaydeder.

```sql
collections
├── id (PK)
├── code (UNIQUE) - Otomatik: TAH-20260131-0001
├── customerId (FK → customers)
├── userId (FK → users)
├── amount
├── paymentMethod (CASH, CREDIT_CARD, BANK_TRANSFER, CHECK)
├── collectionDate
├── notes
├── checkNumber (opsiyonel)
├── checkDate (opsiyonel)
├── bankName (opsiyonel)
├── referenceNumber (opsiyonel)
├── createdAt
└── updatedAt
```

### 2. Collection Allocations Tablosu

Tahsilatın hangi satışlara nasıl dağıtıldığını kaydeder.

```sql
collection_allocations
├── id (PK)
├── collectionId (FK → collections)
├── transactionId (FK → transactions)
├── amount
└── createdAt
```

## 🚀 Kurulum Adımları

### Adım 1: SQL Migration'ı Çalıştır

```bash
cd optimus-vet
psql -U postgres -d optimusvet -f prisma/migrations/tahsilat_sistemi.sql
```

VEYA PostgreSQL client ile:

```sql
-- SQL dosyasının içeriğini kopyalayıp çalıştırın
\i prisma/migrations/tahsilat_sistemi.sql
```

### Adım 2: Prisma Schema Güncellendi

Schema'ya şu modeller eklendi:

- ✅ `Collection` modeli
- ✅ `CollectionAllocation` modeli
- ✅ `Customer` → `collections` ilişkisi
- ✅ `Transaction` → `allocations` ilişkisi
- ✅ `User` → `collections` ilişkisi

### Adım 3: Prisma Client'ı Yeniden Generate Et

```bash
cd optimus-vet
npx prisma generate
```

### Adım 4: Migration'ı Doğrula

```bash
npx prisma db pull
npx prisma validate
```

## 📝 Kullanım Örnekleri

### Örnek 1: Müşteriden Nakit Tahsilat

```typescript
// 1. Tahsilat kaydı oluştur
const collection = await prisma.collection.create({
  data: {
    customerId: "customer-id-123",
    userId: "user-id-456",
    amount: 5000.0,
    paymentMethod: "CASH",
    collectionDate: new Date(),
    notes: "Nakit tahsilat",
  },
});

// 2. Müşterinin bekleyen satışlarını getir (FIFO - en eski önce)
const pendingSales = await prisma.transaction.findMany({
  where: {
    customerId: "customer-id-123",
    type: "SALE",
    status: { in: ["PENDING", "PARTIAL"] },
  },
  orderBy: { date: "asc" },
});

// 3. Tahsilatı satışlara dağıt
let remainingAmount = 5000.0;

for (const sale of pendingSales) {
  if (remainingAmount <= 0) break;

  const unpaidAmount = sale.total - sale.paidAmount;
  const allocationAmount = Math.min(remainingAmount, unpaidAmount);

  // Allocation kaydı oluştur
  await prisma.collectionAllocation.create({
    data: {
      collectionId: collection.id,
      transactionId: sale.id,
      amount: allocationAmount,
    },
  });

  // Transaction'ı güncelle
  const newPaidAmount = sale.paidAmount + allocationAmount;
  await prisma.transaction.update({
    where: { id: sale.id },
    data: {
      paidAmount: newPaidAmount,
      status: newPaidAmount >= sale.total ? "PAID" : "PARTIAL",
    },
  });

  remainingAmount -= allocationAmount;
}

// 4. Müşteri bakiyesini güncelle
await prisma.customer.update({
  where: { id: "customer-id-123" },
  data: {
    balance: { decrement: 5000.0 - remainingAmount },
  },
});
```

### Örnek 2: Çekle Tahsilat

```typescript
const collection = await prisma.collection.create({
  data: {
    customerId: "customer-id-123",
    userId: "user-id-456",
    amount: 10000.0,
    paymentMethod: "CHECK",
    collectionDate: new Date(),
    checkNumber: "123456789",
    checkDate: new Date("2026-02-15"),
    bankName: "Ziraat Bankası",
    notes: "Vadeli çek",
  },
});
```

### Örnek 3: Banka Havalesi ile Tahsilat

```typescript
const collection = await prisma.collection.create({
  data: {
    customerId: "customer-id-123",
    userId: "user-id-456",
    amount: 7500.0,
    paymentMethod: "BANK_TRANSFER",
    collectionDate: new Date(),
    referenceNumber: "REF-2026-001234",
    bankName: "İş Bankası",
    notes: "EFT ile tahsilat",
  },
});
```

## 🔍 Sorgular

### Müşterinin Tüm Tahsilatlarını Görüntüle

```sql
SELECT
  c.code,
  c.amount,
  c.paymentMethod,
  c.collectionDate,
  cu.name as customer_name,
  u.name as collected_by
FROM collections c
JOIN customers cu ON c.customerId = cu.id
JOIN users u ON c.userId = u.id
WHERE c.customerId = 'customer-id-123'
ORDER BY c.collectionDate DESC;
```

### Tahsilatın Dağılımını Görüntüle

```sql
SELECT
  ca.amount as allocated_amount,
  t.code as transaction_code,
  t.total as transaction_total,
  t.paidAmount as transaction_paid,
  t.date as transaction_date,
  t.status
FROM collection_allocations ca
JOIN transactions t ON ca.transactionId = t.id
WHERE ca.collectionId = 'collection-id-789'
ORDER BY t.date ASC;
```

### Müşterinin Bakiye Durumu

```sql
SELECT
  c.name,
  c.balance,
  COUNT(t.id) as pending_sales_count,
  SUM(CASE WHEN t.status IN ('PENDING', 'PARTIAL') THEN t.total - t.paidAmount ELSE 0 END) as total_unpaid
FROM customers c
LEFT JOIN transactions t ON c.id = t.customerId AND t.type = 'SALE'
WHERE c.id = 'customer-id-123'
GROUP BY c.id, c.name, c.balance;
```

## 🔐 Transaction Safety

Tüm tahsilat işlemleri Prisma transaction içinde yapılmalıdır:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Collection oluştur
  const collection = await tx.collection.create({...});

  // 2. Allocations oluştur
  for (const allocation of allocations) {
    await tx.collectionAllocation.create({...});
    await tx.transaction.update({...});
  }

  // 3. Customer balance güncelle
  await tx.customer.update({...});
});
```

## 📊 Raporlama

### Günlük Tahsilat Raporu

```sql
SELECT
  DATE(collectionDate) as date,
  paymentMethod,
  COUNT(*) as collection_count,
  SUM(amount) as total_amount
FROM collections
WHERE collectionDate >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(collectionDate), paymentMethod
ORDER BY date DESC, paymentMethod;
```

### Müşteri Bazlı Tahsilat Özeti

```sql
SELECT
  cu.name,
  COUNT(c.id) as collection_count,
  SUM(c.amount) as total_collected,
  cu.balance as remaining_balance
FROM customers cu
LEFT JOIN collections c ON cu.id = c.customerId
GROUP BY cu.id, cu.name, cu.balance
HAVING COUNT(c.id) > 0
ORDER BY total_collected DESC;
```

## 🎯 API Endpoint Önerileri

### POST /api/collections

Yeni tahsilat kaydı oluştur ve otomatik dağıt.

**Request Body:**

```json
{
  "customerId": "customer-id-123",
  "amount": 5000.0,
  "paymentMethod": "CASH",
  "notes": "Nakit tahsilat",
  "checkNumber": null,
  "checkDate": null,
  "bankName": null,
  "referenceNumber": null
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "collection": {
      "id": "collection-id-789",
      "code": "TAH-20260131-0001",
      "amount": 5000.0,
      "allocatedAmount": 5000.0,
      "remainingAmount": 0
    },
    "allocations": [
      {
        "transactionId": "trans-001",
        "transactionCode": "SAT-20260115-0001",
        "amount": 3000.0
      },
      {
        "transactionId": "trans-002",
        "transactionCode": "SAT-20260120-0001",
        "amount": 2000.0
      }
    ],
    "customerBalance": 0
  }
}
```

### GET /api/collections?customerId=xxx

Müşterinin tahsilat geçmişini listele.

### GET /api/collections/:id

Tahsilat detayını ve dağılımını görüntüle.

## ⚠️ Önemli Notlar

1. **FIFO Mantığı**: Tahsilatlar her zaman en eski satıştan başlayarak dağıtılır.
2. **Transaction Safety**: Tüm işlemler atomik olmalıdır (ya hepsi başarılı ya hiçbiri).
3. **Bakiye Kontrolü**: Tahsilat sonrası müşteri bakiyesi negatif olmamalıdır.
4. **Kod Oluşturma**: Tahsilat kodu otomatik oluşturulur (TAH-YYYYMMDD-XXXX).
5. **Silme İşlemi**: Collection silinirse allocations da cascade olarak silinir.

## 🔄 Rollback (Geri Alma)

Eğer migration'ı geri almak isterseniz:

```sql
-- SQL dosyasının sonundaki ROLLBACK bölümünü çalıştırın
DROP TRIGGER IF EXISTS update_collections_updated_at ON "collections";
DROP TRIGGER IF EXISTS collection_code_trigger ON "collections";
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS generate_collection_code();
DROP SEQUENCE IF EXISTS collection_code_seq;
DROP TABLE IF EXISTS "collection_allocations";
DROP TABLE IF EXISTS "collections";
```

## ✅ Test Senaryoları

1. ✅ Müşteriden 5000 TL nakit tahsilat → 2 satışa dağıt
2. ✅ Müşteriden 10000 TL çekle tahsilat → 3 satışa dağıt
3. ✅ Tahsilat miktarı satış toplamından fazla → Kalan bakiye müşteride kalır
4. ✅ Tahsilat sonrası müşteri bakiyesi sıfırlanır
5. ✅ Transaction rollback → Hiçbir değişiklik yapılmaz

## 📞 Destek

Sorularınız için: erkan@optimusvet.com
