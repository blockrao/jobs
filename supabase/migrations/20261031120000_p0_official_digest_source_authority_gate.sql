-- P0: require an explicit human issuer-source review before official-digest promotion.
-- This migration is forward-only. It does not edit the historical promotion migration.
-- Existing aggregator-discovered rows are demoted to unverified; no records are deleted.

-- Education already had verified_at; add source pointers. Experience previously
-- had no verification timestamp at all, so add the complete fact-level evidence fields.
ALTER TABLE public.posts_education
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS source_locator text;

ALTER TABLE public.posts_experience
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
  'Explicit field keys checked by the reviewer; use post:<post-slug>:<field> and hub:<field> keys.';
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
    AND cardinality(coalesce(p_reviewed_fields, '{}'::text[])) > 0
    AND jsonb_typeof(coalesce(p_fact_evidence, '{}'::jsonb)) = 'object'
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
      'categories', jsonb_object_agg(pv.category, pv.total_vacancies::INT)
        FILTER (WHERE pv.category IS NOT NULL),
      'location_count', MAX(pv.location_count)::INT,
      'category_count', MAX(pv.category_count)::INT,
      'by_location', jsonb_object_agg(pv.location, pv.total_vacancies::INT)
        FILTER (WHERE pv.location IS NOT NULL)
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
        'step', psp.id,
        'name', psp.stage_name,
        'description', psp.description,
        'marks', psp.marks,
        'duration', psp.duration,
        'mode', psp.mode
      ) ORDER BY psp.id)
      FROM public.posts_selection_process psp
      WHERE psp.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'documents',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'name', pd.document_name,
        'category', pd.document_category,
        'required', pd.is_required,
        'required_for_categories', pd.required_for_categories
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
        'label', pid.date_type,
        'description', pid.description
      ) ORDER BY pid.id)
      FROM public.posts_important_dates pid
      WHERE pid.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'age_rules',
    (SELECT jsonb_object_agg(par.category, jsonb_build_object(
      'max', par.max_age,
      'relaxation_years', par.relaxation_years,
      'rule_type', par.rule_type,
      'condition', par.condition_text
    ))
    FROM public.post_age_rules par
    WHERE par.post_id = p_post_id)
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'application_fees',
    (SELECT jsonb_object_agg(paf.category, jsonb_build_object(
      'amount', paf.amount,
      'currency_code', paf.currency_code,
      'payment_mode', paf.payment_mode,
      'note', paf.note
    ))
    FROM public.posts_application_fee paf
    WHERE paf.post_id = p_post_id)
  );

  v_enrichment := v_enrichment || jsonb_build_object(
    'official_links',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'type', pol.link_type,
        'label', pol.label,
        'url', pol.url,
        'is_official', pol.is_official
      ) ORDER BY pol.id)
      FROM public.posts_official_links pol
      WHERE pol.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  v_enrichment := CASE
    WHEN v_enrichment -> 'vacancies' IS NULL THEN v_enrichment || '{"vacancies": {}}'::jsonb
    ELSE v_enrichment
  END;

  v_enrichment := CASE
    WHEN v_enrichment -> 'age_rules' IS NULL THEN v_enrichment || '{"age_rules": {}}'::jsonb
    ELSE v_enrichment
  END;

  v_enrichment := CASE
    WHEN v_enrichment -> 'application_fees' IS NULL THEN v_enrichment || '{"application_fees": {}}'::jsonb
    ELSE v_enrichment
  END;

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
  IF NEW.official_link_source = 'AGGREGATOR_DISCOVERED'
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
      NEW.verification_status := 'UNVERIFIABLE';
      NEW.last_verified_at := NULL;
    ELSE
      NEW.metadata := coalesce(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
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

      WITH refreshed AS (
        SELECT p.id, public.aggregate_enrichment_for_post(p.id) AS payload
        FROM public.posts p
        WHERE p.recruitment_id = NEW.id
      )
      UPDATE public.posts p
      SET enrichment = coalesce(p.enrichment, '{}'::jsonb) || jsonb_build_object(
        'education', refreshed.payload -> 'education',
        'experience', refreshed.payload -> 'experience',
        'sourceVerificationStatus', 'VERIFIED',
        'sourceVerificationDate', v_review.fact_reviewed_at
      )
      FROM refreshed
      WHERE p.id = refreshed.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$recruitment$;

DROP TRIGGER IF EXISTS trg_guard_aggregator_discovered_recruitment_verification
  ON public.recruitments;
CREATE TRIGGER trg_guard_aggregator_discovered_recruitment_verification
BEFORE INSERT OR UPDATE OF verification_status, official_link_source, official_notification_url, metadata
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
    AND r.official_link_source = 'AGGREGATOR_DISCOVERED'
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
  IF NEW."sourceName" IS DISTINCT FROM 'aggregator_extracted' THEN
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
      AND r.official_link_source = 'AGGREGATOR_DISCOVERED'
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
      AND r.official_link_source = 'AGGREGATOR_DISCOVERED'
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
    WHERE official_link_source = 'AGGREGATOR_DISCOVERED'
      AND metadata ->> 'ingest_batch' = NEW.batch
      AND official_notification_url = NEW.hub ->> 'official_url';
  ELSE
    UPDATE public.recruitments
    SET verification_status = 'UNVERIFIABLE',
        last_verified_at = NULL,
        metadata = coalesce(metadata, '{}'::jsonb) - 'source_provenance',
        updated_at = now()
    WHERE official_link_source = 'AGGREGATOR_DISCOVERED'
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
      AND r.official_link_source = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.post_enrichments pe
    SET "sourceVerificationStatus" = 'UNVERIFIABLE',
        "sourceVerificationDate" = NULL,
        updated_at = now()
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE pe.post_id = p.id
      AND r.official_link_source = 'AGGREGATOR_DISCOVERED'
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
      AND r.official_link_source = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts_education e
    SET verified_at = NULL,
        source_ref = NULL,
        source_locator = NULL
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE e.post_id = p.id
      AND r.official_link_source = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    UPDATE public.posts_experience x
    SET verified_at = NULL,
        source_ref = NULL,
        source_locator = NULL
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE x.post_id = p.id
      AND r.official_link_source = 'AGGREGATOR_DISCOVERED'
      AND r.metadata ->> 'ingest_batch' = NEW.batch
      AND r.official_notification_url = NEW.hub ->> 'official_url';

    WITH refreshed AS (
      SELECT p.id, public.aggregate_enrichment_for_post(p.id) AS payload
      FROM public.posts p
      JOIN public.recruitments r ON r.id = p.recruitment_id
      WHERE r.official_link_source = 'AGGREGATOR_DISCOVERED'
        AND r.metadata ->> 'ingest_batch' = NEW.batch
        AND r.official_notification_url = NEW.hub ->> 'official_url'
    )
    UPDATE public.posts p
    SET enrichment = (coalesce(p.enrichment, '{}'::jsonb) - 'source_provenance')
      || jsonb_build_object(
        'education', refreshed.payload -> 'education',
        'experience', refreshed.payload -> 'experience',
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

-- Backfill only education/experience arrays from their canonical child tables.
-- Preserve all other JSONB fields, including source_provenance.
UPDATE public.posts p
SET enrichment = coalesce(p.enrichment, '{}'::jsonb) || jsonb_build_object(
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
    WHERE pe.post_id = p.id),
    p.enrichment -> 'education',
    '[]'::jsonb
  ),
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
    WHERE pex.post_id = p.id),
    p.enrichment -> 'experience',
    '[]'::jsonb
  )
)
WHERE EXISTS (SELECT 1 FROM public.posts_education pe WHERE pe.post_id = p.id)
   OR EXISTS (SELECT 1 FROM public.posts_experience pex WHERE pex.post_id = p.id);

-- Existing eligibility rows marked VERIFIED without issuer evidence are not verified facts.
UPDATE public.eligibilities
SET status = 'PENDING',
    verified_at = NULL,
    updated_at = now()
WHERE status = 'VERIFIED'
  AND (
    source_type IS DISTINCT FROM 'OFFICIAL_NOTIFICATION'
    OR verified_at IS NULL
    OR source_ref IS NULL
    OR source_locator IS NULL
  );

-- Correct the false VERIFIED state from the earlier document-only promotion.
UPDATE public.recruitments
SET verification_status = 'UNVERIFIABLE',
    last_verified_at = NULL,
    metadata = coalesce(metadata, '{}'::jsonb) - 'source_provenance',
    updated_at = now()
WHERE official_link_source = 'AGGREGATOR_DISCOVERED'
  AND (
    verification_status = 'VERIFIED'
    OR coalesce(metadata, '{}'::jsonb) ? 'source_provenance'
  );

-- Remove the false post-level official-source assertion from this same cohort.
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
  AND r.official_link_source = 'AGGREGATOR_DISCOVERED'
  AND (
    p."sourceName" IS DISTINCT FROM 'aggregator_extracted'
    OR p."isOfficialSource" IS DISTINCT FROM false
    OR p.is_official_source IS DISTINCT FROM false
    OR coalesce(p.enrichment, '{}'::jsonb) ? 'source_provenance'
  );

-- Existing post_enrichments sourceVerificationDate was NOT NULL. Make it nullable
-- so an unverified record does not retain a misleading verification timestamp.
ALTER TABLE public.post_enrichments
  ALTER COLUMN "sourceVerificationDate" DROP NOT NULL;

UPDATE public.post_enrichments pe
SET "sourceVerificationStatus" = 'UNVERIFIABLE',
    "sourceVerificationDate" = NULL,
    updated_at = now()
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE pe.post_id = p.id
  AND r.official_link_source = 'AGGREGATOR_DISCOVERED'
  AND (
    pe."sourceVerificationStatus" IS DISTINCT FROM 'UNVERIFIABLE'
    OR pe."sourceVerificationDate" IS NOT NULL
  );

-- A child education/experience fact sourced from the retired FJA inventory
-- without a verified_at timestamp prevents the aggregate enrichment record
-- from being labelled VERIFIED, regardless of the parent's source label.
UPDATE public.post_enrichments pe
SET "sourceVerificationStatus" = 'UNVERIFIABLE',
    "sourceVerificationDate" = NULL,
    updated_at = now()
FROM public.posts p
WHERE pe.post_id = p.id
  AND pe."sourceVerificationStatus" = 'VERIFIED'
  AND (
    EXISTS (
      SELECT 1
      FROM public.posts_education e
      WHERE e.post_id = p.id
        AND e.source = 'fja_post_inventory'
        AND e.verified_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.posts_experience x
      WHERE x.post_id = p.id
        AND x.source = 'fja_post_inventory'
        AND x.verified_at IS NULL
    )
  );

UPDATE public.posts p
SET enrichment = coalesce(p.enrichment, '{}'::jsonb)
  || jsonb_build_object(
    'sourceVerificationStatus', 'UNVERIFIABLE',
    'sourceVerificationDate', NULL
  ),
  updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.posts_education e
  WHERE e.post_id = p.id
    AND e.source = 'fja_post_inventory'
    AND e.verified_at IS NULL
) OR EXISTS (
  SELECT 1
  FROM public.posts_experience x
  WHERE x.post_id = p.id
    AND x.source = 'fja_post_inventory'
    AND x.verified_at IS NULL
);

COMMENT ON FUNCTION public.guard_aggregator_discovered_recruitment_verification() IS
  'Prevents aggregator-discovered recruitment rows from being VERIFIED without a matching PROMOTED official-digest row with complete issuer-source and fact reviews.';
COMMENT ON FUNCTION public.guard_aggregator_discovered_post_source() IS
  'Prevents aggregator-discovered post rows from claiming official-notification provenance without a matching PROMOTED official-digest row with complete issuer-source and fact reviews.';
COMMENT ON FUNCTION public.guard_aggregator_discovered_enrichment_verification() IS
  'Prevents aggregator-discovered post enrichment from claiming VERIFIED without a matching PROMOTED official-digest row with complete issuer-source and fact reviews.';
