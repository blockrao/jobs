# Gate 2 analysis — evidence register

Measured 2026-10-03, about 10:10 UTC, against Supabase project
`cusxodjgkrttwmdmhvso` and the repository at branch
`arch/phase0-w1a-contract-tests`. Read-only. This file records the facts
behind change G2-001; the reasoning and recommendations are in the Gate 2
implementation report. Labels: F = fact (measured), I = inference.

## Security

| # | Evidence | Label |
| --- | --- | --- |
| S1 | `anon` and `authenticated` hold SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER on all 20 tables and 6 views | F |
| S2 | RLS off on 12 tables: recruitments, posts, positions, vacancies, eligibilities, selection_processes, exams, commissions, locations, qualifications, sources, source_documents | F |
| S3 | RLS on, zero policies, on 8 tables: postings, organizations, articles, categories, posting_updates, posting_categories, posting_articles, article_categories | F |
| S4 | `anon` has USAGE on schema `public` and on the id sequences of recruitments, posts, positions, exams, sources, source_documents | F |
| S5 | `EXPLAIN INSERT INTO recruitments …` executed as role `anon` returned a plan (no permission error); transaction rolled back; nothing written | F |
| S6 | `anon` has EXECUTE on all 9 public functions, including `refresh_recruitment_lifecycle()` | F |
| S7 | All 6 views are SECURITY DEFINER, selectable by `anon`, none updatable | F |
| S8 | Tables are owned by `postgres`; `relforcerowsecurity` is false everywhere; the app connects with `DATABASE_URL` | F |
| S9 | No Supabase client, publishable key or service-role key is referenced in `src/`; env names used: DATABASE_URL, ANTHROPIC_API_KEY, CRON_SECRET, ADMIN_PASSWORD, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_GA4_MEASUREMENT_ID, DRY_RUN, INGEST_OUT | F |
| S10 | `src/pages/api/ingest.ts` passes its check when both the header and `CRON_SECRET` are undefined | F |
| S11 | `src/app/api/cron/update-recruitment-lifecycle/route.ts` uses the literal `placeholder` when `CRON_SECRET` is unset | F |
| S12 | No function in `src/app/admin/actions.ts` other than login checks authorization | F |
| S13 | The Supabase REST endpoint could not be reached from this environment; no HTTP request was made to it | F |
| S14 | A request carrying only the publishable key can mutate the 12 tables in S2 | I (from S1–S5) |

## Migrations

| # | Evidence | Label |
| --- | --- | --- |
| M1 | 9 applied migrations, versions 20260930142925 … 20261001090748; `0001_add_hindi_content` applied twice with identical content | F |
| M2 | No applied migration contains CREATE TABLE for recruitments, posts, positions, vacancies, sources, source_documents, commissions, exams, selection_processes | F |
| M3 | Absent live though created by repository files: canonical_pages, recruitment_events, eligibility_alternatives, ingest_metrics, organizations_new, exams_new, active_postings, editorial_dashboard | F |
| M4 | Applied vs same-named repository file sizes: phase4e 5,173 vs 9,473; phase4f 10,158 vs 10,159; 0001_add_hindi_content 2,283 vs 2,549 | F |
| M5 | `drizzle.__drizzle_migrations` does not exist | F |

## Organizations (125 rows, 201 postings)

| # | Evidence | Label |
| --- | --- | --- |
| O1 | 6 bucket organizations (ids 10, 76, 37, 117, 86, 13) hold 54 postings | F |
| O2 | 44 organizations are named after a posting title (body plus post, count or form), one posting each | F (manual reading of all names) |
| O3 | Organizations 17, 16, 14, 45, 75, 41 hold 24 postings, about 10 of which belong to a different body | F for the 24; manual reading for the 10 |
| O4 | Duplicate groups: SSC (3, 16, 140), RRB (14, 141, 154, 155), RBI (30, 153), Bank of Baroda (144, 621), ITBP (146, 164), UP Police board (171, 181, 619) | F |
| O5 | Sector: GOVERNMENT_CENTRAL 91, GOVERNMENT_STATE 11, BANKING 9, DEFENCE 8, RAILWAY 4, PSU 1, PRIVATE 1 | F |
| O6 | Bucket postings: 50 REVIEW_REQUIRED, 4 UNRESOLVED, 0 AUTO_RESOLVED | F for the listing; class assignment is a judgement |

## Recruitments (183 rows)

| # | Evidence | Label |
| --- | --- | --- |
| R1 | By title pattern: 126 genuine, 48 lifecycle notices, 5 admission/scholarship, 4 qualifying tests | F |
| R2 | All 47 status/stage contradictions fall in the notice (43) and qualifying-test (4) classes | F |
| R3 | `recruitments.year`: 2026 ×163, 2023 ×17, 2025 ×3; 7 rows have a different year in the name | F |
| R4 | Notification numbers: 4 rows, all `12/2026`, under 4 different organizations | F |
| R5 | Review status of the 126: 20 APPROVED, 106 PENDING | F |

## Posts and source text

| # | Evidence | Label |
| --- | --- | --- |
| P1 | 5 postings have `post_names` (7 names), all source `manual`; 4 `posts` rows | F |
| P2 | Source text: 194 documents, length 77 / 292 / 1,139 chars (min / median / max); none contains "Post Name" or an HTML table | F |
| P3 | 74 posting titles carry a role hint | F |
| P4 | Official-site hint in source text: freejobalert 26 of 68, sarkariresult 1 of 50, others 0 | F |

## Lifecycle

| # | Evidence | Label |
| --- | --- | --- |
| L1 | Stage × deadline for linked rows: open stage with future deadline 18; open stage with past deadline 44; open stage with no deadline 74 | F |
| L2 | Dates on recruitments: start/end/notification on 4 rows; exam date on 0 | F |
| L3 | `postings.valid_through` set on 94, past on 72, none of the 72 marked expired | F |

## Cron and sitemap

| # | Evidence | Label |
| --- | --- | --- |
| C1 | Postings created (UTC hour): 09-30 14h ×1, 17h ×3; 10-01 01h ×1, 02h ×3, 04h ×184, 10h ×5; 10-02 09h ×4 | F |
| C2 | No recruitment is ARCHIVED; `status_last_calculated` null on all rows; 0 rows meet the archive condition | F |
| C3 | The single expired posting has `expired_at` 2026-10-01 06:19 UTC; migration `phase4e_lifecycle_automation` is version 20261001061959 | F |
| C4 | Lifecycle route exports only POST; ingest handler accepts any method; ingest defaults to dry-run unless `DRY_RUN=false` | F |
| C5 | `/sitemap.xml` is listed as static with no revalidation in `next build` output | F |
| C6 | Vercel logs, Vercel environment variables and the live sitemap were not inspected | F |
