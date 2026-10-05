DROP INDEX IF EXISTS public.postings_state_slug_idx;
ALTER TABLE public.postings DROP COLUMN IF EXISTS state_slug;
