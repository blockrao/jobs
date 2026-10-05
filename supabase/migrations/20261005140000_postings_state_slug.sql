-- State hub pages: the state or union territory a posting belongs to, as a slug from the fixed
-- list in src/lib/states/states.ts. Additive and nullable; NULL means "no state evidence" (national
-- or unresolved). No existing row changes. Backfilled separately, fill-only, with a backup.
ALTER TABLE public.postings ADD COLUMN IF NOT EXISTS state_slug varchar(120);
CREATE INDEX IF NOT EXISTS postings_state_slug_idx ON public.postings (state_slug) WHERE state_slug IS NOT NULL;
COMMENT ON COLUMN public.postings.state_slug IS
  'State/UT hub slug (src/lib/states/states.ts), set only from explicit evidence (location, organization state, state-body name, title). NULL = national or unresolved.';
