-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "NotificationDeliveryAudit" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 0,
    "recipientEmail" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "sourceEventId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDeliveryAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDeliveryAudit_sourceEventId_recipientId_channel_attemptNumber_key"
    ON "NotificationDeliveryAudit"("sourceEventId", "recipientId", "channel", "attemptNumber");
CREATE INDEX "NotificationDeliveryAudit_status_createdAt_idx"
    ON "NotificationDeliveryAudit"("status", "createdAt");
CREATE INDEX "NotificationDeliveryAudit_recipientId_createdAt_idx"
    ON "NotificationDeliveryAudit"("recipientId", "createdAt");
CREATE INDEX "NotificationDeliveryAudit_sourceEventId_channel_attemptNumber_idx"
    ON "NotificationDeliveryAudit"("sourceEventId", "channel", "attemptNumber");

-- AddForeignKey
ALTER TABLE "NotificationDeliveryAudit" ADD CONSTRAINT "NotificationDeliveryAudit_sourceEventId_fkey"
    FOREIGN KEY ("sourceEventId") REFERENCES "DomainEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDeliveryAudit" ADD CONSTRAINT "NotificationDeliveryAudit_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
