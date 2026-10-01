-- PHASE 4b: Complete V1→V2 Backfill
-- Creates recruitment campaigns and links all 213 v1 postings to v2 positions/posts
--
-- This script is designed to be run atomically in a single transaction
-- to ensure data consistency across the backfill

BEGIN TRANSACTION;

-- ============================================================================
-- STEP 1: Create Recruitment Campaigns for Position Families
-- ============================================================================

-- Helper function to ensure recruitment exists
CREATE TEMP TABLE recruitment_mapping AS
WITH position_families AS (
  -- Map position families to their recruiting organizations
  SELECT 31 as position_id, 'SSC' as org_slug, 'SSC CGL 2026 Campaign' as recruitment_name, 'ssc-cgl-2026-campaign' as recruitment_slug, 2026 as year
  UNION ALL SELECT 32, 'SSC', 'SSC CHSL 2026 Campaign', 'ssc-chsl-2026-campaign', 2026
  UNION ALL SELECT 33, 'SSC', 'SSC Stenographer 2026 Campaign', 'ssc-stenographer-2026-campaign', 2026

  UNION ALL SELECT 23, 'IBPS', 'Bank Specialist Officer 2026', 'bank-specialist-2026', 2026
  UNION ALL SELECT 24, 'IBPS', 'Bank Apprentice 2026', 'bank-apprentice-2026', 2026
  UNION ALL SELECT 25, 'IBPS', 'IBPS RRB 2026 Campaign', 'ibps-rrb-2026', 2026
  UNION ALL SELECT 26, 'IBPS', 'IBPS RRB 2026 Campaign', 'ibps-rrb-2026', 2026

  UNION ALL SELECT 27, 'Railway', 'RRB Junior Engineer 2026', 'rrb-je-2026', 2026
  UNION ALL SELECT 28, 'Railway', 'RRB Technician 2026', 'rrb-technician-2026', 2026
  UNION ALL SELECT 29, 'Railway', 'RRB NTPC 2026 Campaign', 'rrb-ntpc-2026', 2026
  UNION ALL SELECT 30, 'Railway', 'RRB Paramedical 2026', 'rrb-paramedical-2026', 2026

  UNION ALL SELECT 34, 'UP State', 'UP Police Constable 2025', 'up-police-constable-2025', 2025
  UNION ALL SELECT 35, 'Delhi Police', 'Delhi Police Recruitment 2026', 'delhi-police-2026', 2026
  UNION ALL SELECT 36, 'State Police', 'State Police SI 2026', 'state-police-si-2026', 2026

  UNION ALL SELECT 37, 'Bihar Public Service Commission', 'Bihar Teacher TRE 4.0 2026', 'bihar-teacher-2026', 2026
  UNION ALL SELECT 38, 'Ministry of Education', 'University Faculty Recruitment', 'university-faculty', 2026
  UNION ALL SELECT 39, 'State Education Board', 'Teacher Eligibility Test 2026', 'tet-2026', 2026

  UNION ALL SELECT 40, 'Railway', 'Junior Engineer 2026', 'je-2026', 2026
  UNION ALL SELECT 41, 'PSU General', 'PSU Engineering Apprentice 2026', 'psu-apprentice-2026', 2026

  UNION ALL SELECT 42, 'Ministry of Defence', 'Armed Forces Recruitment 2026', 'armed-forces-2026', 2026
  UNION ALL SELECT 43, 'Central Reserve Police Force', 'CRPF Recruitment 2026', 'crpf-2026', 2026
  UNION ALL SELECT 44, 'Border Security Force', 'BSF ITBP Recruitment 2026', 'bsf-itbp-2026', 2026

  UNION ALL SELECT 45, 'Ministry of Health', 'Nursing Officer 2026', 'nursing-2026', 2026
  UNION ALL SELECT 46, 'Ministry of Health', 'Medical Officer Recruitment 2026', 'medical-officer-2026', 2026

  UNION ALL SELECT 47, 'PSU General', 'PSU General Recruitment 2026', 'psu-general-2026', 2026
),
org_lookup AS (
  SELECT pf.*, o.id as org_id
  FROM position_families pf
  LEFT JOIN organizations o ON o.slug ILIKE '%' || pf.org_slug || '%'
  WHERE o.id IS NOT NULL OR pf.org_slug = 'PSU General' -- Include PSU General even if no perfect match
)
SELECT
  position_id,
  COALESCE(org_id, 4) as org_id, -- Default to org_id 4 if no match
  recruitment_name,
  recruitment_slug,
  year
FROM org_lookup;

-- Now insert recruitment campaigns for each family
INSERT INTO recruitments (organization_id, year, name, slug, status, created_at, updated_at)
SELECT DISTINCT
  rm.org_id,
  rm.year,
  rm.recruitment_name,
  rm.recruitment_slug,
  'ACTIVE'::recruitment_status,
  NOW(),
  NOW()
FROM recruitment_mapping rm
WHERE NOT EXISTS (
  SELECT 1 FROM recruitments r
  WHERE r.slug = rm.recruitment_slug
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 2: Create Posts for V1 Postings (Link to V2 Positions)
-- ============================================================================

-- Create temporary mapping of v1 postings to positions based on title patterns
CREATE TEMP TABLE v1_to_v2_mapping AS
SELECT
  p.id as posting_id,
  p.slug as posting_slug,
  p.title as posting_title,
  CASE
    WHEN p.title ILIKE '%SSC%CGL%' THEN 31
    WHEN p.title ILIKE '%SSC%CHSL%' THEN 32
    WHEN p.title ILIKE '%SSC%Stenographer%' THEN 33
    WHEN p.title ILIKE '%Specialist Officer%' OR p.title ILIKE '%SO%Bank%' THEN 23
    WHEN p.title ILIKE '%Bank%Apprentice%' OR p.title ILIKE '%Canara%' THEN 24
    WHEN p.title ILIKE '%IBPS%RRB%' AND p.title ILIKE '%Officer%' THEN 25
    WHEN p.title ILIKE '%IBPS%RRB%' AND p.title ILIKE '%Assistant%' THEN 26
    WHEN p.title ILIKE '%Railway%JE%' OR p.title ILIKE '%RRB%JE%' THEN 27
    WHEN p.title ILIKE '%Railway%NTPC%' OR p.title ILIKE '%RRB%NTPC%' THEN 29
    WHEN p.title ILIKE '%Railway%Paramedical%' OR p.title ILIKE '%RRB%Paramedical%' THEN 30
    WHEN p.title ILIKE '%Railway%Technician%' OR p.title ILIKE '%RRB%Technician%' THEN 28
    WHEN p.title ILIKE '%UP Police%Constable%' THEN 34
    WHEN p.title ILIKE '%Delhi Police%' THEN 35
    WHEN p.title ILIKE '%Police%SI%' OR p.title ILIKE '%Sub-Inspector%' THEN 36
    WHEN p.title ILIKE '%Bihar%Teacher%' OR p.title ILIKE '%Bihar%TRE%' THEN 37
    WHEN p.title ILIKE '%University%Faculty%' OR p.title ILIKE '%University%Professor%' THEN 38
    WHEN p.title ILIKE '%TET%' OR p.title ILIKE '%Teacher Eligibility%' THEN 39
    WHEN p.title ILIKE '%Junior Engineer%' OR p.title ILIKE '%JE%Civil%' THEN 40
    WHEN p.title ILIKE '%Apprentice%' AND p.title ILIKE '%Engineering%' THEN 41
    WHEN p.title ILIKE '%Army%' OR p.title ILIKE '%Navy%' OR p.title ILIKE '%Air Force%' OR p.title ILIKE '%Agniveer%' THEN 42
    WHEN p.title ILIKE '%CRPF%' THEN 43
    WHEN p.title ILIKE '%BSF%' OR p.title ILIKE '%ITBP%' THEN 44
    WHEN p.title ILIKE '%Assam Rifles%' OR p.title ILIKE '%ESC%' THEN 42
    WHEN p.title ILIKE '%Nursing%' THEN 45
    WHEN p.title ILIKE '%Medical Officer%' OR p.title ILIKE '%Doctor%' THEN 46
    WHEN p.title ILIKE '%NEET%' OR p.title ILIKE '%Medical%' THEN 46
    WHEN p.title ILIKE '%PSU%' OR p.title ILIKE '%NTPC%' OR p.title ILIKE '%SAIL%' THEN 47
    ELSE 47
  END as position_id
FROM postings p
WHERE p.review_status = 'APPROVED' AND p.inferred_post_id IS NULL;

-- Create posts for each v1 posting
INSERT INTO posts (recruitment_id, position_id, name, slug, description, created_at, updated_at)
SELECT
  r.id as recruitment_id,
  vm.position_id,
  vm.posting_title as name,
  vm.posting_slug as slug,
  SUBSTRING(vm.posting_title, 1, 500) as description,
  NOW() as created_at,
  NOW() as updated_at
FROM v1_to_v2_mapping vm
JOIN recruitment_mapping rm ON rm.position_id = vm.position_id
JOIN recruitments r ON r.slug = rm.recruitment_slug
WHERE NOT EXISTS (
  SELECT 1 FROM posts p2 WHERE p2.slug = vm.posting_slug
);

-- ============================================================================
-- STEP 3: Link V1 Postings to V2 Posts (Update inferred_post_id)
-- ============================================================================

UPDATE postings p
SET
  inferred_post_id = p2.id,
  inferred_recruitment_id = p2.recruitment_id,
  updated_at = NOW()
FROM posts p2
WHERE p.slug = p2.slug
  AND p.review_status = 'APPROVED'
  AND p.inferred_post_id IS NULL;

-- ============================================================================
-- SUMMARY & VERIFICATION
-- ============================================================================

-- Show mapping statistics
SELECT
  'Mappings Complete' as status,
  COUNT(*) as total_postings,
  COUNT(DISTINCT inferred_post_id) as linked_posts,
  COUNT(DISTINCT inferred_recruitment_id) as linked_recruitments
FROM postings
WHERE review_status = 'APPROVED';

-- Show distribution by position
SELECT
  pos.name as position_name,
  COUNT(DISTINCT p.id) as posting_count
FROM postings p
JOIN posts p2 ON p2.id = p.inferred_post_id
JOIN positions pos ON pos.id = p2.position_id
WHERE p.review_status = 'APPROVED' AND p.inferred_post_id IS NOT NULL
GROUP BY pos.id, pos.name
ORDER BY posting_count DESC;

COMMIT;
