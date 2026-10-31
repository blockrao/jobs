-- P0: require an explicit human issuer-source review before official-digest promotion.
-- Stage 1 is additive: add provenance fields and write guards, preserving the existing public data state.
-- Deploy the application source gate after this migration, then run the remediation migration.

-- Discovery origin and verification state are separate facts. Preserve the original
-- aggregator discovery source while A-070 uses official_link_source for link verification.
ALTER TABLE public.recruitments
  ADD COLUMN IF NOT EXISTS source_discovery_origin text;

UPDATE public.recruitments
SET source_discovery_origin = 'AGGREGATOR_DISCOVERED'
WHERE official_link_source = 'AGGREGATOR_DISCOVERED'
  AND source_discovery_origin IS NULL;

CREATE INDEX IF NOT EXISTS idx_recruitments_source_discovery_origin
  ON public.recruitments(source_discovery_origin)
  WHERE source_discovery_origin IS NOT NULL;

COMMENT ON COLUMN public.recruitments.source_discovery_origin IS
  'Immutable origin of recruitment discovery (for example AGGREGATOR_DISCOVERED); distinct from official_link_source verification state.';

-- The promotion function links a recruitment to staging by batch + official URL.
-- Enforce that this key is unambiguous before it can authorize fact review.
CREATE UNIQUE INDEX IF NOT EXISTS uq_official_digest_promote_batch_official_url
  ON public.official_digest_promote (batch, (hub ->> 'official_url'))
  WHERE nullif(btrim(hub ->> 'official_url'), '') IS NOT NULL;

-- Education already had verified_at; add source pointers. Experience previously
-- had no verification timestamp at all, so add the complete fact-level evidence fields.
ALTER TABLE public.posts_education
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_locator text;

ALTER TABLE public.posts_experience
  ADD COLUMN IF NOT EXISTS verified_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_locator text;

ALTER TABLE public.posts_vacancies
  ADD COLUMN IF NOT EXISTS verified_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_locator text;

ALTER TABLE public.posts_selection_process
  ADD COLUMN IF NOT EXISTS verified_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_locator text;

ALTER TABLE public.posts_documents
  ADD COLUMN IF NOT EXISTS verified_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_locator text;

ALTER TABLE public.posts_important_dates
  ADD COLUMN IF NOT EXISTS extracted_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS verified_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_locator text;

ALTER TABLE public.post_age_rules
  ADD COLUMN IF NOT EXISTS source varchar(100) NOT NULL DEFAULT 'legacy_unknown',
  ADD COLUMN IF NOT EXISTS extracted_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS verified_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_locator text;

ALTER TABLE public.posts_application_fee
  ADD COLUMN IF NOT EXISTS category varchar(100),
  ADD COLUMN IF NOT EXISTS verified_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_locator text;

ALTER TABLE public.posts_official_links
  ADD COLUMN IF NOT EXISTS extracted_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS verified_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_locator text;

ALTER TABLE public.official_digest_promote
  ADD COLUMN IF NOT EXISTS authority_review_status text NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS authority_evidence_url text,
  ADD COLUMN IF NOT EXISTS authority_reviewed_by text,
  ADD COLUMN IF NOT EXISTS authority_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS authority_review_notes text,
  ADD COLUMN IF NOT EXISTS fact_review_status text NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS fact_reviewed_fields text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fact_review_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fact_reviewed_by text,
  ADD COLUMN IF NOT EXISTS fact_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS fact_review_notes text;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'official_digest_authority_review_status_check'
      AND conrelid = 'public.official_digest_promote'::regclass
  ) THEN
    ALTER TABLE public.official_digest_promote
      ADD CONSTRAINT official_digest_authority_review_status_check
      CHECK (authority_review_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'official_digest_fact_review_status_check'
      AND conrelid = 'public.official_digest_promote'::regclass
  ) THEN
    ALTER TABLE public.official_digest_promote
      ADD CONSTRAINT official_digest_fact_review_status_check
      CHECK (fact_review_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED'));
  END IF;
END $do$;

COMMENT ON COLUMN public.official_digest_promote.authority_review_status IS
  'Human review of whether official_url is an issuing-authority publication. Document extraction alone never satisfies this gate.';
COMMENT ON COLUMN public.official_digest_promote.authority_evidence_url IS
  'HTTPS issuer-controlled page or publication proving the notification URL is an authentic issuer source.';
COMMENT ON COLUMN public.official_digest_promote.authority_reviewed_by IS
  'Reviewer identity for the manual issuer-source authority decision.';
COMMENT ON COLUMN public.official_digest_promote.authority_reviewed_at IS
  'Timestamp of the manual issuer-source authority decision.';
COMMENT ON COLUMN public.official_digest_promote.authority_review_notes IS
  'Short evidence note explaining how the issuer relationship was confirmed.';
COMMENT ON COLUMN public.official_digest_promote.fact_review_status IS
  'Human review that the extracted recruitment/post facts were checked against the issuer notification.';
COMMENT ON COLUMN public.official_digest_promote.fact_reviewed_fields IS
  'Explicit field keys checked by the reviewer; use post:<post-name>:<field> and hub:<field> keys.';
COMMENT ON COLUMN public.official_digest_promote.fact_review_evidence IS
  'JSON object keyed by fact_reviewed_fields; each value records the notification page and supporting excerpt.';
COMMENT ON COLUMN public.official_digest_promote.fact_reviewed_by IS
  'Reviewer identity for the fact-accuracy decision.';
COMMENT ON COLUMN public.official_digest_promote.fact_reviewed_at IS
  'Timestamp of the fact-accuracy review.';
COMMENT ON COLUMN public.official_digest_promote.fact_review_notes IS
  'Short notes describing the fact-level review and any exclusions.';

CREATE OR REPLACE FUNCTION public.official_digest_authority_review_complete(
  p_status text,
  p_evidence_url text,
  p_reviewed_by text,
  p_reviewed_at timestamptz,
  p_review_notes text
) RETURNS boolean
LANGUAGE sql
STABLE
AS $fn$
  SELECT COALESCE(
    p_status = 'VERIFIED'
    AND p_evidence_url ~* '^https://'
    AND nullif(btrim(p_reviewed_by), '') IS NOT NULL
    AND p_reviewed_at IS NOT NULL
    AND p_reviewed_at <= now()
    AND nullif(btrim(p_review_notes), '') IS NOT NULL,
    false
  );
$fn$;

CREATE OR REPLACE FUNCTION public.official_digest_required_fact_keys(
  p_hub jsonb,
  p_posts jsonb
) RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $required$
  SELECT COALESCE(array_agg(expected.field_key ORDER BY expected.field_key), '{}'::text[])
  FROM (
    SELECT 'hub:' || field_key AS field_key
    FROM unnest(ARRAY[
      'org_full',
      'org_short',
      'official_notification_number',
      'advertisement_number',
      'description',
      'official_url',
      'apply_url',
      'notification_date',
      'application_start_date',
      'application_end_date',
      'end_date_note',
      'total_vacancies',
      'fee_general',
      'fee_reserved',
      'fee_note',
      'age_note',
      'selection_process',
      'salary_note',
      'employment_type',
      'location_city',
      'state_code',
      'application_email'
    ]::text[]) AS hub_fields(field_key)
    WHERE nullif(btrim(coalesce(p_hub, '{}'::jsonb) ->> field_key), '') IS NOT NULL

    UNION ALL

    SELECT
      'post:' || coalesce(nullif(btrim(post_item.item ->> 'name'), ''), 'unnamed-' || post_item.ordinality::text)
      || ':' || post_fields.field_key AS field_key
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(coalesce(p_posts, '[]'::jsonb)) = 'array' THEN coalesce(p_posts, '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS post_item(item, ordinality)
    CROSS JOIN unnest(ARRAY[
      'name',
      'description',
      'post_code',
      'vacancy_total',
      'vacancy_details',
      'salary_min',
      'salary_max',
      'pay_scale_text',
      'employment_type',
      'qualification_text',
      'experience_text',
      'age_min',
      'age_max'
    ]::text[]) AS post_fields(field_key)
    WHERE nullif(btrim(post_item.item ->> post_fields.field_key), '') IS NOT NULL

    UNION ALL

    -- Explicitly review the presence or absence of application-window dates.
    SELECT 'hub:' || required_hub_fields.field_key AS field_key
    FROM unnest(ARRAY[
      'org_full',
      'year',
      'application_start_date',
      'application_end_date'
    ]::text[]) AS required_hub_fields(field_key)

    UNION ALL

    -- These fact families may be populated by canonical child tables after
    -- staging, so the reviewer must explicitly verify them (or record "not stated").
    SELECT
      'post:' || coalesce(nullif(btrim(post_item.item ->> 'name'), ''), 'unnamed-' || post_item.ordinality::text)
      || ':' || required_post_fields.field_key AS field_key
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(coalesce(p_posts, '[]'::jsonb)) = 'array' THEN coalesce(p_posts, '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS post_item(item, ordinality)
    CROSS JOIN unnest(ARRAY[
      'description',
      'employment_type',
      'education',
      'experience',
      'eligibility',
      'age_rules',
      'vacancies',
      'salary',
      'application_fees',
      'documents',
      'selection_process',
      'important_dates',
      'official_links'
    ]::text[]) AS required_post_fields(field_key)
    WHERE nullif(btrim(post_item.item ->> 'name'), '') IS NOT NULL
  ) AS expected;
$required$;

CREATE OR REPLACE FUNCTION public.official_digest_fact_review_complete(
  p_status text,
  p_reviewed_fields text[],
  p_fact_evidence jsonb,
  p_hub jsonb,
  p_posts jsonb,
  p_reviewed_by text,
  p_reviewed_at timestamptz,
  p_review_notes text
) RETURNS boolean
LANGUAGE sql
STABLE
AS $fact$
  SELECT COALESCE(
    p_status = 'VERIFIED'
    AND CASE
      WHEN jsonb_typeof(coalesce(p_posts, '[]'::jsonb)) = 'array'
        THEN jsonb_array_length(coalesce(p_posts, '[]'::jsonb)) > 0
      ELSE false
    END
    AND cardinality(coalesce(p_reviewed_fields, '{}'::text[])) > 0
    AND jsonb_typeof(coalesce(p_fact_evidence, '{}'::jsonb)) = 'object'
    -- Field keys use post names. Reject missing or duplicate names so one
    -- review key can never accidentally authorize two distinct canonical leaves.
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(coalesce(p_posts, '[]'::jsonb)) = 'array' THEN coalesce(p_posts, '[]'::jsonb)
          ELSE '[]'::jsonb
        END
      ) AS post_item(item)
      WHERE nullif(btrim(post_item.item ->> 'name'), '') IS NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(coalesce(p_posts, '[]'::jsonb)) = 'array' THEN coalesce(p_posts, '[]'::jsonb)
          ELSE '[]'::jsonb
        END
      ) AS post_item(item)
      GROUP BY lower(btrim(post_item.item ->> 'name'))
      HAVING count(*) > 1
    )
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(coalesce(p_reviewed_fields, '{}'::text[])) AS reviewed(field_key)
      WHERE nullif(btrim(reviewed.field_key), '') IS NULL
         OR jsonb_typeof(coalesce(p_fact_evidence, '{}'::jsonb) -> reviewed.field_key) IS DISTINCT FROM 'object'
         OR nullif(btrim((coalesce(p_fact_evidence, '{}'::jsonb) -> reviewed.field_key) ->> 'evidence_ref'), '') IS NULL
         OR nullif(btrim((coalesce(p_fact_evidence, '{}'::jsonb) -> reviewed.field_key) ->> 'excerpt'), '') IS NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(public.official_digest_required_fact_keys(p_hub, p_posts)) AS required(field_key)
      WHERE NOT (coalesce(p_reviewed_fields, '{}'::text[]) @> ARRAY[required.field_key])
    )
    AND nullif(btrim(p_reviewed_by), '') IS NOT NULL
    AND p_reviewed_at IS NOT NULL
    AND p_reviewed_at <= now()
    AND nullif(btrim(p_review_notes), '') IS NOT NULL,
    false
  );
$fact$;


CREATE OR REPLACE FUNCTION public.guard_official_digest_promotion_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Any change to the reviewed source payload invalidates both decisions.
  -- Reviewers must re-check the issuer link and all affected facts.
  IF OLD.hub IS DISTINCT FROM NEW.hub OR OLD.posts IS DISTINCT FROM NEW.posts THEN
    NEW.authority_review_status := 'UNVERIFIED';
    NEW.authority_evidence_url := NULL;
    NEW.authority_reviewed_by := NULL;
    NEW.authority_reviewed_at := NULL;
    NEW.authority_review_notes := NULL;
    NEW.fact_review_status := 'UNVERIFIED';
    NEW.fact_reviewed_fields := '{}'::text[];
    NEW.fact_review_evidence := '{}'::jsonb;
    NEW.fact_reviewed_by := NULL;
    NEW.fact_reviewed_at := NULL;
    NEW.fact_review_notes := NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'PROMOTED' AND NEW.status <> 'PROMOTED' THEN
    RAISE EXCEPTION 'Promoted official-digest rows are terminal; revoke authority/fact review instead of resetting promotion status';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.status = 'PROMOTED'
     AND OLD.status NOT IN ('PENDING', 'PROMOTED') THEN
    RAISE EXCEPTION 'Only PENDING official-digest rows can be promoted';
  END IF;

  IF NEW.authority_review_status = 'VERIFIED'
     AND (
       NOT COALESCE((NEW.hub ->> 'official_url') ~* '^https://', false)
       OR NOT public.official_digest_authority_review_complete(
         NEW.authority_review_status,
         NEW.authority_evidence_url,
         NEW.authority_reviewed_by,
         NEW.authority_reviewed_at,
         NEW.authority_review_notes
       )
     ) THEN
    RAISE EXCEPTION
      'Issuer-source review cannot be VERIFIED without an HTTPS notification URL, HTTPS evidence URL, reviewer, timestamp and evidence notes (batch %, row %)',
      NEW.batch, NEW.rownum;
  END IF;

  IF NEW.fact_review_status = 'VERIFIED'
     AND NOT public.official_digest_fact_review_complete(
       NEW.fact_review_status,
       NEW.fact_reviewed_fields,
       NEW.fact_review_evidence,
       NEW.hub,
       NEW.posts,
       NEW.fact_reviewed_by,
       NEW.fact_reviewed_at,
       NEW.fact_review_notes
     ) THEN
    RAISE EXCEPTION
      'Fact review cannot be VERIFIED without reviewed field keys, matching evidence, reviewer, timestamp and notes (batch %, row %)',
      NEW.batch, NEW.rownum;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'PENDING'
     AND NEW.status = 'PROMOTED'
     AND (
       NEW.authority_review_status <> 'VERIFIED'
       OR NEW.fact_review_status <> 'VERIFIED'
     ) THEN
    RAISE EXCEPTION
      'Official-digest promotion blocked: issuer-source and fact-accuracy reviews are both required for batch %, row %',
      NEW.batch, NEW.rownum;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_official_digest_promotion_review
  ON public.official_digest_promote;
CREATE TRIGGER trg_guard_official_digest_promotion_review
BEFORE UPDATE OF
  status,
  authority_review_status, authority_evidence_url, authority_reviewed_by, authority_reviewed_at, authority_review_notes,
  fact_review_status, fact_reviewed_fields, fact_review_evidence, fact_reviewed_by, fact_reviewed_at, fact_review_notes,
  hub, posts
ON public.official_digest_promote
FOR EACH ROW
EXECUTE FUNCTION public.guard_official_digest_promotion_review();

-- Defence in depth: even alternate writers cannot set an aggregator-discovered
-- recruitment to VERIFIED without the matching reviewed staging record.
-- Preserve fact-level provenance in canonical JSONB whenever enrichment is rebuilt.
-- This function intentionally mirrors the existing aggregation contract while
-- retaining the source, confidence and verification timestamp for education
-- and experience facts. The preservation trigger above retains source_provenance.
CREATE OR REPLACE FUNCTION public.aggregate_enrichment_for_post(p_post_id INT)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $aggregate$
DECLARE
  v_enrichment jsonb := '{}'::jsonb;
BEGIN
  v_enrichment := v_enrichment || jsonb_build_object(
    'vacancies',
    (SELECT jsonb_build_object(
      'total', SUM(pv.total_vacancies)::INT,
      'categories', COALESCE(
        jsonb_object_agg(pv.category, pv.total_vacancies::INT)
          FILTER (WHERE pv.category IS NOT NULL),
        '{}'::jsonb
      ),
      'location_count', MAX(pv.location_count)::INT,
      'category_count', MAX(pv.category_count)::INT,
      'by_location', COALESCE(
        jsonb_object_agg(pv.location, pv.total_vacancies::INT)
          FILTER (WHERE pv.location IS NOT NULL),
        '{}'::jsonb
      ),
      'rows', COALESCE(
        jsonb_agg(jsonb_build_object(
          'fact_id', pv.id,
          'category', pv.category,
          'total_vacancies', pv.total_vacancies,
          'location', pv.location,
          'state', pv.state,
          'location_count', pv.location_count,
          'category_count', pv.category_count,
          'source', pv.source,
          'extracted_at', pv.extracted_at,
          'verified_at', pv.verified_at,
          'source_ref', pv.source_ref,
          'source_locator', pv.source_locator
        ) ORDER BY pv.id),
        '[]'::jsonb
      )
    )
    FROM public.posts_vacancies pv
    WHERE pv.post_id = p_post_id)
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'education',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'fact_id', pe.id,
        'degree', pe.degree,
        'subject', pe.subject,
        'specialization', pe.specialization,
        'minimum_percentage', pe.minimum_percentage,
        'minimum_marks', pe.minimum_marks,
        'source', pe.source,
        'confidence_score', pe.confidence_score,
        'extracted_at', pe.extracted_at,
        'verified_at', pe.verified_at,
        'source_ref', pe.source_ref,
        'source_locator', pe.source_locator
      ) ORDER BY pe.id)
      FROM public.posts_education pe
      WHERE pe.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'experience',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'fact_id', pex.id,
        'total_years', pex.total_years,
        'min_years', pex.min_years,
        'type', pex.experience_type,
        'experience_type', pex.experience_type,
        'source', pex.source,
        'confidence_score', pex.confidence_score,
        'extracted_at', pex.extracted_at,
        'verified_at', pex.verified_at,
        'source_ref', pex.source_ref,
        'source_locator', pex.source_locator
      ) ORDER BY pex.id)
      FROM public.posts_experience pex
      WHERE pex.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'selection_process',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'fact_id', psp.id,
        'step', psp.stage_order,
        'name', psp.stage_name,
        'scheduled_date', psp.scheduled_date,
        'duration_minutes', psp.duration_minutes,
        'total_marks', psp.total_marks,
        'minimum_marks', psp.minimum_marks,
        'passing_marks', psp.passing_marks,
        'mode', psp.mode,
        'is_qualifying', psp.is_qualifying,
        'source', psp.source,
        'extracted_at', psp.extracted_at,
        'verified_at', psp.verified_at,
        'source_ref', psp.source_ref,
        'source_locator', psp.source_locator
      ) ORDER BY psp.stage_order NULLS LAST, psp.id)
      FROM public.posts_selection_process psp
      WHERE psp.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'documents',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'fact_id', pd.id,
        'name', pd.document_name,
        'category', pd.document_category,
        'required', pd.is_required,
        'required_for_categories', pd.required_for_categories,
        'source', pd.source,
        'extracted_at', pd.extracted_at,
        'verified_at', pd.verified_at,
        'source_ref', pd.source_ref,
        'source_locator', pd.source_locator
      ) ORDER BY pd.id)
      FROM public.posts_documents pd
      WHERE pd.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'important_dates',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'fact_id', pid.id,
        'label', pid.date_type,
        'date', pid.date_value,
        'notes', pid.notes,
        'source', pid.source,
        'extracted_at', pid.extracted_at,
        'verified_at', pid.verified_at,
        'source_ref', pid.source_ref,
        'source_locator', pid.source_locator
      ) ORDER BY pid.id)
      FROM public.posts_important_dates pid
      WHERE pid.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'age_rules',
    COALESCE(
      (SELECT jsonb_object_agg(par.category, jsonb_build_object(
        'fact_id', par.id,
        'max', par.max_age,
        'relaxation_years', par.relaxation_years,
        'note', par.note,
        'rule_type', par.rule_type,
        'condition_text', par.condition_text,
        'source', par.source,
        'extracted_at', par.extracted_at,
        'verified_at', par.verified_at,
        'source_ref', par.source_ref,
        'source_locator', par.source_locator
      ))
      FROM public.post_age_rules par
      WHERE par.post_id = p_post_id),
      '{}'::jsonb
    )
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'application_fees',
    COALESCE(
      (SELECT jsonb_object_agg(paf.category, jsonb_build_object(
        'fact_id', paf.id,
        'amount', paf.fee_amount,
        'currency', paf.fee_currency,
        'waived_for', paf.fee_waived_for,
        'payment_methods', paf.payment_methods,
        'source', paf.source,
        'extracted_at', paf.extracted_at,
        'verified_at', paf.verified_at,
        'source_ref', paf.source_ref,
        'source_locator', paf.source_locator
      )) FILTER (WHERE paf.category IS NOT NULL)
      FROM public.posts_application_fee paf
      WHERE paf.post_id = p_post_id),
      '{}'::jsonb
    )
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'official_links',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'fact_id', pol.id,
        'type', pol.link_type,
        'title', pol.link_label,
        'url', pol.link_url,
        'source', pol.source,
        'extracted_at', pol.extracted_at,
        'verified_at', pol.verified_at,
        'source_ref', pol.source_ref,
        'source_locator', pol.source_locator
      ) ORDER BY pol.id)
      FROM public.posts_official_links pol
      WHERE pol.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  RETURN v_enrichment;
END;
$aggregate$;

CREATE OR REPLACE FUNCTION public.guard_aggregator_discovered_recruitment_verification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $recruitment$
DECLARE
  v_review public.official_digest_promote%ROWTYPE;
  v_review_ok boolean := false;
BEGIN
  -- Backward compatibility for the historical promotion function: it still
  -- writes AGGREGATOR_DISCOVERED into official_link_source. Capture that as
  -- immutable origin before applying the independent verification-state gate.
  IF NEW.official_link_source = 'AGGREGATOR_DISCOVERED'
     AND NEW.source_discovery_origin IS NULL THEN
    NEW.source_discovery_origin := 'AGGREGATOR_DISCOVERED';
  END IF;

  -- Source origin is provenance, not a mutable verification label. Keep the
  -- original aggregator discovery origin even after a successful issuer review.
  -- Otherwise an alternate writer could relabel the record and bypass this gate.
  IF TG_OP = 'UPDATE'
     AND OLD.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
     AND NEW.source_discovery_origin IS DISTINCT FROM OLD.source_discovery_origin THEN
    RAISE EXCEPTION
      'AGGREGATOR_DISCOVERED discovery origin is immutable; record link verification separately';
  END IF;

  IF NEW.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
     AND NEW.verification_status = 'VERIFIED' THEN
    SELECT d.* INTO v_review
    FROM public.official_digest_promote d
    WHERE d.batch = NEW.metadata ->> 'ingest_batch'
      AND d.hub ->> 'official_url' = NEW.official_notification_url
      AND d.status = 'PROMOTED'
    ORDER BY d.rownum
    LIMIT 1;

    v_review_ok := FOUND
      AND public.official_digest_authority_review_complete(
        v_review.authority_review_status,
        v_review.authority_evidence_url,
        v_review.authority_reviewed_by,
        v_review.authority_reviewed_at,
        v_review.authority_review_notes
      )
      AND public.official_digest_fact_review_complete(
        v_review.fact_review_status,
        v_review.fact_reviewed_fields,
        v_review.fact_review_evidence,
        v_review.hub,
        v_review.posts,
        v_review.fact_reviewed_by,
        v_review.fact_reviewed_at,
        v_review.fact_review_notes
      );

    IF NOT v_review_ok THEN
      NEW.official_link_source := 'UNVERIFIED';
      NEW.verification_status := 'UNVERIFIABLE';
      NEW.last_verified_at := NULL;
    ELSE
      NEW.official_link_source := 'MANUAL_VERIFIED';
      NEW.metadata := coalesce(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
        'source_provenance', jsonb_build_object(
          'discovery_origin', 'AGGREGATOR_DISCOVERED',
          'staging_batch', v_review.batch,
          'staging_row', v_review.rownum,
          'authority_review', jsonb_build_object(
            'status', v_review.authority_review_status,
            'evidence_url', v_review.authority_evidence_url,
            'reviewed_by', v_review.authority_reviewed_by,
            'reviewed_at', v_review.authority_reviewed_at,
            'notes', v_review.authority_review_notes
          ),
          'fact_review', jsonb_build_object(
            'status', v_review.fact_review_status,
            'reviewed_fields', v_review.fact_reviewed_fields,
            'evidence', v_review.fact_review_evidence,
            'reviewed_by', v_review.fact_reviewed_by,
            'reviewed_at', v_review.fact_reviewed_at,
            'notes', v_review.fact_review_notes
          )
        )
      );

      -- If an existing promoted row is being reviewed now, upgrade its child
      -- posts and enrichment atomically with the recruitment verification.
      UPDATE public.posts
      SET "sourceName" = 'official_notification',
          "isOfficialSource" = true,
          is_official_source = true,
          enrichment = coalesce(enrichment, '{}'::jsonb)
            || jsonb_build_object(
              'source_provenance', NEW.metadata -> 'source_provenance',
              'sourceVerificationStatus', 'VERIFIED',
              'sourceVerificationDate', v_review.fact_reviewed_at
            ),
          updated_at = now()
      WHERE recruitment_id = NEW.id;

      UPDATE public.post_enrichments pe
      SET "sourceVerificationStatus" = 'VERIFIED',
          "sourceVerificationDate" = v_review.fact_reviewed_at,
          updated_at = now()
      FROM public.posts p
      WHERE p.id = pe.post_id
        AND p.recruitment_id = NEW.id;

      UPDATE public.eligibilities e
      SET status = 'VERIFIED',
          verified_at = v_review.fact_reviewed_at,
          source_type = 'OFFICIAL_NOTIFICATION',
          source_ref = v_review.authority_evidence_url,
          source_locator = v_review.fact_review_evidence -> (
            'post:' || p.name || ':eligibility'
          ) ->> 'evidence_ref',
          derivation = 'NORMALIZED',
          updated_at = now()
      FROM public.posts p
      WHERE e.post_id = p.id
        AND p.recruitment_id = NEW.id
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || p.name || ':eligibility'];

      UPDATE public.posts_education e
      SET verified_at = v_review.fact_reviewed_at AT TIME ZONE 'UTC',
          source_ref = v_review.authority_evidence_url,
          source_locator = v_review.fact_review_evidence -> (
            'post:' || p.name || ':education'
          ) ->> 'evidence_ref'
      FROM public.posts p
      WHERE e.post_id = p.id
        AND p.recruitment_id = NEW.id
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || p.name || ':education'];

      UPDATE public.posts_experience x
      SET verified_at = v_review.fact_reviewed_at AT TIME ZONE 'UTC',
          source_ref = v_review.authority_evidence_url,
          source_locator = v_review.fact_review_evidence -> (
            'post:' || p.name || ':experience'
          ) ->> 'evidence_ref'
      FROM public.posts p
      WHERE x.post_id = p.id
        AND p.recruitment_id = NEW.id
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || p.name || ':experience'];

      UPDATE public.posts_vacancies x
      SET verified_at = v_review.fact_reviewed_at AT TIME ZONE 'UTC',
          source_ref = v_review.authority_evidence_url,
          source_locator = v_review.fact_review_evidence -> (
            'post:' || p.name || ':vacancies'
          ) ->> 'evidence_ref'
      FROM public.posts p
      WHERE x.post_id = p.id
        AND p.recruitment_id = NEW.id
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || p.name || ':vacancies'];

      UPDATE public.posts_selection_process x
      SET verified_at = v_review.fact_reviewed_at AT TIME ZONE 'UTC',
          source_ref = v_review.authority_evidence_url,
          source_locator = v_review.fact_review_evidence -> (
            'post:' || p.name || ':selection_process'
          ) ->> 'evidence_ref'
      FROM public.posts p
      WHERE x.post_id = p.id
        AND p.recruitment_id = NEW.id
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || p.name || ':selection_process'];

      UPDATE public.posts_documents x
      SET verified_at = v_review.fact_reviewed_at AT TIME ZONE 'UTC',
          source_ref = v_review.authority_evidence_url,
          source_locator = v_review.fact_review_evidence -> (
            'post:' || p.name || ':documents'
          ) ->> 'evidence_ref'
      FROM public.posts p
      WHERE x.post_id = p.id
        AND p.recruitment_id = NEW.id
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || p.name || ':documents'];

      UPDATE public.posts_important_dates x
      SET verified_at = v_review.fact_reviewed_at AT TIME ZONE 'UTC',
          source_ref = v_review.authority_evidence_url,
          source_locator = v_review.fact_review_evidence -> (
            'post:' || p.name || ':important_dates'
          ) ->> 'evidence_ref'
      FROM public.posts p
      WHERE x.post_id = p.id
        AND p.recruitment_id = NEW.id
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || p.name || ':important_dates'];

      UPDATE public.post_age_rules x
      SET verified_at = v_review.fact_reviewed_at AT TIME ZONE 'UTC',
          source_ref = v_review.authority_evidence_url,
          source_locator = v_review.fact_review_evidence -> (
            'post:' || p.name || ':age_rules'
          ) ->> 'evidence_ref'
      FROM public.posts p
      WHERE x.post_id = p.id
        AND p.recruitment_id = NEW.id
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || p.name || ':age_rules'];

      UPDATE public.posts_application_fee x
      SET verified_at = v_review.fact_reviewed_at AT TIME ZONE 'UTC',
          source_ref = v_review.authority_evidence_url,
          source_locator = v_review.fact_review_evidence -> (
            'post:' || p.name || ':application_fees'
          ) ->> 'evidence_ref'
      FROM public.posts p
      WHERE x.post_id = p.id
        AND p.recruitment_id = NEW.id
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || p.name || ':application_fees'];

      UPDATE public.posts_official_links x
      SET verified_at = v_review.fact_reviewed_at AT TIME ZONE 'UTC',
          source_ref = v_review.authority_evidence_url,
          source_locator = v_review.fact_review_evidence -> (
            'post:' || p.name || ':official_links'
          ) ->> 'evidence_ref'
      FROM public.posts p
      WHERE x.post_id = p.id
        AND p.recruitment_id = NEW.id
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || p.name || ':official_links'];

      WITH refreshed AS (
        SELECT p.id, public.aggregate_enrichment_for_post(p.id) AS payload
        FROM public.posts p
        WHERE p.recruitment_id = NEW.id
      )
      UPDATE public.posts p
      SET enrichment = coalesce(p.enrichment, '{}'::jsonb) || jsonb_build_object(
        'vacancies', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'vacancies' -> 'rows', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'vacancies'
          ELSE p.enrichment -> 'vacancies'
        END,
        'education', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'education', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'education'
          ELSE p.enrichment -> 'education'
        END,
        'experience', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'experience', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'experience'
          ELSE p.enrichment -> 'experience'
        END,
        'selection_process', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'selection_process', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'selection_process'
          ELSE p.enrichment -> 'selection_process'
        END,
        'documents', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'documents', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'documents'
          ELSE p.enrichment -> 'documents'
        END,
        'important_dates', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'important_dates', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'important_dates'
          ELSE p.enrichment -> 'important_dates'
        END,
        'age_rules', CASE
          WHEN coalesce(refreshed.payload -> 'age_rules', '{}'::jsonb) <> '{}'::jsonb
            THEN refreshed.payload -> 'age_rules'
          ELSE p.enrichment -> 'age_rules'
        END,
        'application_fees', CASE
          WHEN coalesce(refreshed.payload -> 'application_fees', '{}'::jsonb) <> '{}'::jsonb
            THEN refreshed.payload -> 'application_fees'
          ELSE p.enrichment -> 'application_fees'
        END,
        'official_links', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'official_links', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'official_links'
          ELSE p.enrichment -> 'official_links'
        END,
        'sourceVerificationStatus', 'VERIFIED',
        'sourceVerificationDate', v_review.fact_reviewed_at
      )
      FROM refreshed
      WHERE p.id = refreshed.id;
    END IF;
  ELSIF NEW.source_discovery_origin = 'AGGREGATOR_DISCOVERED' THEN
    -- A source discovered through an aggregator is never manually verified
    -- merely because another writer changed official_link_source.
    NEW.official_link_source := 'UNVERIFIED';
  END IF;

  RETURN NEW;
END;
$recruitment$;

DROP TRIGGER IF EXISTS trg_guard_aggregator_discovered_recruitment_verification
  ON public.recruitments;
CREATE TRIGGER trg_guard_aggregator_discovered_recruitment_verification
BEFORE INSERT OR UPDATE OF verification_status, official_link_source, source_discovery_origin, official_notification_url, metadata
ON public.recruitments
FOR EACH ROW
EXECUTE FUNCTION public.guard_aggregator_discovered_recruitment_verification();

-- The post-level official-source flag is permitted only when the same staging
-- row has a complete human review. This keeps source labels aligned with evidence.
CREATE OR REPLACE FUNCTION public.guard_aggregator_discovered_post_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_review public.official_digest_promote%ROWTYPE;
  v_review_ok boolean := false;
  v_batch text;
  v_official_url text;
BEGIN
  SELECT r.metadata ->> 'ingest_batch', r.official_notification_url
  INTO v_batch, v_official_url
  FROM public.recruitments r
  WHERE r.id = NEW.recruitment_id
    AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  LIMIT 1;

  IF FOUND THEN
    SELECT d.* INTO v_review
    FROM public.official_digest_promote d
    WHERE d.batch = v_batch
      AND d.hub ->> 'official_url' = v_official_url
      AND d.status = 'PROMOTED'
    ORDER BY d.rownum
    LIMIT 1;

    v_review_ok := FOUND
      AND public.official_digest_authority_review_complete(
        v_review.authority_review_status,
        v_review.authority_evidence_url,
        v_review.authority_reviewed_by,
        v_review.authority_reviewed_at,
        v_review.authority_review_notes
      )
      AND public.official_digest_fact_review_complete(
        v_review.fact_review_status,
        v_review.fact_reviewed_fields,
        v_review.fact_review_evidence,
        v_review.hub,
        v_review.posts,
        v_review.fact_reviewed_by,
        v_review.fact_reviewed_at,
        v_review.fact_review_notes
      );

    IF NOT v_review_ok THEN
      NEW."sourceName" := 'aggregator_extracted';
      NEW."isOfficialSource" := false;
      NEW.is_official_source := false;
    ELSE
      NEW.enrichment := coalesce(NEW.enrichment, '{}'::jsonb) || jsonb_build_object(
        'source_provenance', jsonb_build_object(
          'authority_review', jsonb_build_object(
            'status', v_review.authority_review_status,
            'evidence_url', v_review.authority_evidence_url,
            'reviewed_by', v_review.authority_reviewed_by,
            'reviewed_at', v_review.authority_reviewed_at,
            'notes', v_review.authority_review_notes
          ),
          'fact_review', jsonb_build_object(
            'status', v_review.fact_review_status,
            'reviewed_fields', v_review.fact_reviewed_fields,
            'evidence', v_review.fact_review_evidence,
            'reviewed_by', v_review.fact_reviewed_by,
            'reviewed_at', v_review.fact_reviewed_at,
            'notes', v_review.fact_review_notes
          )
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_aggregator_discovered_post_source
  ON public.posts;
CREATE TRIGGER trg_guard_aggregator_discovered_post_source
BEFORE INSERT OR UPDATE OF recruitment_id, "sourceName", "isOfficialSource", is_official_source
ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.guard_aggregator_discovered_post_source();

-- JSONB enrichment consolidation may rebuild the object. Preserve the review
-- evidence so later aggregation cannot erase the canonical provenance record.
CREATE OR REPLACE FUNCTION public.preserve_post_source_provenance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $preservepost$
BEGIN
  IF NEW."sourceName" IS DISTINCT FROM 'aggregator_extracted'
     AND NEW.enrichment ->> 'sourceVerificationStatus' IS DISTINCT FROM 'UNVERIFIABLE' THEN
    IF OLD.enrichment ? 'source_provenance'
       AND NOT (coalesce(NEW.enrichment, '{}'::jsonb) ? 'source_provenance') THEN
      NEW.enrichment := coalesce(NEW.enrichment, '{}'::jsonb)
        || jsonb_build_object('source_provenance', OLD.enrichment -> 'source_provenance');
    END IF;

    IF OLD.enrichment ? 'sourceVerificationStatus'
       AND NOT (coalesce(NEW.enrichment, '{}'::jsonb) ? 'sourceVerificationStatus') THEN
      NEW.enrichment := coalesce(NEW.enrichment, '{}'::jsonb)
        || jsonb_build_object('sourceVerificationStatus', OLD.enrichment -> 'sourceVerificationStatus');
    END IF;

    IF OLD.enrichment ? 'sourceVerificationDate'
       AND NOT (coalesce(NEW.enrichment, '{}'::jsonb) ? 'sourceVerificationDate') THEN
      NEW.enrichment := coalesce(NEW.enrichment, '{}'::jsonb)
        || jsonb_build_object('sourceVerificationDate', OLD.enrichment -> 'sourceVerificationDate');
    END IF;
  END IF;
  RETURN NEW;
END;
$preservepost$;

DROP TRIGGER IF EXISTS trg_preserve_post_source_provenance ON public.posts;
CREATE TRIGGER trg_preserve_post_source_provenance
BEFORE UPDATE OF enrichment ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.preserve_post_source_provenance();

CREATE OR REPLACE FUNCTION public.preserve_recruitment_source_provenance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $preserverec$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM 'UNVERIFIABLE'
     AND OLD.metadata ? 'source_provenance'
     AND NOT (coalesce(NEW.metadata, '{}'::jsonb) ? 'source_provenance') THEN
    NEW.metadata := coalesce(NEW.metadata, '{}'::jsonb)
      || jsonb_build_object('source_provenance', OLD.metadata -> 'source_provenance');
  END IF;
  RETURN NEW;
END;
$preserverec$;

DROP TRIGGER IF EXISTS trg_preserve_recruitment_source_provenance ON public.recruitments;
CREATE TRIGGER trg_preserve_recruitment_source_provenance
BEFORE UPDATE OF metadata ON public.recruitments
FOR EACH ROW
EXECUTE FUNCTION public.preserve_recruitment_source_provenance();

-- Do not let legacy promotion logic mark post enrichment VERIFIED unless the
-- same issuer-source review is present on the staging row.
CREATE OR REPLACE FUNCTION public.guard_aggregator_discovered_enrichment_verification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_review_ok boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    JOIN public.official_digest_promote d
      ON d.batch = r.metadata ->> 'ingest_batch'
     AND d.hub ->> 'official_url' = r.official_notification_url
     AND d.status = 'PROMOTED'
    WHERE p.id = NEW.post_id
      AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND public.official_digest_authority_review_complete(
        d.authority_review_status,
        d.authority_evidence_url,
        d.authority_reviewed_by,
        d.authority_reviewed_at,
        d.authority_review_notes
      )
      AND public.official_digest_fact_review_complete(
        d.fact_review_status,
        d.fact_reviewed_fields,
        d.fact_review_evidence,
        d.hub,
        d.posts,
        d.fact_reviewed_by,
        d.fact_reviewed_at,
        d.fact_review_notes
      )
  ) INTO v_review_ok;

  IF NOT v_review_ok AND EXISTS (
    SELECT 1
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE p.id = NEW.post_id
      AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  ) THEN
    NEW."sourceVerificationStatus" := 'UNVERIFIABLE';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_aggregator_discovered_enrichment_verification
  ON public.post_enrichments;
CREATE TRIGGER trg_guard_aggregator_discovered_enrichment_verification
BEFORE INSERT OR UPDATE OF post_id, "sourceVerificationStatus"
ON public.post_enrichments
FOR EACH ROW
EXECUTE FUNCTION public.guard_aggregator_discovered_enrichment_verification();

-- Canonical eligibility is another write path. Do not allow a legacy writer to
-- mark aggregator-derived eligibility VERIFIED without the exact reviewed evidence.
CREATE OR REPLACE FUNCTION public.guard_aggregator_eligibility_verification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $eligibility$
DECLARE
  v_discovery_origin text;
  v_batch text;
  v_official_url text;
  v_post_name text;
  v_expected_locator text;
  v_review public.official_digest_promote%ROWTYPE;
  v_review_ok boolean := false;
BEGIN
  SELECT r.source_discovery_origin, r.metadata ->> 'ingest_batch',
         r.official_notification_url, p.name
  INTO v_discovery_origin, v_batch, v_official_url, v_post_name
  FROM public.posts p
  JOIN public.recruitments r ON r.id = p.recruitment_id
  WHERE p.id = NEW.post_id
  LIMIT 1;

  IF v_discovery_origin = 'AGGREGATOR_DISCOVERED' THEN
    IF NEW.status = 'VERIFIED' THEN
      SELECT d.* INTO v_review
      FROM public.official_digest_promote d
      WHERE d.batch = v_batch
        AND d.hub ->> 'official_url' = v_official_url
        AND d.status = 'PROMOTED'
      ORDER BY d.rownum
      LIMIT 1;

      v_expected_locator := v_review.fact_review_evidence -> (
        'post:' || v_post_name || ':eligibility'
      ) ->> 'evidence_ref';

      v_review_ok := FOUND
        AND public.official_digest_authority_review_complete(
          v_review.authority_review_status,
          v_review.authority_evidence_url,
          v_review.authority_reviewed_by,
          v_review.authority_reviewed_at,
          v_review.authority_review_notes
        )
        AND public.official_digest_fact_review_complete(
          v_review.fact_review_status,
          v_review.fact_reviewed_fields,
          v_review.fact_review_evidence,
          v_review.hub,
          v_review.posts,
          v_review.fact_reviewed_by,
          v_review.fact_reviewed_at,
          v_review.fact_review_notes
        )
        AND v_review.fact_reviewed_fields @> ARRAY['post:' || v_post_name || ':eligibility']
        AND nullif(btrim(v_expected_locator), '') IS NOT NULL
        AND NEW.source_type = 'OFFICIAL_NOTIFICATION'
        AND NEW.verified_at IS NOT NULL
        AND NEW.source_ref = v_review.authority_evidence_url
        AND NEW.source_locator = v_expected_locator;

      IF NOT v_review_ok THEN
        NEW.status := 'PENDING';
        NEW.verified_at := NULL;
        NEW.source_type := NULL;
        NEW.source_ref := NULL;
        NEW.source_locator := NULL;
        NEW.derivation := NULL;
      END IF;
    ELSE
      NEW.verified_at := NULL;
      NEW.source_type := NULL;
      NEW.source_ref := NULL;
      NEW.source_locator := NULL;
      NEW.derivation := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$eligibility$;

DROP TRIGGER IF EXISTS trg_guard_aggregator_eligibility_verification
  ON public.eligibilities;
CREATE TRIGGER trg_guard_aggregator_eligibility_verification
BEFORE INSERT OR UPDATE OF post_id, status, verified_at, source_type, source_ref, source_locator, derivation
ON public.eligibilities
FOR EACH ROW
EXECUTE FUNCTION public.guard_aggregator_eligibility_verification();

-- Reconcile already-promoted records whenever a reviewer changes either review.
-- This supports controlled remediation of the historical cohort without rerunning
-- the importer. Revoking either review demotes the recruitment and its children.
CREATE OR REPLACE FUNCTION public.sync_promoted_digest_review_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $sync$
DECLARE
  v_review_ok boolean := false;
BEGIN
  IF NEW.status <> 'PROMOTED' THEN
    RETURN NEW;
  END IF;

  v_review_ok := public.official_digest_authority_review_complete(
      NEW.authority_review_status,
      NEW.authority_evidence_url,
      NEW.authority_reviewed_by,
      NEW.authority_reviewed_at,
      NEW.authority_review_notes
    )
    AND COALESCE((NEW.hub ->> 'official_url') ~* '^https://', false)
    AND public.official_digest_fact_review_complete(
      NEW.fact_review_status,
      NEW.fact_reviewed_fields,
      NEW.fact_review_evidence,
      NEW.hub,
      NEW.posts,
      NEW.fact_reviewed_by,
      NEW.fact_reviewed_at,
      NEW.fact_review_notes
    );

  IF v_review_ok THEN
    UPDATE public.recruitments
    SET verification_status = 'VERIFIED',
        last_verified_at = NEW.fact_reviewed_at,
        updated_at = now()
    WHERE source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND metadata ->> 'ingest_batch' = NEW.batch
      AND official_notification_url = NEW.hub ->> 'official_url';
  ELSE
    UPDATE public.recruitments
    SET verification_status = 'UNVERIFIABLE',
        last_verified_at = NULL,
        metadata = coalesce(metadata, '{}'::jsonb) - 'source_provenance',
        updated_at = now()
    WHERE source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND metadata ->> 'ingest_batch' = NEW.batch
      AND official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts p
    SET "sourceName" = 'aggregator_extracted',
        "isOfficialSource" = false,
        is_official_source = false,
        enrichment = (coalesce(p.enrichment, '{}'::jsonb) - 'source_provenance')
          || jsonb_build_object(
            'sourceVerificationStatus', 'UNVERIFIABLE',
            'sourceVerificationDate', NULL
          ),
        updated_at = now()
    FROM public.recruitments r
    WHERE r.id = p.recruitment_id
      AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.post_enrichments pe
    SET "sourceVerificationStatus" = 'UNVERIFIABLE',
        "sourceVerificationDate" = NULL,
        updated_at = now()
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE pe.post_id = p.id
      AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.eligibilities e
    SET status = 'PENDING',
        verified_at = NULL,
        source_type = NULL,
        source_ref = NULL,
        source_locator = NULL,
        derivation = NULL,
        updated_at = now()
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE e.post_id = p.id
      AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts_education e
    SET verified_at = NULL,
        source_ref = NULL,
        source_locator = NULL
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE e.post_id = p.id
      AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts_experience x
    SET verified_at = NULL,
        source_ref = NULL,
        source_locator = NULL
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE x.post_id = p.id
      AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts_vacancies x
    SET verified_at = NULL, source_ref = NULL, source_locator = NULL
    FROM public.posts p JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE x.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts_selection_process x
    SET verified_at = NULL, source_ref = NULL, source_locator = NULL
    FROM public.posts p JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE x.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts_documents x
    SET verified_at = NULL, source_ref = NULL, source_locator = NULL
    FROM public.posts p JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE x.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts_important_dates x
    SET verified_at = NULL, source_ref = NULL, source_locator = NULL
    FROM public.posts p JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE x.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.post_age_rules x
    SET verified_at = NULL, source_ref = NULL, source_locator = NULL
    FROM public.posts p JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE x.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts_application_fee x
    SET verified_at = NULL, source_ref = NULL, source_locator = NULL
    FROM public.posts p JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE x.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts_official_links x
    SET verified_at = NULL, source_ref = NULL, source_locator = NULL
    FROM public.posts p JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE x.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    WITH refreshed AS (
      SELECT p.id, public.aggregate_enrichment_for_post(p.id) AS payload
      FROM public.posts p
      JOIN public.recruitments r ON r.id = p.recruitment_id
      WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
        AND r.metadata ->> 'ingest_batch' = NEW.batch
        AND r.official_notification_url = NEW.hub ->> 'official_url'
    )
    UPDATE public.posts p
    SET enrichment = (coalesce(p.enrichment, '{}'::jsonb) - 'source_provenance')
      || jsonb_build_object(
        'vacancies', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'vacancies' -> 'rows', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'vacancies'
          ELSE p.enrichment -> 'vacancies'
        END,
        'education', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'education', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'education'
          ELSE p.enrichment -> 'education'
        END,
        'experience', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'experience', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'experience'
          ELSE p.enrichment -> 'experience'
        END,
        'selection_process', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'selection_process', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'selection_process'
          ELSE p.enrichment -> 'selection_process'
        END,
        'documents', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'documents', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'documents'
          ELSE p.enrichment -> 'documents'
        END,
        'important_dates', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'important_dates', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'important_dates'
          ELSE p.enrichment -> 'important_dates'
        END,
        'age_rules', CASE
          WHEN coalesce(refreshed.payload -> 'age_rules', '{}'::jsonb) <> '{}'::jsonb
            THEN refreshed.payload -> 'age_rules'
          ELSE p.enrichment -> 'age_rules'
        END,
        'application_fees', CASE
          WHEN coalesce(refreshed.payload -> 'application_fees', '{}'::jsonb) <> '{}'::jsonb
            THEN refreshed.payload -> 'application_fees'
          ELSE p.enrichment -> 'application_fees'
        END,
        'official_links', CASE
          WHEN jsonb_array_length(coalesce(refreshed.payload -> 'official_links', '[]'::jsonb)) > 0
            THEN refreshed.payload -> 'official_links'
          ELSE p.enrichment -> 'official_links'
        END,
        'sourceVerificationStatus', 'UNVERIFIABLE',
        'sourceVerificationDate', NULL
      )
    FROM refreshed
    WHERE p.id = refreshed.id;
  END IF;

  RETURN NEW;
END;
$sync$;

DROP TRIGGER IF EXISTS trg_sync_promoted_digest_review_state
  ON public.official_digest_promote;
CREATE TRIGGER trg_sync_promoted_digest_review_state
AFTER UPDATE OF
  status,
  authority_review_status, authority_evidence_url, authority_reviewed_by, authority_reviewed_at, authority_review_notes,
  fact_review_status, fact_reviewed_fields, fact_review_evidence, fact_reviewed_by, fact_reviewed_at, fact_review_notes,
  hub, posts
ON public.official_digest_promote
FOR EACH ROW
EXECUTE FUNCTION public.sync_promoted_digest_review_state();
