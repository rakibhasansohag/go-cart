CREATE TABLE "PlatformSetting" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "commissionPercent" INTEGER NOT NULL DEFAULT 2,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlatformSetting"
  ADD CONSTRAINT "PlatformSetting_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "PlatformSetting" ("id", "commissionPercent", "createdAt", "updatedAt")
VALUES ('default', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE INDEX "PlatformSetting_updatedById_idx" ON "PlatformSetting"("updatedById");
