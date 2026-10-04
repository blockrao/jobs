# WP-001 part 2 — is the platform ready for the data? (bounded readiness check)

Status: 2026-10-04. Analysis only; nothing changed. Method: read the write path,
public queries, sitemap and cron code in `main`, and read-only queries of the
`jobs` project. Scope is only what the ~800-notice load touches. Not an audit.

## Scorecard

| Area | Verdict |
| --- | --- |
| Identity / idempotency (`source`, `external_id` unique index) | READY |
| Provenance tables (`sources`, `source_documents`) | READY, but keep prose, no versioned observations: needs `source_observations` |
| Organization write path | NOT READY (known; WP-001 fixes) |
| Publication gate | **NOT READY: the write path can publish by itself (finding R1)** |
| Update of existing rows | **NOT READY: overwrites everything (R2)** |
| Posts / vacancies / employing organization | **NOT READY for the mockup, and ARC-001 test (R3)** |
| Recruitment dates | UNVERIFIED (R4) |
| Public listing at 800+ rows | PARTLY (R5) |
| Indexes, sitemap capacity | READY at this size (observed indexes; sitemap cap 45,000) |
| Lifecycle cron | UNVERIFIED (R6) |
| Loader from the collected file | NOT BUILT (R7) |

## Findings

**R1 — Public visibility is decided by `review_status` alone, and the ingest sets it.**
The job page, `/jobs` listing, organization pages and sitemap (`src/lib/queries.ts`)
filter on `review_status = 'APPROVED'` only. The write path sets it with
`reviewStatusForConfidence` (APPROVED when confidence >= 70, `AUTO_APPROVE_THRESHOLD`).
`publishing_status` is gated only in search (`search-queries.ts`) and
`publishing-queries.ts`, which the pages do not use. So today a loaded row with
confidence >= 70 would go live on the listing and job page regardless of the
pilot's conservative publication rule. (observed in code) Fix: the load sets
`review_status = PENDING` and promotion is an explicit rule-based step; public
queries gate on one agreed condition. Existing rows: 54 APPROVED, 144 PENDING,
3 REJECTED. (observed)

**R2 — The update branch overwrites.** For an existing (`source`, `external_id`)
the code sets every shared field and `review_status` again. A reviewed row
could lose curated values, and a REJECTED row could return to APPROVED.
Contradicts "fill missing, never overwrite reviewed". (observed in code) Fix
belongs in WP-001 step 3.

**R3 — Posts, vacancies and employing organization have no home.**
`posts` has no employing-organization column; `vacancies` has 0 rows; `posts`
has 4 rows; the write path creates one post from the first post name only. The
public pages read the flat `postings` table, not recruitments/posts (READ-001 is
deferred). So the collected multi-post notices (13 subjects, 9 posts for SAGES)
can be stored as `post_names` and `total_vacancies` only, and the recruitment +
post mockup cannot be rendered from the real tables. (observed) Consequence for
the architect's pilot test: issuing organization has a column (`recruitments.organization_id`);
employing organization does not. The pilot can record it in the observation and
show the gap, and a concrete need goes through ARC-001 change control.

**R4 — Recruitment dates.** The `recruitments` table has start, end, exam and
result dates, but the write path passes none to `resolveRecruitment` in the part I
read; `postings.valid_through` is the only application date set. Application
start date has no `postings` column. (observed schema; to confirm in the dry run)

**R5 — Listing scale.** `/jobs` fetches `limit: 50` in the code read; I did not
see pagination. With ~450 to 800 approved rows, most would be unreachable from
the listing, only from search, organization pages and the sitemap (Tier A).
(inferred; confirm in dry run on a preview)

**R6 — Lifecycle.** The daily cron calls `refresh_recruitment_lifecycle()`.
It was not run or tested here. A-041 (`refresh_posting_urgency_states` reads a
missing table) is open. Search also requires `is_expired = FALSE`; defaults for
new rows were not confirmed. (unknown)

**R7 — No loader for the collected data.** The adapters scrape live pages; the
pull is a file (`fja_listings.jsonl`, 980 records). A file-based adapter that
emits the labelled fields (Company Name, Advt No, post tables, link table) is
needed for the dry run and is part of step 3.

## What this changes in WP-001

Add to the existing steps, no new increment: (a) load sets `review_status = PENDING`
and a separate promotion rule decides visibility (R1); (b) update branch is fill-only
with reviewed-value protection and field comparison (R2, matches architect
section 6-7); (c) file adapter (R7); (d) dry run reports R4, R5, R6 as measured
outcomes; (e) record R3 as the pilot's ARC-001 evidence. Tests added: a loaded row is
not publicly visible before promotion; a reviewed/REJECTED row is unchanged by re-ingest.

Not doing here: rebuilding the public pages on recruitments/posts (READ-001), adding
columns for posts or employing organization (until the pilot shows the contradiction).
