-- A-041: refresh_posting_urgency_states() read public.organizations_new, a table
-- that does not exist, so the function raised an error and search/urgency values
-- were populated on only 5 postings. Its only change here is the table name:
-- organizations_new -> organizations (the live organizations table).
-- Replaces the function body only. It does not execute the function, change a
-- table, or touch any row. The helper functions it calls already exist.
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
    search_text = generate_posting_search_text(
      p.title,
      (SELECT o.name FROM organizations o WHERE o.id = p.organization_id),
      (SELECT pos.name FROM positions pos WHERE pos.id IN (SELECT position_id FROM posts WHERE posts.id = p.inferred_post_id)),
      p.eligibility,
      COALESCE(p.location_region, '') || ' ' || COALESCE(p.location_city, '')
    )
  WHERE p.review_status = 'APPROVED'
    AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN QUERY SELECT v_updated, NOW();
END;
$function$;
