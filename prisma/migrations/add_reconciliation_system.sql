-- İÇ DENETİM / MUTABAKAT SİSTEMİ
-- Yeni tablolar: reconciliation_runs, reconciliation_issues
-- Mevcut tablolara dokunmaz (yalnızca CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "reconciliation_runs" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "customersChecked" INTEGER NOT NULL DEFAULT 0,
    "customersConsistent" INTEGER NOT NULL DEFAULT 0,
    "customersInconsistent" INTEGER NOT NULL DEFAULT 0,
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "highSeverityCount" INTEGER NOT NULL DEFAULT 0,
    "storedBalanceSum" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "formulaASum" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "formulaBSum" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "errorMessage" TEXT,
    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reconciliation_runs_startedAt_idx" ON "reconciliation_runs"("startedAt");
CREATE INDEX IF NOT EXISTS "reconciliation_runs_trigger_idx" ON "reconciliation_runs"("trigger");

CREATE TABLE IF NOT EXISTS "reconciliation_issues" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityCode" TEXT,
    "entityName" TEXT,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reconciliation_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reconciliation_issues_runId_idx" ON "reconciliation_issues"("runId");
CREATE INDEX IF NOT EXISTS "reconciliation_issues_type_idx" ON "reconciliation_issues"("type");
CREATE INDEX IF NOT EXISTS "reconciliation_issues_severity_idx" ON "reconciliation_issues"("severity");
CREATE INDEX IF NOT EXISTS "reconciliation_issues_entityId_idx" ON "reconciliation_issues"("entityId");
CREATE INDEX IF NOT EXISTS "reconciliation_issues_isResolved_idx" ON "reconciliation_issues"("isResolved");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reconciliation_issues_runId_fkey'
  ) THEN
    ALTER TABLE "reconciliation_issues"
      ADD CONSTRAINT "reconciliation_issues_runId_fkey"
      FOREIGN KEY ("runId") REFERENCES "reconciliation_runs"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
