-- A seller may own multiple stores, but their legal payout entity and Stripe
-- connected account should normally be shared across those stores.
DO $$
BEGIN
  IF EXISTS (
    SELECT s."userId"
    FROM "StorePaymentAccount" spa
    INNER JOIN "Store" s ON s."id" = spa."storeId"
    GROUP BY s."userId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate StorePaymentAccount: a seller has multiple connected accounts. Resolve those accounts before applying this migration.';
  END IF;
END $$;

ALTER TABLE "StorePaymentAccount" ADD COLUMN "userId" TEXT;

UPDATE "StorePaymentAccount" spa
SET "userId" = s."userId"
FROM "Store" s
WHERE s."id" = spa."storeId";

ALTER TABLE "StorePaymentAccount" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "StorePaymentAccount" DROP CONSTRAINT "StorePaymentAccount_storeId_fkey";
DROP INDEX "StorePaymentAccount_storeId_key";
ALTER TABLE "StorePaymentAccount" DROP COLUMN "storeId";

CREATE UNIQUE INDEX "StorePaymentAccount_userId_key" ON "StorePaymentAccount"("userId");

ALTER TABLE "StorePaymentAccount" ADD CONSTRAINT "StorePaymentAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
