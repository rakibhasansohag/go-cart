-- Phase 9: payment integrity, provider identifiers, and idempotent event audit.
ALTER TABLE "PaymentDetails"
ADD COLUMN "providerCaptureId" TEXT;

CREATE UNIQUE INDEX "PaymentDetails_paymentInetntId_key"
ON "PaymentDetails"("paymentInetntId");

CREATE UNIQUE INDEX "PaymentDetails_providerCaptureId_key"
ON "PaymentDetails"("providerCaptureId");

CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentMethod" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "metadata" JSONB,
    "orderId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key"
ON "PaymentEvent"("providerEventId");

CREATE INDEX "PaymentEvent_orderId_idx"
ON "PaymentEvent"("orderId");

CREATE INDEX "PaymentEvent_provider_providerPaymentId_idx"
ON "PaymentEvent"("provider", "providerPaymentId");

CREATE INDEX "PaymentEvent_eventType_idx"
ON "PaymentEvent"("eventType");

ALTER TABLE "PaymentEvent"
ADD CONSTRAINT "PaymentEvent_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
