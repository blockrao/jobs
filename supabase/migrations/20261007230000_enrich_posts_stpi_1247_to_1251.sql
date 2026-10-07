-- Enrich posts table: STPI Notice 2(4)/I/STPI-HQ/2026-27 (posts 1247–1251)
-- Source: https://stpi.in/sites/default/files/career-documents/notice_26.pdf
--
-- These are Post rows (public.posts) — individual role entries decomposed from
-- recruitment/posting 1050. The posting row was enriched in batch 5
-- (20261007220000). This migration fills per-post structured fields.
--
-- Scope: fills NULL fields only (COALESCE). No non-NULL value is overwritten.
-- pay_level stored as JSONB: {level, scheme, levelLabel, minPay, maxPay}
-- Rollback: supabase/rollback/enrich_posts_stpi_1247_to_1251.down.sql

-- 1247 Administrative Officer (A-V)
--   Post Code: A-5 (Non-S&T)
--   Pay Matrix: Level 7, Rs.44,900–1,42,400
--   Age (DR): up to 40 years; (Absorption): up to 56 years
--   Vacancies: 2 (UR-01 Guwahati, OBC-01 Bengaluru) — already stored
UPDATE public.posts
SET
  source_post_code = COALESCE(source_post_code, 'A-5'),
  salary_min       = COALESCE(salary_min, 44900),
  salary_max       = COALESCE(salary_max, 142400),
  pay_level        = COALESCE(pay_level, '{"level":7,"scheme":"7CPC","levelLabel":"Level 7","minPay":44900,"maxPay":142400}'::jsonb),
  updated_at       = NOW()
WHERE id = 1247;

-- 1248 Member Technical Support Staff (ES-V)
--   Post Code: ES-5 (S&T)
--   Pay Matrix: Level 6, Rs.35,400–1,12,400
--   Age (DR): up to 36 years; (Absorption): up to 56 years
--   Vacancies: 1 (UR-01 Hyderabad) — already stored
UPDATE public.posts
SET
  source_post_code = COALESCE(source_post_code, 'ES-5'),
  salary_min       = COALESCE(salary_min, 35400),
  salary_max       = COALESCE(salary_max, 112400),
  pay_level        = COALESCE(pay_level, '{"level":6,"scheme":"7CPC","levelLabel":"Level 6","minPay":35400,"maxPay":112400}'::jsonb),
  updated_at       = NOW()
WHERE id = 1248;

-- 1249 Member Technical Support Staff (ES-IV)
--   Post Code: ES-4 (S&T)
--   Pay Matrix: Level 6, Rs.35,400–1,12,400
--   Age (DR): up to 36 years; (Absorption): up to 56 years
--   Vacancies: 3 (UR-01 Chennai, UR-01 Hyderabad, OBC-01 Bengaluru) — already stored
UPDATE public.posts
SET
  source_post_code = COALESCE(source_post_code, 'ES-4'),
  salary_min       = COALESCE(salary_min, 35400),
  salary_max       = COALESCE(salary_max, 112400),
  pay_level        = COALESCE(pay_level, '{"level":6,"scheme":"7CPC","levelLabel":"Level 6","minPay":35400,"maxPay":112400}'::jsonb),
  updated_at       = NOW()
WHERE id = 1249;

-- 1250 Assistant (A-II)
--   Post Code: A-2 (Non-S&T)
--   Pay Matrix: Level 6, Rs.35,400–1,12,400
--   Age (DR): up to 30 years; (Absorption): up to 56 years
--   Vacancies: 1 (UR-01 Bengaluru) — already stored
UPDATE public.posts
SET
  source_post_code = COALESCE(source_post_code, 'A-2'),
  salary_min       = COALESCE(salary_min, 35400),
  salary_max       = COALESCE(salary_max, 112400),
  pay_level        = COALESCE(pay_level, '{"level":6,"scheme":"7CPC","levelLabel":"Level 6","minPay":35400,"maxPay":112400}'::jsonb),
  updated_at       = NOW()
WHERE id = 1250;

-- 1251 Office Attendant (S-I)
--   Post Code: S-1 (Non-S&T)
--   Pay Matrix: Level 1, Rs.18,000–56,900
--   Age (DR): up to 25 years; (Absorption): up to 56 years
--   Vacancies: 3 (UR-01 New Delhi, UR-01 Guwahati, OBC-01 Noida) — already stored
UPDATE public.posts
SET
  source_post_code = COALESCE(source_post_code, 'S-1'),
  salary_min       = COALESCE(salary_min, 18000),
  salary_max       = COALESCE(salary_max, 56900),
  pay_level        = COALESCE(pay_level, '{"level":1,"scheme":"7CPC","levelLabel":"Level 1","minPay":18000,"maxPay":56900}'::jsonb),
  updated_at       = NOW()
WHERE id = 1251;

-- Verify
SELECT id, name, source_post_code, salary_min, salary_max,
       pay_level->>'levelLabel' AS pay_level_label
FROM public.posts
WHERE id IN (1247, 1248, 1249, 1250, 1251)
ORDER BY id;
