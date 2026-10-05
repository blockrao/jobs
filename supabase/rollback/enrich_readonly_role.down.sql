drop policy if exists enrich_ro_read on public.postings;
revoke all on public.postings from enrich_ro;
revoke usage on schema public from enrich_ro;
drop role if exists enrich_ro;
