CREATE TYPE "FulfillmentAutomationMode" AS ENUM ('MANUAL', 'DEMO');
CREATE TYPE "AutomationRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

ALTER TABLE "OrderGroup"
  ADD COLUMN "automationMode" "FulfillmentAutomationMode" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "nextTransitionAt" TIMESTAMP(3),
  ADD COLUMN "automationPaused" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "OrderGroup_automationMode_automationPaused_nextTransitionAt_idx"
  ON "OrderGroup"("automationMode", "automationPaused", "nextTransitionAt");

CREATE TABLE "AutomationRun" (
  "id" TEXT NOT NULL,
  "status" "AutomationRunStatus" NOT NULL DEFAULT 'RUNNING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "scannedCount" INTEGER NOT NULL DEFAULT 0,
  "advancedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "errorSummary" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AutomationRun_idempotencyKey_key" ON "AutomationRun"("idempotencyKey");
CREATE INDEX "AutomationRun_status_startedAt_idx" ON "AutomationRun"("status", "startedAt");
