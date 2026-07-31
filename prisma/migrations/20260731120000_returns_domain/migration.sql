-- CreateEnum
CREATE TYPE "ReturnRequestStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'APPROVED', 'REJECTED', 'AWAITING_SHIPMENT', 'IN_TRANSIT', 'RECEIVED', 'REFUND_PENDING', 'REFUNDED', 'EXCHANGE_PENDING', 'EXCHANGED', 'CANCELLED', 'ESCALATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'SIZE_OR_FIT', 'CHANGED_MIND', 'ARRIVED_LATE', 'MISSING_PARTS', 'OTHER');

-- CreateEnum
CREATE TYPE "ReturnResolution" AS ENUM ('REFUND', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "ReturnActorRole" AS ENUM ('CUSTOMER', 'SELLER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReturnEvidenceType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "RefundTransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "status" "ReturnRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" "ReturnReason" NOT NULL,
    "resolution" "ReturnResolution" NOT NULL,
    "customerNote" TEXT,
    "sellerNote" TEXT,
    "adminNote" TEXT,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "respondBy" TIMESTAMP(3),
    "returnBy" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderGroupId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "paymentDetailsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "restockedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitAmount" DOUBLE PRECISION NOT NULL,
    "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION,
    "restockable" BOOLEAN,
    "activeRequestKey" TEXT,
    "returnRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnEvidence" (
    "id" TEXT NOT NULL,
    "type" "ReturnEvidenceType" NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "returnRequestId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnEvent" (
    "id" TEXT NOT NULL,
    "actorRole" "ReturnActorRole" NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" "ReturnRequestStatus",
    "toStatus" "ReturnRequestStatus",
    "note" TEXT,
    "metadata" JSONB,
    "returnRequestId" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundTransaction" (
    "id" TEXT NOT NULL,
    "provider" "PaymentMethod" NOT NULL,
    "providerRefundId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "RefundTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "failureReason" TEXT,
    "providerResponse" JSONB,
    "processedAt" TIMESTAMP(3),
    "returnRequestId" TEXT NOT NULL,
    "paymentDetailsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReturnRequest_customerId_status_idx" ON "ReturnRequest"("customerId", "status");

-- CreateIndex
CREATE INDEX "ReturnRequest_storeId_status_idx" ON "ReturnRequest"("storeId", "status");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderGroupId_idx" ON "ReturnRequest"("orderGroupId");

-- CreateIndex
CREATE INDEX "ReturnRequest_paymentDetailsId_idx" ON "ReturnRequest"("paymentDetailsId");

-- CreateIndex
CREATE INDEX "ReturnRequest_createdAt_idx" ON "ReturnRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnItem_activeRequestKey_key" ON "ReturnItem"("activeRequestKey");

-- CreateIndex
CREATE INDEX "ReturnItem_orderItemId_idx" ON "ReturnItem"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnItem_returnRequestId_orderItemId_key" ON "ReturnItem"("returnRequestId", "orderItemId");

-- CreateIndex
CREATE INDEX "ReturnEvidence_returnRequestId_idx" ON "ReturnEvidence"("returnRequestId");

-- CreateIndex
CREATE INDEX "ReturnEvidence_uploadedById_idx" ON "ReturnEvidence"("uploadedById");

-- CreateIndex
CREATE INDEX "ReturnEvent_returnRequestId_createdAt_idx" ON "ReturnEvent"("returnRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnEvent_actorId_idx" ON "ReturnEvent"("actorId");

-- CreateIndex
CREATE INDEX "ReturnEvent_eventType_idx" ON "ReturnEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "RefundTransaction_providerRefundId_key" ON "RefundTransaction"("providerRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundTransaction_idempotencyKey_key" ON "RefundTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RefundTransaction_returnRequestId_idx" ON "RefundTransaction"("returnRequestId");

-- CreateIndex
CREATE INDEX "RefundTransaction_paymentDetailsId_idx" ON "RefundTransaction"("paymentDetailsId");

-- CreateIndex
CREATE INDEX "RefundTransaction_provider_status_idx" ON "RefundTransaction"("provider", "status");

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "OrderGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_paymentDetailsId_fkey" FOREIGN KEY ("paymentDetailsId") REFERENCES "PaymentDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnEvidence" ADD CONSTRAINT "ReturnEvidence_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnEvidence" ADD CONSTRAINT "ReturnEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnEvent" ADD CONSTRAINT "ReturnEvent_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnEvent" ADD CONSTRAINT "ReturnEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_paymentDetailsId_fkey" FOREIGN KEY ("paymentDetailsId") REFERENCES "PaymentDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
