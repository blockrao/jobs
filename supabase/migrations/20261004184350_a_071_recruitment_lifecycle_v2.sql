-- A-071: recruitment lifecycle v2 (function + trigger bodies).
-- NOTE: applied to production on 2026-10-04 (owner-directed) BEFORE this file was
-- committed; this file records exactly what was applied (version 20261004184350).
-- Deviations from the ARC-001 programme (S-01/S-02, no lifecycle from stored stages,
-- A-040) are recorded in ARCHITECTURE_LEDGER.md A-070/A-071 and the A070 record;
-- pending architect acceptance.
-- Companion data statements (links promotion, fake verified-stamp clearing, deadline
-- normalisation to end of IST day) are recorded in the A070 record, not repeated here.

CREATE OR REPLACE FUNCTION public.refresh_recruitment_lifecycle()
 RETURNS TABLE(expired_postings integer, archived_recruitments integer, last_refreshed timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_now timestamptz := now();
  v_expired int := 0;
  v_arch_before int;
  v_arch_after int;
BEGIN
  SELECT count(*) INTO v_arch_before FROM recruitments WHERE status = 'ARCHIVED';

  -- 1) Recruitment lifecycle: ACTIVE > CLOSED > ADMIT_CARD > EXAM > RESULT > COMPLETED > ARCHIVED
  --    Dates are interpreted as Indian calendar days (a deadline runs to the end of that IST day).
  WITH ranks AS (
    SELECT p.inferred_recruitment_id AS rid,
      max(CASE p.current_stage::text
        WHEN 'FINAL_RESULT_OUT' THEN 9 WHEN 'FILLED' THEN 9
        WHEN 'RESULT_OUT' THEN 8 WHEN 'MERIT_LIST_OUT' THEN 8 WHEN 'INTERVIEW_SCHEDULED' THEN 7
        WHEN 'EXAM_SCHEDULED' THEN 6 WHEN 'EXAM_CONDUCTED' THEN 6 WHEN 'ANSWER_KEY_OUT' THEN 6 WHEN 'OBJECTION_WINDOW' THEN 6
        WHEN 'ADMIT_CARD_RELEASED' THEN 5
        WHEN 'APPLICATION_CLOSED' THEN 4 WHEN 'CLOSED' THEN 4
        WHEN 'APPLICATION_OPEN' THEN 3 WHEN 'ACTIVE' THEN 3
        WHEN 'NOTIFICATION_OUT' THEN 2 ELSE 1 END) AS rk
    FROM postings p
    WHERE p.inferred_recruitment_id IS NOT NULL AND p.review_status <> 'REJECTED'
    GROUP BY 1
  ), calc AS (
    SELECT r.id, r.application_start_date, COALESCE(k.rk, 0) AS rk,
      CASE WHEN r.application_end_date IS NOT NULL
        THEN (((r.application_end_date AT TIME ZONE 'Asia/Kolkata')::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
      END AS closing_ts,
      GREATEST(r.result_date, r.exam_date, r.application_end_date) AS last_event
    FROM recruitments r LEFT JOIN ranks k ON k.rid = r.id
  ), c2 AS (
    SELECT *, CASE
      WHEN last_event IS NOT NULL AND last_event < v_now - interval '180 days' THEN 'ARCHIVED'
      WHEN rk = 9 THEN 'COMPLETED'
      WHEN rk IN (7, 8) THEN 'RESULT'
      WHEN rk = 6 THEN 'EXAM'
      WHEN rk = 5 THEN 'ADMIT_CARD'
      WHEN closing_ts IS NOT NULL AND closing_ts <= v_now THEN 'CLOSED'
      WHEN rk = 3 OR (closing_ts IS NOT NULL AND closing_ts > v_now
                      AND (application_start_date IS NULL OR application_start_date <= v_now)) THEN 'ACTIVE'
      ELSE 'UPCOMING' END AS cs
    FROM calc
  )
  UPDATE recruitments r SET
    calculated_status = c2.cs,
    status_last_calculated = v_now,
    status = (CASE
      WHEN c2.cs = 'ARCHIVED' THEN 'ARCHIVED'
      WHEN c2.cs IN ('RESULT', 'COMPLETED') THEN 'RESULTS'
      WHEN c2.cs IN ('ACTIVE', 'CLOSED', 'ADMIT_CARD', 'EXAM') THEN 'ACTIVE'
      ELSE 'UPCOMING' END)::recruitment_status,
    days_to_closing = CASE WHEN c2.cs = 'ACTIVE' AND c2.closing_ts IS NOT NULL
      THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (c2.closing_ts - v_now)) / 86400))::int END
  FROM c2
  WHERE c2.id = r.id;

  SELECT count(*) INTO v_arch_after FROM recruitments WHERE status = 'ARCHIVED';

  -- 2) Postings: expire only when the application deadline has passed (end of IST day),
  --    or the recruitment is archived, or applications closed with no exam still ahead.
  UPDATE postings p SET
    is_expired = TRUE,
    expiration_reason = CASE
      WHEN r.status = 'ARCHIVED' THEN 'Recruitment has concluded'
      ELSE 'Application closing date has passed' END,
    expired_at = CASE
      WHEN p.valid_through IS NOT NULL AND
           (CASE WHEN (p.valid_through AT TIME ZONE 'UTC')::time = TIME '00:00'
                 THEN ((p.valid_through AT TIME ZONE 'UTC')::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata' - interval '1 second'
                 ELSE p.valid_through END) <= v_now
      THEN (CASE WHEN (p.valid_through AT TIME ZONE 'UTC')::time = TIME '00:00'
                 THEN ((p.valid_through AT TIME ZONE 'UTC')::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata' - interval '1 second'
                 ELSE p.valid_through END)
      ELSE v_now END
  FROM recruitments r
  WHERE p.inferred_recruitment_id = r.id
    AND p.review_status = 'APPROVED'
    AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
    AND p.is_expired = FALSE
    AND (
      (p.valid_through IS NOT NULL AND
        (CASE WHEN (p.valid_through AT TIME ZONE 'UTC')::time = TIME '00:00'
              THEN ((p.valid_through AT TIME ZONE 'UTC')::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata' - interval '1 second'
              ELSE p.valid_through END) <= v_now)
      OR r.status = 'ARCHIVED'
      OR (r.calculated_status = 'CLOSED' AND (r.exam_date IS NULL OR r.exam_date < v_now))
    );
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  RETURN QUERY SELECT v_expired, GREATEST(0, v_arch_after - v_arch_before), v_now;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_recruitment_status_changed()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Concluded recruitment: expire its open postings. Does NOT touch last_verified_at
  -- (a lifecycle change is not a verification against the official source).
  IF NEW.status = 'ARCHIVED' AND (OLD.status IS NULL OR OLD.status != 'ARCHIVED') THEN
    UPDATE postings
    SET is_expired = TRUE,
        expiration_reason = 'Recruitment has concluded',
        expired_at = NOW()
    WHERE inferred_recruitment_id = NEW.id
      AND is_expired = FALSE
      AND review_status = 'APPROVED';
  END IF;
  RETURN NEW;
END;
$function$;
