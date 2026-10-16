-- Migration: Fix post visibility by marking all posts as isLive=true
-- Issue: 985 posts (20% of dataset) were marked isLive=false during various ingestion batches
-- This prevented them from appearing on the site, breaking post detail page routing
-- Users navigating to /jobs/[recruitment-slug]/[post-slug] saw recruitment hub instead
--
-- Root cause: Posts were created with isLive=false default and never marked as visible
-- Impact: 20% of the job database was hidden from users
-- Solution: Mark all posts as live to enable discoverability (Phase 1 P0 goal)
--
-- This fix enables:
-- 1. Post detail pages to render at canonical URLs
-- 2. Enrichment data display
-- 3. Complete sitemap coverage
-- 4. All Phase 1 P0 items (Post page factual richness, canonical URLs, etc.)

-- Update all hidden posts to be visible
UPDATE posts
SET "isLive" = true
WHERE "isLive" = false;

-- Verify all posts are now live
DO $$
DECLARE
  total_posts INTEGER;
  hidden_posts INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_posts FROM posts;
  SELECT COUNT(*) INTO hidden_posts FROM posts WHERE "isLive" = false;

  RAISE NOTICE 'Post visibility fix complete:';
  RAISE NOTICE '  Total posts: %', total_posts;
  RAISE NOTICE '  Hidden posts: %', hidden_posts;

  IF hidden_posts > 0 THEN
    RAISE WARNING 'WARNING: % posts are still hidden', hidden_posts;
  END IF;
END $$;

-- Document the isLive column
COMMENT ON COLUMN posts."isLive" IS
  'Flag indicating post is publicly visible on the site. Phase 1: all posts should be true for discoverability.';
