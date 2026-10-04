# WP-001 readiness gate: result of the local dry run

Status: 2026-10-04. Local only. Nothing applied to production, nothing loaded,
nothing pushed. Responds to "WP-001 Readiness Gate: Direction".

## Scorecard

| Item | Result |
| --- | --- |
| Blocking requirements (publication gate, re-ingestion protection) | both PASS, covered by contract tests |
| Platform readiness areas | 8 PASS, 2 PARTIAL, 4 FAIL (see below) |
| Contract suite | 150 tests: 120 pass, 28 skipped, 2 fail (the known ENT-07, IDX-06) |
| Production touched | no |
| Backup gate | NOT RUN (owner action); production load stays blocked |

## How it was run

`fja_listings.jsonl` (980 records, 950 recruitment notices) went through the
real path (`file adapter -> dedupe -> normalize -> writePostingsToDB`) into a
scratch Postgres built from `schema.ts`, the new migration and the live-only
columns. Two runs, because the scratch database has no real organizations:

- **Run A, seed slice (honest outcome):** 44 existing organizations only.
- **Run B, simulated aliases (ceiling):** 711 aliases invented in scratch for
  the candidate names, to see what the rest of the platform does once
  organizations resolve. This is NOT an outcome, it is an upper bound.

Evidence: `evidence/wp001-dry-run-seed-slice.json`, `evidence/wp001-dry-run-simulated-aliases.json`.
The real 125 organizations and the 68 existing freejobalert postings were not
available (no restore yet), so reviewed-data protection on real rows is untested.

## Platform readiness

| Area | Verdict | Evidence |
| --- | --- | --- |
| Ingestion safety | PASS | Every new row is PENDING/DRAFT. Per-record errors recorded, not fatal. No canonical row is created from a scraped string. |
| Duplicate prevention | PASS (re-ingest), PARTIAL (cross-notice) | Second run: 0 inserted, 898 unchanged, counts identical. Cross-notice duplicates are not merged: 5 org+advertisement-number groups (10 notices), 38 same-title groups (82 notices). Not a loading blocker; a later reconciliation item. |
| Organization resolution | PASS (mechanism), yield LOW | Alias, then existing clean org, else candidate. Seed slice resolves 15 of 950. Legacy path would have created 884 org rows, 189 of them bad names (147 title-like, 29 bucket, 13 ambiguous abbreviations). |
| Candidate handling | PASS | 700 distinct candidate names, 0 canonical organizations created. Top 25 names cover 111 notices, top 100 cover 274. |
| Publication gate | PASS | 0 published by ingestion in both runs. Test: a high-confidence record is not publicly visible. Promotion is a separate rule step. |
| Reviewed-data protection | PASS (synthetic tests) | Reviewed row unchanged after re-ingest, rejected not resurrected, changed material field flagged. Not yet run against the real 68 rows. |
| Dates | PARTIAL | Last date 756 of 950; start date 145 (and not persisted); `recruitments` dates 0 of 898. |
| Lifecycle | PASS (postings), FAIL (recruitments) | After fix, expired postings leave the listing (465 expired after 60-day time travel, 1 visible). `recruitments` are never archived and have no end date. Loading does not create wrong public states for postings. |
| Public listing | FAIL (limitation) | `/jobs` shows 50 rows with no pagination; 466 would be publishable. Org, exam and commission lists still ignore `is_expired`. |
| Sitemap / indexability | PARTIAL | Gate works. Yield is 2 Tier A of 466 publishable because location is missing for 762 of 898. Tier B (public, noindex) is 861. |
| Source / provenance | PASS | 919 observations; 681 notices carry an official-style notification link; aggregator links are dropped. |
| Posts | FAIL | Source tables hold 1,698 posts; 686 post rows created, one per notice. MECON: 59 posts in the table, 1 stored. |
| Vacancies | FAIL | 864 notices state vacancies, 725 have a post table, 0 vacancy rows are written. 13 tables disagree with the stated total, 146 have a total but no table. Per-post vacancies are lost. |
| Organization roles | FAIL (implementation gap; ARC-001 holds) | No column for the employing organization. Issuing organization is carried; employing organization stays in the observation only (UPSC, Kerala PSC, RRC cases). |

## Data outcome (950 notices)

950 recruitment notices (30 other records excluded as results, admit cards,
etc.). 919 remain after in-batch dedupe.

| | Seed slice (honest) | Simulated aliases (ceiling) |
| --- | --- | --- |
| Successfully represented (posting + recruitment, PENDING) | 15 | 898 |
| Pending | 15 | 898 |
| Publishable under the conservative promotion rule | 6 | 466 |
| Rejected (no organization name) | 20 | 20 |
| Unresolved (held as organization candidates) | 884 notices, 700 names | 1 |

Why 432 of 898 are not promotable (a notice can fail several): no last date
185, link not on the issuer's domain 191, no vacancy count 81, no official
link 62, post-count mismatch 12, last date passed 4.

**Information lost on load today:**
- posts beyond the first, per-post vacancies (1,012 of 1,698 posts)
- advertisement number (560 notices; `recruitments.official_notification_number` exists, unwired)
- application start date (145 notices)
- employing organization, fees (not parsed)

**Requiring enrichment:** location (762 of 898), an issuer-domain official link for about 250 notices,
last date for 194, eligibility 177, extracted job title 206.

**Requiring structural support:** (1) posts and per-post vacancies as rows,
(2) employing organization on a post, (3) application start date, (4)
recruitment dates and archival, (5) `/jobs` pagination.

## What this says about the next increment

The loading path is safe. The data does not yet fit the model. In evidence order:

1. **Organization alias seed list.** Biggest blocker: without it, 884 of 950 notices stay candidates. The top 100 names cover 274 notices. Needs owner review, not a survey.
2. **Posts and vacancies written as rows** from the post table (the data exists, the write path discards it). Probably no new table; `posts` and `vacancies` already exist. Employing organization is the only concept that needs a schema decision, through ARC-001 change control.
3. **Wire existing columns:** advertisement number, application start and end date into `recruitments`; archive recruitments in the lifecycle function.
4. **`/jobs` pagination** and `is_expired` on the remaining lists.
5. **Location enrichment** only if indexing yield matters before the pilot.

None of these is designed here. Each needs its own pre-change report and approval.

## Gates still closed before any production load

- Backup dump, scratch restore, count and checksum comparison (owner action, `WP001_BACKUP_GATE.md`).
- Dry run at full fidelity on the restored copy (real organizations, 68 existing postings).
- Owner and architect review of this result.
- Migration `20261004060000_wp_001_observation_candidate_boundary.sql` is local; applying it is a separate approved step.

## Single readiness report for the deployment decision (architect, 2026-10-04)

G1/G3, the multi-post rule and the SEO representation logic are approved; the
SEO architecture is frozen in principle, subject to verification during the
data deployment. Do not weaken the JobPosting gate to raise the number.
Order: organization resolution (alias seed) → Post/Vacancy model →
description and location enrichment → re-measure JobPosting eligibility.

| Question | Status |
| --- | --- |
| Can the current production DB be restored? | NOT RUN (owner: `WP001_BACKUP_GATE.md`) |
| New ingestion leaves data non-public until promotion? | PASS (scratch; contract test) |
| Re-ingestion preserves reviewed data? | PASS on synthetic tests; real 68 rows untested until a restore exists |
| Organization resolution avoids dirty canonical orgs? | PASS (0 canonical created; 700 candidate names held) |
| A single-post job can become a JobPosting? | PASS (SD-09i unit test); 0 corpus pages yet, by data |
| Multi-post notices stay non-JobPosting until Posts exist? | PASS (SD-09g; 153 of 466 public pages in the corpus) |
| Sitemap and indexing respect eligibility / indexability? | PASS after the approved fix: the sitemap query now also excludes `is_expired` (tests WP1-13, WP1-S6) |
| Share of the new corpus eligible after enrichment | MEASURED 0 of 466 today; re-measure after resolution, Posts/Vacancies, description and location work |

Open point to settle with the deployment: expired Tier A pages can stay in the
sitemap until their tier changes. Fix is one filter in the sitemap query plus a
contract test; needs the architect's approval like any change.

## Backup / restore gate: status as of 2026-10-04 11:27 IST

| Item | Status |
| --- | --- |
| Backup (pg_dump) | NOT RUN: owner action, no terminal output yet |
| Restore verification | NOT RUN: awaiting the scratch-restore output of `WP001_BACKUP_VERIFY.sql` |
| Supabase Backups status | NOT CHECKED: owner to read Dashboard > Database > Backups; not inferred |
| Production unchanged | CONFIRMED (read-only connector, 11:26 IST): organizations 125, postings 201, recruitments 183, source_documents 208, sources 10, all five md5 checksums identical to the baseline in `WP001_BACKUP_GATE.md`; the three WP-001 tables do not exist in production |
| Overall readiness | **NO-GO: do not push.** Seven local commits held for one controlled deployment |

The workspace cannot reach the database or run pg_dump; the dump, the restore
and the dashboard check are the owner's. This section is completed when that
evidence arrives.
