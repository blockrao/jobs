-- P0 Stage 2: existing-record remediation.
-- Apply only after the application source gate has been deployed.
-- The schema/write-guard migration must run first. This migration changes
-- existing public provenance/status fields; it does not delete canonical rows.

UPDATE public.recruitments
SET official_link_source = 'UNVERIFIED'
WHERE source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND official_link_source IS DISTINCT FROM 'UNVERIFIED';

-- Backfill canonical JSONB fact arrays/objects from their child tables.
-- Existing JSONB-only values are preserved when a child table has no rows.
-- All non-fact JSONB fields and source_provenance remain untouched.
WITH fact_rows AS (
  SELECT
    p.id,
    p.enrichment,
    public.aggregate_enrichment_for_post(p.id) AS payload
  FROM public.posts p
  WHERE EXISTS (SELECT 1 FROM public.posts_vacancies x WHERE x.post_id = p.id)
     OR EXISTS (SELECT 1 FROM public.posts_education x WHERE x.post_id = p.id)
     OR EXISTS (SELECT 1 FROM public.posts_experience x WHERE x.post_id = p.id)
     OR EXISTS (SELECT 1 FROM public.posts_selection_process x WHERE x.post_id = p.id)
     OR EXISTS (SELECT 1 FROM public.posts_documents x WHERE x.post_id = p.id)
     OR EXISTS (SELECT 1 FROM public.posts_important_dates x WHERE x.post_id = p.id)
     OR EXISTS (SELECT 1 FROM public.post_age_rules x WHERE x.post_id = p.id)
     OR EXISTS (SELECT 1 FROM public.posts_application_fee x WHERE x.post_id = p.id)
     OR EXISTS (SELECT 1 FROM public.posts_official_links x WHERE x.post_id = p.id)
)
UPDATE public.posts p
SET enrichment = coalesce(p.enrichment, '{}'::jsonb) || jsonb_build_object(
  'vacancies', CASE
    WHEN EXISTS (SELECT 1 FROM public.posts_vacancies x WHERE x.post_id = p.id)
      THEN fact_rows.payload -> 'vacancies'
    ELSE COALESCE(fact_rows.enrichment -> 'vacancies', '{}'::jsonb)
  END,
  'education', CASE
    WHEN EXISTS (SELECT 1 FROM public.posts_education x WHERE x.post_id = p.id)
      THEN fact_rows.payload -> 'education'
    ELSE COALESCE(fact_rows.enrichment -> 'education', '[]'::jsonb)
  END,
  'experience', CASE
    WHEN EXISTS (SELECT 1 FROM public.posts_experience x WHERE x.post_id = p.id)
      THEN fact_rows.payload -> 'experience'
    ELSE COALESCE(fact_rows.enrichment -> 'experience', '[]'::jsonb)
  END,
  'selection_process', CASE
    WHEN EXISTS (SELECT 1 FROM public.posts_selection_process x WHERE x.post_id = p.id)
      THEN fact_rows.payload -> 'selection_process'
    ELSE COALESCE(fact_rows.enrichment -> 'selection_process', '[]'::jsonb)
  END,
  'documents', CASE
    WHEN EXISTS (SELECT 1 FROM public.posts_documents x WHERE x.post_id = p.id)
      THEN fact_rows.payload -> 'documents'
    ELSE COALESCE(fact_rows.enrichment -> 'documents', '[]'::jsonb)
  END,
  'important_dates', CASE
    WHEN EXISTS (SELECT 1 FROM public.posts_important_dates x WHERE x.post_id = p.id)
      THEN fact_rows.payload -> 'important_dates'
    ELSE COALESCE(fact_rows.enrichment -> 'important_dates', '[]'::jsonb)
  END,
  'age_rules', CASE
    WHEN EXISTS (SELECT 1 FROM public.post_age_rules x WHERE x.post_id = p.id)
      THEN fact_rows.payload -> 'age_rules'
    ELSE COALESCE(fact_rows.enrichment -> 'age_rules', '{}'::jsonb)
  END,
  'application_fees', CASE
    -- category did not exist in the production schema before this migration.
    -- Preserve existing JSONB fee facts when legacy child rows cannot be grouped without inventing a category; the transformer keeps them hidden until field-level evidence exists.
    WHEN EXISTS (
      SELECT 1 FROM public.posts_application_fee x
      WHERE x.post_id = p.id AND x.category IS NOT NULL
    ) THEN fact_rows.payload -> 'application_fees'
    ELSE COALESCE(fact_rows.enrichment -> 'application_fees', '{}'::jsonb)
  END,
  'official_links', CASE
    WHEN EXISTS (SELECT 1 FROM public.posts_official_links x WHERE x.post_id = p.id)
      THEN fact_rows.payload -> 'official_links'
    ELSE COALESCE(fact_rows.enrichment -> 'official_links', '[]'::jsonb)
  END
)
FROM fact_rows
WHERE p.id = fact_rows.id;

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
WHERE source_discovery_origin = 'AGGREGATOR_DISCOVERED'
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
  AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
  AND (
    p."sourceName" IS DISTINCT FROM 'aggregator_extracted'
    OR p."isOfficialSource" IS DISTINCT FROM false
    OR p.is_official_source IS DISTINCT FROM false
    OR coalesce(p.enrichment, '{}'::jsonb) ? 'source_provenance'
  );

-- Clear stale child-fact verification markers for this cohort. The facts remain
-- stored for review, but none can appear verified until the new review process
-- records fresh evidence against the issuing authority's notice.
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
  AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED';

UPDATE public.posts_education e
SET verified_at = NULL, source_ref = NULL, source_locator = NULL
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE e.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED';

UPDATE public.posts_experience e
SET verified_at = NULL, source_ref = NULL, source_locator = NULL
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE e.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED';

UPDATE public.posts_vacancies e
SET verified_at = NULL, source_ref = NULL, source_locator = NULL
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE e.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED';

UPDATE public.posts_selection_process e
SET verified_at = NULL, source_ref = NULL, source_locator = NULL
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE e.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED';

UPDATE public.posts_documents e
SET verified_at = NULL, source_ref = NULL, source_locator = NULL
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE e.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED';

UPDATE public.posts_important_dates e
SET verified_at = NULL, source_ref = NULL, source_locator = NULL
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE e.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED';

UPDATE public.post_age_rules e
SET verified_at = NULL, source_ref = NULL, source_locator = NULL
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE e.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED';

UPDATE public.posts_application_fee e
SET verified_at = NULL, source_ref = NULL, source_locator = NULL
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE e.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED';

UPDATE public.posts_official_links e
SET verified_at = NULL, source_ref = NULL, source_locator = NULL
FROM public.posts p
JOIN public.recruitments r ON r.id = p.recruitment_id
WHERE e.post_id = p.id AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED';

-- Refresh canonical JSONB after the child evidence has been cleared. This
-- prevents stale verified_at/source pointers from surviving in JSONB projections.
WITH refreshed AS (
  SELECT p.id, public.aggregate_enrichment_for_post(p.id) AS payload
  FROM public.posts p
  JOIN public.recruitments r ON r.id = p.recruitment_id
  WHERE r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
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
  AND r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
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
SET enrichment = (coalesce(p.enrichment, '{}'::jsonb) - 'source_provenance')
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
