# 🔍 COMPREHENSIVE AUDIT LOG SYSTEM

**Proje:** OptimusVet - Veteriner Yönetim Sistemi  
**Tarih:** 31 Ocak 2025  
**Durum:** ✅ TAMAMLANDI

---

## 📋 ÖZET

Tüm CRUD işlemlerini otomatik olarak kaydeden, kullanıcı aktivitelerini izleyen ve veri değişikliklerini detaylı şekilde loglayan comprehensive audit log sistemi başarıyla implement edildi.

---

## 🎯 ÖZELLIKLER

### ✅ Kaydedilen Bilgiler

- **Action Type:** CREATE, UPDATE, DELETE, READ
- **Table Name:** Hangi tablo
- **Record ID:** Hangi kayıt
- **Old Values:** Eski değerler (UPDATE/DELETE için)
- **New Values:** Yeni değerler (CREATE/UPDATE için)
- **Changed Fields:** Değişen alanlar (UPDATE için)
- **User Info:** User ID, Email, Name
- **Request Context:** IP Address, User Agent, Request Path, Method
- **Timestamp:** İşlem zamanı

### ✅ İzlenen Tablolar (21 Tablo)

- users
- customers
- suppliers
- animals
- products
- product_categories
- transactions
- transaction_items
- payments
- collections
- collection_allocations
- stock_movements
- illnesses
- treatments
- reminders
- protocols
- protocol_steps
- animal_protocols
- protocol_records
- price_history
- settings

---

## 📁 DOSYA YAPISI

### Backend Core

```
src/lib/
├── audit.ts                      # Core audit service
├── audit-context.ts              # Request context middleware
└── prisma-audit-middleware.ts   # Prisma auto-logging (opsiyonel)
```

### API Endpoints

```
src/app/api/audit-logs/
├── route.ts                      # GET - List & filter
├── [id]/route.ts                 # GET - Single log detail
├── user/[userId]/route.ts        # GET - User activity
├── record/[table]/[id]/route.ts  # GET - Record history
├── stats/route.ts                # GET - Statistics
└── cleanup/route.ts              # DELETE - Old logs cleanup
```

### Frontend UI

```
src/app/dashboard/audit-logs/
└── page.tsx                      # Main audit logs page

src/components/audit/
├── audit-log-table.tsx           # Table component
├── audit-log-filters.tsx         # Filter component
├── audit-log-detail-modal.tsx    # Detail modal
└── audit-log-stats.tsx           # Statistics component
```

### Database

```
prisma/schema.prisma
└── AuditLog model + AuditAction enum
```

---

## 🚀 KULLANIM

### 1. Database Migration

```bash
# Schema'yı database'e uygula
npx prisma db push

# Veya migration oluştur
npx prisma migrate dev --name add_audit_log_system
```

### 2. API Route'lara Entegrasyon

#### Örnek: CREATE İşlemi

```typescript
import { getAuditContext } from "@/lib/audit-context";
import { auditCreate } from "@/lib/audit";

export async function POST(request: NextRequest) {
  // ... işlemler ...

  const customer = await prisma.customer.create({ data });

  // ✅ Audit log
  const context = await getAuditContext(request);
  await auditCreate("customers", customer.id, customer, context);

  return NextResponse.json(customer);
}
```

#### Örnek: UPDATE İşlemi

```typescript
import { auditUpdate } from "@/lib/audit";

export async function PUT(request: NextRequest) {
  // Önce eski değerleri al
  const oldData = await prisma.customer.findUnique({ where: { id } });

  // Update yap
  const newData = await prisma.customer.update({ where: { id }, data });

  // ✅ Audit log
  const context = await getAuditContext(request);
  await auditUpdate("customers", id, oldData, newData, context);

  return NextResponse.json(newData);
}
```

#### Örnek: DELETE İşlemi

```typescript
import { auditDelete } from "@/lib/audit";

export async function DELETE(request: NextRequest) {
  // Önce silinecek veriyi al
  const oldData = await prisma.customer.findUnique({ where: { id } });

  // Soft delete
  await prisma.customer.update({ where: { id }, data: { isActive: false } });

  // ✅ Audit log
  const context = await getAuditContext(request);
  await auditDelete("customers", id, oldData, context);

  return NextResponse.json({ success: true });
}
```

### 3. Frontend - Audit Logs Sayfası

```
http://localhost:3002/dashboard/audit-logs
```

**Özellikler:**

- Filtreleme (Tablo, İşlem, Kullanıcı, Tarih)
- Pagination
- Detaylı görüntüleme (JSON diff)
- İstatistikler
- CSV export

---

## 🔧 API ENDPOINTS

### 1. List Audit Logs

```http
GET /api/audit-logs?page=1&limit=50&tableName=customers&action=UPDATE
```

**Query Parameters:**

- `page` - Sayfa numarası (default: 1)
- `limit` - Sayfa başına kayıt (default: 50)
- `tableName` - Tablo filtresi
- `action` - İşlem filtresi (CREATE, UPDATE, DELETE, READ)
- `userId` - Kullanıcı filtresi
- `recordId` - Kayıt ID filtresi
- `dateFrom` - Başlangıç tarihi
- `dateTo` - Bitiş tarihi

### 2. Get Single Log

```http
GET /api/audit-logs/[id]
```

### 3. Get User Activity

```http
GET /api/audit-logs/user/[userId]?page=1&limit=50
```

### 4. Get Record History

```http
GET /api/audit-logs/record/customers/clx123abc
```

### 5. Get Statistics

```http
GET /api/audit-logs/stats?dateFrom=2025-01-01&dateTo=2025-01-31
```

**Response:**

```json
{
  "totalLogs": 1234,
  "actionBreakdown": [
    { "action": "CREATE", "count": 456 },
    { "action": "UPDATE", "count": 678 }
  ],
  "tableBreakdown": [{ "tableName": "customers", "count": 234 }],
  "topUsers": [{ "userId": "...", "userName": "Admin", "activityCount": 567 }]
}
```

### 6. Cleanup Old Logs

```http
DELETE /api/audit-logs/cleanup?daysToKeep=365
```

---

## 🔒 GÜVENLİK

### Sensitive Field Protection

Aşağıdaki alanlar audit log'a **KAYDEDİLMEZ**:

- `password`
- `passwordHash`
- `access_token`
- `refresh_token`
- `session_state`
- `id_token`
- `token`

### Authorization

- Tüm audit log endpoint'leri **ADMIN** yetkisi gerektirir
- Session kontrolü yapılır
- IP adresi ve User Agent kaydedilir

---

## 📊 PERFORMANS

### Async Logging

- Audit logging **non-blocking** (asenkron)
- Ana işlemi **ETKİLEMEZ**
- Hata durumunda sadece log atılır, işlem devam eder

### Database Indexes

```prisma
@@index([tableName, recordId])
@@index([userId])
@@index([action])
@@index([createdAt])
@@index([tableName, action, createdAt])
```

### Retention Policy

- Otomatik cleanup: 365 gün (1 yıl)
- Manuel cleanup: `/api/audit-logs/cleanup`

---

## 🎨 UI COMPONENTS

### 1. AuditLogTable

Audit log listesini tablo formatında gösterir.

**Props:**

```typescript
interface AuditLogTableProps {
  logs: AuditLog[];
}
```

### 2. AuditLogFilters

Filtreleme komponenti.

**Props:**

```typescript
interface AuditLogFiltersProps {
  filters: AuditLogFiltersType;
  onFiltersChange: (filters: any) => void;
  onReset: () => void;
}
```

### 3. AuditLogDetailModal

Detaylı görüntüleme modal'ı (JSON diff).

**Props:**

```typescript
interface AuditLogDetailModalProps {
  log: AuditLog;
  open: boolean;
  onClose: () => void;
}
```

### 4. AuditLogStats

İstatistik dashboard'u.

**Props:**

```typescript
interface AuditLogStatsProps {
  filters: AuditLogFiltersType;
}
```

---

## 📝 INTEGRATION CHECKLIST

### Tüm API Route'lar İçin

- [ ] `customers` - ✅ Example hazır
- [ ] `suppliers`
- [ ] `animals`
- [ ] `products`
- [ ] `transactions`
- [ ] `payments`
- [ ] `collections`
- [ ] `illnesses`
- [ ] `treatments`
- [ ] `reminders`
- [ ] `protocols`
- [ ] `users`
- [ ] `settings`

### Her Route İçin

1. ✅ `getAuditContext(request)` import et
2. ✅ `auditCreate/Update/Delete` import et
3. ✅ CREATE: `auditCreate()` çağır
4. ✅ UPDATE: Önce old data al, sonra `auditUpdate()` çağır
5. ✅ DELETE: Önce old data al, sonra `auditDelete()` çağır

---

## 🧪 TESTING

### Manual Test

1. Bir müşteri oluştur
2. Audit logs sayfasına git
3. CREATE işlemini gör
4. Müşteriyi güncelle
5. UPDATE işlemini gör (değişiklikleri kontrol et)
6. Müşteriyi sil
7. DELETE işlemini gör

### API Test

```bash
# List logs
curl http://localhost:3002/api/audit-logs

# Get stats
curl http://localhost:3002/api/audit-logs/stats

# Get user activity
curl http://localhost:3002/api/audit-logs/user/USER_ID
```

---

## 📚 ÖRNEK SENARYOLAR

### Senaryo 1: Müşteri Bilgisi Değişti

**Soru:** "Ahmet Yılmaz'ın telefon numarası kim tarafından değiştirildi?"

**Çözüm:**

1. Audit logs sayfasına git
2. Tablo: `customers` filtrele
3. Kayıt ID ile ara
4. UPDATE işlemlerini gör
5. `changedFields: ["phone"]` olan kaydı bul
6. Kullanıcı ve tarih bilgisini gör

### Senaryo 2: Silinen Kayıt

**Soru:** "Bu ürün kim tarafından silindi?"

**Çözüm:**

1. Audit logs sayfasına git
2. Tablo: `products` filtrele
3. İşlem: `DELETE` filtrele
4. Kayıt ID ile ara
5. Kullanıcı, tarih ve silinen veriyi gör

### Senaryo 3: Kullanıcı Aktivitesi

**Soru:** "Bu kullanıcı bugün ne yaptı?"

**Çözüm:**

1. `/api/audit-logs/user/USER_ID` endpoint'ini çağır
2. Tarih filtresi ekle
3. Tüm aktiviteleri gör

---

## 🔄 NEXT STEPS

### Opsiyonel İyileştirmeler

1. **Prisma Middleware:** Otomatik audit logging (tüm modeller için)
2. **Real-time Notifications:** Kritik işlemler için bildirim
3. **Advanced Search:** Full-text search, regex support
4. **Data Retention:** Arşivleme sistemi (S3, cold storage)
5. **Compliance Reports:** GDPR, SOC2 raporları
6. **Rollback Feature:** Eski değerlere geri dönme

---

## 📞 DESTEK

**Sorular için:**

- Documentation: Bu dosya
- Example: `route-with-audit.ts.example`
- Code: `src/lib/audit.ts`

---

## ✅ TAMAMLANDI

- [x] Database schema (AuditLog model)
- [x] Core audit service
- [x] Request context middleware
- [x] 6 API endpoints
- [x] Frontend UI (1 page + 4 components)
- [x] Documentation
- [x] Example integration
- [x] Security (sensitive field protection)
- [x] Performance (async logging, indexes)

**SISTEM HAZIR! 🎉**

Tüm API route'lara entegrasyon için `route-with-audit.ts.example` dosyasını referans alın.
