-- 20261027110000_descriptive_recruitment_slugs
--
-- Permit readable descriptive slugs for new recruitment hubs while retaining
-- every existing org{id}-{year}-{sequence} slug unchanged. The slug trigger
-- still generates the legacy format only when callers omit a slug; new
-- ingestion writes an explicit descriptive slug.
ALTER TABLE public.recruitments
  DROP CONSTRAINT IF EXISTS recruitment_slug_format_check;

ALTER TABLE public.recruitments
  ADD CONSTRAINT recruitment_slug_format_check
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

COMMENT ON CONSTRAINT recruitment_slug_format_check ON public.recruitments IS
  'Canonical recruitment slugs may be descriptive lowercase hyphenated slugs; existing org{id}-{year}-{sequence} legacy slugs remain valid.';
