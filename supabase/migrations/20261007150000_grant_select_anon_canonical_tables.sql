-- Grant SELECT on canonical entity tables to the anon role.
--
-- Context: 20261007140000 added RLS SELECT policies (USING true) to
-- recruitments, posts, organizations, positions, eligibilities, vacancies,
-- and post_age_rules. But Postgres requires a separate GRANT SELECT for
-- table-level access — RLS policies only filter rows, they do not grant
-- the privilege itself. Without GRANT SELECT the anon role receives
-- "permission denied for table" on every query, which safeQuery catches
-- and turns into null, which the page code treats as notFound() → 404.
--
-- The postings table (legacy hub pages) already has SELECT granted to anon
-- and works. This migration brings the canonical entity tables to the
-- same state.
--
-- No data is modified; this is a privilege-only change.

GRANT SELECT ON public.recruitments TO anon;
GRANT SELECT ON public.posts TO anon;
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.positions TO anon;
GRANT SELECT ON public.eligibilities TO anon;
GRANT SELECT ON public.vacancies TO anon;
GRANT SELECT ON public.post_age_rules TO anon;
