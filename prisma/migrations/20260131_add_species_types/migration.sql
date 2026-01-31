-- AlterEnum: Add new species types to Species enum
ALTER TYPE "Species" ADD VALUE IF NOT EXISTS 'FISH';
ALTER TYPE "Species" ADD VALUE IF NOT EXISTS 'REPTILE';
ALTER TYPE "Species" ADD VALUE IF NOT EXISTS 'RODENT';
