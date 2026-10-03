CREATE OR REPLACE FUNCTION public.generate_posting_search_text(p_title text, p_organization_name text, p_position_name text, p_eligibility text, p_location text)
 RETURNS tsvector
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  RETURN to_tsvector(
    'english',
    COALESCE(p_title, '') || ' ' ||
    COALESCE(p_organization_name, '') || ' ' ||
    COALESCE(p_position_name, '') || ' ' ||
    COALESCE(p_eligibility, '') || ' ' ||
    COALESCE(p_location, '')
  );
END;
$function$
