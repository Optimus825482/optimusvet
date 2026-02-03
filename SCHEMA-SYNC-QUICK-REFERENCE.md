# 🚀 Schema Sync Quick Reference

## ✅ Tamamlandı

**Durum:** Local schema sunucu ile senkronize edildi.

---

## 📊 Eklenen Sütunlar

### Customers Tablosu

```typescript
// Adres detayları
neighborhood?: string | null
village?: string | null
postalCode?: string | null
country?: string | null  // default: "Türkiye"
```

### Reminders Tablosu

```typescript
// Tedavi ve hastalık ilişkileri
treatmentId?: string | null
illnessId?: string | null
isActive: boolean  // default: true
dismissedAt?: Date | null
dismissedBy?: string | null
```

---

## 🔗 Yeni Relations

### Treatment Model

```typescript
reminders: Reminder[]  // Tedaviye bağlı hatırlatıcılar
```

### Illness Model

```typescript
reminders: Reminder[]  // Hastalığa bağlı hatırlatıcılar
```

### User Model

```typescript
dismissedReminders: Reminder[]  // Kullanıcının kapattığı hatırlatıcılar
```

---

## 💻 Kullanım Örnekleri

### 1. Customer Adres Detayları

```typescript
// Müşteri oluştur
const customer = await prisma.customer.create({
  data: {
    code: "MUS-001",
    name: "Ahmet Yılmaz",
    city: "İstanbul",
    district: "Kadıköy",
    neighborhood: "Fenerbahçe",
    village: null,
    postalCode: "34726",
    country: "Türkiye",
  },
});

// Adres detaylarını güncelle
await prisma.customer.update({
  where: { id: customerId },
  data: {
    neighborhood: "Moda",
    postalCode: "34710",
  },
});
```

### 2. Tedavi Hatırlatıcısı

```typescript
// Tedavi için hatırlatıcı oluştur
const reminder = await prisma.reminder.create({
  data: {
    userId: user.id,
    type: "TREATMENT",
    title: "Antibiyotik Tedavisi",
    description: "3. gün antibiyotik uygulaması",
    dueDate: new Date("2026-02-07"),
    animalId: animal.id,
    treatmentId: treatment.id,
    illnessId: illness.id,
    isActive: true,
  },
});

// Hatırlatıcıyı kapat
await prisma.reminder.update({
  where: { id: reminder.id },
  data: {
    isActive: false,
    dismissedAt: new Date(),
    dismissedBy: user.id,
  },
});
```

### 3. Aktif Tedavi Hatırlatıcıları

```typescript
// Kullanıcının aktif tedavi hatırlatıcıları
const activeReminders = await prisma.reminder.findMany({
  where: {
    userId: user.id,
    isActive: true,
    isCompleted: false,
    treatmentId: { not: null },
  },
  include: {
    treatment: {
      include: {
        illness: true,
        product: true,
      },
    },
    animal: {
      include: {
        customer: true,
      },
    },
  },
  orderBy: {
    dueDate: "asc",
  },
});
```

### 4. Hastalık Takibi

```typescript
// Hastalık ve tedavi hatırlatıcıları
const illness = await prisma.illness.findUnique({
  where: { id: illnessId },
  include: {
    treatments: {
      include: {
        reminders: {
          where: { isActive: true },
        },
      },
    },
    reminders: {
      where: { isActive: true },
    },
  },
});
```

### 5. Kullanıcı Hatırlatıcı Geçmişi

```typescript
// Kullanıcının kapattığı hatırlatıcılar
const dismissedReminders = await prisma.reminder.findMany({
  where: {
    dismissedBy: user.id,
    isActive: false,
  },
  include: {
    dismissedByUser: true,
    treatment: true,
    illness: true,
  },
  orderBy: {
    dismissedAt: "desc",
  },
});
```

---

## 🔍 Sorgular

### Adres Bazlı Müşteri Arama

```typescript
// Mahalle bazlı arama
const customers = await prisma.customer.findMany({
  where: {
    neighborhood: {
      contains: "Fenerbahçe",
      mode: "insensitive",
    },
    isActive: true,
  },
});

// Köy bazlı arama
const villageCustomers = await prisma.customer.findMany({
  where: {
    village: { not: null },
    city: "Ankara",
  },
});
```

### Tedavi Takibi

```typescript
// Aktif tedavilerin hatırlatıcıları
const treatmentReminders = await prisma.treatment.findMany({
  where: {
    status: "ONGOING",
    reminders: {
      some: {
        isActive: true,
        dueDate: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 gün içinde
        },
      },
    },
  },
  include: {
    reminders: {
      where: { isActive: true },
      orderBy: { dueDate: "asc" },
    },
    illness: {
      include: {
        animal: {
          include: {
            customer: true,
          },
        },
      },
    },
  },
});
```

---

## 🎯 Validation

### Zod Schemas (Güncelleme Gerekebilir)

```typescript
// Customer validation
const customerSchema = z.object({
  code: z.string(),
  name: z.string(),
  city: z.string().optional(),
  district: z.string().optional(),
  neighborhood: z.string().optional(),  // YENİ
  village: z.string().optional(),       // YENİ
  postalCode: z.string().optional(),    // YENİ
  country: z.string().default("Türkiye") // YENİ
});

// Reminder validation
const reminderSchema = z.object({
  userId: z.string(),
  type: z.enum(["PAYMENT_DUE", "VACCINATION", "TREATMENT", ...]),
  title: z.string(),
  dueDate: z.date(),
  treatmentId: z.string().optional(),   // YENİ
  illnessId: z.string().optional(),     // YENİ
  isActive: z.boolean().default(true),  // YENİ
  dismissedAt: z.date().optional(),     // YENİ
  dismissedBy: z.string().optional()    // YENİ
});
```

---

## 📝 Migration Notları

**Sunucu Durumu:**

- ✅ Tüm sütunlar zaten mevcut
- ✅ Foreign key'ler kurulu
- ✅ Index'ler oluşturulmuş
- ✅ Veri güvenli

**Local Durumu:**

- ✅ Schema güncellendi
- ✅ Prisma Client regenerate edildi
- ✅ TypeScript tipleri güncel

**Yapılması Gerekenler:**

- ❌ Hiçbir migration çalıştırmaya gerek yok
- ✅ Development devam edebilir
- ✅ Yeni özellikler kullanılabilir

---

## 🔧 Troubleshooting

### Prisma Client Güncel Değilse

```bash
cd optimus-vet
npx prisma generate
```

### Schema Validation

```bash
npx prisma validate
```

### Database Sync Kontrolü

```bash
npx prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --script
```

---

**Son Güncelleme:** 2026-02-04
**Durum:** ✅ HAZIR
