CREATE TYPE "BackgroundJobKind" AS ENUM ('EMAIL', 'NOTIFICATION', 'INVENTORY', 'PAYMENT', 'CRON', 'WORKFLOW');
CREATE TYPE "BackgroundJobStatus" AS ENUM ('READY', 'PROCESSING', 'SUCCEEDED', 'DEAD');
CREATE TABLE "BackgroundJob" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "kind" "BackgroundJobKind" NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "BackgroundJobStatus" NOT NULL DEFAULT 'READY',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "replayCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextPublishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" TEXT, "leaseUntil" TIMESTAMP(3), "messageId" TEXT,
  "publishedAt" TIMESTAMP(3), "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "lastError" TEXT, "alertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BackgroundJob_eventKey_key" ON "BackgroundJob"("eventKey");
CREATE INDEX "BackgroundJob_status_nextAttemptAt_idx" ON "BackgroundJob"("status", "nextAttemptAt");
CREATE INDEX "BackgroundJob_status_nextPublishAt_idx" ON "BackgroundJob"("status", "nextPublishAt");
CREATE INDEX "BackgroundJob_kind_createdAt_idx" ON "BackgroundJob"("kind", "createdAt");
