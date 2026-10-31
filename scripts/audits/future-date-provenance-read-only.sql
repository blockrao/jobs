-- JobOye future-date provenance audit — READ ONLY.
-- Snapshot: 2026-10-31. All comparisons use the database transaction timestamp.
-- This script reports candidates only. It does not update, quarantine, suppress,
-- delete, promote, or otherwise modify any Recruitment, Post, or source observation.

BEGIN TRANSACTION READ ONLY;

-- 0) Snapshot clock. Database timestamps are timestamptz; render dates in IST
-- only where explicitly requested by the query/report.
SELECT
  now() AS database_now,
  current_setting('TimeZone') AS database_timezone,
  now() AT TIME ZONE 'Asia/Kolkata' AS current_ist;

-- 1) Date-field inventory: null, future, sentinel and plausible-past counts.
WITH date_values AS (
  SELECT
    r.id,
    d.field_name,
    d.field_value
  FROM public.recruitments r
  CROSS JOIN LATERAL (VALUES
    ('notification_date', r.notification_date),
    ('application_start_date', r.application_start_date),
    ('application_end_date', r.application_end_date),
    ('exam_date', r.exam_date),
    ('result_date', r.result_date),
    ('admit_card_date', r.admit_card_date),
    ('interview_date', r.interview_date)
  ) AS d(field_name, field_value)
)
SELECT
  field_name,
  count(*) AS total_recruitments,
  count(*) FILTER (WHERE field_value IS NULL) AS null_dates,
  count(*) FILTER (WHERE field_value > now()) AS future_dates,
  count(*) FILTER (WHERE field_value > now() AND field_value <= now() + interval '30 days') AS future_within_30_days,
  count(*) FILTER (WHERE field_value > now() + interval '30 days') AS future_over_30_days,
  count(*) FILTER (WHERE field_value IS NOT NULL
    AND EXTRACT(YEAR FROM field_value AT TIME ZONE 'UTC') < 1900) AS pre_1900_dates,
  count(*) FILTER (WHERE field_value IS NOT NULL
    AND EXTRACT(YEAR FROM field_value AT TIME ZONE 'UTC') >= 2090) AS sentinel_or_far_future_dates,
  count(*) FILTER (WHERE field_value IS NOT NULL
    AND field_value <= now()
    AND EXTRACT(YEAR FROM field_value AT TIME ZONE 'UTC') BETWEEN 1900 AND 2089) AS past_or_current_plausible_dates
FROM date_values
GROUP BY field_name
ORDER BY CASE field_name
  WHEN 'notification_date' THEN 1
  WHEN 'application_start_date' THEN 2
  WHEN 'application_end_date' THEN 3
  WHEN 'exam_date' THEN 4
  WHEN 'result_date' THEN 5
  WHEN 'admit_card_date' THEN 6
  ELSE 7
END;

-- 2) Future application deadlines: compare global verification, exact field review,
-- issuer-link verification and independently registered official observations.
WITH future_deadlines AS (
  SELECT
    r.*,
    r.metadata -> 'source_provenance' -> 'authority_review' AS authority_review,
    r.metadata -> 'source_provenance' -> 'fact_review' AS fact_review
  FROM public.recruitments r
  WHERE r.application_end_date > now()
),
observation_summary AS (
  SELECT
    p.recruitment_id,
    count(DISTINCT so.id) AS observation_count,
    count(DISTINCT so.id) FILTER (
      WHERE s.authority = 'OFFICIAL' AND s.is_official IS TRUE
    ) AS official_observation_count,
    array_agg(DISTINCT so.source ORDER BY so.source) AS observation_sources
  FROM public.posts p
  JOIN public.postings sp ON sp.inferred_post_id = p.id
  JOIN public.source_observations so ON so.posting_id = sp.id
  LEFT JOIN public.sources s ON s.slug = so.source
  WHERE so.outcome = 'LOADED'
  GROUP BY p.recruitment_id
)
SELECT
  count(*) AS future_deadline_recruitments,
  count(*) FILTER (WHERE status::text = 'ACTIVE') AS active,
  count(*) FILTER (WHERE status::text = 'UPCOMING') AS upcoming,
  count(*) FILTER (WHERE verification_status IN ('VERIFIED','MANUALLY_VERIFIED')) AS globally_verified,
  count(*) FILTER (WHERE official_link_source = 'MANUAL_VERIFIED') AS manually_verified_link_source,
  count(*) FILTER (WHERE official_notification_url ~* '^https://') AS https_notification_url_present,
  count(*) FILTER (WHERE authority_review ->> 'status' = 'VERIFIED'
    AND authority_review ->> 'evidence_url' ~* '^https://'
    AND nullif(btrim(authority_review ->> 'reviewed_by'),'') IS NOT NULL
    AND nullif(btrim(authority_review ->> 'reviewed_at'),'') IS NOT NULL
    AND nullif(btrim(authority_review ->> 'notes'),'') IS NOT NULL) AS complete_authority_review,
  count(*) FILTER (WHERE fact_review ->> 'status' = 'VERIFIED'
    AND coalesce(fact_review -> 'reviewed_fields','[]'::jsonb) ? 'hub:application_end_date'
    AND nullif(btrim(fact_review -> 'evidence' -> 'hub:application_end_date' ->> 'evidence_ref'),'') IS NOT NULL
    AND nullif(btrim(fact_review -> 'evidence' -> 'hub:application_end_date' ->> 'excerpt'),'') IS NOT NULL
    AND nullif(btrim(fact_review ->> 'reviewed_by'),'') IS NOT NULL
    AND nullif(btrim(fact_review ->> 'reviewed_at'),'') IS NOT NULL
    AND nullif(btrim(fact_review ->> 'notes'),'') IS NOT NULL) AS complete_deadline_fact_review,
  count(*) FILTER (WHERE authority_review ->> 'status' = 'VERIFIED'
    AND fact_review ->> 'status' = 'VERIFIED'
    AND official_link_source = 'MANUAL_VERIFIED'
    AND coalesce(fact_review -> 'reviewed_fields','[]'::jsonb) ? 'hub:application_end_date'
    AND nullif(btrim(fact_review -> 'evidence' -> 'hub:application_end_date' ->> 'evidence_ref'),'') IS NOT NULL
    AND nullif(btrim(fact_review -> 'evidence' -> 'hub:application_end_date' ->> 'excerpt'),'') IS NOT NULL) AS source_and_deadline_review_complete,
  count(*) FILTER (WHERE enrichment_data -> 'meta' ->> 'source'
    IN ('institutional_aggregation','institution_aggregation','fja_html')) AS aggregator_extraction_origin,
  count(*) FILTER (WHERE metadata -> 'source_provenance' IS NULL) AS no_source_provenance_metadata,
  count(*) FILTER (WHERE coalesce(os.observation_count,0) > 0) AS with_linked_observations,
  count(*) FILTER (WHERE coalesce(os.official_observation_count,0) > 0) AS with_official_observations
FROM future_deadlines fd
LEFT JOIN observation_summary os ON os.recruitment_id = fd.id;

-- 3) Record-level manifest: one row per Recruitment per future date field.
-- A future application deadline can be legitimate; absence of issuer evidence
-- means it is not yet trusted, not that it is automatically wrong.
WITH future_dates AS (
  SELECT
    r.id,
    d.field_name,
    d.field_value
  FROM public.recruitments r
  CROSS JOIN LATERAL (VALUES
    ('notification_date', r.notification_date),
    ('application_start_date', r.application_start_date),
    ('application_end_date', r.application_end_date),
    ('exam_date', r.exam_date),
    ('result_date', r.result_date),
    ('admit_card_date', r.admit_card_date),
    ('interview_date', r.interview_date)
  ) AS d(field_name, field_value)
  WHERE d.field_value > now()
),
observation_summary AS (
  SELECT
    p.recruitment_id,
    count(DISTINCT so.id) AS observation_count,
    count(DISTINCT so.id) FILTER (
      WHERE s.authority = 'OFFICIAL' AND s.is_official IS TRUE
    ) AS official_observation_count,
    array_agg(DISTINCT so.source ORDER BY so.source) AS observation_sources
  FROM public.posts p
  JOIN public.postings sp ON sp.inferred_post_id = p.id
  JOIN public.source_observations so ON so.posting_id = sp.id
  LEFT JOIN public.sources s ON s.slug = so.source
  WHERE so.outcome = 'LOADED'
  GROUP BY p.recruitment_id
)
SELECT
  r.id AS recruitment_id,
  r.slug AS recruitment_slug,
  r.name AS recruitment_name,
  o.name AS organization_name,
  r.status::text AS lifecycle_status,
  fd.field_name,
  fd.field_value AS future_field_value,
  r.notification_date,
  r.application_start_date,
  r.application_end_date,
  r.exam_date,
  r.result_date,
  r.verification_status,
  r.official_link_source,
  r.official_notification_url,
  r.enrichment_data -> 'meta' ->> 'source' AS enrichment_source,
  r.enrichment_data -> 'meta' ->> 'verified' AS enrichment_meta_verified,
  r.created_at,
  r.updated_at,
  r.metadata -> 'source_provenance' AS source_provenance_review,
  coalesce(os.observation_sources, ARRAY[]::text[]) AS linked_observation_sources,
  coalesce(os.observation_count, 0) AS linked_observation_count,
  coalesce(os.official_observation_count, 0) AS linked_official_observation_count,
  CASE
    WHEN fd.field_name = 'notification_date'
      THEN 'FUTURE_NOTIFICATION_DATE_REQUIRES_ISSUER_REVIEW'
    WHEN fd.field_name = 'application_start_date'
      AND r.application_end_date IS NOT NULL
      AND r.application_start_date > r.application_end_date
      THEN 'START_AFTER_DEADLINE_CONTRADICTION'
    WHEN fd.field_name = 'application_start_date'
      AND r.status::text IN ('CLOSED','ARCHIVED')
      THEN 'FUTURE_START_ON_CLOSED_RECRUITMENT'
    WHEN fd.field_name = 'application_start_date'
      THEN 'FUTURE_START_REQUIRES_ISSUER_EVIDENCE'
    WHEN fd.field_name = 'application_end_date'
      THEN 'FUTURE_DEADLINE_REQUIRES_FIELD_LEVEL_ISSUER_EVIDENCE'
    WHEN fd.field_name = 'exam_date'
      THEN 'FUTURE_EXAM_REQUIRES_ISSUER_SCHEDULE_EVIDENCE'
    WHEN fd.field_name = 'result_date'
      THEN 'FUTURE_RESULT_REQUIRES_ISSUER_EVIDENCE'
    ELSE 'FUTURE_EVENT_REQUIRES_ISSUER_EVIDENCE'
  END AS audit_classification
FROM future_dates fd
JOIN public.recruitments r ON r.id = fd.id
LEFT JOIN public.organizations o ON o.id = r.organization_id
LEFT JOIN observation_summary os ON os.recruitment_id = r.id
ORDER BY
  CASE fd.field_name
    WHEN 'notification_date' THEN 1
    WHEN 'application_start_date' THEN 2
    WHEN 'application_end_date' THEN 3
    WHEN 'exam_date' THEN 4
    WHEN 'result_date' THEN 5
    WHEN 'admit_card_date' THEN 6
    ELSE 7
  END,
  fd.field_value,
  r.id;

COMMIT;
