-- JobOye historical deadline provenance reconciliation — READ ONLY.
-- Snapshot basis: 2026-10-31 IST.
-- This script does not update canonical deadlines or observations.
--
-- Source observations are linked to legacy postings through posting_id. The
-- legacy posting's inferred_recruitment_id is used only as a read-only bridge
-- to the canonical Recruitment for this audit. It is not canonical authority.

BEGIN READ ONLY;

-- 1) Aggregate coverage for all canonical Recruitments with a deadline.
WITH per_recruitment AS (
  SELECT
    sp.inferred_recruitment_id AS recruitment_id,
    count(*) AS observation_count,
    count(*) FILTER (
      WHERE nullif(so.facts ->> 'lastDate', '') IS NOT NULL
    ) AS observed_last_date_count,
    count(*) FILTER (
      WHERE so.facts ? 'deadlinePrecision'
    ) AS precision_evidence_count,
    count(*) FILTER (
      WHERE so.facts ? 'deadlineTimezoneBasis'
    ) AS timezone_basis_count,
    count(*) FILTER (
      WHERE so.facts ? 'deadlineSourceText'
    ) AS source_text_count,
    count(*) FILTER (
      WHERE nullif(so.facts ->> 'lastDate', '')::timestamptz = r.application_end_date
    ) AS exact_instant_match_count
  FROM public.source_observations so
  JOIN public.postings sp ON sp.id = so.posting_id
  JOIN public.recruitments r ON r.id = sp.inferred_recruitment_id
  WHERE sp.inferred_recruitment_id IS NOT NULL
    AND r.application_end_date IS NOT NULL
  GROUP BY sp.inferred_recruitment_id
),
deadline_rows AS (
  SELECT
    r.id,
    r.application_end_date,
    coalesce(p.observation_count, 0) AS observation_count,
    coalesce(p.observed_last_date_count, 0) AS observed_last_date_count,
    coalesce(p.precision_evidence_count, 0) AS precision_evidence_count,
    coalesce(p.timezone_basis_count, 0) AS timezone_basis_count,
    coalesce(p.source_text_count, 0) AS source_text_count,
    coalesce(p.exact_instant_match_count, 0) AS exact_instant_match_count
  FROM public.recruitments r
  LEFT JOIN per_recruitment p ON p.recruitment_id = r.id
  WHERE r.application_end_date IS NOT NULL
)
SELECT
  count(*) AS canonical_deadlines,
  count(*) FILTER (WHERE observation_count > 0) AS with_linked_legacy_observation,
  count(*) FILTER (WHERE observed_last_date_count > 0) AS with_observed_last_date,
  count(*) FILTER (WHERE precision_evidence_count > 0) AS with_precision_evidence,
  count(*) FILTER (WHERE timezone_basis_count > 0) AS with_timezone_basis,
  count(*) FILTER (WHERE source_text_count > 0) AS with_source_text,
  count(*) FILTER (WHERE exact_instant_match_count > 0) AS with_exact_observation_instant_match,
  count(*) FILTER (
    WHERE (application_end_date AT TIME ZONE 'Asia/Kolkata')::time = time '05:30'
  ) AS ist_0530,
  count(*) FILTER (
    WHERE (application_end_date AT TIME ZONE 'Asia/Kolkata')::time >= time '23:59'
  ) AS ist_2359_or_later,
  count(*) FILTER (
    WHERE (application_end_date AT TIME ZONE 'Asia/Kolkata')::time NOT IN (time '00:00', time '05:30')
      AND (application_end_date AT TIME ZONE 'Asia/Kolkata')::time < time '23:59'
  ) AS other_ist_times
FROM deadline_rows;

-- 2) Record-level exception sample: stored deadline and linked source observation.
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  r.application_end_date AS canonical_deadline,
  so.id AS observation_id,
  so.source AS observation_source,
  so.external_id AS source_external_id,
  so.facts ->> 'lastDate' AS observed_last_date,
  so.facts ->> 'deadlinePrecision' AS deadline_precision,
  so.facts ->> 'deadlineSourceText' AS deadline_source_text,
  so.facts ->> 'deadlineTimezone' AS deadline_timezone,
  so.facts ->> 'deadlineTimezoneBasis' AS deadline_timezone_basis,
  so.outcome AS observation_outcome,
  so.outcome_reason AS observation_outcome_reason
FROM public.recruitments r
JOIN public.postings sp ON sp.inferred_recruitment_id = r.id
JOIN public.source_observations so ON so.posting_id = sp.id
WHERE r.application_end_date IS NOT NULL
ORDER BY r.id, so.id DESC
LIMIT 500;

COMMIT;
