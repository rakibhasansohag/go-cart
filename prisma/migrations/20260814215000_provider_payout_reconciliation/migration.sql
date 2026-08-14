ALTER TABLE "StorePaymentAccount" ADD COLUMN "requirementsDueCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StorePaymentAccount" ADD COLUMN "availableBalanceCents" INTEGER;
ALTER TABLE "StorePaymentAccount" ADD COLUMN "pendingBalanceCents" INTEGER;

CREATE TABLE "SellerPayoutRecord" (
  "id" TEXT NOT NULL,
  "providerPayoutId" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "arrivalAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "lastEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellerPayoutRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SellerPayoutRecord_providerPayoutId_key" ON "SellerPayoutRecord"("providerPayoutId");
CREATE UNIQUE INDEX "SellerPayoutRecord_lastEventId_key" ON "SellerPayoutRecord"("lastEventId");
CREATE INDEX "SellerPayoutRecord_providerAccountId_status_idx" ON "SellerPayoutRecord"("providerAccountId", "status");
ALTER TABLE "SellerPayoutRecord" ADD CONSTRAINT "SellerPayoutRecord_providerAccountId_fkey"
  FOREIGN KEY ("providerAccountId") REFERENCES "StorePaymentAccount"("providerAccountId") ON DELETE CASCADE ON UPDATE CASCADE;
