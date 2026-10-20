-- 20261020200000_merge_duplicate_organizations.sql
-- One canonical organization entity per real-world body.
--
-- A later bulk ingest created "Name (ACRONYM)" twins of existing organizations
-- (UPSC, SBI, SSC, HAL, IBPS, RRB, ...): 49 groups / 54 duplicate rows on 2026-10-20.
-- Duplicates are never deleted: the row keeps its slug and points at the survivor
-- via merged_into_id, so every old URL 301s to exactly one canonical page.
--
-- Survivor per group: pillar_enabled first, then most recruitments, then lowest id.
-- Safe to run statement-by-statement in the Supabase SQL editor (no transaction,
-- no temp tables). Re-runnable: already-merged rows are skipped.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS merged_into_id integer REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS organizations_merged_into_idx
  ON public.organizations(merged_into_id) WHERE merged_into_id IS NOT NULL;

DROP TABLE IF EXISTS public.org_merge_2026_10_20;

CREATE TABLE public.org_merge_2026_10_20 AS
WITH n AS (
  SELECT o.id, o.slug, o.name, o.pillar_enabled,
         lower(regexp_replace(regexp_replace(o.name, '\s*\(.*\)\s*$', ''), '[^a-z0-9]+', ' ', 'gi')) AS norm,
         (SELECT count(*) FROM public.recruitments r WHERE r.organization_id = o.id) AS recs
  FROM public.organizations o
  WHERE o.merged_into_id IS NULL
),
ranked AS (
  SELECT *, row_number() OVER (PARTITION BY norm ORDER BY pillar_enabled DESC, recs DESC, id ASC) AS rn,
         count(*) OVER (PARTITION BY norm) AS c
  FROM n
)
SELECT d.id AS dead_id, d.slug AS dead_slug, d.name AS dead_name, s.id AS survivor_id, s.slug AS survivor_slug
FROM ranked d
JOIN ranked s ON s.norm = d.norm AND s.rn = 1
WHERE d.c > 1 AND d.rn > 1;

UPDATE public.recruitments r SET organization_id = m.survivor_id
  FROM public.org_merge_2026_10_20 m WHERE r.organization_id = m.dead_id;

UPDATE public.posts p SET "organizationId" = m.survivor_id
  FROM public.org_merge_2026_10_20 m WHERE p."organizationId" = m.dead_id;

UPDATE public.posts p SET employing_organization_id = m.survivor_id
  FROM public.org_merge_2026_10_20 m WHERE p.employing_organization_id = m.dead_id;

UPDATE public.postings p SET organization_id = m.survivor_id
  FROM public.org_merge_2026_10_20 m WHERE p.organization_id = m.dead_id;

UPDATE public.organization_mapping x SET canonical_org_id = m.survivor_id
  FROM public.org_merge_2026_10_20 m WHERE x.canonical_org_id = m.dead_id;

UPDATE public.organization_candidates x SET proposed_organization_id = m.survivor_id
  FROM public.org_merge_2026_10_20 m WHERE x.proposed_organization_id = m.dead_id;

UPDATE public.organization_aliases a SET organization_id = m.survivor_id
  FROM public.org_merge_2026_10_20 m
  WHERE a.organization_id = m.dead_id
    AND NOT EXISTS (SELECT 1 FROM public.organization_aliases b
                    WHERE b.alias_normalized = a.alias_normalized AND b.organization_id = m.survivor_id);

DELETE FROM public.organization_aliases a USING public.org_merge_2026_10_20 m WHERE a.organization_id = m.dead_id;

INSERT INTO public.organization_aliases (organization_id, alias_normalized, alias_raw, source)
SELECT m.survivor_id, replace(m.dead_slug, '-', ' '), m.dead_slug, 'merge_2026_10_20'
FROM public.org_merge_2026_10_20 m
ON CONFLICT (alias_normalized) DO NOTHING;

INSERT INTO public.organization_aliases (organization_id, alias_normalized, alias_raw, source)
SELECT m.survivor_id, lower(regexp_replace(m.dead_name, '[^a-z0-9]+', ' ', 'gi')), m.dead_name, 'merge_2026_10_20'
FROM public.org_merge_2026_10_20 m
ON CONFLICT (alias_normalized) DO NOTHING;

UPDATE public.organizations o SET merged_into_id = m.survivor_id
  FROM public.org_merge_2026_10_20 m WHERE o.id = m.dead_id;

-- Review table: SELECT * FROM public.org_merge_2026_10_20; then drop it.
DROP TABLE public.org_merge_2026_10_20;

-- Record in the migration ledger (the SQL editor does not do this for us).
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261020200000', 'merge_duplicate_organizations')
ON CONFLICT DO NOTHING;
