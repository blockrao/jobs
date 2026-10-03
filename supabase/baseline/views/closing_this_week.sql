 SELECT id,
    slug,
    title,
    organization_id,
    organization_name,
    location_region,
    location_city,
    eligibility,
    total_vacancies,
    valid_through,
    created_at,
    last_verified_at,
    publishing_status,
    announcement_state,
    closing_state,
    urgency_score,
    days_to_closing,
    source_confidence,
    urgency_badge,
    priority_level
   FROM searchable_postings
  WHERE ((closing_state)::text = 'CLOSING_THIS_WEEK'::text)
  ORDER BY days_to_closing
 LIMIT 50;
