# WP-001 — organization write path and first load: PRE-CHANGE report

Status: PRE-CHANGE, 2026-10-04. Analysis only. No code, migration or data
change has been made. Implementation needs the owner's approval of section 8
and the pre-data safety gate (section 6).

## Scorecard

| Item | Result |
| --- | --- |
| Increment | WP-001 (proposed name): organization write-path fix, then a first load from the FreeJobAlert pull |
| Production data changed | None |
| Root cause found | Yes: organization comes from `inferOrg(title)`, a guess from the headline, then `getOrCreateOrganization` creates a row for any string (observed in code) |
| Replacement proposal in HANDOFF still valid? | **Partly. It needs one change** (section 3): an alias table alone leaves about 64% of notices unmatched |
| Evidence base | Pull of 980 FreeJobAlert articles on 3-4 Oct 2026 (950 recruitments), read-only queries of the `jobs` project; graded in section 9 |
| Blocking prerequisite | Tested backup and restore. Backups are **unconfirmed and probably absent** (section 6) |
| New schema | 2 additive tables or columns, one migration, no changes to existing columns |
| Pushes needed | 1 (code and migration together), plus the already local documentation commit |
| Needs owner decision | 4 points (section 8) |

## 1. The problem, with evidence

- `src/db/operations/write-postings-v2.ts` `getOrCreateOrganization(slug, name, ...)`
  returns the existing row for the slug, else inserts one. Nothing validates the
  name. (observed)
- The name arrives from the adapter's `inferOrg(title)` in `src/ingest/adapters/util.ts`,
  which takes the words before the first keyword in the headline, or falls
  back to "Government of India". (observed)
- Result today (read-only, 4 Oct): 125 organizations for 201 postings. Rows
  such as "Uttar Pradesh State Recruitment" (18 postings), "Educational
  Institution" (15), "AIIMS / Medical Institute" (7), "Public Sector
  Undertaking" (5) are buckets; "UPPSC Assistant Town Planner ATP", "ECIL 310
  ITI Trade Apprentices" are post titles stored as organizations; SSC exists
  as three rows (`ssc`, `staff-selection-commission`,
  `staff-selection-commission-ssc`), ITBP as two, RRB as four. (observed)
- The source pages carry a labelled "Company Name" field in the structured
  table. In the pull it is present on 934 of 950 recruitments (98%).
  (observed) The current adapter does not use it for the organization.

So the cheapest real fix is to **use the labelled field, not the headline**,
and to stop creating rows for strings nobody has checked.

## 2. What the pull says about the organization universe

- 934 notices carry an organization string. After light normalization there are
  **670 distinct names**; **539 appear once**. (observed, normalization is
  lower-casing and removing brackets and punctuation only)
- A reviewed alias list covering the top 25 names resolves 151 notices (16%);
  the top 100 resolves 333 (36%); the top 200 resolves 464 (50%). (observed)
- Only 12 notices match a clean existing organization row exactly. (observed)

The universe is a long tail of institutes, districts, boards and hospitals. It
cannot be hand-seeded in advance, and a design that holds everything unmatched
would hold about 64% of notices.

## 3. Proposed change (revised from the HANDOFF proposal)

Three parts, all additive.

**A. Resolve the organization in three steps, in this order**
1. **Alias match.** Normalized name looks up `organization_aliases`. A hit uses
   that organization. No new row.
2. **Clean labelled name.** If there is no alias but the name came from the
   source's labelled "Company Name" field and passes validators (length 4-120
   characters, no digits-and-post patterns such as "310 ITI Trade Apprentices",
   no words from a stop list such as recruitment, vacancy, posts, notification,
   not one of the known bucket names), create the organization with
   `verified = false` and write the alias at the same time. Unverified
   organizations are not indexed and not linked from organization pages until
   reviewed.
3. **Anything else** goes to `ingest_candidates`, not to `postings`. It carries
   the raw payload, source, external id and the reason it failed. Nothing is
   lost and nothing reaches canonical tables (A-064).

Why not "unmatched creates no organization and leaves the posting in review"
as in HANDOFF: `postings.organization_id` is NOT NULL (observed), and a
placeholder "Unresolved" organization is the bucket pattern we are removing.
The candidates table avoids both. Why step 2 exists: with step 1 and 3 only,
about 64% of notices would sit in candidates, which becomes the endless
review queue the owner warned about.

**B. Schema (one migration under `supabase/migrations/`, A-040)**
- `organization_aliases(id, organization_id, alias_normalized unique, source, created_at)`
- `organizations.verified boolean not null default true`. Existing 125 rows
  stay `true` so nothing on the live site changes. New rows from step 2 are
  `false`.
- `ingest_candidates(id, source, external_id, raw jsonb, org_string, reason, status, created_at)`
  with a unique key on (source, external_id).
No existing column is changed or dropped.

**C. Tests (contract suite)**
- an alias variant resolves to the existing organization, no new row;
- a headline-style name ("UPPSC Assistant Town Planner ATP") creates nothing
  in `organizations` and one row in `ingest_candidates`;
- a clean labelled name creates exactly one unverified organization and one alias;
- re-running the same input creates no duplicates.

Not in scope: hierarchy, historical names, merging the existing duplicates, a
review-queue UI. Those wait for the pilot's result (HANDOFF "Deferred").

## 4. First load, after approval and the safety gate

- Source: the 950 recruitments in `govt_jobs_full_list.xlsx` (FreeJobAlert only).
- Dry run first (`DRY_RUN`, `INGEST_OUT`), reviewed by the owner, then a real run.
- **Auto-publish rule proposed:** organization present, last date present,
  vacancies present, notification link on an official-style domain, status
  open or upcoming, and no post-count mismatch. Observed on the pull: 449 of
  799 open or upcoming notices (56%) meet it. The rest load as drafts for review
  (`publishing_status = DRAFT`), not live. Existing review queue: 144 postings
  with `review_status = PENDING`.
- Stored per posting: only facts (names, dates, counts, links), not the
  aggregator's description text. `officialNotificationUrl` and `applyUrl` are
  stored from the labelled links. Last date comes from the page's last date,
  and each page says "verify in official notification".
- Known data defects the load must carry, not hide: fee is extracted on only
  9% of rows (category tables not parsed); 29 of 317 testable post-count sums
  disagree with the stated total; UPPSC Deputy Secretary shows 14 Oct on the
  aggregator against 28 Oct on UPPSC's own site (sampled).
- Forward runs: article ids only increase, so "newer than the last id seen" is
  the incremental rule. Backfill of older still-open notices is the same
  script with a deeper listing crawl.

## 5. Existing 201 postings

Update, never replace.
- Rows with `source = freejobalert` (68): match on (`source`, `external_id`) via
  the existing unique index `postings_source_external_idx`. Fill empty fields
  only (`valid_through`, `post_names`, official links). Never overwrite a field
  an editor changed or a `review_status` already decided. In the pull, 35
  articles already exist in JobOye; most have no stored `valid_through`.
- Rows from other sources (133: sarkariresult 43, sarkarinaukri 39,
  sahisarkarijobs 28, indiasarkarinaukri 17, manual 6): not touched by the
  load. Expired ones are marked closed by the existing lifecycle job, not
  deleted. Their URLs stay live.
- Duplicates between old and new rows, and the 125 legacy organizations,
  are reconciled in a **separate** approved step (canonical-data merge) after
  the backup is tested.

## 6. Pre-data safety gate: backups

- The connector reports the Supabase organization plan as `free`. (observed)
  My understanding is that managed daily backups and point-in-time recovery are
  not part of the free plan. (inferred; confirm under Database > Backups in the
  dashboard) A plan upgrade is not an option, so assume **no provider backup**.
- Therefore the gate is a self-made dump:
  1. The owner runs `pg_dump` against the project from his Mac with the
     database URL kept local. The URL is never shared with me or put in the
     repository.
  2. Restore into a scratch Postgres 17 on the Mac (a throw-away local
     database), then compare row counts for `organizations`, `postings`,
     `source_documents`, `recruitments` and the other canonical tables against
     the live counts I read through the connector.
  3. Document the commands and the result in `docs/architecture/`. Only then
     is the gate passed.
- Recovery point: dump immediately before the first production write, and
  again before any merge.

## 7. Risks and rollback

| Risk | Mitigation |
| --- | --- |
| Migration breaks the live site | Additive only; existing columns untouched; tested on a preview of `asdf` first (previews have the database) |
| Unverified organizations appear in public | `verified = false` is excluded from organization pages and the sitemap in the same change; contract test covers it |
| Review queue flooded | Auto-publish rule above; unmatched go to `ingest_candidates`, not `postings` |
| Wrong data published (aggregator error) | Official link on every page; the auto-publish rule needs an official-style link; known defects listed in section 4 |
| Deployment limit | One push for code and migration; documentation rides with it |
| Rollback | Revert the push. The migration is additive, so the new tables can remain unused; data written by the load carries its source and can be identified and archived by `source` and `ingested_at` |

## 8. Decisions needed from the owner

1. **Approve three-step resolution** (alias, clean labelled name as
   unverified, candidates table), replacing the HANDOFF "alias table only"
   proposal, or choose "alias table only" and accept that roughly 64% of
   notices will wait in candidates.
2. **Approve the auto-publish rule** in section 4, or change it.
3. **Approve the backup procedure** in section 6 and run the dump and restore
   test; I cannot reach the database or the Mac's shell network from here.
4. **Approve the order:** safety gate, then write-path code and migration on a
   preview, then dry run, then first load, then the duplicate reconciliation.

## 9. Evidence grades

| Finding | Grade |
| --- | --- |
| Org created from `inferOrg(title)` and `getOrCreateOrganization` | observed (code) |
| 125 orgs / 201 postings, bucket and duplicate rows | observed (read-only query, 4 Oct) |
| 670 distinct names, 539 singletons, alias coverage figures | observed on the 950-row pull; not an estimate of the whole ecosystem |
| 56% meeting the auto-publish rule | observed on the pull |
| Official-site gap: SBI 3-4 of 5, UPPSC 1 of 2 matched; UPPSC date differs | sampled (two sites) |
| No managed backups on the free plan | inferred; to be confirmed in the dashboard |
| Ingestion stalled since 1-2 Oct | observed in stored dates; cause unknown (`DRY_RUN`, cron log) |

## 10. Findings for the ledger (not part of this increment)

- Raw `<p>`/`<ul>` markup shows as literal text in the Overview of some
  listing pages (seen on the ITBP page, source sahisarkarijobs).
- Aggregator last dates can differ from the issuing body's (UPPSC example).
- Fee and category tables are not parsed by the collector or the adapters.
- Employment News access terms and the official notice boards are still
  unmapped as sources.
