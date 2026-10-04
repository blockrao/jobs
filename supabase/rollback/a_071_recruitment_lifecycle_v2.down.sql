-- Rollback for 20261004184350_a_071_recruitment_lifecycle_v2.sql. Never applied automatically.
-- Restores the pre-change function bodies (captured from production 2026-10-04).
-- Data state (recruitments, postings) is restored separately from schema backup_20261005.

CREATE OR REPLACE FUNCTION public.refresh_recruitment_lifecycle()
 RETURNS TABLE(expired_postings integer, archived_recruitments integer, last_refreshed timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_date DATE;
  v_expired_count INT := 0;
  v_archived_count INT := 0;
BEGIN
  v_current_date := CURRENT_DATE;

  -- Mark recruitments as ARCHIVED if application ended AND no active exam
  UPDATE recruitments r
  SET
    status = 'ARCHIVED',
    status_last_calculated = NOW()
  WHERE (
    r.application_end_date IS NOT NULL
    AND DATE(r.application_end_date) < v_current_date
    AND (
      r.exam_date IS NULL
      OR DATE(r.exam_date) < v_current_date
    )
  )
  AND status != 'ARCHIVED';

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  -- Mark postings as expired
  UPDATE postings p
  SET
    is_expired = TRUE,
    expiration_reason = CASE
      WHEN p.valid_through IS NOT NULL AND p.valid_through < v_current_date
        THEN 'Application closing date has passed'
      WHEN r.status = 'ARCHIVED'
        THEN 'Recruitment has concluded'
      ELSE 'Position is no longer open'
    END,
    expired_at = CASE
      WHEN p.valid_through IS NOT NULL AND p.valid_through < v_current_date
        THEN p.valid_through::TIMESTAMP WITH TIME ZONE
      ELSE NOW()
    END,
    last_verified_at = NOW(),
    flagged_for_review = FALSE
  FROM recruitments r
  WHERE p.inferred_recruitment_id = r.id
    AND p.review_status = 'APPROVED'
    AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
    AND (
      (p.valid_through IS NOT NULL AND p.valid_through < v_current_date)
      OR (r.status = 'ARCHIVED')
      OR (
        r.application_end_date IS NOT NULL
        AND DATE(r.application_end_date) < v_current_date
        AND (r.exam_date IS NULL OR DATE(r.exam_date) < v_current_date)
      )
    )
    AND p.is_expired = FALSE;

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN QUERY SELECT v_expired_count, v_archived_count, NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_recruitment_status_changed()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'ARCHIVED' AND (OLD.status IS NULL OR OLD.status != 'ARCHIVED') THEN
    UPDATE postings
    SET
      is_expired = TRUE,
      expiration_reason = 'Recruitment has concluded',
      expired_at = NOW(),
      last_verified_at = NOW()
    WHERE inferred_recruitment_id = NEW.id
      AND is_expired = FALSE
      AND review_status = 'APPROVED';
  END IF;

  RETURN NEW;
END;
$function$;
