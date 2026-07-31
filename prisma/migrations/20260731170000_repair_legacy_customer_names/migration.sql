-- Older Clerk webhook handling could persist the literal text "null null" when
-- both profile-name fields were empty. Prefer the customer's latest shipping
-- name, then their email handle, for those legacy records.
UPDATE "User" AS user_record
SET "name" = COALESCE(
  (
    SELECT NULLIF(
      BTRIM(CONCAT_WS(' ', address_record."firstName", address_record."lastName")),
      ''
    )
    FROM "ShippingAddress" AS address_record
    WHERE address_record."userId" = user_record."id"
    ORDER BY address_record."updatedAt" DESC
    LIMIT 1
  ),
  NULLIF(SPLIT_PART(user_record."email", '@', 1), ''),
  'Customer'
)
WHERE LOWER(BTRIM(user_record."name")) IN (
  '',
  'null',
  'null null',
  'undefined',
  'undefined undefined'
);
