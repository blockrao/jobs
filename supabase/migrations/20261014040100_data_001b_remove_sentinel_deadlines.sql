-- DATA-001b: remove the 2099-12-31 placeholder deadline from the 38 Posts
-- where it was written. No replacement value is guessed. Ledger A-088.
--
-- Origin: posts.key_dates.applicationCloseDate was bulk-derived from
-- recruitments.application_end_date with a 2099-12-31 fallback for NULL
-- (out-of-band write; 27 of the 38 recruitments still have no end date).
-- The 2026-10-08 enrichment backfill copied it into post_enrichments.
-- Both predicates below are belt-and-braces: explicit id list AND the
-- sentinel value, so nothing else can be touched.

UPDATE public.post_enrichments
SET "applicationClosingDate" = NULL,
    updated_at = now()
WHERE post_id IN (10, 11, 35, 36, 42, 67, 147, 269, 270, 271, 272, 285, 287, 821, 860, 861, 863, 864, 865, 866, 887, 891, 892, 897, 898, 902, 903, 934, 972, 1036, 1138, 1142, 1149, 1420, 1469, 1470, 1471, 1521)
  AND "applicationClosingDate" >= '2090-01-01';

UPDATE public.posts
SET key_dates = key_dates - 'applicationCloseDate',
    updated_at = now()
WHERE id IN (10, 11, 35, 36, 42, 67, 147, 269, 270, 271, 272, 285, 287, 821, 860, 861, 863, 864, 865, 866, 887, 891, 892, 897, 898, 902, 903, 934, 972, 1036, 1138, 1142, 1149, 1420, 1469, 1470, 1471, 1521)
  AND jsonb_typeof(key_dates) = 'object'
  AND key_dates->>'applicationCloseDate' LIKE '2099%';
