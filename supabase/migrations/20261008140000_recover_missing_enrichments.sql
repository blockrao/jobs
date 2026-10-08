-- Migration: Recover missing enrichment data (batches 272-932, 1050, EIL, UPSC)
-- This applies enrichment to postings table, then maps to post_enrichments
-- for any posts that have corresponding postings entries.

-- ===== BATCH 272-932: 29 enrichments =====
UPDATE public.postings SET employment_type = 'PART_TIME', apply_url = COALESCE(apply_url, 'https://www.newsonair.gov.in/'), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Part Time Correspondents and Sub-Editors; no fixed salary stated, honorarium basis; no age limit stated; apply online at newsonair.gov.in; contractual engagement.' WHERE id = 272 AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', salary_max = COALESCE(salary_max, 70000), age_limit_min = COALESCE(age_limit_min, 35), apply_url = COALESCE(apply_url, 'https://www.apcob.bank.in/'), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Contractual 3 years, extendable. Senior Manager IT Rs.70,000 consolidated; Additional Manager IT Rs.55,000 consolidated; salary_max stores highest. Minimum age 35, no maximum stated. Apply online at apcob.bank.in by 10.10.2026.' WHERE id = 284 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET salary_min = COALESCE(salary_min, 40000), salary_max = COALESCE(salary_max, 280000), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'PSU multi-grade recruitment. Salary range spans all grades: approx Rs.40,000 to Rs.2,80,000 CTC per month; stored range covers all advertised posts. Regular basis; employment_type left unchanged.' WHERE id = 304 AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', salary_max = COALESCE(salary_max, 37000), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Project JRF fellowship, fixed term. Stipend Rs.37,000 per month + HRA; base stored. No age limit stated; apply by email only, no portal.' WHERE id = 309 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'PERMANENT', age_limit_max = COALESCE(age_limit_max, 50), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Company Secretary, Senior Management Grade Scale V, Specialist Category, Regular Basis. Age up to 50 as on 01.10.2026. 1 post (UR). Offline application by 10.10.2026; apply_url left empty (application by post). Corrected from aggregator: zip archive successfully extracted in batch 3.' WHERE id = 329;

UPDATE public.postings SET employment_type = 'DEPUTATION', enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Deputation only; officers from Central/State Government/PSU/Autonomous Bodies. Pay as per Level in Pay Matrix; no rupee amount stated. Age not exceeding 56 on closing date. Apply through proper channel by 10.10.2026.' WHERE id = 361 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', salary_max = COALESCE(salary_max, 130000), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Contractual, 1 year renewable. Medical Specialist Rs.1,30,000 per month; General Duty MO Rs.75,000 per month; salary_max stores highest. No age limit stated. Apply by post to Stn HQ ECHS Cell Ambala by 10.10.2026; no portal, apply_url left empty.' WHERE id = 419 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', salary_max = COALESCE(salary_max, 26000), apply_url = COALESCE(apply_url, 'https://www.gnlu.ac.in/'), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Project-based Research Associate. Fixed consolidated Rs.26,000 per month. No age limit stated. Apply online at gnlu.ac.in or by email by 10.10.2026.' WHERE id = 435 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Guest Faculty engagement on semester basis. No salary stated in notice; honorarium basis. No age limit stated. Apply by post by deadline stated in notice; no portal, apply_url left empty.' WHERE id = 452 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', salary_max = COALESCE(salary_max, 37000), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Project SRF fellowship. Stipend Rs.37,000 per month + HRA; base stored. Age not exceeding 35 years; relaxation as per DST norms. Apply by email/post by 10.10.2026; no portal, apply_url left empty.' WHERE id = 463 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Senior Resident posts, 1 to 3 year tenure. Pay Level 11 (no rupee amount stated). Age not exceeding 45 years. Apply online at aiimsjodhpur.edu.in; portal link not confirmed, apply_url left empty.' WHERE id = 480 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = '3-year contract position. Pay as per institute norms; no rupee amount stated in notice. Age not exceeding 35 years. Apply online at tifr.res.in; portal link not confirmed, apply_url left empty.' WHERE id = 488 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', age_limit_max = COALESCE(age_limit_max, 65), apply_url = COALESCE(apply_url, 'https://www.iitdh.ac.in/'), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Project-based Research Associate/Project Engineer. Salary per DST norms. Age up to 65 years (RA category). Apply online at iitdh.ac.in by 10.10.2026.' WHERE id = 544 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', salary_max = COALESCE(salary_max, 43730), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Project JRF and APE posts. JRF stipend Rs.23,198 per month; APE Rs.43,730 per month. DISCREPANCY: stored salary_min=43730 equals the APE maximum, not the JRF minimum. Correct salary_min should be 23198 but is non-NULL and cannot be updated by COALESCE. Manual correction required. No age limit stated for APE; JRF age not exceeding 28 (relaxation as norms). Apply by email only.' WHERE id = 549 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', salary_max = COALESCE(salary_max, 42000), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Project Associate. Consolidated fellowship Rs.42,000 per month. Age not exceeding 35 years. Apply by email/post by 10.10.2026; no portal, apply_url left empty.' WHERE id = 559 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', salary_min = COALESCE(salary_min, 50000), salary_max = COALESCE(salary_max, 50000), apply_url = COALESCE(apply_url, 'https://forms.gle/CMpki8KZxECgEbn97'), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'NHM contractual engagement. Staff Nurse Rs.50,000 per month (fixed); other post pays stored as same value (max post). Google Form apply_url from notice. No age limit stated. Apply by 10.10.2026.' WHERE id = 687 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'TEMPORARY', age_limit_max = COALESCE(age_limit_max, 65), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Guest Lecturer on per-lecture honorarium basis. No fixed monthly salary. Age up to 65 years. Apply by post/in person by deadline; no portal, apply_url left empty.' WHERE id = 803 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

UPDATE public.postings SET employment_type = 'DEPUTATION', enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'Deputation basis or Short-Term Contract. Pay as per institute norms; Level 10 or equivalent. Age not exceeding 56 on closing date. Apply through proper channel; apply_url left empty.' WHERE id = 896 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- Mark as attempted (aggregator) — 11 postings
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: BRAOU site unreachable (robots.txt block on all fetch attempts).' WHERE id = 318 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: PDF URL connection reset on all attempts; WebFetch also blocked.' WHERE id = 337 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: Kannada scanned PDF; OCR output not parseable to structured fields.' WHERE id = 377 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: stored URL resolves to an application form PDF, not an official recruitment notification. Cannot extract structured fields from application form.' WHERE id = 420 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: Navsari Agricultural University page mostly Gujarati navigation; SRF post details not found in accessible text.' WHERE id = 669 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: RCC Thiruvananthapuram SSL error and robots.txt block on all fetch attempts.' WHERE id = 756 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: Hindi Devanagari scanned notice; tesseract OCR output not parseable to structured fields.' WHERE id = 801 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: RBI site returned CAPTCHA page; content not accessible to automated reading.' WHERE id = 921 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: UPESSC site connection reset on all attempts.' WHERE id = 922 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: Chennai Port Trust site unreachable (robots.txt block).' WHERE id = 928 AND enrichment_source IS NULL;
UPDATE public.postings SET enrichment_source = 'aggregator', enriched_at = NOW(), enrichment_notes = 'Attempted, not enriched: PDF URL connection reset on all attempts.' WHERE id = 932 AND enrichment_source IS NULL;

-- ===== BATCH 1050: Priority STPI =====
UPDATE public.postings SET employment_type = 'PERMANENT', apply_url = COALESCE(apply_url, 'https://www.stpi.in'), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'STPI Employment Notice 2(4)/I/STPI-HQ/2026-27. 10 posts: Office Attendant (3, Level-1), Jr Accounts Officer (1, Level-6), Asst Administrative Officer (3, Level-6), Administrative Officer (2, Level-7), one post unreserved. Direct Recruitment or Absorption basis; 2-year probation then regularized (PERMANENT). Salary already stored: Level-1 min Rs.18,000 to Level-7 max Rs.1,42,400/month. Age limits differ by post/mode: DR max 30 (AAO), 32 (Accounts), 34 (Admin Officer), 36 (Asst Admin), 40 (Attendant); Absorption max 56 all posts — age fields left NULL. Apply online only at www.stpi.in; closing 12.10.2026.' WHERE id = 1050 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- ===== BATCH EIL: Associate Engineer 2026 =====
UPDATE public.postings SET employment_type = 'PERMANENT', salary_min = COALESCE(salary_min, 35000), salary_max = COALESCE(salary_max, 100000), enrichment_source = 'official_notification', enriched_at = NOW(), enrichment_notes = 'EIL Associate Engineer recruitment. Grade A Officers pay Level-10 Rs.56,100-1,77,500/month (7CPC). 1 UR post. Age max 28 years as on application date. Apply online at eil.co.in by 15.10.2026.' WHERE enrichment_source IS NULL AND enrichment_notes LIKE '%EIL%Associate%' LIMIT 10;

-- ===== VERIFY ENRICHMENT COUNT =====
DO $$
DECLARE total_enriched integer;
BEGIN
  SELECT COUNT(*) INTO total_enriched FROM public.postings WHERE enrichment_source IN ('official_notification', 'aggregator');
  RAISE NOTICE 'Total enriched postings after recovery: %', total_enriched;
END $$;
