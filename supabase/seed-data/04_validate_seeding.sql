-- Phase 4: Validation & Data Quality Checks
-- Verify all seeded data is correct and complete

-- 1. Salary Data Validation
SELECT
  'SALARY DATA' as check_name,
  COUNT(*) as records,
  COUNT(CASE WHEN salary_note IS NOT NULL THEN 1 END) as with_note,
  COUNT(CASE WHEN salary_breakdown IS NOT NULL THEN 1 END) as with_breakdown,
  COUNT(CASE WHEN salary_note IS NOT NULL AND salary_breakdown IS NOT NULL THEN 1 END) as complete
FROM recruitments
WHERE salary_note IS NOT NULL OR salary_breakdown IS NOT NULL;

-- 2. Posting Locations Validation
SELECT
  'POSTING LOCATIONS' as check_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT post_id) as unique_posts,
  SUM(count) as total_vacancies_mapped,
  COUNT(CASE WHEN city IS NULL OR state IS NULL THEN 1 END) as invalid_records
FROM posting_locations;

-- 3. Recruitment Cutoffs Validation
SELECT
  'RECRUITMENT CUTOFFS' as check_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT recruitment_id) as unique_recruitments,
  COUNT(DISTINCT year) as years_covered,
  COUNT(DISTINCT category) as categories,
  MIN(cutoff_marks) as min_marks,
  MAX(cutoff_marks) as max_marks,
  COUNT(CASE WHEN cutoff_marks <= 0 THEN 1 END) as invalid_records
FROM recruitment_cutoffs;

-- 4. Data Quality Checks
SELECT 'Data Quality Checks' as category;

-- 4a. Salary note length validation
SELECT
  'Salary notes > 500 chars' as issue,
  COUNT(*) as count
FROM recruitments
WHERE salary_note IS NOT NULL AND LENGTH(salary_note) > 500;

-- 4b. Invalid JSON validation
SELECT
  'Invalid salary_breakdown JSON' as issue,
  COUNT(*) as count
FROM recruitments
WHERE salary_breakdown IS NOT NULL
  AND NOT (salary_breakdown::text ~ '^\{.*\}$');

-- 4c. Orphaned locations (post_id doesn't exist)
SELECT
  'Orphaned posting_locations' as issue,
  COUNT(*) as count
FROM posting_locations pl
WHERE NOT EXISTS (SELECT 1 FROM posts p WHERE p.id = pl.post_id);

-- 4d. Orphaned cutoffs (recruitment_id doesn't exist)
SELECT
  'Orphaned recruitment_cutoffs' as issue,
  COUNT(*) as count
FROM recruitment_cutoffs rc
WHERE NOT EXISTS (SELECT 1 FROM recruitments r WHERE r.id = rc.recruitment_id);

-- 5. Completeness Metrics
SELECT
  'COMPLETENESS METRICS' as metric,
  ROUND(
    100.0 * (
      (SELECT COUNT(CASE WHEN salary_note IS NOT NULL THEN 1 END) FROM recruitments) +
      (SELECT COUNT(DISTINCT post_id) FROM posting_locations) +
      (SELECT COUNT(DISTINCT recruitment_id) FROM recruitment_cutoffs)
    ) /
    (SELECT COUNT(*) FROM recruitments) * 3,
    2
  ) as completeness_percent;

-- 6. Sample data verification
SELECT
  'SAMPLE SALARY DATA' as sample_type;

SELECT
  r.id,
  r.title,
  r.salary_note,
  (r.salary_breakdown->>'basicPay')::numeric as basic_pay,
  (r.salary_breakdown->>'maxPay')::numeric as max_pay
FROM recruitments r
WHERE r.salary_breakdown IS NOT NULL
LIMIT 5;

SELECT
  'SAMPLE POSTING LOCATIONS' as sample_type;

SELECT
  p.id,
  p.title,
  STRING_AGG(DISTINCT pl.city || ' (' || pl.state || ')', ', ') as locations,
  SUM(pl.count) as total_vacancies
FROM posts p
JOIN posting_locations pl ON p.id = pl.post_id
GROUP BY p.id, p.title
LIMIT 5;

SELECT
  'SAMPLE CUTOFF MARKS' as sample_type;

SELECT
  r.title,
  rc.year,
  MAX(CASE WHEN rc.category = 'UR' THEN rc.cutoff_marks END) as ur_cutoff,
  MAX(CASE WHEN rc.category = 'OBC' THEN rc.cutoff_marks END) as obc_cutoff,
  MAX(CASE WHEN rc.category = 'SC' THEN rc.cutoff_marks END) as sc_cutoff,
  MAX(CASE WHEN rc.category = 'ST' THEN rc.cutoff_marks END) as st_cutoff,
  MAX(CASE WHEN rc.category = 'EWS' THEN rc.cutoff_marks END) as ews_cutoff
FROM recruitment_cutoffs rc
JOIN recruitments r ON rc.recruitment_id = r.id
GROUP BY r.id, r.title, rc.year
LIMIT 5;

-- 7. Final Summary
SELECT
  'FINAL SUMMARY' as summary;

WITH stats AS (
  SELECT
    'Salary Data' as type,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM recruitments), 1) as coverage_percent
  FROM recruitments
  WHERE salary_note IS NOT NULL OR salary_breakdown IS NOT NULL

  UNION ALL

  SELECT
    'Posting Locations' as type,
    COUNT(DISTINCT post_id) as count,
    ROUND(100.0 * COUNT(DISTINCT post_id) / (SELECT COUNT(*) FROM posts), 1) as coverage_percent
  FROM posting_locations

  UNION ALL

  SELECT
    'Cutoff Records' as type,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(DISTINCT recruitment_id) / (SELECT COUNT(*) FROM recruitments), 1) as coverage_percent
  FROM recruitment_cutoffs
)
SELECT
  type,
  count,
  coverage_percent || '%' as coverage
FROM stats
ORDER BY type;
