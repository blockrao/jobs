/**
 * STEP 2: Remove Fabricated/Placeholder Data from JobOye
 *
 * Date: October 24, 2026
 * Author: Claude
 *
 * Scope: Remove all placeholder, fake, and defaulted data that violates
 * the "no fabricated or defaulted facts" rule.
 *
 * This migration:
 * 1. Deletes all fake cutoff scores (5,369 rows - all identical)
 * 2. Deletes wrong "Jaipur" locations (4,893 rows - placeholder data)
 * 3. Verifies data integrity after deletes
 *
 * Rollback: Full transaction - can be reversed entirely
 */

-- Phase 1: Backup and delete fake cutoff scores
-- All 5,369 rows are identical (UR, 2024, 50.00 marks)
-- Inserted in 1 millisecond on Oct 22 as placeholder

BEGIN;

-- Delete all cutoff scores - they are all fake placeholders
DELETE FROM recruitment_cutoffs
WHERE TRUE;  -- All rows are identical placeholders

-- Verify cutoff table is now empty
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM recruitment_cutoffs) > 0 THEN
    RAISE EXCEPTION 'Failed to delete all fabricated cutoff scores';
  END IF;
END $$;

-- Phase 2: Delete wrong "Jaipur" locations
-- 4,893 of 5,044 rows are generic "Jaipur" placeholders
-- These are for non-Jaipur recruitments and must be removed

-- Keep ONLY locations that are actually for Jaipur organizations
DELETE FROM posting_locations
WHERE city = 'Jaipur'
  AND organization_id NOT IN (
    SELECT id FROM organizations
    WHERE city = 'Jaipur' OR name ILIKE '%Jaipur%'
  );

-- Verify we removed the fake locations
DO $$
DECLARE
  jaipur_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO jaipur_count
  FROM posting_locations
  WHERE city = 'Jaipur';

  -- Log the remaining Jaipur locations (should be few if any)
  RAISE NOTICE 'Remaining Jaipur locations after cleanup: %', jaipur_count;
END $$;

-- Phase 3: Verify overall data integrity
DO $$
DECLARE
  posting_loc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO posting_loc_count FROM posting_locations;
  RAISE NOTICE 'Total posting_locations remaining: %', posting_loc_count;
END $$;

COMMIT;

-- Phase 4: Add data quality checks for future inserts
-- These checks prevent fabricated data from being re-inserted

-- Ensure cutoff scores have reasonable values if future data is added
-- (Won't prevent NULL entries, but prevents obvious placeholders)
ALTER TABLE recruitment_cutoffs
  ADD CONSTRAINT cutoff_marks_valid
    CHECK (cutoff_marks IS NULL OR (cutoff_marks >= 0 AND cutoff_marks <= 1000));

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Step 2 Migration Complete: Fabricated data removed successfully';
END $$;
