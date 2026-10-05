-- PQ-004: separate "meaningful change" date for sitemap lastmod, additive and nullable.
-- updated_at moves on any write (enrichment fills, flags, review notes). content_changed_at is
-- set only when a reader-visible fact changes. NULL means "never recorded": the sitemap falls
-- back to updated_at, so applying this migration changes no output by itself. No existing row changes.
ALTER TABLE public.postings ADD COLUMN IF NOT EXISTS content_changed_at timestamptz;
COMMENT ON COLUMN public.postings.content_changed_at IS
  'Last meaningful change to reader-visible facts (deadline, vacancies, links, stage, exam date, page content). Used for sitemap lastmod as coalesce(content_changed_at, updated_at). Not the Last Verified date.';
