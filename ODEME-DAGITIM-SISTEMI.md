# 💰 Ödeme Dağıtım Sistemi (FIFO)

## 📋 Sistem Mantığı

### FIFO (First In First Out)

Tahsilat yapıldığında **en eski alacaktan** başlayarak düşer.

### Örnek Senaryo:

#### Başlangıç:

```
Müşteri: Ahmet Yılmaz
Bakiye: 10.000 TL

Satışlar:
1. SAT-001 (01.01.2025) - 3.000 TL → PENDING
2. SAT-002 (15.01.2025) - 4.000 TL → PENDING
3. SAT-003 (20.01.2025) - 3.000 TL → PENDING
```

#### 1. Tahsilat: 5.000 TL

```
Dağılım:
- SAT-001: 3.000 TL → PAID ✅
- SAT-002: 2.000 TL → PARTIAL (4.000'den 2.000 ödendi)
- SAT-003: 0 TL → PENDING

Yeni Bakiye: 5.000 TL
```

#### 2. Tahsilat: 3.000 TL

```
Dağılım:
- SAT-001: 3.000 TL → PAID ✅ (zaten ödendi)
- SAT-002: 4.000 TL → PAID ✅ (kalan 2.000 + 1.000 = 3.000)
- SAT-003: 1.000 TL → PARTIAL (3.000'den 1.000 ödendi)

Yeni Bakiye: 2.000 TL
```

#### 3. Tahsilat: 2.000 TL

```
Dağılım:
- SAT-001: 3.000 TL → PAID ✅
- SAT-002: 4.000 TL → PAID ✅
- SAT-003: 3.000 TL → PAID ✅ (kalan 2.000 ödendi)

Yeni Bakiye: 0 TL
```

---

## 🔧 Teknik Detaylar

### 1. Yeni Tahsilat Eklendiğinde

**Dosya:** `src/lib/payment-allocation.ts`  
**Fonksiyon:** `allocatePaymentToSales()`

```typescript
// API: POST /api/transactions
// Type: CUSTOMER_PAYMENT

1. En eski PENDING/PARTIAL satışları getir (date ASC)
2. Tahsilat tutarını satışlara dağıt:
   - Satış tamamen ödenebiliyorsa → PAID
   - Kısmi ödenebiliyorsa → PARTIAL
   - Ödeme biterse → dur
3. Her satışın paidAmount ve status'unu güncelle
4. Müşteri bakiyesini azalt
```

### 2. Tahsilat Silindiğinde

**Dosya:** `src/lib/payment-allocation.ts`  
**Fonksiyon:** `recalculateCustomerSalesStatus()`

```typescript
// API: DELETE /api/transactions/[id]
// Type: CUSTOMER_PAYMENT

1. Müşterinin tüm tahsilatlarını topla
2. Tüm satışları getir (date ASC)
3. Tahsilatı satışlara yeniden dağıt
4. Her satışın durumunu güncelle
5. Müşteri bakiyesini artır
```

### 3. Satış Eklendiğinde

```typescript
// API: POST /api/transactions
// Type: SALE

1. Satış oluştur (status: PENDING)
2. Müşteri bakiyesini artır
3. Stok düş
```

### 4. Satış Silindiğinde

```typescript
// API: DELETE /api/transactions/[id]
// Type: SALE

1. Satışı sil
2. Müşteri bakiyesini azalt
3. Stok geri yükle
```

---

## 📊 Durum Kodları

| Status      | Türkçe       | Açıklama             |
| ----------- | ------------ | -------------------- |
| `PENDING`   | Bekliyor     | Hiç ödeme yapılmamış |
| `PARTIAL`   | Kısmi Ödendi | Kısmi ödeme yapılmış |
| `PAID`      | Ödendi       | Tamamen ödendi       |
| `CANCELLED` | İptal        | İptal edildi         |

---

## 🎯 Kullanım Örnekleri

### Yeni Tahsilat Ekle

```bash
POST /api/transactions
{
  "type": "CUSTOMER_PAYMENT",
  "customerId": "customer-id",
  "total": 5000,
  "paymentMethod": "CASH",
  "date": "2025-01-30"
}
```

**Sonuç:**

- ✅ Tahsilat oluşturulur
- ✅ En eski alacaklardan düşer
- ✅ Satış durumları güncellenir
- ✅ Müşteri bakiyesi azalır

### Tahsilat Sil

```bash
DELETE /api/transactions/[payment-id]
```

**Sonuç:**

- ✅ Tahsilat silinir
- ✅ Satış durumları yeniden hesaplanır
- ✅ Müşteri bakiyesi artar

---

## ✅ Avantajlar

1. **Adil Dağılım:** En eski borçlar önce ödenir
2. **Otomatik:** Manuel müdahale gerektirmez
3. **Tutarlı:** Her zaman doğru hesaplama
4. **Şeffaf:** Hangi satışın ne kadar ödendiği belli

---

## ⚠️ Önemli Notlar

1. **Tahsilat Satışa Bağlı Değil:** Tahsilat genel müşteri bakiyesine yapılır, belirli bir satışa değil
2. **FIFO Mantığı:** En eski satış önce ödenir
3. **Otomatik Güncelleme:** Tahsilat eklendiğinde/silindiğinde satış durumları otomatik güncellenir
4. **Bakiye Tutarlılığı:** Müşteri bakiyesi her zaman doğru

---

## 🔄 Mevcut Verileri Güncelleme

Mevcut verilerdeki satış durumlarını güncellemek için:

```bash
npx tsx scripts/update-sale-status.ts
```

Bu script:

- ✅ Tüm müşterileri tarar
- ✅ Tahsilatları satışlara dağıtır
- ✅ Satış durumlarını günceller

---

## 📝 Değişiklik Özeti

### Yeni Dosyalar:

1. `src/lib/payment-allocation.ts` - Ödeme dağıtım fonksiyonları
2. `scripts/update-sale-status.ts` - Mevcut verileri güncelleme

### Güncellenen Dosyalar:

1. `src/app/api/transactions/route.ts` - POST işleminde ödeme dağıtımı
2. `src/app/api/transactions/[id]/route.ts` - DELETE işleminde yeniden hesaplama

---

**Hazırlayan:** Kiro AI  
**Tarih:** 30 Ocak 2026  
**Durum:** ✅ Aktif
