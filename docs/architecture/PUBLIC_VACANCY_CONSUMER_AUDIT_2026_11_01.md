# Public Vacancy Consumer Audit — 2026-11-01

**Status:** Code-level audit and fail-closed remediation in progress on PR #236  
**Priority:** P0 — field-level trust and public discovery integrity  
**Governing reference:** JobOye Product & Discovery Operating Charter  
**Branch:** `fix/vacancy-field-evidence-public-gates-20261031`  
**Production impact:** No production writes, migrations, or data changes were made.

## Executive finding

The original vacancy resolver and Recruitment Hub / Post Leaf gates were not enough. Several public discovery surfaces independently read recruitment or post vacancy columns, or used those values to rank inventory. A global Recruitment verification status, a populated official URL, extraction confidence, or a legacy vacancy row is not proof that a particular vacancy field is supported by an accepted issuer observation.

The safe interim rule is therefore:

- Keep otherwise eligible recruitment and post pages discoverable.
- Publish an authoritative vacancy figure only when the field-level resolver receives an explicit accepted issuer-evidence decision.
- Where an extracted count is still useful to candidates, label it **reported** and keep it out of authoritative structured data, rankings and aggregate totals.
- Do not sum Post counts to manufacture a Recruitment total.
- Do not rank discovery inventory using unaccepted vacancy figures.

The current branch intentionally fails closed because no current loader populates `officialVacancyEvidenceAccepted`.

## Public consumer inventory and branch treatment

| Surface | Consumer | Previous risk | Current branch treatment |
|---|---|---|---|
| Recruitment Hub | `src/components/recruitment/recruitment-hub.tsx` | Recruitment totals, per-Post totals and category rows used global status / raw rows. | Total, per-Post figures and category rows require the explicit field-evidence decision. |
| Post Leaf route | `src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx` | Category breakdown passed enrichment rows directly. | Category breakdown is passed only when the Post field-evidence decision is accepted. |
| Leaf vacancy section | `src/components/job-posting/sections/vacancy-details.tsx` | Category rows could be shown independently of the total gate. | Category rows are withheld without accepted field evidence; extracted total is labelled reported. |
| Leaf quick facts | `src/components/job-posting/sections/quick-facts.tsx`, `quick-facts-grid.tsx` | Some older renderers labelled values from global FJA verification or displayed enrichment categories directly. | Counts are reported unless the resolver returned an accepted field-backed value; category breakdown is hidden unless the resolver confirms the value. |
| Public `/jobs` list | `src/db/operations/get-recruitments.ts`, `src/app/(default)/jobs/page.tsx` | Global Recruitment verification + URL presence was used to expose total. | Query returns null for the vacancy total; recruitment rows remain discoverable. |
| Public search | `src/lib/search-queries.ts`, `src/components/SearchExperience.tsx` | Search CTE combined `recruitments.total_vacancies` with legacy `postings.total_vacancies`. | Vacancy field is removed from the search CTE/result mapping; search results remain available. |
| Homepage | `src/lib/queries.ts`, `src/components/home-content.tsx` | Homepage ranking and organisation ranking depended on global-only totals. | Vacancy aggregates are withheld. Closing-soon rows order by deadline; active recruitment rows order by notification freshness/deadline; hiring organisations show recruitment counts. |
| Category / Government Jobs | `listLivePostsBySector` in `src/lib/queries.ts`; category and Government Jobs routes | Post legacy vacancy column was sent to cards. | Returned vacancy total is SQL NULL; pages and cards remain discoverable. |
| Qualification hubs | `listLivePostsByQualification`, `src/components/qualification-hub-content.tsx` | Post vacancy column was shown and used for ranking. | Vacancy total is SQL NULL; order is by deadline/freshness; hub summary correctly says active posts, not active vacancies. |
| Organisation pages | `src/lib/organizations/stats.ts`, `src/components/organization/organization-page.tsx` | Recruitment total was displayed and summed across live recruitments without field-level evidence. | No vacancy total is selected or returned; recruitment/post/role discovery remains. |
| State hubs | `src/lib/states/queries.ts`, `src/app/(default)/states/[slug]/page.tsx` | State rows loaded `recruitments.total_vacancies` directly. | State rows no longer select the field and return null; state discovery remains. |
| Public control centre | `getJobsControlCenter` in `src/lib/queries.ts`; `src/app/(default)/posts/page.tsx` | Sums of `posts.vacancy_total` drove headline stats, deadline bars, org rankings and role heatmaps. | Vacancy aggregates are SQL NULL. Visual rankings use recruitment/post occurrence counts instead; vacancy column explicitly says verification pending. |
| Legacy Recruitment archive | `src/app/(default)/recruitments/page.tsx` | Summed `vacancies.count` rows and presented the sum as a Recruitment total. | The aggregate and vacancy display are removed; post counts remain. |
| Legacy homepage query helper | `getHomepageStats` in `src/lib/queries.ts` | Legacy query could sum Post vacancy rows. | Returns unknown for vacancy total and no longer aggregates Post vacancy columns. |

### Additional audit boundaries

- `src/components/job-posting/job-detail-page-production.tsx` receives the resolver result for the Leaf total; it does not promote raw vacancy columns. JobPosting JSON-LD therefore receives no unsupported count.
- `src/components/recruitment/sections/hub-vacancy-breakdown.tsx` and `hub-post-card.tsx` are downstream renderers; their caller must continue to pass category rows only after the Hub field-evidence gate.
- `/exams/*` still has legacy `postings`-table consumers and historical/static exam copy. It is not silently migrated in this PR; it needs a separately scoped inventory to distinguish historical examples from current vacancy claims.
- `getDailyDigestStats` reads the staging `raw_notifications` digest. Its route exposure and candidate-facing status need a separate confirmation before treating it as a public canonical vacancy consumer.
- `qualification-hub-template.tsx` is an older generic template with a vacancy-shaped input contract; its live route usage was not established by this audit.

## Evidence model inspection — no schema change proposed for this PR

The current repository already has three relevant provenance structures:

1. `source_observations` stores source identity, URL, observed time, content hash, facts, links, raw payload, outcome and a nullable link to a legacy `postings.id`.
2. `source_documents` stores registered source identity, URL, document metadata, content hash, raw content and extraction metadata.
3. `evidence` stores `subject_type`, `subject_id`, `field`, excerpt and page reference, with an optional `source_document_id`.

The existing structures do not yet form a complete, durable field-decision contract:

- `source_observations` links to legacy `postings` or organisation candidates, not directly to canonical `posts` / `recruitments`.
- `evidence` does not currently carry a direct source-observation FK, an exact normalized value, an acceptance/rejection decision, reviewer identity or decision timestamp.
- `source_documents` and `source_observations` have no explicit FK relationship in the current ORM schema.
- The WP-001 migration and the live database both constrain `source_observations.outcome` to `RECEIVED`, `LOADED`, `HELD_CANDIDATE`, `REJECTED`, `SKIPPED`. PR #221's description refers to `ACCEPTED` observations. The live constraint confirms that `ACCEPTED` is not a valid ingestion outcome. Keep ingestion outcome separate from a field-level review decision; do not simply add `ACCEPTED` to this outcome check.

### Read-only production schema and inventory check (2026-11-01)

The connected Supabase project named `jobs` was inspected read-only; no rows or schema were changed.

- `source_observations`: 2,975 rows.
- `source_documents`: 2,082 rows.
- `evidence`: 0 rows.
- Source-observation outcomes: 1,844 `LOADED`, 912 `RECEIVED`, 120 `HELD_CANDIDATE`, 20 `REJECTED`, 79 `SKIPPED`.
- The live `source_observations` foreign keys are to legacy `postings.id` and `organization_candidates.id`; there is no direct canonical Post or Recruitment FK.
- `source_documents` links to `sources`, but not to `source_observations`.
- `evidence` has only its primary key constraint in the live schema; its nullable `source_document_id` is not enforced as a foreign key. It currently has no rows.

This confirms that no current evidence rows can authorize public vacancy facts, and that the outcome terminology in the earlier PR description must not be mistaken for a deployed field-review workflow.

### Recommended next design step

Do not add a boolean column to every entity or create a second source-of-truth. First inspect the deployed schema, the current source-observation writer, the evidence writer and the issuer-review process. Then extend the existing provenance path so an accepted decision binds all of the following:

- Canonical subject scope: `POST` or `RECRUITMENT`, with the exact canonical ID.
- Field identity: for example `vacancy_total` or `vacancies_by_category`.
- Exact accepted normalized value (not just an excerpt or a confidence score).
- Exact source observation and/or source document, with immutable content hash and URL.
- Supporting excerpt and page/section locator.
- Decision state, reviewer, decision time and supersession/revocation history.
- A rule preventing a Recruitment-scoped observation from authorizing a Post-scoped value, or vice versa.

The public resolver should consume a typed, scope-specific accepted evidence result. It must not infer acceptance from a source URL, global verification status, extraction confidence or an aggregator record. Keep source-observation ingestion outcomes separate from evidence review decisions. The existing `evidence` table is empty and is a candidate to extend, but only after canonical subject integrity and deployed schema are fully designed.

This is a design recommendation only. No migration, production write, source-review UI or loader change is included here.

## Validation and release gates

- Exact-head GitHub Actions must pass after the latest code changes.
- Review the generated diff and ensure public search/list queries no longer select or sort by unsupported vacancy fields.
- Verify rendered homepage, search, /jobs, category, qualification, organisation, Hub and Leaf surfaces on a Vercel preview.
- Check that pages remain crawlable and useful while unsupported vacancy totals are absent; do not turn this field-level gate into a page-level noindex rule.
- Confirm JobPosting JSON-LD omits unsupported `baseSalary` / vacancy-like properties and contains no vacancy count when the resolver returns null.
- No production release is claimed until preview and production behaviour are checked.

## Current conclusion

The first public-consumer remediation pass is implemented on the PR branch, with regression coverage added for resolver and discovery surfaces. The persistent field-evidence decision model remains an explicit dependency. Until that model is approved and populated, JobOye should prefer a useful job page with a missing vacancy total over a precise-looking but unsupported number.
