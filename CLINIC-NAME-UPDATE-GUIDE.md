# Klinik Adı Dinamik Güncelleme Rehberi

## ✅ Tamamlanan İşlemler

### 1. Settings API - Veritabanı Entegrasyonu

- ✅ `/api/settings` GET endpoint - Ayarları yükler
- ✅ `/api/settings` POST endpoint - Ayarları kaydeder
- ✅ Settings sayfası veritabanından ayarları yükler (useEffect)
- ✅ Settings sayfası tüm ayarları veritabanına kaydeder

### 2. Utility Fonksiyonlar

- ✅ `src/lib/settings.ts` oluşturuldu
  - `getClinicSettings()` - Server-side için
  - `getClinicSettingsClient()` - Client-side için

### 3. PDF Library Güncellemesi

- ✅ `src/lib/pdf.ts` güncellendi
  - `generateInvoiceHTML()` - Klinik adını dinamik kullanır
  - `generateStatementHTML()` - Klinik adını dinamik kullanır
  - Footer'da klinik adı dinamik

## 📝 Manuel Güncelleme Gereken Dosyalar

### 1. Sales Detail Page

**Dosya:** `src/app/dashboard/sales/[id]/page.tsx`

**Değişiklik 1:** Import'a useEffect ekle (satır 3)

```typescript
import { useState, useEffect } from "react";
```

**Değişiklik 2:** Component içine clinic settings state ekle (satır 107'den sonra)

```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [clinicSettings, setClinicSettings] = useState({
  name: "OPTIMUS VET",
  phone: "",
  email: "",
  address: "",
});

// Load clinic settings
useEffect(() => {
  async function loadSettings() {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const settings = await response.json();
        setClinicSettings({
          name: settings.clinicName || "OPTIMUS VET",
          phone: settings.clinicPhone || "",
          email: settings.clinicEmail || "",
          address: settings.clinicAddress || "",
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }
  loadSettings();
}, []);
```

**Değişiklik 3:** handlePrint fonksiyonunda clinic bilgilerini güncelle (satır 140 civarı)

```typescript
      clinic: {
        name: clinicSettings.name,
        phone: clinicSettings.phone,
        email: clinicSettings.email,
        address: clinicSettings.address,
      },
```

**Eski kod (silinecek):**

```typescript
      clinic: {
        name: "OPTIMUS VETERİNER",
        phone: "+90 555 123 45 67",
        email: "info@optimusvet.com",
        address: "Veteriner Klinik Adresi",
      },
```

### 2. Calendar Page

**Dosya:** `src/app/dashboard/calendar/page.tsx`

**Değişiklik 1:** Print bölümündeki başlığı güncelle (satır 457 civarı)

```typescript
      <div className="border-b pb-4 mb-8">
        <h1 className="text-2xl font-bold">GÜNLÜK RAPOR - {clinicSettings?.name || "OPTIMUS VET"}</h1>
        <p className="text-lg">
          {format(selectedDate, "d MMMM yyyy EEEE", { locale: tr })}
        </p>
      </div>
```

**Değişiklik 2:** Component başına clinic settings state ekle

```typescript
const [clinicSettings, setClinicSettings] = useState<{ name: string } | null>(
  null,
);

useEffect(() => {
  async function loadSettings() {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const settings = await response.json();
        setClinicSettings({ name: settings.clinicName || "OPTIMUS VET" });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }
  loadSettings();
}, []);
```

## 🎯 Sonuç

Bu değişiklikler yapıldıktan sonra:

1. Ayarlar sayfasından kaydedilen klinik adı veritabanına yazılır
2. PDF faturalarda klinik adı dinamik olarak gösterilir
3. Yazdırma sayfalarında klinik adı dinamik olarak gösterilir
4. Tüm footer'larda klinik adı dinamik olarak gösterilir

## 🔧 Test Adımları

1. Ayarlar sayfasına git (`/dashboard/settings`)
2. "Klinik Adı" alanını değiştir (örn: "VETERİNER KLİNİĞİ ANKARA")
3. "Kaydet" butonuna bas
4. Satışlar sayfasına git ve bir satış detayına tıkla
5. "Yazdır" butonuna bas
6. PDF'de yeni klinik adının göründüğünü kontrol et
7. Takvim sayfasına git ve "Yazdır" butonuna bas
8. Print preview'da yeni klinik adının göründüğünü kontrol et

## 📌 Notlar

- Klinik adı boş bırakılırsa varsayılan olarak "OPTIMUS VET" kullanılır
- PDF'de klinik adı iki kelimeye bölünür (ilk kelime yeşil, geri kalanı siyah)
- Tüm değişiklikler geriye dönük uyumludur (eski veriler çalışmaya devam eder)
