-- PQ-008: restricted read-only login for the enrichment job.
-- It can read six columns of approved FreeJobAlert-sourced postings and nothing else.
-- Replace the password before running; never commit the real one.
create role enrich_ro login password 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD' nobypassrls nosuperuser nocreatedb nocreaterole;
grant usage on schema public to enrich_ro;
grant select (id, source, source_url, review_status, index_tier, total_vacancies) on public.postings to enrich_ro;
create policy enrich_ro_read on public.postings for select to enrich_ro
  using (review_status = 'APPROVED' and source = 'freejobalert');
