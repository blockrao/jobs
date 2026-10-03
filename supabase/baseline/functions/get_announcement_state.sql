CREATE OR REPLACE FUNCTION public.get_announcement_state(posted_date timestamp with time zone)
 RETURNS character varying
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_days_since INT;
BEGIN
  v_days_since := (CURRENT_DATE - DATE(posted_date));

  IF v_days_since = 0 THEN
    RETURN 'ANNOUNCED_TODAY';
  ELSIF v_days_since <= 7 THEN
    RETURN 'ANNOUNCED_THIS_WEEK';
  ELSIF v_days_since <= 30 THEN
    RETURN 'ANNOUNCED_THIS_MONTH';
  ELSE
    RETURN 'OLDER';
  END IF;
END;
$function$
