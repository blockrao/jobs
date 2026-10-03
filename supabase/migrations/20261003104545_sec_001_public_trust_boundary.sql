-- SEC-001 — public trust boundary (ledger A-022, A-023, A-038)
--
-- Rule: an untrusted caller has no write path to stored data, reads only
-- through the application's read model, and anything created later is
-- closed by default. The application connects as the owning role
-- (postgres), which is unaffected by everything below.
--
-- Touches access metadata only. No table, column, index or row changes.
-- Rollback: supabase/rollback/sec_001_public_trust_boundary.down.sql

-- 1. Deny-by-default row access on the 12 tables that were left open.
alter table public.recruitments        enable row level security;
alter table public.posts               enable row level security;
alter table public.positions           enable row level security;
alter table public.vacancies           enable row level security;
alter table public.eligibilities       enable row level security;
alter table public.selection_processes enable row level security;
alter table public.exams               enable row level security;
alter table public.commissions         enable row level security;
alter table public.locations           enable row level security;
alter table public.qualifications      enable row level security;
alter table public.sources             enable row level security;
alter table public.source_documents    enable row level security;

-- 2. No privileges for the public roles on anything that exists.
--    "all tables" covers views as well.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon, authenticated, public;

-- 3. Closed by default for anything the migration owner creates later.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
-- The built-in grant of EXECUTE to PUBLIC is global, so it can only be
-- removed globally for this role, not per schema.
alter default privileges for role postgres
  revoke execute on functions from public;
