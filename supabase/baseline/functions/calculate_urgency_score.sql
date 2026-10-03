CREATE OR REPLACE FUNCTION public.calculate_urgency_score(p_announced_date timestamp with time zone, p_closing_date date)
 RETURNS smallint
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_announcement_score INT := 0;
  v_closing_score INT := 0;
  v_days_since INT;
  v_days_until INT;
BEGIN
  -- Announcement freshness (0-50 points)
  v_days_since := (CURRENT_DATE - DATE(p_announced_date));

  IF v_days_since = 0 THEN
    v_announcement_score := 50;
  ELSIF v_days_since <= 7 THEN
    v_announcement_score := 40;
  ELSIF v_days_since <= 30 THEN
    v_announcement_score := 20;
  ELSE
    v_announcement_score := 5;
  END IF;

  -- Deadline urgency (0-50 points)
  IF p_closing_date IS NULL THEN
    v_closing_score := 0;
  ELSE
    v_days_until := (p_closing_date - CURRENT_DATE);

    IF v_days_until < 0 THEN
      v_closing_score := 0;
    ELSIF v_days_until = 0 THEN
      v_closing_score := 50;
    ELSIF v_days_until = 1 THEN
      v_closing_score := 45;
    ELSIF v_days_until <= 7 THEN
      v_closing_score := 35;
    ELSIF v_days_until <= 30 THEN
      v_closing_score := 20;
    ELSE
      v_closing_score := 5;
    END IF;
  END IF;

  RETURN (v_announcement_score + v_closing_score)::SMALLINT;
END;
$function$
