-- DISC-001 (2026-10-14): discoverability remediation — durable defaults.
-- Pre-change report: claude/DISCOVERABILITY_REMEDIATION_PRECHANGE_REPORT_2026_10_14.md
--
-- 1. backup schema for the row-level rollback sets used by the backfills
-- 2. classify_org_sector(name): one source of truth for org sector, used by
--    the backfill AND an insert trigger (organizations.sector used to default
--    to PRIVATE, which hid 425 government bodies from every sector surface)
-- 3. posts.title defaults to posts.name on insert (ingest never set it, which
--    kept 1,070 Post pages noindex)
-- 4. normalize_role_key(name): the role identity used to map posts to
--    positions (used by the backfill; ingest does the same in TypeScript)

CREATE SCHEMA IF NOT EXISTS backup_20261014;

-- ---------------------------------------------------------------------------
-- 2. Organisation sector classifier. First match wins. Names it cannot place
--    stay PRIVATE, which the product treats as "unresolved / excluded".
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3. posts.title defaults to posts.name
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4. Role identity key for mapping post names to positions.
--    lowercase; drop parentheticals; dashes → space; "grade/level" suffix
--    kept; roman numerals I–IV unified with 1–4; trailing "post(s)" removed;
--    simple plural stripped; whitespace collapsed.
-- ---------------------------------------------------------------------------
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
