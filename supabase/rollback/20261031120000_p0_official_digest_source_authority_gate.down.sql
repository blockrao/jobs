-- Rollback for 20261031120000_p0_official_digest_source_authority_gate.sql
-- Run only after rolling back the application deployment that enforces this gate.
--
-- This is intentionally non-destructive: additive columns, indexes, constraints,
-- comments and any review evidence are retained. Remove those only in a separate
-- reviewed cleanup migration after proving no code or audit workflow depends on them.
-- The previous implementation of aggregate_enrichment_for_post(integer) is restored
-- from the production pg_get_functiondef snapshot captured on 2026-10-31.

BEGIN;

-- A reviewer decision triggers canonical Recruitment/Post/fact writes. Once
-- any authority or fact review has been recorded, do not use this rollback:
-- it intentionally does not reverse those data changes. Use a forward,
-- evidence-preserving recovery migration instead.
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.official_digest_promote
    WHERE authority_review_status IS DISTINCT FROM 'UNVERIFIED'
       OR fact_review_status IS DISTINCT FROM 'UNVERIFIED'
  ) THEN
    RAISE EXCEPTION
      'Rollback blocked: source review decisions have been recorded; use a forward recovery migration';
  END IF;
END;
$guard$;

-- Restore the pre-migration public-read policies only as part of a full
-- application rollback. This returns to the prior exposure model.
DROP POLICY IF EXISTS "public read" ON public.recruitments;
CREATE POLICY "public read" ON public.recruitments FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "public read" ON public.posts;
CREATE POLICY "public read" ON public.posts FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "public read" ON public.eligibilities;
CREATE POLICY "public read" ON public.eligibilities FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "public read" ON public.post_age_rules;
CREATE POLICY "public read" ON public.post_age_rules FOR SELECT TO public USING (true);

DROP TRIGGER IF EXISTS trg_guard_official_digest_promotion_review ON public.official_digest_promote;
DROP TRIGGER IF EXISTS trg_guard_aggregator_discovered_recruitment_verification ON public.recruitments;
DROP TRIGGER IF EXISTS trg_guard_aggregator_discovered_post_source ON public.posts;
DROP TRIGGER IF EXISTS trg_preserve_post_source_provenance ON public.posts;
DROP TRIGGER IF EXISTS trg_preserve_recruitment_source_provenance ON public.recruitments;
DROP TRIGGER IF EXISTS trg_guard_aggregator_discovered_enrichment_verification ON public.post_enrichments;
DROP TRIGGER IF EXISTS trg_guard_aggregator_eligibility_verification ON public.eligibilities;
DROP TRIGGER IF EXISTS trg_sync_promoted_digest_review_state ON public.official_digest_promote;

CREATE OR REPLACE FUNCTION public.aggregate_enrichment_for_post(p_post_id integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_enrichment jsonb := '{}';
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
        'degree', pe.degree,
        'subject', pe.subject,
        'specialization', pe.specialization,
        'source', pe.source
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
        'type', pex.experience_type,
        'source', pex.source,
        'description', pex.description
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
$function$;

DROP FUNCTION IF EXISTS public.sync_promoted_digest_review_state();
DROP FUNCTION IF EXISTS public.guard_aggregator_eligibility_verification();
DROP FUNCTION IF EXISTS public.guard_aggregator_discovered_enrichment_verification();
DROP FUNCTION IF EXISTS public.preserve_recruitment_source_provenance();
DROP FUNCTION IF EXISTS public.preserve_post_source_provenance();
DROP FUNCTION IF EXISTS public.guard_aggregator_discovered_post_source();
DROP FUNCTION IF EXISTS public.guard_aggregator_discovered_recruitment_verification();
DROP FUNCTION IF EXISTS public.guard_official_digest_promotion_review();
DROP FUNCTION IF EXISTS public.official_digest_fact_review_complete(text, text[], jsonb, jsonb, jsonb, text, timestamptz, text);
DROP FUNCTION IF EXISTS public.official_digest_required_fact_keys(jsonb, jsonb);
DROP FUNCTION IF EXISTS public.official_digest_authority_review_complete(text, text, text, timestamptz, text);
DROP FUNCTION IF EXISTS public.is_publicly_verified_recruitment_source(text, text, text, jsonb, jsonb);

COMMIT;
