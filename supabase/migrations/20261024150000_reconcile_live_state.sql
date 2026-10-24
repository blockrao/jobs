-- 20261024150000_reconcile_live_state
--
-- Records the production database state after the 24 Oct 2026 incident and
-- replaces three migration files that were committed but never applied
-- (20261024100000_slug_corruption_fix, 20261024130000_step2_remove_fabricated_data,
-- 20261024140000_step5_schema_hardening): they referenced columns that do not
-- exist and a slug pattern that contradicts the live data. Everything below is
-- idempotent; on production most of it is already true.

-- 1. Recruitment slug format: org{organization_id}-{year}-{nnnn}
CREATE OR REPLACE FUNCTION public.auto_generate_recruitment_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_max_seq INTEGER;
BEGIN
  IF NEW.slug IS NULL THEN
    SELECT COALESCE(MAX((regexp_matches(slug, '-(\d{4})$'))[1]::INT), 0)
      INTO v_max_seq
      FROM public.recruitments
     WHERE organization_id = NEW.organization_id
       AND year = NEW.year;
    NEW.slug := 'org' || NEW.organization_id::TEXT || '-' || NEW.year || '-' || LPAD((v_max_seq + 1)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS recruitment_slug_auto_gen ON public.recruitments;
CREATE TRIGGER recruitment_slug_auto_gen
  BEFORE INSERT ON public.recruitments
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_recruitment_slug();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recruitment_slug_format_check') THEN
    ALTER TABLE public.recruitments
      ADD CONSTRAINT recruitment_slug_format_check CHECK (slug ~ '^org\d+-\d{4}-\d{4}$');
  END IF;
END $$;

-- 2. employment_type is a stated fact or NULL; no FULL_TIME default.
ALTER TABLE public.recruitments ALTER COLUMN employment_type DROP DEFAULT;
ALTER TABLE public.recruitments ALTER COLUMN employment_type DROP NOT NULL;

-- 3. Row Level Security on every public table (the app connects as the table
--    owner via DATABASE_URL and is unaffected; this closes anon/authenticated
--    access through the Supabase API).
ALTER TABLE public.recruitment_slug_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 4. Leftover one-off backup / staging tables leave the public schema.
CREATE SCHEMA IF NOT EXISTS backup_20261024;
REVOKE ALL ON SCHEMA backup_20261024 FROM anon, authenticated;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'digest_staging_20261015', 'rollback_recruitments_20261015', 'rollback_posts_20261015',
    'posts_backup_20261022', '_tmp_url_match', 'enrichment_backfill_audit',
    'recruitment_slug_redirects_backup_2026_10_24'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA backup_20261024', t);
      EXECUTE format('ALTER TABLE backup_20261024.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA backup_20261024 FROM anon, authenticated;
