-- ELIG-001: Normalized eligibility model
-- Approved by architect 2026-10-07.
--
-- Architectural invariant:
--   Official notification → Raw evidence → qualificationExpr (canonical)
--   → normalized projections (education_level, disciplines, …) → verified eligibility
--   → search / filters / matching / UX
--
-- qualificationExpr is the source of truth for what a notification says.
-- Flat columns are query/index projections derived from it.
-- They must never contradict qualificationExpr.
--
-- qualificationExpr JSON schema (informal):
-- {
--   "op": "OR" | "AND" | "LEAF",    -- LEAF = single requirement
--   "children": [...],               -- for OR / AND nodes
--   -- LEAF fields:
--   "education":    "GRADUATE" | "DIPLOMA" | "ITI" | "12TH" | "10TH" | "PROFESSIONAL" | …,
--                  (qualificationExpr uses natural language; education_level column uses the DB enum:
--                   BACHELOR maps to GRADUATE, SENIOR_SECONDARY to 12TH, SECONDARY to 10TH)
--   "disciplines":  ["Civil Engineering", "Mechanical Engineering"],   -- implicit OR within leaf
--   "minMarksPct":  70.0,
--   "minCgpa":      7.5,
--   "passingYears": [2022, 2023, 2024, 2025, 2026],
--   "experienceYearsMin": 2,
--   "note": "as per notification"
-- }
--
-- Example (IOCL Graduate Apprentice):
-- {
--   "op": "LEAF",
--   "education": "GRADUATE",
--   "disciplines": ["ECE","Instrumentation Engineering","EEE","CSE",
--                   "Mechanical Engineering","Chemical Engineering",
--                   "Metallurgical Engineering","Safety Engineering",
--                   "Aeronautical Engineering","Aerospace Engineering",
--                   "Civil Engineering"],
--   "minMarksPct": 70.0,
--   "minCgpa": 7.5,
--   "passingYears": [2022, 2023, 2024, 2025, 2026]
-- }
--
-- Example (Graduate + experience OR):
-- {
--   "op": "OR",
--   "children": [
--     {"op":"LEAF","education":"GRADUATE","disciplines":["Civil Engineering"],"experienceYearsMin":3},
--     {"op":"LEAF","education":"DIPLOMA","disciplines":["Civil Engineering"],"experienceYearsMin":5}
--   ]
-- }

-- ── 1. Extend qualification_level enum ───────────────────────────────────────
-- Add missing levels: ITI, DIPLOMA, PROFESSIONAL, BELOW_10TH

ALTER TYPE qualification_level ADD VALUE IF NOT EXISTS 'ITI'          AFTER 'SECONDARY';
ALTER TYPE qualification_level ADD VALUE IF NOT EXISTS 'DIPLOMA'       AFTER 'ITI';
ALTER TYPE qualification_level ADD VALUE IF NOT EXISTS 'PROFESSIONAL'  AFTER 'MASTER';
ALTER TYPE qualification_level ADD VALUE IF NOT EXISTS 'BELOW_10TH'   BEFORE 'SECONDARY';

-- ── 2. New columns on eligibilities ─────────────────────────────────────────

-- education_level: normalized projection of qualificationExpr; must agree with it.
-- education_category (existing varchar) stays as raw text bucket from ingestion.
-- This column is the typed, validated version for query/filter.
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS education_level qualification_level;

-- disciplines: array of discipline strings derived from qualificationExpr.
-- Implicit OR between elements (any one discipline qualifies).
-- ["Any"] means no discipline restriction.
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS disciplines text[];

-- qualification_status: role of this requirement in the full eligibility profile.
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS qualification_status text
    CHECK (qualification_status IN ('MINIMUM', 'PREFERRED'));

-- Marks/grade threshold fields (proven necessary by IOCL data).
-- Both may coexist (e.g. "70% OR CGPA 7.5").
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS min_marks_pct numeric(5,2)
    CHECK (min_marks_pct >= 0 AND min_marks_pct <= 100);
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS min_cgpa numeric(4,2)
    CHECK (min_cgpa >= 0 AND min_cgpa <= 10);

-- Passing-year constraints (stored in qualificationExpr; projected here for range queries).
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS passing_year_min smallint;
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS passing_year_max smallint;

-- Provenance: source + derivation as separate concepts.
-- source_type: where the fact came from.
-- source_ref: URL or document ID.
-- source_locator: section/page/paragraph within the document.
-- derivation: how the fact was produced from the source.
--   DIRECT     = copied verbatim from source
--   NORMALIZED = structured from text by a human or model
--   INFERRED   = assumed from context without explicit statement
-- INFERRED data must never independently produce a definitive eligibility result.
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS source_type text
    CHECK (source_type IN ('OFFICIAL_NOTIFICATION', 'AGGREGATOR', 'INFERRED'));
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS source_ref text;
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS source_locator text;
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS derivation text
    CHECK (derivation IN ('DIRECT', 'NORMALIZED', 'INFERRED'));

-- ── 3. New columns on post_age_rules ─────────────────────────────────────────
-- rule_type: machine-readable classification of age rule.
--   ARITHMETIC     = base + relaxation_years = effective max (simple arithmetic)
--   GOVT_ORDER     = "as per Govt. rules" — no arithmetic, requires external lookup
--   NO_UPPER_LIMIT = explicitly no upper age limit
--   ABSOLUTE_CEILING = maximum that cannot be exceeded even with relaxation
-- condition_text: human-readable condition for the rule (e.g. ex-serviceman service requirement).

ALTER TABLE post_age_rules
  ADD COLUMN IF NOT EXISTS rule_type text
    CHECK (rule_type IN ('ARITHMETIC', 'GOVT_ORDER', 'NO_UPPER_LIMIT', 'ABSOLUTE_CEILING'));
ALTER TABLE post_age_rules
  ADD COLUMN IF NOT EXISTS condition_text text;

-- ── 4. Extend qualifications reference table ──────────────────────────────────
-- Add ITI, DIPLOMA, PROFESSIONAL, BELOW_10TH rows to match extended enum.
-- Uses ON CONFLICT to be idempotent.

INSERT INTO qualifications (name, slug, level, description, created_at)
VALUES
  ('Below 10th',         'below-10th',   'BELOW_10TH',  'Below secondary education',                          NOW()),
  ('ITI / Vocational',   'iti',          'ITI',          'Industrial Training Institute certificate or NTC/NAC', NOW()),
  ('Diploma',            'diploma',      'DIPLOMA',      'Polytechnic diploma or equivalent (3-year)',          NOW()),
  ('Professional Degree','professional', 'PROFESSIONAL', 'LLB, MBBS, CA, ICAI, B.Arch, B.Ed, etc.',           NOW())
ON CONFLICT (slug) DO NOTHING;

-- ── 5. Backfill provenance on existing verified rows ─────────────────────────
-- The 3 existing VERIFIED eligibility rows were manually entered from the
-- IOCL official notification. Mark them accordingly.
-- derivation = NORMALIZED because the structured fields were interpreted from text.

UPDATE eligibilities
SET
  source_type = 'OFFICIAL_NOTIFICATION',
  derivation  = 'NORMALIZED'
WHERE status = 'VERIFIED'
  AND source_type IS NULL;

-- ── 6. Backfill normalized projections on existing 3 verified rows ───────────
-- Populate the flat columns from what we know about the IOCL posts.
-- qualificationExpr will be populated in the test-set enrichment step (post-migration).

UPDATE eligibilities e
SET
  education_level      = 'GRADUATE',
  disciplines          = ARRAY['ECE','Instrumentation Engineering','EEE','CSE',
                                'Mechanical Engineering','Chemical Engineering',
                                'Metallurgical Engineering','Safety Engineering',
                                'Aeronautical Engineering','Aerospace Engineering',
                                'Civil Engineering'],
  qualification_status = 'MINIMUM',
  min_marks_pct        = 70.0,
  min_cgpa             = 7.5,
  passing_year_min     = 2022,
  passing_year_max     = 2026
FROM posts p
WHERE e.post_id = p.id AND p.name = 'Graduate Apprentice';

UPDATE eligibilities e
SET
  education_level      = 'DIPLOMA',
  disciplines          = ARRAY['ECE','Instrumentation Engineering','EEE','CSE',
                                'Mechanical Engineering','Chemical Engineering',
                                'Metallurgical Engineering','Safety Engineering'],
  qualification_status = 'MINIMUM',
  min_marks_pct        = 70.0,
  min_cgpa             = 7.5,
  passing_year_min     = 2022,
  passing_year_max     = 2026
FROM posts p
WHERE e.post_id = p.id AND p.name = 'Technician (Diploma) Apprentice';

UPDATE eligibilities e
SET
  education_level      = 'ITI',
  disciplines          = ARRAY['Fitter','Welder','Turner','Machinist','Mechanic-Diesel',
                                'Electronic-Mechanic','Electrician','COPA',
                                'Draughtsman Engineering (Mechanical)','Grinder'],
  qualification_status = 'MINIMUM',
  passing_year_min     = 2022,
  passing_year_max     = 2026
FROM posts p
WHERE e.post_id = p.id AND p.name = 'Trade Apprentice (ITI)';

-- Backfill rule_type on existing post_age_rules rows (3 rows, all NO_UPPER_LIMIT).
UPDATE post_age_rules
SET rule_type = 'NO_UPPER_LIMIT'
WHERE rule_type IS NULL
  AND max_age IS NULL
  AND relaxation_years IS NULL
  AND note ILIKE '%no upper age limit%';

-- ── End of ELIG-001 ───────────────────────────────────────────────────────────
