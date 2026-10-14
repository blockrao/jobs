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
    WHEN p_name ~* 'union public service commission|\yupsc\y|^staff selection commission( \(ssc\))?$|^ssc$' THEN 'GOVERNMENT_CENTRAL'
    WHEN p_name ~* 'public service commission|\ypsc\y|\y[a-z]{1,4}psc\y' THEN 'GOVERNMENT_STATE'
    WHEN p_name ~* 'staff selection (commission|board)|subordinate service|service selection board|services selection board|recruitment board|state selection board|selection board' THEN 'GOVERNMENT_STATE'
    WHEN p_name ~* 'railway|\yrrb\y|\yrrc\y|metro rail|coach factory|rail wheel|locomotive|\yrail\y|\yicf\y' THEN 'RAILWAY'
    WHEN p_name ~* '\ybank\y|nabard|sidbi|reserve bank|insurance|\ynhb\y|exim|housing finance|\ylic\y|finance limited' THEN 'BANKING'
    WHEN p_name ~* '\yarmy\y|\ynavy\y|naval|air force|defence|defense|\ydrdo\y|ordnance|border police|border security|\ybsf\y|\ycrpf\y|\ycisf\y|\yitbp\y|\yssb\y|sashastra|coast guard|military|cantonment|weapons|armoured|hindustan aeronautics|bharat electronics|bharat earth movers|\ybeml\y|\ybdl\y|bharat dynamics|mazagon|garden reach|\ygrse\y|\yhal\y|test range|gas turbine research|aerospace' THEN 'DEFENCE'
    WHEN p_name ~* '\ylimited\y|\yltd\y|corporation|\ynigam\y|undertaking|\ynpcil\y|\yntpc\y|\ynhai\y|\ynlc\y|\yecil\y|\ydfccil\y|\yedcil\y|\yhll\y|\ymecon\y|\ypower\y|electricity|petroleum|shipyard|airport|\yport\y|\ybhel\y|\ysail\y|\ygail\y|\yongc\y|\yiocl\y|\ybpcl\y|\yhpcl\y|\ycoal\y|\ynmdc\y|\ynalco\y|\ybsnl\y|\ymtnl\y|\ypgcil\y|\ypowergrid\y|\ynhpc\y|\ysjvn\y|\ythdc\y|\yircon\y|\yrites\y|\yconcor\y|\ycwc\y|warehousing|jal vidyut|generating company|\ynetc\y' THEN 'PSU'
    WHEN p_name ~* 'ministry|government of india|\ynational\y|\ycentral\y|all india|indian institute|\yiit\y|\yiim\y|\ynit\y|\yiiser\y|\yaiims\y|\ycsir\y|\yicar\y|\yicmr\y|\yisro\y|\yspace\y|bhabha|\yunion\y|supreme court|high court|\yugc\y|\yncert\y|\ycbse\y|kendriya|navodaya|\yjnv\y|prasar bharati|bureau of|\ydae\y|\ybarc\y|\yigcar\y|\ynielit\y|\ycdac\y|c-dac|\ynift\y|\ynid\y|\ynlu\y|law university|\yigidr\y|\ysctimst\y|tata memorial|cancer centre|\yechs\y|\ycwprs\y|\ycppri\y|\ynppa\y|wildlife crime|telematics|e-governance|\ycsc\y|silk board|\yniti\y|transforming india|dope testing|\ybhu\y|\ygndu\y|traditional knowledge|in-space|pollution control committee|nishd' THEN 'GOVERNMENT_CENTRAL'
    WHEN p_name ~* 'district|zilla|municipal|nagar|panchayat|collector|\ystate\y|\ysate\y|government of|\ygovt\y|department|directorate|commission|\yboard\y|university|college|school|hospital|medical|health|institute|authority|council|society|mission|samiti|vidyalaya|vidyapeeth|vidyasahayak|police|home guard|anganwadi|krishi|\ynhm\y|arogya|chikitsalaya|tribunal|welfare|development|academy|centre|center|agency|foundation|\ytrust\y|office|court|\yslrc\y|basic education|\yamch\y|\ycedmap\y' THEN 'GOVERNMENT_STATE'
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
  s5 AS (SELECT regexp_replace(v, '\y(iv)\y', '4', 'g') AS v FROM s4),
  s6 AS (SELECT regexp_replace(v, '\y(iii)\y', '3', 'g') AS v FROM s5),
  s7 AS (SELECT regexp_replace(v, '\y(ii)\y', '2', 'g') AS v FROM s6),
  s8 AS (SELECT regexp_replace(v, '\y(i)\y', '1', 'g') AS v FROM s7),
  s9 AS (SELECT regexp_replace(v, '[^a-z0-9 ]', '', 'g') AS v FROM s8),
  s10 AS (SELECT regexp_replace(v, '(\w{3,})s\y', '\1', 'g') AS v FROM s9),
  s11 AS (SELECT trim(regexp_replace(v, '\s+', ' ', 'g')) AS v FROM s10)
  SELECT v FROM s11;
$$;
