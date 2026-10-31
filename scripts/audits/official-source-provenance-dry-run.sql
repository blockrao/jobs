-- P0 source-provenance remediation inventory (READ ONLY).
-- Run against a read-only production role. This script contains SELECT statements only.
-- It intentionally produces a candidate manifest; it does not quarantine, update, or delete records.

-- 1) Summary: official-digest promotion cohort and contradictory verification state.
WITH digest_posts AS (
  SELECT p.id AS post_id, p.recruitment_id
  FROM public.posts p
  WHERE p.decomposition_source = 'official_digest_20261015'
),
digest_recruitments AS (
  SELECT DISTINCT r.id, r.slug, r.verification_status, r.official_link_source
  FROM public.recruitments r
  JOIN digest_posts dp ON dp.recruitment_id = r.id
)
SELECT
  (SELECT count(*) FROM digest_posts) AS digest_posts,
  (SELECT count(*) FROM digest_recruitments) AS digest_recruitments,
  (SELECT count(*) FROM digest_recruitments
    WHERE verification_status = 'VERIFIED'
      AND official_link_source = 'AGGREGATOR_DISCOVERED') AS contradictory_verified_recruitments;

-- 2) Education/experience observations sourced from the now-empty legacy inventory.
SELECT
  'education' AS fact_type,
  count(*) AS rows,
  count(DISTINCT pe.post_id) AS posts,
  count(DISTINCT p.recruitment_id) AS recruitments,
  count(*) FILTER (WHERE pe.verified_at IS NULL) AS unverified_rows,
  min(pe.created_at) AS first_created_at,
  max(pe.created_at) AS last_created_at
FROM public.posts_education pe
JOIN public.posts p ON p.id = pe.post_id
WHERE pe.source = 'fja_post_inventory'
UNION ALL
SELECT
  'experience',
  count(*),
  count(DISTINCT px.post_id),
  count(DISTINCT p.recruitment_id),
  count(*) FILTER (WHERE px.verified_at IS NULL),
  min(px.created_at),
  max(px.created_at)
FROM public.posts_experience px
JOIN public.posts p ON p.id = px.post_id
WHERE px.source = 'fja_post_inventory';

-- 3) Row-level remediation manifest. Review every row against its own issuer notice;
-- repeated text is a risk signal, not proof that an individual fact is incorrect.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  p.id AS post_id,
  p.slug AS post_slug,
  p.name AS post_name,
  pe.id AS fact_id,
  pe.degree,
  pe.subject,
  pe.specialization,
  pe.source,
  pe.confidence_score,
  pe.verified_at,
  'EDUCATION_REVIEW_REQUIRED' AS review_action
FROM public.posts_education pe
JOIN public.posts p ON p.id = pe.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE pe.source = 'fja_post_inventory'
UNION ALL
SELECT
  r.id,
  r.slug,
  r.name,
  p.id,
  p.slug,
  p.name,
  px.id,
  px.experience_type,
  NULL::text,
  px.description,
  px.source,
  px.confidence_score,
  px.verified_at,
  'EXPERIENCE_REVIEW_REQUIRED'
FROM public.posts_experience px
JOIN public.posts p ON p.id = px.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE px.source = 'fja_post_inventory'
ORDER BY recruitment_id, post_id, review_action, fact_id;

-- 4) Recruitment-level verification contradictions for individual review.
SELECT
  r.id,
  r.slug,
  r.name,
  r.official_notification_url,
  r.official_link_source,
  r.verification_status,
  r.last_verified_at,
  r.metadata
FROM public.recruitments r
WHERE r.official_link_source = 'AGGREGATOR_DISCOVERED'
  AND r.verification_status = 'VERIFIED'
ORDER BY r.id;
