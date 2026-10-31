-- Rollback for 20261031070000_p0_official_source_authority_gate.sql
-- This rollback is intentionally guarded. It refuses to discard review evidence
-- or provenance written after the forward migration.
-- READ ONLY preflight checks execute before any DROP/ALTER statement.

BEGIN;

DO $rollback_guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.official_digest_promote
    WHERE authority_review_status <> 'UNVERIFIED'
       OR authority_evidence_url IS NOT NULL
       OR authority_reviewed_by IS NOT NULL
       OR authority_reviewed_at IS NOT NULL
       OR authority_review_notes IS NOT NULL
       OR fact_review_status <> 'UNVERIFIED'
       OR cardinality(coalesce(fact_reviewed_fields, '{}'::text[])) > 0
       OR fact_review_evidence <> '{}'::jsonb
       OR fact_reviewed_by IS NOT NULL
       OR fact_reviewed_at IS NOT NULL
       OR fact_review_notes IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Rollback refused: official-digest issuer/fact review evidence has been written. Export and reconcile it before rollback.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.recruitments
    WHERE metadata ? 'source_provenance'
  ) OR EXISTS (
    SELECT 1 FROM public.posts
    WHERE enrichment ? 'source_provenance'
  ) THEN
    RAISE EXCEPTION 'Rollback refused: source_provenance has been written to canonical Recruitment/Post records.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.posts_education WHERE source_ref IS NOT NULL OR source_locator IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.posts_experience WHERE verified_at IS NOT NULL OR source_ref IS NOT NULL OR source_locator IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.posts_vacancies WHERE verified_at IS NOT NULL OR source_ref IS NOT NULL OR source_locator IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.posts_selection_process WHERE verified_at IS NOT NULL OR source_ref IS NOT NULL OR source_locator IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.posts_documents WHERE verified_at IS NOT NULL OR source_ref IS NOT NULL OR source_locator IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.posts_important_dates WHERE extracted_at IS NOT NULL OR verified_at IS NOT NULL OR source_ref IS NOT NULL OR source_locator IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.post_age_rules WHERE source IS DISTINCT FROM 'legacy_unknown' OR extracted_at IS NOT NULL OR verified_at IS NOT NULL OR source_ref IS NOT NULL OR source_locator IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.posts_application_fee WHERE category IS NOT NULL OR verified_at IS NOT NULL OR source_ref IS NOT NULL OR source_locator IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.posts_official_links WHERE extracted_at IS NOT NULL OR verified_at IS NOT NULL OR source_ref IS NOT NULL OR source_locator IS NOT NULL)
  THEN
    RAISE EXCEPTION 'Rollback refused: child fact provenance or new fact metadata has been written. Export and reconcile it before rollback.';
  END IF;
END;
$rollback_guard$;

DROP TRIGGER IF EXISTS trg_guard_official_digest_promotion_review ON public.official_digest_promote;
DROP TRIGGER IF EXISTS trg_guard_aggregator_discovered_recruitment_verification ON public.recruitments;
DROP TRIGGER IF EXISTS trg_guard_aggregator_discovered_post_source ON public.posts;
DROP TRIGGER IF EXISTS trg_guard_aggregator_posts_education_provenance ON public.posts_education;
DROP TRIGGER IF EXISTS trg_guard_aggregator_posts_experience_provenance ON public.posts_experience;
DROP TRIGGER IF EXISTS trg_guard_aggregator_posts_vacancies_provenance ON public.posts_vacancies;
DROP TRIGGER IF EXISTS trg_guard_aggregator_posts_selection_process_provenance ON public.posts_selection_process;
DROP TRIGGER IF EXISTS trg_guard_aggregator_posts_documents_provenance ON public.posts_documents;
DROP TRIGGER IF EXISTS trg_guard_aggregator_posts_important_dates_provenance ON public.posts_important_dates;
DROP TRIGGER IF EXISTS trg_guard_aggregator_post_age_rules_provenance ON public.post_age_rules;
DROP TRIGGER IF EXISTS trg_guard_aggregator_posts_application_fee_provenance ON public.posts_application_fee;
DROP TRIGGER IF EXISTS trg_guard_aggregator_posts_official_links_provenance ON public.posts_official_links;
DROP TRIGGER IF EXISTS trg_preserve_post_source_provenance ON public.posts;
DROP TRIGGER IF EXISTS trg_preserve_recruitment_source_provenance ON public.recruitments;
DROP TRIGGER IF EXISTS trg_guard_aggregator_discovered_enrichment_verification ON public.post_enrichments;
DROP TRIGGER IF EXISTS trg_guard_aggregator_eligibility_verification ON public.eligibilities;
DROP TRIGGER IF EXISTS trg_sync_promoted_digest_review_state ON public.official_digest_promote;

DROP FUNCTION IF EXISTS public.guard_aggregator_discovered_child_fact_provenance();
DROP FUNCTION IF EXISTS public.guard_aggregator_discovered_enrichment_verification();
DROP FUNCTION IF EXISTS public.guard_aggregator_eligibility_verification();
DROP FUNCTION IF EXISTS public.guard_aggregator_discovered_post_source();
DROP FUNCTION IF EXISTS public.guard_aggregator_discovered_recruitment_verification();
DROP FUNCTION IF EXISTS public.preserve_post_source_provenance();
DROP FUNCTION IF EXISTS public.preserve_recruitment_source_provenance();
DROP FUNCTION IF EXISTS public.sync_promoted_digest_review_state();
DROP FUNCTION IF EXISTS public.guard_official_digest_promotion_review();
DROP FUNCTION IF EXISTS public.aggregate_enrichment_for_post_with_provenance(integer);
DROP FUNCTION IF EXISTS public.is_recruitment_source_trusted(text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.official_digest_posts_match_recruitment(integer, integer[], jsonb);
DROP FUNCTION IF EXISTS public.official_digest_fact_review_complete(text, text[], jsonb, jsonb, jsonb, text, timestamptz, text);
DROP FUNCTION IF EXISTS public.official_digest_required_fact_keys(jsonb, jsonb);
DROP FUNCTION IF EXISTS public.official_digest_authority_review_complete(text, text, text, timestamptz, text);

ALTER TABLE public.official_digest_promote
  DROP CONSTRAINT IF EXISTS official_digest_authority_review_status_check,
  DROP CONSTRAINT IF EXISTS official_digest_fact_review_status_check;

DROP INDEX IF EXISTS public.uq_official_digest_promote_batch_official_url;
DROP INDEX IF EXISTS public.idx_recruitments_source_discovery_origin;

ALTER TABLE public.official_digest_promote
  DROP COLUMN IF EXISTS authority_review_status,
  DROP COLUMN IF EXISTS authority_evidence_url,
  DROP COLUMN IF EXISTS authority_reviewed_by,
  DROP COLUMN IF EXISTS authority_reviewed_at,
  DROP COLUMN IF EXISTS authority_review_notes,
  DROP COLUMN IF EXISTS fact_review_status,
  DROP COLUMN IF EXISTS fact_reviewed_fields,
  DROP COLUMN IF EXISTS fact_review_evidence,
  DROP COLUMN IF EXISTS fact_reviewed_by,
  DROP COLUMN IF EXISTS fact_reviewed_at,
  DROP COLUMN IF EXISTS fact_review_notes;

ALTER TABLE public.recruitments
  DROP COLUMN IF EXISTS source_discovery_origin;

ALTER TABLE public.posts_education
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_locator;

ALTER TABLE public.posts_experience
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_locator;

ALTER TABLE public.posts_vacancies
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_locator;

ALTER TABLE public.posts_selection_process
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_locator;

ALTER TABLE public.posts_documents
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_locator;

ALTER TABLE public.posts_important_dates
  DROP COLUMN IF EXISTS extracted_at,
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_locator;

ALTER TABLE public.post_age_rules
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS extracted_at,
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_locator;

ALTER TABLE public.posts_application_fee
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_locator;

ALTER TABLE public.posts_official_links
  DROP COLUMN IF EXISTS extracted_at,
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_locator;

COMMIT;
