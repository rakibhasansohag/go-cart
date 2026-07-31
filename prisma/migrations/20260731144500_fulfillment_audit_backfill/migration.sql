-- Preserve a starting audit snapshot for packages that existed before the
-- centralized fulfillment state machine was introduced.
INSERT INTO "FulfillmentTransition" (
  "id",
  "entityType",
  "previousStatus",
  "nextStatus",
  "actorRole",
  "source",
  "idempotencyKey",
  "orderId",
  "orderGroupId",
  "createdAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid::text,
  'PACKAGE'::"FulfillmentEntityType",
  'LEGACY_STATE',
  group_record."packageStatus"::text,
  'SYSTEM'::"FulfillmentActorRole",
  'MIGRATION'::"FulfillmentSource",
  'migration:package:' || group_record."id",
  group_record."orderId",
  group_record."id",
  group_record."updatedAt"
FROM "OrderGroup" AS group_record
WHERE NOT EXISTS (
  SELECT 1
  FROM "FulfillmentTransition" AS transition_record
  WHERE transition_record."orderGroupId" = group_record."id"
    AND transition_record."entityType" = 'PACKAGE'
);

INSERT INTO "FulfillmentTransition" (
  "id",
  "entityType",
  "previousStatus",
  "nextStatus",
  "actorRole",
  "source",
  "idempotencyKey",
  "orderId",
  "orderGroupId",
  "shipmentId",
  "createdAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid::text,
  'SHIPMENT'::"FulfillmentEntityType",
  'LEGACY_STATE',
  shipment_record."status"::text,
  'SYSTEM'::"FulfillmentActorRole",
  'MIGRATION'::"FulfillmentSource",
  'migration:shipment:' || shipment_record."id",
  group_record."orderId",
  group_record."id",
  shipment_record."id",
  shipment_record."updatedAt"
FROM "Shipment" AS shipment_record
JOIN "OrderGroup" AS group_record ON group_record."id" = shipment_record."orderGroupId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "FulfillmentTransition" AS transition_record
  WHERE transition_record."shipmentId" = shipment_record."id"
    AND transition_record."entityType" = 'SHIPMENT'
);
