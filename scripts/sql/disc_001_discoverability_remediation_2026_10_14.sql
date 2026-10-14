-- ============================================================================
-- DISC-001 — Discoverability remediation (2026-10-14)
-- Run ONCE in the Supabase SQL editor on project "jobs". Single transaction.
-- Pre-change report: claude/DISCOVERABILITY_REMEDIATION_PRECHANGE_REPORT_2026_10_14.md
--
-- What it does, in order:
--   0. backup schema + the durable defaults (same content as
--      supabase/migrations/20261014093000_disc_001_discoverability_defaults.sql)
--   A. posts.title := name where null                     (backup: posts_title_null)
--   B. organizations.sector reclassified where PRIVATE    (backup: org_sector_before)
--   C. positions created from post names (>=2 posts) and
--      posts re-pointed from the "Other" bucket           (backup: posts_position_before,
--                                                          positions_created)
--   V. verification counts (last result set)
--
-- Rollback (each is one statement, see the end of this file).
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------- 0. defaults
CREATE SCHEMA IF NOT EXISTS backup_20261014;

CREATE OR REPLACE FUNCTION public.classify_org_sector(p_name text)
RETURNS public.org_sector
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CASE
    WHEN p_name ~* 'unknown organi[sz]ation' THEN 'PRIVATE'::public.org_sector
    WHEN p_name ~* 'union public service commission|\bupsc\b|^staff selection commission( \(ssc\))?$|^ssc$' THEN 'GOVERNMENT_CENTRAL'
    WHEN p_name ~* 'public service commission|\bpsc\b' THEN 'GOVERNMENT_STATE'
    WHEN p_name ~* 'staff selection (commission|board)|subordinate service|service selection board|services selection board|recruitment board' THEN 'GOVERNMENT_STATE'
    WHEN p_name ~* 'railway|\brrb\b|\brrc\b|metro rail|coach factory|rail wheel|locomotive|\brail\b' THEN 'RAILWAY'
    WHEN p_name ~* '\bbank\b|nabard|sidbi|reserve bank|insurance|\bnhb\b|exim' THEN 'BANKING'
    WHEN p_name ~* '\barmy\b|\bnavy\b|naval|air force|defence|defense|\bdrdo\b|ordnance|border police|border security|\bbsf\b|\bcrpf\b|\bcisf\b|\bitbp\b|\bssb\b|sashastra|coast guard|military|cantonment|weapons|hindustan aeronautics|bharat electronics|bharat earth movers|\bbeml\b|\bbdl\b|bharat dynamics|mazagon|garden reach|\bgrse\b|\bhal\b' THEN 'DEFENCE'
    WHEN p_name ~* '\blimited\b|\bltd\b|corporation|\bnigam\b|undertaking|\bnpcil\b|\bntpc\b|\bnhai\b|\bnlc\b|\becil\b|\bdfccil\b|\bedcil\b|\bhll\b|\bmecon\b|\bpower\b|electricity|petroleum|shipyard|airport|\bport\b|\bbhel\b|\bsail\b|\bgail\b|\bongc\b|\biocl\b|\bbpcl\b|\bhpcl\b|\bcoal\b|\bnmdc\b|\bnalco\b|\bbsnl\b|\bmtnl\b|\bpgcil\b|\bpowergrid\b|\bnhpc\b|\bsjvn\b|\bthdc\b|\bircon\b|\brites\b|\bconcor\b|\bcwc\b|warehousing' THEN 'PSU'
    WHEN p_name ~* 'ministry|government of india|\bnational\b|\bcentral\b|all india|indian institute|\biit\b|\biim\b|\bnit\b|\biiser\b|\baiims\b|\bcsir\b|\bicar\b|\bicmr\b|\bisro\b|\bspace\b|bhabha|\bunion\b|supreme court|high court|\bugc\b|\bncert\b|\bcbse\b|kendriya|navodaya|prasar bharati|bureau of|\bdae\b|\bbarc\b|\bigcar\b|\bnielit\b|\bcdac\b|c-dac|\bnift\b|\bnid\b|\bnlu\b|law university|\bigidr\b|\bsctimst\b|tata memorial|cancer centre|\bechs\b|\bcwprs\b|\bcppri\b|\bnppa\b|wildlife crime|telematics|e-governance|\bcsc\b' THEN 'GOVERNMENT_CENTRAL'
    WHEN p_name ~* 'district|zilla|municipal|nagar|panchayat|collector|\bstate\b|government of|\bgovt\b|department|directorate|commission|\bboard\b|university|college|school|hospital|medical|health|institute|authority|council|society|mission|samiti|vidyalaya|vidyapeeth|police|home guard|anganwadi|krishi|\bnhm\b|arogya|chikitsalaya|tribunal|welfare|development|academy|centre|center|agency|foundation|\btrust\b|office|court' THEN 'GOVERNMENT_STATE'
    ELSE 'PRIVATE'::public.org_sector
  END;
$$;

CREATE OR REPLACE FUNCTION public.organizations_sector_default()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sector IS NULL OR NEW.sector = 'PRIVATE' THEN
    NEW.sector := public.classify_org_sector(COALESCE(NEW.name, ''));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS organizations_sector_default ON public.organizations;
CREATE TRIGGER organizations_sector_default
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.organizations_sector_default();

CREATE OR REPLACE FUNCTION public.posts_title_default()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.title IS NULL AND NEW.name IS NOT NULL THEN
    NEW.title := NEW.name;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS posts_title_default ON public.posts;
CREATE TRIGGER posts_title_default
  BEFORE INSERT OR UPDATE OF name, title ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_title_default();

CREATE OR REPLACE FUNCTION public.normalize_role_key(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  WITH s1 AS (SELECT lower(p_name) AS v),
  s2 AS (SELECT regexp_replace(v, '\s*\([^)]*\)\s*', ' ', 'g') AS v FROM s1),
  s3 AS (SELECT regexp_replace(v, '[\-–—_/]+', ' ', 'g') AS v FROM s2),
  s4 AS (SELECT regexp_replace(v, '\s+(posts?|vacanc(y|ies))\s*$', '', 'g') AS v FROM s3),
  s5 AS (SELECT regexp_replace(v, '\b(iv)\b', '4', 'g') AS v FROM s4),
  s6 AS (SELECT regexp_replace(v, '\b(iii)\b', '3', 'g') AS v FROM s5),
  s7 AS (SELECT regexp_replace(v, '\b(ii)\b', '2', 'g') AS v FROM s6),
  s8 AS (SELECT regexp_replace(v, '\b(i)\b', '1', 'g') AS v FROM s7),
  s9 AS (SELECT regexp_replace(v, '[^a-z0-9 ]', '', 'g') AS v FROM s8),
  s10 AS (SELECT regexp_replace(v, '(\w{3,})s\b', '\1', 'g') AS v FROM s9),
  s11 AS (SELECT trim(regexp_replace(v, '\s+', ' ', 'g')) AS v FROM s10)
  SELECT v FROM s11;
$$;

-- Record the migration so the Supabase migration history matches the repo file.
DO $m$ BEGIN
  INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
  VALUES ('20261014093000', 'disc_001_discoverability_defaults', ARRAY['-- applied via SQL editor; see repo file'])
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'migration history not updated (%), continuing', SQLERRM;
END $m$;

-- ---------------------------------------------------------------- A. titles
CREATE TABLE IF NOT EXISTS backup_20261014.posts_title_null AS
  SELECT id FROM public.posts WHERE title IS NULL;

UPDATE public.posts SET title = name
WHERE title IS NULL AND name IS NOT NULL;

-- ---------------------------------------------------------------- B. sectors
CREATE TABLE IF NOT EXISTS backup_20261014.org_sector_before AS
  SELECT id, sector FROM public.organizations;

UPDATE public.organizations
SET sector = public.classify_org_sector(name)
WHERE sector = 'PRIVATE';

-- ---------------------------------------------------------------- C. roles
CREATE TABLE IF NOT EXISTS backup_20261014.posts_position_before AS
  SELECT id, position_id FROM public.posts;

-- Single-role posts currently in the catch-all, keyed by normalised name.
CREATE TEMP TABLE other_single ON COMMIT DROP AS
  SELECT p.id, p.name, public.normalize_role_key(p.name) AS key
  FROM public.posts p
  JOIN public.positions po ON po.id = p.position_id
  WHERE po.slug = 'category-other'
    AND p.name !~* ' and more|,|/|&|\bvarious\b|\bmultiple\b|\bposts?\b$| and '
    AND length(public.normalize_role_key(p.name)) >= 3;

-- Keys worth a hub: >=2 posts. Display name = most frequent original casing.
CREATE TEMP TABLE role_keys ON COMMIT DROP AS
  SELECT key,
         mode() WITHIN GROUP (ORDER BY name) AS display_name,
         count(*) AS post_count,
         regexp_replace(key, ' ', '-', 'g') AS slug
  FROM other_single
  GROUP BY key
  HAVING count(*) >= 2;

-- Reuse an existing real position when its normalised name matches.
CREATE TEMP TABLE role_map ON COMMIT DROP AS
  SELECT rk.key, rk.display_name, rk.post_count, rk.slug,
         (SELECT po.id FROM public.positions po
            WHERE po.slug <> 'category-other'
              AND public.normalize_role_key(po.name) = rk.key
            ORDER BY po.id LIMIT 1) AS existing_position_id
  FROM role_keys rk;

-- Create the missing positions. Slug collisions with an unrelated existing
-- position get a "-role" suffix rather than being skipped.
CREATE TABLE IF NOT EXISTS backup_20261014.positions_created (position_id integer PRIMARY KEY, key text, slug text);

WITH to_create AS (
  SELECT key, display_name, post_count,
         CASE WHEN EXISTS (SELECT 1 FROM public.positions po WHERE po.slug = rm.slug)
              THEN rm.slug || '-role' ELSE rm.slug END AS slug
  FROM role_map rm WHERE existing_position_id IS NULL
), ins AS (
  INSERT INTO public.positions (name, slug, category, description)
  SELECT
    left(display_name, 200),
    left(slug, 120),
    CASE
      WHEN key ~ 'teacher|lecturer|professor|faculty|tgt|pgt|prt|instructor|tutor' THEN 'TEACHING'
      WHEN key ~ 'engineer|technician|technical|electrician|fitter|welder|draughtsman|mechanic' THEN 'ENGINEERING'
      WHEN key ~ 'nurse|medical|doctor|resident|pharmacist|physician|surgeon|dental|lab technician|radiographer|anm|gnm|paramedic|health' THEN 'MEDICAL'
      WHEN key ~ 'constable|inspector|police|security' THEN 'POLICE'
      WHEN key ~ 'judge|judicial|magistrate' THEN 'JUDICIAL'
      WHEN key ~ 'legal|advocate|prosecutor|law' THEN 'LEGAL'
      WHEN key ~ 'clerk|assistant|officer|stenographer|typist|data entry|accountant|manager|secretary|operator|peon|attendant|driver' THEN 'ADMINISTRATIVE'
      ELSE 'OTHER'
    END::public.position_category,
    NULL
  FROM to_create
  RETURNING id, slug
)
INSERT INTO backup_20261014.positions_created (position_id, key, slug)
SELECT ins.id, tc.key, ins.slug
FROM ins JOIN to_create tc ON tc.slug = ins.slug;

-- Point every mapped post at its role.
UPDATE public.posts p
SET position_id = COALESCE(rm.existing_position_id, pc.position_id)
FROM other_single os
JOIN role_map rm ON rm.key = os.key
LEFT JOIN backup_20261014.positions_created pc ON pc.key = rm.key
WHERE p.id = os.id
  AND COALESCE(rm.existing_position_id, pc.position_id) IS NOT NULL;

-- ---------------------------------------------------------------- V. verify
SELECT 'A: posts with null title (expect 0)' AS check_name, count(*)::text AS value FROM public.posts WHERE title IS NULL
UNION ALL SELECT 'A: titles backfilled', count(*)::text FROM backup_20261014.posts_title_null
UNION ALL SELECT 'B: orgs still PRIVATE (unresolved)', count(*)::text FROM public.organizations WHERE sector = 'PRIVATE'
UNION ALL SELECT 'B: orgs by sector', string_agg(sector || '=' || n, ', ') FROM (SELECT sector::text, count(*) n FROM public.organizations GROUP BY sector ORDER BY n DESC) s
UNION ALL SELECT 'C: positions created', count(*)::text FROM backup_20261014.positions_created
UNION ALL SELECT 'C: posts moved out of Other', count(*)::text FROM public.posts p JOIN backup_20261014.posts_position_before b ON b.id = p.id WHERE b.position_id <> p.position_id
UNION ALL SELECT 'C: posts still in Other', count(*)::text FROM public.posts p JOIN public.positions po ON po.id = p.position_id WHERE po.slug = 'category-other'
UNION ALL SELECT 'C: real positions with posts', count(DISTINCT p.position_id)::text FROM public.posts p JOIN public.positions po ON po.id = p.position_id WHERE po.slug <> 'category-other';

COMMIT;

-- ============================================================================
-- ROLLBACK (only if needed; run separately, each line is independent)
-- ============================================================================
-- A: UPDATE public.posts SET title = NULL WHERE id IN (SELECT id FROM backup_20261014.posts_title_null);
-- B: UPDATE public.organizations o SET sector = b.sector FROM backup_20261014.org_sector_before b WHERE b.id = o.id;
-- C: UPDATE public.posts p SET position_id = b.position_id FROM backup_20261014.posts_position_before b WHERE b.id = p.id;
--    DELETE FROM public.positions WHERE id IN (SELECT position_id FROM backup_20261014.positions_created);
-- Triggers: DROP TRIGGER organizations_sector_default ON public.organizations; DROP TRIGGER posts_title_default ON public.posts;
