-- PHASE 4e: Expired-Job Lifecycle Automation (Evergreen Model)
-- Purpose: Mark expired postings but keep them visible with notifications
--          Show alternative open opportunities alongside
--          Build deterministic, rule-driven lifecycle management
--
-- P0 #10: Fix expired-job handling
--
-- WORKFLOW:
-- 1. Recruitment status changes automatically from verified dates (Phase 4b)
-- 2. Postings marked as expired but remain published with badge
-- 3. Expired posting pages show related OPEN opportunities
-- 4. last_verified_at updated on status changes
-- 5. Cascade: ARCHIVED recruitments → still publish but show "recruitment ended" notice
--
-- RESULTS:
-- - Expired postings remain discoverable (SEO + historical reference)
-- - Users see expired badge + can find current open positions
-- - Stale data cascade prevents incorrect info in active listings
-- - last_verified_at shows when data was last checked

BEGIN TRANSACTION;

-- ============================================================================
-- Add Expiration Tracking Columns
-- ============================================================================

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS expiration_reason VARCHAR(255);

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP;

-- ============================================================================
-- Add Related Opportunities Column for Evergreen Linking
-- ============================================================================

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS related_open_posting_ids INT[] DEFAULT '{}';

-- ============================================================================
-- Refresh Recruitment Lifecycle and Mark Expired Postings
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_recruitment_lifecycle()
RETURNS TABLE(
  expired_postings INT,
  updated_references INT,
  last_refreshed TIMESTAMP
) AS $$
DECLARE
  v_current_date DATE;
  v_expired_count INT := 0;
  v_ref_count INT := 0;
BEGIN
  v_current_date := CURRENT_DATE;

  -- Update all recruitment calculated_status values
  UPDATE recruitments r
  SET
    calculated_status = calculate_recruitment_status(
      r.id,
      r.application_start_date,
      r.application_end_date,
      r.exam_date,
      NULL::TIMESTAMP,
      r.result_date,
      r.status::TEXT
    ),
    status_last_calculated = NOW(),
    days_to_closing = CASE
      WHEN r.application_end_date IS NOT NULL
        AND DATE(r.application_end_date) >= v_current_date
      THEN DATE(r.application_end_date) - v_current_date
      ELSE NULL
    END
  WHERE status != 'ARCHIVED' OR status IS NULL;

  -- Mark truly expired recruitments as ARCHIVED
  UPDATE recruitments r
  SET status = 'ARCHIVED'
  WHERE (
    r.application_end_date IS NOT NULL
    AND DATE(r.application_end_date) < v_current_date
    AND (
      r.exam_date IS NULL
      OR DATE(r.exam_date) < v_current_date
    )
  )
  AND status != 'ARCHIVED';

  -- Mark postings as expired based on posting-level dates
  UPDATE postings p
  SET
    is_expired = TRUE,
    expiration_reason = CASE
      WHEN p.valid_through IS NOT NULL AND p.valid_through < v_current_date
        THEN 'Application closing date has passed'
      WHEN r.status = 'ARCHIVED'
        THEN 'Recruitment has concluded'
      ELSE 'Position is no longer open'
    END,
    expired_at = CASE
      WHEN p.valid_through IS NOT NULL AND p.valid_through < v_current_date
        THEN p.valid_through
      ELSE NOW()
    END,
    last_verified_at = NOW(),
    flagged_for_review = FALSE
  FROM recruitments r
  WHERE p.inferred_recruitment_id = r.id
    AND p.review_status = 'APPROVED'
    AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
    AND (
      (p.valid_through IS NOT NULL AND p.valid_through < v_current_date)
      OR (r.status = 'ARCHIVED')
      OR (
        r.calculated_status = 'APPLICATION_CLOSED'
        AND (r.exam_date IS NULL OR DATE(r.exam_date) < v_current_date)
      )
    )
    AND p.is_expired = FALSE;

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- Link expired postings to related OPEN postings (same organization/position)
  UPDATE postings p_expired
  SET
    related_open_posting_ids = (
      SELECT ARRAY_AGG(DISTINCT p_open.id) FILTER (WHERE p_open.id IS NOT NULL)
      FROM postings p_open
      WHERE p_open.review_status = 'APPROVED'
        AND p_open.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
        AND p_open.is_expired = FALSE
        AND (
          p_open.organization_id = p_expired.organization_id
          OR p_open.position_id = p_expired.position_id
        )
      LIMIT 5
    )
  WHERE p_expired.is_expired = TRUE
    AND p_expired.related_open_posting_ids = '{}';

  GET DIAGNOSTICS v_ref_count = ROW_COUNT;

  -- Return summary
  RETURN QUERY SELECT v_expired_count, v_ref_count, NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create Trigger: Auto-update Posting Expiration on Recruitment Change
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recruitment_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_current_date DATE;
BEGIN
  v_current_date := CURRENT_DATE;

  -- When recruitment transitions to ARCHIVED, mark all related postings as expired
  IF NEW.status = 'ARCHIVED' AND (OLD.status IS NULL OR OLD.status != 'ARCHIVED') THEN
    UPDATE postings
    SET
      is_expired = TRUE,
      expiration_reason = 'Recruitment has concluded',
      expired_at = NOW(),
      last_verified_at = NOW()
    WHERE inferred_recruitment_id = NEW.id
      AND is_expired = FALSE
      AND review_status = 'APPROVED';
  END IF;

  -- When calculated_status becomes APPLICATION_CLOSED (without active exam), mark postings
  IF NEW.calculated_status = 'APPLICATION_CLOSED'
    AND (OLD.calculated_status IS NULL OR OLD.calculated_status != 'APPLICATION_CLOSED')
    AND (NEW.exam_date IS NULL OR DATE(NEW.exam_date) < v_current_date) THEN
    UPDATE postings
    SET
      is_expired = TRUE,
      expiration_reason = 'Application period has closed',
      expired_at = NOW(),
      last_verified_at = NOW()
    WHERE inferred_recruitment_id = NEW.id
      AND is_expired = FALSE
      AND review_status = 'APPROVED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recruitment_status_changed ON recruitments;
CREATE TRIGGER trg_recruitment_status_changed
AFTER UPDATE ON recruitments
FOR EACH ROW
EXECUTE FUNCTION trigger_recruitment_status_changed();

-- ============================================================================
-- Create View: Expired Postings (Evergreen Archive)
-- ============================================================================

CREATE OR REPLACE VIEW expired_postings AS
SELECT
  p.id,
  p.title,
  p.organization_id,
  o.name as organization_name,
  p.expired_at,
  p.expiration_reason,
  p.related_open_posting_ids,
  p.last_verified_at
FROM postings p
LEFT JOIN organizations_new o ON o.id = p.organization_id
WHERE p.is_expired = TRUE
  AND p.review_status = 'APPROVED'
  AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
ORDER BY p.expired_at DESC;

-- ============================================================================
-- Create View: Active Postings (excluding expired)
-- ============================================================================

CREATE OR REPLACE VIEW active_postings_display AS
SELECT
  p.id,
  p.slug,
  p.title,
  p.organization_id,
  o.name as organization_name,
  p.publishing_status,
  p.data_completeness_status,
  p.valid_through,
  p.last_verified_at,
  r.calculated_status as recruitment_status,
  r.days_to_closing
FROM postings p
LEFT JOIN organizations_new o ON o.id = p.organization_id
LEFT JOIN recruitments r ON r.id = p.inferred_recruitment_id
WHERE p.review_status = 'APPROVED'
  AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
  AND p.is_expired = FALSE
ORDER BY p.created_at DESC;

-- ============================================================================
-- Initial Lifecycle Refresh
-- ============================================================================

SELECT * FROM refresh_recruitment_lifecycle();

-- ============================================================================
-- Verification & Reporting
-- ============================================================================

-- Show expired postings count
SELECT
  COUNT(*) as expired_postings,
  COUNT(DISTINCT organization_id) as affected_organizations,
  MIN(expired_at) as oldest_expiration,
  MAX(expired_at) as most_recent_expiration
FROM expired_postings;

-- Show active postings count
SELECT
  COUNT(*) as active_postings,
  COUNT(DISTINCT organization_id) as active_organizations
FROM active_postings_display;

-- Show recruitment status distribution
SELECT
  r.calculated_status,
  COUNT(*) as recruitment_count,
  COUNT(p.id) as related_postings,
  COUNT(CASE WHEN p.is_expired = FALSE THEN 1 END) as active_postings,
  COUNT(CASE WHEN p.is_expired = TRUE THEN 1 END) as expired_postings
FROM recruitments r
LEFT JOIN postings p ON p.inferred_recruitment_id = r.id
GROUP BY r.calculated_status
ORDER BY recruitment_count DESC;

COMMIT;
