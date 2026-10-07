-- Migration: Decompose UPSC Advt No. 12/2026 (posting 166) into individual posts
-- Source: https://www.upsc.gov.in/sites/default/files/AdvtNo-12-2026-Engl-250926_0.pdf
-- 4 posts: JTO Sugar Tech, Asst Legislative Counsel, Law Officer, Specialist Cardiology
-- 13 total vacancies, closes 2026-10-16
-- Author: enrichment migration 2026-10-07

BEGIN;

-- Step 1: Create the recruitment record for UPSC Advt No. 12/2026
INSERT INTO public.recruitments (
  organization_id,
  year,
  name,
  slug,
  status,
  notification_date,
  application_start_date,
  application_end_date,
  total_vacancies,
  description,
  notification_url,
  official_notification_url,
  official_notification_number,
  advertisement_number,
  employment_type,
  verification_status,
  last_verified_at
)
SELECT
  166,   -- UPSC (union-public-service-commission)
  2026,
  'UPSC Advt No. 12/2026',
  'upsc-advt-12-2026-92c97d',
  'ACTIVE',
  '2026-09-26 00:00:00+05:30',
  '2026-09-26 00:00:00+05:30',
  '2026-10-16 18:00:00+05:30',
  13,
  'UPSC Advt No. 12/2026 — recruitment for JTO (Sugar Technology), Assistant Legislative Counsel, Law Officer, and Specialist (Cardiology). Applications close 16 October 2026 at 1800 hrs.',
  'https://www.upsc.gov.in/sites/default/files/AdvtNo-12-2026-Engl-250926_0.pdf',
  'https://www.upsc.gov.in/sites/default/files/AdvtNo-12-2026-Engl-250926_0.pdf',
  '12/2026',
  'Advt. No. 12/2026',
  'FULL_TIME',
  'VERIFIED',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.recruitments WHERE slug = 'upsc-advt-12-2026-92c97d'
);

-- Step 2: Insert the 4 posts
-- Post A: Junior Technical Officer (Sugar Technology)
-- Vacancy No. 26091201626 | 1 post | OBC-01 | Level-10 | Age ≤38 (OBC)
INSERT INTO public.posts (
  recruitment_id, position_id, name, slug,
  vacancy_total, pay_level, salary_min, salary_max,
  source_post_code
)
SELECT
  r.id,
  6,   -- position_id 6 = "Other" (generic fallback; UPSC-specific roles not in registry)
  'Junior Technical Officer (Sugar Technology)',
  'junior-technical-officer-sugar-technology',
  1,
  '{"level":10,"minPay":56100,"maxPay":177500,"scheme":"7CPC","levelLabel":"Level 10"}'::jsonb,
  56100,
  177500,
  '26091201626'
FROM public.recruitments r
WHERE r.slug = 'upsc-advt-12-2026-92c97d'
  AND NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id AND p.slug = 'junior-technical-officer-sugar-technology'
  );

-- Post B: Assistant Legislative Counsel
-- Vacancy No. 26091201126 | 8 posts | UR-04 EWS-01 OBC-02 SC-01 | Level-11
-- Age: 40 (UR), 43 (OBC), 45 (SC)
INSERT INTO public.posts (
  recruitment_id, position_id, name, slug,
  vacancy_total, pay_level, salary_min, salary_max,
  source_post_code
)
SELECT
  r.id,
  6,
  'Assistant Legislative Counsel',
  'assistant-legislative-counsel',
  8,
  '{"level":11,"minPay":67700,"maxPay":208700,"scheme":"7CPC","levelLabel":"Level 11"}'::jsonb,
  67700,
  208700,
  '26091201126'
FROM public.recruitments r
WHERE r.slug = 'upsc-advt-12-2026-92c97d'
  AND NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id AND p.slug = 'assistant-legislative-counsel'
  );

-- Post C: Law Officer
-- Vacancy No. 26091201026 | 3 posts | UR-02 OBC-01 | Level-07
-- Age: 30 (UR), 33 (OBC)
INSERT INTO public.posts (
  recruitment_id, position_id, name, slug,
  vacancy_total, pay_level, salary_min, salary_max,
  source_post_code
)
SELECT
  r.id,
  6,
  'Law Officer',
  'law-officer',
  3,
  '{"level":7,"minPay":44900,"maxPay":142400,"scheme":"7CPC","levelLabel":"Level 7"}'::jsonb,
  44900,
  142400,
  '26091201026'
FROM public.recruitments r
WHERE r.slug = 'upsc-advt-12-2026-92c97d'
  AND NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id AND p.slug = 'law-officer'
  );

-- Post D: Specialist Grade III Assistant Professor (Cardiology)
-- Vacancy No. 26091201526 | 1 post | OBC-01 | Level-11 + NPA | Age ≤48 (OBC)
INSERT INTO public.posts (
  recruitment_id, position_id, name, slug,
  vacancy_total, pay_level, salary_min, salary_max,
  source_post_code
)
SELECT
  r.id,
  6,
  'Specialist Grade III Assistant Professor (Cardiology)',
  'specialist-grade-iii-assistant-professor-cardiology',
  1,
  '{"level":11,"minPay":67700,"maxPay":208700,"scheme":"7CPC","levelLabel":"Level 11","note":"+ NPA (Non-Practising Allowance)"}'::jsonb,
  67700,
  208700,
  '26091201526'
FROM public.recruitments r
WHERE r.slug = 'upsc-advt-12-2026-92c97d'
  AND NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id AND p.slug = 'specialist-grade-iii-assistant-professor-cardiology'
  );

COMMIT;
