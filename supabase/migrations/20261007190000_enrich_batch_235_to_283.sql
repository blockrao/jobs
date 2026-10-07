-- Enrichment batch: postings 235, 254, 260, 272, 283 — from official notifications.
--
-- Brief: docs/enrichment/ENRICHMENT_PIPELINE_BRIEF.md (rule 6: no pre-change
-- report for fill-only enrichment; enrichment_source is the audit trail).
-- Rollback: supabase/rollback/enrich_batch_235_to_283.down.sql
--
-- Scope: fills NULL fields only (COALESCE), and moves employment_type off the
-- column default FULL_TIME where the notification states the engagement type.
-- No non-NULL salary, age, link, deadline, vacancy, title or slug is overwritten.
-- Fields the notification does not state are left NULL.
--
-- How each source was read:
--   235, 272, 283: text-layer PDFs, read twice with independent extraction prompts.
--   254, 260: read page by page in a browser (260 is a scanned PDF).

-- 235 AIASL Dy. Chief Financial Officer
-- Source: https://www.aiasl.in/resources/Dy.CFO%20%20Recruitment%20exercise%20-%20AIASL.pdf
--   employment_type FULL_TIME -> TEMPORARY (fixed-term contract, 2 years + 1)
--   age_limit_max   NULL -> 62 (upper age limit as on 01.09.2026; no minimum stated)
--   apply_url       NULL -> https://www.aiasl.in/ (prescribed form on the official site)
-- Held for review, NOT changed: stored salary_max 200000, total_vacancies 2 and
-- "Chief Financial Officer (CFO)" in post_names are not supported by the notice
-- (one Dy.CFO post; pay 1,20,000 / 1,35,000 / 1,50,000 per month by year).
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  age_limit_max     = COALESCE(age_limit_max, 62),
  apply_url         = COALESCE(apply_url, 'https://www.aiasl.in/'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Fixed-term contract 2y+1 (cl.10); upper age 62 as on 01.09.2026, no minimum stated; apply by email with form from aiasl.in (cl.24). REVIEW, not changed: notice covers 1 Dy.CFO post paying 1,20,000-1,50,000/month; stored salary_max 200000, total_vacancies 2 and CFO in post_names are not in the notice.'
WHERE id = 235 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 254 AIIMS Delhi Research Associate II (CIMR, project N-2436)
-- Source: https://www.aiims.edu/images/pdf/recruitment/advertisement/CIMR-24-9-26.pdf
--   employment_type FULL_TIME -> TEMPORARY (purely contractual, initial 6 months)
--   salary_max      NULL -> 61000 (emoluments 61,000 + HRA 30%; base figure, HRA not added)
-- apply_url left NULL: applications by email only, no portal or form link.
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 61000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Purely contractual, initial 6 months (note i); emoluments 61,000 + HRA 30%, base stored and HRA excluded; upper age 40 as on 7 Oct 2026, no minimum stated; apply by email only, no portal, apply_url left empty.'
WHERE id = 254 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 260 AIIMS Jodhpur Project Nurse II (Dept of Pharmacology, ICMR project)
-- Source: https://aiimsjodhpur.edu.in/recruitment/Research/2026/1790402525_Adobe%20Scan%2026%20Sept%202026.pdf
--   employment_type FULL_TIME -> TEMPORARY (purely temporary, till May 2027)
--   salary_max      NULL -> 24000 (monthly emoluments, consolidated)
-- apply_url left NULL: walk-in interview, no online application.
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 24000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Scanned PDF read visually. Purely temporary, till May 2027, extendable with project (para 1); consolidated INR 24000/month; age limit 35 on interview date, no minimum stated; walk-in 7 Oct 2026 11 AM, no online application, apply_url left empty.'
WHERE id = 260 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 272 Akashvani Jalandhar Part Time Correspondent
-- Source: https://newsonair.gov.in/wp-content/uploads/2026/09/Jalandhar-8.pdf
--   employment_type FULL_TIME -> PART_TIME (Part Time Correspondents on contractual basis)
-- No pay, age limit or vacancy count is stated in the notice; those stay NULL.
UPDATE public.postings
SET
  employment_type   = 'PART_TIME',
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Part Time Correspondents on contractual basis: PART_TIME chosen over TEMPORARY. Notice states no pay, no age limit and no vacancy count; applications by post to Head of Office, Akashvani Jalandhar by 7 Oct 2026.'
WHERE id = 272 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 283 APCOB Chief Business Development Officer
-- Source: https://apcob.bank.in/wp-content/uploads/2026/09/Notification_CBDO-approved.pdf
--   employment_type FULL_TIME -> TEMPORARY (contractual, 1 year, extendable annually)
--   age_limit_min   NULL -> 40, age_limit_max NULL -> 62 (as on 01.09.2026)
-- Pay is "market-linked" with no amount stated; salary stays NULL.
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  age_limit_min     = COALESCE(age_limit_min, 40),
  age_limit_max     = COALESCE(age_limit_max, 62),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Contractual, 1 year, extendable annually (Sec III); age minimum 40, maximum 62 as on 01.09.2026 (Sec II); pay market-linked, no amount stated (Sec IV); application by post or email, proforma on apcob.bank.in (Sec VIII).'
WHERE id = 283 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- Guard: all five rows must have been updated, otherwise fail the migration.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.postings
  WHERE id IN (235, 254, 260, 272, 283)
    AND enrichment_source = 'official_notification';
  IF n <> 5 THEN
    RAISE EXCEPTION 'enrich_batch_235_to_283: expected 5 enriched rows, found %', n;
  END IF;
END $$;
