-- Read-only diagnostic queries for issue #69 / PR #70.
-- Run against the JobOye production database using a read-only role.
-- Deliberately does not inspect or mutate public.raw_notifications.
-- This file contains no UPDATE/INSERT/DELETE statements.

-- 1) Cohort health and enrichment status.
select
  coalesce(e."sourceVerificationStatus", 'NO_ENRICHMENT_ROW') as enrichment_status,
  count(*) as post_count,
  count(*) filter (where coalesce(e."extractionConfidence", 0) = 0) as zero_confidence_count,
  count(*) filter (
    where e.education is null
       or e."salaryMin" is null
       or e."salaryMax" is null
       or e."vacanciesTotal" is null
  ) as missing_core_enrichment_count
from public.posts p
left join public.post_enrichments e on e.post_id = p.id
where lower(btrim(coalesce(p."organizationName", ''))) = 'unknown organization'
group by 1
order by 1;

-- 2) Per-Post evidence queue. Metadata and enrichment are context only,
-- not sufficient evidence to automatically assign an employing organization.
select
  p.id as post_id,
  p.slug as post_slug,
  coalesce(nullif(p.title, ''), p.name) as post_title,
  p."organizationName" as current_organization_name,
  p."organizationId" as organization_id,
  p.employing_organization_id,
  p.recruitment_id,
  r.name as recruitment_name,
  r.organization_id as recruitment_organization_id,
  p."officialSourceUrl" as post_official_source_url,
  r.official_notification_url as recruitment_official_source_url,
  p."applyPortalUrl" as apply_portal_url,
  e."sourceVerificationStatus" as source_verification_status,
  e."sourceVerificationDate" as source_verification_date,
  e."extractionConfidence" as extraction_confidence,
  e."dataGaps" as data_gaps,
  e.education,
  e.experience,
  e."vacanciesTotal" as vacancies_total,
  e."salaryMin" as salary_min,
  e."salaryMax" as salary_max,
  e."payScale" as pay_scale,
  e."ageNote" as age_note,
  e."feeNote" as fee_note,
  e."selectionProcess" as selection_process
from public.posts p
left join public.recruitments r on r.id = p.recruitment_id
left join public.post_enrichments e on e.post_id = p.id
where lower(btrim(coalesce(p."organizationName", ''))) = 'unknown organization'
order by p.id;

-- 3) Detect inconsistent linkage between Post and Recruitment employer IDs.
select
  p.id as post_id,
  p.slug as post_slug,
  p."organizationId" as post_organization_id,
  p.employing_organization_id,
  r.id as recruitment_id,
  r.organization_id as recruitment_organization_id
from public.posts p
left join public.recruitments r on r.id = p.recruitment_id
where lower(btrim(coalesce(p."organizationName", ''))) = 'unknown organization'
  and (
    p."organizationId" is distinct from r.organization_id
    or p.employing_organization_id is distinct from r.organization_id
  )
order by p.id;
