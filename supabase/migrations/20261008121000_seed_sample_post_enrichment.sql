-- Migration: Seed sample post enrichment data
-- Populates post_enrichments table with example data for "Assistant Legislative Counsel" UPSC position
-- This demonstrates the complete enrichment structure and serves as a template for data insertion.

-- Note: This assumes a post with slug 'assistant-legislative-counsel' exists in posts table
-- under recruitment_slug 'upsc-2025'. Adjust IDs as needed for your actual posts.

INSERT INTO public.post_enrichments (
  post_id,
  vacanciesByCategory,
  vacanciesTotal,
  feesByCategory,
  feeNote,
  ageRulesByCategory,
  ageNote,
  ageRelaxationRules,
  ageReferenceDate,
  payScale,
  salaryMin,
  salaryMax,
  salaryNote,
  payLevel,
  selectionProcess,
  notificationDate,
  applicationOpenDate,
  applicationClosingDate,
  examDate,
  admitCardDate,
  resultDate,
  interviewScheduleDate,
  appointmentDate,
  eligibilityPathways,
  documentsRequired,
  duties,
  responsibilities,
  sourceVerificationStatus,
  sourceVerificationDate,
  extractionConfidence,
  dataGaps,
  education,
  experience,
  benefits
)
SELECT
  id,
  '{"General": 18, "OBC": 8, "SC": 4, "ST": 3}'::jsonb,
  33,
  '{"General": 1000, "SC": 0, "ST": 0, "OBC": 0}'::jsonb,
  'SC/ST/OBC/Female/PwBD: Exempted; General: Rs. 1000',
  '{"General": {"min": 21, "max": 32}, "SC": {"min": 21, "max": 37}, "ST": {"min": 21, "max": 37}, "OBC": {"min": 21, "max": 35}}'::jsonb,
  'Upper age limit: 32 years (General), 37 years (SC/ST), 35 years (OBC) as on 01.01.2025',
  'SC/ST: 5 years additional, OBC: 3 years additional',
  '2025-01-01'::timestamptz,
  'Level-7 (Pay Matrix)',
  56100,
  177500,
  'Pay Matrix Level-7: Rs. 56,100 - 1,77,500 (as per 7th CPC)',
  '7',
  '[
    {"step": 1, "name": "Preliminary Examination", "totalMarks": 400, "duration": "2 hours", "minQualifyingMarks": {}, "description": "Objective type (MCQ) exam covering General Studies and Optional subjects"},
    {"step": 2, "name": "Mains Examination", "totalMarks": 1000, "duration": "Multiple days", "minQualifyingMarks": {"General": 333, "SC": 300, "ST": 300, "OBC": 320}, "description": "Subjective exam covering multiple papers in General Studies and Optional subjects"},
    {"step": 3, "name": "Personality Test / Interview", "totalMarks": 275, "duration": "Variable", "minQualifyingMarks": {}, "description": "Personal interview to assess suitability for civil service"}
  ]'::jsonb,
  '2024-09-15'::timestamptz,
  '2024-09-15'::timestamptz,
  '2024-11-15'::timestamptz,
  '2025-01-05'::timestamptz,
  '2025-03-10'::timestamptz,
  '2025-05-15'::timestamptz,
  '2025-07-01'::timestamptz,
  '2025-09-30'::timestamptz,
  '[
    {
      "pathway": 1,
      "description": "Civil Service Examination (CSE) – Open to all Indian citizens",
      "qualifications": ["Bachelor''s degree in any discipline from recognized university", "Fluency in English and Hindi"],
      "experienceYears": 0
    },
    {
      "pathway": 2,
      "description": "Special Provisions for Reserved Categories",
      "qualifications": ["Bachelor''s degree", "SC/ST/OBC/PwBD certificate issued by competent authority"],
      "experienceYears": 0
    }
  ]'::jsonb,
  '{"required": ["Admit Card", "Valid Photo ID", "Marks Sheets (10th onwards)", "Bachelor''s Degree Certificate", "Character Certificate", "Medical Certificate (as per prescribed format)"], "common": ["PAN Card", "Aadhar Card", "Bank Account Statement"]}'::jsonb,
  ARRAY[
    'Prepare and discuss legal matters',
    'Assist in drafting bills and amendments',
    'Provide legal advice on parliamentary procedures',
    'Review government policies and regulations',
    'Coordinate with various government departments',
    'Maintain confidentiality of sensitive documents'
  ],
  ARRAY[
    'Draft legislative documents and amendments',
    'Provide legal opinion on constitutional matters',
    'Research and analyze bills under consideration',
    'Assist in committee proceedings',
    'Represent Ministry in legal proceedings',
    'Train junior staff in legislative procedures'
  ],
  'VERIFIED',
  NOW(),
  85,
  ARRAY[]::text[],
  '{"degree": "Bachelor of Laws (LLB)", "university": "Any recognized Indian university", "registration": "Bar Council registration required"}'::jsonb,
  '{"minYears": 0, "domains": ["Legal", "Government", "Administrative"], "countedFrom": "Date of Bachelor''s degree"}'::jsonb,
  ARRAY['Medical insurance', 'Pension', 'Gratuity', 'Leave encashment', 'Government accommodation']
FROM public.posts
WHERE slug = 'assistant-legislative-counsel'
  AND recruitment_slug = 'upsc-2025'
  AND NOT EXISTS (
    SELECT 1 FROM public.post_enrichments
    WHERE post_id = posts.id
  )
LIMIT 1;

-- If the above insert doesn't work (post doesn't exist), add this note:
-- This migration is a template. Update the WHERE clause to match your actual post data.
-- Posts can be identified by: slug, recruitment_slug, and recruitment_id.
