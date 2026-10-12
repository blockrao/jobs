-- SEC-002 (ledger A-085): recruitment_slug_redirects was created after SEC-001
-- without row level security, the one public table left that way.
--
-- Deny by default, same as SEC-001: enable row level security and add no
-- policy. The application reads this table as the owning role (postgres),
-- which row level security does not restrict, so the 301 redirects are
-- unaffected. The public roles (anon, authenticated) already hold no
-- privilege on the table (SEC-001 default privileges); this closes the
-- remaining gap should a grant ever be added by mistake.
--
-- Touches access metadata only. No table, column, index or row changes.
-- Rollback: supabase/rollback/sec_002_recruitment_slug_redirects_rls.down.sql

ALTER TABLE public.recruitment_slug_redirects ENABLE ROW LEVEL SECURITY;
