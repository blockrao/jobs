 SELECT p.id,
    p.slug,
    p.title,
    p.organization_id,
    o.name AS organization_name,
    p.publishing_status,
    p.valid_through,
    p.last_verified_at
   FROM (postings p
     LEFT JOIN organizations o ON ((o.id = p.organization_id)))
  WHERE ((p.review_status = 'APPROVED'::review_status) AND ((p.publishing_status)::text = ANY (ARRAY[('AUTOMATED_VALIDATION_PASS'::character varying)::text, ('PUBLISHED'::character varying)::text])) AND (p.is_expired = false))
  ORDER BY p.created_at DESC;
