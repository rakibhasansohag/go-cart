ALTER TABLE "Store" ALTER COLUMN "returnWindowDays" SET DEFAULT 7;
ALTER TABLE "Store" ALTER COLUMN "returnPolicy" SET DEFAULT 'Return within 7 days of confirmed delivery in good condition.';

UPDATE "Store"
SET "returnWindowDays" = 7,
    "returnPolicy" = 'Return within 7 days of confirmed delivery in good condition.'
WHERE "returnWindowDays" = 30
  AND "returnPolicy" = 'Return in 30 days.';
