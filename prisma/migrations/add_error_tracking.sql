-- =====================================================
-- ERROR TRACKING SYSTEM MIGRATION
-- Hata takip ve email bildirim sistemi
-- =====================================================

-- 1. ErrorSeverity ENUM oluştur
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ErrorSeverity') THEN
        CREATE TYPE "ErrorSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
        RAISE NOTICE 'ErrorSeverity enum oluşturuldu';
    ELSE
        RAISE NOTICE 'ErrorSeverity enum zaten mevcut';
    END IF;
END $$;

-- 2. error_logs tablosu oluştur
CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    
    -- Error Details
    code TEXT NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,
    severity "ErrorSeverity" NOT NULL DEFAULT 'MEDIUM',
    
    -- Context
    context JSONB,
    component TEXT,
    function TEXT,
    
    -- User Context
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    
    -- Request Context
    "requestPath" TEXT,
    "requestMethod" TEXT,
    "requestBody" JSONB,
    "requestQuery" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    
    -- Error Classification
    "isOperational" BOOLEAN NOT NULL DEFAULT true,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP,
    "resolvedBy" TEXT,
    resolution TEXT,
    
    -- Notification
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP,
    "notifyAdmin" BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes oluştur (performans için)
DO $$ 
BEGIN
    -- code index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'error_logs_code_idx'
    ) THEN
        CREATE INDEX error_logs_code_idx ON error_logs(code);
        RAISE NOTICE 'error_logs_code_idx index oluşturuldu';
    END IF;

    -- severity index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'error_logs_severity_idx'
    ) THEN
        CREATE INDEX error_logs_severity_idx ON error_logs(severity);
        RAISE NOTICE 'error_logs_severity_idx index oluşturuldu';
    END IF;

    -- createdAt index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'error_logs_createdAt_idx'
    ) THEN
        CREATE INDEX "error_logs_createdAt_idx" ON error_logs("createdAt");
        RAISE NOTICE 'error_logs_createdAt_idx index oluşturuldu';
    END IF;

    -- isResolved index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'error_logs_isResolved_idx'
    ) THEN
        CREATE INDEX "error_logs_isResolved_idx" ON error_logs("isResolved");
        RAISE NOTICE 'error_logs_isResolved_idx index oluşturuldu';
    END IF;

    -- userId index
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'error_logs_userId_idx'
    ) THEN
        CREATE INDEX "error_logs_userId_idx" ON error_logs("userId");
        RAISE NOTICE 'error_logs_userId_idx index oluşturuldu';
    END IF;

    -- Composite index (code + severity + createdAt)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'error_logs_code_severity_createdAt_idx'
    ) THEN
        CREATE INDEX "error_logs_code_severity_createdAt_idx" ON error_logs(code, severity, "createdAt");
        RAISE NOTICE 'error_logs_code_severity_createdAt_idx index oluşturuldu';
    END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Tablo kontrolü
SELECT 
    'error_logs' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'error_logs';

-- Index kontrolü
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'error_logs'
ORDER BY indexname;

-- Enum kontrolü
SELECT 
    enumlabel as severity_level
FROM pg_enum
WHERE enumtypid = 'ErrorSeverity'::regtype
ORDER BY enumsortorder;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 
    '✅ Error Tracking System Migration Complete' as status,
    NOW() as completed_at;
