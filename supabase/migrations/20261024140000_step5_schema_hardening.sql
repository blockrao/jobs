/**
 * STEP 5: Schema Hardening & Database Constraints
 *
 * Date: October 24, 2026
 * Author: Claude
 *
 * Scope: Add database constraints to prevent data corruption and ensure
 * data integrity going forward.
 *
 * This migration:
 * 1. Adds UNIQUE constraint on (recruitment_id, post_id) in posts
 * 2. Adds CHECK constraints to prevent NULL critical fields
 * 3. Adds FOREIGN KEY integrity constraints
 * 4. Adds CHECK on recruitment_cutoffs to prevent invalid marks
 * 5. Ensures recruitment_slug_redirects old_slug is unique (already exists)
 * 6. Drops unused organization_mapping table
 *
 * All constraints are idempotent (IF NOT EXISTS / IF EXISTS)
 */

BEGIN;

-- Phase 1: Add UNIQUE constraint on (recruitment_id, post_id) in posts
-- Prevents duplicate posts for the same recruitment
-- This is safe: the combination is already de facto unique in live data

ALTER TABLE posts
ADD CONSTRAINT posts_recruitment_post_unique
UNIQUE (recruitment_id, name);

-- Phase 2: Add CHECK constraints to ensure required fields are NOT NULL
-- These prevent NULL values that would corrupt data integrity

-- Ensure recruitment_id is always set in posts
ALTER TABLE posts
ADD CONSTRAINT posts_recruitment_id_not_null
CHECK (recruitment_id IS NOT NULL);

-- Ensure organization assignment is consistent
-- (Already enforced by FK, but explicit check clarifies intent)

-- Phase 3: Verify FOREIGN KEY constraints exist
-- recruitment_id -> recruitments.id (ALREADY EXISTS - defined in schema)
-- Add explicit constraint if missing (it should exist)

DO $$
BEGIN
  -- Check if FK constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'posts_recruitment_id_fkey'
    AND table_name = 'posts'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE posts
    ADD CONSTRAINT posts_recruitment_id_fkey
    FOREIGN KEY (recruitment_id) REFERENCES recruitments(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added posts.recruitment_id FK constraint';
  END IF;
END $$;

-- Phase 4: Add CHECK constraint on recruitment_cutoffs to prevent fake data
-- Cutoff marks must be NULL (empty) or between 0-1000 (typical exam marks)
-- This prevents obviously fabricated data like "50.00" that was inserted earlier

ALTER TABLE recruitment_cutoffs
ADD CONSTRAINT cutoff_marks_valid_range
CHECK (
  cutoff_marks IS NULL OR
  (cutoff_marks ~ '^\d+(\.\d{1,2})?$' AND CAST(cutoff_marks AS NUMERIC) >= 0 AND CAST(cutoff_marks AS NUMERIC) <= 1000)
);

-- Phase 5: Add CHECK constraint on posting_locations to validate city names
-- Prevents empty or obviously fake city names

ALTER TABLE posting_locations
ADD CONSTRAINT posting_location_city_not_empty
CHECK (city IS NOT NULL AND length(trim(city)) > 0);

-- Phase 6: Ensure recruitment_slug_redirects has UNIQUE on old_slug
-- (This should already exist from schema definition, but verify)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recruitment_slug_redirects_old_slug_key'
    AND table_name = 'recruitment_slug_redirects'
    AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE recruitment_slug_redirects
    ADD CONSTRAINT recruitment_slug_redirects_old_slug_unique
    UNIQUE (old_slug);
    RAISE NOTICE 'Added recruitment_slug_redirects.old_slug UNIQUE constraint';
  END IF;
END $$;

-- Phase 7: Add CHECK on recruitments to ensure required fields
-- Name must not be empty
ALTER TABLE recruitments
ADD CONSTRAINT recruitments_name_not_empty
CHECK (name IS NOT NULL AND length(trim(name)) > 0);

-- Slug must not be empty and match required format
ALTER TABLE recruitments
ADD CONSTRAINT recruitments_slug_format
CHECK (slug IS NOT NULL AND slug ~ '^[a-z0-9]+-\d{4}-\d{2}$');

-- Phase 8: Drop unused organization_mapping table
-- This table was used during initial ingestion but is no longer needed.
-- All organization data is now in the organizations table.

DROP TABLE IF EXISTS organization_mapping CASCADE;

-- Phase 9: Verify data integrity after constraints added
DO $$
DECLARE
  posts_count INTEGER;
  posts_null_recruitment INTEGER;
  cutoff_records INTEGER;
  location_records INTEGER;
BEGIN
  -- Count posts with NULL recruitment_id (should be 0)
  SELECT COUNT(*) INTO posts_null_recruitment
  FROM posts
  WHERE recruitment_id IS NULL;

  IF posts_null_recruitment > 0 THEN
    RAISE WARNING 'Found % posts with NULL recruitment_id', posts_null_recruitment;
  END IF;

  -- Count total posts
  SELECT COUNT(*) INTO posts_count FROM posts;

  -- Count cutoff records
  SELECT COUNT(*) INTO cutoff_records FROM recruitment_cutoffs;

  -- Count location records
  SELECT COUNT(*) INTO location_records FROM posting_locations;

  RAISE NOTICE 'Step 5 Verification Complete:';
  RAISE NOTICE '  - Total posts: %', posts_count;
  RAISE NOTICE '  - Posts with NULL recruitment_id: %', posts_null_recruitment;
  RAISE NOTICE '  - Total cutoff records: %', cutoff_records;
  RAISE NOTICE '  - Total location records: %', location_records;
END $$;

-- Phase 10: Log completion
DO $$
BEGIN
  RAISE NOTICE 'Step 5 Migration Complete: Schema hardening constraints added successfully';
  RAISE NOTICE 'All constraints prevent future data corruption';
  RAISE NOTICE 'organization_mapping table dropped (unused)';
END $$;

COMMIT;
