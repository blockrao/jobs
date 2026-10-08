-- Consolidate all enrichment data from postings into post_enrichments
-- Single source of truth: post_enrichments table only
-- FIXED: Using correct camelCase column names matching post_enrichments schema
-- FIXED: Using valid_through as applicationClosingDate (NOT NULL requirement)
-- NOTE: education/experience are text in source, jsonb in dest - skip for now, populate separately

INSERT INTO public.post_enrichments (
  post_id,
  "salaryMin",
  "salaryMax",
  "salaryNote",
  "ageNote",
  "vacanciesTotal",
  "applicationClosingDate",
  "examDate",
  created_at,
  updated_at
)
SELECT
  pt.inferred_post_id as post_id,
  pt.salary_min as "salaryMin",
  pt.salary_max as "salaryMax",
  CASE
    WHEN pt.salary_min IS NOT NULL OR pt.salary_max IS NOT NULL
    THEN 'Rs. ' || COALESCE(pt.salary_min::text, '') ||
         CASE WHEN pt.salary_min IS NOT NULL AND pt.salary_max IS NOT NULL THEN ' - ' ELSE '' END ||
         COALESCE(pt.salary_max::text, '')
    ELSE NULL
  END as "salaryNote",
  pt.age_relaxation_notes as "ageNote",
  pt.total_vacancies as "vacanciesTotal",
  COALESCE(pt.valid_through, NOW()) as "applicationClosingDate",
  pt.exam_date as "examDate",
  NOW() as created_at,
  NOW() as updated_at
FROM public.postings pt
WHERE pt.inferred_post_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.post_enrichments pe
    WHERE pe.post_id = pt.inferred_post_id
  )
ON CONFLICT (post_id) DO NOTHING;
