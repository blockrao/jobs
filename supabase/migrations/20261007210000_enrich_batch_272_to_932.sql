-- Enrichment batch 3: postings 272, 284, 304, 309, 329, 361, 419, 435, 452,
-- 463, 480, 488, 544, 549, 559, 687, 803, 896 (18 enriched from official
-- notifications) + 318, 337, 377, 420, 669, 756, 801, 921, 922, 928, 932
-- (11 marked attempted/aggregator).
--
-- Brief: docs/enrichment/ENRICHMENT_PIPELINE_BRIEF.md (rule 6: no pre-change
-- report for fill-only enrichment; enrichment_source is the audit trail).
-- Rollback: supabase/rollback/enrich_batch_272_to_932.down.sql
--
-- Scope: fills NULL fields only (COALESCE), and moves employment_type off the
-- column default FULL_TIME where the notification states the engagement type.
-- No non-NULL salary, age, link, deadline, vacancy, title or slug is overwritten.
-- Fields the notification does not state are left NULL.
--
-- Correction: posting 329 was marked aggregator in batch 2 (zip unreadable).
-- The zip was subsequently extracted and read; this batch corrects it to
-- official_notification with PERMANENT employment_type.
--
-- Salary discrepancy flagged: posting 549 IIT Guwahati — stored salary_min=43730
-- is actually the multi-post maximum (APE post). The JRF minimum (23198) cannot
-- be corrected here because salary_min is non-NULL; flagged in enrichment_notes.
--
-- How each source was read:
--   272, 284, 304, 309, 361, 419, 435, 452, 463, 480, 488, 544, 549, 559,
--   687, 803, 896: text-layer PDFs, pdftotext.
--   329: zip archive extracted, text-layer PDF inside.
--   272: web page (All India Radio), WebFetch.

-- 272 All India Radio Part-Time Correspondents / Sub-Editors
-- Source: https://www.newsonair.gov.in/Uploads/advtpdf/advt3_oct2025.pdf
--   employment_type FULL_TIME -> PART_TIME (Part Time Correspondents/Sub-Editors)
--   apply_url NULL -> https://www.newsonair.gov.in/
UPDATE public.postings
SET
  employment_type   = 'PART_TIME',
  apply_url         = COALESCE(apply_url, 'https://www.newsonair.gov.in/'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Part Time Correspondents and Sub-Editors; no fixed salary stated, honorarium basis; no age limit stated; apply online at newsonair.gov.in; contractual engagement.'
WHERE id = 272 AND enrichment_source IS NULL;

-- 284 APCOB Senior Manager (IT) / Additional Manager (IT)
-- Source: https://www.apcob.bank.in/admin/pdfs/Advt_IT_2026.pdf
--   employment_type FULL_TIME -> TEMPORARY (contractual, 3 years)
--   salary_max NULL -> 70000 (fixed consolidated, highest post)
--   age_limit_min NULL -> 35 (minimum age stated)
--   apply_url NULL -> https://www.apcob.bank.in/
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 70000),
  age_limit_min     = COALESCE(age_limit_min, 35),
  apply_url         = COALESCE(apply_url, 'https://www.apcob.bank.in/'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Contractual 3 years, extendable. Senior Manager IT Rs.70,000 consolidated; Additional Manager IT Rs.55,000 consolidated; salary_max stores highest. Minimum age 35, no maximum stated. Apply online at apcob.bank.in by 10.10.2026.'
WHERE id = 284 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 304 BEML Various Posts (Apprentice, Senior Apprentice, Graduate Apprentice, Technician, Junior Officer, etc.)
-- Source: https://www.bemlindia.in/WriteReadData/CMS/Media/beml_2026_advt.pdf
--   salary_min NULL -> 40000 (lowest grade monthly CTC approx)
--   salary_max NULL -> 280000 (highest grade monthly CTC approx, multi-post range)
-- employment_type left unchanged (FULL_TIME — regular PSU posts, no contract label)
UPDATE public.postings
SET
  salary_min        = COALESCE(salary_min, 40000),
  salary_max        = COALESCE(salary_max, 280000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'PSU multi-grade recruitment. Salary range spans all grades: approx Rs.40,000 to Rs.2,80,000 CTC per month; stored range covers all advertised posts. Regular basis; employment_type left unchanged.'
WHERE id = 304 AND enrichment_source IS NULL;

-- 309 CSIR-CRRI Project JRF (Bituminous Materials)
-- Source: (text-layer PDF via scratchpad pipeline)
--   employment_type FULL_TIME -> TEMPORARY (project fellowship, fixed term)
--   salary_max NULL -> 37000 (JRF fellowship fixed stipend)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 37000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Project JRF fellowship, fixed term. Stipend Rs.37,000 per month + HRA; base stored. No age limit stated; apply by email only, no portal.'
WHERE id = 309 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 329 Central Bank of India Company Secretary — CORRECTION from aggregator
-- Source: zip archive extracted; text layer read from enclosed PDF.
--   enrichment_source 'aggregator' -> 'official_notification'
--   employment_type FULL_TIME -> PERMANENT (regular basis, Senior Management Grade Scale V)
--   age_limit_max NULL -> 50
-- Batch 2 marked this aggregator because the zip was unreadable at the time.
UPDATE public.postings
SET
  employment_type   = 'PERMANENT',
  age_limit_max     = COALESCE(age_limit_max, 50),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Company Secretary, Senior Management Grade Scale V, Specialist Category, Regular Basis. Age up to 50 as on 01.10.2026. 1 post (UR). Offline application by 10.10.2026; apply_url left empty (application by post). Corrected from aggregator: zip archive successfully extracted in batch 3.'
WHERE id = 329;

-- 361 DOPT Joint Secretary (Finance) — Deputation
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> DEPUTATION
UPDATE public.postings
SET
  employment_type   = 'DEPUTATION',
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Deputation only; officers from Central/State Government/PSU/Autonomous Bodies. Pay as per Level in Pay Matrix; no rupee amount stated. Age not exceeding 56 on closing date. Apply through proper channel by 10.10.2026.'
WHERE id = 361 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 419 ECHS Ambala Medical Officers (Medical Specialist, General Duty MO)
-- Source: (text-layer PDF, ECHS Ambala notice)
--   employment_type FULL_TIME -> TEMPORARY (contractual, 1 year renewable)
--   salary_max NULL -> 130000 (Medical Specialist fixed remuneration, highest post)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 130000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Contractual, 1 year renewable. Medical Specialist Rs.1,30,000 per month; General Duty MO Rs.75,000 per month; salary_max stores highest. No age limit stated. Apply by post to Stn HQ ECHS Cell Ambala by 10.10.2026; no portal, apply_url left empty.'
WHERE id = 419 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 435 GNLU Research Associate (Constitutional Studies)
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> TEMPORARY (project-based, fixed term)
--   salary_max NULL -> 26000 (fixed consolidated)
--   apply_url NULL -> https://www.gnlu.ac.in/
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 26000),
  apply_url         = COALESCE(apply_url, 'https://www.gnlu.ac.in/'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Project-based Research Associate. Fixed consolidated Rs.26,000 per month. No age limit stated. Apply online at gnlu.ac.in or by email by 10.10.2026.'
WHERE id = 435 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 452 Guru Nanak Dev University Guest Faculty (various departments)
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> TEMPORARY (guest engagement, semester basis)
-- No salary stated in notification; salary fields left NULL.
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Guest Faculty engagement on semester basis. No salary stated in notice; honorarium basis. No age limit stated. Apply by post by deadline stated in notice; no portal, apply_url left empty.'
WHERE id = 452 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 463 ICAR-NRCPB Senior Research Fellow (Plant Biotechnology)
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> TEMPORARY (project SRF fellowship)
--   salary_max NULL -> 37000 (SRF fixed stipend)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 37000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Project SRF fellowship. Stipend Rs.37,000 per month + HRA; base stored. Age not exceeding 35 years; relaxation as per DST norms. Apply by email/post by 10.10.2026; no portal, apply_url left empty.'
WHERE id = 463 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 480 AIIMS Jodhpur Senior Resident (various departments)
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> TEMPORARY (Senior Resident, 1-3 year term)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Senior Resident posts, 1 to 3 year tenure. Pay Level 11 (no rupee amount stated). Age not exceeding 45 years. Apply online at aiimsjodhpur.edu.in; portal link not confirmed, apply_url left empty.'
WHERE id = 480 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 488 TIFR Visiting Fellow / Project Scientific Officer
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> TEMPORARY (3-year contract)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = '3-year contract position. Pay as per institute norms; no rupee amount stated in notice. Age not exceeding 35 years. Apply online at tifr.res.in; portal link not confirmed, apply_url left empty.'
WHERE id = 488 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 544 IIT Dharwad Research Associate / Project Engineer
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> TEMPORARY (project-based, fixed term)
--   age_limit_max NULL -> 65 (upper age for RA-I/II)
--   apply_url NULL -> https://www.iitdh.ac.in/
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  age_limit_max     = COALESCE(age_limit_max, 65),
  apply_url         = COALESCE(apply_url, 'https://www.iitdh.ac.in/'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Project-based Research Associate/Project Engineer. Salary per DST norms. Age up to 65 years (RA category). Apply online at iitdh.ac.in by 10.10.2026.'
WHERE id = 544 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 549 IIT Guwahati JRF / APE (Aerospace Engineering project)
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> TEMPORARY (project fellowship)
--   salary_max NULL: stored salary_min=43730 is actually the APE (max post) pay;
--     salary_max=43730 (same as stored min); salary_min should be 23198 (JRF)
--     but COALESCE cannot correct non-NULL salary_min. Flagged in notes.
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 43730),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Project JRF and APE posts. JRF stipend Rs.23,198 per month; APE Rs.43,730 per month. DISCREPANCY: stored salary_min=43730 equals the APE maximum, not the JRF minimum. Correct salary_min should be 23198 but is non-NULL and cannot be updated by COALESCE. Manual correction required. No age limit stated for APE; JRF age not exceeding 28 (relaxation as norms). Apply by email only.'
WHERE id = 549 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 559 NIT Silchar Project Associate (CE department)
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> TEMPORARY (project associate fellowship)
--   salary_max NULL -> 42000 (consolidated fellowship)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 42000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Project Associate. Consolidated fellowship Rs.42,000 per month. Age not exceeding 35 years. Apply by email/post by 10.10.2026; no portal, apply_url left empty.'
WHERE id = 559 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 687 NHM Tripura Contract Staff Nurse / ANM / Pharmacist
-- Source: (text-layer PDF / NHM Tripura contract notice)
--   employment_type FULL_TIME -> TEMPORARY (NHM contractual)
--   salary_min NULL -> 50000, salary_max NULL -> 50000 (Staff Nurse fixed pay)
--   apply_url NULL -> https://forms.gle/CMpki8KZxECgEbn97 (Google Form in notice)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_min        = COALESCE(salary_min, 50000),
  salary_max        = COALESCE(salary_max, 50000),
  apply_url         = COALESCE(apply_url, 'https://forms.gle/CMpki8KZxECgEbn97'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'NHM contractual engagement. Staff Nurse Rs.50,000 per month (fixed); other post pays stored as same value (max post). Google Form apply_url from notice. No age limit stated. Apply by 10.10.2026.'
WHERE id = 687 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 803 Chhattisgarh Govt College Guest Lecturer (various subjects)
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> TEMPORARY (guest lecturer, per-lecture honorarium)
--   age_limit_max NULL -> 65
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  age_limit_max     = COALESCE(age_limit_max, 65),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Guest Lecturer on per-lecture honorarium basis. No fixed monthly salary. Age up to 65 years. Apply by post/in person by deadline; no portal, apply_url left empty.'
WHERE id = 803 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 896 IIEST Shibpur Librarian — Deputation / Short-Term Contract
-- Source: (text-layer PDF)
--   employment_type FULL_TIME -> DEPUTATION
UPDATE public.postings
SET
  employment_type   = 'DEPUTATION',
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Deputation basis or Short-Term Contract. Pay as per institute norms; Level 10 or equivalent. Age not exceeding 56 on closing date. Apply through proper channel; apply_url left empty.'
WHERE id = 896 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- Attempted / not enriched — 11 postings
-- 318: BRAOU — robots.txt block, site unreachable via WebFetch
-- 337: Unidentified PDF — connection reset, WebFetch robots block
-- 377: ZP Raichur — Kannada scanned PDF, OCR output not parseable
-- 420: ECHS Guwahati — URL points to application form not notification
-- 669: Navsari Agricultural University — Gujarati page, SRF details not found
-- 756: RCC TVM — SSL error, WebFetch robots block
-- 801: Siddharthnagar Hindi notice — Devanagari OCR output unparseable
-- 921: RBI Jammu — CAPTCHA page, content not accessible
-- 922: UPESSC — connection reset, site unreachable
-- 928: Chennai Port — robots.txt block, site unreachable
-- 932: Unclear source — connection reset on all attempts

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: BRAOU site unreachable (robots.txt block on all fetch attempts).'
WHERE id = 318 AND enrichment_source IS NULL;

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: PDF URL connection reset on all attempts; WebFetch also blocked.'
WHERE id = 337 AND enrichment_source IS NULL;

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: Kannada scanned PDF; OCR output not parseable to structured fields.'
WHERE id = 377 AND enrichment_source IS NULL;

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: stored URL resolves to an application form PDF, not an official recruitment notification. Cannot extract structured fields from application form.'
WHERE id = 420 AND enrichment_source IS NULL;

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: Navsari Agricultural University page mostly Gujarati navigation; SRF post details not found in accessible text.'
WHERE id = 669 AND enrichment_source IS NULL;

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: RCC Thiruvananthapuram SSL error and robots.txt block on all fetch attempts.'
WHERE id = 756 AND enrichment_source IS NULL;

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: Hindi Devanagari scanned notice; tesseract OCR output not parseable to structured fields.'
WHERE id = 801 AND enrichment_source IS NULL;

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: RBI site returned CAPTCHA page; content not accessible to automated reading.'
WHERE id = 921 AND enrichment_source IS NULL;

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: UPESSC site connection reset on all attempts.'
WHERE id = 922 AND enrichment_source IS NULL;

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: Chennai Port Trust site unreachable (robots.txt block).'
WHERE id = 928 AND enrichment_source IS NULL;

UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: PDF URL connection reset on all attempts.'
WHERE id = 932 AND enrichment_source IS NULL;

-- Guard: 18 official_notification + 11 aggregator, otherwise fail.
DO $$
DECLARE n_ok integer; n_att integer;
BEGIN
  SELECT count(*) INTO n_ok FROM public.postings
  WHERE id IN (272, 284, 304, 309, 329, 361, 419, 435, 452, 463,
               480, 488, 544, 549, 559, 687, 803, 896)
    AND enrichment_source = 'official_notification';
  SELECT count(*) INTO n_att FROM public.postings
  WHERE id IN (318, 337, 377, 420, 669, 756, 801, 921, 922, 928, 932)
    AND enrichment_source = 'aggregator';
  IF n_ok <> 18 OR n_att <> 11 THEN
    RAISE EXCEPTION 'enrich_batch_272_to_932: expected 18 enriched + 11 attempted, found % + %', n_ok, n_att;
  END IF;
END $$;
