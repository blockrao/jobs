-- SEARCH-003 (ledger A-086): site search runs on recruitments and their live
-- posts, not on the legacy postings table.
--
-- Why: SEARCH-002 searched public.postings. A recruitment whose posts are live
-- but which has no approved posting row was unreachable: 322 live Post pages in
-- 156 recruitments (owner report 2026-10-13: "Junior Executive on Short Term
-- Basis", HAL, recruitment 1686, 9 live posts, no posting row).
--
-- recruitments.search_text is a weighted vector:
--   A  recruitment name, titles of its approved postings
--   B  organization, advertisement number, titles and names of its live posts,
--      real position names (the catch-all "category-%" positions are left out),
--      post names stored on its approved postings
--   C  eligibility and location from its approved postings
--   D  recruitment description, approved posting text, post descriptions
-- Text of a posting that is not approved and published is never used.
--
-- Additive: one nullable column, two new functions, and one added statement at
-- the end of refresh_posting_urgency_states() so the existing daily refresh and
-- the promotion step keep the new column current. This file writes no row; the
-- column is filled the next time the refresh runs. The search query computes
-- the vector on the fly for a row whose column is still NULL, so a recruitment
-- created between refreshes is searchable at once.
-- Updating search_text does not change recruitments.updated_at.
-- Rollback: supabase/rollback/search_003_recruitment_search_text.down.sql

ALTER TABLE public.recruitments ADD COLUMN IF NOT EXISTS search_text tsvector;

CREATE OR REPLACE FUNCTION public.build_recruitment_search_text(r public.recruitments)
 RETURNS tsvector
 LANGUAGE sql
 STABLE
 SET search_path = public, pg_catalog
AS $function$
  SELECT
    setweight(to_tsvector('english', concat_ws(' ',
         r.name,
         (SELECT string_agg(p.title, ' ') FROM postings p
           WHERE p.inferred_recruitment_id = r.id
             AND p.review_status = 'APPROVED'
             AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED'))
       )), 'A')
    || setweight(to_tsvector('english', concat_ws(' ',
         (SELECT o.name FROM organizations o WHERE o.id = r.organization_id),
         r.advertisement_number,
         (SELECT string_agg(concat_ws(' ', po.title, CASE WHEN po.name IS DISTINCT FROM po.title THEN po.name END), ' ')
            FROM posts po WHERE po.recruitment_id = r.id AND po."isLive"),
         (SELECT string_agg(DISTINCT pos.name, ' ')
            FROM posts po JOIN positions pos ON pos.id = po.position_id
           WHERE po.recruitment_id = r.id AND po."isLive" AND pos.slug NOT LIKE 'category-%'),
         (SELECT string_agg(
                   CASE jsonb_typeof(p.post_names)
                     WHEN 'array' THEN (SELECT string_agg(e.value, ' ') FROM jsonb_array_elements_text(p.post_names) AS e(value))
                     WHEN 'string' THEN p.post_names #>> '{}'
                   END, ' ')
            FROM postings p
           WHERE p.inferred_recruitment_id = r.id
             AND p.review_status = 'APPROVED'
             AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED'))
       )), 'B')
    || setweight(to_tsvector('english', concat_ws(' ',
         (SELECT string_agg(concat_ws(' ', p.eligibility, p.location_city, p.location_region), ' ')
            FROM postings p
           WHERE p.inferred_recruitment_id = r.id
             AND p.review_status = 'APPROVED'
             AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED'))
       )), 'C')
    || setweight(to_tsvector('english', concat_ws(' ',
         r.description,
         (SELECT string_agg(concat_ws(' ', p.description, p.requirements, p.responsibilities), ' ')
            FROM postings p
           WHERE p.inferred_recruitment_id = r.id
             AND p.review_status = 'APPROVED'
             AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')),
         (SELECT string_agg(po.description, ' ')
            FROM posts po WHERE po.recruitment_id = r.id AND po."isLive")
       )), 'D');
$function$;

CREATE OR REPLACE FUNCTION public.refresh_recruitment_search_text()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_updated INT := 0;
BEGIN
  -- Only rows whose vector actually changes are written.
  UPDATE recruitments r
  SET search_text = n.vec
  FROM (SELECT r2.id, build_recruitment_search_text(r2) AS vec FROM recruitments r2) n
  WHERE n.id = r.id
    AND r.search_text IS DISTINCT FROM n.vec;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

-- Same body as SEARCH-002 plus the final PERFORM.
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

  -- SEARCH-003: site search reads recruitments.search_text.
  PERFORM refresh_recruitment_search_text();

  RETURN QUERY SELECT v_updated, NOW();
END;
$function$;
