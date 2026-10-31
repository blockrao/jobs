-- JobOye bounded source-origin audit snapshot — READ ONLY.
-- Production snapshot: 2026-10-31 11:35 UTC.
-- Intended to finish quickly; each query is bounded by a 15-second statement timeout.
-- Source-origin signals indicate discovery provenance, not that every fact is wrong.
-- This script performs SELECTs only and makes no production changes.

BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';

-- 1) Base inventory and source-signal cohort.
WITH candidates AS (
  SELECT r.id, r.metadata->>'ingest_batch' AS ingest_batch, r.official_notification_url
  FROM public.recruitments r
  WHERE r.enrichment_data->'meta'->>'source'
          IN ('institutional_aggregation','institution_aggregation','fja_html')
     OR lower(coalesce(r.official_link_source,'')) IN (
          'aggregator_discovered','fja_official_link_extracted','official_link_extracted'
        )
     OR EXISTS (
          SELECT 1 FROM public.posts p
          WHERE p.recruitment_id = r.id
            AND lower(coalesce(p."sourceName",'')) IN (
              'aggregator','freejobalert','aggregator_extracted','pilot_preliminary'
            )
        )
     OR EXISTS (
          SELECT 1
          FROM public.postings sp
          LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
          WHERE (sp.inferred_recruitment_id = r.id OR cp.recruitment_id = r.id)
            AND (
              lower(coalesce(sp.source,'')) IN (
                'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5'
              )
              OR upper(coalesce(sp.source_type,'')) = 'AGGREGATOR'
              OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(
                  CASE
                    WHEN jsonb_typeof(coalesce(sp.source_portals,'[]'::jsonb)) = 'array'
                      THEN sp.source_portals
                    ELSE '[]'::jsonb
                  END
                ) portal(value)
                WHERE lower(portal.value) IN (
                  'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5'
                )
              )
            )
        )
), scored AS (
  SELECT c.*,
    EXISTS (SELECT 1 FROM public.posts p WHERE p.recruitment_id = c.id) AS has_canonical_post,
    EXISTS (
      SELECT 1 FROM public.official_digest_promote d
      WHERE d.batch = c.ingest_batch
        AND d.hub->>'official_url' = c.official_notification_url
    ) AS has_staging_match
  FROM candidates c
)
SELECT
  now() AS snapshot_at_utc,
  (SELECT count(*) FROM public.recruitments) AS total_recruitments,
  (SELECT count(*) FROM public.posts) AS total_canonical_posts,
  (SELECT count(*) FROM public.postings) AS total_legacy_postings,
  count(*) AS source_signal_recruitments,
  count(*) FILTER (WHERE has_canonical_post) AS with_canonical_post,
  count(*) FILTER (WHERE NOT has_canonical_post) AS without_canonical_post,
  count(*) FILTER (WHERE has_staging_match) AS staging_matches,
  count(*) FILTER (WHERE NOT has_staging_match) AS without_staging_match,
  count(*) FILTER (WHERE ingest_batch IS NULL) AS without_ingest_batch
FROM scored;

-- 2) Of the source-signal candidates without a canonical Post, distinguish
-- legacy Posting mapping available from no legacy mapping. No row-level output.
WITH candidates AS (
  SELECT r.id
  FROM public.recruitments r
  WHERE r.enrichment_data->'meta'->>'source'
          IN ('institutional_aggregation','institution_aggregation','fja_html')
     OR lower(coalesce(r.official_link_source,'')) IN (
          'aggregator_discovered','fja_official_link_extracted','official_link_extracted'
        )
     OR EXISTS (
          SELECT 1 FROM public.posts p
          WHERE p.recruitment_id = r.id
            AND lower(coalesce(p."sourceName",'')) IN (
              'aggregator','freejobalert','aggregator_extracted','pilot_preliminary'
            )
        )
     OR EXISTS (
          SELECT 1 FROM public.postings sp
          LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
          WHERE (sp.inferred_recruitment_id = r.id OR cp.recruitment_id = r.id)
            AND (
              lower(coalesce(sp.source,'')) IN (
                'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5'
              )
              OR upper(coalesce(sp.source_type,'')) = 'AGGREGATOR'
              OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(
                  CASE WHEN jsonb_typeof(coalesce(sp.source_portals,'[]'::jsonb)) = 'array'
                    THEN sp.source_portals ELSE '[]'::jsonb END
                ) portal(value)
                WHERE lower(portal.value) IN (
                  'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5'
                )
              )
            )
        )
), no_post AS (
  SELECT c.id,
    EXISTS (
      SELECT 1
      FROM public.postings sp
      LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
      WHERE (sp.inferred_recruitment_id = c.id OR cp.recruitment_id = c.id)
        AND (
          lower(coalesce(sp.source,'')) IN (
            'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5'
          )
          OR upper(coalesce(sp.source_type,'')) = 'AGGREGATOR'
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(
              CASE WHEN jsonb_typeof(coalesce(sp.source_portals,'[]'::jsonb)) = 'array'
                THEN sp.source_portals ELSE '[]'::jsonb END
            ) portal(value)
            WHERE lower(portal.value) IN (
              'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5'
            )
          )
        )
    ) AS has_legacy_mapping
  FROM candidates c
  WHERE NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.recruitment_id = c.id)
)
SELECT
  count(*) AS without_canonical_post,
  count(*) FILTER (WHERE has_legacy_mapping) AS with_legacy_mapping,
  count(*) FILTER (WHERE NOT has_legacy_mapping) AS without_legacy_mapping
FROM no_post;

-- 3) Count Recruitments with known aggregator URLs in any persisted URL field.
-- Host comparison is exact or subdomain-boundary matching, not substring matching.
WITH domains(domain) AS (
  VALUES
    ('freejobalert.com'),('sarkariresult.com'),('sarkarinaukri.com'),
    ('indiasarkarinaukri.com'),('sahisarkarijobs.com'),('sarkariexam.com'),
    ('t.me'),('telegram.me'),('whatsapp.com'),('arattai.in'),('wa.me'),
    ('telegram.org'),('facebook.com'),('twitter.com'),('x.com'),
    ('instagram.com'),('youtube.com'),('marugujarat.co.in'),
    ('pdfjobsjankari.com'),('onlineupcar.com'),('rojgarresult.com'),
    ('freshersworld.com')
), urls AS (
  SELECT r.id AS recruitment_id, 'recruitments.source_url' AS field, r.source_url AS value
  FROM public.recruitments r WHERE r.source_url IS NOT NULL
  UNION ALL
  SELECT r.id, 'recruitments.official_notification_url', r.official_notification_url
  FROM public.recruitments r WHERE r.official_notification_url IS NOT NULL
  UNION ALL
  SELECT r.id, 'recruitments.official_application_url', r.official_application_url
  FROM public.recruitments r WHERE r.official_application_url IS NOT NULL
  UNION ALL
  SELECT p.recruitment_id, 'posts.sourceReference', p."sourceReference"
  FROM public.posts p WHERE p."sourceReference" IS NOT NULL
  UNION ALL
  SELECT p.recruitment_id, 'posts.original_recruitment_url', p.original_recruitment_url
  FROM public.posts p WHERE p.original_recruitment_url IS NOT NULL
  UNION ALL
  SELECT p.recruitment_id, 'posts.originalRecruitmentUrl', p."originalRecruitmentUrl"
  FROM public.posts p WHERE p."originalRecruitmentUrl" IS NOT NULL
  UNION ALL
  SELECT p.recruitment_id, 'posts.officialSourceUrl', p."officialSourceUrl"
  FROM public.posts p WHERE p."officialSourceUrl" IS NOT NULL
  UNION ALL
  SELECT p.recruitment_id, 'posts.applyPortalUrl', p."applyPortalUrl"
  FROM public.posts p WHERE p."applyPortalUrl" IS NOT NULL
  UNION ALL
  SELECT p.recruitment_id, 'posts.application_url', p.application_url
  FROM public.posts p WHERE p.application_url IS NOT NULL
  UNION ALL
  SELECT p.recruitment_id, 'posts.officialNotificationUrl', p."officialNotificationUrl"
  FROM public.posts p WHERE p."officialNotificationUrl" IS NOT NULL
  UNION ALL
  SELECT coalesce(sp.inferred_recruitment_id, cp.recruitment_id),
         'postings.source_url', sp.source_url
  FROM public.postings sp
  LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
  WHERE sp.source_url IS NOT NULL
), host_rows AS (
  SELECT recruitment_id, field,
    lower((regexp_match(
      btrim(value), '^(?:(?:https?:)?//)?(?:www\\.)?([^/:?#]+)'
    ))[1]) AS host
  FROM urls
), hits AS (
  SELECT DISTINCT h.recruitment_id, h.field, h.host
  FROM host_rows h
  JOIN domains d ON h.host = d.domain OR h.host LIKE '%.' || d.domain
  WHERE h.recruitment_id IS NOT NULL
)
SELECT
  count(DISTINCT recruitment_id) AS recruitments_with_known_aggregator_url,
  count(DISTINCT recruitment_id) FILTER (
    WHERE field IN (
      'recruitments.official_notification_url',
      'recruitments.official_application_url'
    )
  ) AS recruitments_with_aggregator_in_official_fields
FROM hits;

COMMIT;
