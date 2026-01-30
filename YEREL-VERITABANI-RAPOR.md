# 📊 Yerel Veritabanı Yükleme Raporu

**Tarih:** 30 Ocak 2026  
**Veritabanı:** localhost:5432 (optimusvet)

---

## ✅ TAMAMLANAN İŞLEMLER

### 1. Satış Verileri Yükleme

- ✅ Tüm eski satışlar silindi
- ✅ Excel'den **16,927 satış** yüklendi
- ✅ **22,077 satış kalemi** eklendi
- ⏭️ **264 satış** atlandı (tutar/detay yok)

### 2. Satış Detayları Eşleştirme

- ✅ `satis.xlsx` ve `satisdetay.xlsx` birleştirildi
- ✅ **17,109 satış** detaylı
- ✅ **82 satış** detaysız (sadece toplam tutar)

### 3. Müşteri Bakiyeleri

- ✅ Tüm bakiyeler sıfırlandı
- ✅ Satışlar bakiyelere eklendi
- ✅ Tahsilatlar bakiyelerden çıkarıldı

---

## 📈 VERİTABANI İSTATİSTİKLERİ

### Müşteri Durumu

| Kategori             | Sayı  |
| -------------------- | ----- |
| **Toplam Müşteri**   | 2,315 |
| **Alacaklı Müşteri** | 1,205 |
| **Borçlu Müşteri**   | 1,077 |
| **Bakiye Sıfır**     | 33    |

### Finansal Özet

| İşlem Tipi     | Adet   | Toplam Tutar        |
| -------------- | ------ | ------------------- |
| **Satış**      | 16,927 | 15.032.952,10 TL    |
| **Tahsilat**   | 14,202 | 12.561.477,50 TL    |
| **Net Alacak** | -      | **2.471.474,60 TL** |

### Bakiye Dağılımı

- **Toplam Alacak:** 11.604.412,60 TL (1,205 müşteri)
- **Toplam Borç:** 9.132.938,00 TL (1,077 müşteri)
- **Net Durum:** +2.471.474,60 TL

---

## 🏆 EN YÜKSEK ALACAKLI 10 MÜŞTERİ

| #   | Müşteri               | Kod      | Alacak        | İşlem Sayısı |
| --- | --------------------- | -------- | ------------- | ------------ |
| 1   | Ibrahim AKTAG         | MUS-159  | 512.700,00 TL | 286          |
| 2   | Muhammet TEKİN        | MUS-2162 | 251.950,00 TL | 53           |
| 3   | Volkan Dursun KALAFAT | MUS-106  | 233.700,00 TL | 215          |
| 4   | Haydar UZULMEZ        | MUS-1743 | 162.950,00 TL | 48           |
| 5   | Hasan MUTLU           | MUS-139  | 137.668,00 TL | 122          |
| 6   | Turkay DEMIRHAN       | MUS-063  | 133.793,00 TL | 242          |
| 7   | Eray UCAR             | MUS-1971 | 130.170,00 TL | 47           |
| 8   | Ahmet ARSLAN          | MUS-2050 | 128.568,00 TL | 47           |
| 9   | Mustafa OKTAY         | MUS-2281 | 125.000,00 TL | 23           |
| 10  | Saban GUNES           | MUS-127  | 124.414,00 TL | 86           |

---

## 📋 EXCEL DOSYALARI

### Kullanılan Dosyalar

- ✅ `D:\VTCLN\musteri.xlsx` - 2,315 müşteri
- ✅ `D:\VTCLN\satis.xlsx` - 17,191 satış
- ✅ `D:\VTCLN\satisdetay.xlsx` - 22,286 detay
- ✅ `D:\VTCLN\musteritahsilat.xlsx` - 14,202 tahsilat

### Eşleştirme Başarısı

- ✅ **2,315/2,315** müşteri eşleşti (%100)
- ✅ **16,927/17,191** satış yüklendi (%98.5)
- ✅ **22,077/22,286** detay yüklendi (%99.1)

---

## ⚠️ ATLANAN KAYITLAR

### 264 Satış Atlandı

**Neden:** Tutar ve detay bilgisi yok

**Örnekler:**

- Satış 246: Müşteri 195, Tutar: undefined
- Satış 715: Müşteri 134, Tutar: 0
- Satış 764: Müşteri 448, Tutar: undefined

**Not:** Bu kayıtlar muhtemelen iptal edilmiş veya taslak kayıtlardır.

### 209 Satış Detayı Atlandı

**Neden:** Ürün bulunamadı (Excel'de var ama database'de yok)

---

## 🔧 KULLANILAN SCRIPT'LER

### 1. Analiz Script'i

```bash
npx tsx scripts/analyze-sales-details.ts
```

- Excel dosyalarını analiz eder
- İlişkileri kontrol eder
- Tutar eşleşmelerini doğrular

### 2. Import Script'i

```bash
npx tsx scripts/reset-and-import-all-sales.ts
```

- Database'i temizler
- Satışları yükler
- Satış detaylarını ekler
- Batch processing (500'lük gruplar)

### 3. Bakiye Hesaplama Script'i

```bash
npx tsx scripts/recalculate-all-balances.ts
```

- Tüm bakiyeleri sıfırlar
- Satışları ekler
- Tahsilatları çıkarır
- Doğrulama yapar

---

## ✅ SONUÇ

Yerel veritabanına **başarıyla** yükleme yapıldı:

- ✅ 16,927 satış
- ✅ 22,077 satış kalemi
- ✅ 14,202 tahsilat
- ✅ 2,315 müşteri bakiyesi güncellendi

**Veri Bütünlüğü:** %98.5 (16,927/17,191)

---

## 📝 NOTLAR

1. **Sunucu Yüklemesi:** Sunucuya yükleme işlemini sen yapacaksın
2. **Script Konumu:** Tüm script'ler `optimus-vet/scripts/` klasöründe
3. **Bağlantı Bilgileri:** Script'lerde `localhost:5432` kullanılıyor
4. **Backup:** İşlem öncesi backup alındı mı kontrol et

---

**Hazırlayan:** Kiro AI  
**Tarih:** 30 Ocak 2026, 15:30
