-- JobOye source-origin and public RLS audit — READ ONLY.
-- Snapshot: 2026-10-31. Candidate source indicators are evidence of discovery
-- provenance, not proof that a Recruitment's facts are wrong.
-- This script contains SELECT statements only and makes no database changes.

BEGIN TRANSACTION READ ONLY;

-- 0) Snapshot clock and migration state context.
SELECT
  now() AS database_now,
  current_setting('TimeZone') AS database_timezone,
  now() AT TIME ZONE 'Asia/Kolkata' AS current_ist;

-- 1) Distribution of persisted source-origin signals.
SELECT 'recruitments.enrichment_data.meta.source' AS signal,
       coalesce(enrichment_data -> 'meta' ->> 'source','(null)') AS value,
       count(*) AS records
FROM public.recruitments
GROUP BY 1,2
UNION ALL
SELECT 'recruitments.official_link_source',
       coalesce(official_link_source,'(null)'),
       count(*)
FROM public.recruitments
GROUP BY 1,2
UNION ALL
SELECT 'posts.sourceName',
       coalesce("sourceName",'(null)'),
       count(*)
FROM public.posts
GROUP BY 1,2
UNION ALL
SELECT 'posts.sourceReference.host',
       CASE
         WHEN nullif("sourceReference",'') IS NULL THEN '(null)'
         ELSE lower(substring("sourceReference" FROM '^https?://([^/]+)'))
       END,
       count(*)
FROM public.posts
GROUP BY 1,2
UNION ALL
SELECT 'postings.source',
       coalesce(source,'(null)'),
       count(*)
FROM public.postings
GROUP BY 1,2
UNION ALL
SELECT 'postings.source_type',
       coalesce(source_type,'(null)'),
       count(*)
FROM public.postings
GROUP BY 1,2
ORDER BY signal, records DESC, value;

-- 2) Expanded Recruitment candidate cohort.
-- Include canonical Recruitment/Post signals, legacy postings.source/source_type,
-- source_portals, and the known pilot_preliminary/FJA source-reference signal.
WITH candidates AS (
  SELECT
    r.id,
    r.metadata ->> 'ingest_batch' AS ingest_batch,
    r.official_notification_url
  FROM public.recruitments r
  WHERE r.enrichment_data -> 'meta' ->> 'source'
      IN ('institutional_aggregation','institution_aggregation','fja_html')
     OR lower(coalesce(r.official_link_source,'')) IN (
       'aggregator_discovered','fja_official_link_extracted','official_link_extracted'
     )
     OR EXISTS (
       SELECT 1
       FROM public.posts p
       WHERE p.recruitment_id = r.id
         AND (
           lower(coalesce(p."sourceName",'')) IN (
             'aggregator','freejobalert','aggregator_extracted','pilot_preliminary'
           )
           OR lower(coalesce(p."sourceReference",'')) LIKE '%freejobalert.com%'
           OR lower(coalesce(p.original_recruitment_url,'')) LIKE '%freejobalert.com%'
           OR lower(coalesce(p."originalRecruitmentUrl",'')) LIKE '%freejobalert.com%'
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
             ) AS portal(value)
             WHERE lower(portal.value) IN (
               'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5'
             )
           )
         )
     )
),
matched AS (
  SELECT c.*,
    EXISTS (
      SELECT 1
      FROM public.official_digest_promote d
      WHERE d.batch = c.ingest_batch
        AND d.hub ->> 'official_url' = c.official_notification_url
    ) AS has_staging_match
  FROM candidates c
)
SELECT
  (SELECT count(*) FROM public.recruitments) AS total_recruitments,
  count(*) AS expanded_candidate_recruitments,
  count(*) FILTER (WHERE ingest_batch IS NOT NULL) AS with_ingest_batch,
  count(*) FILTER (WHERE has_staging_match) AS matching_staging_row,
  count(*) FILTER (WHERE NOT has_staging_match) AS without_staging_match,
  count(*) FILTER (WHERE ingest_batch IS NULL) AS without_ingest_batch
FROM matched;

-- 3) Legacy postings-only Recruitment rows not covered by the original
-- Recruitment.enrichment_data / official_link_source / canonical Post.sourceName
-- predicate. This is the set the original migration backfill would miss.
WITH original_signals AS (
  SELECT
    r.id,
    (
      r.enrichment_data -> 'meta' ->> 'source'
        IN ('institutional_aggregation','institution_aggregation','fja_html')
      OR lower(coalesce(r.official_link_source,'')) IN (
        'aggregator_discovered','fja_official_link_extracted','official_link_extracted'
      )
      OR EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.recruitment_id = r.id
          AND lower(coalesce(p."sourceName",'')) IN (
            'aggregator','freejobalert','aggregator_extracted'
          )
      )
    ) AS has_original_signal
  FROM public.recruitments r
),
legacy_postings AS (
  SELECT DISTINCT
    coalesce(sp.inferred_recruitment_id, cp.recruitment_id) AS recruitment_id,
    sp.id AS posting_id,
    sp.source,
    sp.source_type,
    sp.source_portals,
    sp.inferred_recruitment_id,
    sp.inferred_post_id
  FROM public.postings sp
  LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
  WHERE lower(coalesce(sp.source,'')) IN (
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
      ) AS portal(value)
      WHERE lower(portal.value) IN (
        'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5'
      )
    )
),
additional AS (
  SELECT l.*
  FROM legacy_postings l
  JOIN original_signals os ON os.id = l.recruitment_id
  WHERE os.has_original_signal IS DISTINCT FROM TRUE
)
SELECT
  count(DISTINCT recruitment_id) AS additional_recruitments,
  count(DISTINCT recruitment_id) FILTER (WHERE inferred_recruitment_id IS NOT NULL) AS mapped_by_inferred_recruitment_id,
  count(DISTINCT recruitment_id) FILTER (WHERE inferred_post_id IS NOT NULL) AS mapped_by_inferred_post_id,
  count(DISTINCT recruitment_id) FILTER (WHERE source = 'fja') AS source_fja,
  array_agg(DISTINCT source ORDER BY source) AS source_values,
  array_agg(DISTINCT source_type ORDER BY source_type) AS source_type_values,
  array_agg(DISTINCT source_portals::text ORDER BY source_portals::text) AS source_portal_values,
  count(DISTINCT recruitment_id) FILTER (
    WHERE NOT EXISTS (
      SELECT 1 FROM public.posts p WHERE p.recruitment_id = additional.recruitment_id
    )
  ) AS without_canonical_posts
FROM additional;

-- 4) Record-level manifest for those additional legacy-posting-only Recruitments.
WITH original_signals AS (
  SELECT
    r.id,
    (
      r.enrichment_data -> 'meta' ->> 'source'
        IN ('institutional_aggregation','institution_aggregation','fja_html')
      OR lower(coalesce(r.official_link_source,'')) IN (
        'aggregator_discovered','fja_official_link_extracted','official_link_extracted'
      )
      OR EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.recruitment_id = r.id
          AND lower(coalesce(p."sourceName",'')) IN (
            'aggregator','freejobalert','aggregator_extracted'
          )
      )
    ) AS has_original_signal
  FROM public.recruitments r
),
legacy_postings AS (
  SELECT DISTINCT
    coalesce(sp.inferred_recruitment_id, cp.recruitment_id) AS recruitment_id,
    sp.id AS posting_id,
    sp.source,
    sp.source_type,
    sp.source_portals,
    sp.inferred_recruitment_id,
    sp.inferred_post_id,
    sp.external_id,
    sp.review_status::text AS review_status,
    sp.is_canonical,
    sp.created_at AS posting_created_at
  FROM public.postings sp
  LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
  WHERE lower(coalesce(sp.source,'')) IN (
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
      ) AS portal(value)
      WHERE lower(portal.value) IN (
        'fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5'
      )
    )
),
additional AS (
  SELECT l.*
  FROM legacy_postings l
  JOIN original_signals os ON os.id = l.recruitment_id
  WHERE os.has_original_signal IS DISTINCT FROM TRUE
)
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  r.status::text AS lifecycle_status,
  r.verification_status,
  r.official_link_source,
  r.official_notification_url,
  r.enrichment_data -> 'meta' ->> 'source' AS enrichment_source,
  a.posting_id,
  a.source,
  a.source_type,
  a.source_portals,
  a.inferred_recruitment_id,
  a.inferred_post_id,
  a.external_id,
  a.review_status,
  a.is_canonical,
  a.posting_created_at,
  (SELECT count(*) FROM public.posts p WHERE p.recruitment_id = r.id) AS canonical_post_count
FROM additional a
JOIN public.recruitments r ON r.id = a.recruitment_id
ORDER BY r.id, a.posting_id;

-- 5) The known pilot_preliminary source signal and source-reference URLs.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  r.status::text AS lifecycle_status,
  r.verification_status,
  r.official_link_source,
  r.official_notification_url,
  p.id AS post_id,
  p.slug AS post_slug,
  p."sourceName",
  p."sourceReference",
  p.original_recruitment_url,
  p."originalRecruitmentUrl"
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE lower(coalesce(p."sourceName",'')) = 'pilot_preliminary'
   OR lower(coalesce(p."sourceReference",'')) LIKE '%freejobalert.com%'
   OR lower(coalesce(p.original_recruitment_url,'')) LIKE '%freejobalert.com%'
   OR lower(coalesce(p."originalRecruitmentUrl",'')) LIKE '%freejobalert.com%'
ORDER BY r.id, p.id;

-- 6) Public API exposure inventory: only tables with anon/authenticated SELECT
-- grants are listed. Policies USING true are direct row-level bypasses.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_select_granted,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select_granted,
  coalesce(p.policy_count,0) AS policy_count,
  p.select_policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN LATERAL (
  SELECT
    count(*) AS policy_count,
    string_agg(
      policyname || ' [' || array_to_string(roles, ',') || '] ' ||
      cmd || ' USING ' || coalesce(qual,'<none>'),
      E'\n' ORDER BY policyname
    ) AS select_policies
  FROM pg_policies pp
  WHERE pp.schemaname = 'public' AND pp.tablename = c.relname
) p ON true
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
  AND (
    has_table_privilege('anon', c.oid, 'SELECT')
    OR has_table_privilege('authenticated', c.oid, 'SELECT')
  )
ORDER BY c.relname;

-- 7) Row counts for the public job-data and shared reference tables.
SELECT 'recruitments' AS table_name, count(*) AS rows FROM public.recruitments
UNION ALL SELECT 'posts', count(*) FROM public.posts
UNION ALL SELECT 'eligibilities', count(*) FROM public.eligibilities
UNION ALL SELECT 'post_age_rules', count(*) FROM public.post_age_rules
UNION ALL SELECT 'vacancies', count(*) FROM public.vacancies
UNION ALL SELECT 'organizations', count(*) FROM public.organizations
UNION ALL SELECT 'positions', count(*) FROM public.positions
ORDER BY table_name;

-- 8) Verify the known aggregator source registry classifications.
SELECT slug, authority::text AS authority, is_official
FROM public.sources
WHERE slug IN ('fja','freejobalert','ext-1','ext-2','ext-3','ext-4','ext-5')
ORDER BY slug;

-- 9) Verify there are no conflicting Recruitment IDs when both legacy
-- postings.inferred_recruitment_id and inferred_post_id are populated.
SELECT
  count(*) AS posting_rows_with_both_links,
  count(*) FILTER (WHERE p.inferred_recruitment_id = cp.recruitment_id) AS consistent_links,
  count(*) FILTER (WHERE p.inferred_recruitment_id <> cp.recruitment_id) AS conflicting_recruitment_links,
  count(*) FILTER (WHERE cp.id IS NULL) AS inferred_post_missing
FROM public.postings p
LEFT JOIN public.posts cp ON cp.id = p.inferred_post_id
WHERE p.inferred_recruitment_id IS NOT NULL
  AND p.inferred_post_id IS NOT NULL;

COMMIT;
