-- =====================================================
-- SCHEMA SYNCHRONIZATION MIGRATION
-- Sunucudaki eksik sütunları local schema ile senkronize et
-- Güncel verilere ZARAR VERMEDEN güvenli migration
-- =====================================================

-- 1. CUSTOMERS TABLOSU - Adres detayları ekleniyor
-- Bu sütunlar sunucuda zaten var, bu migration sadece local schema'yı senkronize ediyor
-- Eğer sütunlar yoksa ekle (IF NOT EXISTS kontrolü)

DO $$ 
BEGIN
    -- neighborhood sütunu ekle (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'neighborhood'
    ) THEN
        ALTER TABLE customers ADD COLUMN neighborhood TEXT;
        RAISE NOTICE 'customers.neighborhood sütunu eklendi';
    ELSE
        RAISE NOTICE 'customers.neighborhood sütunu zaten mevcut';
    END IF;

    -- village sütunu ekle (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'village'
    ) THEN
        ALTER TABLE customers ADD COLUMN village TEXT;
        RAISE NOTICE 'customers.village sütunu eklendi';
    ELSE
        RAISE NOTICE 'customers.village sütunu zaten mevcut';
    END IF;

    -- postalCode sütunu ekle (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'postalCode'
    ) THEN
        ALTER TABLE customers ADD COLUMN "postalCode" TEXT;
        RAISE NOTICE 'customers.postalCode sütunu eklendi';
    ELSE
        RAISE NOTICE 'customers.postalCode sütunu zaten mevcut';
    END IF;

    -- country sütunu ekle (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'country'
    ) THEN
        ALTER TABLE customers ADD COLUMN country TEXT DEFAULT 'Türkiye';
        RAISE NOTICE 'customers.country sütunu eklendi';
    ELSE
        RAISE NOTICE 'customers.country sütunu zaten mevcut';
    END IF;
END $$;

-- 2. REMINDERS TABLOSU - Tedavi ve hastalık ilişkileri ekleniyor

DO $$ 
BEGIN
    -- treatmentId sütunu ekle (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminders' AND column_name = 'treatmentId'
    ) THEN
        ALTER TABLE reminders ADD COLUMN "treatmentId" TEXT;
        RAISE NOTICE 'reminders.treatmentId sütunu eklendi';
    ELSE
        RAISE NOTICE 'reminders.treatmentId sütunu zaten mevcut';
    END IF;

    -- illnessId sütunu ekle (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminders' AND column_name = 'illnessId'
    ) THEN
        ALTER TABLE reminders ADD COLUMN "illnessId" TEXT;
        RAISE NOTICE 'reminders.illnessId sütunu eklendi';
    ELSE
        RAISE NOTICE 'reminders.illnessId sütunu zaten mevcut';
    END IF;

    -- isActive sütunu ekle (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminders' AND column_name = 'isActive'
    ) THEN
        ALTER TABLE reminders ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'reminders.isActive sütunu eklendi';
    ELSE
        RAISE NOTICE 'reminders.isActive sütunu zaten mevcut';
    END IF;

    -- dismissedAt sütunu ekle (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminders' AND column_name = 'dismissedAt'
    ) THEN
        ALTER TABLE reminders ADD COLUMN "dismissedAt" TIMESTAMP;
        RAISE NOTICE 'reminders.dismissedAt sütunu eklendi';
    ELSE
        RAISE NOTICE 'reminders.dismissedAt sütunu zaten mevcut';
    END IF;

    -- dismissedBy sütunu ekle (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminders' AND column_name = 'dismissedBy'
    ) THEN
        ALTER TABLE reminders ADD COLUMN "dismissedBy" TEXT;
        RAISE NOTICE 'reminders.dismissedBy sütunu eklendi';
    ELSE
        RAISE NOTICE 'reminders.dismissedBy sütunu zaten mevcut';
    END IF;
END $$;

-- 3. FOREIGN KEY CONSTRAINTS - Güvenli ekleme

DO $$ 
BEGIN
    -- reminders -> treatments FK (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reminders_treatmentId_fkey'
    ) THEN
        ALTER TABLE reminders 
        ADD CONSTRAINT "reminders_treatmentId_fkey" 
        FOREIGN KEY ("treatmentId") REFERENCES treatments(id) ON DELETE SET NULL;
        RAISE NOTICE 'reminders_treatmentId_fkey constraint eklendi';
    ELSE
        RAISE NOTICE 'reminders_treatmentId_fkey constraint zaten mevcut';
    END IF;

    -- reminders -> illnesses FK (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reminders_illnessId_fkey'
    ) THEN
        ALTER TABLE reminders 
        ADD CONSTRAINT "reminders_illnessId_fkey" 
        FOREIGN KEY ("illnessId") REFERENCES illnesses(id) ON DELETE SET NULL;
        RAISE NOTICE 'reminders_illnessId_fkey constraint eklendi';
    ELSE
        RAISE NOTICE 'reminders_illnessId_fkey constraint zaten mevcut';
    END IF;

    -- reminders -> users (dismissedBy) FK (eğer yoksa)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reminders_dismissedBy_fkey'
    ) THEN
        ALTER TABLE reminders 
        ADD CONSTRAINT "reminders_dismissedBy_fkey" 
        FOREIGN KEY ("dismissedBy") REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'reminders_dismissedBy_fkey constraint eklendi';
    ELSE
        RAISE NOTICE 'reminders_dismissedBy_fkey constraint zaten mevcut';
    END IF;
END $$;

-- 4. INDEXES - Performans için (eğer yoksa)

DO $$ 
BEGIN
    -- reminders treatmentId index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'reminders_treatmentId_idx'
    ) THEN
        CREATE INDEX "reminders_treatmentId_idx" ON reminders("treatmentId");
        RAISE NOTICE 'reminders_treatmentId_idx index eklendi';
    ELSE
        RAISE NOTICE 'reminders_treatmentId_idx index zaten mevcut';
    END IF;

    -- reminders illnessId index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'reminders_illnessId_idx'
    ) THEN
        CREATE INDEX "reminders_illnessId_idx" ON reminders("illnessId");
        RAISE NOTICE 'reminders_illnessId_idx index eklendi';
    ELSE
        RAISE NOTICE 'reminders_illnessId_idx index zaten mevcut';
    END IF;

    -- reminders isActive index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'reminders_isActive_idx'
    ) THEN
        CREATE INDEX "reminders_isActive_idx" ON reminders("isActive");
        RAISE NOTICE 'reminders_isActive_idx index eklendi';
    ELSE
        RAISE NOTICE 'reminders_isActive_idx index zaten mevcut';
    END IF;

    -- reminders dismissedBy index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'reminders_dismissedBy_idx'
    ) THEN
        CREATE INDEX "reminders_dismissedBy_idx" ON reminders("dismissedBy");
        RAISE NOTICE 'reminders_dismissedBy_idx index eklendi';
    ELSE
        RAISE NOTICE 'reminders_dismissedBy_idx index zaten mevcut';
    END IF;

    -- reminders dueDate + isActive composite index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'reminders_dueDate_isActive_idx'
    ) THEN
        CREATE INDEX "reminders_dueDate_isActive_idx" ON reminders("dueDate", "isActive");
        RAISE NOTICE 'reminders_dueDate_isActive_idx index eklendi';
    ELSE
        RAISE NOTICE 'reminders_dueDate_isActive_idx index zaten mevcut';
    END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Customers tablosu sütun kontrolü
SELECT 
    'customers' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'customers'
    AND column_name IN ('neighborhood', 'village', 'postalCode', 'country')
ORDER BY ordinal_position;

-- Reminders tablosu sütun kontrolü
SELECT 
    'reminders' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'reminders'
    AND column_name IN ('treatmentId', 'illnessId', 'isActive', 'dismissedAt', 'dismissedBy')
ORDER BY ordinal_position;

-- Foreign key kontrolü
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'reminders'
    AND tc.constraint_name IN ('reminders_treatmentId_fkey', 'reminders_illnessId_fkey', 'reminders_dismissedBy_fkey');

-- Index kontrolü
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename = 'reminders'
    AND indexname IN (
        'reminders_treatmentId_idx',
        'reminders_illnessId_idx',
        'reminders_isActive_idx',
        'reminders_dismissedBy_idx',
        'reminders_dueDate_isActive_idx'
    );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
