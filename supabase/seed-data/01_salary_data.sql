-- Phase 4: Salary Data Seeding
-- Populates salary_note and salary_breakdown for recruitments
-- Based on extraction from notification_text fields

-- Update recruitments with salary data extracted from notifications
-- This is a template approach - actual extraction happens via the TypeScript script
-- but here we show the pattern for manual verification

-- Example: UPSC Civil Services Recruitment
UPDATE recruitments
SET
  salary_note = 'Level 10, Rs. 56100-177500 + DA + HRA + Medical + LTC',
  salary_breakdown = jsonb_build_object(
    'basicPay', 56100,
    'maxPay', 177500,
    'daApplicable', true,
    'gradesOrLevels', jsonb_build_array('Level 10', 'IAS'),
    'additionalBenefits', jsonb_build_array('DA', 'HRA', 'Medical', 'LTC')
  )
WHERE title ILIKE '%UPSC%Civil%'
  AND salary_note IS NULL
  AND notification_text ILIKE '%salary%'
LIMIT 10;

-- Example: SSC Combined Graduate Level Exam
UPDATE recruitments
SET
  salary_note = 'Level 4-6, Rs. 25500-81100 + DA + TA + HRA',
  salary_breakdown = jsonb_build_object(
    'basicPay', 25500,
    'maxPay', 81100,
    'daApplicable', true,
    'gradesOrLevels', jsonb_build_array('Level 4', 'Level 5', 'Level 6'),
    'additionalBenefits', jsonb_build_array('DA', 'TA', 'HRA')
  )
WHERE title ILIKE '%SSC%CGL%'
  AND salary_note IS NULL
  AND notification_text ILIKE '%salary%'
LIMIT 20;

-- Example: Bank PO Recruitment
UPDATE recruitments
SET
  salary_note = 'Scale: SB-3, Rs. 23700-980000 + DA + HRA + other allowances',
  salary_breakdown = jsonb_build_object(
    'basicPay', 23700,
    'maxPay', 980000,
    'daApplicable', true,
    'gradesOrLevels', jsonb_build_array('Scale I', 'Scale II', 'Scale III'),
    'additionalBenefits', jsonb_build_array('DA', 'HRA', 'Bonus', 'Gratuity')
  )
WHERE title ILIKE '%IBPS%PO%' OR title ILIKE '%Bank%Officer%'
  AND salary_note IS NULL
  AND notification_text ILIKE '%salary%'
LIMIT 15;

-- Example: Railway Recruitment
UPDATE recruitments
SET
  salary_note = 'Level 5, Rs. 19900-63200 + DA + TA + HRA',
  salary_breakdown = jsonb_build_object(
    'basicPay', 19900,
    'maxPay', 63200,
    'daApplicable', true,
    'gradesOrLevels', jsonb_build_array('Level 5'),
    'additionalBenefits', jsonb_build_array('DA', 'TA', 'HRA', 'Medical')
  )
WHERE title ILIKE '%Railway%' OR title ILIKE '%RRB%'
  AND salary_note IS NULL
  AND notification_text ILIKE '%salary%'
LIMIT 25;

-- Verify updates
SELECT
  COUNT(*) as updated_count,
  COUNT(CASE WHEN salary_breakdown IS NOT NULL THEN 1 END) as with_breakdown
FROM recruitments
WHERE salary_note IS NOT NULL OR salary_breakdown IS NOT NULL;

-- Show sample of updated data
SELECT
  id,
  title,
  salary_note,
  (salary_breakdown->>'basicPay')::numeric as basic_pay,
  (salary_breakdown->>'maxPay')::numeric as max_pay
FROM recruitments
WHERE salary_breakdown IS NOT NULL
LIMIT 5;
