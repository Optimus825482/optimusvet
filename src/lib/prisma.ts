import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  createAuditExtension,
  setAuditWriter,
  setAuditExtensionActive,
} from "./prisma-audit-middleware";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  auditBasePrisma: PrismaClient | undefined;
};

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

function createBaseClient(): PrismaClient {
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// Temel client (extension'sız): audit kayıtlarını yazan taraf.
// Extension'sız olduğu için audit yazımı kendini tekrar tetikleyemez.
const basePrisma = globalForPrisma.auditBasePrisma ?? createBaseClient();

// Her modül değerlendirmesinde (hot-reload dahil) yazıcıyı ve bayrağı
// yeniden bağla. globalForPrisma cache'i isabet etse bile audit yazımı
// çalışmaya devam eder.
setAuditWriter(basePrisma);
setAuditExtensionActive(true);

// ✅ OTOMATİK AUDIT LOG
// $extends, PrismaPg adapter ile çalışır ve $transaction içindeki
// yazmaları da yakalar. Tüm model ve operasyonları kapsar.
//
// Tip notu: Prisma extension'ın dönüş tipi, temel PrismaClient tipiyle
// birleşince groupBy/$transaction imzaları çözülemez hale geliyor
// (TS2349). Extension yeni metot eklemediği için yüzey tipleri aynıdır;
// bu yüzden PrismaClient olarak sabitliyoruz. Runtime davranışı
// (otomatik audit) değişmez.
const extendedPrisma = basePrisma.$extends(
  createAuditExtension(),
) as unknown as PrismaClient;

export const prisma: PrismaClient = globalForPrisma.prisma ?? extendedPrisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.auditBasePrisma = basePrisma;
}

export default prisma;
