-- FACT Engineer (IT) Recruitment 2026 — data enrichment from official notification.
--
-- Pre-change report: docs/pre-change/FACT_ENGINEER_IT_ENRICH.md
-- Source: Official notification No. 7/2026 dated 01.10.2026
--   https://fact.co.in/images/upload/Recruitment-Notification-7-2026---Engineer-(IT)_3057.pdf
-- Status: APPROVED BY OWNER (PDF uploaded and reviewed)
--
-- Posting 976: fact-engineer-recruitment-2026-apply-online-b3560b
-- Org 1677: The Fertilisers and Chemicals Travancore Limited (FACT) — already correct
--
-- Changes:
--   1. employment_type: FULL_TIME → TEMPORARY (Fixed Tenure Contract, adhoc basis;
--      no CONTRACT enum value exists; TEMPORARY is the closest)
--   2. salary_max: NULL → 31000 (consolidated fixed pay, same as salary_min)
--   3. age_limit_min: NULL → 18  (per clause 1: "above 18 years")
--   4. age_limit_max: NULL → 35  (per clause 1: "Less than 35 years as on 01.10.2026")
--   5. apply_url: NULL → https://www.fact.co.in/careers  (official portal per notification §14)
--
-- Not changed:
--   - valid_through: 2026-10-14 already correct (online form deadline §14e)
--   - total_vacancies: left NULL — notification forms a panel, not a fixed-count hire
--   - post_names: ['Engineer (IT)'] already correct
--   - official_notification_url: already set and correct
--   - title: acceptable as-is

BEGIN;

UPDATE public.postings
SET
  employment_type    = 'TEMPORARY',
  salary_max         = 31000,
  age_limit_min      = 18,
  age_limit_max      = 35,
  apply_url          = 'https://www.fact.co.in/careers'
WHERE id = 976;

COMMIT;
