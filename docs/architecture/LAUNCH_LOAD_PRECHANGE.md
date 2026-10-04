# Launch load: pre-change report (PRE-CHANGE, awaiting approval)

Date: 2026-10-04. Nothing in this report is applied. Basis: WP001_READINESS_RESULT.md
(dry run of 950 notices), the official-source pilot, A1 Post/Vacancy deployment, owner
decisions of 2026-10-04 (backup gate waived, A-069; alias seed by coverage; launch priority).

## Scorecard

| Item | Status |
| --- | --- |
| Goal | Put the larger dataset on the site with correct canonical structure and interlinking |
| Production writes in this report | NONE (proposal only) |
| Backup gate | Waived by owner (A-069); replaced by compensating controls below |
| Alias seed | Review sheet delivered (494 bodies); owner review pending |
| Existing 68 postings, 125 organizations, 4 Posts | Must be unchanged except approved fill rules |
| Expected result | about 466 pages published (rehearsal figure), about 430 held, 20 rejected |

## Increments in this release (all additive)

1. **Identity wiring (code, tests):** `write-postings-v2.ts:386` stops passing
   `officialNotificationNumber: null`; the advertisement number the source states
   (560 of 950 notices) becomes the strong recruitment key (the unique index and
   `resolveRecruitment` already exist). Duplicates of one notice across sources then
   collapse to one recruitment. A later deadline from a source refreshes `valid_through`
   (fill/refresh rule, never shortens).
2. **Alias seed (data):** reviewed organizations and aliases from the owner's sheet.
   Unmatched names still create nothing and stay as candidates.
3. **Application start date and recruitment dates wired** into `recruitments`
   (columns exist, currently unwritten).
4. **`/jobs` pagination** and `is_expired`/date guard on the remaining listing surfaces
   (exam, commission, organization, category pages), so more data does not break the
   listing or show stale pages.
5. **Search fix (A-068),** so search works with the larger data.
6. **The load:** about 898 notices as PENDING; promotion publishes only what passes the
   conservative rule.

Not in this release: employing-organization schema, lifecycle events model, Hindi gaps,
enrichment, cron (a launch follow-up, section "After the load").

## Load mechanism: decision needed

The loader (`load-file.ts`) refuses any non-scratch database, and the agent workspace
cannot reach production from a shell; production access is the connector only.

| Option | How | Trade-off |
| --- | --- | --- |
| A (recommended) | Run the real ingestion on the scratch database against a copy of the 125 organizations and 68 postings plus the approved seed, then export the **result rows** as SQL keyed by natural keys (slug, organization name) and apply through the connector in chunks, with a manifest of every inserted key | Agent-driven, no owner time. Row ids differ from scratch, so SQL must use natural keys; verified by comparing counts and hashes after |
| B | Owner runs the loader on his Mac against production with a production guard | Uses the real code path; costs owner time and a local database URL |

Recommend A, with B as the fallback if a chunk fails verification.

## Compensating controls (replace the waived backup test)

- **Manifest:** every inserted key (organization, alias, recruitment, post, posting,
  observation, candidate) is recorded in a manifest file committed to the repository
  (no secrets).
- **Before/after hashes:** per-table aggregate hash of pre-existing rows (ids from the
  current production state) taken immediately before and after; must be equal except
  approved fill rules.
- **Rollback script by manifest,** tested on scratch (insert the batch, roll it back,
  confirm the hash equals the pre-load hash) before any production chunk.
- **Order and chunking:** organizations and aliases, then recruitments, posts, postings
  (PENDING), observations, candidates. Counts verified after each chunk. Stop at the
  first mismatch.
- **Promotion is a separate approved step,** after the PENDING load is verified; it
  publishes only the notices that pass the rule (issuer-domain official link, vacancy
  count, last date, post-count consistency). Rule unchanged; JobPosting gate unchanged.

## Verification after promotion (read-only)

- Counts and hashes against the manifest.
- Canonical structure: each published posting has one organization, one recruitment;
  no duplicate recruitment for one advertisement number; canonical URLs and sitemap
  limited to Tier A, not expired.
- Interlinking: organization, exam, commission and category pages list the new postings
  and show no expired ones; `/jobs` paginates; search returns results.
- Spot check 10 published pages against their official sources (browser, same method as
  the pilot).

## Risks

| Risk | Mitigation |
| --- | --- |
| Row-id mismatch between scratch and production | Natural-key SQL, verified counts and hashes, stop on mismatch |
| Aggregator facts wrong on some notices | Promotion rule needs an issuer-domain official link; spot check; pages stay editable through the review queue |
| Seed mistakes (wrong canonical name) | Owner review before apply; aliases are additive and removable by manifest |
| About 100 existing review-queue postings and arriving notices | Existing rows untouched; arriving notices follow the same rules |
| Without a restore test, a bad load is undone only by the manifest rollback | Rollback tested on scratch first; daily backups by owner |

## After the load (launch follow-ups, not part of this approval)

Scheduled ingestion and lifecycle (A-032, A-044), description and location enrichment,
re-measure JobPosting eligibility.

## Approvals requested

1. Items 1 to 6 as scoped, with the code changes (1, 3, 4, 5) implemented and tested
   locally first and pushed in **one** deployment.
2. Load mechanism A (fallback B).
3. The seed review sheet decisions, once marked.
4. Promotion as a separate step after verification of the PENDING load.
