-- EMERGENCY ROLLBACK ONLY.
-- This restores the pre-migration public-read behavior and therefore reopens
-- direct anonymous access to all job-data rows. Do not run as routine cleanup.
-- Roll back application code that calls private.is_recruitment_publicly_trusted()
-- before running this file. Prefer fixing forward over removing the source gate.
--
-- source_discovery_origin and its check constraint are intentionally retained:
-- provenance must not be erased if a later reviewed backfill has populated it.

DROP TRIGGER IF EXISTS trg_guard_recruitment_discovery_origin ON public.recruitments;
DROP TRIGGER IF EXISTS trg_propagate_post_discovery_origin ON public.posts;
DROP TRIGGER IF EXISTS trg_propagate_legacy_posting_discovery_origin ON public.postings;

DROP POLICY IF EXISTS "public read" ON public.recruitments;
CREATE POLICY "public read" ON public.recruitments
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public read" ON public.posts;
CREATE POLICY "public read" ON public.posts
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public read" ON public.eligibilities;
CREATE POLICY "public read" ON public.eligibilities
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public read" ON public.post_age_rules;
CREATE POLICY "public read" ON public.post_age_rules
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public read" ON public.vacancies;
CREATE POLICY "public read" ON public.vacancies
  FOR SELECT TO public USING (true);

REVOKE ALL ON FUNCTION private.is_recruitment_publicly_trusted(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_post_publicly_trusted(integer) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS private.guard_recruitment_discovery_origin();
DROP FUNCTION IF EXISTS private.propagate_post_discovery_origin();
DROP FUNCTION IF EXISTS private.legacy_posting_has_aggregator_origin_for_post(integer);
DROP FUNCTION IF EXISTS private.propagate_legacy_posting_discovery_origin();
DROP FUNCTION IF EXISTS private.is_post_publicly_trusted(integer);
DROP FUNCTION IF EXISTS private.is_recruitment_publicly_trusted(integer);
DROP FUNCTION IF EXISTS private.has_complete_issuer_fact_review(jsonb);
DROP FUNCTION IF EXISTS private.is_past_review_timestamp(text);
DROP FUNCTION IF EXISTS private.recruitment_has_aggregator_origin(integer);
DROP FUNCTION IF EXISTS private.is_aggregator_source_value(text);
DROP FUNCTION IF EXISTS private.is_fja_url(text);

REVOKE USAGE ON SCHEMA private FROM anon, authenticated, service_role;

-- Do not drop the private schema, discovery-origin column, constraint or indexes.
-- They are non-destructive and may contain future reviewed provenance.
