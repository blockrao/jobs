-- SEARCH-002 (ledger A-084): site search matches the title, the subject and the
-- body of a posting.
--
-- Before: postings.search_text held title, organization, one position name,
-- eligibility and location. The description was not searchable, post names
-- were missing for every posting without inferred_post_id (412 of 672 public
-- postings), and nothing from the posts under the recruitment was indexed.
--
-- After: search_text is a weighted vector.
--   A  title
--   B  organization, recruitment name, post names (postings.post_names and
--      the posts under the recruitment), position name
--   C  eligibility, location
--   D  description, requirements, responsibilities, post descriptions
--
-- Additive: adds one function and replaces the body of
-- refresh_posting_urgency_states(), whose only change is the search_text
-- expression. generate_posting_search_text() is kept. This file does not
-- execute the refresh and touches no row; the stored vectors change the next
-- time the refresh runs (daily lifecycle cron, promotion, or by hand).
-- Rollback: supabase/rollback/search_002_weighted_search_text.down.sql

CREATE OR REPLACE FUNCTION public.build_posting_search_text(p public.postings)
 RETURNS tsvector
 LANGUAGE sql
 STABLE
 SET search_path = public, pg_catalog
AS $function$
  SELECT
    setweight(to_tsvector('english', COALESCE(p.title, '')), 'A')
    || setweight(to_tsvector('english', concat_ws(' ',
         (SELECT o.name FROM organizations o WHERE o.id = p.organization_id),
         (SELECT r.name FROM recruitments r WHERE r.id = p.inferred_recruitment_id),
         CASE jsonb_typeof(p.post_names)
           WHEN 'array' THEN (SELECT string_agg(e.value, ' ') FROM jsonb_array_elements_text(p.post_names) AS e(value))
           WHEN 'string' THEN p.post_names #>> '{}'
         END,
         (SELECT string_agg(concat_ws(' ', po.title, po.name), ' ')
            FROM posts po WHERE po.recruitment_id = p.inferred_recruitment_id),
         (SELECT string_agg(pos.name, ' ')
            FROM positions pos
           WHERE pos.id IN (SELECT po.position_id FROM posts po
                             WHERE po.id = p.inferred_post_id
                                OR po.recruitment_id = p.inferred_recruitment_id))
       )), 'B')
    || setweight(to_tsvector('english', concat_ws(' ',
         p.eligibility, p.location_city, p.location_region
       )), 'C')
    || setweight(to_tsvector('english', concat_ws(' ',
         p.description, p.requirements, p.responsibilities,
         (SELECT string_agg(po.description, ' ')
            FROM posts po WHERE po.recruitment_id = p.inferred_recruitment_id)
       )), 'D');
$function$;

-- Trust boundary: SEC-001's default privileges already deny EXECUTE on
-- functions created by the owning role to anon, authenticated and public, so
-- no explicit revoke is needed here (verified after apply).

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
