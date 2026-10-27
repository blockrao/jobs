-- Rollback for 20261027061751_descriptive_recruitment_slugs.
-- Refuse rollback while descriptive slugs exist; do not rewrite published URLs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.recruitments WHERE slug !~ '^org\d+-\d{4}-\d{4}$') THEN
    RAISE EXCEPTION 'Cannot restore the legacy-only constraint while descriptive slugs exist; migrate those rows deliberately first.';
  END IF;
END $$;
ALTER TABLE public.recruitments DROP CONSTRAINT IF EXISTS recruitment_slug_format_check;
ALTER TABLE public.recruitments ADD CONSTRAINT recruitment_slug_format_check CHECK (slug ~ '^org\d+-\d{4}-\d{4}$');
