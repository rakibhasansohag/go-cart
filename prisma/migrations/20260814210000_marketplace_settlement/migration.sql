CREATE TYPE "SettlementStatus" AS ENUM ('HELD', 'ELIGIBLE', 'APPROVED', 'PROCESSING', 'RELEASED', 'REVERSED', 'FAILED', 'BLOCKED');
CREATE TYPE "SettlementLedgerEntryType" AS ENUM ('INITIAL', 'REFUND', 'REVERSAL', 'ADJUSTMENT', 'PAYOUT');
CREATE TYPE "PayoutBatchStatus" AS ENUM ('DRAFT', 'APPROVED', 'PROCESSING', 'PAID', 'PARTIAL', 'FAILED', 'CANCELLED');

CREATE TABLE "PayoutBatch" (
  "id" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "weekEnd" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "PayoutBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SellerSettlement" (
  "id" TEXT NOT NULL,
  "orderGroupId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "SettlementStatus" NOT NULL DEFAULT 'HELD',
  "grossCents" INTEGER NOT NULL,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "shippingCents" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "providerFeeCents" INTEGER NOT NULL DEFAULT 0,
  "commissionCents" INTEGER NOT NULL DEFAULT 0,
  "refundedCents" INTEGER NOT NULL DEFAULT 0,
  "reversedCents" INTEGER NOT NULL DEFAULT 0,
  "sellerPayableCents" INTEGER NOT NULL,
  "remainingPayableCents" INTEGER NOT NULL,
  "eligibleAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "providerTransferId" TEXT,
  "failureReason" TEXT,
  "payoutBatchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellerSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettlementLedgerEntry" (
  "id" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "entryType" "SettlementLedgerEntryType" NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "grossCents" INTEGER NOT NULL DEFAULT 0,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "shippingCents" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "providerFeeCents" INTEGER NOT NULL DEFAULT 0,
  "commissionCents" INTEGER NOT NULL DEFAULT 0,
  "refundCents" INTEGER NOT NULL DEFAULT 0,
  "reversalCents" INTEGER NOT NULL DEFAULT 0,
  "sellerPayableCents" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SettlementLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayoutBatch_idempotencyKey_key" ON "PayoutBatch"("idempotencyKey");
CREATE INDEX "PayoutBatch_status_weekStart_idx" ON "PayoutBatch"("status", "weekStart");
CREATE UNIQUE INDEX "SellerSettlement_orderGroupId_key" ON "SellerSettlement"("orderGroupId");
CREATE UNIQUE INDEX "SellerSettlement_providerTransferId_key" ON "SellerSettlement"("providerTransferId");
CREATE INDEX "SellerSettlement_sellerId_status_idx" ON "SellerSettlement"("sellerId", "status");
CREATE INDEX "SellerSettlement_status_eligibleAt_idx" ON "SellerSettlement"("status", "eligibleAt");
CREATE INDEX "SellerSettlement_payoutBatchId_idx" ON "SellerSettlement"("payoutBatchId");
CREATE UNIQUE INDEX "SettlementLedgerEntry_idempotencyKey_key" ON "SettlementLedgerEntry"("idempotencyKey");
CREATE INDEX "SettlementLedgerEntry_settlementId_createdAt_idx" ON "SettlementLedgerEntry"("settlementId", "createdAt");
CREATE INDEX "SettlementLedgerEntry_entryType_createdAt_idx" ON "SettlementLedgerEntry"("entryType", "createdAt");

ALTER TABLE "SellerSettlement" ADD CONSTRAINT "SellerSettlement_orderGroupId_fkey"
  FOREIGN KEY ("orderGroupId") REFERENCES "OrderGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SellerSettlement" ADD CONSTRAINT "SellerSettlement_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SellerSettlement" ADD CONSTRAINT "SellerSettlement_payoutBatchId_fkey"
  FOREIGN KEY ("payoutBatchId") REFERENCES "PayoutBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SettlementLedgerEntry" ADD CONSTRAINT "SettlementLedgerEntry_settlementId_fkey"
  FOREIGN KEY ("settlementId") REFERENCES "SellerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
