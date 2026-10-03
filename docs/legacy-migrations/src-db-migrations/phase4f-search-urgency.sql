-- PHASE 4f: Search Infrastructure & Urgency Calculation
-- Purpose: Enable full-text discovery with announcement freshness + deadline urgency
--          Materialize urgency states for fast filtering/sorting
--          Support rich search queries and filtering
--
-- P1 #11-12: Search as first-class feature + strong job filters
--
-- WORKFLOW:
-- 1. Calculate announcement state: ANNOUNCED_TODAY | THIS_WEEK | THIS_MONTH | OLDER
-- 2. Calculate closing state: LAST_DATE_TODAY | CLOSING_TOMORROW | CLOSING_THIS_WEEK | CLOSING_SOON | EXPIRED
-- 3. Urgency score (0-100) combines freshness + deadline proximity
-- 4. Full-text search on title, organization, position, eligibility
-- 5. Filter by announcement, closing, state, department, qualification, exam
-- 6. Sort by: relevance, newest, closing soonest, most urgent

BEGIN TRANSACTION;

-- ============================================================================
-- Add Search & Urgency Columns
-- ============================================================================

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS search_text TSVECTOR;

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS announcement_state VARCHAR(50);

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS closing_state VARCHAR(50);

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS urgency_score SMALLINT DEFAULT 0;

ALTER TABLE postings
ADD COLUMN IF NOT EXISTS days_to_closing INT;

-- ============================================================================
-- Urgency State Calculation Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_announcement_state(posted_date TIMESTAMP WITH TIME ZONE)
RETURNS VARCHAR AS $$
DECLARE
  v_days_since INT;
BEGIN
  v_days_since := (CURRENT_DATE - DATE(posted_date));

  IF v_days_since = 0 THEN
    RETURN 'ANNOUNCED_TODAY';
  ELSIF v_days_since <= 7 THEN
    RETURN 'ANNOUNCED_THIS_WEEK';
  ELSIF v_days_since <= 30 THEN
    RETURN 'ANNOUNCED_THIS_MONTH';
  ELSE
    RETURN 'OLDER';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_closing_state(closing_date DATE)
RETURNS VARCHAR AS $$
DECLARE
  v_days_until INT;
BEGIN
  IF closing_date IS NULL THEN
    RETURN 'NO_DEADLINE';
  END IF;

  v_days_until := (closing_date - CURRENT_DATE);

  IF v_days_until < 0 THEN
    RETURN 'EXPIRED';
  ELSIF v_days_until = 0 THEN
    RETURN 'LAST_DATE_TODAY';
  ELSIF v_days_until = 1 THEN
    RETURN 'CLOSING_TOMORROW';
  ELSIF v_days_until <= 7 THEN
    RETURN 'CLOSING_THIS_WEEK';
  ELSE
    RETURN 'CLOSING_SOON';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_urgency_score(
  p_announced_date TIMESTAMP WITH TIME ZONE,
  p_closing_date DATE
)
RETURNS SMALLINT AS $$
DECLARE
  v_announcement_score INT := 0;
  v_closing_score INT := 0;
  v_days_since INT;
  v_days_until INT;
BEGIN
  -- Announcement freshness (0-50 points)
  v_days_since := (CURRENT_DATE - DATE(p_announced_date));

  IF v_days_since = 0 THEN
    v_announcement_score := 50;
  ELSIF v_days_since <= 7 THEN
    v_announcement_score := 40;
  ELSIF v_days_since <= 30 THEN
    v_announcement_score := 20;
  ELSE
    v_announcement_score := 5;
  END IF;

  -- Deadline urgency (0-50 points)
  IF p_closing_date IS NULL THEN
    v_closing_score := 0;
  ELSE
    v_days_until := (p_closing_date - CURRENT_DATE);

    IF v_days_until < 0 THEN
      v_closing_score := 0;
    ELSIF v_days_until = 0 THEN
      v_closing_score := 50;
    ELSIF v_days_until = 1 THEN
      v_closing_score := 45;
    ELSIF v_days_until <= 7 THEN
      v_closing_score := 35;
    ELSIF v_days_until <= 30 THEN
      v_closing_score := 20;
    ELSE
      v_closing_score := 5;
    END IF;
  END IF;

  RETURN (v_announcement_score + v_closing_score)::SMALLINT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Generate Search Text Vector
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_posting_search_text(
  p_title TEXT,
  p_organization_name TEXT,
  p_position_name TEXT,
  p_eligibility TEXT,
  p_location TEXT
)
RETURNS TSVECTOR AS $$
BEGIN
  RETURN to_tsvector(
    'english',
    COALESCE(p_title, '') || ' ' ||
    COALESCE(p_organization_name, '') || ' ' ||
    COALESCE(p_position_name, '') || ' ' ||
    COALESCE(p_eligibility, '') || ' ' ||
    COALESCE(p_location, '')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Refresh Urgency States for All Postings
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_posting_urgency_states()
RETURNS TABLE(
  updated_postings INT,
  last_refreshed TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_updated INT := 0;
BEGIN
  -- Update urgency states and search text
  UPDATE postings p
  SET
    announcement_state = get_announcement_state(p.created_at),
    closing_state = get_closing_state(DATE(p.valid_through)),
    urgency_score = calculate_urgency_score(p.created_at, DATE(p.valid_through)),
    days_to_closing = (DATE(p.valid_through) - CURRENT_DATE),
    search_text = generate_posting_search_text(
      p.title,
      (SELECT o.name FROM organizations_new o WHERE o.id = p.organization_id),
      (SELECT pos.name FROM positions pos WHERE pos.id IN (SELECT position_id FROM posts WHERE posts.id = p.inferred_post_id)),
      p.eligibility,
      COALESCE(p.location_region, '') || ' ' || COALESCE(p.location_city, '')
    )
  WHERE p.review_status = 'APPROVED'
    AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN QUERY SELECT v_updated, NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create Indexes for Search & Filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_postings_search_text ON postings USING GIN(search_text);

CREATE INDEX IF NOT EXISTS idx_postings_announcement_state
ON postings(announcement_state) WHERE review_status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_postings_closing_state
ON postings(closing_state) WHERE review_status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_postings_urgency_score
ON postings(urgency_score DESC) WHERE review_status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_postings_days_to_closing
ON postings(days_to_closing DESC) WHERE review_status = 'APPROVED' AND days_to_closing IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_postings_location_org
ON postings(location_region, organization_id) WHERE review_status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_postings_created_at
ON postings(created_at DESC) WHERE review_status = 'APPROVED';

-- ============================================================================
-- Materialized View: Searchable Postings with Urgency
-- ============================================================================

CREATE OR REPLACE VIEW searchable_postings AS
SELECT
  p.id,
  p.slug,
  p.title,
  p.organization_id,
  o.name as organization_name,
  p.location_region,
  p.location_city,
  p.eligibility,
  p.total_vacancies,
  p.valid_through,
  p.created_at,
  p.last_verified_at,
  p.publishing_status,
  p.announcement_state,
  p.closing_state,
  p.urgency_score,
  p.days_to_closing,
  p.source_confidence,
  CASE
    WHEN p.announcement_state = 'ANNOUNCED_TODAY' THEN 'Hot'
    WHEN p.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW') THEN 'Urgent'
    WHEN p.closing_state = 'CLOSING_THIS_WEEK' THEN 'This Week'
    WHEN p.announcement_state = 'ANNOUNCED_THIS_WEEK' THEN 'Fresh'
    ELSE 'Open'
  END as urgency_badge,
  CASE
    WHEN p.announcement_state = 'ANNOUNCED_TODAY' AND p.days_to_closing <= 7
      THEN 'CRITICAL'
    WHEN p.announcement_state = 'ANNOUNCED_TODAY'
      THEN 'HOT'
    WHEN p.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW')
      THEN 'URGENT'
    WHEN p.closing_state = 'CLOSING_THIS_WEEK'
      THEN 'HIGH'
    WHEN p.announcement_state = 'ANNOUNCED_THIS_WEEK'
      THEN 'MEDIUM'
    ELSE 'NORMAL'
  END as priority_level
FROM postings p
LEFT JOIN organizations_new o ON o.id = p.organization_id
LEFT JOIN recruitments r ON r.id = p.inferred_recruitment_id
WHERE p.review_status = 'APPROVED'
  AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
  AND p.is_expired = FALSE
ORDER BY p.urgency_score DESC, p.created_at DESC;

-- ============================================================================
-- Discovery Views
-- ============================================================================

CREATE OR REPLACE VIEW urgent_opportunities AS
SELECT * FROM searchable_postings
WHERE (announcement_state = 'ANNOUNCED_TODAY' OR closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW'))
ORDER BY urgency_score DESC
LIMIT 50;

CREATE OR REPLACE VIEW closing_this_week AS
SELECT * FROM searchable_postings
WHERE closing_state = 'CLOSING_THIS_WEEK'
ORDER BY days_to_closing ASC
LIMIT 50;

CREATE OR REPLACE VIEW newly_announced AS
SELECT * FROM searchable_postings
WHERE announcement_state IN ('ANNOUNCED_TODAY', 'ANNOUNCED_THIS_WEEK')
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- Initial Refresh
-- ============================================================================

SELECT * FROM refresh_posting_urgency_states();

-- ============================================================================
-- Verification
-- ============================================================================

SELECT
  announcement_state,
  closing_state,
  COUNT(*) as count,
  ROUND(AVG(urgency_score)) as avg_urgency
FROM postings
WHERE review_status = 'APPROVED'
  AND publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
GROUP BY announcement_state, closing_state
ORDER BY avg_urgency DESC;

SELECT
  priority_level,
  COUNT(*) as count
FROM searchable_postings
GROUP BY priority_level
ORDER BY count DESC;

COMMIT;
