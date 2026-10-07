-- ELIG-001b: New columns, reference data, and backfill
-- Requires ELIG-001a to be committed first (new enum values must be in a prior transaction).
-- Applied 2026-10-07.

-- ── eligibilities new columns ────────────────────────────────────────────────
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS education_level qualification_level;

ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS disciplines text[];

ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS qualification_status text
    CHECK (qualification_status IN ('MINIMUM', 'PREFERRED'));

ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS min_marks_pct numeric(5,2)
    CHECK (min_marks_pct >= 0 AND min_marks_pct <= 100);
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS min_cgpa numeric(4,2)
    CHECK (min_cgpa >= 0 AND min_cgpa <= 10);

ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS passing_year_min smallint;
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS passing_year_max smallint;

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

-- ── post_age_rules new columns ───────────────────────────────────────────────
ALTER TABLE post_age_rules
  ADD COLUMN IF NOT EXISTS rule_type text
    CHECK (rule_type IN ('ARITHMETIC', 'GOVT_ORDER', 'NO_UPPER_LIMIT', 'ABSOLUTE_CEILING'));
ALTER TABLE post_age_rules
  ADD COLUMN IF NOT EXISTS condition_text text;

-- ── qualifications reference rows ────────────────────────────────────────────
INSERT INTO qualifications (name, slug, level, description, created_at)
VALUES
  ('Below 10th',         'below-10th',   'BELOW_10TH',  'Below secondary education',                          NOW()),
  ('ITI / Vocational',   'iti',          'ITI',          'Industrial Training Institute certificate or NTC/NAC', NOW()),
  ('Diploma',            'diploma',      'DIPLOMA',      'Polytechnic diploma or equivalent (3-year)',          NOW()),
  ('Professional Degree','professional', 'PROFESSIONAL', 'LLB, MBBS, CA, ICAI, B.Arch, B.Ed, etc.',           NOW())
ON CONFLICT (slug) DO NOTHING;

-- ── provenance backfill on existing VERIFIED rows ────────────────────────────
-- source_ref and source_locator left NULL; to be populated during test-set enrichment.
UPDATE eligibilities
SET
  source_type = 'OFFICIAL_NOTIFICATION',
  derivation  = 'NORMALIZED'
WHERE status = 'VERIFIED'
  AND source_type IS NULL;

-- ── normalized projection backfill on 3 IOCL posts ───────────────────────────
-- Note: education_level uses the DB enum (BACHELOR/DIPLOMA/ITI).
-- qualificationExpr.education uses natural-language strings ("GRADUATE" → BACHELOR,
-- "12TH" → SENIOR_SECONDARY, "10TH" → SECONDARY). Reconciled in test-set enrichment step.
UPDATE eligibilities e
SET
  education_level      = 'BACHELOR',
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

-- ── rule_type backfill on post_age_rules ─────────────────────────────────────
UPDATE post_age_rules
SET rule_type = 'NO_UPPER_LIMIT'
WHERE rule_type IS NULL
  AND max_age IS NULL
  AND relaxation_years IS NULL
  AND note ILIKE '%no upper age limit%';

-- ── End of ELIG-001b ──────────────────────────────────────────────────────────
