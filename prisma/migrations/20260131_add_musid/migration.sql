-- Add musId column to customers table
ALTER TABLE "customers" ADD COLUMN "musId" INTEGER;

-- Create unique index on musId
CREATE UNIQUE INDEX "customers_musId_key" ON "customers"("musId");
