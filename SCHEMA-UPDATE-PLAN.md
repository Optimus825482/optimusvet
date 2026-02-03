# 📋 Prisma Schema Update Plan - Customer Model Enhancement

## 🎯 Executive Summary

**Objective:** Enhance the Customer model with additional location fields (village/neighborhood) to support more detailed address information, as evidenced by customer data in MUSSS.MD.

**Status:** ✅ Current schema already has `phone` and `address` fields  
**Action Required:** Add granular location fields (village, neighborhood, postal code)

---

## 📊 Current State Analysis

### ✅ Existing Customer Model Fields

```prisma
model Customer {
  id           String        @id @default(cuid())
  code         String        @unique
  musId        Int?          @unique
  name         String
  phone        String?       // ✅ ALREADY EXISTS
  email        String?
  address      String?       // ✅ ALREADY EXISTS
  city         String?       // ✅ ALREADY EXISTS
  district     String?       // ✅ ALREADY EXISTS
  taxNumber    String?
  taxOffice    String?
  image        String?
  notes        String?
  balance      Decimal       @default(0) @db.Decimal(12, 2)
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  // ... relations
}
```

### ❌ Missing Fields (Identified from MUSSS.MD)

From the customer data analysis:

- **Village (Köy):** e.g., "Ali Aydın esenköy", "Ismail TEKIN Uludağ Köyü"
- **Neighborhood (Mahalle):** Currently embedded in `address` field
- **Postal Code:** Not captured
- **Country:** Not captured (assuming Turkey by default)

---

## 🎯 Proposed Schema Changes

### Option 1: Minimal Enhancement (RECOMMENDED)

Add only essential fields for Turkish address system:

```prisma
model Customer {
  id           String        @id @default(cuid())
  code         String        @unique
  musId        Int?          @unique
  name         String
  phone        String?
  email        String?

  // 📍 Enhanced Address Fields
  address      String?       // Street address (Sokak, Cadde, No)
  neighborhood String?       // NEW: Mahalle
  village      String?       // NEW: Köy
  district     String?       // İlçe (existing)
  city         String?       // İl (existing)
  postalCode   String?       // NEW: Posta Kodu
  country      String?       @default("Türkiye") // NEW: Ülke

  // Tax & Other Info
  taxNumber    String?
  taxOffice    String?
  image        String?
  notes        String?
  balance      Decimal       @default(0) @db.Decimal(12, 2)
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  // Relations (unchanged)
  animals      Animal[]
  reminders    Reminder[]
  transactions Transaction[]
  collections  Collection[]

  @@map("customers")
}
```

### Option 2: Comprehensive Address Structure

Create a separate address structure (for future scalability):

```prisma
model Customer {
  // ... existing fields

  // Address as JSON for flexibility
  addressDetails Json?  // Structured address data

  // Keep flat fields for backward compatibility
  address      String?
  city         String?
  district     String?
}

// Example addressDetails structure:
{
  "street": "Moda Caddesi No:15",
  "neighborhood": "Caferağa Mahallesi",
  "village": null,
  "district": "Kadıköy",
  "city": "İstanbul",
  "postalCode": "34710",
  "country": "Türkiye",
  "coordinates": {
    "lat": 40.9876,
    "lng": 29.0234
  }
}
```

---

## 🚀 Migration Strategy

### Phase 1: Schema Update (RECOMMENDED APPROACH)

**File:** `prisma/schema.prisma`

```prisma
model Customer {
  // ... existing fields remain unchanged

  // Add new optional fields
  neighborhood String?  // Mahalle
  village      String?  // Köy
  postalCode   String?  // Posta Kodu
  country      String?  @default("Türkiye")

  // ... rest of model
}
```

**Migration Command:**

```bash
npx prisma migrate dev --name add_customer_location_fields
```

### Phase 2: Data Migration (Optional)

If existing `address` fields contain neighborhood/village data:

```sql
-- Extract neighborhood from address field (if pattern exists)
UPDATE customers
SET neighborhood =
  CASE
    WHEN address LIKE '%Mah.%' THEN
      SUBSTRING(address FROM '([A-Za-zğüşıöçĞÜŞİÖÇ\s]+)\s+Mah\.')
    WHEN address LIKE '%Mahallesi%' THEN
      SUBSTRING(address FROM '([A-Za-zğüşıöçĞÜŞİÖÇ\s]+)\s+Mahallesi')
    ELSE NULL
  END
WHERE address IS NOT NULL;

-- Extract village from name field (from MUSSS.MD pattern)
UPDATE customers
SET village =
  CASE
    WHEN name LIKE '%Köyü' THEN
      SUBSTRING(name FROM '([A-Za-zğüşıöçĞÜŞİÖÇ\s]+)\s+Köyü')
    WHEN name LIKE '%köy' THEN
      SUBSTRING(name FROM '([A-Za-zğüşıöçĞÜŞİÖÇ\s]+)\s+köy')
    ELSE NULL
  END
WHERE name LIKE '%köy%' OR name LIKE '%Köyü';
```

### Phase 3: Application Updates

#### 3.1 Update Validation Schema

**File:** `src/lib/validations.ts`

```typescript
export const customerSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Geçerli bir e-posta giriniz")
    .optional()
    .or(z.literal("")),

  // Address fields
  address: z.string().optional(),
  neighborhood: z.string().optional(), // NEW
  village: z.string().optional(), // NEW
  district: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(), // NEW
  country: z.string().optional(), // NEW

  // Other fields
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  notes: z.string().optional(),
  balance: z.coerce.number().optional(),
});
```

#### 3.2 Update Customer Forms

**File:** `src/app/dashboard/customers/new/page.tsx`

Add new fields to the address section:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <MapPin className="w-5 h-5 text-primary" />
      Adres Bilgileri
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Full Address */}
    <div className="space-y-2">
      <Label htmlFor="address">Açık Adres</Label>
      <Textarea
        id="address"
        placeholder="Sokak, Cadde, Bina No, Daire No..."
        {...register("address")}
      />
    </div>

    {/* Neighborhood & Village */}
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

    {/* District & City */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="district">İlçe</Label>
        <Input
          id="district"
          placeholder="Örn: Kadıköy"
          {...register("district")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">İl</Label>
        <Input id="city" placeholder="Örn: İstanbul" {...register("city")} />
      </div>
    </div>

    {/* Postal Code & Country */}
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
          placeholder="Türkiye"
          defaultValue="Türkiye"
          {...register("country")}
        />
      </div>
    </div>
  </CardContent>
</Card>
```

#### 3.3 Update API Routes

**File:** `src/app/api/customers/route.ts`

No changes needed - validation schema handles new fields automatically.

#### 3.4 Update Customer Display Components

**File:** `src/app/dashboard/customers/[id]/page.tsx`

Add new fields to the display:

```tsx
{
  /* Address Section */
}
<Card>
  <CardHeader>
    <CardTitle>Adres Bilgileri</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    {customer.address && (
      <div>
        <span className="text-sm text-muted-foreground">Adres:</span>
        <p className="text-sm">{customer.address}</p>
      </div>
    )}
    {customer.neighborhood && (
      <div>
        <span className="text-sm text-muted-foreground">Mahalle:</span>
        <p className="text-sm">{customer.neighborhood}</p>
      </div>
    )}
    {customer.village && (
      <div>
        <span className="text-sm text-muted-foreground">Köy:</span>
        <p className="text-sm">{customer.village}</p>
      </div>
    )}
    <div className="flex gap-4">
      {customer.district && (
        <div>
          <span className="text-sm text-muted-foreground">İlçe:</span>
          <p className="text-sm">{customer.district}</p>
        </div>
      )}
      {customer.city && (
        <div>
          <span className="text-sm text-muted-foreground">İl:</span>
          <p className="text-sm">{customer.city}</p>
        </div>
      )}
    </div>
    {customer.postalCode && (
      <div>
        <span className="text-sm text-muted-foreground">Posta Kodu:</span>
        <p className="text-sm">{customer.postalCode}</p>
      </div>
    )}
  </CardContent>
</Card>;
```

---

## ✅ Backward Compatibility Strategy

### 1. **All New Fields Are Optional**

- No breaking changes to existing data
- Existing customers continue to work without new fields
- Forms remain functional with or without new fields

### 2. **Default Values**

- `country` defaults to "Türkiye" for new records
- All other fields are nullable

### 3. **Gradual Adoption**

- Old customers: Keep existing `address`, `city`, `district`
- New customers: Can use granular fields
- Updated customers: Can add new fields incrementally

### 4. **API Compatibility**

- Existing API calls work unchanged
- New fields are optional in request/response
- Validation schema accepts both old and new formats

### 5. **Display Logic**

- Show new fields only if they have values
- Fall back to `address` field if granular fields are empty
- Combine fields intelligently for display

---

## 🧪 Testing Strategy

### 1. Schema Migration Test

```bash
# Test migration in development
npx prisma migrate dev --name add_customer_location_fields

# Verify schema
npx prisma validate

# Check generated SQL
cat prisma/migrations/*/migration.sql
```

### 2. Data Integrity Test

```sql
-- Verify no data loss
SELECT COUNT(*) FROM customers;

-- Check new fields are nullable
SELECT id, name, neighborhood, village, postalCode
FROM customers
LIMIT 10;
```

### 3. Application Test Cases

#### Test Case 1: Create Customer with Old Format

```json
{
  "name": "Test Customer",
  "phone": "05551234567",
  "address": "Test Address",
  "city": "İstanbul",
  "district": "Kadıköy"
}
```

**Expected:** ✅ Success, new fields remain null

#### Test Case 2: Create Customer with New Format

```json
{
  "name": "Test Customer 2",
  "phone": "05551234567",
  "address": "Moda Caddesi No:15",
  "neighborhood": "Caferağa Mahallesi",
  "district": "Kadıköy",
  "city": "İstanbul",
  "postalCode": "34710",
  "country": "Türkiye"
}
```

**Expected:** ✅ Success, all fields saved

#### Test Case 3: Create Customer with Village

```json
{
  "name": "Ali Aydın",
  "phone": "05551234567",
  "village": "Esenköy",
  "district": "Merkez",
  "city": "Bursa"
}
```

**Expected:** ✅ Success, village field populated

#### Test Case 4: Update Existing Customer

```json
{
  "id": "existing-customer-id",
  "neighborhood": "Yeni Mahalle"
}
```

**Expected:** ✅ Success, only neighborhood updated

### 4. UI Test Cases

- [ ] New customer form displays new fields
- [ ] Edit customer form displays new fields
- [ ] Customer detail page shows new fields (if present)
- [ ] Old customers display correctly without new fields
- [ ] Form validation works for all fields
- [ ] Empty optional fields don't cause errors

---

## 📦 Implementation Checklist

### Phase 1: Schema & Migration

- [ ] Update `prisma/schema.prisma` with new fields
- [ ] Run `npx prisma migrate dev --name add_customer_location_fields`
- [ ] Verify migration SQL
- [ ] Test migration in development database
- [ ] Backup production database before applying

### Phase 2: Validation & Types

- [ ] Update `src/lib/validations.ts` - customerSchema
- [ ] Regenerate Prisma Client: `npx prisma generate`
- [ ] Verify TypeScript types are updated

### Phase 3: UI Updates

- [ ] Update `src/app/dashboard/customers/new/page.tsx`
- [ ] Update `src/app/dashboard/customers/[id]/edit/page.tsx`
- [ ] Update `src/app/dashboard/customers/[id]/page.tsx` (detail view)
- [ ] Update customer list table (if showing address)

### Phase 4: Testing

- [ ] Test create customer (old format)
- [ ] Test create customer (new format)
- [ ] Test update customer (add new fields)
- [ ] Test customer display (with/without new fields)
- [ ] Test form validation
- [ ] Test API endpoints

### Phase 5: Data Migration (Optional)

- [ ] Write data migration script (if needed)
- [ ] Test data migration on sample data
- [ ] Review extracted data quality
- [ ] Apply to production (if approved)

### Phase 6: Documentation

- [ ] Update API documentation
- [ ] Update user guide
- [ ] Add migration notes to changelog

---

## 🔄 Rollback Plan

If issues occur after migration:

### 1. Immediate Rollback (Before Data Entry)

```bash
# Revert migration
npx prisma migrate resolve --rolled-back <migration-name>

# Or drop new columns
ALTER TABLE customers
DROP COLUMN IF EXISTS neighborhood,
DROP COLUMN IF EXISTS village,
DROP COLUMN IF EXISTS postalCode,
DROP COLUMN IF EXISTS country;
```

### 2. Partial Rollback (After Data Entry)

- Keep new columns in database
- Remove UI fields
- Revert validation schema
- Data remains safe for future use

### 3. Full Rollback with Data Preservation

```sql
-- Backup new field data
CREATE TABLE customer_location_backup AS
SELECT id, neighborhood, village, postalCode, country
FROM customers
WHERE neighborhood IS NOT NULL
   OR village IS NOT NULL
   OR postalCode IS NOT NULL;

-- Then proceed with rollback
```

---

## 📊 Impact Analysis

### Database Impact

- **New Columns:** 4 (neighborhood, village, postalCode, country)
- **Storage Impact:** Minimal (~50-100 bytes per customer)
- **Index Impact:** None (no new indexes required)
- **Performance Impact:** Negligible

### Application Impact

- **Breaking Changes:** None (all fields optional)
- **API Changes:** Additive only (backward compatible)
- **UI Changes:** New form fields (optional)
- **Code Changes:** ~5 files

### User Impact

- **Existing Users:** No impact (can continue using old format)
- **New Users:** Can use granular address fields
- **Training Required:** Minimal (new optional fields)

---

## 🎯 Recommendations

### ✅ RECOMMENDED: Option 1 - Minimal Enhancement

**Rationale:**

1. **Backward Compatible:** All new fields are optional
2. **Addresses Real Need:** Village field identified in MUSSS.MD
3. **Turkish Address System:** Matches Turkish administrative structure
4. **Simple Implementation:** Straightforward migration
5. **Low Risk:** No breaking changes

**Implementation Priority:**

1. **High Priority:** `neighborhood`, `village` (identified need)
2. **Medium Priority:** `postalCode` (useful for logistics)
3. **Low Priority:** `country` (mostly Turkey, but good for completeness)

### ⚠️ NOT RECOMMENDED: Option 2 - JSON Structure

**Reasons:**

- Over-engineering for current needs
- Harder to query and index
- More complex validation
- No clear benefit over flat fields

---

## 📅 Timeline Estimate

| Phase | Task                      | Duration | Dependencies |
| ----- | ------------------------- | -------- | ------------ |
| 1     | Schema update & migration | 30 min   | None         |
| 2     | Validation & types        | 15 min   | Phase 1      |
| 3     | UI updates (3 files)      | 2 hours  | Phase 2      |
| 4     | Testing                   | 1 hour   | Phase 3      |
| 5     | Data migration (optional) | 1 hour   | Phase 4      |
| 6     | Documentation             | 30 min   | Phase 5      |

**Total Estimated Time:** 5-6 hours

---

## 🔐 Security Considerations

1. **Input Validation:** All new fields validated via Zod schema
2. **SQL Injection:** Protected by Prisma ORM
3. **XSS Prevention:** React automatically escapes output
4. **Data Privacy:** Address data is sensitive - ensure proper access control

---

## 📝 Migration SQL Preview

```sql
-- CreateEnum (if needed)
-- None required

-- AlterTable
ALTER TABLE "customers"
ADD COLUMN "neighborhood" TEXT,
ADD COLUMN "village" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "country" TEXT DEFAULT 'Türkiye';

-- CreateIndex (optional, for performance)
CREATE INDEX "customers_city_district_idx" ON "customers"("city", "district");
CREATE INDEX "customers_village_idx" ON "customers"("village") WHERE "village" IS NOT NULL;
```

---

## 🎓 Best Practices Applied

1. ✅ **Additive Changes Only:** No field removals or renames
2. ✅ **Optional Fields:** All new fields nullable
3. ✅ **Default Values:** Sensible defaults where appropriate
4. ✅ **Backward Compatibility:** Existing code continues to work
5. ✅ **Gradual Migration:** Can adopt new fields incrementally
6. ✅ **Data Preservation:** No data loss during migration
7. ✅ **Testing Strategy:** Comprehensive test cases
8. ✅ **Rollback Plan:** Clear rollback procedures
9. ✅ **Documentation:** Detailed implementation guide

---

## 📞 Support & Questions

For questions or issues during implementation:

1. Review this document thoroughly
2. Check Prisma migration logs
3. Test in development environment first
4. Keep database backups before production migration

---

## ✅ Conclusion

**Current Status:**

- ✅ `phone` field: Already exists
- ✅ `address` field: Already exists
- ❌ `neighborhood` field: Needs to be added
- ❌ `village` field: Needs to be added (identified in MUSSS.MD)
- ❌ `postalCode` field: Recommended addition
- ❌ `country` field: Recommended addition

**Next Steps:**

1. Review and approve this plan
2. Execute Phase 1 (Schema Migration)
3. Execute Phase 2 (Validation Updates)
4. Execute Phase 3 (UI Updates)
5. Execute Phase 4 (Testing)
6. Deploy to production

**Risk Level:** 🟢 LOW (All changes are additive and optional)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Author:** Schema Migration Team  
**Status:** Ready for Implementation
