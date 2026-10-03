 SELECT p.id,
    p.title,
    p.organization_id,
    o.name AS organization_name,
    p.expired_at,
    p.expiration_reason,
    p.last_verified_at
   FROM (postings p
     LEFT JOIN organizations o ON ((o.id = p.organization_id)))
  WHERE ((p.is_expired = true) AND (p.review_status = 'APPROVED'::review_status) AND ((p.publishing_status)::text = ANY (ARRAY[('AUTOMATED_VALIDATION_PASS'::character varying)::text, ('PUBLISHED'::character varying)::text])))
  ORDER BY p.expired_at DESC;
