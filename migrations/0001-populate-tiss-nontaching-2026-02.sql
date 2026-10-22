-- Migration: Populate TISS Non-Teaching Positions 2026/02
-- Date: 2026-10-22
-- Description: Insert complete data for 11 TISS non-teaching positions with 16 vacancies
-- Source: Official notification ADVT.REF NO./TISS/NON-TEACHING POSITIONS/2026/02

BEGIN;

-- Step 1: Ensure TISS organization exists
INSERT INTO organizations (name, slug, website_url, sector, created_at)
VALUES (
  'Tata Institute of Social Sciences',
  'tata-institute-of-social-sciences',
  'https://www.tiss.edu',
  'GOVERNMENT_CENTRAL',
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
RETURNING id AS tiss_org_id;

-- Get TISS org_id for use in subsequent queries
WITH tiss_org AS (
  SELECT id FROM organizations
  WHERE slug = 'tata-institute-of-social-sciences'
),

-- Step 2: Create/update recruitment record
recruitment_record AS (
  INSERT INTO recruitments (
    organization_id,
    title,
    description,
    advertisement_number,
    notification_number,
    posted_on,
    application_deadline,
    total_vacancies,
    status,
    created_at,
    updated_at
  )
  SELECT
    tiss_org.id,
    'Tata Institute of Social Sciences Non-Teaching Positions 2026',
    'Recruitment for 11 Non-Teaching Positions (Deputy Registrar, Deputy Librarian, Assistant Registrar, etc.)',
    'ADVT.REF NO./TISS/NON-TEACHING POSITIONS/2026/02',
    '2026/02',
    '2026-10-07',
    '2026-11-09',
    16,
    'ACTIVE',
    NOW(),
    NOW()
  FROM tiss_org
  ON CONFLICT (organization_id, advertisement_number) DO UPDATE SET
    updated_at = NOW(),
    total_vacancies = 16
  RETURNING id, organization_id
),

-- Step 3: Insert application fees
fees_insert AS (
  INSERT INTO recruitment_fees (recruitment_id, category, amount, created_at)
  SELECT
    recruitment_record.id,
    category,
    amount,
    NOW()
  FROM recruitment_record,
  LATERAL (
    VALUES
      ('UR', 2000),
      ('OBC', 1500),
      ('EWS', 1500),
      ('SC/ST', 1000),
      ('PwBD', 500)
  ) AS fee_data(category, amount)
  ON CONFLICT (recruitment_id, category) DO UPDATE SET amount = EXCLUDED.amount
),

-- Step 4: Insert posts
posts_data AS (
  SELECT
    recruitment_record.id as recruitment_id,
    1 as position_id,
    'Deputy Registrar' as post_name,
    'deputy-registrar-mumbai' as slug,
    'Deputy Registrar - Mumbai Campus' as description,
    2 as vacancy_count,
    '{"UR": 2, "OBC": 0, "SC": 0, "ST": 0, "EWS": 0, "total": 2}'::jsonb as vacancy_details,
    NULL::integer as salary_min,
    NULL::integer as salary_max,
    '{"level": "12", "title": "Level-12"}'::jsonb as pay_level
  FROM recruitment_record

  UNION ALL

  SELECT
    recruitment_record.id,
    2,
    'Deputy Librarian',
    'deputy-librarian-hyderabad',
    'Deputy Librarian - Hyderabad Campus',
    1,
    '{"UR": 1, "OBC": 0, "SC": 0, "ST": 0, "EWS": 0, "total": 1}'::jsonb,
    NULL,
    NULL,
    '{"level": "Academic-12", "title": "Academic Level-12"}'::jsonb
  FROM recruitment_record

  UNION ALL

  SELECT
    recruitment_record.id,
    3,
    'Assistant Librarian',
    'assistant-librarian-hyderabad',
    'Assistant Librarian - Hyderabad Campus',
    1,
    '{"UR": 1, "OBC": 0, "SC": 0, "ST": 0, "EWS": 0, "total": 1}'::jsonb,
    NULL,
    NULL,
    '{"level": "Academic-10", "title": "Academic Level-10"}'::jsonb
  FROM recruitment_record

  UNION ALL

  SELECT
    recruitment_record.id,
    4,
    'Assistant Registrar',
    'assistant-registrar-multi-campus',
    'Assistant Registrar - Mumbai, Tuljapur, Gawahati',
    3,
    '{"UR": 2, "OBC": 1, "SC": 0, "ST": 0, "EWS": 0, "total": 3}'::jsonb,
    NULL,
    NULL,
    '{"level": "10", "title": "Level-10"}'::jsonb
  FROM recruitment_record

  UNION ALL

  SELECT
    recruitment_record.id,
    5,
    'Assistant Manager (Publications)',
    'assistant-manager-publications-mumbai',
    'Assistant Manager (Publications) - Mumbai Campus',
    1,
    '{"UR": 1, "OBC": 0, "SC": 0, "ST": 0, "EWS": 0, "total": 1}'::jsonb,
    NULL,
    NULL,
    '{"level": "10", "title": "Level-10"}'::jsonb
  FROM recruitment_record

  UNION ALL

  SELECT
    recruitment_record.id,
    6,
    'System Analyst-cum-Programmer',
    'system-analyst-programmer-mumbai',
    'System Analyst-cum-Programmer - Mumbai Campus',
    1,
    '{"UR": 1, "OBC": 0, "SC": 0, "ST": 0, "EWS": 0, "total": 1}'::jsonb,
    NULL,
    NULL,
    '{"level": "10", "title": "Level-10"}'::jsonb
  FROM recruitment_record

  UNION ALL

  SELECT
    recruitment_record.id,
    7,
    'Health Officer',
    'health-officer-tuljapur',
    'Health Officer - Tuljapur Campus',
    1,
    '{"UR": 1, "OBC": 0, "SC": 0, "ST": 0, "EWS": 0, "total": 1}'::jsonb,
    NULL,
    NULL,
    '{"level": "10", "title": "Level-10"}'::jsonb
  FROM recruitment_record

  UNION ALL

  SELECT
    recruitment_record.id,
    8,
    'Field Work Coordinator',
    'field-work-coordinator-mumbai',
    'Field Work Coordinator - Mumbai Campus',
    1,
    '{"UR": 1, "OBC": 0, "SC": 0, "ST": 0, "EWS": 0, "total": 1}'::jsonb,
    NULL,
    NULL,
    '{"level": "10", "title": "Level-10"}'::jsonb
  FROM recruitment_record

  UNION ALL

  SELECT
    recruitment_record.id,
    9,
    'Counsellor',
    'counsellor-mumbai',
    'Counsellor - Mumbai Campus',
    1,
    '{"UR": 1, "OBC": 0, "SC": 0, "ST": 0, "EWS": 0, "total": 1}'::jsonb,
    NULL,
    NULL,
    '{"level": "10", "title": "Level-10"}'::jsonb
  FROM recruitment_record

  UNION ALL

  SELECT
    recruitment_record.id,
    10,
    'Section Officer',
    'section-officer-mumbai',
    'Section Officer - Mumbai Campus',
    3,
    '{"UR": 2, "OBC": 1, "SC": 0, "ST": 0, "EWS": 0, "total": 3}'::jsonb,
    NULL,
    NULL,
    '{"level": "7", "title": "Level-7"}'::jsonb
  FROM recruitment_record

  UNION ALL

  SELECT
    recruitment_record.id,
    11,
    'Section Officer (Security)',
    'section-officer-security-mumbai',
    'Section Officer (Security) - Mumbai Campus',
    1,
    '{"UR": 1, "OBC": 0, "SC": 0, "ST": 0, "EWS": 0, "total": 1}'::jsonb,
    NULL,
    NULL,
    '{"level": "7", "title": "Level-7"}'::jsonb
  FROM recruitment_record
),

inserted_posts AS (
  INSERT INTO posts (
    recruitment_id,
    position_id,
    name,
    slug,
    description,
    vacancy_total,
    vacancy_details,
    salary_min,
    salary_max,
    pay_level,
    created_at,
    updated_at
  )
  SELECT
    recruitment_id,
    position_id,
    post_name,
    slug,
    description,
    vacancy_count,
    vacancy_details,
    salary_min,
    salary_max,
    pay_level,
    NOW(),
    NOW()
  FROM posts_data
  ON CONFLICT (recruitment_id, slug) DO UPDATE SET
    vacancy_total = EXCLUDED.vacancy_total,
    vacancy_details = EXCLUDED.vacancy_details,
    updated_at = NOW()
  RETURNING id, name, recruitment_id
),

-- Step 5: Insert eligibilities
eligibilities_insert AS (
  INSERT INTO eligibilities (
    post_id,
    age_max,
    qualification_text,
    experience_text,
    status,
    created_at,
    updated_at
  )
  SELECT
    inserted_posts.id,
    CASE inserted_posts.name
      WHEN 'Deputy Registrar' THEN 50
      WHEN 'Deputy Librarian' THEN 45
      WHEN 'Assistant Librarian' THEN 40
      WHEN 'Assistant Registrar' THEN 40
      WHEN 'Assistant Manager (Publications)' THEN 40
      WHEN 'System Analyst-cum-Programmer' THEN 45
      WHEN 'Health Officer' THEN 45
      WHEN 'Field Work Coordinator' THEN 45
      WHEN 'Counsellor' THEN 45
      WHEN 'Section Officer' THEN 40
      WHEN 'Section Officer (Security)' THEN 40
    END as age_max,
    CASE inserted_posts.name
      WHEN 'Deputy Registrar' THEN 'Post Graduate Degree in any discipline with 8 years experience'
      WHEN 'Deputy Librarian' THEN 'Master''s Degree in Library Science'
      WHEN 'Assistant Librarian' THEN 'Master''s Degree in Library Science'
      WHEN 'Assistant Registrar' THEN 'Bachelor''s Degree from recognized University'
      WHEN 'Assistant Manager (Publications)' THEN 'Master''s Degree in any subject'
      WHEN 'System Analyst-cum-Programmer' THEN 'M.E./M.Tech. (Computer Science) OR Master''s in Computer Applications (MCA) OR M.Sc. (Computer Science/Information Technology)'
      WHEN 'Health Officer' THEN 'MBBS recognised by Medical Council of India, registered with MCI/State Medical Council'
      WHEN 'Field Work Coordinator' THEN 'Master''s Degree in Social Work with at least 55% marks or equivalent grade B'
      WHEN 'Counsellor' THEN 'Master''s in Social Work/Counselling/Applied Psychology'
      WHEN 'Section Officer' THEN 'Bachelor''s Degree in any stream from any recognised University'
      WHEN 'Section Officer (Security)' THEN 'Bachelor''s Degree OR Army service at JCO level with 10th standard pass'
    END as qualification_text,
    CASE inserted_posts.name
      WHEN 'Deputy Registrar' THEN '8 years in academic/research/administrative institutions'
      WHEN 'Deputy Librarian' THEN '5 years in library science'
      WHEN 'Assistant Librarian' THEN '3 years in library science'
      WHEN 'Assistant Registrar' THEN '5 years in academic/administrative institutions'
      WHEN 'Assistant Manager (Publications)' THEN '3 years in publications/content management'
      WHEN 'System Analyst-cum-Programmer' THEN '2-3 years relevant experience in IT'
      WHEN 'Health Officer' THEN '3 years in hospital attached with Medical College/Corporate Hospital'
      WHEN 'Field Work Coordinator' THEN '15 years in field work'
      WHEN 'Counsellor' THEN '10 years in counselling'
      WHEN 'Section Officer' THEN '3 years in supervisory level in Administration/Establishment/Finance/Academic matters'
      WHEN 'Section Officer (Security)' THEN '5 years as Security Supervisor OR Army service at JCO+ level'
    END as experience_text,
    'VERIFIED' as status,
    NOW(),
    NOW()
  FROM inserted_posts
  ON CONFLICT (post_id) DO UPDATE SET
    age_max = EXCLUDED.age_max,
    qualification_text = EXCLUDED.qualification_text,
    experience_text = EXCLUDED.experience_text,
    updated_at = NOW()
)

-- Step 6: Insert age rules
INSERT INTO post_age_rules (
  post_id,
  category,
  max_age,
  rule_type,
  condition_text,
  created_at
)
SELECT
  inserted_posts.id,
  category,
  CASE inserted_posts.name
    WHEN 'Deputy Registrar' THEN 50
    WHEN 'Deputy Librarian' THEN 45
    WHEN 'Assistant Librarian' THEN 40
    WHEN 'Assistant Registrar' THEN 40
    WHEN 'Assistant Manager (Publications)' THEN 40
    WHEN 'System Analyst-cum-Programmer' THEN 45
    WHEN 'Health Officer' THEN 45
    WHEN 'Field Work Coordinator' THEN 45
    WHEN 'Counsellor' THEN 45
    WHEN 'Section Officer' THEN 40
    WHEN 'Section Officer (Security)' THEN 40
  END,
  'ARITHMETIC',
  'As per Government of India rules',
  NOW()
FROM inserted_posts,
LATERAL (
  VALUES
    ('UR'),
    ('OBC'),
    ('SC/ST'),
    ('EWS'),
    ('PwBD')
) AS categories(category)
ON CONFLICT (post_id, category) DO NOTHING;

-- Step 7: Insert vacancy records
INSERT INTO posts_vacancies (
  post_id,
  category,
  category_count,
  total_vacancies,
  location,
  created_at
)
SELECT
  inserted_posts.id,
  category,
  CASE
    WHEN inserted_posts.name = 'Deputy Registrar' AND category = 'UR' THEN 2
    WHEN inserted_posts.name IN ('Deputy Librarian', 'Assistant Librarian', 'Assistant Manager (Publications)', 'System Analyst-cum-Programmer', 'Health Officer', 'Field Work Coordinator', 'Counsellor', 'Section Officer (Security)') AND category = 'UR' THEN 1
    WHEN inserted_posts.name = 'Assistant Registrar' AND category = 'UR' THEN 2
    WHEN inserted_posts.name = 'Assistant Registrar' AND category = 'OBC' THEN 1
    WHEN inserted_posts.name = 'Section Officer' AND category = 'UR' THEN 2
    WHEN inserted_posts.name = 'Section Officer' AND category = 'OBC' THEN 1
    ELSE 0
  END as count,
  CASE inserted_posts.name
    WHEN 'Deputy Registrar' THEN 2
    WHEN 'Deputy Librarian' THEN 1
    WHEN 'Assistant Librarian' THEN 1
    WHEN 'Assistant Registrar' THEN 3
    WHEN 'Assistant Manager (Publications)' THEN 1
    WHEN 'System Analyst-cum-Programmer' THEN 1
    WHEN 'Health Officer' THEN 1
    WHEN 'Field Work Coordinator' THEN 1
    WHEN 'Counsellor' THEN 1
    WHEN 'Section Officer' THEN 3
    WHEN 'Section Officer (Security)' THEN 1
  END,
  CASE inserted_posts.name
    WHEN 'Deputy Registrar' THEN 'Mumbai'
    WHEN 'Deputy Librarian' THEN 'Hyderabad'
    WHEN 'Assistant Librarian' THEN 'Hyderabad'
    WHEN 'Assistant Registrar' THEN 'Mumbai, Tuljapur, Gawahati'
    WHEN 'Assistant Manager (Publications)' THEN 'Mumbai'
    WHEN 'System Analyst-cum-Programmer' THEN 'Mumbai'
    WHEN 'Health Officer' THEN 'Tuljapur'
    WHEN 'Field Work Coordinator' THEN 'Mumbai'
    WHEN 'Counsellor' THEN 'Mumbai'
    WHEN 'Section Officer' THEN 'Mumbai'
    WHEN 'Section Officer (Security)' THEN 'Mumbai'
  END,
  NOW()
FROM inserted_posts,
LATERAL (
  VALUES
    ('UR'),
    ('OBC'),
    ('SC/ST'),
    ('EWS'),
    ('PwBD')
) AS categories(category)
ON CONFLICT (post_id, category) DO NOTHING;

COMMIT;
