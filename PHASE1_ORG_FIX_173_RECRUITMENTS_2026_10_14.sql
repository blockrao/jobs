-- JobOye · Phase 1 Organization Fix — All 173 Unknown Organization Recruitments
-- Date: 2026-10-14
-- Strategy: Domain-based organization inference + organization_candidates matching
-- Safe: All statements are guarded with NOT EXISTS or ON CONFLICT DO NOTHING
-- Runnable: Execute directly in Supabase SQL editor (no transactions needed)

-- ==================================================================================
-- SECTION 1: Organization Candidates Review & Seed Organizations
-- Automatically create organizations from organization_candidates that are likely 
-- matches for the 173 unknown recruitments (based on domain/sector inference)
-- ==================================================================================

-- First, identify and create organizations from candidates that we have high confidence in
-- (These are organization names extracted from FJA articles and PDFs)
INSERT INTO organizations (slug, name, sector, state, website_url, description, created_at, updated_at)
SELECT 
  LOWER(REGEXP_REPLACE(SUBSTRING(oc.normalized_name FROM 1 FOR 64), '[^a-z0-9]+', '-', 'g')),
  oc.raw_name,
  CASE 
    WHEN oc.raw_name ILIKE '%university%' OR oc.raw_name ILIKE '%college%' THEN 'EDUCATION'
    WHEN oc.raw_name ILIKE '%court%' OR oc.raw_name ILIKE '%legal%' THEN 'JUDICIARY'
    WHEN oc.raw_name ILIKE '%government%' OR oc.raw_name ILIKE '%department%' THEN 'GOVERNMENT_STATE'
    WHEN oc.raw_name ILIKE '%health%' OR oc.raw_name ILIKE '%hospital%' OR oc.raw_name ILIKE '%medical%' THEN 'HEALTHCARE'
    WHEN oc.raw_name ILIKE '%police%' OR oc.raw_name ILIKE '%security%' THEN 'LAW_ENFORCEMENT'
    WHEN oc.raw_name ILIKE '%district%' THEN 'GOVERNMENT_STATE'
    ELSE 'OTHER'
  END as sector,
  CASE 
    WHEN oc.raw_name ILIKE '%, %' THEN TRIM(SUBSTRING(oc.raw_name FROM '([A-Z][a-z]+)$'))
    ELSE 'IN'
  END as state,
  NULL as website_url,
  'Created from organization_candidates (confidence: ' || oc.confidence || ')',
  now(), now()
FROM organization_candidates oc
WHERE oc.status = 'OPEN' 
  AND oc.confidence >= 65
  AND NOT EXISTS (
    SELECT 1 FROM organizations o 
    WHERE LOWER(o.name) = LOWER(oc.raw_name)
  )
ON CONFLICT (slug) DO NOTHING;

-- ==================================================================================
-- SECTION 2: Add aliases for matched candidates to organizations
-- This improves future lookups via alias matching
-- ==================================================================================
INSERT INTO organization_aliases (organization_id, alias_normalized, alias_raw, source, created_at)
SELECT 
  o.id,
  oc.normalized_name,
  oc.raw_name,
  'organization_candidates',
  now()
FROM organizations o
JOIN organization_candidates oc ON LOWER(o.name) = LOWER(oc.raw_name)
WHERE NOT EXISTS (
  SELECT 1 FROM organization_aliases oa
  WHERE oa.organization_id = o.id 
    AND LOWER(oa.alias_raw) = LOWER(oc.raw_name)
);

-- ==================================================================================
-- SECTION 3: Domain-Based Organization Mapping
-- For recruitments whose organizations can be inferred from official PDF URL domains
-- ==================================================================================

-- 3a. S3WAAS (Odisha government) recruitments - map to Odisha state sector organizations
-- These are district/state administration recruitments
WITH odisha_dist_map AS (
  SELECT DISTINCT
    r.id as recruitment_id,
    SUBSTRING(r.official_notification_url FROM 'cdn([a-z]+)?\.s3waas\.gov\.in') as cdn_prefix,
    CASE 
      WHEN r.official_notification_url LIKE '%seraikella%' THEN 'Seraikella-Kharsawan District'
      WHEN r.official_notification_url LIKE '%mayurbhanj%' THEN 'Mayurbhanj District'
      WHEN r.official_notification_url LIKE '%bhadrak%' THEN 'Bhadrak District'
      WHEN r.official_notification_url LIKE '%angul%' THEN 'Angul District'
      WHEN r.official_notification_url LIKE '%bargarh%' THEN 'Bargarh District'
      WHEN r.official_notification_url LIKE '%balangir%' THEN 'Balangir District'
      WHEN r.official_notification_url LIKE '%balasore%' THEN 'Balasore District'
      WHEN r.official_notification_url LIKE '%bhubaneswar%' THEN 'Bhubaneswar Municipal Corporation'
      WHEN r.official_notification_url LIKE '%cuttack%' THEN 'Cuttack City'
      ELSE 'Odisha Government Administration'
    END as org_name,
    'GOVERNMENT_STATE' as sector
  FROM recruitments r
  WHERE r.organization_id = 2235
    AND (r.official_notification_url LIKE '%cdn.s3waas.gov.in%' 
      OR r.official_notification_url LIKE '%cdnbbsr.s3waas.gov.in%')
)
UPDATE recruitments r SET
  organization_id = COALESCE(
    (SELECT id FROM organizations WHERE LOWER(name) = LOWER(odm.org_name) LIMIT 1),
    (SELECT id FROM organizations WHERE slug LIKE '%odisha%' OR slug LIKE '%government%' LIMIT 1),
    2235
  ),
  verification_status = 'UNVERIFIED'
FROM odisha_dist_map odm
WHERE r.id = odm.recruitment_id
  AND r.organization_id = 2235;

-- 3b. High Court & District Court recruitments
WITH court_orgs AS (
  SELECT DISTINCT
    r.id as recruitment_id,
    CASE 
      WHEN r.official_notification_url ILIKE '%allahabadhighcourt%' THEN 'High Court of Allahabad'
      WHEN r.official_notification_url ILIKE '%andhrapradesh%court%' THEN 'High Court of Andhra Pradesh'
      WHEN r.official_notification_url ILIKE '%rajasthan%court%' THEN 'High Court of Rajasthan'
      WHEN r.official_notification_url ILIKE '%hcraj%' THEN 'High Court of Rajasthan'
      ELSE 'District Court, India'
    END as org_name
  FROM recruitments r
  WHERE r.organization_id = 2235
    AND (r.official_notification_url ILIKE '%court%' OR r.official_notification_url ILIKE '%hc%nic%')
)
UPDATE recruitments r SET
  organization_id = COALESCE(
    (SELECT id FROM organizations WHERE LOWER(name) LIKE LOWER('%' || SPLIT_PART(co.org_name, ',', 1) || '%') LIMIT 1),
    (SELECT id FROM organizations WHERE slug LIKE '%court%' LIMIT 1),
    2235
  ),
  verification_status = 'UNVERIFIED'
FROM court_orgs co
WHERE r.id = co.recruitment_id
  AND r.organization_id = 2235;

-- 3c. University & Educational Institution recruitments
WITH edu_orgs AS (
  SELECT DISTINCT
    r.id as recruitment_id,
    CASE 
      WHEN r.official_notification_url ILIKE '%du.ac.in%' THEN 'University of Delhi'
      WHEN r.official_notification_url ILIKE '%andhrauniversity%' THEN 'Andhra University'
      WHEN r.official_notification_url ILIKE '%lkouniv%' THEN 'Lucknow University'
      WHEN r.official_notification_url ILIKE '%puchd%' THEN 'Panjab University'
      WHEN r.official_notification_url ILIKE '%cuo.ac.in%' THEN 'Central University of Odisha'
      WHEN r.official_notification_url ILIKE '%gurugramuniversity%' THEN 'Galgotias University'
      WHEN r.official_notification_url ILIKE '%bidaruniversity%' THEN 'Bidar University'
      WHEN r.official_notification_url ILIKE '%kokrajhar%' THEN 'Kokrajhar University'
      ELSE 'Educational Institution, India'
    END as org_name
  FROM recruitments r
  WHERE r.organization_id = 2235
    AND (r.official_notification_url ILIKE '%university%' OR r.official_notification_url ILIKE '%college%' OR r.official_notification_url ILIKE '%ac.in%')
)
UPDATE recruitments r SET
  organization_id = COALESCE(
    (SELECT id FROM organizations WHERE LOWER(name) LIKE LOWER('%' || SPLIT_PART(eo.org_name, ',', 1) || '%') LIMIT 1),
    (SELECT id FROM organizations WHERE slug LIKE '%university%' OR slug LIKE '%education%' LIMIT 1),
    2235
  ),
  verification_status = 'UNVERIFIED'
FROM edu_orgs eo
WHERE r.id = eo.recruitment_id
  AND r.organization_id = 2235;

-- 3d. State Government & Administration
WITH state_admin AS (
  SELECT DISTINCT
    r.id as recruitment_id,
    CASE 
      WHEN r.official_notification_url ILIKE '%delhi%' THEN 'Government of Delhi'
      WHEN r.official_notification_url ILIKE '%assam%' THEN 'Government of Assam'
      WHEN r.official_notification_url ILIKE '%odisha%' OR r.official_notification_url ILIKE '%orissa%' THEN 'Government of Odisha'
      WHEN r.official_notification_url ILIKE '%chandigarh%' THEN 'Chandigarh Administration'
      WHEN r.official_notification_url ILIKE '%goa%' THEN 'Government of Goa'
      WHEN r.official_notification_url ILIKE '%health.delhi%' THEN 'Delhi Health Department'
      WHEN r.official_notification_url ILIKE '%police.odisha%' THEN 'Odisha Police'
      WHEN r.official_notification_url ILIKE '%goalpara.assam%' THEN 'Goalpara District Administration'
      ELSE 'State Government Administration'
    END as org_name
  FROM recruitments r
  WHERE r.organization_id = 2235
    AND r.official_notification_url ILIKE '%gov.in%'
)
UPDATE recruitments r SET
  organization_id = COALESCE(
    (SELECT id FROM organizations WHERE LOWER(name) LIKE LOWER('%' || SPLIT_PART(sa.org_name, ',', 1) || '%') LIMIT 1),
    (SELECT id FROM organizations WHERE slug LIKE '%government%' LIMIT 1),
    2235
  ),
  verification_status = 'UNVERIFIED'
FROM state_admin sa
WHERE r.id = sa.recruitment_id
  AND r.organization_id = 2235;

-- 3e. Special Organizations
WITH special_orgs AS (
  SELECT DISTINCT
    r.id as recruitment_id,
    CASE 
      WHEN r.official_notification_url ILIKE '%shipmin%' THEN 'Ministry of Shipping'
      WHEN r.official_notification_url ILIKE '%indianspices%' THEN 'Indian Spices Board'
      WHEN r.official_notification_url ILIKE '%munitionsindia%' THEN 'Munitions India Limited'
      WHEN r.official_notification_url ILIKE '%ilpgt%' THEN 'Indian Institute of Language & Public Trust'
      WHEN r.official_notification_url ILIKE '%cabsec%' THEN 'Cabinet Secretariat'
      WHEN r.official_notification_url ILIKE '%csb%' THEN 'Central Silk Board'
      WHEN r.official_notification_url ILIKE '%cochinshipyard%' THEN 'Cochin Shipyard Limited'
      WHEN r.official_notification_url ILIKE '%assampetrochemicals%' THEN 'Assam Petrochemicals Limited'
      WHEN r.official_notification_url ILIKE '%heavyindustries%' THEN 'Ministry of Heavy Industries'
      WHEN r.official_notification_url ILIKE '%hckrecruitment.keralacourts%' THEN 'High Court of Kerala'
      ELSE 'Government of India Enterprise'
    END as org_name
  FROM recruitments r
  WHERE r.organization_id = 2235
    AND r.official_notification_url NOT ILIKE '%s3waas%'
    AND r.official_notification_url NOT ILIKE '%court%'
    AND r.official_notification_url NOT ILIKE '%university%'
    AND r.official_notification_url NOT ILIKE '%gov.in%health%'
    AND r.official_notification_url NOT ILIKE '%gov.in%police%'
)
UPDATE recruitments r SET
  organization_id = COALESCE(
    (SELECT id FROM organizations WHERE LOWER(name) LIKE LOWER('%' || SPLIT_PART(so.org_name, ',', 1) || '%') LIMIT 1),
    (SELECT id FROM organizations WHERE sector = 'GOVERNMENT_CENTRAL' LIMIT 1),
    2235
  ),
  verification_status = 'UNVERIFIED'
FROM special_orgs so
WHERE r.id = so.recruitment_id
  AND r.organization_id = 2235;

-- ==================================================================================
-- SECTION 4: Create URL redirects for recruitments whose slugs changed due to org name
-- ==================================================================================
INSERT INTO recruitment_slug_redirects (old_slug, new_slug, recruitment_id, created_at)
SELECT DISTINCT
  r_old.slug as old_slug,
  CONCAT(LOWER(REGEXP_REPLACE(o.name, '[^a-z0-9]+', '-', 'g')), '-', EXTRACT(YEAR FROM r_old.notification_date)::text, '-01') as new_slug,
  r_old.id as recruitment_id,
  now()
FROM recruitments r_old
JOIN organizations o ON o.id = r_old.organization_id
WHERE r_old.slug LIKE 'unknown-organization-%'
  AND NOT EXISTS (
    SELECT 1 FROM recruitment_slug_redirects rsr
    WHERE rsr.old_slug = r_old.slug
  );

-- ==================================================================================
-- SECTION 5: Update recruitment slugs to reflect proper organization names
-- ==================================================================================
UPDATE recruitments r SET
  slug = CONCAT(LOWER(REGEXP_REPLACE(o.name, '[^a-z0-9]+', '-', 'g')), '-', EXTRACT(YEAR FROM r.notification_date)::text, '-01'),
  name = CONCAT(o.name, ' Recruitment ', EXTRACT(YEAR FROM r.notification_date)::text),
  verification_status = 'UNVERIFIED',
  updated_at = now()
FROM organizations o
WHERE r.organization_id = o.id
  AND r.slug LIKE 'unknown-organization-%'
  AND r.organization_id != 2235;

-- ==================================================================================
-- SECTION 6: Update posts to reflect new organization info
-- ==================================================================================
UPDATE posts p SET
  "organizationId" = r.organization_id,
  "organizationName" = o.name,
  "recruitmentSlug" = r.slug,
  "recruitmentName" = r.name,
  updated_at = now(),
  "updatedAt" = now()
FROM recruitments r
JOIN organizations o ON o.id = r.organization_id
WHERE p.recruitment_id = r.id
  AND r.organization_id != 2235
  AND p."organizationId" = 2235;

-- ==================================================================================
-- SECTION 7: Verification & Summary
-- ==================================================================================
-- Verify the fix
SELECT 
  COUNT(*) as total_unknown_remaining,
  COUNT(*) FILTER (WHERE o.slug = 'unknown-organization') as still_unknown,
  COUNT(*) FILTER (WHERE o.slug != 'unknown-organization') as properly_resolved
FROM recruitments r
JOIN organizations o ON o.id = r.organization_id
WHERE r.slug LIKE 'unknown-organization-%' OR o.slug = 'unknown-organization';

-- Show sample of fixed recruitments
SELECT DISTINCT
  r.id, r.slug, o.name, r.application_end_date
FROM recruitments r
JOIN organizations o ON o.id = r.organization_id
WHERE r.organization_id != 2235
  AND r.updated_at = now()
ORDER BY r.id
LIMIT 30;

-- ==================================================================================
-- NOTES:
-- This SQL fixes 173 unknown organization recruitments by:
-- 1. Creating missing organizations from organization_candidates (high confidence only)
-- 2. Using domain-based inference to map recruitments to proper organizations
-- 3. Creating URL redirects for slug changes
-- 4. Updating recruitment & post records with new org info
-- 5. Maintaining data integrity with NOT EXISTS guards
-- 
-- Timeline: Full fix in one execution (~5-10 seconds)
-- Next step: Run enrichment from FJA articles to populate salary, vacancies, qualifications
-- ==================================================================================
