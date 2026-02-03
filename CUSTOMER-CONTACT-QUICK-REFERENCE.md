# 🚀 Customer Contact Fields - Quick Reference

## 📋 TL;DR

**Good News:** Phone and address fields already exist in the schema!  
**What's New:** Adding `village` field + performance indexes  
**Risk Level:** 🟢 LOW - Backward compatible, no breaking changes  
**Time Required:** ⏱️ 5 minutes

---

## ✅ Current Schema Status

### Existing Fields (Already in Database)

```typescript
✅ phone: string | null       // Already exists
✅ email: string | null       // Already exists
✅ address: string | null     // Already exists
✅ city: string | null        // Already exists
✅ district: string | null    // Already exists
```

### New Field to Add

```typescript
🆕 village: string | null     // NEW - Village/Köy field
```

### New Indexes to Add

```sql
🆕 customers_phone_idx          // Phone search optimization
🆕 customers_city_district_idx  // Location filtering
🆕 customers_name_idx           // Name search optimization
```

---

## 🚀 Quick Implementation (5 Steps)

### Step 1: Update Schema (1 min)

```bash
# Edit: optimus-vet/prisma/schema.prisma
# Add to Customer model:

model Customer {
  // ... existing fields ...
  city         String?
  district     String?
  village      String?       // 🆕 ADD THIS LINE
  // ... rest of fields ...

  @@map("customers")
  @@index([phone])          // 🆕 ADD THIS LINE
  @@index([city, district]) // 🆕 ADD THIS LINE
  @@index([name])           // 🆕 ADD THIS LINE
}
```

### Step 2: Generate Migration (1 min)

```bash
cd optimus-vet
npx prisma migrate dev --name add_customer_village_and_indexes
```

### Step 3: Review SQL (1 min)

```bash
# Check generated migration file
cat prisma/migrations/[timestamp]_add_customer_village_and_indexes/migration.sql
```

### Step 4: Apply Migration (1 min)

```bash
npx prisma migrate deploy
npx prisma generate
```

### Step 5: Verify (1 min)

```bash
# Run tests
npm run test

# Or manually verify in database
psql -d optimus_vet -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'village';"
```

---

## 📝 Validation Rules

### Phone Number

```typescript
// Valid formats:
✅ "05551234567"           // Mobile
✅ "0312 123 45 67"        // Landline with spaces
✅ "+905551234567"         // International

// Invalid formats:
❌ "123456"                // Too short
❌ "abc123"                // Contains letters
```

### Address Hierarchy

```typescript
// Valid combinations:
✅ city only
✅ city + district
✅ city + district + village

// Invalid combinations:
❌ village without district
❌ district without city
```

---

## 🔧 Usage Examples

### Create Customer with Contact Info

```typescript
// File: optimus-vet/src/app/api/customers/route.ts

import { normalizePhone } from "@/lib/validators/customer-validator";
import { validateAddressHierarchy } from "@/lib/validators/address-validator";

const customer = await prisma.customer.create({
  data: {
    name: "Ahmet Yılmaz",
    phone: normalizePhone("0555 123 45 67"), // Normalized: "05551234567"
    email: "ahmet@example.com",
    address: "Atatürk Caddesi No:123",
    city: "Ankara",
    district: "Çankaya",
    village: "Örnek Köyü",
    // ... other fields
  },
});
```

### Search by Phone

```typescript
// Fast search using index
const customer = await prisma.customer.findFirst({
  where: {
    phone: "05551234567",
  },
});
```

### Filter by Location

```typescript
// Fast filtering using composite index
const customers = await prisma.customer.findMany({
  where: {
    city: "Ankara",
    district: "Çankaya",
  },
});
```

### Search by Name

```typescript
// Fast search using index
const customers = await prisma.customer.findMany({
  where: {
    name: {
      contains: "Ahmet",
      mode: "insensitive",
    },
  },
});
```

---

## 🧪 Testing Checklist

```bash
# Unit tests
✅ Phone validation (valid/invalid formats)
✅ Phone normalization (remove spaces/dashes)
✅ Phone formatting (display format)
✅ Address hierarchy validation
✅ Email validation

# Integration tests
✅ Create customer with valid phone
✅ Create customer with invalid phone (should fail)
✅ Create customer with village but no district (should fail)
✅ Search by phone (should use index)
✅ Filter by location (should use index)

# Database tests
✅ Village column exists
✅ Indexes created successfully
✅ Index performance (EXPLAIN ANALYZE)
✅ Data integrity (no orphaned villages)
```

---

## 🔄 Rollback (If Needed)

```sql
-- Drop indexes
DROP INDEX IF EXISTS "customers_phone_idx";
DROP INDEX IF EXISTS "customers_city_district_idx";
DROP INDEX IF EXISTS "customers_name_idx";

-- Drop village column
ALTER TABLE "customers" DROP COLUMN IF EXISTS "village";

-- Update statistics
ANALYZE "customers";
```

---

## 📊 Performance Impact

| Metric          | Before     | After       | Improvement    |
| --------------- | ---------- | ----------- | -------------- |
| Phone search    | Table scan | Index scan  | 10-100x faster |
| Location filter | Table scan | Index scan  | 5-50x faster   |
| Name search     | Table scan | Index scan  | 10-100x faster |
| Storage         | ~X MB      | ~X + 0.5 MB | +0.5 MB        |

---

## 🐛 Troubleshooting

### Issue: Migration fails with "column already exists"

```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'customers' AND column_name = 'village';

-- If exists, skip column creation or drop it first
ALTER TABLE customers DROP COLUMN village;
```

### Issue: Index creation fails

```sql
-- Check existing indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'customers';

-- Drop conflicting index
DROP INDEX IF EXISTS [conflicting_index_name];
```

### Issue: Prisma client out of sync

```bash
# Regenerate Prisma client
npx prisma generate

# If still issues, reinstall
rm -rf node_modules
npm install
```

---

## 📚 Related Files

- 📄 `CUSTOMER-CONTACT-MIGRATION-PLAN.md` - Full migration plan
- 📄 `prisma/schema.prisma` - Database schema
- 📄 `prisma/migration-preview-enhanced.sql` - SQL preview
- 📄 `src/lib/validators/customer-validator.ts` - Phone validation
- 📄 `src/lib/validators/address-validator.ts` - Address validation

---

## 🎯 Success Criteria

✅ Migration completes without errors  
✅ All indexes created successfully  
✅ Existing data remains intact  
✅ Application builds without errors  
✅ All tests pass  
✅ No performance degradation

---

## 💡 Pro Tips

1. **Always backup** before running migrations in production
2. **Test in staging** environment first
3. **Monitor performance** after deployment
4. **Use indexes wisely** - they improve reads but slow down writes
5. **Validate data** at the application layer before storage

---

**Ready to implement? Follow the 5 steps above! 🚀**
