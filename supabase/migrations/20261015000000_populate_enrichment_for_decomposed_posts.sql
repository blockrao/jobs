-- Migration: Populate post_enrichments for decomposed posts
-- Context: During post decomposition, new posts were created but without enrichment records.
-- This migration creates enrichment records from data available in linked postings.
--
-- Tracks enrichment from postings table columns:
--   - vacanciesTotal ← total_vacancies
--   - salaryMin, salaryMax ← salary_min, salary_max
--   - sourceVerificationStatus ← 'PENDING' (these are auto-generated from postings)

INSERT INTO post_enrichments (
  post_id,
  vacanciesTotal,
  salaryMin,
  salaryMax,
  sourceVerificationStatus,
  extractionConfidence,
  created_at,
  updated_at
)
SELECT
  p.id,
  MAX(posting.total_vacancies) FILTER (WHERE posting.total_vacancies IS NOT NULL) as vacanciesTotal,
  MAX(posting.salary_min) FILTER (WHERE posting.salary_min IS NOT NULL) as salaryMin,
  MAX(posting.salary_max) FILTER (WHERE posting.salary_max IS NOT NULL) as salaryMax,
  'PENDING' as sourceVerificationStatus,
  CASE
    WHEN MAX(posting.salary_min) IS NOT NULL AND MAX(posting.salary_max) IS NOT NULL THEN 85
    WHEN MAX(posting.total_vacancies) IS NOT NULL THEN 70
    ELSE 60
  END as extractionConfidence,
  NOW(),
  NOW()
FROM posts p
LEFT JOIN postings posting ON posting.inferred_post_id = p.id
WHERE p.id NOT IN (SELECT post_id FROM post_enrichments WHERE post_id IS NOT NULL)
  AND posting.inferred_post_id IS NOT NULL
GROUP BY p.id
ON CONFLICT (post_id) DO NOTHING;
