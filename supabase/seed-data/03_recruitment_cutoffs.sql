-- Phase 4: Recruitment Cutoff Marks Seeding
-- Populates recruitment_cutoffs table with historical cutoff data
-- Covers major exams with 3-year history and category-wise data

-- Helper function to determine base cutoff by exam type
CREATE OR REPLACE FUNCTION get_base_cutoff(title TEXT)
RETURNS INTEGER AS $$
BEGIN
  IF title ILIKE '%UPSC%IAS%' THEN RETURN 333;
  ELSIF title ILIKE '%UPSC%IPS%' THEN RETURN 333;
  ELSIF title ILIKE '%UPSC%Civil%' THEN RETURN 333;
  ELSIF title ILIKE '%SSC%CGL%' THEN RETURN 450;
  ELSIF title ILIKE '%SSC%CHSL%' THEN RETURN 400;
  ELSIF title ILIKE '%SSC%MTS%' THEN RETURN 350;
  ELSIF title ILIKE '%IBPS%PO%' THEN RETURN 45;
  ELSIF title ILIKE '%IBPS%Clerk%' THEN RETURN 40;
  ELSIF title ILIKE '%RRB%' THEN RETURN 85;
  ELSIF title ILIKE '%Railway%' THEN RETURN 85;
  ELSIF title ILIKE '%GATE%' THEN RETURN 350;
  ELSE RETURN 40; -- Default percentage-based cutoff
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function to apply category-wise cutoff reduction
CREATE OR REPLACE FUNCTION apply_category_cutoff(base_cutoff INTEGER, category TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE category
    WHEN 'UR' THEN RETURN base_cutoff;
    WHEN 'OBC' THEN RETURN ROUND(base_cutoff * 0.98);
    WHEN 'SC' THEN RETURN ROUND(base_cutoff * 0.95);
    WHEN 'ST' THEN RETURN ROUND(base_cutoff * 0.95);
    WHEN 'EWS' THEN RETURN ROUND(base_cutoff * 0.99);
    ELSE RETURN base_cutoff;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Insert cutoff data for top 100 recruitments (3 years × 5 categories)
INSERT INTO recruitment_cutoffs (recruitment_id, year, category, cutoff_marks)
SELECT
  r.id,
  year_data.year,
  category_data.category,
  GREATEST(
    1,
    ROUND(
      apply_category_cutoff(get_base_cutoff(r.title), category_data.category) *
      (0.95 + (EXTRACT(YEAR FROM NOW()) - year_data.year) * 0.02 + (RANDOM() * 0.05))
    )::integer
  ) as cutoff_marks
FROM (
  SELECT id, title
  FROM recruitments
  WHERE id NOT IN (SELECT DISTINCT recruitment_id FROM recruitment_cutoffs)
  ORDER BY created_at DESC
  LIMIT 100
) r
CROSS JOIN (
  SELECT year FROM GENERATE_SERIES(
    EXTRACT(YEAR FROM NOW())::int - 2,
    EXTRACT(YEAR FROM NOW())::int,
    1
  ) AS year
) year_data
CROSS JOIN (
  VALUES ('UR'), ('OBC'), ('SC'), ('ST'), ('EWS')
) category_data(category)
ON CONFLICT (recruitment_id, year, category)
DO NOTHING;

-- Verify seeding
SELECT
  COUNT(*) as total_cutoff_records,
  COUNT(DISTINCT recruitment_id) as recruitments_with_cutoffs,
  MIN(year) as earliest_year,
  MAX(year) as latest_year,
  COUNT(DISTINCT category) as unique_categories
FROM recruitment_cutoffs;

-- Show sample cutoff data by exam and category
SELECT
  r.title,
  rc.year,
  rc.category,
  rc.cutoff_marks
FROM recruitment_cutoffs rc
JOIN recruitments r ON rc.recruitment_id = r.id
WHERE r.title ILIKE '%UPSC%'
ORDER BY rc.year DESC, rc.category
LIMIT 20;

-- Show cutoff trends (year-over-year comparison)
SELECT
  r.title,
  rc.category,
  MAX(CASE WHEN rc.year = EXTRACT(YEAR FROM NOW())::int THEN rc.cutoff_marks END) as current_year,
  MAX(CASE WHEN rc.year = (EXTRACT(YEAR FROM NOW())::int - 1) THEN rc.cutoff_marks END) as prev_year,
  MAX(CASE WHEN rc.year = (EXTRACT(YEAR FROM NOW())::int - 2) THEN rc.cutoff_marks END) as two_years_ago
FROM recruitment_cutoffs rc
JOIN recruitments r ON rc.recruitment_id = r.id
WHERE r.id IN (
  SELECT recruitment_id FROM recruitment_cutoffs
  GROUP BY recruitment_id
  HAVING COUNT(DISTINCT year) >= 2
)
GROUP BY r.id, r.title, rc.category
LIMIT 15;

-- Cleanup: Drop helper functions (optional, can be kept for future use)
-- DROP FUNCTION IF EXISTS get_base_cutoff(TEXT);
-- DROP FUNCTION IF EXISTS apply_category_cutoff(INTEGER, TEXT);
-- DROP FUNCTION IF EXISTS get_recruitment_state(INTEGER);
