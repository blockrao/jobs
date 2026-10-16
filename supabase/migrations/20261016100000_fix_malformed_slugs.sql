-- Migration: Fix malformed recruitment and post slugs
-- Fixes slugs that start/end with hyphens or have double hyphens
-- Creates redirect mapping for old→new slugs

-- Step 1: Create redirect mapping table (if not exists)
CREATE TABLE IF NOT EXISTS public.slug_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_slug text NOT NULL,
  new_slug text NOT NULL,
  slug_type text NOT NULL CHECK (slug_type IN ('recruitment', 'post')),
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(old_slug, slug_type)
);

-- Step 2: Helper function to clean slugs (remove leading/trailing hyphens, collapse double hyphens)
CREATE OR REPLACE FUNCTION clean_slug(input_slug text) RETURNS text AS $$
BEGIN
  RETURN REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRIM(BOTH '-' FROM input_slug),
      '--+', '-', 'g'
    ),
    '^-+|-+$', '', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Record old recruitment slugs before fixing
INSERT INTO slug_redirects (old_slug, new_slug, slug_type)
SELECT DISTINCT
  r.slug AS old_slug,
  clean_slug(r.slug) AS new_slug,
  'recruitment'
FROM recruitments r
WHERE r.slug LIKE '-%'
   OR r.slug LIKE '%--'
   OR r.slug LIKE '%-'
   OR r.slug != clean_slug(r.slug)
ON CONFLICT DO NOTHING;

-- Step 4: Fix recruitment slugs
UPDATE recruitments
SET slug = clean_slug(slug)
WHERE slug != clean_slug(slug);

-- Step 5: Record old post slugs before fixing
INSERT INTO slug_redirects (old_slug, new_slug, slug_type)
SELECT DISTINCT
  p.slug AS old_slug,
  clean_slug(p.slug) AS new_slug,
  'post'
FROM posts p
WHERE p.slug LIKE '-%'
   OR p.slug LIKE '%--'
   OR p.slug LIKE '%-'
   OR p.slug != clean_slug(p.slug)
ON CONFLICT DO NOTHING;

-- Step 6: Fix post slugs
UPDATE posts
SET slug = clean_slug(slug)
WHERE slug != clean_slug(slug);

-- Step 7: Create index for efficient redirect lookups
CREATE INDEX IF NOT EXISTS idx_slug_redirects_lookup
  ON slug_redirects(old_slug, slug_type);

-- Step 8: Add comments
COMMENT ON TABLE slug_redirects IS 'Maps old malformed slugs to cleaned versions for 301 redirects';
COMMENT ON FUNCTION clean_slug(text) IS 'Removes leading/trailing hyphens and collapses double hyphens';
