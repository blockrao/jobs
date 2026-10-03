# Phase 0 baseline — architecture and live schema

Taken 2026-10-03 against git `704725eaf79593d1c6a2d89d3d8ee06bd21992df`
(`main`) and Supabase project `cusxodjgkrttwmdmhvso` (Postgres 17). Every
number below came from a read-only `SELECT` against the live database or
from the repository at that commit. Nothing was modified to produce it.

This file is a point-in-time record. Do not edit the numbers; later waves
record their own before/after metrics in `docs/ARCHITECTURE_CHANGELOG.md`.

## 1. Live schema snapshot

20 tables, 6 views, 9 functions, 1 trigger in `public`.

| Table | Rows | Cols | RLS |
| --- | --- | --- | --- |
| organizations | 125 | 13 | on (no policy) |
| commissions | 10 | 8 | **off** |
| exams | 68 | 12 | **off** |
| recruitments | 183 | 26 | **off** |
| posts | 4 | 12 | **off** |
| positions | 4 | 13 | **off** |
| vacancies | 0 | 7 | **off** |
| eligibilities | 0 | 15 | **off** |
| selection_processes | 0 | 6 | **off** |
| qualifications | 5 | 6 | **off** |
| locations | 37 | 8 | **off** |
| sources | 10 | 7 | **off** |
| source_documents | 208 | 11 | **off** |
| postings | 201 | 81 | on (no policy) |
| posting_updates | 196 | 10 | on (no policy) |
| posting_categories / posting_articles | — | 2 / 3 | on (no policy) |
| articles | 3 | 15 | on (no policy) |
| categories / article_categories | 7 / — | 7 / 2 | on (no policy) |

Views: `active_postings_display`, `expired_postings`, `urgent_opportunities`,
`closing_this_week`, `newly_announced`, `searchable_postings` (all
`SECURITY DEFINER`).

Functions: `calculate_recruitment_status` (two overloads),
`refresh_recruitment_lifecycle`, `trigger_recruitment_status_changed`,
`refresh_posting_urgency_states`, `calculate_urgency_score`,
`get_announcement_state`, `get_closing_state`, `generate_posting_search_text`.

Trigger: `trg_recruitment_status_changed` (AFTER UPDATE on `recruitments`).

Uniqueness actually enforced live on the canonical layer:

| Table | Unique index |
| --- | --- |
| organizations | `(slug)` |
| exams | `(slug)` |
| recruitments | `(slug)`; `(organization_id, official_notification_number)` where number is not null |
| posts | `(recruitment_id, slug)`; `(recruitment_id, lower(name))` |
| positions | `(slug)` |
| vacancies | `(post_id, location_id, category_type, gender)` |
| sources | `(slug)` |
| source_documents | `(source_id, external_id)` |
| postings | `(slug)`; `(source, external_id)` where external_id is not null |

`recruitment_events` does not exist.

## 2. Migration and schema drift

**Applied history (Supabase `schema_migrations`, 9 entries):**
`init_jobs_schema`, `enable_rls_lockdown_public_api`,
`0001_ingestion_provenance_moderation`, `phase4e_lifecycle_automation`,
`phase4f_search_urgency`, `0001_add_hindi_content` (applied twice),
`content_quality_gate`, `platform_rebuild_canonical_layer`.

**Repository:** 18 SQL files across three directories — `drizzle/` (8),
`migrations/` (5), `src/db/migrations/` (5). Three of the eight distinct
applied names have a same-named repository file (`phase4e_lifecycle_automation`,
`phase4f_search_urgency`, `0001_add_hindi_content`); their contents were not
compared. The other five applied names have no repository file, and fifteen
repository files have no applied record. Drizzle's tracking table
(`drizzle.__drizzle_migrations`) does not exist, so `npm run db:migrate` has
never run against this database. `drizzle/meta` holds snapshots for only
`0000` and `0001`.

**Column drift, live vs `src/db/schema.ts`:** 18 of 20 tables match exactly.
18 columns exist live and are undeclared in the application schema:

- `postings` (10): `official_application_url`, `source_type`, `is_expired`,
  `expiration_reason`, `expired_at`, `search_text`, `announcement_state`,
  `closing_state`, `urgency_score`, `days_to_closing`
- `recruitments` (8): `calculated_status`, `status_last_calculated`,
  `days_to_closing`, `source_url`, `official_notification_url`,
  `official_application_url`, `verification_status`, `last_verified_at`

No column is declared in `schema.ts` and missing live.

**Index drift:** unique indexes on `sources(slug)`,
`source_documents(source_id, external_id)`, `positions(slug)`,
`posts(recruitment_id, slug)` and `vacancies(…)` exist live and are
undeclared in `schema.ts`.

**Object drift:** all 6 views, 9 functions and the trigger exist only as raw
SQL; none is represented in the application schema.

## 3. Entity relationship counts

| Relationship | Count |
| --- | --- |
| postings | 201 |
| postings → recruitment (`inferred_recruitment_id`) | 183 (91%) |
| postings → post (`inferred_post_id`) | 4 (2%) |
| postings → position (via post) | 4 (2%) |
| postings → exam | 16 (8%) |
| postings → source_document | 189 (94%) |
| recruitments | 183 |
| recruitments with no exam (direct recruitment) | 168 |
| recruitments with zero posts | 179 |
| recruitments backed by more than one posting | **0** |
| posting↔post↔recruitment mismatches | 0 |
| posting↔recruitment organization mismatches | 0 |
| postings with any extracted `post_names` | 5 (7 names in total) |

## 4. Identity and duplicate metrics

| Metric | Value |
| --- | --- |
| recruitments with `official_notification_number` | 4 of 183 (2.2%) |
| recruitments sharing an organization + year (candidate pool) | 76 rows in 15 groups |
| recruitments with an identical normalized name in one organization | 1 group (ids 155, 156) |
| recruitments whose name describes an event, not a recruitment | 56 of 183 |
| organizations with an identical normalized name | 1 group |
| organizations differing only by a parenthetical abbreviation | 4 groups |
| organizations that are prefix-variants of another | 14 pairs |
| postings filed under catch-all "bucket" organizations | 54 of 201 |
| organizations with zero postings | 2 |
| positions with a duplicate name | 0 |

Examples, one per exception class:

- **Same body, several Organization rows:** `ssc`,
  `staff-selection-commission`, `staff-selection-commission-ssc`. Also four
  Railway Recruitment Board variants, three UP Police variants, and pairs for
  RBI, Bank of Baroda and ITBP.
- **Bucket that is not an organization:** `uttar-pradesh-state-recruitment`
  (18 postings: UPSSSC, UP Police, UPESSC, Anganwadi and a scholarship),
  `educational-institution` (15: IIT Madras, IIIT Bhopal, a Kendriya
  Vidyalaya…), `public-sector-undertaking` (NTPC, SAIL, CPRI),
  `aiims-medical-institute` (includes ESIC Mumbai).
- **One real recruitment, several Recruitment rows:** SSC CGL 2026 appears as
  id 53 ("…Exam City for 12256 Posts") and id 148 ("City Intimation Slip
  2026"); Karnataka Prisons as ids 117 and 199; CPRI as ids 115 and 192.
- **Recruitment row that is a lifecycle event:** "AIIMS NORCET 11 Admit Card
  2026 Out", "KEA VAO Hall Ticket 2026", "AIIMS CRE 5 Seat Allocation 2026".
- **Recruitment row that is not a recruitment:** "UP SCHOLARSHIP 2026-2027",
  "Bihar NEET UG Round 3 Counselling 2026", "IIT Roorkee Ph.D Admission".

## 5. URL and page-type inventory

| Route | Localized | Rendering | Canonical | Robots | In sitemap | JSON-LD |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | cookie | static, 2m | `/` | — | yes | WebSite |
| `/jobs` | cookie | dynamic | `/jobs` or `/jobs?kind=…` | — | yes | — |
| `/jobs/{slug}` | `/hi` | dynamic, 5m | self | tier + Hindi gate | tier A only | JobPosting, Event, FAQ, Breadcrumb |
| `/organizations` | cookie | static, 1h | self | — | no | — |
| `/organizations/{slug}` | `/hi` | dynamic, 1h | self | **none** | yes (all) | Organization, Breadcrumb (local copies) |
| `/exams` | cookie | static, 5m | **none** | — | no | — |
| `/exams/{slug}` | `/hi` | dynamic, 1h | self | **none** | yes (all) | EducationalOccupationalCredential, Breadcrumb (local copies) |
| `/articles` | cookie | static, 5m | self | — | yes | — |
| `/articles/{slug}` | `/hi` | dynamic, 5m | self | Hindi gate | yes | Article, Breadcrumb |
| `/positions`, `/positions/{slug}` | no | static 1h / dynamic | self | — | **no** | — |
| `/recruitments`, `/recruitments/{slug}` | no | static 1h / dynamic | self | — | **no** | — |
| `/categories`, `/categories/{slug}` | no | static 1h / dynamic | self | — | yes | Breadcrumb |
| `/commissions/{slug}` | no | SSG | **none** | — | no | — |
| `/news` | no | static, 5m | **none** | — | no | — |
| `/search` | no | static shell, client results | **none** | **none** | no | — |
| `/{examSlug}` (legacy) | — | SSG | — | — | no | permanent redirect to `/exams/{slug}` |
| `/admin/*` | — | dynamic, auth | — | disallowed | no | — |
| `/api/*` (app router) and `/api/ingest` (`src/pages/api/ingest.ts`) | — | dynamic | — | disallowed | no | — |
| `/sitemap.xml`, `/robots.txt`, `/llms.txt` | — | static / static / dynamic | — | — | — | — |

`/sitemap.xml` is prerendered at build time with no revalidation window, so
it does not change between deployments.

Publicly served job pages: 53 (`review_status = APPROVED`). Indexable and in
the sitemap: 4 (`index_tier = A`).

## 6. SEO invariant test baseline

`npm run test:contracts` at the W1A-001 commit: **100 tests — 61 pass, 15
fail, 24 skipped** (the 14 `db/` and 10 `http/` tests are opt-in).

The 15 failures, each a current defect:

| ID | Defect exposed |
| --- | --- |
| LOC-02 (organization) | untranslated `/hi/organizations/{slug}` is indexable |
| LOC-02 (exam) | untranslated `/hi/exams/{slug}` is indexable |
| LOC-03a (exam) | exam pages emit hreflang with no Hindi version |
| LOC-05 | sitemap lists a Hindi alternate for every exam unconditionally |
| LOC-01 | root layout hardcodes `<html lang="en">` |
| LOC-01b | `html-lang-sync.tsx` repairs `lang` client-side |
| IDX-01 | `/search` is indexable |
| IDX-02a | `/jobs?kind=…` is indexable |
| IDX-02b | `/jobs?q=…` is indexable |
| CAN-01 | `/jobs?kind=…` canonical carries a query string |
| CAN-05 | 16 route files build canonical/hreflang/robots themselves |
| SD-03 | organizations and exams pages define private schema builders |
| SD-04 | the same two pages bypass `jsonLdGraph` |
| ENT-07 | `resolve.ts` and `write-postings-v2.ts` use a slug as entity identity |
| IDX-06 | recruitments and positions have no sitemap source |

`db/` invariants, run through the Supabase connector with the identical SQL
in `tests/contracts/db/invariants.ts`: 10 hold, 3 fail (ENT-08a = 1,
ENT-08b = 4, ENT-08c = 1), and SCH-01 fails with the 18 columns in section 2.

`http/` suite: written, type-checked, **not executed** — this environment
cannot reach the production host or the database from its shell.

## 7. Lifecycle field inventory

| Field | Type | Live values | Written by |
| --- | --- | --- | --- |
| `recruitments.status` | enum `recruitment_status` (UPCOMING, ACTIVE, RESULTS, ARCHIVED) | UPCOMING 179, ACTIVE 4 | insert default; `refresh_recruitment_lifecycle()` sets ARCHIVED |
| `recruitments.calculated_status` | varchar | null in all 183 rows | nothing |
| `postings.current_stage` | enum `posting_stage` (15 values) | NOTIFICATION_OUT 112, APPLICATION_OPEN 39, ADMIT_CARD_RELEASED 22, RESULT_OUT 21, ANSWER_KEY_OUT 3, FINAL_RESULT_OUT 3, EXAM_SCHEDULED 1 | ingest (`inferStage`), admin |
| `postings.status` | enum `posting_status` (ACTIVE, ARCHIVED, INACTIVE) | ACTIVE 201 | default only |
| `postings.is_expired` | boolean | true 1, false 200 | lifecycle function and trigger |
| `postings.closing_state` / `announcement_state` | varchar | set on 5 rows each | `refresh_posting_urgency_states()` |
| `postings.publishing_status` | varchar | DRAFT 123, ARCHIVED 69, AUTOMATED_VALIDATION_PASS 5, PUBLISHED 4 | quality gate |
| `postings.data_completeness_status` | varchar | INCOMPLETE 118, EXPIRED 69, COMPLETE 9, UNKNOWN 5 | quality gate |

`recruitments.status` disagrees with its posting's stage in 47 of 183 linked
rows: recruitments marked UPCOMING whose posting is at ADMIT_CARD_RELEASED
(21), RESULT_OUT (20), FINAL_RESULT_OUT (3), ANSWER_KEY_OUT (2) or
EXAM_SCHEDULED (1). A further 32 are UPCOMING with the posting at
APPLICATION_OPEN.

Both `calculate_recruitment_status()` overloads are unreferenced by any
trigger or function.

`vercel.json` schedules `/api/cron/update-recruitment-lifecycle` daily, but
the route exports only a `POST` handler; Vercel cron issues `GET`. Whether
the job has ever succeeded in production was not verified.

## 8. Source and provenance inventory

| Source | Authority | Documents | Postings |
| --- | --- | --- | --- |
| ssc-official, upsc-official, rrb-official, ibps-official | OFFICIAL | 0 | 0 |
| employment-news | TRUSTED_SECONDARY | 0 | 0 |
| freejobalert | AGGREGATED | 76 | 65 |
| sarkariresult | AGGREGATED | 50 | 42 |
| sarkarinaukri | AGGREGATED | 39 | 39 |
| sahisarkarijobs | AGGREGATED | 26 | 26 |
| indiasarkarinaukri | AGGREGATED | 17 | 17 |

- 208 source documents, all from aggregators. Every one has a URL, an
  external id and a content hash; 14 have no raw content. No duplicate
  hashes.
- No table links a recruitment to a source document. Provenance reaches
  `postings` only.
- `recruitments.official_notification_url` is null in all 183 rows;
  `postings.official_notification_url` is set on 5.
- `postings.verification_status`: UNVERIFIED 192, AUTO_VALIDATED 5,
  MANUALLY_VERIFIED 4. `recruitments.verification_status`: UNVERIFIED 183.
- There is no retrieved-at timestamp distinct from `created_at` /
  `extracted_at`, and no source-priority column.

## 9. Security observations (outside the protocol's scope, recorded for decision)

- Row-level security is disabled on 12 tables in the API-exposed `public`
  schema, including every canonical-layer table, and the `anon` role holds
  INSERT/UPDATE/DELETE on at least `recruitments`, `posts`, `positions`,
  `exams`, `sources` and `source_documents`.
- All six views are `SECURITY DEFINER`.
- All nine functions have a mutable `search_path`.
- The cron route falls back to the literal secret `"placeholder"` when
  `CRON_SECRET` is unset.

Reference: Supabase database linter, lints 0010, 0011 and 0013
(https://supabase.com/docs/guides/database/database-linter).
