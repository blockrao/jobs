-- JobOye future-date/freshness audit — READ ONLY.
-- Snapshot basis: 2026-10-31 IST. No production writes.
BEGIN READ ONLY;

-- 1) Aggregate current future-date cohorts and evidence coverage.
SELECT
  (SELECT count(*) FROM public.recruitments WHERE notification_date::date > date '2026-10-31') AS future_notification_dates,
  (SELECT count(*) FROM public.recruitments WHERE application_start_date::date > date '2026-10-31') AS future_application_starts,
  (SELECT count(*) FROM public.recruitments WHERE application_end_date::date > date '2026-10-31') AS future_application_deadlines,
  (SELECT count(*) FROM public.recruitments WHERE exam_date::date > date '2026-10-31') AS future_exam_dates,
  (SELECT count(*) FROM public.recruitments WHERE application_start_date IS NOT NULL AND application_end_date IS NOT NULL AND application_start_date > application_end_date) AS start_after_deadline,
  (SELECT count(*) FROM public.recruitments WHERE application_end_date::date > date '2026-10-31' AND status::text = 'ACTIVE') AS future_deadline_active,
  (SELECT count(*) FROM public.recruitments WHERE application_end_date::date > date '2026-10-31' AND status::text = 'UPCOMING') AS future_deadline_upcoming,
  (SELECT count(*) FROM public.recruitments WHERE application_end_date::date > date '2026-10-31' AND verification_status IN ('VERIFIED','MANUALLY_VERIFIED')) AS future_deadline_global_verified,
  (SELECT count(*) FROM public.recruitments WHERE application_end_date::date > date '2026-10-31' AND official_link_source = 'MANUAL_VERIFIED') AS future_deadline_manual_link,
  (SELECT count(*) FROM public.recruitments WHERE application_end_date::date > date '2026-10-31' AND official_notification_url ~* '^https://') AS future_deadline_https_notification_url,
  (SELECT count(*) FROM public.recruitments WHERE application_end_date::date > date '2026-10-31' AND coalesce(enrichment_data -> 'meta' ->> 'verified','false') = 'true') AS future_deadline_source_meta_verified,
  (SELECT count(*) FROM public.recruitments WHERE application_end_date::date > date '2026-10-31' AND coalesce(enrichment_data -> 'meta' ->> 'source','') IN ('institutional_aggregation','institution_aggregation','fja_html')) AS future_deadline_extraction_origin;

-- 2) Record-level future date exceptions. This intentionally includes plausible
-- scheduled future application/exam dates as well as contradictions. The
-- suggested disposition is a review queue, not an automatic correction.
SELECT
  r.id AS recruitment_id,
  r.slug,
  r.name,
  o.name AS organization,
  r.status::text AS lifecycle_status,
  r.verification_status,
  r.notification_date,
  r.application_start_date,
  r.application_end_date,
  r.exam_date,
  r.official_notification_url,
  r.official_application_url,
  r.official_link_source,
  r.enrichment_data -> 'meta' ->> 'source' AS source_origin,
  r.enrichment_data -> 'meta' ->> 'verified' AS source_meta_verified,
  r.created_at,
  r.updated_at,
  CASE
    WHEN r.application_start_date IS NOT NULL
      AND r.application_end_date IS NOT NULL
      AND r.application_start_date > r.application_end_date
      THEN 'DATE_ORDER_CONFLICT_REQUIRES_ISSUER_REVIEW'
    WHEN r.notification_date::date > date '2026-10-31'
      AND (r.official_notification_url IS NULL OR r.official_link_source <> 'MANUAL_VERIFIED'
        OR coalesce(r.enrichment_data -> 'meta' ->> 'verified','false') <> 'true')
      THEN 'FUTURE_NOTIFICATION_WITHOUT_COMPLETE_ISSUER_EVIDENCE'
    ELSE 'FUTURE_SCHEDULED_DATE_REQUIRES_SOURCE_CONFIRMATION'
  END AS suggested_disposition
FROM public.recruitments r
LEFT JOIN public.organizations o ON o.id = r.organization_id
WHERE r.notification_date::date > date '2026-10-31'
   OR r.application_start_date::date > date '2026-10-31'
   OR r.application_end_date::date > date '2026-10-31'
   OR r.exam_date::date > date '2026-10-31'
   OR (r.application_start_date IS NOT NULL
       AND r.application_end_date IS NOT NULL
       AND r.application_start_date > r.application_end_date)
ORDER BY
  CASE WHEN r.application_start_date IS NOT NULL AND r.application_end_date IS NOT NULL
             AND r.application_start_date > r.application_end_date THEN 0 ELSE 1 END,
  r.notification_date DESC NULLS LAST,
  r.application_start_date DESC NULLS LAST,
  r.id;

COMMIT;
