CREATE TABLE "ShipmentPackageAssignment" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "orderGroupId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShipmentPackageAssignment_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ShipmentPackageAssignment" ("id", "shipmentId", "orderGroupId", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || shipment_record."id")::uuid::text,
  shipment_record."id",
  shipment_record."orderGroupId",
  shipment_record."createdAt",
  shipment_record."updatedAt"
FROM "Shipment" AS shipment_record;

DROP INDEX "Shipment_orderGroupId_key";
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_orderGroupId_fkey";
ALTER TABLE "Shipment" DROP COLUMN "orderGroupId";

CREATE UNIQUE INDEX "ShipmentPackageAssignment_shipmentId_orderGroupId_key"
  ON "ShipmentPackageAssignment"("shipmentId", "orderGroupId");
CREATE INDEX "ShipmentPackageAssignment_orderGroupId_idx"
  ON "ShipmentPackageAssignment"("orderGroupId");

ALTER TABLE "ShipmentPackageAssignment"
  ADD CONSTRAINT "ShipmentPackageAssignment_shipmentId_fkey"
  FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentPackageAssignment"
  ADD CONSTRAINT "ShipmentPackageAssignment_orderGroupId_fkey"
  FOREIGN KEY ("orderGroupId") REFERENCES "OrderGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
