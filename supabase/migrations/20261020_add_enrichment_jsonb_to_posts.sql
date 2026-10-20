-- Migration: Add enrichment JSONB column to posts table
-- Date: 2026-10-20
-- Purpose: Consolidate 9 separate enrichment tables into single JSONB column
-- Impact: Reduces queries per page from 9 to 1, eliminates connection pool exhaustion

-- Step 1: Add enrichment column to posts table
ALTER TABLE posts
ADD COLUMN enrichment jsonb NOT NULL DEFAULT '{}';

-- Step 2: Create GIN index for JSONB queries (for future filtering by enrichment fields)
CREATE INDEX idx_posts_enrichment_gin ON posts USING gin(enrichment);

-- Step 3: Add jsonschema validation constraint
-- This ensures enrichment data matches the expected structure
ALTER TABLE posts
ADD CONSTRAINT posts_enrichment_schema_valid CHECK (
  enrichment IS NOT NULL AND
  jsonb_typeof(enrichment) = 'object' AND
  (enrichment -> 'vacancies' IS NULL OR jsonb_typeof(enrichment -> 'vacancies') = 'object') AND
  (enrichment -> 'education' IS NULL OR jsonb_typeof(enrichment -> 'education') = 'array') AND
  (enrichment -> 'experience' IS NULL OR jsonb_typeof(enrichment -> 'experience') = 'array') AND
  (enrichment -> 'selection_process' IS NULL OR jsonb_typeof(enrichment -> 'selection_process') = 'array') AND
  (enrichment -> 'documents' IS NULL OR jsonb_typeof(enrichment -> 'documents') = 'array') AND
  (enrichment -> 'important_dates' IS NULL OR jsonb_typeof(enrichment -> 'important_dates') = 'array') AND
  (enrichment -> 'age_rules' IS NULL OR jsonb_typeof(enrichment -> 'age_rules') = 'object') AND
  (enrichment -> 'application_fees' IS NULL OR jsonb_typeof(enrichment -> 'application_fees') = 'object') AND
  (enrichment -> 'official_links' IS NULL OR jsonb_typeof(enrichment -> 'official_links') = 'array')
);

-- Step 4: Create partial index for invalid records (for debugging during backfill)
CREATE INDEX idx_posts_enrichment_invalid ON posts(id)
WHERE enrichment IS NULL OR jsonb_typeof(enrichment) != 'object';

-- Step 5: Grant permissions for application user
GRANT SELECT, UPDATE ON posts TO authenticated;

-- Verify columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'posts'
AND column_name = 'enrichment';

-- Check constraints exist
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'posts'
AND constraint_name LIKE '%enrichment%';
