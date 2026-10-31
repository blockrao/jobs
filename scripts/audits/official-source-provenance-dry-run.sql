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
  SELECT DISTINCT r.id, r.slug, r.verification_status, r.source_discovery_origin, r.official_link_source
  FROM public.recruitments r
  JOIN digest_posts dp ON dp.recruitment_id = r.id
)
SELECT
  (SELECT count(*) FROM digest_posts) AS digest_posts,
  (SELECT count(*) FROM digest_recruitments) AS digest_recruitments,
  (SELECT count(*) FROM digest_recruitments
    WHERE verification_status = 'VERIFIED'
      AND source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED') AS contradictory_verified_recruitments;

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
  count(*),
  min(px.created_at),
  max(px.created_at)
FROM public.posts_experience px
JOIN public.posts p ON p.id = px.post_id
WHERE px.source = 'fja_post_inventory';

-- 3) Parent source/status distribution for FJA-derived child facts.
-- This demonstrates why the parent recruitment source label alone is insufficient.
SELECT
  'education' AS fact_type,
  COALESCE(r.source_discovery_origin, 'NULL') AS recruitment_discovery_origin,
  COALESCE(r.official_link_source, 'NULL') AS official_link_verification_state,
  COALESCE(r.verification_status, 'NULL') AS recruitment_verification_status,
  count(*) AS fact_rows,
  count(DISTINCT p.id) AS posts,
  count(DISTINCT r.id) AS recruitments
FROM public.posts_education pe
JOIN public.posts p ON p.id = pe.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE pe.source = 'fja_post_inventory'
GROUP BY 1,2,3
UNION ALL
SELECT
  'experience',
  COALESCE(r.source_discovery_origin, 'NULL'),
  COALESCE(r.official_link_source, 'NULL'),
  COALESCE(r.verification_status, 'NULL'),
  count(*),
  count(DISTINCT p.id),
  count(DISTINCT r.id)
FROM public.posts_experience px
JOIN public.posts p ON p.id = px.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE px.source = 'fja_post_inventory'
GROUP BY 1,2,3
ORDER BY fact_type, fact_rows DESC;

-- 4) Aggregate enrichment records whose child education/experience facts are FJA-derived and unverified.
SELECT
  COALESCE(pe."sourceVerificationStatus", 'NULL') AS enrichment_verification_status,
  count(*) AS enrichment_rows,
  count(DISTINCT p.id) AS posts,
  count(DISTINCT r.id) AS recruitments,
  count(*) FILTER (WHERE pe."sourceVerificationDate" IS NOT NULL) AS with_verification_date
FROM public.post_enrichments pe
JOIN public.posts p ON p.id = pe.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE EXISTS (
  SELECT 1 FROM public.posts_education e
  WHERE e.post_id = p.id
    AND e.source = 'fja_post_inventory'
    AND e.verified_at IS NULL
) OR EXISTS (
  SELECT 1 FROM public.posts_experience x
  WHERE x.post_id = p.id
    AND x.source = 'fja_post_inventory'
)
GROUP BY 1
ORDER BY enrichment_rows DESC;

-- Exact post_enrichments rows to demote/review.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  p.id AS post_id,
  p.name AS post_name,
  pe.id AS post_enrichment_id,
  pe."sourceVerificationStatus" AS source_verification_status,
  pe."sourceVerificationDate" AS source_verification_date,
  (SELECT count(*) FROM public.posts_education e
    WHERE e.post_id = p.id AND e.source = 'fja_post_inventory' AND e.verified_at IS NULL) AS unverified_fja_education_rows,
  (SELECT count(*) FROM public.posts_experience x
    WHERE x.post_id = p.id AND x.source = 'fja_post_inventory') AS unverified_fja_experience_rows,
  'ENRICHMENT_VERIFICATION_REVIEW_REQUIRED' AS review_action
FROM public.post_enrichments pe
JOIN public.posts p ON p.id = pe.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE EXISTS (
  SELECT 1 FROM public.posts_education e
  WHERE e.post_id = p.id
    AND e.source = 'fja_post_inventory'
    AND e.verified_at IS NULL
) OR EXISTS (
  SELECT 1 FROM public.posts_experience x
  WHERE x.post_id = p.id
    AND x.source = 'fja_post_inventory'
)
ORDER BY r.id, p.id;

-- 5) Eligibility records marked VERIFIED without a complete issuer evidence chain.
SELECT
  status,
  COALESCE(source_type, 'NULL') AS source_type,
  count(*) AS rows,
  count(*) FILTER (WHERE verified_at IS NULL) AS missing_verified_at,
  count(*) FILTER (WHERE source_ref IS NULL) AS missing_source_ref,
  count(*) FILTER (WHERE source_locator IS NULL) AS missing_source_locator
FROM public.eligibilities
GROUP BY status, source_type
ORDER BY rows DESC;

-- Exact eligibility rows whose VERIFIED label lacks the required issuer evidence chain.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  p.id AS post_id,
  p.name AS post_name,
  e.id AS eligibility_id,
  e.status,
  e.source_type,
  e.source_ref,
  e.source_locator,
  e.verified_at,
  e.qualification_text,
  e.experience_text,
  'ELIGIBILITY_REVIEW_REQUIRED' AS review_action
FROM public.eligibilities e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE e.status = 'VERIFIED'
  AND (
    e.source_type IS DISTINCT FROM 'OFFICIAL_NOTIFICATION'
    OR e.verified_at IS NULL
    OR e.source_ref IS NULL
    OR e.source_locator IS NULL
  )
ORDER BY r.id, p.id, e.id;

-- 7) Row-level remediation manifest. Review every row against its own issuer notice;
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
  NULL::text,
  px.source,
  px.confidence_score,
  NULL::timestamp,
  'EXPERIENCE_REVIEW_REQUIRED'
FROM public.posts_experience px
JOIN public.posts p ON p.id = px.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE px.source = 'fja_post_inventory'
ORDER BY recruitment_id, post_id, review_action, fact_id;

-- 8) Recruitment-level verification contradictions for individual review.
SELECT
  r.id,
  r.slug,
  r.name,
  r.official_notification_url,
  r.source_discovery_origin,
  r.official_link_source,
  r.verification_status,
  r.last_verified_at,
  r.metadata
FROM public.recruitments r
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND r.verification_status = 'VERIFIED'
  AND r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
ORDER BY r.id;
