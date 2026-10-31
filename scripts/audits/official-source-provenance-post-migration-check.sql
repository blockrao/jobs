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

-- Both counts must be zero after stage 2: origin must be retained in its
-- dedicated field, and the legacy overloaded verification value must be gone.
SELECT count(*) AS legacy_aggregator_link_source_without_discovery_origin
FROM public.recruitments
WHERE official_link_source = 'AGGREGATOR_DISCOVERED'
  AND source_discovery_origin IS NULL;

SELECT count(*) AS legacy_aggregator_link_source_remaining
FROM public.recruitments
WHERE official_link_source = 'AGGREGATOR_DISCOVERED';

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

-- This count must be zero: unreviewed aggregator posts cannot retain a VERIFIED
-- aggregate-enrichment state or source-provenance approval.
SELECT count(*) AS unreviewed_aggregator_posts_with_verified_enrichment
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (r.verification_status IS DISTINCT FROM 'VERIFIED'
    OR r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED')
  AND (p.enrichment ->> 'sourceVerificationStatus' = 'VERIFIED'
    OR p.enrichment ? 'source_provenance');

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

-- This count must be zero for unreviewed aggregator records. Approved records
-- may retain evidence only when both reviews and the manual link state are VERIFIED.
SELECT
  'education' AS fact_family,
  count(*) AS stale_evidence_rows
FROM public.posts_education e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (r.verification_status IS DISTINCT FROM 'VERIFIED'
    OR r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED')
  AND (e.verified_at IS NOT NULL OR e.source_ref IS NOT NULL OR e.source_locator IS NOT NULL)
UNION ALL
SELECT 'experience', count(*)
FROM public.posts_experience e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (r.verification_status IS DISTINCT FROM 'VERIFIED'
    OR r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED')
  AND (e.verified_at IS NOT NULL OR e.source_ref IS NOT NULL OR e.source_locator IS NOT NULL)
UNION ALL
SELECT 'vacancies', count(*)
FROM public.posts_vacancies e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (r.verification_status IS DISTINCT FROM 'VERIFIED'
    OR r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED')
  AND (e.verified_at IS NOT NULL OR e.source_ref IS NOT NULL OR e.source_locator IS NOT NULL)
UNION ALL
SELECT 'selection_process', count(*)
FROM public.posts_selection_process e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (r.verification_status IS DISTINCT FROM 'VERIFIED'
    OR r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED')
  AND (e.verified_at IS NOT NULL OR e.source_ref IS NOT NULL OR e.source_locator IS NOT NULL)
UNION ALL
SELECT 'documents', count(*)
FROM public.posts_documents e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (r.verification_status IS DISTINCT FROM 'VERIFIED'
    OR r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED')
  AND (e.verified_at IS NOT NULL OR e.source_ref IS NOT NULL OR e.source_locator IS NOT NULL)
UNION ALL
SELECT 'important_dates', count(*)
FROM public.posts_important_dates e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (r.verification_status IS DISTINCT FROM 'VERIFIED'
    OR r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED')
  AND (e.verified_at IS NOT NULL OR e.source_ref IS NOT NULL OR e.source_locator IS NOT NULL)
UNION ALL
SELECT 'age_rules', count(*)
FROM public.post_age_rules e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (r.verification_status IS DISTINCT FROM 'VERIFIED'
    OR r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED')
  AND (e.verified_at IS NOT NULL OR e.source_ref IS NOT NULL OR e.source_locator IS NOT NULL)
UNION ALL
SELECT 'application_fees', count(*)
FROM public.posts_application_fee e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (r.verification_status IS DISTINCT FROM 'VERIFIED'
    OR r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED')
  AND (e.verified_at IS NOT NULL OR e.source_ref IS NOT NULL OR e.source_locator IS NOT NULL)
UNION ALL
SELECT 'official_links', count(*)
FROM public.posts_official_links e
JOIN public.posts p ON p.id = e.post_id
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (r.verification_status IS DISTINCT FROM 'VERIFIED'
    OR r.official_link_source IS DISTINCT FROM 'MANUAL_VERIFIED'
    OR r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' IS DISTINCT FROM 'VERIFIED')
  AND (e.verified_at IS NOT NULL OR e.source_ref IS NOT NULL OR e.source_locator IS NOT NULL)
ORDER BY fact_family;


-- Every aggregator extraction record must retain its discovery origin,
-- including rows whose legacy official_link_source was NULL.
SELECT count(*) AS aggregator_extraction_without_discovery_origin
FROM public.recruitments
WHERE enrichment_data->'meta'->>'source' IN ('institutional_aggregation', 'institution_aggregation', 'fja_html')
  AND source_discovery_origin IS DISTINCT FROM 'AGGREGATOR_DISCOVERED';

-- The known UPPSC payload-contamination cluster must not escape origin gating.
SELECT count(*) AS uppsc_contamination_without_discovery_origin
FROM public.recruitments
WHERE (
    enrichment_data->'reference'->>'source' ILIKE '%UPPSC%'
    OR enrichment_data->'institution'->>'name' ILIKE '%UPPSC%'
  )
  AND enrichment_data->'meta'->>'source' IN ('institutional_aggregation', 'institution_aggregation', 'fja_html')
  AND source_discovery_origin IS DISTINCT FROM 'AGGREGATOR_DISCOVERED';


-- Legacy MANUALLY_VERIFIED states without the new authority/fact evidence chain
-- must not survive the remediation as a conflicting public verification label.
SELECT count(*) AS aggregator_records_still_manually_verified
FROM public.recruitments
WHERE source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND verification_status = 'MANUALLY_VERIFIED';
