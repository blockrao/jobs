-- PHASE 4d: Source/Provenance System & Safe Publishing Rules
-- Executed: 2026-10-01
-- Purpose: Track official source information and implement safe publishing workflow
--
-- P0 #3: Introduce formal source/provenance system
-- P0 #9: Implement safe publishing rules
--
-- Publishing workflow:
-- DISCOVERY → EXTRACTION → AUTOMATED_VALIDATION → MANUAL_REVIEW (if needed) → PUBLISHED
-- INCOMPLETE or FLAGGED postings default to DRAFT (not in active listings)
--
-- RESULTS:
-- - AUTOMATED_VALIDATION_PASS: 5 postings (2.4%) - ready for publication
-- - DRAFT (flagged for review): 130 postings (61.3%) - incomplete data
-- - ARCHIVED: 77 postings (36.3%) - expired
-- - Total: 212 postings classified with publishing status

BEGIN TRANSACTION;

-- ============================================================================
-- Add Source/Provenance Tracking Columns to Postings
-- ============================================================================

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS official_notification_url TEXT;

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS official_application_url TEXT;

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'UNKNOWN';
-- Values: OFFICIAL_NOTIFICATION, OFFICIAL_WEBSITE, THIRD_PARTY_PORTAL, AUTO_DISCOVERED

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'UNVERIFIED';
-- Values: UNVERIFIED, AUTO_VALIDATED, MANUALLY_VERIFIED, FLAGGED_FOR_REVIEW

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS source_confidence SMALLINT DEFAULT 0;
-- 0-100 scale: confidence in source accuracy

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS publishing_status VARCHAR(50) DEFAULT 'DRAFT';
-- Values: DRAFT, AUTOMATED_VALIDATION_PASS, PENDING_REVIEW, PUBLISHED, ARCHIVED

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT FALSE;

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- ============================================================================
-- Add Source/Provenance Tracking to Recruitments
-- ============================================================================

ALTER TABLE recruitments
ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE recruitments
ADD COLUMN IF NOT EXISTS official_notification_url TEXT;

ALTER TABLE recruitments
ADD COLUMN IF NOT EXISTS official_application_url TEXT;

ALTER TABLE recruitments
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'UNVERIFIED';

ALTER TABLE recruitments
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- Populate Initial Publishing Status Based on Data Completeness
-- ============================================================================

-- INCOMPLETE postings → DRAFT (don't show in active listings)
UPDATE postings
SET
  publishing_status = 'DRAFT',
  flagged_for_review = TRUE,
  review_notes = 'Automatically marked DRAFT: missing critical structured data. ' ||
    'Requires manual extraction and verification before publishing.'
WHERE data_completeness_status = 'INCOMPLETE'
  AND review_status = 'APPROVED'
  AND publishing_status = 'DRAFT';

-- EXPIRED postings → ARCHIVED
UPDATE postings
SET publishing_status = 'ARCHIVED'
WHERE data_completeness_status = 'EXPIRED'
  AND review_status = 'APPROVED'
  AND publishing_status != 'ARCHIVED';

-- COMPLETE postings → Auto-validated (ready for publication review)
UPDATE postings
SET
  publishing_status = 'AUTOMATED_VALIDATION_PASS',
  verification_status = 'AUTO_VALIDATED',
  last_verified_at = NOW()
WHERE data_completeness_status = 'COMPLETE'
  AND review_status = 'APPROVED'
  AND publishing_status = 'DRAFT';

-- ============================================================================
-- Set Source Confidence Based on Data Quality
-- ============================================================================

-- High confidence: COMPLETE postings with official URLs
UPDATE postings
SET source_confidence = 85
WHERE data_completeness_status = 'COMPLETE'
  AND (official_notification_url IS NOT NULL OR official_application_url IS NOT NULL)
  AND review_status = 'APPROVED';

-- Medium confidence: Has some structured data
UPDATE postings
SET source_confidence = 60
WHERE data_completeness_status = 'INCOMPLETE'
  AND (eligibility IS NOT NULL AND eligibility NOT ILIKE '%not specified%')
  AND review_status = 'APPROVED'
  AND source_confidence = 0;

-- Low confidence: Missing critical data (defaults to 0)
-- Already set during ALTER

-- ============================================================================
-- Create Index for Publishing & Search Efficiency
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_postings_publishing_status
ON postings(publishing_status)
WHERE publishing_status NOT IN ('DRAFT', 'ARCHIVED');

CREATE INDEX IF NOT EXISTS idx_postings_flagged_for_review
ON postings(flagged_for_review)
WHERE flagged_for_review = TRUE;

CREATE INDEX IF NOT EXISTS idx_postings_verification_status
ON postings(verification_status);

CREATE INDEX IF NOT EXISTS idx_postings_completeness_status
ON postings(data_completeness_status);

-- ============================================================================
-- Create View: Active Postings (for public listing)
-- ============================================================================

CREATE OR REPLACE VIEW active_postings AS
SELECT
  p.*
FROM postings p
WHERE p.review_status = 'APPROVED'
  AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
  AND p.data_completeness_status != 'EXPIRED'
ORDER BY p.created_at DESC;

-- ============================================================================
-- Create View: Editorial Dashboard (postings needing review)
-- ============================================================================

CREATE OR REPLACE VIEW editorial_dashboard AS
SELECT
  p.id,
  p.title,
  p.organization_id,
  o.name as organization_name,
  p.data_completeness_status,
  p.publishing_status,
  p.verification_status,
  p.flagged_for_review,
  p.review_notes,
  p.source_confidence,
  p.created_at,
  p.updated_at,
  p.last_verified_at,
  COUNT(CASE WHEN p.eligibility IS NULL THEN 1 END) as missing_eligibility,
  COUNT(CASE WHEN p.total_vacancies IS NULL OR p.total_vacancies = 0 THEN 1 END) as missing_vacancies
FROM postings p
LEFT JOIN organizations_new o ON o.id = p.organization_id
WHERE p.review_status = 'APPROVED'
  AND (
    p.flagged_for_review = TRUE
    OR p.publishing_status = 'PENDING_REVIEW'
    OR p.verification_status IN ('UNVERIFIED', 'FLAGGED_FOR_REVIEW')
  )
GROUP BY p.id, o.id
ORDER BY p.created_at DESC;

-- ============================================================================
-- Verification & Reporting
-- ============================================================================

-- Show publishing status distribution
SELECT
  publishing_status,
  COUNT(*) as posting_count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM postings WHERE review_status = 'APPROVED'), 1) as percent
FROM postings
WHERE review_status = 'APPROVED'
GROUP BY publishing_status
ORDER BY posting_count DESC;

-- Show data completeness → publishing status correlation
SELECT
  data_completeness_status,
  publishing_status,
  COUNT(*) as count
FROM postings
WHERE review_status = 'APPROVED'
GROUP BY data_completeness_status, publishing_status
ORDER BY data_completeness_status, publishing_status;

-- Show flagged for review count
SELECT
  COUNT(*) as flagged_for_review_count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM postings WHERE review_status = 'APPROVED'), 1) as percent_of_total
FROM postings
WHERE review_status = 'APPROVED' AND flagged_for_review = TRUE;

COMMIT;
