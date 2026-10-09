/**
 * DEPLOY MİGRASYON ÇALIŞTIRICI (one-time deploy migrations)
 *
 * Ne yapar:
 *   prisma/migrations/deploy/*.sql dosyalarını sıra numarasına göre çalıştırır.
 *   Her dosya **yalnızca bir kez** uygulanır; uygulananlar `app_migrations`
 *   tablosunda işaretlenir. Böylece her deploy'da tekrar çalışmaz.
 *
 * Neden `pg` Pool?
 *   SQL dosyaları birden çok ifade (BEGIN ... COMMIT) içerir. Prisma'nın
 *   $executeRawUnsafe'ı prepared-statement protokolü kullandığı için çoklu
 *   ifadeyi çalıştıramaz. `pg` Pool'un basit query protokolü çoklu ifadeyi
 *   destekler.
 *
 * Nasıl tetiklenir:
 *   src/instrumentation.ts → sunucu başlangıcında (deploy/restart anında).
 *
 * Hata durumu:
 *   Bir migration hata verirse istisna fırlatılır (deploy loglarında görünür).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations", "deploy");

export interface DeployMigrationResult {
  applied: string[];
  skipped: string[];
  failed?: { name: string; error: string };
}

export async function runDeployMigrations(
  verbose = true,
): Promise<DeployMigrationResult> {
  const result: DeployMigrationResult = { applied: [], skipped: [] };
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // 1) Kayıt tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "app_migrations" (
        "name"       TEXT NOT NULL,
        "appliedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "durationMs" INTEGER,
        CONSTRAINT "app_migrations_pkey" PRIMARY KEY ("name")
      );
    `);

    const { rows } = await pool.query<{ name: string }>(
      `SELECT "name" FROM "app_migrations"`,
    );
    const done = new Set(rows.map((r) => r.name));

    let files: string[];
    try {
      files = readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    } catch {
      if (verbose) console.log("[DEPLOY-MIGRATE] Migration klasörü yok, atlanıyor.");
      return result;
    }

    for (const file of files) {
      if (done.has(file)) {
        result.skipped.push(file);
        continue;
      }

      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
      const startedAt = Date.now();

      try {
        if (verbose) console.log(`[DEPLOY-MIGRATE] Uygulanıyor: ${file}`);
        // Çoklu ifade (BEGIN/COMMIT dahil) desteklenir.
        await pool.query(sql);

        const durationMs = Date.now() - startedAt;
        await pool.query(
          `INSERT INTO "app_migrations" ("name", "durationMs") VALUES ($1, $2)
           ON CONFLICT ("name") DO NOTHING`,
          [file, durationMs],
        );
        result.applied.push(file);
        if (verbose) console.log(`[DEPLOY-MIGRATE] ✅ ${file} (${durationMs}ms)`);
      } catch (error: any) {
        result.failed = { name: file, error: error?.message ?? String(error) };
        console.error(`[DEPLOY-MIGRATE] ❌ ${file} HATA:`, error?.message ?? error);
        throw error;
      }
    }

    if (verbose) {
      console.log(
        `[DEPLOY-MIGRATE] Tamamlandı — uygulanan: ${result.applied.length}, atlanan: ${result.skipped.length}`,
      );
    }
    return result;
  } finally {
    await pool.end();
  }
}
