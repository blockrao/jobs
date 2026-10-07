-- Migration: Append "-jobs" to all post slugs for better URL SEO/clarity
-- Updates post slugs that don't already end with "-jobs" to append "-jobs"
-- Pattern: existing slug like "...recruitment-slug-pl1-junior-engineer"
--          becomes "...recruitment-slug-pl1-junior-engineer-jobs"

UPDATE posts
SET slug = CASE
  WHEN slug NOT LIKE '%-jobs' THEN slug || '-jobs'
  ELSE slug
END,
  updated_at = NOW()
WHERE slug NOT LIKE '%-jobs'
  AND slug IS NOT NULL;

COMMENT ON COLUMN posts.slug IS 'URL-safe slug for post, includes "-jobs" suffix for SEO (e.g., "recruitment-slug-pl1-junior-engineer-jobs")';
