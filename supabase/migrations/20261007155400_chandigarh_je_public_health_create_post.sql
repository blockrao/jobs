-- Create missing posts row for Junior Engineer (Public Health) in
-- Engineering Department UT Chandigarh JE Recruitment 2026 (recruitment 830).
-- post_names on posting 422 = ['Junior Engineer (Civil)', 'Junior Engineer (Public Health)']
-- but only a Civil post row existed (id=224). The hub page card for Public Health
-- showed "Detailed page coming soon" with no link.
--
-- Source: Vacancy Circular, Engineering Department, UT Chandigarh
-- Pay: Level-6 ₹35,400–1,12,400 (7th CPC); both posts on deputation; 5 vacancies each.
-- Deadline: 08.10.2026

-- 1. Create the Public Health post row
INSERT INTO public.posts (recruitment_id, position_id, name, slug, salary_min, salary_max, vacancy_total)
SELECT
  830,
  6,   -- position 'Other' (same as Civil post)
  'Junior Engineer (Public Health)',
  'junior-engineer-public-health',
  35400,
  112400,
  5
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts
  WHERE recruitment_id = 830 AND slug = 'junior-engineer-public-health'
);

-- 2. Back-fill salary and vacancy on the existing Civil post (was NULL)
UPDATE public.posts
SET
  salary_min    = 35400,
  salary_max    = 112400,
  vacancy_total = 5
WHERE recruitment_id = 830
  AND slug = 'junior-engineer-civil'
  AND (salary_min IS NULL OR vacancy_total IS NULL);

-- 3. Enrich the parent posting with structured fields
UPDATE public.postings
SET
  employment_type    = 'DEPUTATION',
  salary_min         = 35400,
  salary_max         = 112400,
  valid_through      = '2026-10-08',
  enrichment_source  = 'official_notification',
  enriched_at        = NOW(),
  enrichment_notes   = 'Deputation, Level-6 ₹35,400–1,12,400 §Pay Scale; 5+5 vacancies §Circular; deadline 08.10.2026 §Circular; no apply URL (offline/proper channel only)'
WHERE id = 422
  AND enrichment_source IS DISTINCT FROM 'official_notification';
