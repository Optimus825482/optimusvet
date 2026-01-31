-- CreateEnum
CREATE TYPE "IllnessStatus" AS ENUM ('ACTIVE', 'RECOVERED', 'CHRONIC', 'MONITORING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IllnessSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "illnesses" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diagnosis" TEXT,
    "symptoms" TEXT,
    "findings" TEXT,
    "notes" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" "IllnessStatus" NOT NULL DEFAULT 'ACTIVE',
    "severity" "IllnessSeverity" NOT NULL DEFAULT 'MODERATE',
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "illnesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" TEXT NOT NULL,
    "illnessId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "applicationMethod" TEXT,
    "notes" TEXT,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "TreatmentStatus" NOT NULL DEFAULT 'ONGOING',
    "nextCheckupDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "illnesses_animalId_idx" ON "illnesses"("animalId");

-- CreateIndex
CREATE INDEX "illnesses_status_idx" ON "illnesses"("status");

-- CreateIndex
CREATE INDEX "illnesses_startDate_idx" ON "illnesses"("startDate");

-- CreateIndex
CREATE INDEX "treatments_illnessId_idx" ON "treatments"("illnessId");

-- CreateIndex
CREATE INDEX "treatments_productId_idx" ON "treatments"("productId");

-- CreateIndex
CREATE INDEX "treatments_status_idx" ON "treatments"("status");

-- CreateIndex
CREATE INDEX "treatments_startDate_idx" ON "treatments"("startDate");

-- AddForeignKey
ALTER TABLE "illnesses" ADD CONSTRAINT "illnesses_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_illnessId_fkey" FOREIGN KEY ("illnessId") REFERENCES "illnesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
