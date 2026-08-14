CREATE TABLE "SellerPaymentAccountEvent" (
  "id" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SellerPaymentAccountEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SellerPaymentAccountEvent_providerEventId_key" ON "SellerPaymentAccountEvent"("providerEventId");
CREATE INDEX "SellerPaymentAccountEvent_providerAccountId_eventType_idx" ON "SellerPaymentAccountEvent"("providerAccountId", "eventType");
ALTER TABLE "SellerPaymentAccountEvent" ADD CONSTRAINT "SellerPaymentAccountEvent_providerAccountId_fkey"
  FOREIGN KEY ("providerAccountId") REFERENCES "StorePaymentAccount"("providerAccountId") ON DELETE CASCADE ON UPDATE CASCADE;
