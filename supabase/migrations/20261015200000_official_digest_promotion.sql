-- Official-digest promotion: one recruitment hub + N decomposed posts per official notification.
-- Staging rows are loaded by scripts/official-digest/load_promotion.py; promote_official_digest(batch) writes canonical rows.
-- Every post inherits the hub (organisation, dates, state, official notification URL, apply URL).
-- No aggregator name or URL is stored anywhere (standing rule).

create or replace function public.slugify(p text) returns text language sql immutable strict as $$
  select trim(both '-' from regexp_replace(regexp_replace(lower(translate(p, '&', ' and ')), '[^a-z0-9]+', '-', 'g'), '-{2,}', '-', 'g'));
$$;

create table if not exists public.official_digest_promote (
  id bigserial primary key,
  batch text not null,
  rownum int not null,
  status text not null default 'PENDING',          -- PENDING | PROMOTED | SKIPPED
  skip_reason text,
  hub jsonb not null,                               -- hub facts (see build_promotion.py)
  posts jsonb not null,                             -- array of post facts
  organization_id int, recruitment_id int, post_ids int[],
  org_match_method text,
  created_at timestamptz default now(), promoted_at timestamptz,
  unique (batch, rownum)
);
alter table public.official_digest_promote enable row level security;

-- Loader (callable with the publishable key only while the batch is being loaded; revoke afterwards)
create or replace function public.official_digest_load(p_batch text, p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into official_digest_promote (batch, rownum, hub, posts)
  select p_batch, (x->>'rownum')::int, x - 'posts', coalesce(x->'posts', '[]'::jsonb)
  from jsonb_array_elements(p_rows) x
  on conflict (batch, rownum) do update set hub = excluded.hub, posts = excluded.posts
    where official_digest_promote.status = 'PENDING';
  get diagnostics n = row_count; return n;
end $$;

-- Organisation resolution: mapping (exact sheet string) -> aliases -> organisations by name -> create.
create or replace function public.official_digest_resolve_org(h jsonb, out org_id int, out method text)
language plpgsql as $$
declare raw text := coalesce(h->>'org_short','') || case when h->>'org_short' is null then '' else ' - ' end || (h->>'org_full');
        full_n text := h->>'org_full'; short_n text := h->>'org_short'; off_n text := h->>'org_official';
        slug_base text; slug_try text; k int := 0;
begin
  select canonical_org_id into org_id from organization_mapping where official_name = raw limit 1;
  if org_id is not null then method := 'mapping'; return; end if;
  select organization_id into org_id from organization_aliases
   where alias_normalized in (lower(full_n), lower(coalesce(short_n,'')), lower(coalesce(off_n,'')), lower(raw)) limit 1;
  if org_id is not null then method := 'alias'; return; end if;
  select id into org_id from organizations
   where lower(name) in (lower(full_n), lower(coalesce(off_n,'')), lower(raw)) order by id limit 1;
  if org_id is not null then method := 'name'; return; end if;
  -- punctuation/spacing-insensitive: "AIIMS, Gorakhpur" = "AIIMS Gorakhpur"
  select id into org_id from organizations
   where slug in (slugify(full_n), slugify(coalesce(off_n,'')), slugify(raw))
      or slugify(name) in (slugify(full_n), slugify(coalesce(off_n,''))) order by id limit 1;
  if org_id is not null then method := 'slug'; return; end if;
  -- create
  slug_base := left(slugify(full_n), 90); slug_try := slug_base;
  while exists (select 1 from organizations where slug = slug_try) loop k := k + 1; slug_try := slug_base || '-' || k; end loop;
  insert into organizations (name, slug, sector, state, website_url, created_at, updated_at)
  values (full_n, slug_try, case when classify_org_sector(full_n) = 'PRIVATE' then (h->>'org_sector')::org_sector else classify_org_sector(full_n) end,
          h->>'org_state', h->>'org_website', now(), now())
  returning id into org_id;
  insert into organization_mapping (official_name, canonical_org_id, match_method, notes)
  values (raw, org_id, 'official_digest_created', 'created by official-digest promotion') on conflict (official_name) do nothing;
  insert into organization_aliases (organization_id, alias_normalized, alias_raw, source)
  select distinct on (lower(a)) org_id, lower(a), a, 'official_digest' from unnest(array_remove(array[full_n, short_n, off_n], null)) a
  where not exists (select 1 from organization_aliases x where x.alias_normalized = lower(a));
  method := 'created';
end $$;

create or replace function public.promote_official_digest(p_batch text, p_limit int default 100000)
returns table (rownum int, status text, recruitment_id int, n_posts int, org_method text, note text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare s record; h jsonb; p jsonb; o record; org record;
        rec_id int; rec_slug text; rec_name text; seq int; st recruitment_status; end_d timestamptz; start_d timestamptz; notif_d timestamptz;
        post_names text; pos_id int; p_slug text; pid int; pids int[]; i int; total int; is_live boolean; today date := (now() at time zone 'Asia/Kolkata')::date;
        existing_adv int; done int := 0;
begin
  for s in select * from official_digest_promote d where d.batch = p_batch and d.status = 'PENDING' order by d.rownum loop
    h := s.hub; pids := '{}'; i := 0;
    begin
      -- duplicate guards
      if exists (select 1 from recruitments r where r.official_notification_url = h->>'official_url' or r.notification_url = h->>'official_url') then
        update official_digest_promote set status='SKIPPED', skip_reason='url already present' where id = s.id;
        rownum := s.rownum; status := 'SKIPPED'; recruitment_id := null; n_posts := 0; org_method := null; note := 'url already present'; return next; continue;
      end if;
      select * into org from official_digest_resolve_org(h);
      if h->>'advertisement_number' is not null then
        select r.id into existing_adv from recruitments r where r.organization_id = org.org_id
          and (r.advertisement_number = h->>'advertisement_number' or r.official_notification_number = h->>'advertisement_number') limit 1;
        if existing_adv is not null then
          update official_digest_promote set status='SKIPPED', skip_reason='advertisement number already present on recruitment '||existing_adv, organization_id = org.org_id where id = s.id;
          rownum := s.rownum; status := 'SKIPPED'; recruitment_id := existing_adv; n_posts := 0; org_method := org.method; note := 'adv no. exists'; return next; continue;
        end if;
      end if;
      -- dates / status
      end_d := case when h->>'application_end_date' is not null then ((h->>'application_end_date')::date::timestamp + interval '23 hours 59 minutes') at time zone 'Asia/Kolkata' end;
      start_d := case when h->>'application_start_date' is not null then (h->>'application_start_date')::date::timestamp at time zone 'Asia/Kolkata' end;
      notif_d := case when h->>'notification_date' is not null then (h->>'notification_date')::date::timestamp at time zone 'Asia/Kolkata' end;
      st := case when end_d is not null and (h->>'application_end_date')::date < today then 'CLOSED'
                 when start_d is not null and (h->>'application_start_date')::date > today then 'UPCOMING'
                 else 'ACTIVE' end;
      is_live := st <> 'CLOSED';
      total := (h->>'total_vacancies')::int;
      -- name + slug
      select string_agg(x->>'name', ', ' order by ord) into post_names from jsonb_array_elements(s.posts) with ordinality t(x, ord) where ord <= 3;
      if jsonb_array_length(s.posts) > 3 then post_names := post_names || ' and ' || (jsonb_array_length(s.posts) - 3) || ' more'; end if;
      select name, slug into o from organizations where id = org.org_id;
      rec_name := left(coalesce(h->>'org_short', o.name) || ' Recruitment 2026 – ' || post_names || case when total is not null then ' (' || total || ' Post' || case when total = 1 then '' else 's' end || ')' else '' end, 250);
      select count(*) + 1 into seq from recruitments where organization_id = org.org_id and year = 2026;
      loop
        rec_slug := left(o.slug, 100) || '-2026-' || lpad(seq::text, 2, '0');
        exit when not exists (select 1 from recruitments where slug = rec_slug);
        seq := seq + 1;
      end loop;
      insert into recruitments (organization_id, year, name, slug, slug_new, status, calculated_status, status_last_calculated,
        notification_date, application_start_date, application_end_date, exam_date, total_vacancies,
        notification_url, official_notification_url, official_application_url, apply_url,
        official_link_source, verification_status, last_verified_at, advertisement_number, official_notification_number,
        employment_type, location_state_code, fee_general, fee_reserved, fee_note, selection_process, age_note, metadata, created_at, updated_at)
      values (org.org_id, 2026, rec_name, rec_slug, rec_slug, st, st::text, now(),
        notif_d, start_d, end_d, case when h->>'exam_or_interview_date' is not null then (h->>'exam_or_interview_date')::date::timestamp at time zone 'Asia/Kolkata' end, total,
        h->>'official_url', h->>'official_url', h->>'apply_url', h->>'apply_url',
        'AGGREGATOR_DISCOVERED', case when h->>'posts_source' = 'document' then 'VERIFIED' else 'UNVERIFIED' end, case when h->>'posts_source' = 'document' then now() end,
        h->>'advertisement_number', h->>'advertisement_number',
        coalesce((h->>'employment_type')::employment_type, 'OTHER'), h->>'state_code',
        (h->>'fee_general')::int, (h->>'fee_reserved')::int, h->>'fee_note', h->>'selection_process', h->>'age_note',
        jsonb_strip_nulls(jsonb_build_object('ingest_batch', p_batch, 'category', h->>'category', 'apply_mode', h->>'apply_mode',
          'engagement_basis', h->>'engagement_basis', 'application_email', h->>'application_email', 'end_date_note', h->>'end_date_note',
          'location_city', h->>'location_city', 'posts_source', h->>'posts_source', 'review_flags', h->'flags', 'doc_notes', h->>'doc_notes')),
        now(), now())
      returning id into rec_id;
      -- posts
      for p in select x from jsonb_array_elements(s.posts) x loop
        i := i + 1;
        select id into pos_id from positions where normalize_role_key(name) = normalize_role_key(p->>'name') limit 1;
        if pos_id is null then select position_id into pos_id from position_aliases where normalize_role_key(alias) = normalize_role_key(p->>'name') limit 1; end if;
        if pos_id is null then pos_id := 6; end if;
        p_slug := left(slugify(p->>'name'), 110) || '-jobs';
        if exists (select 1 from posts px where px.recruitment_id = rec_id and px.slug = p_slug) then p_slug := left(slugify(p->>'name'), 100) || '-' || i || '-jobs'; end if;
        insert into posts (recruitment_id, position_id, name, slug, title, description, vacancy_total, vacancy_details, salary_min, salary_max, pay_level,
          "organizationId", "organizationName", "recruitmentId", "recruitmentName", "recruitmentSlug", "isLive", "postedAt",
          "officialSourceUrl", "applyPortalUrl", application_url, application_method, application_email,
          location_state, location_city, location_country, employment_type, posting_status, key_dates,
          "sourceName", "isOfficialSource", is_official_source, decomposition_source, decomposition_from_id, role_index, total_roles,  -- decomposition_from_id references a parent *post*; hub link is recruitment_id
          created_at, updated_at, "createdAt", "updatedAt")
        values (rec_id, pos_id, p->>'name', p_slug, p->>'name',
          o.name || ' is recruiting for the post of ' || (p->>'name') || '.' ||
            case when (p->>'vacancy_total') is not null then ' ' || (p->>'vacancy_total') || ' vacanc' || case when (p->>'vacancy_total')::int = 1 then 'y' else 'ies' end || '.' else '' end ||
            case when p->>'qualification_text' is not null then ' Qualification: ' || (p->>'qualification_text') || '.' else '' end ||
            case when p->>'pay_scale_text' is not null then ' Pay: ' || (p->>'pay_scale_text') || '.' else '' end ||
            case when h->>'application_end_date' is not null then ' Last date to apply: ' || to_char((h->>'application_end_date')::date, 'DD Mon YYYY') || '.' else '' end,
          (p->>'vacancy_total')::int, case when p->>'vacancy_details' is not null then jsonb_build_object('text', p->>'vacancy_details') end,
          (p->>'salary_min')::int, (p->>'salary_max')::int, case when p->>'pay_scale_text' is not null then jsonb_build_object('text', p->>'pay_scale_text') end,
          org.org_id, o.name, rec_id, rec_name, rec_slug, is_live, coalesce(notif_d, now()),
          h->>'official_url', h->>'apply_url', h->>'apply_url', h->>'apply_mode', h->>'application_email',
          h->>'state_name', h->>'location_city', 'India', coalesce(p->>'employment_type', h->>'employment_type'),
          case when is_live then 'ACTIVE' else 'closed' end,
          jsonb_strip_nulls(jsonb_build_object('notificationDate', h->>'notification_date', 'applicationOpenDate', h->>'application_start_date',
            'applicationCloseDate', h->>'application_end_date', 'examOrInterviewDate', h->>'exam_or_interview_date')),
          'official_notification', true, true, p_batch, null, i, jsonb_array_length(s.posts),
          now(), now(), now(), now())
        returning id into pid;
        pids := pids || pid;
        insert into post_enrichments (post_id, "vacanciesTotal", "vacanciesByCategory", "feeNote", "ageNote", "payScale", "salaryMin", "salaryMax",
          "selectionProcess", "notificationDate", "applicationOpenDate", "applicationClosingDate", "examDate", "education", "experience",
          "sourceVerificationStatus", "sourceVerificationDate", "extractionConfidence", created_at, updated_at)
        values (pid, (p->>'vacancy_total')::int, case when p->>'vacancy_details' is not null then jsonb_build_object('text', p->>'vacancy_details') end,
          h->>'fee_note', coalesce(case when p->>'age_min' is not null or p->>'age_max' is not null then concat_ws(' – ', p->>'age_min', p->>'age_max') || ' years' end, h->>'age_note'),
          p->>'pay_scale_text', (p->>'salary_min')::int, (p->>'salary_max')::int,
          case when h->>'selection_process' is not null then jsonb_build_object('text', h->>'selection_process') end,
          notif_d, start_d, end_d, case when h->>'exam_or_interview_date' is not null then (h->>'exam_or_interview_date')::date::timestamp at time zone 'Asia/Kolkata' end,
          case when p->>'qualification_text' is not null then jsonb_build_object('text', p->>'qualification_text') end,
          case when p->>'experience_text' is not null then jsonb_build_object('text', p->>'experience_text') end,
          case when h->>'posts_source' = 'document' then 'VERIFIED' else 'UNVERIFIED' end, now(), case when h->>'posts_source' = 'document' then 85 else 40 end, now(), now());
      end loop;
      update official_digest_promote set status='PROMOTED', organization_id = org.org_id, recruitment_id = rec_id, post_ids = pids, org_match_method = org.method, promoted_at = now() where id = s.id;
      rownum := s.rownum; status := 'PROMOTED'; recruitment_id := rec_id; n_posts := i; org_method := org.method; note := rec_slug; return next;
    exception when others then
      rownum := s.rownum; status := 'ERROR'; recruitment_id := null; n_posts := 0; org_method := null; note := sqlerrm; return next;
    end;
    done := done + 1; exit when done >= p_limit;
  end loop;
end $$;

-- Operator helpers -----------------------------------------------------------
create or replace function public.official_digest_undo(p_batch text, p_rows int[] default null) returns text language plpgsql security definer set search_path=public as $$
declare a int; b int; c int; orgs int[];
begin
  select array_agg(organization_id) into orgs from official_digest_promote where batch=p_batch and status='PROMOTED' and org_match_method='created' and (p_rows is null or rownum = any(p_rows));
  with r as (select recruitment_id from official_digest_promote where batch=p_batch and status='PROMOTED' and (p_rows is null or rownum = any(p_rows))),
   e as (delete from post_enrichments where post_id in (select id from posts where recruitment_id in (select recruitment_id from r)) returning 1) select count(*) into a from e;
  with r as (select recruitment_id from official_digest_promote where batch=p_batch and status='PROMOTED' and (p_rows is null or rownum = any(p_rows))),
   e as (delete from posts where recruitment_id in (select recruitment_id from r) returning 1) select count(*) into b from e;
  with r as (select recruitment_id from official_digest_promote where batch=p_batch and status='PROMOTED' and (p_rows is null or rownum = any(p_rows))),
   e as (delete from recruitments where id in (select recruitment_id from r) returning 1) select count(*) into c from e;
  update official_digest_promote set status='PENDING', recruitment_id=null, post_ids=null, organization_id=null, org_match_method=null, promoted_at=null, skip_reason=null
   where batch=p_batch and status in ('PROMOTED','SKIPPED') and (p_rows is null or rownum = any(p_rows));
  return format('enrich=%s posts=%s recs=%s created_orgs_to_review=%s', a, b, c, array_to_string(orgs, ','));
end $$;

create or replace function public.official_digest_merge_org(p_dup int, p_keep int) returns text language plpgsql security definer set search_path=public as $$
declare n int;
begin
  update organization_mapping set canonical_org_id = p_keep where canonical_org_id = p_dup;
  update organization_aliases a set organization_id = p_keep where organization_id = p_dup and not exists (select 1 from organization_aliases b where b.organization_id = p_keep and b.alias_normalized = a.alias_normalized);
  update recruitments set organization_id = p_keep where organization_id = p_dup;
  update posts set "organizationId" = p_keep, "organizationName" = (select name from organizations where id = p_keep) where "organizationId" = p_dup;
  with e as (delete from organization_aliases where organization_id = p_dup returning 1) select count(*) into n from e;
  with e as (delete from organizations o where o.id = p_dup and not exists (select 1 from postings where organization_id = p_dup) returning 1) select count(*) into n from e;
  return 'merged '||p_dup||' into '||p_keep||' (org rows removed: '||n||')';
end $$;
