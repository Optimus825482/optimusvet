# 🎯 MÜŞTERİ BAKİYE SİSTEMİ DÜZELTMESİ - HIZLI BAŞLANGIÇ

## 🚨 SORUN NEYDİ?

Müşteriden tahsilat yapılınca sistem "bekliyor" diyordu, bakiye güncellenm iyordu.

## ✅ NE YAPILDI?

1. ✅ Tahsilat API'si düzeltildi (transaction içinde atomik çalışıyor)
2. ✅ Payment allocation transaction-safe yapıldı
3. ✅ Satış/Alış işlemleri transaction içine alındı
4. ✅ FIFO mantığı korundu (en eski alacaktan düşer)
5. ✅ Hata durumunda rollback garantisi

## 📁 DEĞİŞEN DOSYALAR

```
optimus-vet/
├── src/
│   ├── app/api/transactions/route.ts  ✅ DÜZELTME
│   └── lib/payment-allocation.ts      ✅ DÜZELTME
├── scripts/
│   └── fix-customer-balances.ts       🆕 YENİ
├── BALANCE_FIX_REPORT.md              🆕 YENİ
├── TEST_BALANCE_SCENARIOS.md          🆕 YENİ
└── package.json                       ✅ GÜNCELLEME
```

## 🚀 HEMEN TEST ET

### 1. Mevcut Verileri Düzelt (Opsiyonel)

Eski yanlış kaydedilmiş bakiyeleri düzeltmek için:

```bash
cd optimus-vet
npm run fix:balances
```

Bu script:

- Tüm müşterilerin bakiyelerini yeniden hesaplar
- Satış durumlarını günceller (PENDING/PARTIAL/PAID)
- Detaylı rapor verir

### 2. Yeni Tahsilat Testi

#### UI Üzerinden:

1. Müşteri seç (örn: Huseyin ERDOGAN Ova)
2. Bakiyeyi not et (örn: +5.050 TL)
3. Tahsilat ekle (örn: 2.000 TL)
4. ✅ Bakiye HEMEN güncellenmeli (+3.050 TL)

#### API Üzerinden:

```bash
curl -X POST http://localhost:3002/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CUSTOMER_PAYMENT",
    "customerId": "customer-id",
    "total": 2000,
    "paymentMethod": "CASH"
  }'
```

### 3. Veresiye Satış Testi

```bash
curl -X POST http://localhost:3002/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SALE",
    "customerId": "customer-id",
    "items": [...],
    "total": 1000,
    "paidAmount": 0,
    "paymentMethod": "CREDIT"
  }'
```

✅ Müşteri bakiyesi +1.000 TL artmalı

## 📊 BAKİYE MANTIK TABLOSU

| İşlem              | Bakiye Değişimi | Açıklama            |
| ------------------ | --------------- | ------------------- |
| **Veresiye Satış** | ⬆️ ARTAR        | Müşteri borçlanıyor |
| **Nakit Satış**    | Değişmez        | Anında ödeme        |
| **Tahsilat**       | ⬇️ AZALIR       | Müşteri borç ödüyor |

## 🧪 DETAYLI TEST SENARYOLARI

Tüm test senaryoları için:

```bash
cat TEST_BALANCE_SCENARIOS.md
```

7 farklı senaryo:

1. ✅ Veresiye Satış
2. ✅ Kısmi Tahsilat
3. ✅ Tam Tahsilat
4. ✅ Çoklu Satış + FIFO
5. ✅ Nakit Satış
6. ✅ Kısmi Ödeme
7. ✅ Transaction Rollback

## 📖 DETAYLI RAPOR

Teknik detaylar için:

```bash
cat BALANCE_FIX_REPORT.md
```

İçerik:

- Sorun analizi
- Kod değişiklikleri
- Güvenlik & atomicity
- Performance karşılaştırması
- Deployment notları

## 🔍 SORUN GİDERME

### Bakiye Hala Güncellenmiyor?

1. **Cache temizle:**

```bash
# Browser cache
Ctrl+Shift+R (veya Cmd+Shift+R)

# Next.js cache
rm -rf .next
npm run dev
```

2. **Database kontrol:**

```sql
-- Müşteri bakiyesi
SELECT id, name, balance FROM customers WHERE name = 'Huseyin ERDOGAN Ova';

-- Son tahsilatlar
SELECT * FROM transactions
WHERE type = 'CUSTOMER_PAYMENT'
ORDER BY date DESC LIMIT 5;
```

3. **Log kontrol:**

```bash
# Terminal'de API loglarını izle
# Tahsilat yaparken hata var mı?
```

### Transaction Hatası Alıyorum?

```bash
# Prisma client'ı yeniden oluştur
npm run db:generate

# Dev server'ı yeniden başlat
npm run dev
```

### Eski Veriler Yanlış?

```bash
# Bakiyeleri düzelt
npm run fix:balances

# Raporu incele
# Script detaylı rapor verecek
```

## 📞 DESTEK

Sorun devam ederse:

1. **Log dosyalarını kontrol et:**
   - Browser Console (F12)
   - Terminal (API logs)
   - Database logs

2. **Hata mesajını paylaş:**
   - Hangi işlem yapılıyordu?
   - Hata mesajı neydi?
   - Screenshot varsa ekle

3. **Database durumunu kontrol et:**

```sql
-- Müşteri bilgileri
SELECT * FROM customers WHERE id = 'problematic-customer-id';

-- İşlemler
SELECT * FROM transactions WHERE customerId = 'problematic-customer-id';
```

## ✅ CHECKLIST

Düzeltme tamamlandı mı?

- [ ] Kod değişiklikleri yapıldı
- [ ] `npm run fix:balances` çalıştırıldı
- [ ] UI'da tahsilat testi yapıldı
- [ ] Bakiye HEMEN güncellendi
- [ ] Satış durumu güncellendi (PENDING → PARTIAL/PAID)
- [ ] FIFO mantığı çalışıyor (en eski satıştan düşüyor)
- [ ] Nakit satış bakiyeyi değiştirmiyor
- [ ] Veresiye satış bakiyeyi artırıyor

## 🎉 BAŞARILI!

Tüm testler geçtiyse:
✅ Bakiye sistemi production-ready!
✅ Tahsilatlar anında işleniyor!
✅ FIFO mantığı çalışıyor!
✅ Transaction güvenliği sağlandı!

---

**Son Güncelleme:** 2025-01-XX  
**Durum:** ✅ DÜZELTME TAMAMLANDI
