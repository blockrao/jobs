-- WCDC Bihar: seed canonical posts and fix organization attribution.
--
-- Pre-change report: docs/pre-change/WCDC_BIHAR_POST_SEED.md
-- Source of truth: official notification at
--   https://miswcdc.bihar.gov.in/SysAdmin/HRM/Documents/Advertisements/2026930451.pdf
-- Status: PENDING OWNER APPROVAL — do not apply without approval.
--
-- Changes in this migration:
--
-- 1. Posting 858 (legacy, APPROVED):
--    - Fix organization_id from 17 (BPSC) to 1581 (WCDC Bihar)
--    - Fill post_names array with the 4 official post names
--    - Set apply_url to the official portal
--    - Confirm valid_through 2026-11-06 (already correct)
--
-- 2. Recruitment 1263:
--    - Fix organization_id from 17 (BPSC) to 1581 (WCDC Bihar)
--
-- 3. Existing posts 766 (Accountant) and 767 (Assistant):
--    - Add salary range and vacancy_details from official notification
--
-- 4. New posts for recruitment 1263:
--    - State Project Manager (Monitoring & Evaluation): 1 vacancy
--    - State Project Manager (Communication & Documentation): 1 vacancy
--    Both use position_id = 6 (generic OTHER) pending a dedicated position row.
--
-- No rows are deleted. No structural changes. All values come from the
-- official notification PDF verified by the owner.

BEGIN;

-- 1. Fix posting 858 organization and fill post names
UPDATE public.postings
SET
  organization_id = 1581,
  post_names = ARRAY[
    'State Project Manager (Monitoring & Evaluation)',
    'State Project Manager (Communication & Documentation)',
    'Accountant',
    'Assistant'
  ]::jsonb,
  apply_url = 'https://wcdc.bihar.gov.in'
WHERE id = 858;

-- 2. Fix recruitment 1263 organization
UPDATE public.recruitments
SET organization_id = 1581
WHERE id = 1263;

-- 3. Enrich existing posts with salary + vacancy details
UPDATE public.posts
SET
  salary_min = 25000,
  salary_max = 30000,
  vacancy_details = '{"ur":1,"ews":0,"obc":0,"sc":0,"st":0,"total":1}'::jsonb
WHERE id = 766; -- Accountant

UPDATE public.posts
SET
  salary_min = 18000,
  salary_max = 20000,
  vacancy_details = '{"ur":4,"ews":0,"obc":0,"sc":0,"st":0,"total":4}'::jsonb
WHERE id = 767; -- Assistant

-- 4. Insert missing State Project Manager posts
INSERT INTO public.posts
  (recruitment_id, position_id, name, slug, salary_min, salary_max, vacancy_total, vacancy_details, source_post_code)
VALUES
  (
    1263, 6,
    'State Project Manager (Monitoring & Evaluation)',
    'state-project-manager-monitoring-and-evaluation',
    50000, 60000,
    1,
    '{"ur":1,"ews":0,"obc":0,"sc":0,"st":0,"total":1}',
    '1'
  ),
  (
    1263, 6,
    'State Project Manager (Communication & Documentation)',
    'state-project-manager-communication-and-documentation',
    35000, 40000,
    1,
    '{"ur":1,"ews":0,"obc":0,"sc":0,"st":0,"total":1}',
    '2'
  )
ON CONFLICT DO NOTHING;

COMMIT;
