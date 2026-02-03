-- =====================================================
-- CUSTOMER LOCATION FIELDS MIGRATION
-- =====================================================
-- Description: Add granular location fields to Customer model
-- Fields Added: neighborhood, village, postalCode, country
-- Risk Level: LOW (all fields optional, backward compatible)
-- Rollback: Safe - can drop columns without data loss
-- =====================================================

-- Add new location fields to customers table
ALTER TABLE "customers" 
ADD COLUMN IF NOT EXISTS "neighborhood" TEXT,
ADD COLUMN IF NOT EXISTS "village" TEXT,
ADD COLUMN IF NOT EXISTS "postalCode" TEXT,
ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Türkiye';

-- Optional: Create indexes for better query performance
-- (Uncomment if you frequently search by these fields)

-- CREATE INDEX IF NOT EXISTS "customers_village_idx" 
-- ON "customers"("village") 
-- WHERE "village" IS NOT NULL;

-- CREATE INDEX IF NOT EXISTS "customers_neighborhood_idx" 
-- ON "customers"("neighborhood") 
-- WHERE "neighborhood" IS NOT NULL;

-- CREATE INDEX IF NOT EXISTS "customers_city_district_idx" 
-- ON "customers"("city", "district");

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customers'
  AND column_name IN ('neighborhood', 'village', 'postalCode', 'country')
ORDER BY ordinal_position;

-- Count existing customers (should remain unchanged)
SELECT COUNT(*) as total_customers FROM customers;

-- Sample data check (should show NULL for new fields on existing records)
SELECT 
  id, 
  name, 
  city, 
  district,
  neighborhood,  -- NEW
  village,       -- NEW
  postalCode,    -- NEW
  country        -- NEW
FROM customers 
LIMIT 5;

-- =====================================================
-- OPTIONAL: DATA MIGRATION EXAMPLES
-- =====================================================
-- These are OPTIONAL and should be reviewed before execution
-- They attempt to extract structured data from existing fields

-- Example 1: Extract neighborhood from address field
-- (Only if address contains "Mah." or "Mahallesi" pattern)
/*
UPDATE customers 
SET neighborhood = 
  CASE 
    WHEN address LIKE '%Mah.%' THEN 
      TRIM(SUBSTRING(address FROM '([A-Za-zğüşıöçĞÜŞİÖÇ\s]+)\s+Mah\.'))
    WHEN address LIKE '%Mahallesi%' THEN 
      TRIM(SUBSTRING(address FROM '([A-Za-zğüşıöçĞÜŞİÖÇ\s]+)\s+Mahallesi'))
    ELSE NULL
  END
WHERE address IS NOT NULL
  AND neighborhood IS NULL
  AND (address LIKE '%Mah.%' OR address LIKE '%Mahallesi%');
*/

-- Example 2: Extract village from name field
-- (Based on MUSSS.MD pattern: "Name Surname Köyü")
/*
UPDATE customers 
SET village = 
  CASE 
    WHEN name LIKE '%Köyü' THEN 
      TRIM(SUBSTRING(name FROM '([A-Za-zğüşıöçĞÜŞİÖÇ\s]+)\s+Köyü$'))
    WHEN name LIKE '%köy' THEN 
      TRIM(SUBSTRING(name FROM '([A-Za-zğüşıöçĞÜŞİÖÇ\s]+)\s+köy$'))
    ELSE NULL
  END
WHERE name LIKE '%köy%' OR name LIKE '%Köyü'
  AND village IS NULL;
*/

-- Example 3: Set default country for existing customers
/*
UPDATE customers 
SET country = 'Türkiye'
WHERE country IS NULL;
*/

-- =====================================================
-- ROLLBACK SCRIPT (IF NEEDED)
-- =====================================================
-- Execute this if you need to revert the migration
-- WARNING: This will delete all data in the new columns

/*
-- Drop new columns
ALTER TABLE "customers" 
DROP COLUMN IF EXISTS "neighborhood",
DROP COLUMN IF EXISTS "village",
DROP COLUMN IF EXISTS "postalCode",
DROP COLUMN IF EXISTS "country";

-- Drop indexes (if created)
DROP INDEX IF EXISTS "customers_village_idx";
DROP INDEX IF EXISTS "customers_neighborhood_idx";
DROP INDEX IF EXISTS "customers_city_district_idx";

-- Verify rollback
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
*/

-- =====================================================
-- POST-MIGRATION VALIDATION
-- =====================================================

-- Check for any NULL values in critical fields (should be OK)
SELECT 
  COUNT(*) as total,
  COUNT(neighborhood) as with_neighborhood,
  COUNT(village) as with_village,
  COUNT(postalCode) as with_postalCode,
  COUNT(country) as with_country
FROM customers;

-- Check data distribution
SELECT 
  city,
  COUNT(*) as customer_count,
  COUNT(neighborhood) as with_neighborhood,
  COUNT(village) as with_village
FROM customers
GROUP BY city
ORDER BY customer_count DESC
LIMIT 10;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. All new fields are OPTIONAL (nullable)
-- 2. Existing data is NOT modified by default
-- 3. New customers can use granular fields
-- 4. Old customers continue to work with existing fields
-- 5. Data migration scripts are OPTIONAL and commented out
-- 6. Test in development environment before production
-- 7. Backup database before applying to production
-- =====================================================
