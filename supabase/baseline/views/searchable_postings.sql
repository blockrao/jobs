 SELECT p.id,
    p.slug,
    p.title,
    p.organization_id,
    o.name AS organization_name,
    p.location_region,
    p.location_city,
    p.eligibility,
    p.total_vacancies,
    p.valid_through,
    p.created_at,
    p.last_verified_at,
    p.publishing_status,
    p.announcement_state,
    p.closing_state,
    p.urgency_score,
    p.days_to_closing,
    p.source_confidence,
        CASE
            WHEN ((p.announcement_state)::text = 'ANNOUNCED_TODAY'::text) THEN 'Hot'::text
            WHEN ((p.closing_state)::text = ANY (ARRAY[('LAST_DATE_TODAY'::character varying)::text, ('CLOSING_TOMORROW'::character varying)::text])) THEN 'Urgent'::text
            WHEN ((p.closing_state)::text = 'CLOSING_THIS_WEEK'::text) THEN 'This Week'::text
            WHEN ((p.announcement_state)::text = 'ANNOUNCED_THIS_WEEK'::text) THEN 'Fresh'::text
            ELSE 'Open'::text
        END AS urgency_badge,
        CASE
            WHEN (((p.announcement_state)::text = 'ANNOUNCED_TODAY'::text) AND (p.days_to_closing <= 7)) THEN 'CRITICAL'::text
            WHEN ((p.announcement_state)::text = 'ANNOUNCED_TODAY'::text) THEN 'HOT'::text
            WHEN ((p.closing_state)::text = ANY (ARRAY[('LAST_DATE_TODAY'::character varying)::text, ('CLOSING_TOMORROW'::character varying)::text])) THEN 'URGENT'::text
            WHEN ((p.closing_state)::text = 'CLOSING_THIS_WEEK'::text) THEN 'HIGH'::text
            WHEN ((p.announcement_state)::text = 'ANNOUNCED_THIS_WEEK'::text) THEN 'MEDIUM'::text
            ELSE 'NORMAL'::text
        END AS priority_level
   FROM ((postings p
     LEFT JOIN organizations o ON ((o.id = p.organization_id)))
     LEFT JOIN recruitments r ON ((r.id = p.inferred_recruitment_id)))
  WHERE ((p.review_status = 'APPROVED'::review_status) AND ((p.publishing_status)::text = ANY (ARRAY[('AUTOMATED_VALIDATION_PASS'::character varying)::text, ('PUBLISHED'::character varying)::text])) AND (p.is_expired = false))
  ORDER BY p.urgency_score DESC, p.created_at DESC;
