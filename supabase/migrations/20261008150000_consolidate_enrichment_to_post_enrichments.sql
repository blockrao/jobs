-- Consolidate all enrichment data from postings into post_enrichments
-- Single source of truth: post_enrichments table only

INSERT INTO public.post_enrichments (
  post_id,
  salary_min,
  salary_max,
  salary_note,
  age_note,
  education,
  experience,
  created_at,
  updated_at
)
SELECT
  pt.inferred_post_id as post_id,
  pt.salary_min,
  pt.salary_max,
  CASE 
    WHEN pt.salary_min IS NOT NULL OR pt.salary_max IS NOT NULL 
    THEN 'Rs. ' || COALESCE(pt.salary_min::text, '') || 
         CASE WHEN pt.salary_min IS NOT NULL AND pt.salary_max IS NOT NULL THEN ' - ' ELSE '' END ||
         COALESCE(pt.salary_max::text, '')
    ELSE NULL 
  END as salary_note,
  pt.age_relaxation_notes as age_note,
  pt.requirements as education,
  pt.responsibilities as experience,
  NOW() as created_at,
  NOW() as updated_at
FROM public.postings pt
WHERE pt.inferred_post_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.post_enrichments pe 
    WHERE pe.post_id = pt.inferred_post_id
  )
ON CONFLICT (post_id) DO NOTHING;
