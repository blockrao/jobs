-- JobOye P0 post-enrichment reconciliation dry-run
-- Snapshot basis: 31 October 2026 | Project: cusxodjgkrttwmdmhvso
--
-- READ ONLY: every statement is SELECT. No writes, DDL, RPCs or migrations.
-- Re-run before remediation; counts change as production data changes.
-- This is a candidate inventory, not a decision about which store is correct.
--
-- Safety rules:
-- * An aggregator match, URL, timestamp, or confidence value is not official verification.
-- * Preserve recruitment-vs-post scope. Never copy a recruitment total to each post by default.
-- * Do not choose a winning store automatically when values conflict.

-- 1. Coverage and overlap across canonical posts.
WITH coverage AS (
  SELECT p.id,
    (p.enrichment IS NOT NULL AND p.enrichment <> '{}'::jsonb) AS has_jsonb,
    (pe.post_id IS NOT NULL) AS has_structured_row
  FROM public.posts p
  LEFT JOIN public.post_enrichments pe ON pe.post_id = p.id
)
SELECT COUNT(*) AS posts_total,
  COUNT(*) FILTER (WHERE has_jsonb) AS nonempty_jsonb,
  COUNT(*) FILTER (WHERE has_structured_row) AS structured_rows,
  COUNT(*) FILTER (WHERE has_jsonb AND has_structured_row) AS both,
  COUNT(*) FILTER (WHERE has_jsonb AND NOT has_structured_row) AS jsonb_only,
  COUNT(*) FILTER (WHERE NOT has_jsonb AND has_structured_row) AS structured_only,
  COUNT(*) FILTER (WHERE NOT has_jsonb AND NOT has_structured_row) AS neither
FROM coverage;

-- 2. Verification state and timestamp integrity.
SELECT "sourceVerificationStatus" AS status,
  COUNT(*) AS rows,
  COUNT(*) FILTER (WHERE "sourceVerificationDate" IS NOT NULL) AS date_present,
  COUNT(*) FILTER (
    WHERE ABS(EXTRACT(EPOCH FROM ("sourceVerificationDate" - created_at))) <= 2
  ) AS date_within_two_seconds_of_created_at,
  COUNT(*) FILTER (WHERE "extractionConfidence" IS NULL) AS confidence_null,
  COUNT(*) FILTER (WHERE "extractionConfidence" = 0) AS confidence_zero
FROM public.post_enrichments
GROUP BY "sourceVerificationStatus"
ORDER BY status;

-- Exact timestamp cohort observed during the audit. Includes the 2,756 VERIFIED
-- rows matching the historical heuristic promotion, plus any timestamp peers.
SELECT p.id AS post_id, p.slug, p.name AS post_name, p.recruitment_id,
  pe."sourceVerificationStatus", pe."sourceVerificationDate",
  pe."extractionConfidence", pe."salaryMin", pe."salaryMax",
  pe."vacanciesTotal", pe.updated_at,
  r.official_link_source, r.official_notification_url
FROM public.post_enrichments pe
JOIN public.posts p ON p.id = pe.post_id
LEFT JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE pe.updated_at = TIMESTAMPTZ '2026-10-15 11:43:30.211896+00'
ORDER BY p.id;

-- 3. JSONB verification/confidence contradictions. Confidence is cast only
-- after numeric validation so the comparison is type-safe.
SELECT p.id AS post_id, p.slug,
  p.enrichment->>'sourceVerificationStatus' AS jsonb_status,
  pe."sourceVerificationStatus" AS structured_status,
  p.enrichment->>'extractionConfidence' AS jsonb_confidence,
  pe."extractionConfidence" AS structured_confidence,
  pe.updated_at
FROM public.posts p
JOIN public.post_enrichments pe ON pe.post_id = p.id
WHERE
  (
    p.enrichment ? 'sourceVerificationStatus'
    AND p.enrichment->>'sourceVerificationStatus'
      IS DISTINCT FROM pe."sourceVerificationStatus"
  )
  OR
  (
    p.enrichment->>'extractionConfidence' ~ '^-?[0-9]+$'
    AND (p.enrichment->>'extractionConfidence')::integer
      IS DISTINCT FROM pe."extractionConfidence"
  )
ORDER BY p.id;

-- 4. Vacancy total comparison summary.
WITH compared AS (
  SELECT pe."vacanciesTotal" AS structured_vacancies,
    CASE
      WHEN p.enrichment->>'vacanciesTotal' ~ '^-?[0-9]+$'
      THEN (p.enrichment->>'vacanciesTotal')::integer
      ELSE NULL
    END AS jsonb_vacancies
  FROM public.posts p
  JOIN public.post_enrichments pe ON pe.post_id = p.id
)
SELECT
  COUNT(*) FILTER (
    WHERE structured_vacancies IS NOT NULL AND jsonb_vacancies IS NOT NULL
  ) AS both_have_vacancy_total,
  COUNT(*) FILTER (
    WHERE structured_vacancies IS NOT NULL AND jsonb_vacancies IS NOT NULL
      AND structured_vacancies = jsonb_vacancies
  ) AS equal_values,
  COUNT(*) FILTER (
    WHERE structured_vacancies IS NOT NULL AND jsonb_vacancies IS NOT NULL
      AND structured_vacancies <> jsonb_vacancies
  ) AS conflicting_values
FROM compared;

-- Full 558-row conflict candidate list (current snapshot; result count may change).
-- Review each against official notification evidence and entity scope.
WITH compared AS (
  SELECT p.id AS post_id, p.slug, p.name AS post_name, p.recruitment_id,
    pe."sourceVerificationStatus" AS structured_status,
    pe."extractionConfidence" AS structured_confidence,
    pe."vacanciesTotal" AS structured_vacancies,
    CASE
      WHEN p.enrichment->>'vacanciesTotal' ~ '^-?[0-9]+$'
      THEN (p.enrichment->>'vacanciesTotal')::integer
      ELSE NULL
    END AS jsonb_vacancies,
    p.vacancy_total AS legacy_post_vacancy_total,
    r.total_vacancies AS recruitment_total_vacancies,
    r.official_link_source, r.official_notification_url
  FROM public.posts p
  JOIN public.post_enrichments pe ON pe.post_id = p.id
  LEFT JOIN public.recruitments r ON r.id = p.recruitment_id
)
SELECT *
FROM compared
WHERE structured_vacancies IS NOT NULL
  AND jsonb_vacancies IS NOT NULL
  AND structured_vacancies <> jsonb_vacancies
ORDER BY post_id;

-- JSONB vacancy shape present in production.
SELECT
  COUNT(*) FILTER (WHERE enrichment ? 'vacanciesTotal') AS top_level_total_present,
  COUNT(*) FILTER (
    WHERE jsonb_typeof(enrichment->'vacancies') = 'array'
      AND jsonb_array_length(enrichment->'vacancies') > 0
  ) AS nonempty_vacancies_array,
  COUNT(*) FILTER (
    WHERE jsonb_typeof(enrichment->'vacancies') = 'object'
      AND enrichment->'vacancies' ? 'total'
  ) AS nested_vacancies_total_present,
  COUNT(*) FILTER (
    WHERE jsonb_typeof(enrichment->'vacancies') = 'object'
      AND jsonb_typeof(enrichment->'vacancies'->'categories') = 'object'
  ) AS nested_vacancies_categories_object
FROM public.posts
WHERE enrichment IS NOT NULL AND enrichment <> '{}'::jsonb;

-- 5. Deadline timestamp anomaly candidates (10 within two seconds in snapshot).
SELECT p.id AS post_id, p.slug, pe."applicationClosingDate",
  pe.created_at, pe.updated_at, pe."sourceVerificationStatus",
  pe."extractionConfidence", r.official_notification_url
FROM public.post_enrichments pe
JOIN public.posts p ON p.id = pe.post_id
LEFT JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE pe."applicationClosingDate" IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (pe."applicationClosingDate" - pe.created_at))) <= 2
ORDER BY p.id;

-- Broader same-calendar-day review signal. Not an automatic invalidation rule.
SELECT
  COUNT(*) FILTER (
    WHERE "applicationClosingDate"::date = created_at::date
  ) AS same_calendar_day_as_created,
  COUNT(*) FILTER (
    WHERE ABS(EXTRACT(EPOCH FROM ("applicationClosingDate" - created_at))) <= 2
  ) AS within_two_seconds_of_created
FROM public.post_enrichments
WHERE "applicationClosingDate" IS NOT NULL;

-- 6. Source labels retained by normalized detail tables.
SELECT 'posts_vacancies' AS table_name, source, COUNT(*) AS rows
FROM public.posts_vacancies GROUP BY source
UNION ALL
SELECT 'posts_education', source, COUNT(*)
FROM public.posts_education GROUP BY source
UNION ALL
SELECT 'posts_experience', source, COUNT(*)
FROM public.posts_experience GROUP BY source
UNION ALL
SELECT 'posts_selection_process', source, COUNT(*)
FROM public.posts_selection_process GROUP BY source
UNION ALL
SELECT 'posts_documents', source, COUNT(*)
FROM public.posts_documents GROUP BY source
UNION ALL
SELECT 'posts_important_dates', source, COUNT(*)
FROM public.posts_important_dates GROUP BY source
UNION ALL
SELECT 'posts_application_fee', source, COUNT(*)
FROM public.posts_application_fee GROUP BY source
UNION ALL
SELECT 'posts_official_links', source, COUNT(*)
FROM public.posts_official_links GROUP BY source
ORDER BY table_name, source;

-- 7. Provisional operational live slice. This is NOT the approved shared
-- lifecycle contract; it is retained only to reproduce the audit exposure.
WITH provisional_posts AS (
  SELECT p.id
  FROM public.posts p
  JOIN public.recruitments r ON r.id = p.recruitment_id
  WHERE r.status IN ('ACTIVE', 'UPCOMING')
    AND (
      r.application_end_date IS NULL
      OR r.application_end_date > NOW()
      OR EXTRACT(YEAR FROM r.application_end_date) < 1900
      OR EXTRACT(YEAR FROM r.application_end_date) >= 2090
    )
    AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
    AND p.slug IS NOT NULL AND r.slug IS NOT NULL
)
SELECT COUNT(*) AS provisional_posts,
  COUNT(pe.post_id) AS posts_with_post_enrichment,
  COUNT(*) FILTER (WHERE pe."sourceVerificationStatus" = 'VERIFIED') AS verified_rows,
  COUNT(*) FILTER (WHERE pe."sourceVerificationStatus" = 'UNVERIFIABLE') AS unverifiable_rows,
  COUNT(*) FILTER (WHERE pe."sourceVerificationStatus" = 'PENDING') AS pending_rows,
  COUNT(*) FILTER (
    WHERE pe."sourceVerificationStatus" = 'VERIFIED'
      AND pe.updated_at = TIMESTAMPTZ '2026-10-15 11:43:30.211896+00'
  ) AS heuristic_batch_verified_rows
FROM provisional_posts pp
LEFT JOIN public.post_enrichments pe ON pe.post_id = pp.id;

-- Provisional live status by recruitment official-link provenance.
WITH provisional_posts AS (
  SELECT p.id, p.recruitment_id
  FROM public.posts p
  JOIN public.recruitments r ON r.id = p.recruitment_id
  WHERE r.status IN ('ACTIVE', 'UPCOMING')
    AND (
      r.application_end_date IS NULL
      OR r.application_end_date > NOW()
      OR EXTRACT(YEAR FROM r.application_end_date) < 1900
      OR EXTRACT(YEAR FROM r.application_end_date) >= 2090
    )
    AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
    AND p.slug IS NOT NULL AND r.slug IS NOT NULL
)
SELECT COALESCE(r.official_link_source, '<NULL>') AS official_link_source,
  pe."sourceVerificationStatus" AS enrichment_status,
  COUNT(*) AS rows
FROM provisional_posts pp
JOIN public.recruitments r ON r.id = pp.recruitment_id
JOIN public.post_enrichments pe ON pe.post_id = pp.id
GROUP BY 1, 2
ORDER BY 1, 2;

-- 8. Candidate evidence packet. This returns only the union of explicit anomaly
-- cohorts: timestamp batch, conflicting vacancy totals, explicit status
-- contradiction, and deadline timestamps matching row creation. It does not
-- select a winning value. Capture/document IDs must be joined when recovered.
SELECT
  p.id AS post_id, p.slug, p.name AS post_name, p.recruitment_id,
  p."officialSourceUrl" AS post_official_source_url,
  p."applyPortalUrl" AS post_apply_portal_url,
  p.salary_min AS legacy_salary_min, p.salary_max AS legacy_salary_max,
  p.vacancy_total AS legacy_post_vacancy_total,
  p.enrichment AS jsonb_enrichment,
  pe."sourceVerificationStatus", pe."sourceVerificationDate",
  pe."extractionConfidence", pe."salaryMin", pe."salaryMax",
  pe."payScale", pe."payLevel", pe."vacanciesTotal",
  pe."vacanciesByCategory", pe."applicationOpenDate",
  pe."applicationClosingDate", pe.education, pe.experience,
  pe."eligibilityPathways", pe."selectionProcess",
  r.name AS recruitment_name, r.total_vacancies AS recruitment_total_vacancies,
  r.official_link_source, r.official_notification_url,
  r.official_application_url, r.verification_status AS recruitment_verification_status,
  r.last_verified_at AS recruitment_last_verified_at
FROM public.posts p
JOIN public.post_enrichments pe ON pe.post_id = p.id
LEFT JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE
  pe.updated_at = TIMESTAMPTZ '2026-10-15 11:43:30.211896+00'
  OR (
    p.enrichment ? 'sourceVerificationStatus'
    AND p.enrichment->>'sourceVerificationStatus'
      IS DISTINCT FROM pe."sourceVerificationStatus"
  )
  OR (
    pe."vacanciesTotal" IS NOT NULL
    AND p.enrichment->>'vacanciesTotal' ~ '^-?[0-9]+$'
    AND pe."vacanciesTotal" <> (p.enrichment->>'vacanciesTotal')::integer
  )
  OR (
    pe."applicationClosingDate" IS NOT NULL
    AND ABS(EXTRACT(EPOCH FROM (pe."applicationClosingDate" - pe.created_at))) <= 2
  )
ORDER BY p.id;

-- End of read-only dry-run. No writes are included.
