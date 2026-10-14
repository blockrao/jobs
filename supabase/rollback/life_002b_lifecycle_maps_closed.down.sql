-- Rollback for 20261014050100_life_002b_lifecycle_maps_closed.sql: restores the
-- A-071 mapping (CLOSED/ADMIT_CARD/EXAM -> ACTIVE). Never applied automatically.
CREATE OR REPLACE FUNCTION public.refresh_recruitment_lifecycle()
 RETURNS TABLE(expired_postings integer, archived_recruitments integer, last_refreshed timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_now timestamptz := now();
  v_expired int := 0;
  v_stage_fixed int := 0;
  v_arch_before int;
  v_arch_after int;
BEGIN
  SELECT count(*) INTO v_arch_before FROM recruitments WHERE status = 'ARCHIVED';

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

  -- Pass 1: expire postings whose deadline has passed
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

  -- Pass 2: fix current_stage for any expired postings still showing open stages
  UPDATE postings SET
    current_stage = 'APPLICATION_CLOSED'
  WHERE is_expired = TRUE
    AND current_stage IN ('APPLICATION_OPEN', 'NOTIFICATION_OUT', 'ACTIVE')
    AND review_status = 'APPROVED';
  GET DIAGNOSTICS v_stage_fixed = ROW_COUNT;

  RETURN QUERY SELECT v_expired, GREATEST(0, v_arch_after - v_arch_before), v_now;
END;
$function$;
