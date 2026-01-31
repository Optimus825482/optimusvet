-- =====================================================
-- Migration: Add Treatment & Illness Reminder Fields
-- Date: 2026-01-31
-- Description: Adds fields for automatic reminder creation from treatments
-- SAFE: Does NOT delete any data, only adds new columns
-- =====================================================

BEGIN;

-- 1. Add treatmentId column to Reminder table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reminders' 
        AND column_name = 'treatmentId'
    ) THEN
        ALTER TABLE "reminders" ADD COLUMN "treatmentId" TEXT;
        COMMENT ON COLUMN "reminders"."treatmentId" IS 'Link to treatment for automatic reminder creation';
    END IF;
END $$;

-- 2. Add illnessId column to Reminder table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reminders' 
        AND column_name = 'illnessId'
    ) THEN
        ALTER TABLE "reminders" ADD COLUMN "illnessId" TEXT;
        COMMENT ON COLUMN "reminders"."illnessId" IS 'Link to illness for context';
    END IF;
END $$;

-- 3. Add isActive column to Reminder table (for dismissing reminders)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reminders' 
        AND column_name = 'isActive'
    ) THEN
        ALTER TABLE "reminders" ADD COLUMN "isActive" BOOLEAN DEFAULT true NOT NULL;
        COMMENT ON COLUMN "reminders"."isActive" IS 'Whether reminder is still active (not dismissed)';
    END IF;
END $$;

-- 4. Add dismissedAt column to Reminder table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reminders' 
        AND column_name = 'dismissedAt'
    ) THEN
        ALTER TABLE "reminders" ADD COLUMN "dismissedAt" TIMESTAMP(3);
        COMMENT ON COLUMN "reminders"."dismissedAt" IS 'When the reminder was dismissed';
    END IF;
END $$;

-- 5. Add dismissedBy column to Reminder table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reminders' 
        AND column_name = 'dismissedBy'
    ) THEN
        ALTER TABLE "reminders" ADD COLUMN "dismissedBy" TEXT;
        COMMENT ON COLUMN "reminders"."dismissedBy" IS 'User who dismissed the reminder';
    END IF;
END $$;

-- 6. Update existing reminders to be active
UPDATE "reminders" SET "isActive" = true WHERE "isActive" IS NULL;

-- 7. Add foreign key constraint for treatmentId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'reminders_treatmentId_fkey'
    ) THEN
        ALTER TABLE "reminders" 
        ADD CONSTRAINT "reminders_treatmentId_fkey" 
        FOREIGN KEY ("treatmentId") 
        REFERENCES "treatments"("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 8. Add foreign key constraint for illnessId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'reminders_illnessId_fkey'
    ) THEN
        ALTER TABLE "reminders" 
        ADD CONSTRAINT "reminders_illnessId_fkey" 
        FOREIGN KEY ("illnessId") 
        REFERENCES "illnesses"("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 9. Add foreign key constraint for dismissedBy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'reminders_dismissedBy_fkey'
    ) THEN
        ALTER TABLE "reminders" 
        ADD CONSTRAINT "reminders_dismissedBy_fkey" 
        FOREIGN KEY ("dismissedBy") 
        REFERENCES "users"("id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 10. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "reminders_treatmentId_idx" ON "reminders"("treatmentId");
CREATE INDEX IF NOT EXISTS "reminders_illnessId_idx" ON "reminders"("illnessId");
CREATE INDEX IF NOT EXISTS "reminders_isActive_idx" ON "reminders"("isActive");
CREATE INDEX IF NOT EXISTS "reminders_dismissedBy_idx" ON "reminders"("dismissedBy");
CREATE INDEX IF NOT EXISTS "reminders_dueDate_isActive_idx" ON "reminders"("dueDate", "isActive");

COMMIT;

-- =====================================================
-- Verification Queries (Run these to check)
-- =====================================================

-- Check if columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'reminders'
AND column_name IN ('treatmentId', 'illnessId', 'isActive', 'dismissedAt', 'dismissedBy')
ORDER BY ordinal_position;

-- Check if indexes were created
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'reminders'
AND indexname LIKE '%treatment%' OR indexname LIKE '%illness%' OR indexname LIKE '%isActive%';

-- Check if foreign keys were created
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'reminders'
AND kcu.column_name IN ('treatmentId', 'illnessId', 'dismissedBy');

-- =====================================================
-- ROLLBACK (Only if needed - run separately)
-- =====================================================

/*
BEGIN;

-- Remove indexes
DROP INDEX IF EXISTS "reminders_treatmentId_idx";
DROP INDEX IF EXISTS "reminders_illnessId_idx";
DROP INDEX IF EXISTS "reminders_isActive_idx";
DROP INDEX IF EXISTS "reminders_dismissedBy_idx";
DROP INDEX IF EXISTS "reminders_dueDate_isActive_idx";

-- Remove foreign keys
ALTER TABLE "reminders" DROP CONSTRAINT IF EXISTS "reminders_treatmentId_fkey";
ALTER TABLE "reminders" DROP CONSTRAINT IF EXISTS "reminders_illnessId_fkey";
ALTER TABLE "reminders" DROP CONSTRAINT IF EXISTS "reminders_dismissedBy_fkey";

-- Remove columns
ALTER TABLE "reminders" DROP COLUMN IF EXISTS "treatmentId";
ALTER TABLE "reminders" DROP COLUMN IF EXISTS "illnessId";
ALTER TABLE "reminders" DROP COLUMN IF EXISTS "isActive";
ALTER TABLE "reminders" DROP COLUMN IF EXISTS "dismissedAt";
ALTER TABLE "reminders" DROP COLUMN IF EXISTS "dismissedBy";

COMMIT;
*/
