# 🧪 MÜŞTERİ BAKİYE TEST SENARYOLARI

Bu dosya müşteri bakiye sisteminin doğru çalıştığını test etmek için kullanılacak senaryoları içerir.

---

## 🎯 TEST AMAÇLARI

1. ✅ Veresiye satış yapılınca bakiye artıyor mu?
2. ✅ Tahsilat yapılınca bakiye azalıyor mu?
3. ✅ FIFO mantığı çalışıyor mu? (En eski alacaktan düşüyor mu?)
4. ✅ Transaction atomicity korunuyor mu?
5. ✅ Satış durumları doğru güncelleniyor mu? (PENDING → PARTIAL → PAID)

---

## 📋 TEST SENARYOLARI

### ✅ Senaryo 1: Veresiye Satış

**Amaç:** Veresiye satış yapılınca müşteri bakiyesi artmalı

**Adımlar:**

1. Yeni müşteri oluştur: "Test Müşteri 1"
2. Başlangıç bakiyesi: 0 TL
3. Satış yap:
   - Ürün: Mama (100 TL)
   - Miktar: 10
   - Toplam: 1.000 TL
   - Ödeme: 0 TL (Veresiye)
   - Ödeme Yöntemi: CREDIT

**Beklenen Sonuç:**

- ✅ Müşteri bakiyesi: +1.000 TL (Alacak - Kırmızı)
- ✅ Satış durumu: PENDING
- ✅ Satış kodu: STS-XXXXXX

**API Request:**

```json
POST /api/sales
{
  "type": "SALE",
  "customerId": "test-customer-1",
  "items": [
    {
      "productId": "product-1",
      "quantity": 10,
      "unitPrice": 100,
      "vatRate": 20,
      "discount": 0
    }
  ],
  "discount": 0,
  "paidAmount": 0,
  "paymentMethod": "CREDIT",
  "date": "2025-01-15T10:00:00Z"
}
```

**Doğrulama:**

```sql
SELECT balance FROM customers WHERE id = 'test-customer-1';
-- Beklenen: 1000

SELECT status, paidAmount, total FROM transactions
WHERE customerId = 'test-customer-1' AND type = 'SALE';
-- Beklenen: status = 'PENDING', paidAmount = 0, total = 1000
```

---

### ✅ Senaryo 2: Kısmi Tahsilat

**Amaç:** Tahsilat yapılınca bakiye azalmalı ve en eski satış kısmi ödenmiş olmalı

**Ön Koşul:** Senaryo 1 tamamlanmış olmalı (Bakiye: +1.000 TL)

**Adımlar:**

1. Müşteri: "Test Müşteri 1" (Bakiye: +1.000 TL)
2. Tahsilat yap:
   - Tutar: 400 TL
   - Ödeme Yöntemi: CASH

**Beklenen Sonuç:**

- ✅ Müşteri bakiyesi: +600 TL (Alacak - Kırmızı)
- ✅ Tahsilat kaydı oluştu: TAH-XXXXXX
- ✅ En eski satış durumu: PARTIAL
- ✅ En eski satış ödenen tutar: 400 TL

**API Request:**

```json
POST /api/transactions
{
  "type": "CUSTOMER_PAYMENT",
  "customerId": "test-customer-1",
  "total": 400,
  "paymentMethod": "CASH",
  "date": "2025-01-16T10:00:00Z",
  "notes": "Kısmi tahsilat"
}
```

**Doğrulama:**

```sql
SELECT balance FROM customers WHERE id = 'test-customer-1';
-- Beklenen: 600

SELECT status, paidAmount, total FROM transactions
WHERE customerId = 'test-customer-1' AND type = 'SALE';
-- Beklenen: status = 'PARTIAL', paidAmount = 400, total = 1000

SELECT * FROM transactions
WHERE customerId = 'test-customer-1' AND type = 'CUSTOMER_PAYMENT';
-- Beklenen: 1 kayıt, total = 400
```

---

### ✅ Senaryo 3: Tam Tahsilat

**Amaç:** Kalan borç tamamen ödenince bakiye sıfırlanmalı

**Ön Koşul:** Senaryo 2 tamamlanmış olmalı (Bakiye: +600 TL)

**Adımlar:**

1. Müşteri: "Test Müşteri 1" (Bakiye: +600 TL)
2. Tahsilat yap:
   - Tutar: 600 TL
   - Ödeme Yöntemi: BANK_TRANSFER

**Beklenen Sonuç:**

- ✅ Müşteri bakiyesi: 0 TL
- ✅ Tahsilat kaydı oluştu: TAH-XXXXXX
- ✅ Tüm satışlar durumu: PAID
- ✅ Tüm satışlar ödenen tutar: total ile eşit

**API Request:**

```json
POST /api/transactions
{
  "type": "CUSTOMER_PAYMENT",
  "customerId": "test-customer-1",
  "total": 600,
  "paymentMethod": "BANK_TRANSFER",
  "date": "2025-01-17T10:00:00Z",
  "notes": "Tam tahsilat"
}
```

**Doğrulama:**

```sql
SELECT balance FROM customers WHERE id = 'test-customer-1';
-- Beklenen: 0

SELECT status, paidAmount, total FROM transactions
WHERE customerId = 'test-customer-1' AND type = 'SALE';
-- Beklenen: status = 'PAID', paidAmount = 1000, total = 1000
```

---

### ✅ Senaryo 4: Çoklu Satış + FIFO Tahsilat

**Amaç:** Birden fazla satış varsa, tahsilat en eski satıştan başlamalı (FIFO)

**Adımlar:**

1. Yeni müşteri oluştur: "Test Müşteri 2"
2. **Satış 1:** 1.000 TL (01.01.2025) - Veresiye
3. **Satış 2:** 2.000 TL (02.01.2025) - Veresiye
4. **Satış 3:** 1.500 TL (03.01.2025) - Veresiye
5. Toplam Bakiye: +4.500 TL
6. **Tahsilat:** 2.500 TL (04.01.2025)

**Beklenen Sonuç:**

- ✅ Müşteri bakiyesi: +2.000 TL
- ✅ Satış 1 (1.000 TL): PAID (1.000 TL ödendi)
- ✅ Satış 2 (2.000 TL): PARTIAL (1.500 TL ödendi)
- ✅ Satış 3 (1.500 TL): PENDING (0 TL ödendi)

**API Requests:**

```json
// Satış 1
POST /api/sales
{
  "type": "SALE",
  "customerId": "test-customer-2",
  "items": [...],
  "total": 1000,
  "paidAmount": 0,
  "date": "2025-01-01T10:00:00Z"
}

// Satış 2
POST /api/sales
{
  "type": "SALE",
  "customerId": "test-customer-2",
  "items": [...],
  "total": 2000,
  "paidAmount": 0,
  "date": "2025-01-02T10:00:00Z"
}

// Satış 3
POST /api/sales
{
  "type": "SALE",
  "customerId": "test-customer-2",
  "items": [...],
  "total": 1500,
  "paidAmount": 0,
  "date": "2025-01-03T10:00:00Z"
}

// Tahsilat
POST /api/transactions
{
  "type": "CUSTOMER_PAYMENT",
  "customerId": "test-customer-2",
  "total": 2500,
  "date": "2025-01-04T10:00:00Z"
}
```

**Doğrulama:**

```sql
SELECT balance FROM customers WHERE id = 'test-customer-2';
-- Beklenen: 2000

SELECT code, date, status, paidAmount, total
FROM transactions
WHERE customerId = 'test-customer-2' AND type = 'SALE'
ORDER BY date ASC;
-- Beklenen:
-- Satış 1: status = 'PAID', paidAmount = 1000, total = 1000
-- Satış 2: status = 'PARTIAL', paidAmount = 1500, total = 2000
-- Satış 3: status = 'PENDING', paidAmount = 0, total = 1500
```

---

### ✅ Senaryo 5: Nakit Satış (Bakiye Değişmemeli)

**Amaç:** Nakit satışta bakiye değişmemeli

**Adımlar:**

1. Müşteri: "Test Müşteri 1" (Bakiye: 0 TL)
2. Satış yap:
   - Ürün: Mama (100 TL)
   - Miktar: 5
   - Toplam: 500 TL
   - Ödeme: 500 TL (Nakit)
   - Ödeme Yöntemi: CASH

**Beklenen Sonuç:**

- ✅ Müşteri bakiyesi: 0 TL (Değişmedi)
- ✅ Satış durumu: PAID
- ✅ Satış ödenen tutar: 500 TL

**API Request:**

```json
POST /api/sales
{
  "type": "SALE",
  "customerId": "test-customer-1",
  "items": [
    {
      "productId": "product-1",
      "quantity": 5,
      "unitPrice": 100,
      "vatRate": 20,
      "discount": 0
    }
  ],
  "discount": 0,
  "paidAmount": 500,
  "paymentMethod": "CASH",
  "date": "2025-01-18T10:00:00Z"
}
```

**Doğrulama:**

```sql
SELECT balance FROM customers WHERE id = 'test-customer-1';
-- Beklenen: 0 (Değişmedi)

SELECT status, paidAmount, total FROM transactions
WHERE customerId = 'test-customer-1' AND type = 'SALE'
ORDER BY date DESC LIMIT 1;
-- Beklenen: status = 'PAID', paidAmount = 500, total = 500
```

---

### ✅ Senaryo 6: Kısmi Ödeme ile Satış

**Amaç:** Satışta kısmi ödeme yapılırsa, kalan tutar bakiyeye eklenmeli

**Adımlar:**

1. Müşteri: "Test Müşteri 3" (Bakiye: 0 TL)
2. Satış yap:
   - Toplam: 1.000 TL
   - Ödeme: 300 TL (Nakit)
   - Kalan: 700 TL (Veresiye)

**Beklenen Sonuç:**

- ✅ Müşteri bakiyesi: +700 TL (Alacak - Kırmızı)
- ✅ Satış durumu: PARTIAL
- ✅ Satış ödenen tutar: 300 TL

**API Request:**

```json
POST /api/sales
{
  "type": "SALE",
  "customerId": "test-customer-3",
  "items": [...],
  "total": 1000,
  "paidAmount": 300,
  "paymentMethod": "CASH",
  "date": "2025-01-19T10:00:00Z"
}
```

**Doğrulama:**

```sql
SELECT balance FROM customers WHERE id = 'test-customer-3';
-- Beklenen: 700

SELECT status, paidAmount, total FROM transactions
WHERE customerId = 'test-customer-3' AND type = 'SALE';
-- Beklenen: status = 'PARTIAL', paidAmount = 300, total = 1000
```

---

### ✅ Senaryo 7: Transaction Rollback (Hata Durumu)

**Amaç:** Hata durumunda tüm işlemler geri alınmalı

**Adımlar:**

1. Müşteri: "Test Müşteri 1" (Bakiye: 0 TL)
2. Satış yap (HATA OLUŞACAK):
   - Ürün: Geçersiz ID
   - Toplam: 1.000 TL

**Beklenen Sonuç:**

- ✅ Müşteri bakiyesi: 0 TL (Değişmedi)
- ✅ Satış kaydı oluşmadı
- ✅ Stok değişmedi
- ✅ Hata mesajı döndü

**API Request:**

```json
POST /api/sales
{
  "type": "SALE",
  "customerId": "test-customer-1",
  "items": [
    {
      "productId": "INVALID-ID", // Geçersiz ID
      "quantity": 10,
      "unitPrice": 100
    }
  ],
  "paidAmount": 0
}
```

**Doğrulama:**

```sql
SELECT balance FROM customers WHERE id = 'test-customer-1';
-- Beklenen: 0 (Değişmedi)

SELECT COUNT(*) FROM transactions
WHERE customerId = 'test-customer-1' AND type = 'SALE'
AND date > NOW() - INTERVAL '1 minute';
-- Beklenen: 0 (Yeni kayıt yok)
```

---

## 🔍 MANUEL TEST ADIMLARI

### 1. UI Üzerinden Test

1. **Müşteri Oluştur:**
   - Müşteriler → Yeni Müşteri
   - İsim: "Test Müşteri UI"
   - Bakiye: 0 TL olmalı

2. **Veresiye Satış Yap:**
   - Satışlar → Yeni Satış
   - Müşteri: Test Müşteri UI
   - Ürün ekle: 1.000 TL
   - Ödeme: 0 TL (Veresiye)
   - Kaydet
   - ✅ Müşteri detayında bakiye +1.000 TL olmalı

3. **Tahsilat Yap:**
   - Müşteri Detay → Tahsilat Ekle
   - Tutar: 400 TL
   - Kaydet
   - ✅ Bakiye +600 TL olmalı
   - ✅ Satış durumu PARTIAL olmalı

4. **Tam Tahsilat Yap:**
   - Müşteri Detay → Tahsilat Ekle
   - Tutar: 600 TL
   - Kaydet
   - ✅ Bakiye 0 TL olmalı
   - ✅ Satış durumu PAID olmalı

### 2. API Üzerinden Test

Postman veya cURL ile yukarıdaki senaryoları test et.

### 3. Database Kontrolü

Her işlemden sonra database'i kontrol et:

```sql
-- Müşteri bakiyesi
SELECT id, name, balance FROM customers WHERE name LIKE 'Test%';

-- Satışlar
SELECT code, type, status, paidAmount, total, date
FROM transactions
WHERE customerId IN (SELECT id FROM customers WHERE name LIKE 'Test%')
ORDER BY date DESC;

-- Tahsilatlar
SELECT code, type, total, date
FROM transactions
WHERE type = 'CUSTOMER_PAYMENT'
ORDER BY date DESC;
```

---

## ✅ TEST SONUÇLARI

| Senaryo                 | Durum       | Notlar |
| ----------------------- | ----------- | ------ |
| 1. Veresiye Satış       | ⏳ Bekliyor | -      |
| 2. Kısmi Tahsilat       | ⏳ Bekliyor | -      |
| 3. Tam Tahsilat         | ⏳ Bekliyor | -      |
| 4. Çoklu Satış + FIFO   | ⏳ Bekliyor | -      |
| 5. Nakit Satış          | ⏳ Bekliyor | -      |
| 6. Kısmi Ödeme          | ⏳ Bekliyor | -      |
| 7. Transaction Rollback | ⏳ Bekliyor | -      |

**Test Tarihi:** **\_**  
**Test Eden:** **\_**  
**Sonuç:** ⏳ Bekliyor / ✅ Başarılı / ❌ Başarısız

---

## 📝 NOTLAR

- Testler sırayla yapılmalı (bazı senaryolar önceki senaryolara bağımlı)
- Her test sonrası database'i kontrol et
- Hata durumlarını logla
- UI ve API testlerini ayrı ayrı yap

---

## 🚀 SONUÇ

Tüm testler başarılı olursa:
✅ Bakiye sistemi production-ready!
