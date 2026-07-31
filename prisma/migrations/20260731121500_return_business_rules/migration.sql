-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ReturnItem" ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "requestedDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "requestedShipping" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "requestedSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "requestedTax" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "returnShippingFees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "returnWindowDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "returnsAccepted" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "OrderItem_status_deliveredAt_idx" ON "OrderItem"("status", "deliveredAt");
