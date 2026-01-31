-- =====================================================
-- TAHSİLAT SİSTEMİ MİGRATION
-- =====================================================
-- Bu migration tahsilat (müşteri ödemesi) sistemi için
-- gerekli tabloları ve ilişkileri oluşturur.
-- =====================================================

-- 1. TAHSILAT TABLOSU (Customer Collections/Receivables)
-- Müşterilerden yapılan tahsilatları kaydeder
CREATE TABLE IF NOT EXISTS "collections" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code" TEXT UNIQUE NOT NULL,
  "customerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paymentMethod" TEXT NOT NULL, -- CASH, CREDIT_CARD, BANK_TRANSFER, CHECK
  "collectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  
  -- Çek bilgileri (opsiyonel)
  "checkNumber" TEXT,
  "checkDate" TIMESTAMP(3),
  "bankName" TEXT,
  
  -- Banka transfer bilgileri (opsiyonel)
  "referenceNumber" TEXT,
  
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "collections_customerId_fkey" FOREIGN KEY ("customerId") 
    REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "collections_userId_fkey" FOREIGN KEY ("userId") 
    REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 2. TAHSİLAT DAĞITIM TABLOSU (Collection Allocations)
-- Tahsilatın hangi satışlara nasıl dağıtıldığını kaydeder (FIFO mantığı)
CREATE TABLE IF NOT EXISTS "collection_allocations" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "collectionId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "collection_allocations_collectionId_fkey" FOREIGN KEY ("collectionId") 
    REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_allocations_transactionId_fkey" FOREIGN KEY ("transactionId") 
    REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 3. İNDEXLER (Performans için)
CREATE INDEX IF NOT EXISTS "collections_customerId_idx" ON "collections"("customerId");
CREATE INDEX IF NOT EXISTS "collections_collectionDate_idx" ON "collections"("collectionDate");
CREATE INDEX IF NOT EXISTS "collections_code_idx" ON "collections"("code");
CREATE INDEX IF NOT EXISTS "collection_allocations_collectionId_idx" ON "collection_allocations"("collectionId");
CREATE INDEX IF NOT EXISTS "collection_allocations_transactionId_idx" ON "collection_allocations"("transactionId");

-- 4. SEQUENCE (Tahsilat kod numarası için)
CREATE SEQUENCE IF NOT EXISTS collection_code_seq START WITH 1;

-- 5. TRIGGER FUNCTION (Otomatik kod oluşturma)
CREATE OR REPLACE FUNCTION generate_collection_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'TAH-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                LPAD(nextval('collection_code_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER (Kod oluşturma trigger'ı)
DROP TRIGGER IF EXISTS collection_code_trigger ON "collections";
CREATE TRIGGER collection_code_trigger
  BEFORE INSERT ON "collections"
  FOR EACH ROW
  EXECUTE FUNCTION generate_collection_code();

-- 7. MEVCUT PAYMENT TABLOSUNA COLLECTION İLİŞKİSİ EKLE (Opsiyonel)
-- Eğer Payment tablosunu da tahsilat sistemiyle ilişkilendirmek isterseniz:
ALTER TABLE "payments" 
  ADD COLUMN IF NOT EXISTS "collectionId" TEXT;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_collectionId_fkey" 
  FOREIGN KEY ("collectionId") 
  REFERENCES "collections"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "payments_collectionId_idx" ON "payments"("collectionId");

-- 8. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS update_collections_updated_at ON "collections";
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON "collections"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÖRNEK KULLANIM
-- =====================================================

-- Örnek 1: Müşteriden 5000 TL tahsilat
-- INSERT INTO "collections" ("customerId", "userId", "amount", "paymentMethod", "notes")
-- VALUES ('customer-id-123', 'user-id-456', 5000.00, 'CASH', 'Nakit tahsilat');

-- Örnek 2: Tahsilatı satışlara dağıt (FIFO)
-- INSERT INTO "collection_allocations" ("collectionId", "transactionId", "amount")
-- VALUES 
--   ('collection-id-789', 'transaction-id-001', 3000.00),
--   ('collection-id-789', 'transaction-id-002', 2000.00);

-- Örnek 3: Müşterinin toplam tahsilatını görüntüle
-- SELECT 
--   c.code,
--   c.amount,
--   c.paymentMethod,
--   c.collectionDate,
--   cu.name as customer_name
-- FROM "collections" c
-- JOIN "customers" cu ON c."customerId" = cu.id
-- WHERE c."customerId" = 'customer-id-123'
-- ORDER BY c.collectionDate DESC;

-- Örnek 4: Tahsilatın dağılımını görüntüle
-- SELECT 
--   ca.amount,
--   t.code as transaction_code,
--   t.total as transaction_total,
--   t.date as transaction_date
-- FROM "collection_allocations" ca
-- JOIN "transactions" t ON ca."transactionId" = t.id
-- WHERE ca."collectionId" = 'collection-id-789';

-- =====================================================
-- ROLLBACK (Geri alma için)
-- =====================================================
-- DROP TRIGGER IF EXISTS update_collections_updated_at ON "collections";
-- DROP TRIGGER IF EXISTS collection_code_trigger ON "collections";
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP FUNCTION IF EXISTS generate_collection_code();
-- DROP SEQUENCE IF EXISTS collection_code_seq;
-- DROP INDEX IF EXISTS "payments_collectionId_idx";
-- DROP INDEX IF EXISTS "collection_allocations_transactionId_idx";
-- DROP INDEX IF EXISTS "collection_allocations_collectionId_idx";
-- DROP INDEX IF EXISTS "collections_code_idx";
-- DROP INDEX IF EXISTS "collections_collectionDate_idx";
-- DROP INDEX IF EXISTS "collections_customerId_idx";
-- ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_collectionId_fkey";
-- ALTER TABLE "payments" DROP COLUMN IF EXISTS "collectionId";
-- DROP TABLE IF EXISTS "collection_allocations";
-- DROP TABLE IF EXISTS "collections";
