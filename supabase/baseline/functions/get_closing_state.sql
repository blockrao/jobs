CREATE OR REPLACE FUNCTION public.get_closing_state(closing_date date)
 RETURNS character varying
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_days_until INT;
BEGIN
  IF closing_date IS NULL THEN
    RETURN 'NO_DEADLINE';
  END IF;

  v_days_until := (closing_date - CURRENT_DATE);

  IF v_days_until < 0 THEN
    RETURN 'EXPIRED';
  ELSIF v_days_until = 0 THEN
    RETURN 'LAST_DATE_TODAY';
  ELSIF v_days_until = 1 THEN
    RETURN 'CLOSING_TOMORROW';
  ELSIF v_days_until <= 7 THEN
    RETURN 'CLOSING_THIS_WEEK';
  ELSE
    RETURN 'CLOSING_SOON';
  END IF;
END;
$function$
