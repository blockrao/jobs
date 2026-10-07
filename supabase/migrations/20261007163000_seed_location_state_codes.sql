-- Seed ISO 3166-2:IN state codes from slug patterns (A-082 / Step B).
--
-- Strategy: match on well-known state-body slug keywords. National bodies
-- (SSC, UPSC, RRB, RBI, IBPS, Navy, AIIMS, India Post, CAPFs etc.) are
-- deliberately left NULL — their jobs are open countrywide and should not
-- carry a single addressRegion. State-level bodies get the ISO 3166-2 code
-- for their state. This is a best-effort first seed; enrichment will
-- populate individual rows more precisely as notifications are processed.
--
-- All updates are guarded by WHERE location_state_code IS NULL so that
-- manually enriched rows are never overwritten.

-- ── Uttar Pradesh ─────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-UP'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%uttar-pradesh%' OR slug ILIKE '%-upsssc-%' OR
    slug ILIKE '%-uppsc-%' OR slug ILIKE '%-upessc-%' OR
    slug ILIKE '%-up-police%' OR slug ILIKE '%up-police-%' OR
    slug ILIKE '%up-tet%' OR slug ILIKE '%up-anganwadi%' OR
    slug ILIKE '%up-scholarship%' OR slug ILIKE '%-uptet-%'
  );

-- ── Madhya Pradesh ────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-MP'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%madhya-pradesh%' OR slug ILIKE '%-mpesb-%' OR
    slug ILIKE '%-mppsc-%' OR slug ILIKE '%-mppeb-%' OR
    slug ILIKE '%-mp-police%' OR slug ILIKE '%mp-police-%' OR
    slug ILIKE '%mp-hstst%' OR slug ILIKE '%mppeb-hstst%'
  );

-- ── Bihar ─────────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-BR'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%bihar%' OR slug ILIKE '%-bpsc-%' OR
    slug ILIKE '%-bssc-%' OR slug ILIKE '%-btsc-%' OR
    slug ILIKE '%-bseb-%'
  );

-- ── Rajasthan ─────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-RJ'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%rajasthan%' OR slug ILIKE '%-rpsc-%' OR
    slug ILIKE '%-rssb-%'
  );

-- ── Haryana ───────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-HR'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%haryana%' OR slug ILIKE '%-hpsc-%' OR
    slug ILIKE '%-hssc-%'
  );

-- ── Delhi ─────────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-DL'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%delhi%' OR slug ILIKE '%-dsssb-%' OR
    slug ILIKE '%-gnct-%'
  );

-- ── Chandigarh (UT) ───────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-CH'
WHERE location_state_code IS NULL
  AND slug ILIKE '%chandigarh%';

-- ── Odisha ────────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-OR'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%odisha%' OR slug ILIKE '%-opsc-%' OR
    slug ILIKE '%-ossc-%' OR slug ILIKE '%-ouat%'
  );

-- ── Jharkhand ─────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-JH'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%jharkhand%' OR slug ILIKE '%-jssc-%' OR
    slug ILIKE '%-jpsc-%'
  );

-- ── Chhattisgarh ──────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-CT'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%chhattisgarh%' OR slug ILIKE '%-cgpsc-%' OR
    slug ILIKE '%-cgvyapam%'
  );

-- ── Gujarat ───────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-GJ'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%gujarat%' OR slug ILIKE '%-gpsc-%' OR
    slug ILIKE '%-gsssb-%'
  );

-- ── Maharashtra ───────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-MH'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%maharashtra%' OR slug ILIKE '%-mpsc-%'
  );

-- ── Punjab ────────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-PB'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%punjab%' OR slug ILIKE '%-ppsc-%' OR
    slug ILIKE '%-psssb-%'
  );

-- ── Karnataka ─────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-KA'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%karnataka%' OR slug ILIKE '%-kpsc-%' OR
    slug ILIKE '%-kssb-%'
  );

-- ── Tamil Nadu ────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-TN'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%tamil-nadu%' OR slug ILIKE '%-tnpsc-%' OR
    slug ILIKE '%-tnusrb-%'
  );

-- ── Telangana ─────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-TG'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%telangana%' OR slug ILIKE '%-tspsc-%' OR
    slug ILIKE '%-tspolice%'
  );

-- ── Andhra Pradesh ────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-AP'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%andhra%' OR slug ILIKE '%-appsc-%'
  );

-- ── West Bengal ───────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-WB'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%west-bengal%' OR slug ILIKE '%-wbpsc-%' OR
    slug ILIKE '%-wbssc-%' OR slug ILIKE '%-wbcs%'
  );

-- ── Kerala ────────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-KL'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%kerala%' OR slug ILIKE '%-kpsc-%'
  );

-- ── Himachal Pradesh ──────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-HP'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%himachal%' OR slug ILIKE '%-hppsc%' OR
    slug ILIKE '%-hpsssb%'
  );

-- ── Uttarakhand ───────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-UT'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%uttarakhand%' OR slug ILIKE '%-ukpsc%' OR
    slug ILIKE '%-uksssc%'
  );

-- ── Jammu & Kashmir (UT) ──────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-JK'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%jammu%' OR slug ILIKE '%kashmir%' OR
    slug ILIKE '%-jkssb%' OR slug ILIKE '%-jkpsc%'
  );

-- ── Assam ─────────────────────────────────────────────────────────────────────
UPDATE public.recruitments SET location_state_code = 'IN-AS'
WHERE location_state_code IS NULL
  AND (
    slug ILIKE '%assam%' OR slug ILIKE '%-apsc-%' OR
    slug ILIKE '%-slprb%'
  );

-- ── Verify: count seeded vs still-null ────────────────────────────────────────
SELECT
  location_state_code,
  COUNT(*) AS n
FROM public.recruitments
GROUP BY location_state_code
ORDER BY n DESC;
