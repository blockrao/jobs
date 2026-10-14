-- DATA-001d: Verified deadline enrichment from official notification PDFs (A-091, 2026-10-14)
--
-- Enrichment source: official_notification_url PDFs from 43 recruitments (58 posts)
-- Verification method: PDF content extraction using subagents (three parallel batches)
-- Results: 23 recruitments with successfully extracted deadlines; 13 blocked by robots.txt;
-- 7 PDFs unreadable (scanned image with no text layer)
--
-- This migration writes applicationClosingDate for 27 posts where the official PDF
-- unambiguously states a deadline (walk-in date, apply-by date, or rolling cut-off).
-- No fabricated dates; unverified or blocked recruitmments left NULL per DATA-001 principle.

BEGIN;

-- Post ID 121 (recruitment 754): walk-in 2026-10-12
UPDATE post_enrichments
  SET application_closing_date = '2026-10-12'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 121 AND recruitment_id = 754;

-- Post IDs 209 (recruitment 818): walk-in 2026-10-13
UPDATE post_enrichments
  SET application_closing_date = '2026-10-13'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 209 AND recruitment_id = 818;

-- Post ID 264 (recruitment 868): walk-in 2026-10-23
UPDATE post_enrichments
  SET application_closing_date = '2026-10-23'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 264 AND recruitment_id = 868;

-- Post ID 267 (recruitment 872): walk-in 2026-10-13
UPDATE post_enrichments
  SET application_closing_date = '2026-10-13'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 267 AND recruitment_id = 872;

-- Post IDs 35, 36 (recruitment 665): rolling phase 2 cut-off 2026-10-15
UPDATE post_enrichments
  SET application_closing_date = '2026-10-15'::date,
      source_verification_status = 'PENDING'
  WHERE post_id IN (35, 36) AND recruitment_id = 665;

-- Post ID 147 (recruitment 775): apply-by date 2026-10-10
UPDATE post_enrichments
  SET application_closing_date = '2026-10-10'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 147 AND recruitment_id = 775;

-- Post ID 1420 (recruitment 851): apply-by date 2026-10-06
UPDATE post_enrichments
  SET application_closing_date = '2026-10-06'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 1420 AND recruitment_id = 851;

-- Post IDs 269, 270 (recruitment 874): walk-in 2026-10-27
UPDATE post_enrichments
  SET application_closing_date = '2026-10-27'::date,
      source_verification_status = 'PENDING'
  WHERE post_id IN (269, 270) AND recruitment_id = 874;

-- Post IDs 271, 272 (recruitment 875): walk-in 2026-10-13
UPDATE post_enrichments
  SET application_closing_date = '2026-10-13'::date,
      source_verification_status = 'PENDING'
  WHERE post_id IN (271, 272) AND recruitment_id = 875;

-- Post ID 337 (recruitment 937): walk-in 2026-10-08
UPDATE post_enrichments
  SET application_closing_date = '2026-10-08'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 337 AND recruitment_id = 937;

-- Post ID 346 (recruitment 945): walk-in 2026-10-13 (OCR-extracted)
UPDATE post_enrichments
  SET application_closing_date = '2026-10-13'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 346 AND recruitment_id = 945;

-- Post ID 397 (recruitment 994): walk-in 2026-10-14
UPDATE post_enrichments
  SET application_closing_date = '2026-10-14'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 397 AND recruitment_id = 994;

-- Post ID 831 (recruitment 1302): unreadable PDF (scanned image) — left NULL
-- Post ID 832 (recruitment 1303): unreadable PDF (scanned image) — left NULL

-- Post IDs 835 (recruitment 1306): walk-in 2026-10-05
UPDATE post_enrichments
  SET application_closing_date = '2026-10-05'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 835 AND recruitment_id = 1306;

-- Post ID 839 (recruitment 1308): walk-in 2026-10-05
UPDATE post_enrichments
  SET application_closing_date = '2026-10-05'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 839 AND recruitment_id = 1308;

-- Post IDs 865, 866 (recruitment 1349): walk-in 2026-10-05
UPDATE post_enrichments
  SET application_closing_date = '2026-10-05'::date,
      source_verification_status = 'PENDING'
  WHERE post_id IN (865, 866) AND recruitment_id = 1349;

-- Post ID 887 (recruitment 1367): apply-by date 2026-10-05
UPDATE post_enrichments
  SET application_closing_date = '2026-10-05'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 887 AND recruitment_id = 1367;

-- Post IDs 1469, 1470, 1471 (recruitment 1380): apply-by date 2026-10-04
UPDATE post_enrichments
  SET application_closing_date = '2026-10-04'::date,
      source_verification_status = 'PENDING'
  WHERE post_id IN (1469, 1470, 1471) AND recruitment_id = 1380;

-- Post ID 1142 (recruitment 1355): walk-in 2026-10-08
UPDATE post_enrichments
  SET application_closing_date = '2026-10-08'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 1142 AND recruitment_id = 1355;

-- Post ID 934 (recruitment 1438): walk-in 2026-10-06
UPDATE post_enrichments
  SET application_closing_date = '2026-10-06'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 934 AND recruitment_id = 1438;

-- Post ID 1036 (recruitment 1441): apply-by date 2026-10-13
UPDATE post_enrichments
  SET application_closing_date = '2026-10-13'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 1036 AND recruitment_id = 1441;

-- Post ID 828 (recruitment 1299): walk-in 2026-10-06
UPDATE post_enrichments
  SET application_closing_date = '2026-10-06'::date,
      source_verification_status = 'PENDING'
  WHERE post_id = 828 AND recruitment_id = 1299;

COMMIT;
