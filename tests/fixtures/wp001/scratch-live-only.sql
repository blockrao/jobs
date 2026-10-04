-- SCRATCH ONLY. Brings a drizzle-pushed scratch database closer to live for the WP-001 dry run:
-- columns that exist on the live tables (supabase/baseline/01_columns.txt) but that src/db/schema.ts
-- does not declare, plus the lifecycle function and trigger (supabase/baseline/functions).
alter table public.postings
  add column if not exists announcement_state varchar(50),
  add column if not exists closing_state varchar(50),
  add column if not exists days_to_closing integer,
  add column if not exists expiration_reason varchar(255),
  add column if not exists expired_at timestamptz,
  add column if not exists is_expired boolean default false,
  add column if not exists official_application_url text,
  add column if not exists search_text tsvector,
  add column if not exists source_type varchar(50) default 'UNKNOWN',
  add column if not exists urgency_score smallint default 0;
alter table public.recruitments
  add column if not exists calculated_status varchar(50),
  add column if not exists days_to_closing integer,
  add column if not exists last_verified_at timestamptz,
  add column if not exists official_application_url text,
  add column if not exists official_notification_url text,
  add column if not exists source_url text,
  add column if not exists status_last_calculated timestamp,
  add column if not exists verification_status varchar(50) default 'UNVERIFIED';
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
$function$
;
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
$function$
;
drop trigger if exists trg_recruitment_status_changed on public.recruitments;
create trigger trg_recruitment_status_changed after update on public.recruitments for each row execute function trigger_recruitment_status_changed();
