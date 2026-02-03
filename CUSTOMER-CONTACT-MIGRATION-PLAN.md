# 📋 Customer Contact Fields Migration Plan

## 🎯 Executive Summary

**Objective:** Enhance Customer model with improved contact information fields including phone, address, and village (köy) support.

**Status:** ✅ ANALYSIS COMPLETE - Ready for Implementation

**Impact Level:** 🟡 MEDIUM - Schema change with backward compatibility

---

## 📊 Current State Analysis

### Existing Customer Model Fields

```prisma
model Customer {
  id           String        @id @default(cuid())
  code         String        @unique
  musId        Int?          @unique
  name         String
  phone        String?       // ✅ Already exists
  email        String?
  address      String?       // ✅ Already exists
  city         String?       // ✅ Already exists
  district     String?       // ✅ Already exists
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

### ✅ Good News!

**The requested fields already exist in the schema:**

- ✅ `phone` - String, optional
- ✅ `address` - String, optional
- ✅ `city` - String, optional
- ✅ `district` - String, optional

---

## 🎯 Proposed Schema Enhancements

### 1. Add Missing Field: Village (Köy)

```prisma
model Customer {
  // ... existing fields ...
  city         String?
  district     String?
  village      String?       // 🆕 NEW FIELD
  // ... rest of fields ...
}
```

### 2. Add Performance Indexes

```prisma
model Customer {
  // ... all fields ...

  @@map("customers")
  @@index([phone])          // 🆕 For phone search
  @@index([city, district]) // 🆕 For location filtering
  @@index([name])           // 🆕 For name search (if not exists)
}
```

### 3. Enhanced Schema (Complete)

```prisma
model Customer {
  id           String        @id @default(cuid())
  code         String        @unique
  musId        Int?          @unique
  name         String
  phone        String?
  email        String?
  address      String?
  city         String?
  district     String?
  village      String?       // 🆕 NEW: Village/Köy field
  taxNumber    String?
  taxOffice    String?
  image        String?
  notes        String?
  balance      Decimal       @default(0) @db.Decimal(12, 2)
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  animals      Animal[]
  reminders    Reminder[]
  transactions Transaction[]
  collections  Collection[]

  @@map("customers")
  @@index([phone])          // 🆕 Phone search optimization
  @@index([city, district]) // 🆕 Location filtering
  @@index([name])           // 🆕 Name search optimization
}
```

---

## 🔄 Migration Strategy

### Phase 1: Schema Update (5 minutes)

#### Step 1.1: Update schema.prisma

```bash
# Location: optimus-vet/prisma/schema.prisma
# Add village field and indexes to Customer model
```

#### Step 1.2: Generate Migration

```bash
cd optimus-vet
npx prisma migrate dev --name add_customer_village_and_indexes
```

#### Step 1.3: Review Generated SQL

```bash
# Check: optimus-vet/prisma/migrations/[timestamp]_add_customer_village_and_indexes/migration.sql
```

---

## 📝 Migration SQL Preview

### Expected SQL Commands

```sql
-- =====================================================
-- MIGRATION: Add Customer Village and Indexes
-- =====================================================

-- Step 1: Add village column (nullable, backward compatible)
ALTER TABLE "customers"
ADD COLUMN "village" TEXT;

-- Step 2: Add performance indexes
CREATE INDEX "customers_phone_idx" ON "customers"("phone");
CREATE INDEX "customers_city_district_idx" ON "customers"("city", "district");
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- Step 3: Update statistics
ANALYZE "customers";

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
  AND column_name = 'village';

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'customers';

-- Check existing data (should all be NULL for village)
SELECT COUNT(*) as total_customers,
       COUNT(village) as customers_with_village,
       COUNT(phone) as customers_with_phone,
       COUNT(address) as customers_with_address
FROM customers;
```

---

## ✅ Data Validation Strategy

### 1. Phone Number Validation

```typescript
// File: optimus-vet/src/lib/validators/customer-validator.ts

import { z } from "zod";

// Turkish phone number patterns
const PHONE_PATTERNS = {
  mobile: /^(05\d{9})$/, // 05xxxxxxxxx
  landline: /^(0\d{3}\d{7})$/, // 0xxxyyyyyyy
  international: /^\+90\d{10}$/, // +90xxxxxxxxxx
};

export const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true; // Optional field
      const cleaned = val.replace(/[\s\-\(\)]/g, "");
      return (
        PHONE_PATTERNS.mobile.test(cleaned) ||
        PHONE_PATTERNS.landline.test(cleaned) ||
        PHONE_PATTERNS.international.test(cleaned)
      );
    },
    {
      message:
        "Geçerli bir telefon numarası giriniz (05xxxxxxxxx veya 0xxxyyyyyyy)",
    },
  );

export const customerContactSchema = z.object({
  phone: phoneSchema,
  email: z
    .string()
    .email("Geçerli bir e-posta adresi giriniz")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "Adres en fazla 500 karakter olabilir")
    .optional(),
  city: z.string().max(100, "Şehir en fazla 100 karakter olabilir").optional(),
  district: z
    .string()
    .max(100, "İlçe en fazla 100 karakter olabilir")
    .optional(),
  village: z.string().max(100, "Köy en fazla 100 karakter olabilir").optional(),
});

// Utility: Format phone for display
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Format: 0xxx xxx xx xx
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  }

  return phone;
}

// Utility: Normalize phone for storage
export function normalizePhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  return phone.replace(/[\s\-\(\)]/g, "");
}
```

### 2. Address Validation

```typescript
// File: optimus-vet/src/lib/validators/address-validator.ts

import { z } from "zod";

export const addressSchema = z.object({
  address: z
    .string()
    .max(500, "Adres en fazla 500 karakter olabilir")
    .optional()
    .transform((val) => val?.trim()),

  city: z
    .string()
    .max(100, "Şehir en fazla 100 karakter olabilir")
    .optional()
    .transform((val) => val?.trim()),

  district: z
    .string()
    .max(100, "İlçe en fazla 100 karakter olabilir")
    .optional()
    .transform((val) => val?.trim()),

  village: z
    .string()
    .max(100, "Köy en fazla 100 karakter olabilir")
    .optional()
    .transform((val) => val?.trim()),
});

// Validation: Ensure logical hierarchy
export function validateAddressHierarchy(data: {
  city?: string;
  district?: string;
  village?: string;
}): { valid: boolean; error?: string } {
  // If village is provided, district should be provided
  if (data.village && !data.district) {
    return {
      valid: false,
      error: "Köy girildiğinde ilçe bilgisi zorunludur",
    };
  }

  // If district is provided, city should be provided
  if (data.district && !data.city) {
    return {
      valid: false,
      error: "İlçe girildiğinde şehir bilgisi zorunludur",
    };
  }

  return { valid: true };
}
```

### 3. API Route Validation Example

```typescript
// File: optimus-vet/src/app/api/customers/route.ts (UPDATE example)

import {
  customerContactSchema,
  normalizePhone,
} from "@/lib/validators/customer-validator";
import { validateAddressHierarchy } from "@/lib/validators/address-validator";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate contact fields
    const contactValidation = customerContactSchema.safeParse({
      phone: body.phone,
      email: body.email,
      address: body.address,
      city: body.city,
      district: body.district,
      village: body.village,
    });

    if (!contactValidation.success) {
      return NextResponse.json(
        { error: contactValidation.error.errors[0].message },
        { status: 400 },
      );
    }

    // Validate address hierarchy
    const hierarchyValidation = validateAddressHierarchy({
      city: body.city,
      district: body.district,
      village: body.village,
    });

    if (!hierarchyValidation.valid) {
      return NextResponse.json(
        { error: hierarchyValidation.error },
        { status: 400 },
      );
    }

    // Normalize phone before storage
    const normalizedPhone = normalizePhone(body.phone);

    // Create customer with validated data
    const customer = await prisma.customer.create({
      data: {
        ...body,
        phone: normalizedPhone,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    // Error handling...
  }
}
```

---

## 🔍 Testing Strategy

### 1. Unit Tests

```typescript
// File: optimus-vet/__tests__/validators/customer-validator.test.ts

import { describe, it, expect } from "vitest";
import {
  phoneSchema,
  normalizePhone,
  formatPhone,
} from "@/lib/validators/customer-validator";

describe("Phone Validation", () => {
  it("should accept valid Turkish mobile numbers", () => {
    expect(phoneSchema.safeParse("05551234567").success).toBe(true);
    expect(phoneSchema.safeParse("0555 123 45 67").success).toBe(true);
  });

  it("should accept valid landline numbers", () => {
    expect(phoneSchema.safeParse("03121234567").success).toBe(true);
  });

  it("should reject invalid numbers", () => {
    expect(phoneSchema.safeParse("123456").success).toBe(false);
    expect(phoneSchema.safeParse("05551234").success).toBe(false);
  });

  it("should normalize phone numbers", () => {
    expect(normalizePhone("0555 123 45 67")).toBe("05551234567");
    expect(normalizePhone("(0555) 123-45-67")).toBe("05551234567");
  });

  it("should format phone numbers for display", () => {
    expect(formatPhone("05551234567")).toBe("0555 123 45 67");
  });
});

describe("Address Hierarchy Validation", () => {
  it("should require district when village is provided", () => {
    const result = validateAddressHierarchy({
      village: "Köy Adı",
    });
    expect(result.valid).toBe(false);
  });

  it("should require city when district is provided", () => {
    const result = validateAddressHierarchy({
      district: "İlçe Adı",
    });
    expect(result.valid).toBe(false);
  });

  it("should accept complete hierarchy", () => {
    const result = validateAddressHierarchy({
      city: "Ankara",
      district: "Çankaya",
      village: "Köy Adı",
    });
    expect(result.valid).toBe(true);
  });
});
```

### 2. Integration Tests

```typescript
// File: optimus-vet/__tests__/api/customers.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST } from "@/app/api/customers/route";

describe("Customer API - Contact Fields", () => {
  it("should create customer with valid phone", async () => {
    const request = new Request("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Customer",
        phone: "05551234567",
        address: "Test Address",
        city: "Ankara",
        district: "Çankaya",
        village: "Test Köyü",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("should reject invalid phone format", async () => {
    const request = new Request("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Customer",
        phone: "123456", // Invalid
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should reject village without district", async () => {
    const request = new Request("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Customer",
        village: "Test Köyü", // No district
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### 3. Database Tests

```sql
-- File: optimus-vet/tests/sql/customer-migration-tests.sql

-- Test 1: Verify village column exists
SELECT
  column_name,
  data_type,
  is_nullable,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'customers'
  AND column_name = 'village';
-- Expected: 1 row, TEXT type, nullable

-- Test 2: Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'customers'
  AND indexname IN (
    'customers_phone_idx',
    'customers_city_district_idx',
    'customers_name_idx'
  );
-- Expected: 3 rows

-- Test 3: Test phone index performance
EXPLAIN ANALYZE
SELECT * FROM customers
WHERE phone = '05551234567';
-- Expected: Index Scan using customers_phone_idx

-- Test 4: Test location index performance
EXPLAIN ANALYZE
SELECT * FROM customers
WHERE city = 'Ankara' AND district = 'Çankaya';
-- Expected: Index Scan using customers_city_district_idx

-- Test 5: Insert test data with village
INSERT INTO customers (
  id, code, name, phone, address, city, district, village,
  balance, "isActive", "createdAt", "updatedAt"
) VALUES (
  'test_' || gen_random_uuid()::text,
  'TEST-' || floor(random() * 10000)::text,
  'Test Customer',
  '05551234567',
  'Test Address',
  'Ankara',
  'Çankaya',
  'Test Köyü',
  0,
  true,
  NOW(),
  NOW()
);
-- Expected: Success

-- Test 6: Query with village filter
SELECT id, name, city, district, village
FROM customers
WHERE village IS NOT NULL;
-- Expected: Returns customers with village data

-- Test 7: Verify data integrity
SELECT
  COUNT(*) as total,
  COUNT(phone) as with_phone,
  COUNT(address) as with_address,
  COUNT(city) as with_city,
  COUNT(district) as with_district,
  COUNT(village) as with_village
FROM customers;
-- Expected: Counts showing optional field distribution
```

---

## 🔄 Rollback Plan

### Scenario 1: Migration Fails

```bash
# Rollback to previous migration
cd optimus-vet
npx prisma migrate resolve --rolled-back [migration_name]

# Or reset to specific migration
npx prisma migrate reset
```

### Scenario 2: Data Issues After Migration

```sql
-- Remove village data if needed
UPDATE customers SET village = NULL;

-- Drop indexes if causing issues
DROP INDEX IF EXISTS customers_phone_idx;
DROP INDEX IF EXISTS customers_city_district_idx;
DROP INDEX IF EXISTS customers_name_idx;

-- Remove village column (if absolutely necessary)
ALTER TABLE customers DROP COLUMN IF EXISTS village;
```

### Scenario 3: Application Issues

```bash
# Revert Prisma client
cd optimus-vet
npx prisma generate

# Restart application
npm run dev
```

---

## 📊 Performance Impact Analysis

### Index Size Estimates

```sql
-- Estimate index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'customers';
```

### Expected Impact

| Index                         | Estimated Size | Query Improvement             |
| ----------------------------- | -------------- | ----------------------------- |
| `customers_phone_idx`         | ~50-100 KB     | 10-100x faster phone lookups  |
| `customers_city_district_idx` | ~100-200 KB    | 5-50x faster location filters |
| `customers_name_idx`          | ~100-200 KB    | 10-100x faster name searches  |

**Total Additional Storage:** ~250-500 KB (negligible)

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify all tests pass
- [ ] Review migration SQL
- [ ] Notify team of deployment window

### Deployment Steps

1. [ ] **Backup Database**

   ```bash
   pg_dump -h localhost -U postgres -d optimus_vet > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. [ ] **Update Schema File**

   ```bash
   # Edit: optimus-vet/prisma/schema.prisma
   # Add village field and indexes
   ```

3. [ ] **Generate Migration**

   ```bash
   cd optimus-vet
   npx prisma migrate dev --name add_customer_village_and_indexes
   ```

4. [ ] **Review Generated SQL**

   ```bash
   cat prisma/migrations/[timestamp]_add_customer_village_and_indexes/migration.sql
   ```

5. [ ] **Apply Migration**

   ```bash
   npx prisma migrate deploy
   ```

6. [ ] **Verify Migration**

   ```bash
   npx prisma db pull
   npx prisma generate
   ```

7. [ ] **Run Tests**

   ```bash
   npm run test
   ```

8. [ ] **Deploy Application**
   ```bash
   npm run build
   npm run start
   ```

### Post-Deployment

- [ ] Verify indexes created successfully
- [ ] Check application logs for errors
- [ ] Test customer creation/update in UI
- [ ] Monitor database performance
- [ ] Update API documentation

---

## 📝 Implementation Files Checklist

### Required Files

- [ ] `optimus-vet/prisma/schema.prisma` - Updated schema
- [ ] `optimus-vet/src/lib/validators/customer-validator.ts` - Phone validation
- [ ] `optimus-vet/src/lib/validators/address-validator.ts` - Address validation
- [ ] `optimus-vet/src/app/api/customers/route.ts` - API with validation
- [ ] `optimus-vet/__tests__/validators/customer-validator.test.ts` - Unit tests
- [ ] `optimus-vet/__tests__/api/customers.test.ts` - Integration tests
- [ ] `optimus-vet/tests/sql/customer-migration-tests.sql` - SQL tests

### Optional Enhancements

- [ ] `optimus-vet/src/components/forms/customer-contact-form.tsx` - UI form
- [ ] `optimus-vet/src/hooks/use-customer-validation.ts` - React hook
- [ ] `optimus-vet/src/lib/constants/turkish-cities.ts` - City/district data
- [ ] `optimus-vet/docs/API.md` - API documentation update

---

## 🎯 Success Criteria

### Technical Criteria

✅ Migration completes without errors  
✅ All indexes created successfully  
✅ Existing data remains intact  
✅ Application builds without errors  
✅ All tests pass (unit + integration)  
✅ No performance degradation

### Business Criteria

✅ Users can add village information  
✅ Phone search works efficiently  
✅ Location filtering is fast  
✅ Data validation prevents invalid entries  
✅ Backward compatibility maintained

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue 1: Migration fails with "column already exists"**

```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'customers' AND column_name = 'village';

-- If exists, skip column creation in migration
```

**Issue 2: Index creation fails**

```sql
-- Check existing indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'customers';

-- Drop conflicting index
DROP INDEX IF EXISTS [conflicting_index_name];
```

**Issue 3: Prisma client out of sync**

```bash
# Regenerate Prisma client
npx prisma generate

# If still issues, clear node_modules
rm -rf node_modules
npm install
```

---

## 📚 References

- [Prisma Migrations Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)
- [Zod Validation Library](https://zod.dev/)
- Turkish Phone Number Format: ITU-T E.164

---

## ✅ Approval & Sign-off

**Prepared By:** Database Agent + Security Agent + Test Engineer  
**Date:** 2024  
**Status:** ✅ READY FOR IMPLEMENTATION

**Reviewed By:** ********\_********  
**Approved By:** ********\_********  
**Implementation Date:** ********\_********

---

## 🎉 Next Steps

1. **Review this plan** with the development team
2. **Schedule deployment** window (recommended: low-traffic period)
3. **Execute migration** following the deployment checklist
4. **Monitor application** for 24-48 hours post-deployment
5. **Update documentation** with any lessons learned

---

**End of Migration Plan**
