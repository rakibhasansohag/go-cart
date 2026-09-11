-- CreateTable
CREATE TABLE IF NOT EXISTS "HomepageSection" (
    "id" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HomepageSection_sectionKey_key" ON "HomepageSection"("sectionKey");
CREATE INDEX IF NOT EXISTS "HomepageSection_order_idx" ON "HomepageSection"("order");
CREATE INDEX IF NOT EXISTS "HomepageSection_isActive_idx" ON "HomepageSection"("isActive");

-- Seed default sections
INSERT INTO "HomepageSection" ("id", "sectionKey", "name", "title", "subtitle", "isActive", "order", "config", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'HERO_GRID', 'Hero Banner & Features', 'Featured Highlights', 'Top picks and daily deals', true, 1, '{"showSideAd": true, "showUserCard": true}'::jsonb, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SUPER_DEALS', 'Super Deals Hub', 'Super Deals', 'Limited-time discounts on top products', true, 2, '{"badge": "Flash Sale", "itemsLimit": 10}'::jsonb, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'FEATURED_CATEGORIES', 'Featured Categories', 'Featured Categories', 'Explore top trending collections', true, 3, '{"itemsLimit": 8}'::jsonb, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'MORE_TO_LOVE', 'More to Love Products', 'More to Love', 'Curated recommendations for you', true, 4, '{"itemsLimit": 18}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("sectionKey") DO NOTHING;
