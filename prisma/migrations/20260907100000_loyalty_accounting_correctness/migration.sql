-- AlterEnum
ALTER TYPE "LoyaltyTxType" ADD VALUE IF NOT EXISTS 'REFUND';
ALTER TYPE "LoyaltyTxType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';

-- Check constraint on LoyaltyAccount to prevent negative balances
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyAccount_balance_non_negative'
    ) THEN
        ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_balance_non_negative" CHECK ("balance" >= 0);
    END IF;
END $$;
