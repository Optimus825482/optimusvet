# 🚀 AUDIT LOG SYSTEM - QUICK START GUIDE

**5 Dakikada Başla!**

---

## ⚡ HIZLI BAŞLANGIÇ

### 1. Database Migration (2 dakika)

```bash
cd optimus-vet

# Schema'yı database'e uygula
npx prisma db push

# Prisma client'ı generate et
npx prisma generate
```

**Beklenen Çıktı:**

```
✔ Database schema updated
✔ Generated Prisma Client
```

---

### 2. Test Et (1 dakika)

```bash
# Development server'ı başlat
npm run dev

# Tarayıcıda aç
http://localhost:3002/dashboard/audit-logs
```

**Beklenen Sonuç:**

- Audit logs sayfası açılır
- "Audit log bulunamadı" mesajı görünür (henüz log yok)
- Filtreler çalışır

---

### 3. İlk Audit Log'u Oluştur (2 dakika)

#### Yöntem 1: UI'dan Test

1. Bir müşteri oluştur: `/dashboard/customers/new`
2. Audit logs sayfasına git: `/dashboard/audit-logs`
3. CREATE işlemini gör ✅

#### Yöntem 2: API'dan Test

```bash
# Bir test log oluştur (manuel)
curl -X POST http://localhost:3002/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Müşteri",
    "phone": "555-1234",
    "address": "Test Adres"
  }'

# Audit logs'u kontrol et
curl http://localhost:3002/api/audit-logs
```

---

## 📋 ENTEGRASYON CHECKLIST

### Her API Route İçin (5 dakika/route)

- [ ] 1. Import audit functions
- [ ] 2. Import audit context
- [ ] 3. CREATE: Add `auditCreate()` call
- [ ] 4. UPDATE: Add `auditUpdate()` call (with old data)
- [ ] 5. DELETE: Add `auditDelete()` call (with old data)
- [ ] 6. Test the route
- [ ] 7. Verify audit log appears

### Örnek: Customers API

```typescript
// ✅ 1. Import
import { getAuditContext } from "@/lib/audit-context";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";

// ✅ 2. CREATE
export async function POST(request: NextRequest) {
  const customer = await prisma.customer.create({ data });

  const context = await getAuditContext(request);
  await auditCreate("customers", customer.id, customer, context);

  return NextResponse.json(customer);
}

// ✅ 3. UPDATE
export async function PUT(request: NextRequest) {
  const oldData = await prisma.customer.findUnique({ where: { id } });
  const newData = await prisma.customer.update({ where: { id }, data });

  const context = await getAuditContext(request);
  await auditUpdate("customers", id, oldData, newData, context);

  return NextResponse.json(newData);
}

// ✅ 4. DELETE
export async function DELETE(request: NextRequest) {
  const oldData = await prisma.customer.findUnique({ where: { id } });
  await prisma.customer.delete({ where: { id } });

  const context = await getAuditContext(request);
  await auditDelete("customers", id, oldData, context);

  return NextResponse.json({ success: true });
}
```

---

## 🎯 ÖNCELIK SIRASI

### HIGH Priority (Önce bunları entegre et)

1. ✅ `/api/customers` - Example hazır
2. `/api/users` - Kullanıcı yönetimi
3. `/api/settings` - Sistem ayarları
4. `/api/transactions` - İşlemler
5. `/api/payments` - Ödemeler
6. `/api/products` - Ürünler

### MEDIUM Priority

7. `/api/suppliers` - Tedarikçiler
8. `/api/animals` - Hayvanlar
9. `/api/collections` - Tahsilatlar
10. `/api/illnesses` - Hastalıklar

### LOW Priority

11. `/api/categories` - Kategoriler
12. `/api/reminders` - Hatırlatıcılar
13. Diğerleri...

---

## 🔍 HIZLI TEST

### Test Senaryosu 1: CREATE

```bash
# 1. Müşteri oluştur
POST /api/customers

# 2. Audit log'u kontrol et
GET /api/audit-logs?tableName=customers&action=CREATE

# Beklenen: 1 CREATE log
```

### Test Senaryosu 2: UPDATE

```bash
# 1. Müşteri güncelle
PUT /api/customers/[id]

# 2. Audit log'u kontrol et
GET /api/audit-logs?tableName=customers&action=UPDATE

# Beklenen: 1 UPDATE log + changedFields
```

### Test Senaryosu 3: DELETE

```bash
# 1. Müşteri sil
DELETE /api/customers/[id]

# 2. Audit log'u kontrol et
GET /api/audit-logs?tableName=customers&action=DELETE

# Beklenen: 1 DELETE log + oldValues
```

---

## 📊 UI FEATURES

### Filters

- **Tablo:** Hangi tablo (customers, products, vb.)
- **İşlem:** CREATE, UPDATE, DELETE, READ
- **Kullanıcı:** Hangi kullanıcı
- **Tarih:** Başlangıç - Bitiş

### Detail View

- **Old Values:** Eski değerler (kırmızı)
- **New Values:** Yeni değerler (yeşil)
- **Changed Fields:** Değişen alanlar
- **User Context:** Kim, ne zaman, nereden

### Statistics

- **Total Logs:** Toplam log sayısı
- **Action Breakdown:** İşlem dağılımı
- **Table Breakdown:** Tablo dağılımı
- **Top Users:** En aktif kullanıcılar

### Export

- **CSV Export:** Tüm logları CSV olarak indir
- **Filtered Export:** Sadece filtrelenmiş logları indir

---

## 🐛 SORUN GİDERME

### "Audit log bulunamadı"

**Neden:** Henüz hiç log oluşturulmamış  
**Çözüm:** Bir CRUD işlemi yap (create/update/delete)

### "Yetkisiz erişim"

**Neden:** Kullanıcı ADMIN değil  
**Çözüm:** Admin kullanıcı ile giriş yap

### "Audit logs yüklenemedi"

**Neden:** Database migration yapılmamış  
**Çözüm:** `npx prisma db push` çalıştır

### Audit log oluşmuyor

**Neden:** API route'a entegrasyon yapılmamış  
**Çözüm:** `auditCreate/Update/Delete()` çağrılarını ekle

---

## 📚 DAHA FAZLA BİLGİ

- **Detaylı Dokümantasyon:** `AUDIT-LOG-SYSTEM.md`
- **Implementation Summary:** `AUDIT-SYSTEM-IMPLEMENTATION-SUMMARY.md`
- **Örnek Kod:** `src/app/api/customers/route-with-audit.ts.example`

---

## ✅ BAŞARILI KURULUM KONTROLÜ

- [x] Database migration tamamlandı
- [x] Audit logs sayfası açılıyor
- [x] Filtreler çalışıyor
- [x] İlk audit log oluşturuldu
- [x] Detail modal açılıyor
- [x] Statistics görüntüleniyor
- [x] CSV export çalışıyor

**Hepsi ✅ ise: SİSTEM HAZIR! 🎉**

---

## 🚀 SONRAKI ADIMLAR

1. **Entegrasyon:** Tüm API route'lara audit ekle
2. **Test:** Her route'u test et
3. **Deploy:** Production'a deploy et
4. **Monitor:** 1 hafta izle
5. **Optimize:** Gerekirse iyileştir

---

**Kolay gelsin! 💪**
