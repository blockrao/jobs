-- Enrichment batch 2: postings 256, 257, 273, 317, 326, 364, 368, 418, 426, 440
-- from official notifications, plus 329 marked as attempted (unreadable source).
--
-- Brief: docs/enrichment/ENRICHMENT_PIPELINE_BRIEF.md (rule 6: no pre-change
-- report for fill-only enrichment; enrichment_source is the audit trail).
-- Rollback: supabase/rollback/enrich_batch_256_to_440.down.sql
--
-- Scope: fills NULL fields only (COALESCE), and moves employment_type off the
-- column default FULL_TIME where the notification states the engagement type.
-- No non-NULL salary, age, link, deadline, vacancy, title or slug is overwritten.
-- Fields the notification does not state are left NULL.
--
-- Multi-post notices: salary is stored as the range across posts; an age limit
-- is stored only when it is the same for every post, otherwise left NULL with
-- the per-post limits in enrichment_notes.
--
-- How each source was read:
--   273, 364, 368, 426: text-layer PDFs, read twice with independent prompts.
--   256, 257, 317, 326, 418, 440: read page by page in a browser (257, 326,
--   418 and 440 are scanned PDFs; 317 is in Hindi).

-- 256 AIIMS Delhi Senior Project Associate (Gastroenterology)
-- Source: https://www.aiims.edu/images/pdf/recruitment/advertisement/gastro-26-9-26.pdf
--   employment_type FULL_TIME -> TEMPORARY (hired for 2 years on a project)
-- No pay is stated. apply_url left NULL: applications by email only.
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Project position, duration of hire 2 years; age limit 40, no minimum stated; no pay stated in the notice; apply by email only by 10 Oct 2026, no portal, apply_url left empty.'
WHERE id = 256 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 257 AIIMS Delhi Staff Nurse equivalent to Project Nurse-III (CCM, N-2380)
-- Source: https://www.aiims.edu/images/pdf/recruitment/advertisement/ccm-25-9-26.pdf
--   employment_type FULL_TIME -> TEMPORARY (purely temporary, duration one year)
--   salary_max      NULL -> 28000 (Rs.28000/- + HRA per month; base figure, HRA not added)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 28000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Scanned PDF read visually. Purely temporary, duration one year; salary Rs.28000 + HRA per month, base stored and HRA excluded; age limit 30 (relaxation SC/ST 5, OBC 3), no minimum stated; Google form link in notice matches stored apply_url; last date 10 Oct 2026 5 PM.'
WHERE id = 257 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 273 Alliance Air Aviation Paramedics
-- Source: https://plone.allianceair.in/allianceair/en/assets/careers/paramedics-advertisement-25-09-2026.pdf
--   employment_type FULL_TIME -> TEMPORARY (Fixed Term Employment Agreement)
--   salary_max      NULL -> 30000 (INR 30,000 gross per month approx)
-- apply_url left NULL: application by post; form is on the careers page of
-- www.allianceair.in, which could not be opened to confirm the link.
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 30000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Fixed Term Employment Agreement, extendable, length not stated; INR 30,000 gross per month (approx); maximum age 40 as on 25.09.2026, no minimum stated; application by post by 10.10.2026 17:00, form on careers page of www.allianceair.in (link not verified, apply_url left empty).'
WHERE id = 273 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 317 BPSSC Company Commander (Gulma Samadeshak), Advt 11/2026
-- Source: https://bpssc.bihar.gov.in/Notices/Advt%20No.-11-2026.pdf
--   apply_url NULL -> https://bpssc.bihar.gov.in/ (online application on the Commission site)
-- Pay is given as Level-6 with no rupee amount; salary stays NULL.
-- employment_type not changed: the notice does not use a contract/regular label.
UPDATE public.postings
SET
  apply_url         = COALESCE(apply_url, 'https://bpssc.bihar.gov.in/'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Hindi notice read visually (page 1) plus one text read. Pay scale Level-6, no rupee amount stated, salary left empty; 65 posts; age 24 to 50 as stored; online application 10.09.2026 to 10.10.2026 on bpssc.bihar.gov.in (Home Guard tab); engagement type not labelled, employment_type left unchanged.'
WHERE id = 317 AND enrichment_source IS NULL;

-- 326 CAU Senior Research Fellow (College of Agriculture, Kyrdemkulai)
-- Source: https://cau.ac.in/wp-content/uploads/2026/09/1227.pdf
--   employment_type FULL_TIME -> TEMPORARY (temporary, period of 5 months)
--   salary_max      NULL -> 37000 (Rs.37000/- + HRA per month; base figure, HRA not added)
-- apply_url left NULL: applications by email, interview on 12 Oct 2026.
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 37000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Scanned PDF read visually (page 1). Post temporary for a period of 5 months; salary Rs.37000 + HRA per month, base stored and HRA excluded; no age limit stated on the notice; apply by email before 10 Oct 2026, interview 12 Oct 2026 11 AM; no portal, apply_url left empty.'
WHERE id = 326 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 329 Central Bank of India Company Secretary: attempted, not enriched (rule 4).
-- The stored link is the bank's recruitment listing page; the notification
-- itself is a .zip archive that this pipeline cannot read.
UPDATE public.postings
SET
  enrichment_source = 'aggregator',
  enriched_at       = NOW(),
  enrichment_notes  = 'Attempted, not enriched: official notification is a .zip on the bank recruitment listing page and could not be read. Listing entry says Senior Management Grade Scale V, regular basis, offline application by 10.10.2026.'
WHERE id = 329 AND enrichment_source IS NULL;

-- 364 CURAJ Sports Manager, Store In-Charge, Consultant (Store), Advt 6842
-- Source: https://curaj.ac.in/sites/default/files/Advt.No.%206842%20dated%20%2009.09.2026%20for%20the%20post%20of%20Sports%20%28contractual%20basis%29%20%281%29%20%281%29.pdf
--   employment_type FULL_TIME -> TEMPORARY (purely contractual, one year)
--   apply_url       NULL -> https://curaj.ac.in/ (online application on the university site)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  apply_url         = COALESCE(apply_url, 'https://curaj.ac.in/'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Purely contractual, one year or till further orders. Sports Manager Rs.47,500 and Store In-Charge Rs.39,200 per month consolidated, maximum age 30 each; Consultant (Store) is task-based with no fixed pay and maximum age preferably 65. Online application on curaj.ac.in by 10 Oct 2026, hard copy by 15 Oct 2026. Notice states no number of posts.'
WHERE id = 364 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 368 CUTN Consultant (Civil) and Technical Assistant (HVAC)
-- Source: https://cutn.ac.in/wp-content/uploads/2026/09/Advt_for_Contract_Post_25092026.pdf
--   employment_type FULL_TIME -> TEMPORARY (initial engagement 6 months / 1 year)
--   salary_max      NULL -> 65000 (highest consolidated remuneration across the two posts)
-- Age limits differ by post (65 and 35) and are left NULL.
-- Held for review, NOT changed: stored salary_min 65000; the notice's lowest
-- pay is 29,200 (Technical Assistant).
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 65000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Contract posts. Consultant (Civil): Rs.65,000 per month, maximum age 65, initial 6 months. Technical Assistant (HVAC): Rs.29,200 per month, maximum age 35, initial one year. Age limits differ by post so left empty. Application by post by 10.10.2026, apply_url left empty. REVIEW, not changed: stored salary_min 65000 but the lowest pay in the notice is 29,200.'
WHERE id = 368 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 418 ECHS Karwar Medical Officer
-- Source: https://www.echs.gov.in/assets/advertisement/Ban.pdf
--   employment_type FULL_TIME -> TEMPORARY (contractual, 1 year / 11 months, renewable)
--   salary_max      NULL -> 95000 (fixed remuneration)
--   apply_url       NULL -> https://www.echs.gov.in/ (terms and application form on the ECHS site)
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 95000),
  apply_url         = COALESCE(apply_url, 'https://www.echs.gov.in/'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Scanned PDF read visually. Contractual, one year (ex-servicemen) or 11 months (civilians), renewable; fixed remuneration Rs.95,000; 1 vacancy; no age limit stated; application form on echs.gov.in, submitted to Stn HQ (ECHS Cell) Karwar by 5 PM on 10 Oct 2026; interview third week of Oct 2026.'
WHERE id = 418 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- 426 Exim Bank Deputy Manager (JM I) and Manager (MM II), special recruitment drive
-- Source: https://www.eximbankindia.in/sites/default/files/2026-09/Detailed%20SRD%20Advertisement%20for%20Website.pdf
--   salary_min NULL -> 48480, salary_max NULL -> 93960 (basic pay bands across the two grades)
-- Age limits differ by post and category and are left NULL.
-- employment_type not changed: the notice does not use a contract/regular label.
UPDATE public.postings
SET
  salary_min        = COALESCE(salary_min, 48480),
  salary_max        = COALESCE(salary_max, 93960),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Basic pay bands: Deputy Manager JM-I 48480-85920 (CTC about 18 lakh a year), Manager MM-II 64820-93960 (CTC about 20 lakh a year); stored range spans both grades. Maximum age as on 31 Aug 2026 including relaxation: Deputy Manager SC/ST 33, OBC 31; Manager SC/ST 35, OBC 33; differs by post so left empty. 6 + 2 posts, reserved categories only. Online application 15 Sep to 10 Oct 2026; engagement type not labelled, employment_type left unchanged.'
WHERE id = 426 AND enrichment_source IS NULL;

-- 440 GSSTFDCL Company Secretary
-- Source: https://www.goa.gov.in/wp-content/uploads/2026/09/advt-18.09.26-1-1.pdf
--   employment_type FULL_TIME -> TEMPORARY (purely contractual, initially one year)
--   salary_max      NULL -> 50000 (consolidated monthly remuneration)
-- apply_url left NULL: application format is on www.gsstfdcl.in, which could
-- not be opened to confirm the link.
UPDATE public.postings
SET
  employment_type   = 'TEMPORARY',
  salary_max        = COALESCE(salary_max, 50000),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Scanned PDF read visually. Purely contractual, initially one year; consolidated remuneration Rs.50,000 per month; 1 post (UR); age 18 to 45, relaxable 5 years for government servants; 15-year Goa residence certificate required; application by 10/10/2026, format on www.gsstfdcl.in (link not verified, apply_url left empty).'
WHERE id = 440 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- Guard: ten rows enriched and one marked attempted, otherwise fail the migration.
DO $$
DECLARE n_ok integer; n_att integer;
BEGIN
  SELECT count(*) INTO n_ok FROM public.postings
  WHERE id IN (256, 257, 273, 317, 326, 364, 368, 418, 426, 440)
    AND enrichment_source = 'official_notification';
  SELECT count(*) INTO n_att FROM public.postings
  WHERE id = 329 AND enrichment_source = 'aggregator';
  IF n_ok <> 10 OR n_att <> 1 THEN
    RAISE EXCEPTION 'enrich_batch_256_to_440: expected 10 enriched + 1 attempted, found % + %', n_ok, n_att;
  END IF;
END $$;
