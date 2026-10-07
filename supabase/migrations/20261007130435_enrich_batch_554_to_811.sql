-- Enrichment batch 4: postings 292, 506, 554, 556, 557, 811
-- plus 12 marked attempted (various block/failure reasons).
--
-- Brief: docs/enrichment/ENRICHMENT_PIPELINE_BRIEF.md (rule 6: no pre-change
-- report for fill-only enrichment; enrichment_source is the audit trail).
-- Rollback: supabase/rollback/enrich_batch_554_to_811.down.sql
--
-- Scope: fills NULL fields only (COALESCE), and moves employment_type off the
-- column default FULL_TIME where the notification states the engagement type.
-- No non-NULL salary, age, link, deadline, vacancy, title or slug is overwritten.
-- Fields the notification does not state are left NULL.

-- 292 Andrew Yule & Co. Officer/Asst Manager/Dy Manager P&A
-- Source: https://www.andrewyule.com/pdf/Matter%20for%20Website%20regular_PnA_2026_13.pdf
--   employment_type FULL_TIME -> PERMANENT (permanent roll, General Division)
--   salary_min NULL -> 40000 (E1 grade minimum Rs.40,000)
--   salary_max NULL -> 180000 (E3 grade maximum Rs.1,80,000)
--   age_limit_max NULL -> 42 (E3 Dy Manager grade max; 32/37/42 across all grades)
--   apply_url NULL -> https://www.andrewyule.com (career portal)
UPDATE public.postings
SET
  employment_type   = 'PERMANENT',
  salary_min        = COALESCE(salary_min, 40000),
  salary_max        = COALESCE(salary_max, 180000),
  age_limit_max     = COALESCE(age_limit_max, 42),
  apply_url         = COALESCE(apply_url, 'https://www.andrewyule.com'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Permanent roll, General Division. E1 min Rs.40,000 to E3 max Rs.1,80,000/month. Age max 32/37/42 across Officer/AM/DM grades; stored max 42 (Dy Manager E3). Apply online at www.andrewyule.com career portal.'
WHERE id = 292 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 506 IIM Lucknow Research Assistant
-- Source: https://www.iiml.ac.in/sites/default/files/upload/jobs/245344228Advertisement_Res%20Asstt.pdf
--   employment_type FULL_TIME -> TEMPORARY (purely contractual, 11 months)
--   salary_max NULL -> 40000 (consolidated fixed Rs.40,000 + HRA; stored salary_min already 40000)
--   apply_url NULL -> https://forms.gle/kkMbJ1d9XGRWKqfGA (Google Form from notice)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 40000),
  apply_url         = COALESCE(apply_url, 'https://forms.gle/kkMbJ1d9XGRWKqfGA'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Purely contractual, 11 months initial. Consolidated fellowship Rs.40,000 + HRA per month (fixed; salary_max=salary_min=40000). No age limit stated. Apply via Google Form in notice by last date.'
WHERE id = 506 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 554 IIT Indore JRF (Chemistry, TB research)
-- Source: https://www.iiti.ac.in/uploads/career/2026/Sep/f8399a69f164303cb445c5ab63d9bd35.pdf
--   employment_type FULL_TIME -> FELLOWSHIP (JRF under funded project)
--   salary_max NULL -> 44440 (Rs.44,440/month incl 20% HRA; stored salary_min already 44440)
--   age_limit_min NULL -> 20 (age 20–25 years stated)
--   age_limit_max NULL -> 25
-- apply_url left NULL: application by email only (cvenkat@iiti.ac.in)
UPDATE public.postings
SET
  employment_type   = 'FELLOWSHIP',
  salary_max        = COALESCE(salary_max, 44440),
  age_limit_min     = COALESCE(age_limit_min, 20),
  age_limit_max     = COALESCE(age_limit_max, 25),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Project JRF, funded 2 years (Oct 2026–Sep 2028). Rs.44,440/month incl 20% HRA (fixed). Age 20–25 years. Apply by email to cvenkat@iiti.ac.in; apply_url left empty.'
WHERE id = 554 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 556 IIT Indore SRF (Physics, Standard Model)
-- Source: https://www.iiti.ac.in/uploads/career/2026/Sep/4ec4a1426edd6ba9e7ac079a653da475.pdf
--   employment_type FULL_TIME -> FELLOWSHIP (SRF under Anusandhan NRF project)
--   age_limit_max = 32 already stored (confirmed from source)
-- salary: "as per funding agency norms" — no rupee amount; left NULL
-- apply_url left NULL: application by email only (d.das@iiti.ac.in)
UPDATE public.postings
SET
  employment_type   = 'FELLOWSHIP',
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Project SRF, 6 months, Anusandhan NRF funded. Pay as per funding agency norms (no rupee amount stated). Age limit 32 (already stored, confirmed). Apply by email to d.das@iiti.ac.in CC phy_office@iiti.ac.in; apply_url left empty.'
WHERE id = 556 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 557 IIT (ISM) Dhanbad JRF (sponsored project)
-- Source: https://people.iitism.ac.in/~download/projectOpening//uploads/pdfprj/1284/Project%20JRF_2026-09-24_00-02-52.pdf
--   employment_type FULL_TIME -> FELLOWSHIP (JRF under sponsored project, 18 months)
--   salary_max NULL -> 37000 (Rs.37,000 + HRA; stored salary_min already 37000)
-- age limit: "as per Govt of India norms" only — no explicit number; left NULL
-- apply_url left NULL: application by email only
UPDATE public.postings
SET
  employment_type   = 'FELLOWSHIP',
  salary_max        = COALESCE(salary_max, 37000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Project JRF, 18 months or project completion. Rs.37,000 + HRA per month (fixed). Age as per GoI norms — no explicit year limit stated. Apply by email to madhulikagupta@iitism.ac.in; apply_url left empty.'
WHERE id = 557 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 811 AIC STPINEXT Incubation Manager
-- Source: https://stpi.in/sites/default/files/career-documents/notice13092026.pdf
--   employment_type FULL_TIME -> TEMPORARY (3-year contract, co-terminus with CoE)
--   salary_min NULL -> 50000, salary_max NULL -> 75000
--   age_limit_max NULL -> 35 ("Below 35 years; relaxation for deserving candidates")
-- apply_url already stored
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_min        = COALESCE(salary_min, 50000),
  salary_max        = COALESCE(salary_max, 75000),
  age_limit_max     = COALESCE(age_limit_max, 35),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = '3-year contract or co-terminus with CoE, whichever earlier. Salary Rs.50,000–75,000/month. Age below 35 (relaxable). apply_url already stored. Source: notice13092026.pdf.'
WHERE id = 811 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- ATTEMPTED / NOT ENRICHED (mark as aggregator)
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: scanned image PDF (OKEN Scanner), Hindi-language; no text layer.' WHERE id=965 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: scanned image PDF (CamScanner); no text layer.' WHERE id=1017 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: esb.mp.gov.in SSL certificate failure; file unreachable.' WHERE id=1014 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: recruitment.jharkhand.gov.in portal requires login/session to access job details.' WHERE id=1003 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: bckv.edu.in blocked by Cloudflare (HTML error, not PDF).' WHERE id=297 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: nio.res.in HTTP 403 (Anubis bot protection).' WHERE id=355 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: nio.res.in HTTP 403 (Anubis bot protection).' WHERE id=698 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: rites.com SSL certificate failure; file unreachable.' WHERE id=779 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: nio.res.in HTTP 403 (Anubis bot protection).' WHERE id=357 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: NCERT PDF is scanned image (Fujifilm Apeos scanner); no text layer.' WHERE id=679 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: iiserb.ac.in PDF URL returns login page (gated).' WHERE id=525 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: RBI site returned CAPTCHA page.' WHERE id=759 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: aiims.edu returned 504 Gateway Timeout.' WHERE id=248 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source='aggregator', enriched_at=NOW(), enrichment_notes='Attempted, not enriched: icgeb.org CAPTCHA/bot wall; PDF unreachable.' WHERE id=472 AND enrichment_source IS NULL;

-- Verify counts after running
SELECT enrichment_source, count(*) FROM public.postings WHERE status='ACTIVE' AND official_notification_url IS NOT NULL GROUP BY enrichment_source ORDER BY count DESC;
