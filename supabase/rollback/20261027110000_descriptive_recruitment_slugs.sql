-- Rollback for 20261027110000_descriptive_recruitment_slugs.
-- This rollback intentionally refuses to run while descriptive slugs exist.
-- Do not rewrite published URLs as part of a schema rollback.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.recruitments
    WHERE slug !~ '^org\d+-\d{4}-\d{4}$'
  ) THEN
    RAISE EXCEPTION 'Cannot restore legacy-only recruitment slug constraint while descriptive slugs exist; migrate those rows deliberately first.';
  END IF;
END $$;

ALTER TABLE public.recruitments
  DROP CONSTRAINT IF EXISTS recruitment_slug_format_check;

ALTER TABLE public.recruitments
  ADD CONSTRAINT recruitment_slug_format_check
  CHECK (slug ~ '^org\d+-\d{4}-\d{4}$');
