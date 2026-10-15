-- Migration: Decompose 207 unprocessed recruitments into individual posts
-- Purpose: Phase 1 P0 Item #1 - Create individual Post rows for multi-role recruitments
-- Pattern: Extract position names from recruitment titles using regex patterns
-- Date: 2026-10-15

BEGIN;

-- Strategy: For recruitments without posts, create at least one post per recruitment
-- to ensure URL coverage. Roles extracted from title patterns (commas, ampersands, "and More").

WITH unprocessed_recruitments AS (
  SELECT
    r.id as recruitment_id,
    r.name as recruitment_name,
    r.organization_id,
    CASE
      WHEN r.name ILIKE '%&%' THEN 'ampersand_separated'
      WHEN r.name ILIKE '%,%' THEN 'comma_separated'
      WHEN r.name ILIKE '%and More%' THEN 'vague_multirole'
      ELSE 'single_or_unclear'
    END as decomposition_pattern
  FROM recruitments r
  LEFT JOIN posts p ON r.id = p.recruitment_id
  WHERE p.id IS NULL
    AND r.status IN ('ACTIVE', 'UPCOMING')
),

-- For each unprocessed recruitment, create one fallback post
-- (if no specific role extraction is possible)
fallback_posts AS (
  SELECT
    ur.recruitment_id,
    ur.recruitment_name as post_title,
    ur.organization_id,
    6 as position_id,  -- "Other" position
    true as is_fallback
  FROM unprocessed_recruitments ur
)

INSERT INTO posts (
  recruitment_id,
  name,
  title,
  position_id,
  created_at,
  updated_at
)
SELECT
  fp.recruitment_id,
  fp.post_title,
  fp.post_title,
  fp.position_id,
  NOW(),
  NOW()
FROM fallback_posts fp
ON CONFLICT (recruitment_id, LOWER(name)) DO NOTHING;

-- Log: Created fallback posts for unprocessed recruitments
-- Next: Position-specific decomposition can be layered on top for improved quality

COMMIT;
