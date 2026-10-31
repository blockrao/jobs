-- JobOye expanded source-origin legacy review manifest — READ ONLY.
-- Snapshot basis: source-origin/RLS audit dated 2026-10-31.
-- No writes, quarantine, suppression, deletion, promotion or re-ingestion.
--
-- Candidate discovery deliberately covers every persisted source signal:
-- Recruitment metadata/link source/source URL; Post sourceName and FJA source
-- references; legacy postings.source/source_type/source_portals and both
-- inferred relationship paths. A candidate means aggregator discovery origin,
-- NOT that every fact is incorrect.

BEGIN TRANSACTION READ ONLY;

WITH legacy_posting_origin AS (
  SELECT DISTINCT r.id AS recruitment_id
  FROM public.recruitments r
  JOIN public.postings sp
    ON sp.inferred_recruitment_id = r.id
    OR EXISTS (
      SELECT 1
      FROM public.posts mapped_post
      WHERE mapped_post.id = sp.inferred_post_id
        AND mapped_post.recruitment_id = r.id
    )
  WHERE lower(coalesce(sp.source, '')) IN (
      'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted'
    )
    OR lower(coalesce(sp.enrichment_source, '')) IN (
      'aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted','fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted'
    )
    OR upper(coalesce(sp.source_type, '')) = 'AGGREGATOR'
    OR lower(btrim(sp.source_url)) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(coalesce(sp.source_portals, '[]'::jsonb)) = 'array'
            THEN sp.source_portals
          ELSE '[]'::jsonb
        END
      ) AS portal(value)
      WHERE lower(portal.value) IN ('fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted')
    )
),
post_origin AS (
  SELECT DISTINCT p.recruitment_id
  FROM public.posts p
  WHERE lower(coalesce(p."sourceName", '')) IN (
      'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted'
    )
    OR lower(btrim(p."sourceReference")) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
    OR lower(btrim(p.original_recruitment_url)) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
    OR lower(btrim(p."originalRecruitmentUrl")) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
),
candidates AS (
  SELECT
    r.id,
    r.slug,
    r.name,
    r.organization_id,
    r.status::text AS lifecycle_status,
    r.year,
    r.verification_status,
    r.official_link_source,
    r.official_notification_url,
    r.official_application_url,
    r.source_url,
    r.notification_date,
    r.application_start_date,
    r.application_end_date,
    r.metadata ->> 'ingest_batch' AS ingest_batch,
    r.enrichment_data -> 'meta' ->> 'source' AS enrichment_source,
    r.enrichment_data -> 'meta' ->> 'verified' AS enrichment_meta_verified,
    lower(coalesce(r.enrichment_data -> 'meta' ->> 'source', '')) IN (
      'institutional_aggregation','institution_aggregation','fja_html'
    ) AS has_recruitment_metadata_signal,
    lower(coalesce(r.metadata -> 'source_provenance' ->> 'discovery_origin', '')) = 'aggregator_discovered'
      AS has_metadata_provenance_signal,
    lower(coalesce(r.official_link_source, '')) IN (
      'aggregator_discovered','fja_official_link_extracted','official_link_extracted'
    ) AS has_official_link_signal,
    EXISTS (SELECT 1 FROM post_origin po WHERE po.recruitment_id = r.id) AS has_post_signal,
    EXISTS (SELECT 1 FROM legacy_posting_origin lo WHERE lo.recruitment_id = r.id) AS has_legacy_posting_signal
  FROM public.recruitments r
  WHERE lower(coalesce(r.enrichment_data -> 'meta' ->> 'source', '')) IN (
      'institutional_aggregation','institution_aggregation','fja_html'
    )
    OR lower(coalesce(r.metadata -> 'source_provenance' ->> 'discovery_origin', '')) = 'aggregator_discovered'
    OR lower(coalesce(r.official_link_source, '')) IN (
      'aggregator_discovered','fja_official_link_extracted','official_link_extracted'
    )
    OR lower(btrim(r.source_url)) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
    OR EXISTS (SELECT 1 FROM post_origin po WHERE po.recruitment_id = r.id)
    OR EXISTS (SELECT 1 FROM legacy_posting_origin lo WHERE lo.recruitment_id = r.id)
),
manifest AS (
  SELECT
    c.*,
    EXISTS (
      SELECT 1
      FROM public.official_digest_promote d
      WHERE d.batch = c.ingest_batch
        AND d.hub ->> 'official_url' = c.official_notification_url
    ) AS has_staging_match,
    (SELECT count(*) FROM public.posts p
      WHERE p.recruitment_id = c.id
        AND p.posting_status IS DISTINCT FROM 'DUPLICATE') AS canonical_post_count,
    (SELECT count(*) FROM public.posts p
      WHERE p.recruitment_id = c.id) AS all_post_rows,
    EXISTS (
      SELECT 1
      FROM public.postings sp
      WHERE sp.inferred_recruitment_id = c.id
         OR EXISTS (
           SELECT 1 FROM public.posts mapped_post
           WHERE mapped_post.id = sp.inferred_post_id
             AND mapped_post.recruitment_id = c.id
         )
    ) AS has_legacy_mapping
  FROM candidates c
)

-- 1) Reconciled cohort totals. Expected 2026-10-31 snapshot:
-- 6,365 candidates; 355 staging matches; 6,010 unmatched; 6,003 without batch.
SELECT
  (SELECT count(*) FROM public.recruitments) AS total_recruitments,
  count(*) AS expanded_origin_candidates,
  count(*) FILTER (WHERE has_recruitment_metadata_signal) AS recruitment_metadata_signal,
  count(*) FILTER (WHERE has_metadata_provenance_signal) AS metadata_provenance_signal,
  count(*) FILTER (WHERE has_official_link_signal) AS official_link_source_signal,
  count(*) FILTER (WHERE has_post_signal) AS canonical_post_signal,
  count(*) FILTER (WHERE has_legacy_posting_signal) AS legacy_posting_signal,
  count(*) FILTER (WHERE has_staging_match) AS staging_matches,
  count(*) FILTER (WHERE NOT has_staging_match) AS without_staging_match,
  count(*) FILTER (WHERE ingest_batch IS NULL) AS without_ingest_batch,
  count(*) FILTER (WHERE canonical_post_count = 0) AS without_canonical_post_leaf,
  count(*) FILTER (WHERE canonical_post_count = 0 AND has_legacy_mapping) AS no_leaf_with_legacy_mapping,
  count(*) FILTER (WHERE canonical_post_count = 0 AND NOT has_legacy_mapping) AS no_leaf_without_legacy_mapping
FROM manifest;

-- 2) Recruitment-level review manifest. Deterministic one-row-per-hub queue.
WITH legacy_posting_origin AS (
  SELECT DISTINCT r.id AS recruitment_id
  FROM public.recruitments r
  JOIN public.postings sp
    ON sp.inferred_recruitment_id = r.id
    OR EXISTS (
      SELECT 1
      FROM public.posts mapped_post
      WHERE mapped_post.id = sp.inferred_post_id
        AND mapped_post.recruitment_id = r.id
    )
  WHERE lower(coalesce(sp.source, '')) IN (
      'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted'
    )
    OR lower(coalesce(sp.enrichment_source, '')) IN (
      'aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted','fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted'
    )
    OR upper(coalesce(sp.source_type, '')) = 'AGGREGATOR'
    OR lower(btrim(sp.source_url)) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(coalesce(sp.source_portals, '[]'::jsonb)) = 'array'
            THEN sp.source_portals
          ELSE '[]'::jsonb
        END
      ) AS portal(value)
      WHERE lower(portal.value) IN ('fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted')
    )
),
post_origin AS (
  SELECT DISTINCT p.recruitment_id
  FROM public.posts p
  WHERE lower(coalesce(p."sourceName", '')) IN (
      'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted'
    )
    OR lower(btrim(p."sourceReference")) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
    OR lower(btrim(p.original_recruitment_url)) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
    OR lower(btrim(p."originalRecruitmentUrl")) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
),
candidates AS (
  SELECT
    r.id,
    r.slug,
    r.name,
    r.organization_id,
    r.status::text AS lifecycle_status,
    r.year,
    r.verification_status,
    r.official_link_source,
    r.official_notification_url,
    r.official_application_url,
    r.source_url,
    r.notification_date,
    r.application_start_date,
    r.application_end_date,
    r.metadata ->> 'ingest_batch' AS ingest_batch,
    r.enrichment_data -> 'meta' ->> 'source' AS enrichment_source,
    r.enrichment_data -> 'meta' ->> 'verified' AS enrichment_meta_verified,
    lower(coalesce(r.enrichment_data -> 'meta' ->> 'source', '')) IN (
      'institutional_aggregation','institution_aggregation','fja_html'
    ) AS has_recruitment_metadata_signal,
    lower(coalesce(r.metadata -> 'source_provenance' ->> 'discovery_origin', '')) = 'aggregator_discovered'
      AS has_metadata_provenance_signal,
    lower(coalesce(r.official_link_source, '')) IN (
      'aggregator_discovered','fja_official_link_extracted','official_link_extracted'
    ) AS has_official_link_signal,
    EXISTS (SELECT 1 FROM post_origin po WHERE po.recruitment_id = r.id) AS has_post_signal,
    EXISTS (SELECT 1 FROM legacy_posting_origin lo WHERE lo.recruitment_id = r.id) AS has_legacy_posting_signal
  FROM public.recruitments r
  WHERE lower(coalesce(r.enrichment_data -> 'meta' ->> 'source', '')) IN (
      'institutional_aggregation','institution_aggregation','fja_html'
    )
    OR lower(coalesce(r.metadata -> 'source_provenance' ->> 'discovery_origin', '')) = 'aggregator_discovered'
    OR lower(coalesce(r.official_link_source, '')) IN (
      'aggregator_discovered','fja_official_link_extracted','official_link_extracted'
    )
    OR lower(btrim(r.source_url)) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
    OR EXISTS (SELECT 1 FROM post_origin po WHERE po.recruitment_id = r.id)
    OR EXISTS (SELECT 1 FROM legacy_posting_origin lo WHERE lo.recruitment_id = r.id)
),
manifest AS (
  SELECT
    c.*,
    EXISTS (
      SELECT 1
      FROM public.official_digest_promote d
      WHERE d.batch = c.ingest_batch
        AND d.hub ->> 'official_url' = c.official_notification_url
    ) AS has_staging_match,
    (SELECT count(*) FROM public.posts p
      WHERE p.recruitment_id = c.id
        AND p.posting_status IS DISTINCT FROM 'DUPLICATE') AS canonical_post_count,
    (SELECT count(*) FROM public.posts p
      WHERE p.recruitment_id = c.id) AS all_post_rows,
    EXISTS (
      SELECT 1
      FROM public.postings sp
      WHERE sp.inferred_recruitment_id = c.id
         OR EXISTS (
           SELECT 1 FROM public.posts mapped_post
           WHERE mapped_post.id = sp.inferred_post_id
             AND mapped_post.recruitment_id = c.id
         )
    ) AS has_legacy_mapping
  FROM candidates c
)

SELECT
  id AS recruitment_id,
  slug AS recruitment_slug,
  name AS recruitment_name,
  organization_id,
  lifecycle_status,
  year,
  verification_status,
  official_link_source,
  official_notification_url,
  official_application_url,
  source_url,
  notification_date,
  application_start_date,
  application_end_date,
  enrichment_source,
  enrichment_meta_verified,
  ingest_batch,
  has_recruitment_metadata_signal,
  has_official_link_signal,
  has_post_signal,
  has_legacy_posting_signal,
  has_staging_match,
  canonical_post_count,
  all_post_rows,
  has_legacy_mapping,
  CASE
    WHEN canonical_post_count = 0 AND has_legacy_mapping THEN 'LEGACY_POST_MAPPING_REVIEW_REQUIRED'
    WHEN canonical_post_count = 0 THEN 'SOURCE_TO_POST_DECOMPOSITION_REVIEW_REQUIRED'
    WHEN has_staging_match THEN 'STAGING_AUTHORITY_AND_FACT_REVIEW'
    WHEN ingest_batch IS NULL THEN 'MANUAL_SOURCE_RECONSTRUCTION_REQUIRED'
    ELSE 'STAGING_LINK_RECONCILIATION_REQUIRED'
  END AS review_action
FROM manifest
ORDER BY
  CASE
    WHEN canonical_post_count = 0 AND has_legacy_mapping THEN 0
    WHEN canonical_post_count = 0 THEN 1
    WHEN NOT has_staging_match AND ingest_batch IS NULL THEN 2
    WHEN NOT has_staging_match THEN 3
    ELSE 4
  END,
  id;

-- 3) Legacy-posting-only records with no canonical Post Leaf. Preserve current
-- Recruitment IDs/slugs. No duplicate hubs or guessed Post decompositions.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  r.status::text AS lifecycle_status,
  r.verification_status,
  r.official_link_source,
  r.official_notification_url,
  sp.id AS legacy_posting_id,
  sp.slug AS legacy_posting_slug,
  sp.title AS legacy_posting_title,
  sp.source,
  sp.source_type,
  sp.enrichment_source,
  sp.source_portals,
  sp.external_id,
  sp.review_status::text AS legacy_review_status,
  sp.inferred_recruitment_id,
  sp.inferred_post_id,
  sp.source_url,
  'MATCH_EXISTING_RECRUITMENT_AND_CREATE_REVIEWED_CANONICAL_POST' AS required_next_action
FROM public.recruitments r
JOIN public.postings sp
  ON sp.inferred_recruitment_id = r.id
  OR EXISTS (
    SELECT 1 FROM public.posts mapped_post
    WHERE mapped_post.id = sp.inferred_post_id
      AND mapped_post.recruitment_id = r.id
  )
WHERE (
    lower(coalesce(sp.source, '')) IN ('fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted')
    OR upper(coalesce(sp.source_type, '')) = 'AGGREGATOR'
    OR lower(btrim(sp.source_url)) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(coalesce(sp.source_portals, '[]'::jsonb)) = 'array'
            THEN sp.source_portals
          ELSE '[]'::jsonb
        END
      ) AS portal(value)
      WHERE lower(portal.value) IN ('fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted')
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id
      AND p.posting_status IS DISTINCT FROM 'DUPLICATE'
  )
ORDER BY r.id, sp.id;

-- 4) Source-origin Recruitments with no canonical Post and no legacy Posting mapping.
-- These records need source-backed Post decomposition review; never guess a Post.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  o.name AS organization_name,
  r.status::text AS lifecycle_status,
  r.year,
  r.verification_status,
  r.official_link_source,
  r.official_notification_url,
  r.official_application_url,
  r.source_url,
  r.notification_date,
  r.application_start_date,
  r.application_end_date,
  r.enrichment_data -> 'meta' ->> 'source' AS enrichment_source,
  r.metadata ->> 'ingest_batch' AS ingest_batch,
  'SOURCE_TO_POST_DECOMPOSITION_REVIEW_REQUIRED' AS required_next_action
FROM public.recruitments r
LEFT JOIN public.organizations o ON o.id = r.organization_id
WHERE (
    lower(coalesce(r.enrichment_data -> 'meta' ->> 'source', '')) IN ('institutional_aggregation','institution_aggregation','fja_html')
    OR lower(coalesce(r.metadata -> 'source_provenance' ->> 'discovery_origin', '')) = 'aggregator_discovered'
    OR lower(coalesce(r.official_link_source, '')) IN ('aggregator_discovered','fja_official_link_extracted','official_link_extracted')
    OR lower(btrim(r.source_url)) ~ '^((https?:)?//)?([a-z0-9-]+\\.)*freejobalert\\.com([/:?#]|$)'
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.recruitment_id = r.id
        AND (
          lower(coalesce(p."sourceName", '')) IN ('fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted')
          OR lower(btrim(p."sourceReference")) ~ '^((https?:)?//)?([a-z0-9-]+\\.)*freejobalert\\.com([/:?#]|$)'
          OR lower(btrim(p.original_recruitment_url)) ~ '^((https?:)?//)?([a-z0-9-]+\\.)*freejobalert\\.com([/:?#]|$)'
          OR lower(btrim(p."originalRecruitmentUrl")) ~ '^((https?:)?//)?([a-z0-9-]+\\.)*freejobalert\\.com([/:?#]|$)'
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.postings sp
      LEFT JOIN public.posts mapped_post ON mapped_post.id = sp.inferred_post_id
      WHERE (sp.inferred_recruitment_id = r.id OR mapped_post.recruitment_id = r.id)
        AND (
          lower(coalesce(sp.source, '')) IN ('fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted')
          OR lower(coalesce(sp.enrichment_source, '')) IN ('aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted','fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted')
          OR upper(coalesce(sp.source_type, '')) = 'AGGREGATOR'
          OR lower(btrim(sp.source_url)) ~ '^((https?:)?//)?([a-z0-9-]+\\.)*freejobalert\\.com([/:?#]|$)'
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(
              CASE WHEN jsonb_typeof(coalesce(sp.source_portals, '[]'::jsonb)) = 'array'
                THEN sp.source_portals ELSE '[]'::jsonb END
            ) portal(value)
            WHERE lower(portal.value) IN ('fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5','aggregator','aggregator_extracted','pilot_preliminary','institutional_aggregation','institution_aggregation','fja_html','aggregator_discovered','fja_official_link_extracted','official_link_extracted')
          )
        )
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id
      AND p.posting_status IS DISTINCT FROM 'DUPLICATE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.postings sp
    LEFT JOIN public.posts mapped_post ON mapped_post.id = sp.inferred_post_id
    WHERE sp.inferred_recruitment_id = r.id OR mapped_post.recruitment_id = r.id
  )
ORDER BY r.id;

-- 5) Preliminary Post source records whose FJA source-reference URL must remain
-- discovery provenance, not be upgraded to official issuer evidence.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  r.verification_status,
  r.official_link_source,
  r.official_notification_url,
  p.id AS post_id,
  p.slug AS post_slug,
  p.name AS post_name,
  p."sourceName",
  p."sourceReference",
  p.original_recruitment_url,
  p."originalRecruitmentUrl"
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE lower(coalesce(p."sourceName", '')) = 'pilot_preliminary'
   OR lower(btrim(p."sourceReference")) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
   OR lower(btrim(p.original_recruitment_url)) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
   OR lower(btrim(p."originalRecruitmentUrl")) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)'
ORDER BY r.id, p.id;

COMMIT;
