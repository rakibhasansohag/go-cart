-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL DEFAULT 'USD',
    "target" TEXT NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRate_target_idx" ON "ExchangeRate"("target");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_base_target_key" ON "ExchangeRate"("base", "target");
