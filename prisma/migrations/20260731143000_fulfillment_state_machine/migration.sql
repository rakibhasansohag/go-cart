-- Extend compatibility summary enums for verified pickup completion.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PickedUp';
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'PickedUp';

-- Fulfillment is split into seller package preparation and logistics shipment execution.
CREATE TYPE "FulfillmentMode" AS ENUM ('PLATFORM', 'SELLER', 'PICKUP');
CREATE TYPE "PackageStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PROCESSING', 'READY_FOR_HANDOFF', 'HANDED_OFF', 'CANCELLED');
CREATE TYPE "ShipmentStatus" AS ENUM ('AWAITING_RECEIPT', 'RECEIVED_AT_HUB', 'READY_FOR_DISPATCH', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPT_FAILED', 'READY_FOR_REDELIVERY', 'RETURNED_TO_HUB', 'RETURNED_TO_SELLER', 'DELIVERED', 'AWAITING_PICKUP', 'PICKED_UP', 'CANCELLED');
CREATE TYPE "FulfillmentEntityType" AS ENUM ('PACKAGE', 'SHIPMENT');
CREATE TYPE "FulfillmentActorRole" AS ENUM ('CUSTOMER', 'SELLER', 'WAREHOUSE', 'CARRIER', 'ADMIN', 'SYSTEM');
CREATE TYPE "FulfillmentSource" AS ENUM ('MANUAL', 'API', 'WEBHOOK', 'AUTOMATION', 'MIGRATION');
CREATE TYPE "CancellationRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "CancellationReasonCode" AS ENUM ('ORDERED_BY_MISTAKE', 'FOUND_BETTER_PRICE', 'SHIPPING_TOO_SLOW', 'WRONG_ADDRESS', 'WRONG_ITEM_OR_SIZE', 'OTHER');

ALTER TABLE "OrderGroup"
ADD COLUMN "fulfillmentMode" "FulfillmentMode" NOT NULL DEFAULT 'PLATFORM',
ADD COLUMN "packageStatus" "PackageStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "OrderGroup"
SET "packageStatus" = CASE
  WHEN "status" = 'Pending' THEN 'PENDING'::"PackageStatus"
  WHEN "status" = 'Confirmed' THEN 'READY_FOR_HANDOFF'::"PackageStatus"
  WHEN "status" = 'Processing' OR "status" = 'OnHold' THEN 'PROCESSING'::"PackageStatus"
  WHEN "status" = 'Cancelled' THEN 'CANCELLED'::"PackageStatus"
  ELSE 'HANDED_OFF'::"PackageStatus"
END;

CREATE TABLE "Shipment" (
  "id" TEXT NOT NULL,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'AWAITING_RECEIPT',
  "failureReasonCode" TEXT,
  "failureMessage" TEXT,
  "orderGroupId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Shipment" ("id", "status", "orderGroupId", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid::text,
  CASE
    WHEN "status" = 'Shipped' OR "status" = 'PartiallyShipped' THEN 'IN_TRANSIT'::"ShipmentStatus"
    WHEN "status" = 'OutforDelivery' THEN 'OUT_FOR_DELIVERY'::"ShipmentStatus"
    WHEN "status" = 'Delivered' THEN 'DELIVERED'::"ShipmentStatus"
    WHEN "status" = 'Failed' THEN 'DELIVERY_ATTEMPT_FAILED'::"ShipmentStatus"
    WHEN "status" = 'Returned' OR "status" = 'Refunded' THEN 'RETURNED_TO_SELLER'::"ShipmentStatus"
    WHEN "status" = 'Cancelled' THEN 'CANCELLED'::"ShipmentStatus"
    ELSE 'AWAITING_RECEIPT'::"ShipmentStatus"
  END,
  "id",
  "createdAt",
  "updatedAt"
FROM "OrderGroup";

CREATE TABLE "FulfillmentTransition" (
  "id" TEXT NOT NULL,
  "entityType" "FulfillmentEntityType" NOT NULL,
  "previousStatus" TEXT NOT NULL,
  "nextStatus" TEXT NOT NULL,
  "actorRole" "FulfillmentActorRole" NOT NULL,
  "source" "FulfillmentSource" NOT NULL DEFAULT 'MANUAL',
  "reasonCode" TEXT,
  "message" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "actorUserId" TEXT,
  "orderId" TEXT NOT NULL,
  "orderGroupId" TEXT NOT NULL,
  "shipmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FulfillmentTransition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CancellationRequest" (
  "id" TEXT NOT NULL,
  "status" "CancellationRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "reasonCode" "CancellationReasonCode" NOT NULL,
  "message" TEXT,
  "decisionNote" TEXT,
  "customerId" TEXT NOT NULL,
  "decidedById" TEXT,
  "orderId" TEXT NOT NULL,
  "orderGroupId" TEXT NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CancellationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Shipment_orderGroupId_key" ON "Shipment"("orderGroupId");
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");
CREATE UNIQUE INDEX "FulfillmentTransition_idempotencyKey_key" ON "FulfillmentTransition"("idempotencyKey");
CREATE INDEX "FulfillmentTransition_orderId_createdAt_idx" ON "FulfillmentTransition"("orderId", "createdAt");
CREATE INDEX "FulfillmentTransition_orderGroupId_createdAt_idx" ON "FulfillmentTransition"("orderGroupId", "createdAt");
CREATE INDEX "FulfillmentTransition_shipmentId_createdAt_idx" ON "FulfillmentTransition"("shipmentId", "createdAt");
CREATE INDEX "FulfillmentTransition_actorUserId_idx" ON "FulfillmentTransition"("actorUserId");
CREATE INDEX "CancellationRequest_customerId_status_idx" ON "CancellationRequest"("customerId", "status");
CREATE INDEX "CancellationRequest_orderGroupId_status_idx" ON "CancellationRequest"("orderGroupId", "status");
CREATE INDEX "CancellationRequest_orderId_idx" ON "CancellationRequest"("orderId");
CREATE INDEX "CancellationRequest_decidedById_idx" ON "CancellationRequest"("decidedById");
CREATE UNIQUE INDEX "CancellationRequest_one_active_per_group_key" ON "CancellationRequest"("orderGroupId") WHERE "status" = 'REQUESTED';

ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "OrderGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FulfillmentTransition" ADD CONSTRAINT "FulfillmentTransition_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FulfillmentTransition" ADD CONSTRAINT "FulfillmentTransition_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FulfillmentTransition" ADD CONSTRAINT "FulfillmentTransition_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "OrderGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FulfillmentTransition" ADD CONSTRAINT "FulfillmentTransition_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "OrderGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
