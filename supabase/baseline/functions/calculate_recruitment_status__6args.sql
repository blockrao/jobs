CREATE OR REPLACE FUNCTION public.calculate_recruitment_status(p_recruitment_id integer, p_application_start_date timestamp with time zone, p_application_end_date timestamp with time zone, p_exam_date timestamp with time zone, p_result_date timestamp with time zone, p_current_status text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_today DATE;
BEGIN
  v_today := CURRENT_DATE;
  
  IF p_current_status = 'ARCHIVED' THEN
    RETURN 'ARCHIVED';
  END IF;
  
  IF p_application_start_date IS NULL THEN
    RETURN 'DRAFT';
  END IF;
  
  IF v_today < DATE(p_application_start_date) THEN
    RETURN 'NOTIFICATION_OUT';
  END IF;
  
  IF p_application_end_date IS NOT NULL THEN
    IF v_today <= DATE(p_application_end_date) THEN
      IF DATE(p_application_end_date) - v_today <= 3 AND DATE(p_application_end_date) - v_today > 0 THEN
        RETURN 'CLOSING_SOON';
      ELSE
        RETURN 'APPLICATION_OPEN';
      END IF;
    ELSE
      RETURN 'APPLICATION_CLOSED';
    END IF;
  END IF;
  
  IF p_exam_date IS NOT NULL THEN
    IF v_today < DATE(p_exam_date) THEN
      RETURN 'EXAM_SCHEDULED';
    ELSIF v_today = DATE(p_exam_date) THEN
      RETURN 'EXAM_SCHEDULED';
    ELSE
      RETURN 'EXAM_COMPLETED';
    END IF;
  END IF;
  
  IF p_result_date IS NOT NULL THEN
    IF v_today <= DATE(p_result_date) THEN
      RETURN 'RESULT_AWAITED';
    ELSE
      RETURN 'RESULT_DECLARED';
    END IF;
  END IF;
  
  RETURN 'APPLICATION_CLOSED';
END;
$function$
