-- Persist per-user channel preferences while keeping defaults enabled.
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_userId_category_channel_key"
    ON "NotificationPreference"("userId", "category", "channel");
CREATE INDEX "NotificationPreference_userId_channel_enabled_idx"
    ON "NotificationPreference"("userId", "channel", "enabled");

ALTER TABLE "NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
