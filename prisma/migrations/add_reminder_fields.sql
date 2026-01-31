-- Migration: Add fields for treatment reminders
-- Date: 2026-01-31

-- Add treatmentId to Reminder table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Reminder' AND column_name = 'treatmentId'
    ) THEN
        ALTER TABLE "Reminder" ADD COLUMN "treatmentId" TEXT;
        ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_treatmentId_fkey" 
            FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE CASCADE;
        CREATE INDEX "Reminder_treatmentId_idx" ON "Reminder"("treatmentId");
    END IF;
END $$;

-- Add illnessId to Reminder table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Reminder' AND column_name = 'illnessId'
    ) THEN
        ALTER TABLE "Reminder" ADD COLUMN "illnessId" TEXT;
        ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_illnessId_fkey" 
            FOREIGN KEY ("illnessId") REFERENCES "Illness"("id") ON DELETE CASCADE;
        CREATE INDEX "Reminder_illnessId_idx" ON "Reminder"("illnessId");
    END IF;
END $$;

-- Add isActive to Reminder table if not exists (for dismissing reminders)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Reminder' AND column_name = 'isActive'
    ) THEN
        ALTER TABLE "Reminder" ADD COLUMN "isActive" BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add dismissedAt to Reminder table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Reminder' AND column_name = 'dismissedAt'
    ) THEN
        ALTER TABLE "Reminder" ADD COLUMN "dismissedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Add dismissedBy to Reminder table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Reminder' AND column_name = 'dismissedBy'
    ) THEN
        ALTER TABLE "Reminder" ADD COLUMN "dismissedBy" TEXT;
        ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_dismissedBy_fkey" 
            FOREIGN KEY ("dismissedBy") REFERENCES "User"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Update existing reminders to be active
UPDATE "Reminder" SET "isActive" = true WHERE "isActive" IS NULL;

COMMENT ON COLUMN "Reminder"."treatmentId" IS 'Link to treatment for automatic reminder creation';
COMMENT ON COLUMN "Reminder"."illnessId" IS 'Link to illness for context';
COMMENT ON COLUMN "Reminder"."isActive" IS 'Whether reminder is still active (not dismissed)';
COMMENT ON COLUMN "Reminder"."dismissedAt" IS 'When the reminder was dismissed';
COMMENT ON COLUMN "Reminder"."dismissedBy" IS 'User who dismissed the reminder';
