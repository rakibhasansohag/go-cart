-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "targetUserId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DailyCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "coinsEarned" INTEGER NOT NULL DEFAULT 0,
    "rewardType" TEXT NOT NULL DEFAULT 'COINS',
    "couponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DailyCheckIn_userId_date_key" ON "DailyCheckIn"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyCheckIn_userId_yearMonth_idx" ON "DailyCheckIn"("userId", "yearMonth");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Coupon_targetUserId_idx" ON "Coupon"("targetUserId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Coupon_targetUserId_fkey'
  ) THEN
    ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DailyCheckIn_userId_fkey'
  ) THEN
    ALTER TABLE "DailyCheckIn" ADD CONSTRAINT "DailyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
