/**
 * DEPLOY MİGRASYON BAŞLATICI (standalone, CJS)
 *
 * `npm start`'tan ÖNCE çalışır (Docker CMD). Next.js sunucusunu başlatmadan
 * önce bekleyen tek-seferlik migration'ları uygular:
 *   1) İç denetim tabloları (reconciliation_runs / reconciliation_issues)
 *   2) Tek seferlik bakiye düzeltmeleri
 *
 * Her migration `app_migrations` tablosunda işaretlenir → bir kez çalışır.
 *
 * Docker CMD:  ["sh","-c","node scripts/deploy-migrate.js && npm start"]
 */

const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

async function main() {
  if (process.env.DEPLOY_MIGRATIONS_ENABLED === "false") {
    console.log("[DEPLOY-MIGRATE] Devre dışı (DEPLOY_MIGRATIONS_ENABLED=false).");
    return;
  }

  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const dir = join(process.cwd(), "prisma", "migrations", "deploy");

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "app_migrations" (
        "name"       TEXT NOT NULL,
        "appliedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "durationMs" INTEGER,
        CONSTRAINT "app_migrations_pkey" PRIMARY KEY ("name")
      );
    `);

    const { rows } = await pool.query(`SELECT "name" FROM "app_migrations"`);
    const done = new Set(rows.map((r) => r.name));

    let files = [];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    } catch {
      console.log("[DEPLOY-MIGRATE] Migration klasörü yok, atlanıyor.");
      return;
    }

    let applied = 0;
    for (const file of files) {
      if (done.has(file)) {
        console.log(`[DEPLOY-MIGRATE] Atlandı (zaten uygulanmış): ${file}`);
        continue;
      }
      const sql = readFileSync(join(dir, file), "utf-8");
      const t0 = Date.now();
      console.log(`[DEPLOY-MIGRATE] Uygulanıyor: ${file}`);
      await pool.query(sql);
      const ms = Date.now() - t0;
      await pool.query(
        `INSERT INTO "app_migrations" ("name", "durationMs") VALUES ($1, $2)
         ON CONFLICT ("name") DO NOTHING`,
        [file, ms],
      );
      applied++;
      console.log(`[DEPLOY-MIGRATE] ✅ ${file} (${ms}ms)`);
    }
    console.log(`[DEPLOY-MIGRATE] Bitti — ${applied} yeni migration uygulandı.`);
  } catch (error) {
    console.error("[DEPLOY-MIGRATE] ❌ HATA:", error?.message || error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[DEPLOY-MIGRATE] Kritik hata:", e?.message || e);
  process.exit(1);
});
