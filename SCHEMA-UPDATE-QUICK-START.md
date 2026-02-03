# 🚀 Schema Update Quick Start Guide

## TL;DR - What You Need to Know

**Current Status:** ✅ Customer model already has `phone` and `address` fields  
**What's Missing:** Village (köy), Neighborhood (mahalle), Postal Code fields  
**Risk Level:** 🟢 LOW - All changes are optional and backward compatible

---

## 📋 Quick Implementation Steps

### Step 1: Update Schema (2 minutes)

Edit `prisma/schema.prisma`:

```prisma
model Customer {
  // ... existing fields ...

  address      String?
  neighborhood String?       // NEW: Mahalle
  village      String?       // NEW: Köy
  district     String?
  city         String?
  postalCode   String?       // NEW: Posta Kodu
  country      String?  @default("Türkiye")  // NEW: Ülke

  // ... rest of fields ...
}
```

Run migration:

```bash
npx prisma migrate dev --name add_customer_location_fields
npx prisma generate
```

### Step 2: Update Validation (1 minute)

Edit `src/lib/validations.ts`:

```typescript
export const customerSchema = z.object({
  // ... existing fields ...
  address: z.string().optional(),
  neighborhood: z.string().optional(), // NEW
  village: z.string().optional(), // NEW
  district: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(), // NEW
  country: z.string().optional(), // NEW
  // ... rest of fields ...
});
```

### Step 3: Update Forms (30 minutes)

Add to `src/app/dashboard/customers/new/page.tsx` and `[id]/edit/page.tsx`:

```tsx
{/* After existing address field */}
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="neighborhood">Mahalle</Label>
    <Input
      id="neighborhood"
      placeholder="Örn: Caferağa Mahallesi"
      {...register("neighborhood")}
    />
  </div>
  <div className="space-y-2">
    <Label htmlFor="village">Köy</Label>
    <Input
      id="village"
      placeholder="Örn: Uludağ Köyü"
      {...register("village")}
    />
  </div>
</div>

<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="postalCode">Posta Kodu</Label>
    <Input
      id="postalCode"
      placeholder="Örn: 34710"
      {...register("postalCode")}
    />
  </div>
  <div className="space-y-2">
    <Label htmlFor="country">Ülke</Label>
    <Input
      id="country"
      defaultValue="Türkiye"
      {...register("country")}
    />
  </div>
</div>
```

### Step 4: Test (15 minutes)

```bash
# Test old format (should work)
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"0555","address":"Test","city":"İstanbul"}'

# Test new format (should work)
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","village":"Esenköy","city":"Bursa"}'
```

---

## ✅ Verification Checklist

- [ ] Migration ran successfully
- [ ] No TypeScript errors
- [ ] Old customer data still displays
- [ ] New customer form shows new fields
- [ ] Can create customer without new fields
- [ ] Can create customer with new fields
- [ ] Edit form shows new fields

---

## 🔄 Rollback (If Needed)

```sql
ALTER TABLE customers
DROP COLUMN IF EXISTS neighborhood,
DROP COLUMN IF EXISTS village,
DROP COLUMN IF EXISTS postalCode,
DROP COLUMN IF EXISTS country;
```

---

## 📊 Files to Update

1. ✅ `prisma/schema.prisma` - Add 4 new fields
2. ✅ `src/lib/validations.ts` - Add to customerSchema
3. ✅ `src/app/dashboard/customers/new/page.tsx` - Add form fields
4. ✅ `src/app/dashboard/customers/[id]/edit/page.tsx` - Add form fields
5. ⚠️ `src/app/dashboard/customers/[id]/page.tsx` - Optional: Display new fields

---

## 💡 Key Points

1. **All new fields are OPTIONAL** - No breaking changes
2. **Existing customers work unchanged** - Backward compatible
3. **No data migration required** - Can add data gradually
4. **Low risk** - Additive changes only

---

## 🎯 Expected Results

### Before Migration

```typescript
{
  name: "Ali Aydın",
  phone: "0555",
  address: "Test Address",
  city: "İstanbul",
  district: "Kadıköy"
}
```

### After Migration (New Customers)

```typescript
{
  name: "Ali Aydın",
  phone: "0555",
  address: "Moda Caddesi No:15",
  neighborhood: "Caferağa Mahallesi",  // NEW
  village: "Esenköy",                  // NEW
  district: "Kadıköy",
  city: "İstanbul",
  postalCode: "34710",                 // NEW
  country: "Türkiye"                   // NEW
}
```

---

**Total Time:** ~1 hour  
**Risk:** 🟢 LOW  
**Complexity:** 🟢 SIMPLE

For detailed information, see `SCHEMA-UPDATE-PLAN.md`
