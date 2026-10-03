-- Rollback for SEC-001. EMERGENCY USE ONLY: this reopens the public write
-- path that SEC-001 closed. Never applied automatically. Restores the state
-- recorded in supabase/baseline/02_objects.txt.

alter default privileges for role postgres
  grant execute on functions to public;
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated;
alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated;

grant execute on all functions in schema public to anon, authenticated, public;
grant all on all sequences in schema public to anon, authenticated;
grant all on all tables    in schema public to anon, authenticated;

alter table public.source_documents    disable row level security;
alter table public.sources             disable row level security;
alter table public.qualifications      disable row level security;
alter table public.locations           disable row level security;
alter table public.commissions         disable row level security;
alter table public.exams               disable row level security;
alter table public.selection_processes disable row level security;
alter table public.eligibilities       disable row level security;
alter table public.vacancies           disable row level security;
alter table public.positions           disable row level security;
alter table public.posts               disable row level security;
alter table public.recruitments        disable row level security;
