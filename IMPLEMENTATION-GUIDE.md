# 🚀 HAYVAN HASTALIK VE TEDAVİ TAKİP SİSTEMİ - UYGULAMA KILAVUZU

## ✅ TAMAMLANAN BÖLÜMLER

### 1. Backend (100% Tamamlandı)

#### Database Schema

- ✅ Illness modeli eklendi
- ✅ Treatment modeli eklendi
- ✅ İlişkiler kuruldu (Animal → Illness → Treatment → Product)
- ✅ Enum'lar tanımlandı (IllnessStatus, IllnessSeverity, TreatmentStatus)
- ✅ İndeksler eklendi
- ✅ Migration dosyası hazır

#### API Endpoints

- ✅ GET `/api/animals/[id]/illnesses` - Hastalık listesi
- ✅ POST `/api/animals/[id]/illnesses` - Yeni hastalık
- ✅ GET `/api/animals/[id]/illnesses/[illnessId]` - Hastalık detayı
- ✅ PATCH `/api/animals/[id]/illnesses/[illnessId]` - Hastalık güncelleme
- ✅ DELETE `/api/animals/[id]/illnesses/[illnessId]` - Hastalık silme
- ✅ GET `/api/illnesses/[illnessId]/treatments` - Tedavi listesi
- ✅ POST `/api/illnesses/[illnessId]/treatments` - Yeni tedavi
- ✅ GET `/api/treatments/[id]` - Tedavi detayı
- ✅ PATCH `/api/treatments/[id]` - Tedavi güncelleme
- ✅ DELETE `/api/treatments/[id]` - Tedavi silme

#### Validation

- ✅ Zod schemas (illness.ts, treatment.ts)
- ✅ Type-safe validation
- ✅ Error handling

### 2. Frontend Components (80% Tamamlandı)

#### Oluşturulan Components

- ✅ IllnessFormModal - Hastalık ekleme/düzenleme formu
- ✅ TreatmentFormModal - Tedavi ekleme/düzenleme formu

#### Özellikler

- ✅ React Hook Form entegrasyonu
- ✅ Zod validation
- ✅ Turkish locale (tarih formatları)
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Ürün seçimi (combobox)
- ✅ Otomatik maliyet hesaplama

## 🔧 KURULUM ADIMLARI

### Adım 1: Database Migration

```bash
# Terminal'de çalıştır:
cd optimus-vet

# Prisma schema'yı format et
npx prisma format

# Migration'ı çalıştır
npx prisma migrate dev --name add_illness_treatment_models

# Prisma Client'ı yeniden oluştur
npx prisma generate
```

**Beklenen Çıktı:**

```
✔ Generated Prisma Client
✔ The migration has been created successfully
```

### Adım 2: Hayvan Detay Sayfasına Entegrasyon

`src/app/dashboard/animals/[id]/page.tsx` dosyasını güncelle:

#### 2.1. Import'ları Ekle

Dosyanın başına ekle:

```typescript
import { IllnessFormModal } from "@/components/illnesses/illness-form-modal";
import { TreatmentFormModal } from "@/components/illnesses/treatment-form-modal";
import { Activity, Pill } from "lucide-react";
```

#### 2.2. State'leri Ekle

`AnimalDetailPage` component'inde, mevcut state'lerin altına ekle:

```typescript
const [illnessModalOpen, setIllnessModalOpen] = useState(false);
const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
const [selectedIllness, setSelectedIllness] = useState<any>(null);
```

#### 2.3. Hastalık Verilerini Çek

Mevcut `useQuery` hook'unun altına ekle:

```typescript
// Fetch illnesses
const { data: illnesses = [] } = useQuery({
  queryKey: ["illnesses", animalId],
  queryFn: async () => {
    const res = await fetch(`/api/animals/${animalId}/illnesses`);
    if (!res.ok) throw new Error("Hastalıklar yüklenemedi");
    return res.json();
  },
});
```

#### 2.4. Tabs'a Yeni Sekme Ekle

`<TabsList>` içine ekle:

```typescript
<TabsTrigger
  value="illnesses"
  className="rounded-lg px-4 text-[10px] font-black uppercase"
>
  HASTALIK GEÇMİŞİ
</TabsTrigger>
```

#### 2.5. Tab Content Ekle

`<TabsContent value="fertility">` bloğundan sonra ekle:

```typescript
<TabsContent value="illnesses" className="space-y-4 animate-slideUp">
  {illnesses.length > 0 ? (
    illnesses.map((illness: any) => (
      <IllnessCard
        key={illness.id}
        illness={illness}
        onEdit={() => {
          setSelectedIllness(illness);
          setIllnessModalOpen(true);
        }}
        onAddTreatment={() => {
          setSelectedIllness(illness);
          setTreatmentModalOpen(true);
        }}
      />
    ))
  ) : (
    <div className="text-center py-20 bg-slate-50/20 rounded-[3rem] border-2 border-dashed border-slate-100">
      <Activity className="h-16 w-16 mx-auto text-slate-100 mb-6" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
        Henüz hastalık kaydı bulunmuyor
      </p>
      <Button
        variant="outline"
        onClick={() => setIllnessModalOpen(true)}
        className="mt-6 rounded-xl border-slate-200 bg-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        İlk Hastalık Kaydını Oluştur
      </Button>
    </div>
  )}
</TabsContent>
```

#### 2.6. Modal'ları Ekle

Dosyanın sonuna, `<AssignProtocolModal>` altına ekle:

```typescript
{/* Illness Form Modal */}
<IllnessFormModal
  open={illnessModalOpen}
  onOpenChange={(open) => {
    setIllnessModalOpen(open);
    if (!open) setSelectedIllness(null);
  }}
  animalId={animalId}
  illness={selectedIllness}
/>

{/* Treatment Form Modal */}
<TreatmentFormModal
  open={treatmentModalOpen}
  onOpenChange={(open) => {
    setTreatmentModalOpen(open);
    if (!open) setSelectedIllness(null);
  }}
  illnessId={selectedIllness?.id}
  treatment={null}
/>
```

#### 2.7. IllnessCard Component Ekle

Dosyanın sonuna, `ProtocolCard` component'inden sonra ekle:

```typescript
function IllnessCard({
  illness,
  onEdit,
  onAddTreatment,
}: {
  illness: any;
  onEdit: () => void;
  onAddTreatment: () => void;
}) {
  const statusColors = {
    ACTIVE: "bg-blue-50 text-blue-600 border-blue-200",
    RECOVERED: "bg-emerald-50 text-emerald-600 border-emerald-200",
    CHRONIC: "bg-orange-50 text-orange-600 border-orange-200",
    MONITORING: "bg-purple-50 text-purple-600 border-purple-200",
    CANCELLED: "bg-slate-50 text-slate-400 border-slate-200",
  };

  const severityColors = {
    MILD: "bg-green-100 text-green-700",
    MODERATE: "bg-yellow-100 text-yellow-700",
    SEVERE: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  };

  const statusLabels = {
    ACTIVE: "Aktif",
    RECOVERED: "İyileşti",
    CHRONIC: "Kronik",
    MONITORING: "İzleniyor",
    CANCELLED: "İptal",
  };

  const severityLabels = {
    MILD: "Hafif",
    MODERATE: "Orta",
    SEVERE: "Şiddetli",
    CRITICAL: "Kritik",
  };

  return (
    <div className="p-6 rounded-[2rem] border border-slate-100 bg-white hover:bg-slate-50 transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg tracking-tight">
              {illness.name}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
              {formatDate(illness.startDate)}
              {illness.endDate && ` - ${formatDate(illness.endDate)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "rounded-lg font-black text-[10px] uppercase border",
              statusColors[illness.status as keyof typeof statusColors]
            )}
          >
            {statusLabels[illness.status as keyof typeof statusLabels]}
          </Badge>
          <Badge
            className={cn(
              "rounded-lg font-black text-[10px] uppercase",
              severityColors[illness.severity as keyof typeof severityColors]
            )}
          >
            {severityLabels[illness.severity as keyof typeof severityLabels]}
          </Badge>
        </div>
      </div>

      {illness.symptoms && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">
            SEMPTOMLAR
          </p>
          <p className="text-sm text-slate-700">{illness.symptoms}</p>
        </div>
      )}

      {illness.diagnosis && (
        <div className="mb-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
            TEŞHİS
          </p>
          <p className="text-sm text-slate-700">{illness.diagnosis}</p>
        </div>
      )}

      {/* Treatments */}
      {illness.treatments && illness.treatments.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            TEDAVİLER ({illness.treatments.length})
          </p>
          {illness.treatments.map((treatment: any) => (
            <div
              key={treatment.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <Pill className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {treatment.name}
                  </p>
                  {treatment.dosage && (
                    <p className="text-xs text-slate-500">{treatment.dosage}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  ₺{Number(treatment.cost).toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400 uppercase">
                  {treatment.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="rounded-xl flex-1"
        >
          <Edit className="h-3.5 w-3.5 mr-2" />
          Düzenle
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onAddTreatment}
          className="rounded-xl flex-1"
        >
          <Plus className="h-3.5 w-3.5 mr-2" />
          Tedavi Ekle
        </Button>
      </div>
    </div>
  );
}
```

### Adım 3: Test Etme

#### 3.1. Development Server'ı Başlat

```bash
npm run dev
```

#### 3.2. Test Senaryosu

1. **Hayvan Detay Sayfasına Git:**
   - Dashboard → Hayvanlar → Bir hayvan seç

2. **"Hastalık Geçmişi" Sekmesine Tıkla**

3. **Yeni Hastalık Kaydı Oluştur:**
   - "İlk Hastalık Kaydını Oluştur" butonuna tıkla
   - Formu doldur:
     - Hastalık Adı: "Parvovirus"
     - Durum: "Aktif Tedavi"
     - Şiddet: "Şiddetli"
     - Semptomlar: "Kusma, ishal, iştahsızlık"
     - Teşhis: "Parvovirus enfeksiyonu tespit edildi"
   - "Kaydet" butonuna tıkla

4. **Tedavi Ekle:**
   - Oluşturulan hastalık kartında "Tedavi Ekle" butonuna tıkla
   - Formu doldur:
     - İlaç: Stoktan bir ilaç seç
     - Dozaj: "2x1 tablet"
     - Sıklık: "Günde 2 kez"
     - Süre: "7 gün"
     - Maliyet: Otomatik doldurulur
   - "Kaydet" butonuna tıkla

5. **Kontrol Et:**
   - Hastalık kartında tedavi görünmeli
   - Maliyet bilgisi doğru olmalı
   - Durum badge'leri doğru renkte olmalı

## 📊 VERİ AKIŞI

```
Kullanıcı
  ↓
Hayvan Detay Sayfası
  ↓
"Hastalık Geçmişi" Sekmesi
  ↓
IllnessFormModal (Hastalık Ekle)
  ↓
POST /api/animals/[id]/illnesses
  ↓
Prisma → PostgreSQL
  ↓
Hastalık Kaydı Oluşturuldu
  ↓
TreatmentFormModal (Tedavi Ekle)
  ↓
POST /api/illnesses/[illnessId]/treatments
  ↓
Prisma → PostgreSQL
  ↓
Tedavi Kaydı Oluşturuldu
  ↓
Query Invalidation
  ↓
UI Güncellendi
```

## 🎯 ÖZELLİKLER

### Hastalık Yönetimi

- ✅ Hastalık kaydı oluşturma
- ✅ Hastalık düzenleme
- ✅ Hastalık silme
- ✅ Durum takibi (Aktif, İyileşti, Kronik, vb.)
- ✅ Şiddet seviyesi (Hafif, Orta, Şiddetli, Kritik)
- ✅ Semptom ve teşhis kayıtları

### Tedavi Takibi

- ✅ Tedavi planı oluşturma
- ✅ İlaç/ürün seçimi (stok entegrasyonu)
- ✅ Dozaj ve kullanım sıklığı
- ✅ Uygulama yöntemi
- ✅ Maliyet takibi
- ✅ Kontrol tarihleri
- ✅ Tedavi durumu (Planlandı, Devam Ediyor, Tamamlandı)

### UI/UX

- ✅ Modern, responsive tasarım
- ✅ Turkish locale (tarih formatları)
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Form validation
- ✅ Renk kodlu durum badge'leri

## 🔮 GELECEKTEKİ GELİŞTİRMELER

### Kısa Vadeli (1-2 Hafta)

- [ ] Hastalık filtreleme ve arama
- [ ] Tedavi timeline görünümü
- [ ] Dosya ekleme (röntgen, test sonuçları)
- [ ] Hastalık istatistikleri

### Orta Vadeli (1 Ay)

- [ ] Stok entegrasyonu (ilaç kullanımında stok düşümü)
- [ ] Transaction entegrasyonu (tedavi maliyetlerinin faturaya eklenmesi)
- [ ] Reminder sistemi (kontrol tarihi hatırlatıcıları)
- [ ] Raporlama (hastalık özeti, maliyet analizi)

### Uzun Vadeli (2-3 Ay)

- [ ] Hastalık şablonları (sık görülen hastalıklar için)
- [ ] Tedavi protokolleri
- [ ] Veteriner notları ve imza
- [ ] Export/Import (PDF, Excel)
- [ ] Grafik ve analizler

## 🐛 SORUN GİDERME

### Migration Hatası

```bash
# Eğer migration hatası alırsanız:
npx prisma migrate reset
npx prisma migrate dev
```

### Prisma Client Hatası

```bash
# Prisma Client'ı yeniden oluştur:
npx prisma generate
```

### Type Hatası

```bash
# TypeScript cache'i temizle:
rm -rf .next
npm run dev
```

## 📞 DESTEK

Herhangi bir sorun yaşarsanız:

1. Console'da hata mesajlarını kontrol edin
2. Network tab'inde API çağrılarını inceleyin
3. Prisma Studio ile veritabanını kontrol edin: `npx prisma studio`

---

**Durum:** Kuruluma Hazır ✅
**Son Güncelleme:** 31 Ocak 2025
**Versiyon:** 1.0.0
