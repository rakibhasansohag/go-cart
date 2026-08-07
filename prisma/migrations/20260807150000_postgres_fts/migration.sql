-- Enable PostgreSQL extensions for trigram matching and accent normalization
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create an immutable wrapper function for unaccent so it can be used in GENERATED ALWAYS columns
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text AS
$func$
  SELECT public.unaccent('public.unaccent', $1)
$func$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Add searchVector tsvector generated column to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', immutable_unaccent(coalesce("name", '') || ' ' || coalesce("brand", '') || ' ' || coalesce("description", '')))
  ) STORED;

-- Create GIN index on searchVector for fast full-text search @@ queries
CREATE INDEX IF NOT EXISTS "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");

-- Create GIN trigram index on Product.name for fast autocomplete / fuzzy similarity queries
CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);

-- Create GIN trigram index on ProductVariant.variantName for variant-level matching
CREATE INDEX IF NOT EXISTS "ProductVariant_variantName_trgm_idx" ON "ProductVariant" USING GIN ("variantName" gin_trgm_ops);
