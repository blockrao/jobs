-- JobOye P0 source-provenance legacy review manifest.
-- READ ONLY: run against a read-only production role.
-- Candidate origin is derived from three independent persisted signals:
--   1) Recruitment enrichment_data.meta.source,
--   2) Recruitment official_link_source,
--   3) canonical Post sourceName.
-- This file does not update, quarantine, suppress, delete, or promote any record.

BEGIN TRANSACTION READ ONLY;

-- 1) Candidate population summary by provenance signals and verification state.
WITH candidates AS (
  SELECT
    r.id,
    r.status::text AS lifecycle_status,
    r.verification_status,
    r.official_link_source,
    r.enrichment_data->'meta'->>'source' AS enrichment_source,
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.recruitment_id = r.id
        AND lower(coalesce(p."sourceName", '')) IN ('aggregator', 'freejobalert')
    ) AS has_aggregator_post_source
  FROM public.recruitments r
  WHERE r.enrichment_data->'meta'->>'source' IN (
      'institutional_aggregation', 'institution_aggregation', 'fja_html'
    )
    OR r.official_link_source IN (
      'AGGREGATOR_DISCOVERED', 'fja_official_link_extracted', 'official_link_extracted'
    )
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.recruitment_id = r.id
        AND lower(coalesce(p."sourceName", '')) IN ('aggregator', 'freejobalert')
    )
),
matched AS (
  SELECT c.*,
    EXISTS (
      SELECT 1
      FROM public.official_digest_promote d
      WHERE d.batch = (
          SELECT r.metadata->>'ingest_batch'
          FROM public.recruitments r
          WHERE r.id = c.id
        )
        AND d.hub->>'official_url' = (
          SELECT r.official_notification_url
          FROM public.recruitments r
          WHERE r.id = c.id
        )
    ) AS has_staging_match
  FROM candidates c
)
SELECT
  count(*) AS candidate_recruitments,
  count(*) FILTER (WHERE lifecycle_status IN ('ACTIVE', 'UPCOMING')) AS live_recruitments,
  count(*) FILTER (WHERE lifecycle_status = 'ACTIVE') AS active_recruitments,
  count(*) FILTER (WHERE lifecycle_status = 'UPCOMING') AS upcoming_recruitments,
  count(*) FILTER (WHERE verification_status = 'VERIFIED') AS globally_verified,
  count(*) FILTER (WHERE verification_status = 'MANUALLY_VERIFIED') AS globally_manually_verified,
  count(*) FILTER (WHERE has_staging_match) AS staging_matches,
  count(*) FILTER (WHERE NOT has_staging_match) AS legacy_review_required
FROM matched;

-- 2) Source-signal distribution. These signals are discovery provenance only,
-- not evidence that the official issuer or extracted facts have been verified.
WITH candidates AS (
  SELECT
    r.id,
    coalesce(r.enrichment_data->'meta'->>'source', '(null)') AS enrichment_source,
    coalesce(r.official_link_source, '(null)') AS official_link_source,
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.recruitment_id = r.id
        AND lower(coalesce(p."sourceName", '')) IN ('aggregator', 'freejobalert')
    ) AS has_aggregator_post_source,
    coalesce(r.verification_status, '(null)') AS verification_status
  FROM public.recruitments r
  WHERE r.enrichment_data->'meta'->>'source' IN (
      'institutional_aggregation', 'institution_aggregation', 'fja_html'
    )
    OR r.official_link_source IN (
      'AGGREGATOR_DISCOVERED', 'fja_official_link_extracted', 'official_link_extracted'
    )
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.recruitment_id = r.id
        AND lower(coalesce(p."sourceName", '')) IN ('aggregator', 'freejobalert')
    )
)
SELECT
  enrichment_source,
  official_link_source,
  has_aggregator_post_source,
  verification_status,
  count(*) AS recruitments
FROM candidates
GROUP BY 1,2,3,4
ORDER BY recruitments DESC, 1,2,3,4;

-- 3) Frozen Recruitment-level review manifest. One row per canonical Recruitment.
-- URL syntax is not issuer verification. Review the host, redirect, document issuer,
-- recruitment identity, dates, and each fact against the official notification.
WITH candidates AS (
  SELECT r.*
  FROM public.recruitments r
  WHERE r.enrichment_data->'meta'->>'source' IN (
      'institutional_aggregation', 'institution_aggregation', 'fja_html'
    )
    OR r.official_link_source IN (
      'AGGREGATOR_DISCOVERED', 'fja_official_link_extracted', 'official_link_extracted'
    )
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.recruitment_id = r.id
        AND lower(coalesce(p."sourceName", '')) IN ('aggregator', 'freejobalert')
    )
)
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  r.organization_id,
  o.name AS organization_name,
  o.sector::text AS organization_sector,
  r.status::text AS lifecycle_status,
  r.year,
  r.notification_date,
  r.application_start_date,
  r.application_end_date,
  r.exam_date,
  r.verification_status,
  r.last_verified_at,
  r.official_link_source,
  r.official_notification_url,
  r.official_application_url,
  r.enrichment_data->'meta'->>'source' AS enrichment_source,
  r.enrichment_data->'meta'->>'verified' AS enrichment_meta_verified,
  r.enrichment_data->'meta'->>'extraction_timestamp' AS extraction_timestamp,
  r.enrichment_data->'reference'->>'source' AS extraction_reference_source,
  r.enrichment_data->'institution'->>'name' AS extracted_institution_name,
  r.metadata->>'ingest_batch' AS ingest_batch,
  EXISTS (
    SELECT 1 FROM public.official_digest_promote d
    WHERE d.batch = r.metadata->>'ingest_batch'
      AND d.hub->>'official_url' = r.official_notification_url
  ) AS has_official_digest_staging_match,
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id
      AND lower(coalesce(p."sourceName", '')) IN ('aggregator', 'freejobalert')
  ) AS has_aggregator_post_source,
  (SELECT count(*) FROM public.posts p WHERE p.recruitment_id = r.id) AS canonical_post_count,
  (SELECT count(*) FROM public.posts p WHERE p.recruitment_id = r.id AND p."isLive" IS TRUE) AS live_post_count,
  (SELECT count(*) FROM public.posts p
   WHERE p.recruitment_id = r.id
     AND (p."isOfficialSource" IS TRUE OR p.is_official_source IS TRUE)) AS posts_flagged_official,
  CASE
    WHEN r.enrichment_data->'reference'->>'source' ILIKE '%UPPSC%'
      OR r.enrichment_data->'institution'->>'name' ILIKE '%UPPSC%'
      THEN 'ENTITY_CONTAMINATION_REVIEW_REQUIRED'
    WHEN r.verification_status IN ('VERIFIED', 'MANUALLY_VERIFIED')
      AND r.enrichment_data->'meta'->>'verified' = 'false'
      THEN 'GLOBAL_VERIFICATION_CONFLICT'
    WHEN r.metadata->>'ingest_batch' IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.official_digest_promote d
        WHERE d.batch = r.metadata->>'ingest_batch'
          AND d.hub->>'official_url' = r.official_notification_url
      )
      THEN 'LEGACY_REVIEW_QUEUE_REQUIRED'
    ELSE 'SOURCE_AND_FACT_REVIEW_REQUIRED'
  END AS review_action
FROM candidates r
LEFT JOIN public.organizations o ON o.id = r.organization_id
ORDER BY r.id;

-- 4) Canonical Post-level review manifest. Do not create replacement Posts or
-- change canonical slugs/Recruitment relationships as part of provenance repair.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  p.id AS post_id,
  p.slug AS post_slug,
  p.name AS post_name,
  p."isLive" AS is_live,
  p."sourceName" AS source_name,
  p."isOfficialSource" AS is_official_source_camel,
  p.is_official_source AS is_official_source_snake,
  p.enrichment->>'sourceVerificationStatus' AS enrichment_verification_status,
  p.enrichment->>'sourceVerificationDate' AS enrichment_verification_date,
  p.enrichment->'source_provenance' AS post_source_provenance,
  (SELECT count(*) FROM public.posts_vacancies x WHERE x.post_id = p.id) AS vacancy_fact_rows,
  (SELECT count(*) FROM public.posts_education x WHERE x.post_id = p.id) AS education_fact_rows,
  (SELECT count(*) FROM public.posts_experience x WHERE x.post_id = p.id) AS experience_fact_rows,
  (SELECT count(*) FROM public.posts_selection_process x WHERE x.post_id = p.id) AS selection_fact_rows,
  (SELECT count(*) FROM public.posts_documents x WHERE x.post_id = p.id) AS document_fact_rows,
  (SELECT count(*) FROM public.posts_important_dates x WHERE x.post_id = p.id) AS important_date_fact_rows,
  (SELECT count(*) FROM public.post_age_rules x WHERE x.post_id = p.id) AS age_rule_fact_rows,
  (SELECT count(*) FROM public.posts_application_fee x WHERE x.post_id = p.id) AS application_fee_fact_rows,
  (SELECT count(*) FROM public.posts_official_links x WHERE x.post_id = p.id) AS official_link_fact_rows,
  (SELECT count(*) FROM public.eligibilities x WHERE x.post_id = p.id) AS eligibility_fact_rows
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE r.enrichment_data->'meta'->>'source' IN (
    'institutional_aggregation', 'institution_aggregation', 'fja_html'
  )
  OR r.official_link_source IN (
    'AGGREGATOR_DISCOVERED', 'fja_official_link_extracted', 'official_link_extracted'
  )
  OR lower(coalesce(p."sourceName", '')) IN ('aggregator', 'freejobalert')
ORDER BY r.id, p.id;

-- 5) Explicit verification-conflict summary for source-extracted Post records.
SELECT
  coalesce(p."sourceName", '(null)') AS post_source_name,
  coalesce(r.official_link_source, '(null)') AS recruitment_link_source,
  coalesce(r.verification_status, '(null)') AS recruitment_verification_status,
  count(*) AS posts,
  count(*) FILTER (
    WHERE p."isOfficialSource" IS TRUE OR p.is_official_source IS TRUE
  ) AS posts_flagged_official,
  count(*) FILTER (
    WHERE p.enrichment->>'sourceVerificationStatus' = 'VERIFIED'
  ) AS enrichment_marked_verified
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE lower(coalesce(p."sourceName", '')) IN ('aggregator', 'freejobalert')
   OR r.enrichment_data->'meta'->>'source' IN (
     'institutional_aggregation', 'institution_aggregation', 'fja_html'
   )
   OR r.official_link_source IN (
     'AGGREGATOR_DISCOVERED', 'fja_official_link_extracted', 'official_link_extracted'
   )
GROUP BY 1,2,3
ORDER BY posts DESC;

COMMIT;
