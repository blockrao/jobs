-- Grant SELECT on tables referenced via Drizzle relations from the canonical
-- entity layer (recruitments, posts, etc.) that were missing from the initial
-- grant in 20261007150000.
--
-- Missing tables identified by checking has_table_privilege('anon', table, 'SELECT'):
--   exams        — joined via recruitments.with({ exam: true })
--   qualifications — joined via eligibilitiesRelations → qualificationId
--   locations    — joined via vacanciesRelations → locationId
--
-- These three caused "permission denied" at runtime, which safeQuery caught
-- and turned into null → notFound() → 404 on every post leaf page.
--
-- No data is modified; privilege-only change.

GRANT SELECT ON public.exams TO anon;
GRANT SELECT ON public.qualifications TO anon;
GRANT SELECT ON public.locations TO anon;
