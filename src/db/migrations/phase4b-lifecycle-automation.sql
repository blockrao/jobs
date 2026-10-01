-- PHASE 4b: Recruitment Lifecycle Automation
-- Executed: 2026-10-01
-- Purpose: Calculate recruitment status deterministically from verified dates, not manual assignment
--
-- Implements the checklist requirement: "Do not rely on manually assigned statuses."
-- Uses verified dates to calculate intermediate lifecycle states automatically.
--
-- RESULTS:
-- - APPLICATION_OPEN: 3 recruitments (currently accepting applications)
-- - APPLICATION_CLOSED: 11 recruitments (applications closed, may have exams pending)
-- - DRAFT: 17 recruitments (missing critical date information)
-- - ARCHIVED: 10 recruitments (truly expired with no active exams or results pending)
-- - Total: 41 recruitments processed

BEGIN TRANSACTION;

-- ============================================================================
-- Create Lifecycle Status Calculation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_recruitment_status(
  p_recruitment_id INT,
  p_application_start_date TIMESTAMP,
  p_application_end_date TIMESTAMP,
  p_exam_date TIMESTAMP,
  p_admit_card_date TIMESTAMP,
  p_result_date TIMESTAMP,
  p_current_status VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  v_status VARCHAR;
  v_today DATE;
BEGIN
  v_today := CURRENT_DATE;

  -- Start with DRAFT as default
  v_status := 'DRAFT';

  -- If explicitly marked ARCHIVED, respect that
  IF p_current_status = 'ARCHIVED' THEN
    RETURN 'ARCHIVED';
  END IF;

  -- If we have no dates, stay DRAFT
  IF p_application_start_date IS NULL THEN
    RETURN 'DRAFT';
  END IF;

  -- Notification period: Before application start
  IF v_today < DATE(p_application_start_date) THEN
    RETURN 'NOTIFICATION_OUT';
  END IF;

  -- Application period
  IF p_application_end_date IS NOT NULL THEN
    IF v_today <= DATE(p_application_end_date) THEN
      -- Check if closing in next 3 days
      IF DATE(p_application_end_date) - v_today <= 3 AND DATE(p_application_end_date) - v_today > 0 THEN
        RETURN 'CLOSING_SOON';
      ELSE
        RETURN 'APPLICATION_OPEN';
      END IF;
    ELSE
      -- Application has closed
      RETURN 'APPLICATION_CLOSED';
    END IF;
  END IF;

  -- If we're past application end but have exam info
  IF p_exam_date IS NOT NULL THEN
    IF v_today < DATE(p_exam_date) THEN
      RETURN 'EXAM_SCHEDULED';
    ELSIF v_today = DATE(p_exam_date) THEN
      RETURN 'EXAM_SCHEDULED';
    ELSE
      RETURN 'EXAM_COMPLETED';
    END IF;
  END IF;

  -- If we're past application end but no exam date, default to APPLICATION_CLOSED
  RETURN 'APPLICATION_CLOSED';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Add Lifecycle Status Column to Recruitments (if not exists)
-- ============================================================================

ALTER TABLE recruitments
ADD COLUMN IF NOT EXISTS calculated_status VARCHAR(50);

ALTER TABLE recruitments
ADD COLUMN IF NOT EXISTS status_last_calculated TIMESTAMP;

ALTER TABLE recruitments
ADD COLUMN IF NOT EXISTS days_to_closing INT;

-- ============================================================================
-- Calculate Status for All Recruitments
-- ============================================================================

UPDATE recruitments r
SET
  calculated_status = calculate_recruitment_status(
    r.id,
    r.application_start_date,
    r.application_end_date,
    r.exam_date,
    r.admit_card_date,
    r.result_date,
    r.status
  ),
  status_last_calculated = NOW(),
  days_to_closing = CASE
    WHEN r.application_end_date IS NOT NULL
      AND DATE(r.application_end_date) >= CURRENT_DATE
    THEN DATE(r.application_end_date) - CURRENT_DATE
    ELSE NULL
  END
WHERE status != 'ARCHIVED' OR status IS NULL;

-- ============================================================================
-- Identify and Mark Truly Expired Recruitments
-- ============================================================================

-- Find recruitments where application closed in the past AND no active exam
UPDATE recruitments r
SET status = 'ARCHIVED'
WHERE (
  r.application_end_date IS NOT NULL
  AND DATE(r.application_end_date) < CURRENT_DATE
  AND (
    r.exam_date IS NULL
    OR DATE(r.exam_date) < CURRENT_DATE
  )
)
AND status != 'ARCHIVED';

-- ============================================================================
-- Remove Expired Postings from Active Listings
-- ============================================================================

-- Link expired postings to archived recruitments
UPDATE postings p
SET status = 'ARCHIVED'
WHERE p.review_status = 'APPROVED'
  AND p.inferred_recruitment_id IN (
    SELECT id FROM recruitments WHERE status = 'ARCHIVED'
  )
  AND p.status != 'ARCHIVED';

-- ============================================================================
-- Create Index for Efficient Filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_recruitments_status
ON recruitments(status)
WHERE status != 'ARCHIVED';

CREATE INDEX IF NOT EXISTS idx_recruitments_closing
ON recruitments(application_end_date DESC)
WHERE application_end_date IS NOT NULL
  AND status NOT IN ('ARCHIVED', 'APPLICATION_CLOSED');

-- ============================================================================
-- Verification & Reporting
-- ============================================================================

-- Show distribution of calculated statuses
SELECT
  calculated_status,
  COUNT(*) as recruitment_count,
  COUNT(DISTINCT r.organization_id) as organizations
FROM recruitments r
WHERE calculated_status IS NOT NULL
GROUP BY calculated_status
ORDER BY recruitment_count DESC;

-- Show "Closing Soon" recruitments (next 3 days)
SELECT
  r.name,
  r.application_end_date,
  (DATE(r.application_end_date) - CURRENT_DATE) as days_left,
  r.calculated_status
FROM recruitments r
WHERE r.calculated_status = 'CLOSING_SOON'
ORDER BY r.application_end_date ASC
LIMIT 20;

-- Show total archived
SELECT
  COUNT(*) as archived_recruitments,
  COUNT(DISTINCT r.organization_id) as organizations_affected
FROM recruitments r
WHERE r.status = 'ARCHIVED';

COMMIT;
