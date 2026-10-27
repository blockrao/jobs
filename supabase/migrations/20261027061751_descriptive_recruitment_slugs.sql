-- 20261027061751_descriptive_recruitment_slugs
-- Applied to production as migration version 20261027061751.
ALTER TABLE public.recruitments DROP CONSTRAINT IF EXISTS recruitment_slug_format_check;
ALTER TABLE public.recruitments ADD CONSTRAINT recruitment_slug_format_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
COMMENT ON CONSTRAINT recruitment_slug_format_check ON public.recruitments IS 'Descriptive lowercase hyphenated slugs are allowed; legacy org-ID/year/sequence slugs remain valid.';
