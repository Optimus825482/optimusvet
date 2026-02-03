-- =====================================================
-- MIGRATION PREVIEW: Customer Contact Fields Enhancement
-- =====================================================
-- Generated: 2024
-- Purpose: Add village field and performance indexes to Customer table
-- Impact: LOW - Backward compatible, no data loss risk
-- Estimated Time: < 1 minute
-- =====================================================

-- =====================================================
-- CURRENT STATE ANALYSIS
-- =====================================================

-- Check existing Customer table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  character_maximum_length,
  column_default
FROM information_schema.columns 
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- Check existing indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'customers'
ORDER BY indexname;

-- Check current data distribution
SELECT 
  COUNT(*) as total_customers,
  COUNT(phone) as with_phone,
  COUNT(email) as with_email,
  COUNT(address) as with_address,
  COUNT(city) as with_city,
  COUNT(district) as with_district,
  COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as valid_phones,
  COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as valid_emails
FROM customers;

-- =====================================================
-- MIGRATION STEPS
-- =====================================================

-- -----------------------------------------------------
-- STEP 1: Add village column (if not already exists)
-- -----------------------------------------------------
-- Impact: Adds nullable TEXT column
-- Risk: NONE - Backward compatible
-- Rollback: ALTER TABLE customers DROP COLUMN village;

ALTER TABLE "customers" 
ADD COLUMN IF NOT EXISTS "village" TEXT;

COMMENT ON COLUMN "customers"."village" IS 'Village/Köy name for rural addresses';

-- -----------------------------------------------------
-- STEP 2: Add performance indexes
-- -----------------------------------------------------
-- Impact: Improves query performance for phone, location, and name searches
-- Risk: LOW - Minimal storage overhead (~500KB total)
-- Rollback: DROP INDEX [index_name];

-- Index 1: Phone number searches
-- Use case: Search customers by phone number
-- Expected improvement: 10-100x faster
CREATE INDEX IF NOT EXISTS "customers_phone_idx" 
ON "customers"("phone")
WHERE "phone" IS NOT NULL;

COMMENT ON INDEX "customers_phone_idx" IS 'Optimizes phone number lookups';

-- Index 2: Location filtering (composite)
-- Use case: Filter customers by city and district
-- Expected improvement: 5-50x faster
CREATE INDEX IF NOT EXISTS "customers_city_district_idx" 
ON "customers"("city", "district")
WHERE "city" IS NOT NULL OR "district" IS NOT NULL;

COMMENT ON INDEX "customers_city_district_idx" IS 'Optimizes location-based queries';

-- Index 3: Name searches
-- Use case: Search customers by name
-- Expected improvement: 10-100x faster
CREATE INDEX IF NOT EXISTS "customers_name_idx" 
ON "customers"("name");

COMMENT ON INDEX "customers_name_idx" IS 'Optimizes name-based searches';

-- Optional: Full-text search index for name (if needed)
-- Uncomment if you need fuzzy name matching
-- CREATE INDEX IF NOT EXISTS "customers_name_trgm_idx" 
-- ON "customers" USING gin ("name" gin_trgm_ops);

-- -----------------------------------------------------
-- STEP 3: Update table statistics
-- -----------------------------------------------------
-- Impact: Helps query planner make better decisions
-- Risk: NONE

ANALYZE "customers";

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Verify village column was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'customers' 
      AND column_name = 'village'
  ) THEN
    RAISE EXCEPTION 'Migration failed: village column not found';
  END IF;
  
  RAISE NOTICE 'SUCCESS: village column exists';
END $$;

-- Verify indexes were created
DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes 
  WHERE tablename = 'customers'
    AND indexname IN (
      'customers_phone_idx',
      'customers_city_district_idx',
      'customers_name_idx'
    );
  
  IF idx_count < 3 THEN
    RAISE WARNING 'Expected 3 indexes, found %', idx_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All % indexes created', idx_count;
  END IF;
END $$;

-- =====================================================
-- PERFORMANCE ANALYSIS
-- =====================================================

-- Check index sizes
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'customers'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Test phone index performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM customers 
WHERE phone = '05551234567'
LIMIT 10;

-- Test location index performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM customers 
WHERE city = 'Ankara' AND district = 'Çankaya'
LIMIT 10;

-- Test name index performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM customers 
WHERE name ILIKE 'Test%'
LIMIT 10;

-- =====================================================
-- DATA VALIDATION QUERIES
-- =====================================================

-- Check for invalid phone formats (should be cleaned before storage)
SELECT 
  id,
  name,
  phone,
  LENGTH(phone) as phone_length,
  phone ~ '^[0-9+]+$' as is_numeric_only
FROM customers
WHERE phone IS NOT NULL
  AND phone != ''
  AND (
    LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) NOT IN (10, 11, 12)
    OR phone !~ '^[0-9+\s\-\(\)]+$'
  )
LIMIT 10;

-- Check address hierarchy consistency
SELECT 
  id,
  name,
  city,
  district,
  village,
  CASE 
    WHEN village IS NOT NULL AND district IS NULL THEN 'ERROR: Village without district'
    WHEN district IS NOT NULL AND city IS NULL THEN 'ERROR: District without city'
    ELSE 'OK'
  END as hierarchy_status
FROM customers
WHERE (village IS NOT NULL AND district IS NULL)
   OR (district IS NOT NULL AND city IS NULL);

-- =====================================================
-- SAMPLE DATA QUERIES
-- =====================================================

-- Show customers with complete address information
SELECT 
  id,
  code,
  name,
  phone,
  address,
  village,
  district,
  city
FROM customers
WHERE address IS NOT NULL
  AND city IS NOT NULL
  AND district IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 5;

-- Show address field distribution
SELECT 
  'Total Customers' as metric,
  COUNT(*) as count,
  '100%' as percentage
FROM customers
UNION ALL
SELECT 
  'With Phone',
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM customers), 0), 2)::TEXT || '%'
FROM customers WHERE phone IS NOT NULL
UNION ALL
SELECT 
  'With Email',
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM customers), 0), 2)::TEXT || '%'
FROM customers WHERE email IS NOT NULL
UNION ALL
SELECT 
  'With Address',
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM customers), 0), 2)::TEXT || '%'
FROM customers WHERE address IS NOT NULL
UNION ALL
SELECT 
  'With City',
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM customers), 0), 2)::TEXT || '%'
FROM customers WHERE city IS NOT NULL
UNION ALL
SELECT 
  'With District',
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM customers), 0), 2)::TEXT || '%'
FROM customers WHERE district IS NOT NULL
UNION ALL
SELECT 
  'With Village',
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM customers), 0), 2)::TEXT || '%'
FROM customers WHERE village IS NOT NULL;

-- =====================================================
-- ROLLBACK SCRIPT (IF NEEDED)
-- =====================================================

/*
-- ROLLBACK: Remove village column and indexes
-- WARNING: This will delete all village data!

-- Drop indexes
DROP INDEX IF EXISTS "customers_phone_idx";
DROP INDEX IF EXISTS "customers_city_district_idx";
DROP INDEX IF EXISTS "customers_name_idx";

-- Drop village column
ALTER TABLE "customers" DROP COLUMN IF EXISTS "village";

-- Update statistics
ANALYZE "customers";

-- Verify rollback
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND column_name = 'village';
-- Should return 0 rows

SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'customers'
  AND indexname IN (
    'customers_phone_idx',
    'customers_city_district_idx',
    'customers_name_idx'
  );
-- Should return 0 rows
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 
  'Migration completed successfully!' as status,
  NOW() as completed_at,
  (SELECT COUNT(*) FROM customers) as total_customers,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'customers') as total_indexes;
