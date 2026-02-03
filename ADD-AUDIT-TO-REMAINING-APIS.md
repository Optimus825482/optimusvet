# 🔧 KALAN API'LERE AUDIT CONTEXT EKLEME REHBERİ

## ✅ TAMAMLANAN API'LER

- [x] `/api/customers` (POST, PUT, PATCH, DELETE)
- [x] `/api/animals` (POST)

## 📋 EKLENMESİ GEREKEN API'LER

### Yüksek Öncelikli (Kritik İşlemler)

#### 1. Animals API - UPDATE/DELETE

**Dosya:** `src/app/api/animals/[id]/route.ts`

```typescript
import { withAuditContext } from "@/lib/audit-api-helper";
import { auditUpdate, auditDelete, getAuditContext } from "@/lib/audit";

// PUT
export async function PUT(request: NextRequest, { params }) {
  return withAuditContext(request, async () => {
    const { id } = await params;

    // Eski veriyi al
    const oldData = await prisma.animal.findUnique({ where: { id } });

    // Güncelle
    const animal = await prisma.animal.update({ ... });

    // Audit log
    await auditUpdate("animals", id, oldData, animal, getAuditContext());

    return NextResponse.json(animal);
  });
}

// DELETE
export async function DELETE(request: NextRequest, { params }) {
  return withAuditContext(request, async () => {
    const { id } = await params;

    // Eski veriyi al
    const oldData = await prisma.animal.findUnique({ where: { id } });

    // Sil
    await prisma.animal.update({ where: { id }, data: { isActive: false } });

    // Audit log
    await auditDelete("animals", id, oldData, getAuditContext());

    return NextResponse.json({ message: "Silindi" });
  });
}
```

#### 2. Products API

**Dosyalar:**

- `src/app/api/products/route.ts` (POST)
- `src/app/api/products/[id]/route.ts` (PUT, DELETE)

```typescript
// POST
export async function POST(request: NextRequest) {
  return withAuditContext(request, async () => {
    const product = await prisma.product.create({ ... });
    await auditCreate("products", product.id, product, getAuditContext());
    return NextResponse.json(product);
  });
}

// PUT
export async function PUT(request: NextRequest, { params }) {
  return withAuditContext(request, async () => {
    const { id } = await params;
    const oldData = await prisma.product.findUnique({ where: { id } });
    const product = await prisma.product.update({ ... });
    await auditUpdate("products", id, oldData, product, getAuditContext());
    return NextResponse.json(product);
  });
}

// DELETE
export async function DELETE(request: NextRequest, { params }) {
  return withAuditContext(request, async () => {
    const { id } = await params;
    const oldData = await prisma.product.findUnique({ where: { id } });
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    await auditDelete("products", id, oldData, getAuditContext());
    return NextResponse.json({ message: "Silindi" });
  });
}
```

#### 3. Transactions API

**Dosyalar:**

- `src/app/api/transactions/route.ts` (POST)
- `src/app/api/transactions/[id]/route.ts` (PUT, DELETE)

```typescript
// POST
export async function POST(request: NextRequest) {
  return withAuditContext(request, async () => {
    const transaction = await prisma.transaction.create({ ... });
    await auditCreate("transactions", transaction.id, transaction, getAuditContext());
    return NextResponse.json(transaction);
  });
}

// PUT
export async function PUT(request: NextRequest, { params }) {
  return withAuditContext(request, async () => {
    const { id } = await params;
    const oldData = await prisma.transaction.findUnique({ where: { id } });
    const transaction = await prisma.transaction.update({ ... });
    await auditUpdate("transactions", id, oldData, transaction, getAuditContext());
    return NextResponse.json(transaction);
  });
}

// DELETE
export async function DELETE(request: NextRequest, { params }) {
  return withAuditContext(request, async () => {
    const { id } = await params;
    const oldData = await prisma.transaction.findUnique({ where: { id } });
    await prisma.transaction.delete({ where: { id } });
    await auditDelete("transactions", id, oldData, getAuditContext());
    return NextResponse.json({ message: "Silindi" });
  });
}
```

#### 4. Suppliers API

**Dosyalar:**

- `src/app/api/suppliers/route.ts` (POST)
- `src/app/api/suppliers/[id]/route.ts` (PUT, DELETE)

```typescript
// Aynı pattern - customers gibi
```

#### 5. Payments API

**Dosya:** `src/app/api/payments/route.ts`

```typescript
// POST
export async function POST(request: NextRequest) {
  return withAuditContext(request, async () => {
    const payment = await prisma.payment.create({ ... });
    await auditCreate("payments", payment.id, payment, getAuditContext());
    return NextResponse.json(payment);
  });
}
```

### Orta Öncelikli

#### 6. Reminders API

- `src/app/api/reminders/route.ts` (POST, PATCH)
- `src/app/api/reminders/[id]/route.ts` (PUT, PATCH, DELETE)

#### 7. Protocols API

- `src/app/api/protocols/route.ts` (POST)
- `src/app/api/protocols/[id]/route.ts` (PUT, DELETE)

#### 8. Illnesses API

- `src/app/api/illnesses/route.ts` (POST)
- `src/app/api/illnesses/[illnessId]/route.ts` (PATCH, DELETE)

#### 9. Treatments API

- `src/app/api/treatments/[id]/route.ts` (PATCH, DELETE)

### Düşük Öncelikli

#### 10. Settings API

- `src/app/api/settings/route.ts` (POST)

#### 11. Users API

- `src/app/api/users/route.ts` (POST)
- `src/app/api/users/[id]/route.ts` (PATCH)

#### 12. Categories API

- `src/app/api/categories/route.ts` (POST)

---

## 🎯 HIZLI UYGULAMA PATTERN'I

### 1. Import Ekle

```typescript
import { withAuditContext } from "@/lib/audit-api-helper";
import {
  auditCreate,
  auditUpdate,
  auditDelete,
  getAuditContext,
} from "@/lib/audit";
```

### 2. CREATE (POST)

```typescript
export async function POST(request: NextRequest) {
  return withAuditContext(request, async () => {
    // ... existing code ...
    const data = await prisma.model.create({ ... });

    // ✅ Audit log ekle
    await auditCreate("table_name", data.id, data, getAuditContext()).catch(console.error);

    return NextResponse.json(data);
  });
}
```

### 3. UPDATE (PUT/PATCH)

```typescript
export async function PUT(request: NextRequest, { params }) {
  return withAuditContext(request, async () => {
    const { id } = await params;

    // ✅ Eski veriyi al
    const oldData = await prisma.model.findUnique({ where: { id } });

    // ... existing code ...
    const data = await prisma.model.update({ ... });

    // ✅ Audit log ekle
    if (oldData) {
      await auditUpdate("table_name", id, oldData, data, getAuditContext()).catch(console.error);
    }

    return NextResponse.json(data);
  });
}
```

### 4. DELETE

```typescript
export async function DELETE(request: NextRequest, { params }) {
  return withAuditContext(request, async () => {
    const { id } = await params;

    // ✅ Eski veriyi al
    const oldData = await prisma.model.findUnique({ where: { id } });

    // ... existing code ...
    await prisma.model.delete({ where: { id } });
    // veya soft delete:
    // await prisma.model.update({ where: { id }, data: { isActive: false } });

    // ✅ Audit log ekle
    if (oldData) {
      await auditDelete("table_name", id, oldData, getAuditContext()).catch(
        console.error,
      );
    }

    return NextResponse.json({ message: "Silindi" });
  });
}
```

---

## 📊 TABLE NAME MAPPING

Prisma Model → Database Table:

```typescript
const tableMap = {
  Animal: "animals",
  Product: "products",
  Transaction: "transactions",
  Payment: "payments",
  Supplier: "suppliers",
  Reminder: "reminders",
  Protocol: "protocols",
  Illness: "illnesses",
  Treatment: "treatments",
  Collection: "collections",
  Setting: "settings",
  User: "users",
  Category: "product_categories",
};
```

---

## ✅ CHECKLIST

Her API için:

- [ ] Import'ları ekle
- [ ] withAuditContext ile wrap et
- [ ] CREATE için auditCreate ekle
- [ ] UPDATE için oldData al + auditUpdate ekle
- [ ] DELETE için oldData al + auditDelete ekle
- [ ] Table name doğru mu kontrol et
- [ ] Build test et
- [ ] Production'da test et

---

## 🧪 TEST

Her API'yi test et:

```bash
# CREATE
curl -X POST http://localhost:3002/api/animals \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "species": "DOG", "customerId": "..."}'

# Audit log kontrolü
SELECT * FROM audit_logs WHERE "tableName" = 'animals' ORDER BY "createdAt" DESC LIMIT 1;

# UPDATE
curl -X PUT http://localhost:3002/api/animals/{id} \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated"}'

# Audit log kontrolü - oldData ve newData var mı?
SELECT "oldData", "newData" FROM audit_logs WHERE action = 'UPDATE' AND "tableName" = 'animals' ORDER BY "createdAt" DESC LIMIT 1;

# DELETE
curl -X DELETE http://localhost:3002/api/animals/{id}

# Audit log kontrolü - oldData var mı?
SELECT "oldData" FROM audit_logs WHERE action = 'DELETE' AND "tableName" = 'animals' ORDER BY "createdAt" DESC LIMIT 1;
```

---

**Not:** Bu işlem manuel yapılmalı çünkü her API'nin kendi business logic'i var. Otomatik script çalışmayabilir.

**Öncelik Sırası:**

1. Animals (UPDATE/DELETE) ← ŞİMDİ
2. Products (CREATE/UPDATE/DELETE)
3. Transactions (CREATE/UPDATE/DELETE)
4. Suppliers (CREATE/UPDATE/DELETE)
5. Diğerleri...
