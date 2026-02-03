import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { setupAuditMiddleware } from "./prisma-audit-middleware";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// ✅ AUDIT MIDDLEWARE - PrismaPg adapter ile çalışmıyor
// setupAuditMiddleware(prisma);
// Not: Audit logging için API seviyesinde manuel implementation gerekli

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
