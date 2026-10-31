-- Ten-record next-actions audit: SELECT-only.
-- Run each numbered query separately. This script does not mutate production.
-- Scope: 7596, 7598, 7599, 7601, 7607, 7609, 7618, 7619, 7623, 7630.

-- 1. Recruitment + legacy Posting + canonical Post counts.
SELECT
  r.id AS recruitment_id,
  r.name,
  r.slug,
  r.status,
  r.verification_status,
  r.official_notification_number,
  r.application_start_date,
  r.application_end_date,
  r.total_vacancies,
  r.official_notification_url,
  r.official_application_url,
  p.id AS legacy_posting_id,
  p.external_id AS fja_article_id,
  p.title AS legacy_title,
  p.total_vacancies AS legacy_vacancies,
  p.official_notification_url AS legacy_notification_url,
  p.apply_url AS legacy_apply_url,
  p.source_document_id,
  (SELECT count(*) FROM public.posts cp WHERE cp.recruitment_id = r.id) AS canonical_post_count
FROM public.recruitments r
LEFT JOIN public.postings p ON p.inferred_recruitment_id = r.id
WHERE r.id IN (7596,7598,7599,7601,7607,7609,7618,7619,7623,7630)
ORDER BY r.id;

-- 2. TISS canonical duplicate comparison. Do not create Posts under 7598
-- until this relationship is reconciled and a redirect/merge impact review exists.
SELECT
  r.id AS recruitment_id,
  r.name,
  r.slug,
  r.status,
  r.application_end_date,
  r.official_notification_number,
  count(p.id) AS canonical_posts,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'post_id', p.id,
        'name', p.name,
        'slug', p.slug,
        'vacancies', p.vacancy_total,
        'description', p.description
      ) ORDER BY p.id
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'::jsonb
  ) AS posts
FROM public.recruitments r
LEFT JOIN public.posts p ON p.recruitment_id = r.id
WHERE r.id IN (7517,7598)
GROUP BY r.id
ORDER BY r.id;

-- 3. Candidate SMC correction (display-only comparison; not an UPDATE).
-- Issuer careers listing identifies PRO No. 301 dated 21 Oct 2026,
-- 18 vacancies and application dates 9–23 Nov 2026.
SELECT
  r.id,
  r.official_notification_number AS current_notice_number,
  'P.R.O. No. 301, 21/10/2026'::text AS candidate_notice_number,
  r.total_vacancies AS current_total_vacancies,
  18 AS candidate_total_vacancies,
  r.application_start_date AS current_start,
  timestamp with time zone '2026-11-09 00:00:00+00' AS issuer_listed_start,
  r.application_end_date AS current_end,
  timestamp with time zone '2026-11-23 00:00:00+00' AS issuer_listed_end,
  r.status AS current_status,
  p.official_notification_url AS legacy_pdf_candidate
FROM public.recruitments r
LEFT JOIN public.postings p ON p.inferred_recruitment_id = r.id
WHERE r.id = 7596;

-- 4. Candidate KUDSIT correction (display-only comparison; not an UPDATE).
-- Issuer careers listing confirms extension through 04 Nov 2026.
SELECT
  r.id,
  r.status AS current_status,
  'ACTIVE'::text AS candidate_status,
  r.application_end_date AS current_end,
  timestamp with time zone '2026-11-04 00:00:00+00' AS issuer_extended_end,
  r.total_vacancies AS current_total_vacancies,
  p.official_notification_url AS legacy_pdf_candidate,
  p.apply_url AS legacy_apply_candidate
FROM public.recruitments r
LEFT JOIN public.postings p ON p.inferred_recruitment_id = r.id
WHERE r.id = 7619;

-- 5. Confirm the linked source_documents rows are not notification captures.
SELECT
  r.id AS recruitment_id,
  p.id AS legacy_posting_id,
  p.external_id,
  p.source_document_id,
  sd.document_type,
  sd.source_url,
  sd.extraction_method,
  length(sd.raw_content) AS raw_content_chars,
  left(sd.raw_content, 240) AS raw_content_preview
FROM public.recruitments r
JOIN public.postings p ON p.inferred_recruitment_id = r.id
LEFT JOIN public.source_documents sd ON sd.id = p.source_document_id
WHERE r.id IN (7596,7598,7599,7601,7607,7609,7618,7619,7623,7630)
ORDER BY r.id;

-- 6. Check whether any of the target Recruitment IDs acquired Posts since the
-- initial audit and expose their current slug set for final reconciliation.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  p.id AS post_id,
  p.name AS post_name,
  p.slug AS post_slug,
  p.vacancy_total,
  p.position_id,
  p.posting_status
FROM public.recruitments r
LEFT JOIN public.posts p ON p.recruitment_id = r.id
WHERE r.id IN (7596,7598,7599,7601,7607,7609,7618,7619,7623,7630)
ORDER BY r.id, p.id;
