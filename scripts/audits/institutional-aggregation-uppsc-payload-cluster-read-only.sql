-- Institutional aggregation payload-cluster audit — READ ONLY.
-- Snapshot date: 2026-10-31. Project: cusxodjgkrttwmdmhvso.
-- This script identifies repeated JSONB payloads and entity-scope anomalies.
-- It does not update verification, lifecycle, enrichment, source URLs or Posts.

BEGIN READ ONLY;

-- 1) Baseline for the institutional_aggregation cohort.
SELECT
  count(*) AS cohort_records,
  count(*) FILTER (WHERE r.enrichment_data -> 'meta' ->> 'verified' = 'false') AS payload_marked_unverified,
  count(*) FILTER (WHERE r.verification_status::text IN ('VERIFIED','MANUALLY_VERIFIED')) AS recruitment_marked_verified,
  count(*) FILTER (WHERE r.official_notification_url IS NULL OR btrim(r.official_notification_url) = '') AS missing_official_notification_url,
  count(*) FILTER (WHERE r.official_application_url IS NULL OR btrim(r.official_application_url) = '') AS missing_official_application_url
FROM public.recruitments r
WHERE r.enrichment_data -> 'meta' ->> 'source' = 'institutional_aggregation';

-- 2) Bulk-created timestamp cohort containing the UPPSC payload.
SELECT
  r.created_at,
  count(*) AS total_records_at_timestamp,
  count(*) FILTER (WHERE r.enrichment_data -> 'meta' ->> 'source' = 'institutional_aggregation') AS institutional_aggregation_records,
  count(*) FILTER (WHERE r.enrichment_data -> 'institution' ->> 'name' ILIKE '%UPPSC%') AS uppsc_payload_records,
  count(DISTINCT md5(r.enrichment_data::text)) FILTER (WHERE r.enrichment_data IS NOT NULL) AS distinct_enrichment_payloads
FROM public.recruitments r
WHERE r.created_at = '2026-10-21 13:46:58.259881+00'::timestamptz
GROUP BY r.created_at;

-- 3) Update timestamp identifies the exact bulk payload-reuse write.
SELECT
  r.updated_at,
  count(*) AS records,
  count(DISTINCT md5(r.enrichment_data::text)) AS distinct_payloads,
  count(*) FILTER (WHERE r.enrichment_data -> 'institution' ->> 'name' ILIKE '%UPPSC%') AS uppsc_payload_records,
  count(DISTINCT r.organization_id) AS organisations
FROM public.recruitments r
WHERE r.created_at = '2026-10-21 13:46:58.259881+00'::timestamptz
GROUP BY r.updated_at
ORDER BY records DESC, r.updated_at;

-- 4) Payload fingerprint distribution for the exact bulk-created cohort.
SELECT
  md5(r.enrichment_data::text) AS payload_hash,
  r.enrichment_data -> 'institution' ->> 'name' AS institution_name,
  r.enrichment_data -> 'reference' ->> 'source' AS reference_source,
  count(*) AS records,
  count(DISTINCT r.organization_id) AS organisations,
  min(r.id) AS min_recruitment_id,
  max(r.id) AS max_recruitment_id
FROM public.recruitments r
WHERE r.created_at = '2026-10-21 13:46:58.259881+00'::timestamptz
GROUP BY 1,2,3
ORDER BY records DESC, payload_hash;

-- 5) Detailed impact of the exact repeated UPPSC payload cluster.
SELECT
  count(*) AS records,
  count(DISTINCT r.organization_id) AS organisations,
  count(*) FILTER (WHERE r.verification_status::text IN ('VERIFIED','MANUALLY_VERIFIED')) AS recruitment_marked_verified,
  count(*) FILTER (WHERE r.enrichment_data -> 'meta' ->> 'verified' = 'false') AS payload_marked_unverified,
  count(*) FILTER (WHERE r.official_notification_url IS NULL OR btrim(r.official_notification_url) = '') AS missing_official_notification_url,
  count(*) FILTER (WHERE r.official_application_url IS NULL OR btrim(r.official_application_url) = '') AS missing_official_application_url,
  count(*) FILTER (WHERE r.notification_date IS NULL) AS missing_notification_date,
  count(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id
      AND p.slug IS NOT NULL
      AND btrim(p.slug) <> ''
      AND p.posting_status IS DISTINCT FROM 'DUPLICATE'
  )) AS no_valid_canonical_post_leaf,
  count(*) FILTER (WHERE r.status::text = 'UPCOMING') AS status_upcoming,
  count(*) FILTER (WHERE r.status::text = 'ACTIVE') AS status_active,
  min(r.created_at) AS first_created,
  max(r.created_at) AS last_created,
  min(r.updated_at) AS first_updated,
  max(r.updated_at) AS last_updated
FROM public.recruitments r
WHERE r.created_at = '2026-10-21 13:46:58.259881+00'::timestamptz
  AND md5(r.enrichment_data::text) = '5a74fdfd45727e6f51e7201868c3a329';

-- 6) Sector distribution of the exact repeated payload cluster.
SELECT
  o.sector::text AS organisation_sector,
  count(*) AS records,
  count(*) FILTER (WHERE r.verification_status::text IN ('VERIFIED','MANUALLY_VERIFIED')) AS recruitment_marked_verified,
  count(*) FILTER (WHERE r.status::text = 'UPCOMING') AS status_upcoming,
  count(*) FILTER (WHERE r.status::text = 'ACTIVE') AS status_active
FROM public.recruitments r
LEFT JOIN public.organizations o ON o.id = r.organization_id
WHERE r.created_at = '2026-10-21 13:46:58.259881+00'::timestamptz
  AND md5(r.enrichment_data::text) = '5a74fdfd45727e6f51e7201868c3a329'
GROUP BY o.sector::text
ORDER BY records DESC, organisation_sector;

-- 7) Small, deterministic record sample for manual traceability.
SELECT
  r.id,
  r.slug,
  r.name,
  r.organization_id,
  o.name AS organisation_name,
  o.sector::text AS organisation_sector,
  r.status::text AS lifecycle_status,
  r.verification_status::text AS verification_status,
  r.official_notification_url,
  r.official_application_url,
  r.notification_date,
  r.created_at,
  r.updated_at,
  r.metadata,
  r.source_url,
  r.official_link_source,
  r.enrichment_data -> 'meta' AS payload_meta,
  r.enrichment_data -> 'institution' ->> 'name' AS payload_institution,
  r.enrichment_data -> 'reference' ->> 'source' AS payload_reference,
  md5(r.enrichment_data::text) AS payload_hash
FROM public.recruitments r
LEFT JOIN public.organizations o ON o.id = r.organization_id
WHERE r.created_at = '2026-10-21 13:46:58.259881+00'::timestamptz
  AND md5(r.enrichment_data::text) = '5a74fdfd45727e6f51e7201868c3a329'
ORDER BY r.id
LIMIT 25;

COMMIT;
