-- JobOye P0 source-origin / RLS post-migration verification.
-- READ ONLY. Run only after the reviewed migration is applied.
-- The first result must report 6,365 aggregator-origin Recruitments for the
-- 2026-10-31 production snapshot, including all known aggregator URL hosts.
-- Recruitments and Posts are intentionally not available through the anon REST
-- role because those base rows contain internal source/provenance columns.

BEGIN TRANSACTION READ ONLY;

-- 1) Full persisted-origin coverage. Expected snapshot: 6,365 / 6,365.
SELECT
  count(*) AS total_recruitments,
  count(*) FILTER (
    WHERE private.recruitment_has_aggregator_origin(r.id)
  ) AS aggregator_origin_recruitments,
  count(*) FILTER (
    WHERE NOT private.recruitment_has_aggregator_origin(r.id)
  ) AS origin_signals_missed_by_gate,
  count(*) FILTER (
    WHERE private.is_recruitment_publicly_trusted(r.id)
  ) AS trusted_recruitments,
  count(*) FILTER (
    WHERE private.recruitment_has_aggregator_origin(r.id)
      AND NOT EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.recruitment_id = r.id
          AND p.posting_status IS DISTINCT FROM 'DUPLICATE'
      )
  ) AS aggregator_recruitments_without_canonical_post
FROM public.recruitments r;

-- 2) Record-level manifest for source-origin Recruitments with no canonical Post.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  r.status::text AS lifecycle_status,
  r.verification_status,
  r.source_discovery_origin,
  r.official_link_source,
  sp.id AS legacy_posting_id,
  sp.source AS legacy_source,
  sp.source_type AS legacy_source_type,
  sp.source_portals,
  sp.inferred_recruitment_id,
  sp.inferred_post_id
FROM public.recruitments r
JOIN public.postings sp
  ON sp.inferred_recruitment_id = r.id
  OR EXISTS (
    SELECT 1 FROM public.posts linked_post
    WHERE linked_post.id = sp.inferred_post_id
      AND linked_post.recruitment_id = r.id
  )
WHERE private.recruitment_has_aggregator_origin(r.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id
      AND p.posting_status IS DISTINCT FROM 'DUPLICATE'
  )
ORDER BY r.id, sp.id;

-- 3) Verify all five job-data tables have RLS and a non-permissive SELECT policy.
-- Recruitments and Posts must have no anon table SELECT grant; child tables keep
-- their RLS-filtered anon SELECT grants.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_select_granted,
  count(pp.policyname) FILTER (WHERE pp.cmd = 'SELECT') AS select_policy_count,
  bool_or(pp.qual = 'true') FILTER (WHERE pp.cmd = 'SELECT') AS has_unrestricted_select_policy
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies pp
  ON pp.schemaname = 'public'
 AND pp.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relname IN ('recruitments','posts','eligibilities','post_age_rules','vacancies')
GROUP BY c.relname, c.relrowsecurity, c.oid
ORDER BY c.relname;

-- 4) Verify the source-sensitive public REST boundary as anon.
-- Recruitments and Posts must be denied at the privilege boundary. Child rows
-- remain queryable only through their source-trust RLS policies; expected counts
-- are zero for the current 6,365-record snapshot.
SELECT
  table_name,
  has_table_privilege('anon', format('public.%I', table_name), 'SELECT') AS anon_select_granted
FROM (VALUES ('recruitments'),('posts'),('eligibilities'),('post_age_rules'),('vacancies'))
  AS expected(table_name)
ORDER BY table_name;

SET LOCAL ROLE anon;
SELECT 'eligibilities' AS table_name, count(*) AS anon_visible_rows FROM public.eligibilities
UNION ALL SELECT 'post_age_rules', count(*) FROM public.post_age_rules
UNION ALL SELECT 'vacancies', count(*) FROM public.vacancies
UNION ALL SELECT 'organizations', count(*) FROM public.organizations
UNION ALL SELECT 'positions', count(*) FROM public.positions
ORDER BY table_name;
RESET ROLE;

-- 5) Shared reference data remains public; sensitive adjacent tables remain
-- unexposed. No policy or grant should be added to these tables by this change.
SELECT
  table_name,
  has_table_privilege('anon', format('public.%I', table_name), 'SELECT') AS anon_select_granted
FROM (VALUES
  ('organizations'),
  ('positions'),
  ('exams'),
  ('locations'),
  ('qualifications'),
  ('evidence'),
  ('recruitment_fees'),
  ('postings')
) AS expected(table_name)
ORDER BY table_name;

COMMIT;
