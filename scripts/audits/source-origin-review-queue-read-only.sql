-- JobOye source-origin review queue — READ ONLY.
-- Snapshot basis: production audit on 2026-10-31.
-- Purpose: reproduce the 6,010 source-origin Recruitments without an exact
-- official-digest staging match, without depending on a private SQL helper or
-- applying the proposed source-authority migration.
--
-- This query identifies discovery provenance only. It does NOT assert that
-- every candidate fact is wrong, and it does NOT authorize publication,
-- demotion, Post creation, URL changes, redirects or any production write.
--
-- Run the summary and page query separately. The page query is deterministic:
-- change page_number below; keep page_size at 100 (or reduce it if needed).
-- The queue order prioritizes missing canonical Post decomposition first,
-- then missing ingest-batch reconstruction, then staging-link reconciliation.

-- ---------------------------------------------------------------------------
-- 1) Aggregate reconciliation. Expected 2026-10-31 snapshot:
--    6,365 candidates; 355 exact staging matches; 6,010 unmatched;
--    6,003 without ingest_batch; 1,526 without a valid canonical Post Leaf;
--    81 of those have a legacy Posting relationship; 1,445 do not.
-- ---------------------------------------------------------------------------
BEGIN READ ONLY;
WITH domains(domain) AS (
  VALUES
    ('freejobalert.com'),('sarkariresult.com'),('sarkarinaukri.com'),
    ('indiasarkarinaukri.com'),('sahisarkarijobs.com'),('sarkariexam.com'),
    ('t.me'),('telegram.me'),('whatsapp.com'),('arattai.in'),('wa.me'),
    ('telegram.org'),('facebook.com'),('twitter.com'),('x.com'),
    ('instagram.com'),('youtube.com'),('marugujarat.co.in'),
    ('pdfjobsjankari.com'),('onlineupcar.com'),('rojgarresult.com'),
    ('freshersworld.com')
),
source_labels(label) AS (
  VALUES
    ('fja'),('freejobalert'),('ext-1'),('ext-2'),('ext-3'),('ext-4'),('ext-5'),
    ('aggregator'),('aggregator_extracted'),('pilot_preliminary'),
    ('institutional_aggregation'),('institution_aggregation'),('fja_html'),
    ('aggregator_discovered'),('fja_official_link_extracted'),('official_link_extracted'),
    ('sarkariresult'),('sarkarinaukri'),('indiasarkarinaukri'),('sahisarkarijobs'),
    ('sarkariexam'),('marugujarat'),('marugujarat.co.in'),('pdfjobsjankari'),
    ('pdfjobsjankari.com'),('onlineupcar'),('onlineupcar.com'),('rojgarresult'),
    ('rojgarresult.com'),('freshersworld'),('freshersworld.com'),('telegram'),
    ('telegram.me'),('telegram.org'),('t.me'),('whatsapp'),('whatsapp.com'),
    ('wa.me'),('arattai'),('arattai.in'),('facebook'),('facebook.com'),
    ('twitter'),('twitter.com'),('x.com'),('instagram'),('instagram.com'),
    ('youtube'),('youtube.com')
),
url_values AS (
  SELECT r.id AS recruitment_id, r.source_url AS value FROM public.recruitments r WHERE r.source_url IS NOT NULL
  UNION ALL SELECT r.id, r.official_notification_url FROM public.recruitments r WHERE r.official_notification_url IS NOT NULL
  UNION ALL SELECT r.id, r.official_application_url FROM public.recruitments r WHERE r.official_application_url IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p."sourceReference" FROM public.posts p WHERE p."sourceReference" IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p.original_recruitment_url FROM public.posts p WHERE p.original_recruitment_url IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p."originalRecruitmentUrl" FROM public.posts p WHERE p."originalRecruitmentUrl" IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p."officialSourceUrl" FROM public.posts p WHERE p."officialSourceUrl" IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p."applyPortalUrl" FROM public.posts p WHERE p."applyPortalUrl" IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p.application_url FROM public.posts p WHERE p.application_url IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p."officialNotificationUrl" FROM public.posts p WHERE p."officialNotificationUrl" IS NOT NULL
  UNION ALL SELECT coalesce(sp.inferred_recruitment_id, cp.recruitment_id), sp.source_url
    FROM public.postings sp LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
    WHERE sp.source_url IS NOT NULL
),
aggregator_url_recruitments AS (
  SELECT DISTINCT u.recruitment_id
  FROM url_values u
  CROSS JOIN LATERAL (
    SELECT regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            split_part(split_part(split_part(
              regexp_replace(btrim(u.value), '^(https?:)?//', '', 'i'),
              '/', 1), '?', 1), '#', 1),
            '^.*@', ''),
          ':[0-9]+$', ''),
        '[.]$', ''),
      '^www[.]', '') AS host
  ) h
  JOIN domains d ON lower(h.host) = d.domain OR lower(h.host) LIKE '%.' || d.domain
  WHERE u.recruitment_id IS NOT NULL
),
legacy_origin AS (
  SELECT DISTINCT coalesce(sp.inferred_recruitment_id, cp.recruitment_id) AS recruitment_id
  FROM public.postings sp
  LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
  WHERE (sp.inferred_recruitment_id IS NOT NULL OR cp.recruitment_id IS NOT NULL)
    AND (
      lower(btrim(coalesce(sp.source,''))) IN (SELECT label FROM source_labels)
      OR lower(btrim(coalesce(sp.enrichment_source,''))) IN (SELECT label FROM source_labels)
      OR upper(btrim(coalesce(sp.source_type,''))) = 'AGGREGATOR'
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(coalesce(sp.source_portals,'[]'::jsonb)) = 'array'
            THEN sp.source_portals ELSE '[]'::jsonb END
        ) portal(value)
        WHERE lower(btrim(portal.value)) IN (SELECT label FROM source_labels)
      )
    )
),
candidates AS (
  SELECT DISTINCT r.id
  FROM public.recruitments r
  WHERE lower(btrim(coalesce(r.enrichment_data -> 'meta' ->> 'source',''))) IN
        ('institutional_aggregation','institution_aggregation','fja_html')
     OR lower(btrim(coalesce(r.metadata -> 'source_provenance' ->> 'discovery_origin',''))) = 'aggregator_discovered'
     OR lower(btrim(coalesce(r.official_link_source,''))) IN (SELECT label FROM source_labels)
     OR EXISTS (SELECT 1 FROM aggregator_url_recruitments u WHERE u.recruitment_id = r.id)
     OR EXISTS (
       SELECT 1 FROM public.posts p
       WHERE p.recruitment_id = r.id
         AND lower(btrim(coalesce(p."sourceName",''))) IN (SELECT label FROM source_labels)
     )
     OR EXISTS (SELECT 1 FROM legacy_origin lo WHERE lo.recruitment_id = r.id)
),
manifest AS (
  SELECT r.id, r.slug, r.name, r.organization_id, r.status::text AS lifecycle_status,
         r.verification_status, r.official_link_source, r.official_notification_url,
         r.official_application_url, r.source_url, r.notification_date,
         r.application_start_date, r.application_end_date,
         r.metadata ->> 'ingest_batch' AS ingest_batch,
         r.enrichment_data -> 'meta' ->> 'source' AS enrichment_source,
         EXISTS (
           SELECT 1 FROM public.official_digest_promote d
           WHERE d.batch = r.metadata ->> 'ingest_batch'
             AND d.hub ->> 'official_url' = r.official_notification_url
         ) AS has_staging_match,
         (SELECT count(*) FROM public.posts p WHERE p.recruitment_id = r.id
           AND p.posting_status IS DISTINCT FROM 'DUPLICATE'
           AND p.slug IS NOT NULL AND btrim(p.slug) <> '') AS valid_post_count,
         EXISTS (
           SELECT 1 FROM public.postings sp
           LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
           WHERE sp.inferred_recruitment_id = r.id OR cp.recruitment_id = r.id
         ) AS has_legacy_mapping
  FROM public.recruitments r
  JOIN candidates c ON c.id = r.id
)
SELECT count(*) AS source_origin_candidates,
       count(*) FILTER (WHERE has_staging_match) AS exact_staging_matches,
       count(*) FILTER (WHERE NOT has_staging_match) AS without_staging_match,
       count(*) FILTER (WHERE ingest_batch IS NULL) AS without_ingest_batch,
       count(*) FILTER (WHERE valid_post_count = 0) AS without_valid_post_leaf,
       count(*) FILTER (WHERE valid_post_count = 0 AND has_legacy_mapping) AS no_leaf_with_legacy_mapping,
       count(*) FILTER (WHERE valid_post_count = 0 AND NOT has_legacy_mapping) AS no_leaf_without_legacy_mapping
FROM manifest;
COMMIT;

-- ---------------------------------------------------------------------------
-- 2) Deterministic, paginated unmatched review queue.
--    Set page_number in params to 1, 2, 3...; page_size defaults to 100.
--    This emits 100 rows per page with a stable queue_rank and total count.
-- ---------------------------------------------------------------------------
BEGIN READ ONLY;
WITH params AS (
  SELECT 1::integer AS page_number, 100::integer AS page_size
),
domains(domain) AS (
  VALUES
    ('freejobalert.com'),('sarkariresult.com'),('sarkarinaukri.com'),
    ('indiasarkarinaukri.com'),('sahisarkarijobs.com'),('sarkariexam.com'),
    ('t.me'),('telegram.me'),('whatsapp.com'),('arattai.in'),('wa.me'),
    ('telegram.org'),('facebook.com'),('twitter.com'),('x.com'),
    ('instagram.com'),('youtube.com'),('marugujarat.co.in'),
    ('pdfjobsjankari.com'),('onlineupcar.com'),('rojgarresult.com'),
    ('freshersworld.com')
),
source_labels(label) AS (
  VALUES
    ('fja'),('freejobalert'),('ext-1'),('ext-2'),('ext-3'),('ext-4'),('ext-5'),
    ('aggregator'),('aggregator_extracted'),('pilot_preliminary'),
    ('institutional_aggregation'),('institution_aggregation'),('fja_html'),
    ('aggregator_discovered'),('fja_official_link_extracted'),('official_link_extracted'),
    ('sarkariresult'),('sarkarinaukri'),('indiasarkarinaukri'),('sahisarkarijobs'),
    ('sarkariexam'),('marugujarat'),('marugujarat.co.in'),('pdfjobsjankari'),
    ('pdfjobsjankari.com'),('onlineupcar'),('onlineupcar.com'),('rojgarresult'),
    ('rojgarresult.com'),('freshersworld'),('freshersworld.com'),('telegram'),
    ('telegram.me'),('telegram.org'),('t.me'),('whatsapp'),('whatsapp.com'),
    ('wa.me'),('arattai'),('arattai.in'),('facebook'),('facebook.com'),
    ('twitter'),('twitter.com'),('x.com'),('instagram'),('instagram.com'),
    ('youtube'),('youtube.com')
),
url_values AS (
  SELECT r.id AS recruitment_id, r.source_url AS value FROM public.recruitments r WHERE r.source_url IS NOT NULL
  UNION ALL SELECT r.id, r.official_notification_url FROM public.recruitments r WHERE r.official_notification_url IS NOT NULL
  UNION ALL SELECT r.id, r.official_application_url FROM public.recruitments r WHERE r.official_application_url IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p."sourceReference" FROM public.posts p WHERE p."sourceReference" IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p.original_recruitment_url FROM public.posts p WHERE p.original_recruitment_url IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p."originalRecruitmentUrl" FROM public.posts p WHERE p."originalRecruitmentUrl" IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p."officialSourceUrl" FROM public.posts p WHERE p."officialSourceUrl" IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p."applyPortalUrl" FROM public.posts p WHERE p."applyPortalUrl" IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p.application_url FROM public.posts p WHERE p.application_url IS NOT NULL
  UNION ALL SELECT p.recruitment_id, p."officialNotificationUrl" FROM public.posts p WHERE p."officialNotificationUrl" IS NOT NULL
  UNION ALL SELECT coalesce(sp.inferred_recruitment_id, cp.recruitment_id), sp.source_url
    FROM public.postings sp LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
    WHERE sp.source_url IS NOT NULL
),
aggregator_url_recruitments AS (
  SELECT DISTINCT u.recruitment_id
  FROM url_values u
  CROSS JOIN LATERAL (
    SELECT regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            split_part(split_part(split_part(
              regexp_replace(btrim(u.value), '^(https?:)?//', '', 'i'),
              '/', 1), '?', 1), '#', 1),
            '^.*@', ''),
          ':[0-9]+$', ''),
        '[.]$', ''),
      '^www[.]', '') AS host
  ) h
  JOIN domains d ON lower(h.host) = d.domain OR lower(h.host) LIKE '%.' || d.domain
  WHERE u.recruitment_id IS NOT NULL
),
legacy_origin AS (
  SELECT DISTINCT coalesce(sp.inferred_recruitment_id, cp.recruitment_id) AS recruitment_id
  FROM public.postings sp
  LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
  WHERE (sp.inferred_recruitment_id IS NOT NULL OR cp.recruitment_id IS NOT NULL)
    AND (
      lower(btrim(coalesce(sp.source,''))) IN (SELECT label FROM source_labels)
      OR lower(btrim(coalesce(sp.enrichment_source,''))) IN (SELECT label FROM source_labels)
      OR upper(btrim(coalesce(sp.source_type,''))) = 'AGGREGATOR'
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(coalesce(sp.source_portals,'[]'::jsonb)) = 'array'
            THEN sp.source_portals ELSE '[]'::jsonb END
        ) portal(value)
        WHERE lower(btrim(portal.value)) IN (SELECT label FROM source_labels)
      )
    )
),
candidates AS (
  SELECT DISTINCT r.id
  FROM public.recruitments r
  WHERE lower(btrim(coalesce(r.enrichment_data -> 'meta' ->> 'source',''))) IN
        ('institutional_aggregation','institution_aggregation','fja_html')
     OR lower(btrim(coalesce(r.metadata -> 'source_provenance' ->> 'discovery_origin',''))) = 'aggregator_discovered'
     OR lower(btrim(coalesce(r.official_link_source,''))) IN (SELECT label FROM source_labels)
     OR EXISTS (SELECT 1 FROM aggregator_url_recruitments u WHERE u.recruitment_id = r.id)
     OR EXISTS (
       SELECT 1 FROM public.posts p
       WHERE p.recruitment_id = r.id
         AND lower(btrim(coalesce(p."sourceName",''))) IN (SELECT label FROM source_labels)
     )
     OR EXISTS (SELECT 1 FROM legacy_origin lo WHERE lo.recruitment_id = r.id)
),
post_source_refs AS (
  SELECT p.recruitment_id,
         jsonb_agg(jsonb_build_object(
           'post_id', p.id,
           'post_slug', p.slug,
           'posting_status', p.posting_status,
           'source_name', p."sourceName",
           'source_reference', p."sourceReference",
           'official_source_url', p."officialSourceUrl",
           'official_notification_url', p."officialNotificationUrl",
           'application_url', p.application_url
         ) ORDER BY p.id) AS post_source_evidence
  FROM public.posts p
  GROUP BY p.recruitment_id
),
legacy_posting_refs AS (
  SELECT coalesce(sp.inferred_recruitment_id, cp.recruitment_id) AS recruitment_id,
         jsonb_agg(jsonb_build_object(
           'legacy_posting_id', sp.id,
           'external_id', sp.external_id,
           'title', sp.title,
           'source', sp.source,
           'source_type', sp.source_type,
           'enrichment_source', sp.enrichment_source,
           'source_portals', sp.source_portals,
           'source_url', sp.source_url,
           'official_notification_url', sp.official_notification_url,
           'apply_url', sp.apply_url,
           'review_status', sp.review_status,
           'inferred_recruitment_id', sp.inferred_recruitment_id,
           'inferred_post_id', sp.inferred_post_id
         ) ORDER BY sp.id) AS legacy_posting_evidence
  FROM public.postings sp
  LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
  WHERE sp.inferred_recruitment_id IS NOT NULL OR cp.recruitment_id IS NOT NULL
  GROUP BY coalesce(sp.inferred_recruitment_id, cp.recruitment_id)
),
manifest AS (
  SELECT r.id, r.slug, r.name, o.name AS organization_name, r.organization_id,
         r.status::text AS lifecycle_status, r.verification_status,
         r.official_link_source, r.official_notification_url, r.official_application_url,
         r.source_url, r.notification_date, r.application_start_date, r.application_end_date,
         r.metadata ->> 'ingest_batch' AS ingest_batch,
         r.enrichment_data -> 'meta' ->> 'source' AS enrichment_source,
         EXISTS (
           SELECT 1 FROM public.official_digest_promote d
           WHERE d.batch = r.metadata ->> 'ingest_batch'
             AND d.hub ->> 'official_url' = r.official_notification_url
         ) AS has_staging_match,
         (SELECT count(*) FROM public.posts p WHERE p.recruitment_id = r.id
           AND p.posting_status IS DISTINCT FROM 'DUPLICATE'
           AND p.slug IS NOT NULL AND btrim(p.slug) <> '') AS valid_post_count,
         EXISTS (
           SELECT 1 FROM public.postings sp
           LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
           WHERE sp.inferred_recruitment_id = r.id OR cp.recruitment_id = r.id
         ) AS has_legacy_mapping,
         coalesce(ps.post_source_evidence, '[]'::jsonb) AS post_source_evidence,
         coalesce(lp.legacy_posting_evidence, '[]'::jsonb) AS legacy_posting_evidence
  FROM public.recruitments r
  LEFT JOIN public.organizations o ON o.id = r.organization_id
  LEFT JOIN post_source_refs ps ON ps.recruitment_id = r.id
  LEFT JOIN legacy_posting_refs lp ON lp.recruitment_id = r.id
  JOIN candidates c ON c.id = r.id
),
unmatched AS (
  SELECT *,
    CASE
      WHEN valid_post_count = 0 AND has_legacy_mapping THEN 0
      WHEN valid_post_count = 0 THEN 1
      WHEN ingest_batch IS NULL THEN 2
      ELSE 3
    END AS queue_priority,
    CASE
      WHEN valid_post_count = 0 AND has_legacy_mapping THEN 'LEGACY_POST_MAPPING_REVIEW_REQUIRED'
      WHEN valid_post_count = 0 THEN 'SOURCE_TO_POST_DECOMPOSITION_REVIEW_REQUIRED'
      WHEN ingest_batch IS NULL THEN 'MANUAL_SOURCE_RECONSTRUCTION_REQUIRED'
      ELSE 'STAGING_LINK_RECONCILIATION_REQUIRED'
    END AS review_action
  FROM manifest
  WHERE NOT has_staging_match
),
ranked AS (
  SELECT row_number() OVER (ORDER BY queue_priority, id) AS queue_rank,
         count(*) OVER () AS total_queue_rows,
         *
  FROM unmatched
)
SELECT ranked.queue_rank, ranked.total_queue_rows,
       ranked.id AS recruitment_id, ranked.slug AS recruitment_slug,
       ranked.name AS recruitment_name, ranked.organization_id,
       ranked.organization_name, ranked.lifecycle_status, ranked.verification_status,
       ranked.official_link_source, ranked.official_notification_url,
       ranked.official_application_url, ranked.source_url,
       ranked.notification_date, ranked.application_start_date, ranked.application_end_date,
       ranked.enrichment_source, ranked.ingest_batch, ranked.has_staging_match,
       ranked.valid_post_count, ranked.has_legacy_mapping, ranked.review_action,
       ranked.post_source_evidence, ranked.legacy_posting_evidence
FROM ranked, params
WHERE ranked.queue_rank BETWEEN
      ((params.page_number - 1) * params.page_size + 1)
  AND (params.page_number * params.page_size)
ORDER BY ranked.queue_rank;
COMMIT;


-- ---------------------------------------------------------------------------
-- 3) Host parser sanity checks. Expected all_pass = true.
--    These cover user-info, trailing dots, scheme-relative URLs, ports,
--    lookalike suffixes, and a hostname that merely appears in user-info.
-- ---------------------------------------------------------------------------
BEGIN READ ONLY;
WITH domains(domain) AS (
  VALUES ('freejobalert.com'),('sarkariresult.com'),('sarkarinaukri.com')
),
cases(input_url, expected_aggregator) AS (
  VALUES
    ('https://user@freejobalert.com/jobs', true),
    ('https://freejobalert.com./jobs', true),
    ('//cdn.freejobalert.com:443/jobs', true),
    ('https://freejobalert.com.evil.example/jobs', false),
    ('https://notfreejobalert.com/jobs', false),
    ('https://freejobalert.com@official.gov/jobs', false)
),
normalized AS (
  SELECT input_url, expected_aggregator,
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            split_part(split_part(split_part(
              regexp_replace(btrim(input_url), '^(https?:)?//', '', 'i'),
              '/', 1), '?', 1), '#', 1),
            '^.*@', ''),
          ':[0-9]+$', ''),
        '[.]$', ''),
      '^www[.]', '') AS host
  FROM cases
),
checked AS (
  SELECT n.*,
    EXISTS (
      SELECT 1 FROM domains d
      WHERE lower(n.host) = d.domain OR lower(n.host) LIKE '%.' || d.domain
    ) AS actual_aggregator
  FROM normalized n
)
SELECT bool_and(expected_aggregator = actual_aggregator) AS all_pass,
       jsonb_agg(jsonb_build_object(
         'url', input_url, 'host', host,
         'expected', expected_aggregator, 'actual', actual_aggregator
       ) ORDER BY input_url) AS cases
FROM checked;
COMMIT;
