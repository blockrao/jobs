-- PHASE 4b: Comprehensive V1→V2 Mapping
-- Maps all 213 v1 postings to appropriate v2 positions

-- Step 1: Create mapping table (temporary)
CREATE TEMP TABLE posting_position_map AS
SELECT
  p.id as posting_id,
  p.slug as posting_slug,
  p.title as posting_title,
  CASE
    -- HIGH PRIORITY MAPPINGS (by title pattern matching)
    WHEN p.title ILIKE '%SSC%CGL%' THEN 31  -- ssc-combined-graduate-level
    WHEN p.title ILIKE '%SSC%CHSL%' THEN 32  -- ssc-combined-higher-secondary-level
    WHEN p.title ILIKE '%SSC%Stenographer%' THEN 33  -- ssc-stenographer

    -- BANKING FAMILY
    WHEN p.title ILIKE '%Specialist Officer%' OR p.title ILIKE '%SO%Bank%' THEN 23  -- bank-specialist-officer
    WHEN p.title ILIKE '%Bank%Apprentice%' OR p.title ILIKE '%Canara%' THEN 24  -- bank-apprentice
    WHEN p.title ILIKE '%IBPS%RRB%' AND p.title ILIKE '%Officer%' THEN 25  -- ibps-rrb-officer-scale
    WHEN p.title ILIKE '%IBPS%RRB%' AND p.title ILIKE '%Assistant%' THEN 26  -- ibps-rrb-office-assistant

    -- RAILWAY FAMILY
    WHEN p.title ILIKE '%Railway%JE%' OR p.title ILIKE '%RRB%JE%' THEN 27  -- railway-junior-engineer
    WHEN p.title ILIKE '%Railway%NTPC%' OR p.title ILIKE '%RRB%NTPC%' THEN 29  -- railway-ntpc-graduate
    WHEN p.title ILIKE '%Railway%Paramedical%' OR p.title ILIKE '%RRB%Paramedical%' THEN 30  -- railway-paramedical-staff
    WHEN p.title ILIKE '%Railway%Technician%' OR p.title ILIKE '%RRB%Technician%' THEN 28  -- railway-technician (ID need to verify)

    -- POLICE FAMILY
    WHEN p.title ILIKE '%UP Police%Constable%' THEN 34  -- up-police-constable
    WHEN p.title ILIKE '%Delhi Police%' THEN 35  -- delhi-police-constable
    WHEN p.title ILIKE '%Police%SI%' OR p.title ILIKE '%Sub-Inspector%' THEN 36  -- state-police-sub-inspector

    -- TEACHING FAMILY
    WHEN p.title ILIKE '%Bihar%Teacher%' OR p.title ILIKE '%Bihar%TRE%' THEN 37  -- bihar-school-teacher
    WHEN p.title ILIKE '%University%Faculty%' OR p.title ILIKE '%University%Professor%' THEN 38  -- university-faculty
    WHEN p.title ILIKE '%TET%' OR p.title ILIKE '%Teacher Eligibility%' THEN 39  -- teacher-eligibility-test-state

    -- ENGINEERING FAMILY
    WHEN p.title ILIKE '%Junior Engineer%' OR p.title ILIKE '%JE%Civil%' THEN 40  -- junior-engineer-technical
    WHEN p.title ILIKE '%Apprentice%' AND p.title ILIKE '%Engineering%' THEN 41  -- psu-engineering-apprentice

    -- DEFENCE FAMILY
    WHEN p.title ILIKE '%Army%' OR p.title ILIKE '%Navy%' OR p.title ILIKE '%Air Force%' OR p.title ILIKE '%Agniveer%' THEN 42  -- armed-forces-recruitment
    WHEN p.title ILIKE '%CRPF%' THEN 43  -- crpf-constable
    WHEN p.title ILIKE '%BSF%' OR p.title ILIKE '%ITBP%' THEN 44  -- bsf-itbp-recruitment
    WHEN p.title ILIKE '%Assam Rifles%' OR p.title ILIKE '%ESC%' THEN 42  -- armed-forces-recruitment

    -- MEDICAL FAMILY
    WHEN p.title ILIKE '%Nursing%' THEN 45  -- nursing-officer
    WHEN p.title ILIKE '%Medical Officer%' OR p.title ILIKE '%Doctor%' THEN 46  -- medical-officer

    -- PSU & GENERAL (catch-all for "Other" category)
    WHEN p.title ILIKE '%NEET%' OR p.title ILIKE '%Medical%' THEN 46  -- medical-officer
    WHEN p.title ILIKE '%PSU%' OR p.title ILIKE '%NTPC%' OR p.title ILIKE '%SAIL%' THEN 47  -- psu-general-recruitment

    -- DEFAULT: Route to general PSU position
    ELSE 47  -- psu-general-recruitment (catch-all)
  END as position_id
FROM postings p
WHERE p.review_status = 'APPROVED';

-- Step 2: Analyze mapping distribution
SELECT
  pos.name,
  COUNT(ppm.posting_id) as posting_count,
  ROUND(100.0 * COUNT(ppm.posting_id) / (SELECT COUNT(*) FROM posting_position_map), 2) as percent
FROM posting_position_map ppm
JOIN positions pos ON pos.id = ppm.position_id
GROUP BY pos.id, pos.name
ORDER BY posting_count DESC;

-- Step 3: Show sample postings for verification (sample from top 5 position families)
SELECT
  ppm.position_id,
  pos.name,
  ppm.posting_id,
  ppm.posting_title,
  ROW_NUMBER() OVER (PARTITION BY ppm.position_id ORDER BY ppm.posting_id) as rank
FROM posting_position_map ppm
JOIN positions pos ON pos.id = ppm.position_id
WHERE ROW_NUMBER() OVER (PARTITION BY ppm.position_id ORDER BY ppm.posting_id) <= 2
ORDER BY ppm.position_id, rank
LIMIT 50;
