/**
 * NEXT.JS INSTRUMENTATION
 *
 * Sunucu başlangıcında bir kez çalışır.
 *
 * Yaptığı işler:
 *  1) Deploy migration'ları: yeni tablolar + tek seferlik veri düzeltmeleri.
 *     Yalnızca bir kez uygulanır (app_migrations tablosunda işaretlenir).
 *     DEPLOY_MIGRATIONS_ENABLED=false ile kapatılabilir.
 *  2) İç denetim zamanlayıcısı (INTERNAL_AUDIT_ENABLED=true ise).
 */

export async function register() {
  // Yalnızca Node.js runtime (edge değil)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Build aşamasında ÇALIŞMA (migration/denetim yalnızca runtime'da).
  // Aksi halde build sırasında veritabanına bağlanmaya çalışılır.
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  ) {
    return;
  }

  // ---------------------------------------------------------------------
  // 1) DEPLOY MİGRASYONLARI (yeni tablolar + tek seferlik bakiye düzeltmeleri)
  //    NOT: Birincil mekanizma `npm start` içindeki scripts/deploy-migrate.js
  //    adımıdır. Buradaki çağrı, farklı bir komutla başlatılırsa diye
  //    yedektir; app_migrations sayesinde çift çalışmaz.
  // ---------------------------------------------------------------------
  if (process.env.DEPLOY_MIGRATIONS_ENABLED !== "false") {
    try {
      const { runDeployMigrations } = await import("@/lib/deploy-migrations");
      await runDeployMigrations(true);
    } catch (error) {
      console.error("[INSTRUMENTATION] Deploy migration hatası:", error);
      // Uygulama yine de başlasın; migration tekrar denenebilir.
    }
  }

  // ---------------------------------------------------------------------
  // 2) İÇ DENETİM ZAMANLAYICISI
  // ---------------------------------------------------------------------
  if (process.env.INTERNAL_AUDIT_ENABLED !== "true") {
    return;
  }

  try {
    const { startAuditScheduler } = await import("@/lib/internal-audit");
    const minutes = Number(process.env.INTERNAL_AUDIT_INTERVAL_MINUTES ?? 360);
    startAuditScheduler(Number.isFinite(minutes) && minutes > 0 ? minutes : 360);
  } catch (error) {
    console.error("[INSTRUMENTATION] İç denetim zamanlayıcısı başlatılamadı:", error);
  }
}
