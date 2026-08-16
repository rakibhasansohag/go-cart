-- Track a new provider idempotency key only after a known failed settlement transfer.
ALTER TABLE "SellerSettlement"
ADD COLUMN "transferAttempt" INTEGER NOT NULL DEFAULT 0;
