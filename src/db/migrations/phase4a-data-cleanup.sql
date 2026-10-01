-- PHASE 4a: Production Data Cleanup & Validation
-- Executed: 2026-10-01
-- Purpose: Remove test data, fix malformed fields, populate safe fallbacks, track completeness
--
-- RESULTS:
-- - COMPLETE: 5 postings (2.4%) — have valid vacancies, future closing date, meaningful eligibility
-- - INCOMPLETE: 130 postings (61.3%) — missing critical structured data
-- - EXPIRED: 77 postings (36.3%) — closing date already passed
-- - Total: 212 APPROVED postings processed

BEGIN TRANSACTION;

-- ============================================================================
-- STEP 1: Remove Test Data
-- ============================================================================
DELETE FROM postings
WHERE review_status = 'APPROVED'
  AND (
    title ILIKE '%backend%engineer%'
    OR title ILIKE '%frontend%developer%'
    OR title ILIKE '%test%entry%'
  );

-- ============================================================================
-- STEP 2: Fix Malformed Fields - Detect & Clear Dates in Eligibility Field
-- ============================================================================
-- Some entries have dates (DD/MM/YYYY format) incorrectly stored in eligibility
UPDATE postings
SET eligibility = NULL
WHERE review_status = 'APPROVED'
  AND eligibility ~ '^\d{1,2}/\d{1,2}/\d{4}$';

-- ============================================================================
-- STEP 3: Add Completeness Tracking Column
-- ============================================================================
ALTER TABLE postings
ADD COLUMN IF NOT EXISTS data_completeness_status VARCHAR(50) DEFAULT 'UNKNOWN';

-- ============================================================================
-- STEP 4: Populate Missing/Empty Fields with Safe Fallback
-- ============================================================================
-- Per production checklist: Never populate a structured field through unreliable extraction.
-- Use explicit "Not specified" message instead of incorrect data.
UPDATE postings
SET eligibility = 'Not specified — see official notification'
WHERE review_status = 'APPROVED'
  AND (eligibility IS NULL OR eligibility = '' OR TRIM(eligibility) = '');

UPDATE postings
SET vacancy = 'Not specified — see official notification'
WHERE review_status = 'APPROVED'
  AND (vacancy IS NULL OR vacancy = '' OR TRIM(vacancy) = '');

UPDATE postings
SET selection_method = 'Not specified — see official notification'
WHERE review_status = 'APPROVED'
  AND (selection_method IS NULL OR selection_method = '' OR TRIM(selection_method) = '');

-- ============================================================================
-- STEP 5: Classify Postings by Completeness
-- ============================================================================
-- COMPLETE: Has vacancies (>0), valid future closing date, AND meaningful eligibility (not placeholder)
-- INCOMPLETE: Missing critical structured data
-- EXPIRED: Closing date is in the past
UPDATE postings
SET data_completeness_status = CASE
  WHEN valid_through < CURRENT_DATE THEN 'EXPIRED'
  WHEN (
    vacancy > 0
    AND valid_through > CURRENT_DATE
    AND eligibility NOT ILIKE '%not specified%'
    AND eligibility NOT ILIKE '%see official%'
  ) THEN 'COMPLETE'
  ELSE 'INCOMPLETE'
END
WHERE review_status = 'APPROVED';

-- ============================================================================
-- VERIFICATION & REPORTING
-- ============================================================================

-- Show final distribution
SELECT
  data_completeness_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM postings WHERE review_status = 'APPROVED'), 1) as percent
FROM postings
WHERE review_status = 'APPROVED'
GROUP BY data_completeness_status
ORDER BY count DESC;

-- Show sample COMPLETE postings (ready to publish)
SELECT id, title, vacancy, eligibility, valid_through, data_completeness_status
FROM postings
WHERE review_status = 'APPROVED' AND data_completeness_status = 'COMPLETE'
LIMIT 10;

-- Show count of EXPIRED (need status update to ARCHIVED)
SELECT
  COUNT(*) as expired_postings,
  COUNT(DISTINCT inferred_recruitment_id) as affected_recruitments
FROM postings
WHERE review_status = 'APPROVED' AND data_completeness_status = 'EXPIRED';

COMMIT;
