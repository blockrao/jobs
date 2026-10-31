-- P0 post-migration verification checks (READ ONLY).
-- Run only after the source-authority migration has been applied.
-- Expected: no aggregator-origin recruitment is VERIFIED unless the official link
-- is MANUAL_VERIFIED and both source/fact review records are present.

SELECT
  source_discovery_origin,
  official_link_source,
  verification_status,
  count(*) AS recruitments
FROM public.recruitments
WHERE source_discovery_origin = 'AGGREGATOR_DISCOVERED'
GROUP BY 1,2,3
ORDER BY 3,2;

-- This count must be zero.
SELECT count(*) AS aggregator_recruitments_verified_without_manual_link_state
FROM public.recruitments r
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND r.verification_status = 'VERIFIED'
  AND (
    r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.last_verified_at IS NULL
    OR r.metadata -> 'source_provenance' -> 'authority_review' ->> 'status' IS DISTINCT FROM 'VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED'
  );

-- This count must be zero: aggregator-derived posts cannot carry official flags
-- unless their parent recruitment has passed the source/fact review gates.
SELECT count(*) AS unverified_aggregator_posts_with_official_flags
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND r.verification_status IS DISTINCT FROM 'VERIFIED'
  AND (p."isOfficialSource" IS TRUE OR p.is_official_source IS TRUE);

-- These counts must be zero for rows marked VERIFIED.
SELECT
  count(*) FILTER (WHERE e.status = 'VERIFIED'
    AND (e.source_type IS DISTINCT FROM 'OFFICIAL_NOTIFICATION'
      OR e.verified_at IS NULL
      OR e.source_ref IS NULL
      OR e.source_locator IS NULL)) AS verified_eligibilities_missing_evidence,
  count(*) FILTER (WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
    AND e.status = 'VERIFIED'
    AND (e.source_type IS DISTINCT FROM 'OFFICIAL_NOTIFICATION'
      OR e.verified_at IS NULL
      OR e.source_ref IS NULL
      OR e.source_locator IS NULL)) AS aggregator_verified_eligibilities_missing_evidence
FROM public.eligibilities e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id;

-- This count must be zero for each fact family after an approved review.
SELECT
  'education' AS fact_family,
  count(*) AS rows_missing_evidence
FROM public.posts_education e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND e.verified_at IS NOT NULL
  AND (e.source_ref IS NULL OR e.source_locator IS NULL)
UNION ALL
SELECT
  'experience',
  count(*)
FROM public.posts_experience e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND e.verified_at IS NOT NULL
  AND (e.source_ref IS NULL OR e.source_locator IS NULL)
ORDER BY fact_family;
