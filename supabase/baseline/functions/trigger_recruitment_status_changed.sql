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
