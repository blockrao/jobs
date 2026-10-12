-- Migration: raw_notifications staging table
-- Purpose: intake queue for daily digest entries; no FK constraints; never canonical data
-- Governance: pre-change report accepted; staging only, no canonical mutation
-- Date: 2026-10-12

create table if not exists raw_notifications (
  id                      bigserial primary key,

  -- digest metadata
  digest_date             date not null,
  digest_source           text not null default 'fja_daily_digest',

  -- fields from daily digest JSON (field names match digest spec)
  org_short               text,           -- `o`  short org name / acronym
  org_full                text,           -- `of` full org name
  post_name               text,           -- `p`  post / role name
  vacancies               integer,        -- `v`  vacancy count (null if not numeric)
  vacancies_raw           text,           -- `v` raw string before parse
  fee_text                text,           -- `b`  fee text
  salary_text             text,           -- `l`  pay/salary text
  last_date               date,           -- `a`  application closing date
  last_date_raw           text,           -- `a` raw string before parse
  official_pdf_url        text,           -- `x`  official notification PDF URL
  apply_url               text,           -- `xl` apply/form URL
  source_url              text,           -- `u`  FJA article URL (discovery source only)
  category                text,           -- `c`  category (Central/State/etc.)
  states                  text[],         -- `s`  states array
  qualification_text      text,           -- `q`  qualification summary

  -- promotion tracking
  promoted                boolean not null default false,
  promoted_at             timestamptz,
  promoted_recruitment_id integer references recruitments(id) on delete set null,
  promoted_post_id        integer references posts(id) on delete set null,
  promotion_notes         text,

  -- row metadata
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- dedup: one row per (digest_date, source_url) — same FJA article on same day = same entry
  constraint raw_notifications_dedup unique (digest_date, source_url)
);

-- Index for promotion queries
create index raw_notifications_promoted_idx on raw_notifications (promoted, digest_date);
create index raw_notifications_digest_date_idx on raw_notifications (digest_date);
create index raw_notifications_pdf_url_idx on raw_notifications (official_pdf_url) where official_pdf_url is not null;

-- Auto-update updated_at
create or replace function raw_notifications_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger raw_notifications_updated_at
  before update on raw_notifications
  for each row execute function raw_notifications_set_updated_at();

comment on table raw_notifications is
  'Intake staging for daily digest entries. No FK integrity on org/post names. '
  'Never read by the public app — promotion scripts write into recruitments/posts from here.';
