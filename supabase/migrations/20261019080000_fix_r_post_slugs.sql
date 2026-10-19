-- Migration: Fix 207 posts with placeholder r####-post slugs
-- These posts have a placeholder slug from ingestion, not a real title-derived slug.
-- Each is the sole post of its recruitment. We generate a slug from the post title.
-- A slug_redirect row is inserted first so existing links 301 to the new URL.

-- ── Step 1: Create slug_redirects table (if not applied earlier) ──────────────
CREATE TABLE IF NOT EXISTS public.slug_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_slug text NOT NULL,
  new_slug text NOT NULL,
  slug_type text NOT NULL CHECK (slug_type IN ('recruitment', 'post')),
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(old_slug, slug_type)
);

CREATE INDEX IF NOT EXISTS idx_slug_redirects_lookup
  ON public.slug_redirects(old_slug, slug_type);

-- ── Step 2: Slugify helper ────────────────────────────────────────────────────
-- Converts a free-text title into a URL-safe slug:
--   lowercase → replace non-alphanumeric runs with '-' → strip leading/trailing '-' → max 80 chars
CREATE OR REPLACE FUNCTION public.slugify_title(input_text text) RETURNS text AS $$
DECLARE
  result text;
BEGIN
  -- lowercase
  result := lower(input_text);
  -- replace sequences of non-alphanumeric chars (including unicode punctuation) with a single hyphen
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  -- strip leading and trailing hyphens
  result := trim(both '-' from result);
  -- truncate to 80 chars, then strip any trailing hyphen again
  result := trim(both '-' from left(result, 80));
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── Step 3: Compute new slugs and detect any collisions ──────────────────────
-- Build a staging table: (post_id, old_slug, candidate_new_slug)
CREATE TEMP TABLE _slug_fix AS
SELECT
  p.id          AS post_id,
  p.slug        AS old_slug,
  p."recruitmentId" AS recruitment_id,
  public.slugify_title(p.title) AS new_slug_base
FROM posts p
WHERE p.slug ~ '^r[0-9]+-post$';

-- Append -N suffix to resolve collisions with existing post slugs
-- (a slug produced by slugify_title might already exist on a different post)
ALTER TABLE _slug_fix ADD COLUMN new_slug text;

UPDATE _slug_fix sf
SET new_slug = CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM posts ep
    WHERE ep.slug = sf.new_slug_base
      AND ep.id <> sf.post_id
  ) THEN sf.new_slug_base
  ELSE sf.new_slug_base || '-' || sf.post_id
END;

-- ── Step 4: Record redirects old_slug → new_slug ─────────────────────────────
INSERT INTO public.slug_redirects (old_slug, new_slug, slug_type)
SELECT old_slug, new_slug, 'post'
FROM _slug_fix
WHERE new_slug IS NOT NULL
  AND new_slug <> old_slug
ON CONFLICT (old_slug, slug_type) DO NOTHING;

-- ── Step 5: Apply the new slugs ───────────────────────────────────────────────
UPDATE posts p
SET slug = sf.new_slug
FROM _slug_fix sf
WHERE p.id = sf.post_id
  AND sf.new_slug IS NOT NULL
  AND sf.new_slug <> sf.old_slug;

-- ── Verification query (informational) ────────────────────────────────────────
-- SELECT COUNT(*) FROM posts WHERE slug ~ '^r[0-9]+-post$';   -- should be 0
-- SELECT COUNT(*) FROM slug_redirects WHERE slug_type = 'post'; -- should be 207
