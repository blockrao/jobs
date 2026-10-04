-- WP-001 — raw observation and organization candidate boundary
-- (architect direction 2026-10-04: "Ingestion is not publication"; unresolved
-- organizations are candidates, never canonical; the raw source observation is
-- separable from what JobOye believes. Ledger refs added in the WP-001 note.)
--
-- Additive only: three new tables. No existing table, column, index or row is
-- changed. Rollback: supabase/rollback/wp_001_observation_candidate_boundary.down.sql
-- Not applied to production. Apply only after the tested backup/restore gate
-- (docs/architecture/WP001_BACKUP_GATE.md) has passed and the owner approves.

-- 1. Known aliases of canonical organizations.
create table public.organization_aliases (
  id               serial primary key,
  organization_id  integer not null references public.organizations(id) on delete cascade,
  alias_normalized varchar(200) not null,
  alias_raw        varchar(300),
  source           varchar(80) not null default 'manual',
  created_at       timestamptz not null default now()
);
create unique index organization_aliases_alias_idx on public.organization_aliases (alias_normalized);
create index organization_aliases_org_idx on public.organization_aliases (organization_id);

-- 2. Organization candidates: "recognizable but not sufficiently resolved".
--    A candidate is not a canonical organization and is never linked from public pages.
create table public.organization_candidates (
  id                        serial primary key,
  raw_name                  varchar(300) not null,
  normalized_name           varchar(200) not null,
  source                    varchar(80) not null,
  source_url                text,
  evidence                  jsonb,
  confidence                smallint,
  reason                    varchar(60) not null,
  proposed_organization_id  integer references public.organizations(id) on delete set null,
  status                    varchar(20) not null default 'OPEN',
  observation_count         integer not null default 1,
  first_seen_at             timestamptz not null default now(),
  last_seen_at              timestamptz not null default now(),
  constraint organization_candidates_status_chk
    check (status in ('OPEN', 'ESTABLISHED', 'REJECTED', 'MERGED'))
);
create unique index organization_candidates_name_source_idx
  on public.organization_candidates (normalized_name, source);

-- 3. Raw source observations: what the source told us, when we ingested it,
--    and what happened to it afterwards. Append-only; one row per distinct
--    content of a (source, external_id).
create table public.source_observations (
  id            bigint generated always as identity primary key,
  source        varchar(80) not null,
  external_id   varchar(200) not null,
  source_url    text,
  observed_at   timestamptz not null default now(),
  content_hash  varchar(64) not null,
  facts         jsonb not null,
  links         jsonb,
  raw           jsonb,
  run_id        varchar(80),
  outcome       varchar(30) not null default 'RECEIVED',
  outcome_reason text,
  posting_id    integer references public.postings(id) on delete set null,
  candidate_id  integer references public.organization_candidates(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint source_observations_outcome_chk
    check (outcome in ('RECEIVED', 'LOADED', 'HELD_CANDIDATE', 'REJECTED', 'SKIPPED'))
);
create unique index source_observations_content_idx
  on public.source_observations (source, external_id, content_hash);
create index source_observations_identity_idx
  on public.source_observations (source, external_id, observed_at desc);
create index source_observations_posting_idx on public.source_observations (posting_id);

-- 4. Closed by default, like the SEC-001 tables: the application connects as the
--    owning role; untrusted roles have no access.
alter table public.organization_aliases    enable row level security;
alter table public.organization_candidates enable row level security;
alter table public.source_observations     enable row level security;
