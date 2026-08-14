CREATE TYPE "PaymentAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'RESTRICTED', 'REJECTED');

CREATE TABLE "StorePaymentAccount" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'STRIPE',
    "providerAccountId" TEXT NOT NULL,
    "status" "PaymentAccountStatus" NOT NULL DEFAULT 'PENDING',
    "country" TEXT,
    "transfersCapability" TEXT,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePaymentAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorePaymentAccount_storeId_key" ON "StorePaymentAccount"("storeId");
CREATE UNIQUE INDEX "StorePaymentAccount_providerAccountId_key" ON "StorePaymentAccount"("providerAccountId");
CREATE INDEX "StorePaymentAccount_provider_status_idx" ON "StorePaymentAccount"("provider", "status");

ALTER TABLE "StorePaymentAccount" ADD CONSTRAINT "StorePaymentAccount_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
