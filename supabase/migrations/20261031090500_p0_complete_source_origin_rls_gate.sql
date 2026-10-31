-- P0: complete aggregator-origin detection and close direct anonymous RLS bypasses.
-- This migration deliberately does NOT backfill or demote existing Recruitment rows.
-- Existing origins are detected dynamically from all persisted canonical and legacy signals.
-- The separate read-only manifest must be reviewed before any bulk backfill/remediation.

ALTER TABLE public.recruitments
  ADD COLUMN IF NOT EXISTS source_discovery_origin text;

COMMENT ON COLUMN public.recruitments.source_discovery_origin IS
  'Immutable discovery origin. AGGREGATOR_DISCOVERED records remain untrusted until issuer and field-level fact review is complete.';

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recruitments_source_discovery_origin_check'
      AND conrelid = 'public.recruitments'::regclass
  ) THEN
    ALTER TABLE public.recruitments
      ADD CONSTRAINT recruitments_source_discovery_origin_check
      CHECK (source_discovery_origin IS NULL OR source_discovery_origin = 'AGGREGATOR_DISCOVERED');
  END IF;
END;
$constraint$;

CREATE INDEX IF NOT EXISTS idx_recruitments_source_discovery_origin
  ON public.recruitments (source_discovery_origin)
  WHERE source_discovery_origin IS NOT NULL;

-- The helper schema is not exposed through the Supabase Data API.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_fja_url(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $fn$
  SELECT coalesce(
    lower(btrim(p_value)) ~ '^((https?:)?//)?([a-z0-9-]+\.)*freejobalert\.com([/:?#]|$)',
    false
  );
$fn$;

CREATE OR REPLACE FUNCTION private.is_aggregator_source_value(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $fn$
  SELECT lower(btrim(coalesce(p_value, ''))) IN (
    'fja', 'freejobalert', 'ext-1', 'ext-2', 'ext-3', 'ext-4', 'ext-5',
    'aggregator', 'aggregator_extracted', 'pilot_preliminary',
    'institutional_aggregation', 'institution_aggregation', 'fja_html',
    'aggregator_discovered', 'fja_official_link_extracted', 'official_link_extracted'
  );
$fn$;

-- Checks every persisted Recruitment, Post, and legacy Posting origin signal.
-- SECURITY DEFINER is required because this is called by RLS policies and must
-- inspect source rows without recursively invoking the same public policies.
CREATE OR REPLACE FUNCTION private.recruitment_has_aggregator_origin(
  p_recruitment_id integer
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
  SELECT coalesce((
    SELECT
      r.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      OR private.is_aggregator_source_value(r.official_link_source)
      OR private.is_aggregator_source_value(r.enrichment_data -> 'meta' ->> 'source')
      OR private.is_aggregator_source_value(r.metadata -> 'source_provenance' ->> 'discovery_origin')
      OR private.is_fja_url(r.source_url)
      OR EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.recruitment_id = r.id
          AND (
            private.is_aggregator_source_value(p."sourceName")
            OR private.is_fja_url(p."sourceReference")
            OR private.is_fja_url(p.original_recruitment_url)
            OR private.is_fja_url(p."originalRecruitmentUrl")
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.postings sp
        LEFT JOIN public.posts linked_post ON linked_post.id = sp.inferred_post_id
        WHERE (sp.inferred_recruitment_id = r.id
           OR linked_post.recruitment_id = r.id)
        AND (
          private.is_aggregator_source_value(sp.source)
          OR private.is_aggregator_source_value(sp.enrichment_source)
          OR upper(btrim(coalesce(sp.source_type, ''))) = 'AGGREGATOR'
          OR private.is_fja_url(sp.source_url)
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(
              CASE
                WHEN jsonb_typeof(coalesce(sp.source_portals, '[]'::jsonb)) = 'array'
                  THEN sp.source_portals
                ELSE '[]'::jsonb
              END
            ) AS portal(value)
            WHERE private.is_aggregator_source_value(portal.value)
          )
        )
      )
    FROM public.recruitments r
    WHERE r.id = p_recruitment_id
  ), false);
$fn$;

-- Timestamp parsing is exception-safe: malformed reviewer timestamps never
-- make an RLS policy error or accidentally authorize a row.
CREATE OR REPLACE FUNCTION private.is_past_review_timestamp(p_value text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF nullif(btrim(p_value), '') IS NULL THEN
    RETURN false;
  END IF;
  RETURN p_value::timestamptz <= now();
EXCEPTION WHEN others THEN
  RETURN false;
END;
$fn$;

CREATE OR REPLACE FUNCTION private.has_complete_issuer_fact_review(p_metadata jsonb)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $fn$
  SELECT coalesce(
    p_metadata -> 'source_provenance' -> 'authority_review' ->> 'status' = 'VERIFIED'
    AND p_metadata -> 'source_provenance' -> 'authority_review' ->> 'evidence_url' ~* '^https://'
    AND nullif(btrim(p_metadata -> 'source_provenance' -> 'authority_review' ->> 'reviewed_by'), '') IS NOT NULL
    AND private.is_past_review_timestamp(p_metadata -> 'source_provenance' -> 'authority_review' ->> 'reviewed_at')
    AND nullif(btrim(p_metadata -> 'source_provenance' -> 'authority_review' ->> 'notes'), '') IS NOT NULL
    AND p_metadata -> 'source_provenance' -> 'fact_review' ->> 'status' = 'VERIFIED'
    AND nullif(btrim(p_metadata -> 'source_provenance' -> 'fact_review' ->> 'reviewed_by'), '') IS NOT NULL
    AND private.is_past_review_timestamp(p_metadata -> 'source_provenance' -> 'fact_review' ->> 'reviewed_at')
    AND nullif(btrim(p_metadata -> 'source_provenance' -> 'fact_review' ->> 'notes'), '') IS NOT NULL
    AND jsonb_typeof(p_metadata -> 'source_provenance' -> 'fact_review' -> 'reviewed_fields') = 'array'
    AND CASE
      WHEN jsonb_typeof(p_metadata -> 'source_provenance' -> 'fact_review' -> 'reviewed_fields') = 'array'
        THEN jsonb_array_length(p_metadata -> 'source_provenance' -> 'fact_review' -> 'reviewed_fields') > 0
      ELSE false
    END
    AND jsonb_typeof(p_metadata -> 'source_provenance' -> 'fact_review' -> 'evidence') = 'object'
    AND (p_metadata -> 'source_provenance' -> 'fact_review' -> 'reviewed_fields') ? 'hub:notification_date'
    AND (p_metadata -> 'source_provenance' -> 'fact_review' -> 'evidence') ? 'hub:notification_date'
    AND nullif(btrim(p_metadata -> 'source_provenance' -> 'fact_review' -> 'evidence' -> 'hub:notification_date' ->> 'evidence_ref'), '') IS NOT NULL
    AND nullif(btrim(p_metadata -> 'source_provenance' -> 'fact_review' -> 'evidence' -> 'hub:notification_date' ->> 'excerpt'), '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(p_metadata -> 'source_provenance' -> 'fact_review' -> 'reviewed_fields') = 'array'
            THEN p_metadata -> 'source_provenance' -> 'fact_review' -> 'reviewed_fields'
          ELSE '[]'::jsonb
        END
      ) AS reviewed(field_key)
      WHERE nullif(btrim(reviewed.field_key), '') IS NULL
         OR jsonb_typeof(
           p_metadata -> 'source_provenance' -> 'fact_review' -> 'evidence' -> reviewed.field_key
         ) IS DISTINCT FROM 'object'
         OR nullif(btrim(
           p_metadata -> 'source_provenance' -> 'fact_review' -> 'evidence' -> reviewed.field_key ->> 'evidence_ref'
         ), '') IS NULL
         OR nullif(btrim(
           p_metadata -> 'source_provenance' -> 'fact_review' -> 'evidence' -> reviewed.field_key ->> 'excerpt'
         ), '') IS NULL
    ),
    false
  );
$fn$;

CREATE OR REPLACE FUNCTION private.is_recruitment_publicly_trusted(p_recruitment_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
  SELECT coalesce((
    SELECT
      EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.recruitment_id = r.id
          AND p.posting_status IS DISTINCT FROM 'DUPLICATE'
      )
      AND CASE
        WHEN private.recruitment_has_aggregator_origin(r.id) THEN
          r.verification_status = 'VERIFIED'
          AND upper(btrim(coalesce(r.official_link_source, ''))) = 'MANUAL_VERIFIED'
          AND private.has_complete_issuer_fact_review(r.metadata)
        ELSE true
      END
    FROM public.recruitments r
    WHERE r.id = p_recruitment_id
  ), false);
$fn$;

CREATE OR REPLACE FUNCTION private.is_post_publicly_trusted(p_post_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
  SELECT coalesce((
    SELECT p.posting_status IS DISTINCT FROM 'DUPLICATE'
      AND private.is_recruitment_publicly_trusted(p.recruitment_id)
    FROM public.posts p
    WHERE p.id = p_post_id
  ), false);
$fn$;

-- Preserve aggregator discovery origin on future canonical and legacy writes.
CREATE OR REPLACE FUNCTION private.guard_recruitment_discovery_origin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.source_discovery_origin = 'AGGREGATOR_DISCOVERED'
       OR private.recruitment_has_aggregator_origin(OLD.id) THEN
      NEW.source_discovery_origin := 'AGGREGATOR_DISCOVERED';
    END IF;
  END IF;

  IF NEW.source_discovery_origin IS DISTINCT FROM 'AGGREGATOR_DISCOVERED'
     AND (
       private.is_aggregator_source_value(NEW.official_link_source)
       OR private.is_aggregator_source_value(NEW.enrichment_data -> 'meta' ->> 'source')
       OR private.is_aggregator_source_value(NEW.metadata -> 'source_provenance' ->> 'discovery_origin')
       OR private.is_fja_url(NEW.source_url)
     ) THEN
    NEW.source_discovery_origin := 'AGGREGATOR_DISCOVERED';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_guard_recruitment_discovery_origin ON public.recruitments;
CREATE TRIGGER trg_guard_recruitment_discovery_origin
BEFORE INSERT OR UPDATE OF source_discovery_origin, official_link_source, enrichment_data, metadata, source_url
ON public.recruitments
FOR EACH ROW
EXECUTE FUNCTION private.guard_recruitment_discovery_origin();

CREATE OR REPLACE FUNCTION private.legacy_posting_has_aggregator_origin_for_post(p_post_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.postings sp
    WHERE sp.inferred_post_id = p_post_id
      AND (
        private.is_aggregator_source_value(sp.source)
        OR private.is_aggregator_source_value(sp.enrichment_source)
        OR upper(btrim(coalesce(sp.source_type, ''))) = 'AGGREGATOR'
        OR private.is_fja_url(sp.source_url)
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(coalesce(sp.source_portals, '[]'::jsonb)) = 'array'
                THEN sp.source_portals
              ELSE '[]'::jsonb
            END
          ) AS portal(value)
          WHERE private.is_aggregator_source_value(portal.value)
        )
      )
  );
$fn$;

CREATE OR REPLACE FUNCTION private.propagate_post_discovery_origin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF private.is_aggregator_source_value(OLD."sourceName")
       OR private.is_fja_url(OLD."sourceReference")
       OR private.is_fja_url(OLD.original_recruitment_url)
       OR private.is_fja_url(OLD."originalRecruitmentUrl")
       OR private.legacy_posting_has_aggregator_origin_for_post(OLD.id) THEN
      UPDATE public.recruitments
      SET source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      WHERE id = OLD.recruitment_id
        AND source_discovery_origin IS DISTINCT FROM 'AGGREGATOR_DISCOVERED';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF private.is_aggregator_source_value(OLD."sourceName")
       OR private.is_fja_url(OLD."sourceReference")
       OR private.is_fja_url(OLD.original_recruitment_url)
       OR private.is_fja_url(OLD."originalRecruitmentUrl")
       OR private.legacy_posting_has_aggregator_origin_for_post(OLD.id) THEN
      UPDATE public.recruitments
      SET source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      WHERE id = OLD.recruitment_id
        AND source_discovery_origin IS DISTINCT FROM 'AGGREGATOR_DISCOVERED';
    END IF;
  END IF;

  IF private.is_aggregator_source_value(NEW."sourceName")
     OR private.is_fja_url(NEW."sourceReference")
     OR private.is_fja_url(NEW.original_recruitment_url)
     OR private.is_fja_url(NEW."originalRecruitmentUrl")
     OR private.legacy_posting_has_aggregator_origin_for_post(NEW.id) THEN
    UPDATE public.recruitments
    SET source_discovery_origin = 'AGGREGATOR_DISCOVERED'
    WHERE id = NEW.recruitment_id
      AND source_discovery_origin IS DISTINCT FROM 'AGGREGATOR_DISCOVERED';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_propagate_post_discovery_origin ON public.posts;
CREATE TRIGGER trg_propagate_post_discovery_origin
BEFORE INSERT OR UPDATE OF recruitment_id, "sourceName", "sourceReference", original_recruitment_url, "originalRecruitmentUrl" OR DELETE
ON public.posts
FOR EACH ROW
EXECUTE FUNCTION private.propagate_post_discovery_origin();

CREATE OR REPLACE FUNCTION private.propagate_legacy_posting_discovery_origin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF private.is_aggregator_source_value(OLD.source)
       OR private.is_aggregator_source_value(OLD.enrichment_source)
       OR upper(btrim(coalesce(OLD.source_type, ''))) = 'AGGREGATOR'
       OR private.is_fja_url(OLD.source_url)
       OR EXISTS (
         SELECT 1
         FROM jsonb_array_elements_text(
           CASE
             WHEN jsonb_typeof(coalesce(OLD.source_portals, '[]'::jsonb)) = 'array'
               THEN OLD.source_portals
             ELSE '[]'::jsonb
           END
         ) AS portal(value)
         WHERE private.is_aggregator_source_value(portal.value)
       ) THEN
      UPDATE public.recruitments r
      SET source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      WHERE r.id = OLD.inferred_recruitment_id
         OR r.id = (
           SELECT p.recruitment_id
           FROM public.posts p
           WHERE p.id = OLD.inferred_post_id
         );
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF private.is_aggregator_source_value(OLD.source)
       OR private.is_aggregator_source_value(OLD.enrichment_source)
       OR upper(btrim(coalesce(OLD.source_type, ''))) = 'AGGREGATOR'
       OR private.is_fja_url(OLD.source_url)
       OR EXISTS (
         SELECT 1
         FROM jsonb_array_elements_text(
           CASE
             WHEN jsonb_typeof(coalesce(OLD.source_portals, '[]'::jsonb)) = 'array'
               THEN OLD.source_portals
             ELSE '[]'::jsonb
           END
         ) AS portal(value)
         WHERE private.is_aggregator_source_value(portal.value)
       ) THEN
      UPDATE public.recruitments r
      SET source_discovery_origin = 'AGGREGATOR_DISCOVERED'
      WHERE r.id = OLD.inferred_recruitment_id
         OR r.id = (
           SELECT p.recruitment_id
           FROM public.posts p
           WHERE p.id = OLD.inferred_post_id
         );
    END IF;
  END IF;

  IF private.is_aggregator_source_value(NEW.source)
     OR private.is_aggregator_source_value(NEW.enrichment_source)
     OR upper(btrim(coalesce(NEW.source_type, ''))) = 'AGGREGATOR'
     OR private.is_fja_url(NEW.source_url)
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements_text(
         CASE
           WHEN jsonb_typeof(coalesce(NEW.source_portals, '[]'::jsonb)) = 'array'
             THEN NEW.source_portals
           ELSE '[]'::jsonb
         END
       ) AS portal(value)
       WHERE private.is_aggregator_source_value(portal.value)
     ) THEN
    UPDATE public.recruitments r
    SET source_discovery_origin = 'AGGREGATOR_DISCOVERED'
    WHERE r.id = NEW.inferred_recruitment_id
       OR r.id = (
         SELECT p.recruitment_id
         FROM public.posts p
         WHERE p.id = NEW.inferred_post_id
       );
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_propagate_legacy_posting_discovery_origin ON public.postings;
CREATE TRIGGER trg_propagate_legacy_posting_discovery_origin
AFTER INSERT OR UPDATE OF inferred_recruitment_id, inferred_post_id, source, source_type, source_portals, source_url, enrichment_source OR DELETE
ON public.postings
FOR EACH ROW
EXECUTE FUNCTION private.propagate_legacy_posting_discovery_origin();

-- Replace the five permissive public-read policies. Do not change shared
-- reference tables or tables that currently have no anonymous SELECT policy.
ALTER TABLE public.recruitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_age_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON public.recruitments;
CREATE POLICY "public read" ON public.recruitments
  FOR SELECT TO anon, authenticated
  USING (private.is_recruitment_publicly_trusted(id));

DROP POLICY IF EXISTS "public read" ON public.posts;
CREATE POLICY "public read" ON public.posts
  FOR SELECT TO anon, authenticated
  USING (private.is_post_publicly_trusted(id));

DROP POLICY IF EXISTS "public read" ON public.eligibilities;
CREATE POLICY "public read" ON public.eligibilities
  FOR SELECT TO anon, authenticated
  USING (private.is_post_publicly_trusted(post_id));

DROP POLICY IF EXISTS "public read" ON public.post_age_rules;
CREATE POLICY "public read" ON public.post_age_rules
  FOR SELECT TO anon, authenticated
  USING (private.is_post_publicly_trusted(post_id));

DROP POLICY IF EXISTS "public read" ON public.vacancies;
CREATE POLICY "public read" ON public.vacancies
  FOR SELECT TO anon, authenticated
  USING (private.is_post_publicly_trusted(post_id));

REVOKE ALL ON FUNCTION private.is_fja_url(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_aggregator_source_value(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.recruitment_has_aggregator_origin(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_past_review_timestamp(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.has_complete_issuer_fact_review(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_recruitment_publicly_trusted(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_post_publicly_trusted(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.guard_recruitment_discovery_origin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.legacy_posting_has_aggregator_origin_for_post(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.propagate_post_discovery_origin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.propagate_legacy_posting_discovery_origin() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.is_recruitment_publicly_trusted(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_post_publicly_trusted(integer) TO anon, authenticated, service_role;

-- Intentional: no GRANT is added to postings, exams, locations, qualifications,
-- evidence, or recruitment_fees. organizations and positions retain their
-- existing public-read policies unchanged.
