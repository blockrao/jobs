-- Full post-level enrichment: STPI Notice 2(4)/I/STPI-HQ/2026-27
-- Source: https://stpi.in/sites/default/files/career-documents/notice_26.pdf
-- Recruitment ID: 1453  |  Post IDs: 1247–1251
-- Rollback: supabase/rollback/enrich_posts_stpi_full.down.sql
--
-- Inserts:
--   eligibilities       — qualification, experience, age per post (VERIFIED)
--   post_age_rules      — DR and Absorption age limits per post
--   selection_processes — shortlisting → written test → interview (recruitment-level)
--   recruitment_fees    — ₹500 General/OBC; NIL SC/ST/PwBD/Women/Ex-SM
--
-- All INSERTs are guarded with WHERE NOT EXISTS to be safe to re-run.

-- ── 1. ELIGIBILITIES ──────────────────────────────────────────────────────────

-- 1247 Administrative Officer (A-V) — Post A-5
-- DR: Graduate any discipline + 6 yrs exp in personnel/admin/vigilance,
--     OR PG any discipline + 4 yrs exp in personnel/admin/vigilance.
-- Age (DR): up to 40 years as on closing date.
INSERT INTO public.eligibilities
  (post_id, qualification_text, experience_text, experience_years_min,
   age_max, age_as_on_date, education_category,
   status, source_type, source_ref,
   created_at, updated_at)
SELECT
  1247,
  'Graduate in any discipline from a recognised University with 6 years experience in personnel/administration/vigilance; OR Post Graduate in any discipline from a recognised University with 4 years experience in personnel/administration/vigilance.',
  'Minimum 6 years (Graduate) or 4 years (Post Graduate) experience in the field of personnel/administration/vigilance.',
  4,
  40,
  '2026-10-12'::date,
  'BACHELORS',
  'VERIFIED',
  'OFFICIAL_NOTIFICATION',
  'https://stpi.in/sites/default/files/career-documents/notice_26.pdf',
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.eligibilities WHERE post_id = 1247);

-- 1248 Member Technical Support Staff (ES-V) — Post ES-5
-- DR: 3-yr Diploma in Electronics/CS/IT/Telecom OR B.E/B.Tech in relevant discipline,
--     with 2 years experience in relevant field. OR DOEACC 'A' level certificate.
-- Age (DR): up to 36 years as on closing date.
INSERT INTO public.eligibilities
  (post_id, qualification_text, experience_text, experience_years_min,
   age_max, age_as_on_date, education_category,
   status, source_type, source_ref,
   created_at, updated_at)
SELECT
  1248,
  'Three years Diploma in Electronics/Computer Science/Information Technology/Telecommunication OR Bachelor in Electronics/Computer Science/Computer Application/IT OR possessing DOEACC ''A'' level certificate.',
  'Two years experience in relevant field.',
  2,
  36,
  '2026-10-12'::date,
  'ASSOCIATE',
  'VERIFIED',
  'OFFICIAL_NOTIFICATION',
  'https://stpi.in/sites/default/files/career-documents/notice_26.pdf',
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.eligibilities WHERE post_id = 1248);

-- 1249 Member Technical Support Staff (ES-IV) — Post ES-4
-- Same qualification as ES-V; same age limit.
INSERT INTO public.eligibilities
  (post_id, qualification_text, experience_text, experience_years_min,
   age_max, age_as_on_date, education_category,
   status, source_type, source_ref,
   created_at, updated_at)
SELECT
  1249,
  'Three years Diploma in Electronics/Computer Science/Information Technology/Telecommunication OR Bachelor in Electronics/Computer Science/Computer Application/IT OR possessing DOEACC ''A'' level certificate.',
  'Two years experience in relevant field.',
  2,
  36,
  '2026-10-12'::date,
  'ASSOCIATE',
  'VERIFIED',
  'OFFICIAL_NOTIFICATION',
  'https://stpi.in/sites/default/files/career-documents/notice_26.pdf',
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.eligibilities WHERE post_id = 1249);

-- 1250 Assistant (A-II) — Post A-2
-- DR: Graduate in any discipline from a recognised University.
-- Age (DR): up to 30 years as on closing date.
INSERT INTO public.eligibilities
  (post_id, qualification_text, experience_text, experience_years_min,
   age_max, age_as_on_date, education_category,
   status, source_type, source_ref,
   created_at, updated_at)
SELECT
  1250,
  'Graduate in any discipline from a recognised University.',
  NULL,
  NULL,
  30,
  '2026-10-12'::date,
  'BACHELORS',
  'VERIFIED',
  'OFFICIAL_NOTIFICATION',
  'https://stpi.in/sites/default/files/career-documents/notice_26.pdf',
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.eligibilities WHERE post_id = 1250);

-- 1251 Office Attendant (S-I) — Post S-1
-- DR: Matriculation (10th pass) from a recognised Board.
-- Age (DR): up to 25 years as on closing date.
INSERT INTO public.eligibilities
  (post_id, qualification_text, experience_text, experience_years_min,
   age_max, age_as_on_date, education_category,
   status, source_type, source_ref,
   created_at, updated_at)
SELECT
  1251,
  'Matriculation (10th pass) from a recognised Board.',
  NULL,
  NULL,
  25,
  '2026-10-12'::date,
  'HIGH_SCHOOL',
  'VERIFIED',
  'OFFICIAL_NOTIFICATION',
  'https://stpi.in/sites/default/files/career-documents/notice_26.pdf',
  NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.eligibilities WHERE post_id = 1251);

-- ── 2. POST AGE RULES ─────────────────────────────────────────────────────────
-- rule_type allowed: ARITHMETIC | GOVT_ORDER | NO_UPPER_LIMIT | ABSOLUTE_CEILING
-- category is free-text varchar; using GENERAL / SC_ST / OBC / ABSORPTION.
-- DR rows: ARITHMETIC (base max_age; relaxation_years carries the add-on).
-- Absorption ceiling: ABSOLUTE_CEILING (56 years, all categories).

-- 1247 Admin Officer A-5 (DR age: 40)
INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1247, 'GENERAL',    40, NULL, 'Direct Recruitment. Upper age limit 40 years as on closing date.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1247 AND category = 'GENERAL');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1247, 'SC_ST',      40, 5,    'Direct Recruitment. +5 years relaxation for SC/ST candidates.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1247 AND category = 'SC_ST');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1247, 'OBC',        40, 3,    'Direct Recruitment. +3 years relaxation for OBC candidates.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1247 AND category = 'OBC');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1247, 'ABSORPTION', 56, NULL, 'Absorption basis. Officers of Central/State Govt./PSUs/Autonomous Bodies. Max age 56 years.', 'ABSOLUTE_CEILING', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1247 AND category = 'ABSORPTION');

-- 1248 MTSS ES-5 (DR age: 36)
INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1248, 'GENERAL',    36, NULL, 'Direct Recruitment. Upper age limit 36 years as on closing date.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1248 AND category = 'GENERAL');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1248, 'SC_ST',      36, 5,    'Direct Recruitment. +5 years relaxation for SC/ST candidates.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1248 AND category = 'SC_ST');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1248, 'OBC',        36, 3,    'Direct Recruitment. +3 years relaxation for OBC candidates.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1248 AND category = 'OBC');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1248, 'ABSORPTION', 56, NULL, 'Absorption basis. Officers of Central/State Govt./PSUs/Autonomous Bodies. Max age 56 years.', 'ABSOLUTE_CEILING', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1248 AND category = 'ABSORPTION');

-- 1249 MTSS ES-4 (DR age: 36)
INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1249, 'GENERAL',    36, NULL, 'Direct Recruitment. Upper age limit 36 years as on closing date.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1249 AND category = 'GENERAL');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1249, 'SC_ST',      36, 5,    'Direct Recruitment. +5 years relaxation for SC/ST candidates.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1249 AND category = 'SC_ST');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1249, 'OBC',        36, 3,    'Direct Recruitment. +3 years relaxation for OBC candidates.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1249 AND category = 'OBC');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1249, 'ABSORPTION', 56, NULL, 'Absorption basis. Officers of Central/State Govt./PSUs/Autonomous Bodies. Max age 56 years.', 'ABSOLUTE_CEILING', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1249 AND category = 'ABSORPTION');

-- 1250 Assistant A-2 (DR age: 30)
INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1250, 'GENERAL',    30, NULL, 'Direct Recruitment. Upper age limit 30 years as on closing date.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1250 AND category = 'GENERAL');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1250, 'SC_ST',      30, 5,    'Direct Recruitment. +5 years relaxation for SC/ST candidates.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1250 AND category = 'SC_ST');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1250, 'OBC',        30, 3,    'Direct Recruitment. +3 years relaxation for OBC candidates.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1250 AND category = 'OBC');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1250, 'ABSORPTION', 56, NULL, 'Absorption basis. Officers of Central/State Govt./PSUs/Autonomous Bodies. Max age 56 years.', 'ABSOLUTE_CEILING', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1250 AND category = 'ABSORPTION');

-- 1251 Office Attendant S-1 (DR age: 25)
INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1251, 'GENERAL',    25, NULL, 'Direct Recruitment. Upper age limit 25 years as on closing date.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1251 AND category = 'GENERAL');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1251, 'SC_ST',      25, 5,    'Direct Recruitment. +5 years relaxation for SC/ST candidates.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1251 AND category = 'SC_ST');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1251, 'OBC',        25, 3,    'Direct Recruitment. +3 years relaxation for OBC candidates.', 'ARITHMETIC', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1251 AND category = 'OBC');

INSERT INTO public.post_age_rules (post_id, category, max_age, relaxation_years, note, rule_type, created_at)
SELECT 1251, 'ABSORPTION', 56, NULL, 'Absorption basis. Officers of Central/State Govt./PSUs/Autonomous Bodies. Max age 56 years.', 'ABSOLUTE_CEILING', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.post_age_rules WHERE post_id = 1251 AND category = 'ABSORPTION');

-- ── 3. SELECTION PROCESS (recruitment-level, applies to all posts) ────────────
INSERT INTO public.selection_processes (recruitment_id, process_type, stages, details, created_at)
SELECT
  1453,
  'HYBRID',
  '["Short-listing of applications", "Written Test", "Interview"]'::jsonb,
  '{"note": "Selection based on short-listing, written test and interview. Final merit list drawn from combined performance."}'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.selection_processes WHERE recruitment_id = 1453);

-- ── 4. APPLICATION FEE (recruitment-level) ────────────────────────────────────
INSERT INTO public.recruitment_fees (recruitment_id, category, amount, note, created_at)
SELECT 1453, 'General/OBC', 500, 'Payment via SBI Challan / Net Banking / Debit/Credit Card.', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.recruitment_fees WHERE recruitment_id = 1453 AND category = 'General/OBC');

INSERT INTO public.recruitment_fees (recruitment_id, category, amount, note, created_at)
SELECT 1453, 'SC/ST/PwBD/Women/Ex-SM', NULL, 'Fee exempted for SC, ST, PwBD, Women, and Ex-Servicemen candidates.', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.recruitment_fees WHERE recruitment_id = 1453 AND category = 'SC/ST/PwBD/Women/Ex-SM');

-- ── 5. VERIFY ─────────────────────────────────────────────────────────────────
SELECT 'eligibilities' as tbl, post_id, qualification_text, age_max, status
FROM public.eligibilities WHERE post_id IN (1247,1248,1249,1250,1251)
UNION ALL
SELECT 'age_rules', post_id, category, max_age, rule_type
FROM public.post_age_rules WHERE post_id IN (1247,1248,1249,1250,1251)
ORDER BY tbl, post_id;
