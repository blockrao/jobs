-- A-070 (part 1): provenance for the official notification/apply link on a recruitment.
-- NOTE: applied to production on 2026-10-04 (owner-directed) BEFORE this file was
-- committed; this file records exactly what was applied (version 20261004184250).
-- Pending architect acceptance, see docs/architecture/A070_PRECHANGE_AND_RECORD.md.
alter table public.recruitments add column if not exists official_link_source varchar(40);
comment on column public.recruitments.official_link_source is
  'How the official notification/apply link was obtained: MANUAL_VERIFIED, AGGREGATOR_DISCOVERED. Null = no link.';
