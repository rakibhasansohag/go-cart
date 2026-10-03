-- Existing orders did not reserve inventory. Never restock those by assumption.
ALTER TABLE "OrderItem" ADD COLUMN "inventoryReserved" BOOLEAN NOT NULL DEFAULT false;
