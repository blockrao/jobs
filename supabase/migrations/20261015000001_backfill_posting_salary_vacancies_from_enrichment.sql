-- Migration: Backfill posting salary and vacancy data from enrichment
-- Context: Decomposed posts have enrichment records, but the posting rows lack this data.
-- This migration populates posting.salary_min, salary_max, and total_vacancies from
-- post_enrichments to ensure buildJobPostingSchema receives complete data.

UPDATE postings p
SET
  salary_min = COALESCE(p.salary_min, e."salaryMin"),
  salary_max = COALESCE(p.salary_max, e."salaryMax"),
  total_vacancies = COALESCE(p.total_vacancies, e."vacanciesTotal")
FROM posts POST
LEFT JOIN post_enrichments e ON e."post_id" = POST.id
WHERE p.inferred_post_id = POST.id
  AND e.id IS NOT NULL
  AND (p.salary_min IS NULL OR p.salary_max IS NULL OR p.total_vacancies IS NULL);
