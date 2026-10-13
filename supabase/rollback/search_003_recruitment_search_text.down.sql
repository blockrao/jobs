-- Rollback for 20261013042000_search_003_recruitment_search_text.sql.
-- Never applied automatically. Deploy code that does not read
-- recruitments.search_text BEFORE running this (the SEARCH-003 search query
-- calls build_recruitment_search_text and reads the column).

-- SEARCH-002 body of the refresh function (no recruitment refresh).
CREATE OR REPLACE FUNCTION public.refresh_posting_urgency_states()
 RETURNS TABLE(updated_postings integer, last_refreshed timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_updated INT := 0;
BEGIN
  -- Update urgency states and search text
  UPDATE postings p
  SET
    announcement_state = get_announcement_state(p.created_at),
    closing_state = get_closing_state(DATE(p.valid_through)),
    urgency_score = calculate_urgency_score(p.created_at, DATE(p.valid_through)),
    days_to_closing = (DATE(p.valid_through) - CURRENT_DATE),
    search_text = build_posting_search_text(p)
  WHERE p.review_status = 'APPROVED'
    AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN QUERY SELECT v_updated, NOW();
END;
$function$;

DROP FUNCTION IF EXISTS public.refresh_recruitment_search_text();
DROP FUNCTION IF EXISTS public.build_recruitment_search_text(public.recruitments);
ALTER TABLE public.recruitments DROP COLUMN IF EXISTS search_text;
