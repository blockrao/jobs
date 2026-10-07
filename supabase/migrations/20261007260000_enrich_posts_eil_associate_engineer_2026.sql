-- Migration: Decompose EIL Associate Engineer 2026 (posting 165) into individual posts
-- Source: https://recruitment.eil.co.in/hrdnew/others/77.pdf
-- 2 posts: Associate Engineer Gr.I Inspection (Mechanical/Metallurgical) — 16 vacancies
--          Associate Engineer Gr.I Inspection (Electrical) — 4 vacancies
-- 20 total vacancies. Fixed Term Basis. Age max 32. Closes 2026-10-12.
-- Organization: Engineers India Limited (Navratna PSU), org_id 1265
-- Author: enrichment migration 2026-10-07

BEGIN;

-- Step 1: Create the recruitment record for EIL Associate Engineer 2026
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
  employment_type,
  verification_status,
  last_verified_at
)
SELECT
  1265,  -- Engineers India (org id; correct entity for EIL/Engineers India Limited)
  2026,
  'EIL Associate Engineer Recruitment 2026',
  'eil-associate-engineer-2026-bb35bb',
  'ACTIVE',
  '2026-09-26 00:00:00+05:30',
  '2026-09-26 00:00:00+05:30',
  '2026-10-12 18:00:00+05:30',
  20,
  'Engineers India Limited (EIL), a Navratna PSU, invites experienced engineers for engagement on Fixed Term Basis in the SCM-Inspection Department. Posts: Associate Engineer Grade I in Mechanical/Metallurgical and Electrical disciplines.',
  'https://recruitment.eil.co.in/hrdnew/others/77.pdf',
  'https://recruitment.eil.co.in/hrdnew/others/77.pdf',
  'TEMPORARY',
  'VERIFIED',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.recruitments WHERE slug = 'eil-associate-engineer-2026-bb35bb'
);

-- Step 2: Insert the 2 posts
-- Post A: Associate Engineer Grade I (Inspection – Mechanical/Metallurgical)
-- 16 vacancies | Age max 32 | Fixed Term | Salary ₹57,600–₹64,000
INSERT INTO public.posts (
  recruitment_id, position_id, name, slug,
  vacancy_total, salary_min, salary_max,
  source_post_code
)
SELECT
  r.id,
  6,  -- position_id 6 = "Other" (generic fallback)
  'Associate Engineer Grade I (Inspection – Mechanical/Metallurgical)',
  'associate-engineer-grade-i-inspection-mechanical-metallurgical',
  16,
  57600,
  64000,
  'SCM-INSP-MECH'
FROM public.recruitments r
WHERE r.slug = 'eil-associate-engineer-2026-bb35bb'
  AND NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id AND p.slug = 'associate-engineer-grade-i-inspection-mechanical-metallurgical'
  );

-- Post B: Associate Engineer Grade I (Inspection – Electrical)
-- 4 vacancies | Age max 32 | Fixed Term | Salary ₹57,600–₹64,000
INSERT INTO public.posts (
  recruitment_id, position_id, name, slug,
  vacancy_total, salary_min, salary_max,
  source_post_code
)
SELECT
  r.id,
  6,
  'Associate Engineer Grade I (Inspection – Electrical)',
  'associate-engineer-grade-i-inspection-electrical',
  4,
  57600,
  64000,
  'SCM-INSP-ELEC'
FROM public.recruitments r
WHERE r.slug = 'eil-associate-engineer-2026-bb35bb'
  AND NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.recruitment_id = r.id AND p.slug = 'associate-engineer-grade-i-inspection-electrical'
  );

COMMIT;
