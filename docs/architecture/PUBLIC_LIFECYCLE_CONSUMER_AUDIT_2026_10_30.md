# Public Lifecycle Consumer Audit — 2026-10-30

**Status:** Read-only code audit complete; remediation not yet applied  
**Parent:** JobOye Product & Discovery Operating Charter  
**Tracking:** Issues #173 and #174; publication/indexability dependencies in #176  
**Scope:** Public recruitment/post discovery, detail pages, related links, lifecycle labels, structured data and sitemap lifecycle signals

## Executive finding

JobOye has a shared TypeScript lifecycle helper at `src/lib/lifecycle.ts`, and several important routes use it. However, the public system is not yet governed by one consistent lifecycle decision. Multiple SQL consumers independently encode status/deadline predicates, some public surfaces do not filter related records by lifecycle at all, and some display/schema code evaluates only the deadline while ignoring the canonical recruitment status.

The highest-risk gaps are:

1. **Placeholder deadlines bypass the helper in SQL.** The helper treats years >=2090 as unknown, but SQL consumers compare raw `application_end_date` values. This can leak sentinel dates into browse inventory and date displays.
2. **Deadline boundary rules differ.** The helper treats a deadline as passed only when `deadline < now`; SQL consumers variously use `>`, `>=`, and `BETWEEN`, creating disagreements at the exact deadline.
3. **Related-post modules can recommend closed/archived opportunities.** The current leaf route calls `getRelatedPostsGrouped`, whose three queries do not filter status or deadline.
4. **Leaf metadata ignores canonical lifecycle status.** `composeLeafSeo` decides whether to say “Apply by” from deadline alone, even though the route derives lifecycle from recruitment status and deadline.
5. **Recruitment-hub structured data uses deadline-only closure logic.** A CLOSED/RESULTS/ARCHIVED recruitment with a future or missing deadline can still receive JobPosting markup in the single-post hub schema. This also conflicts with the governing Charter, which reserves JobPosting structured data for eligible individual post detail pages.
6. **The sitemap uses lifecycle only for priority/change frequency, not a shared publication eligibility decision.** URL inclusion remains independent of the page's canonical/indexability rules; this belongs to issue #176 and must be addressed in that shared gate, not by conflating lifecycle with indexability.

No code, schema or production data was changed during this audit.

## Lifecycle contract currently implemented

Source: `src/lib/lifecycle.ts`

- Inputs: canonical recruitment status and canonical `application_end_date`.
- Placeholder dates >=2090 become `null` through `toPlausibleRecruitmentDate`.
- `CLOSED` or a passed plausible deadline => `closed`.
- `ACTIVE` => `open`.
- `UPCOMING` => `upcoming`.
- `RESULTS` and `ARCHIVED` remain distinct.
- `isOpen` is true only for `open`; `isLive` is true for `open` and `upcoming`.
- Unknown status currently falls back to deadline presence: plausible deadline => open, no plausible deadline => closed.

Existing unit tests cover the principal states and placeholder behaviour in the TypeScript helper, but do not prove that SQL consumers produce the same result.

## Consumer inventory and findings

### A. Public listing and discovery surfaces

| Surface / consumer | Source | Current behaviour | Audit finding |
|---|---|---|---|
| `/jobs` | `src/app/(default)/jobs/page.tsx`; `listRecruitments` in `src/db/operations/get-recruitments.ts` | Page labels rows using `deriveLifecycle`; SQL uses separate `LIVE_RECRUITMENT_SQL` and `OPEN_RECRUITMENT_SQL` predicates. | Duplicate lifecycle rules. SQL uses `>= now()`; helper uses strict `< now` for passed deadline. Raw sentinel deadline can pass SQL and still be displayed from the row. |
| Homepage `/` | `src/app/(default)/page.tsx`; `liveGovRecruitment`, `listBiggestOpen`, `listClosingSoon`, `getHomeStats` in `src/lib/queries.ts` | Home data uses ACTIVE/UPCOMING and deadline comparisons in SQL. | No plausible-date guard in `liveGovRecruitment`; homepage open/ranked inventory can carry sentinel dates. Closing Soon's 30-day window naturally excludes far-future sentinels, but that does not fix the shared predicate. |
| `/government-jobs` | `src/app/(default)/government-jobs/page.tsx`; `listLivePostsBySector` | Uses `livePostCondition`: ACTIVE/UPCOMING and deadline null or > NOW. | Separate SQL lifecycle implementation; raw placeholder dates are not normalised through the helper. |
| `/categories/*` | `src/app/(default)/categories/[slug]/page.tsx`; `listLivePostsBySector` / `countLivePostsBySector` | Same `livePostCondition`. | Same lifecycle mismatch. Query also lacks an explicit quarantine predicate, which is a publication/trust issue to include in the shared listing policy. |
| `/qualifications/*` | `src/app/(default)/qualifications/[slug]/page.tsx`; `listLivePostsByQualification` / counts | Same `livePostCondition` plus title regex. | Same lifecycle mismatch. Qualification matching remains a heuristic, not eligibility evidence; retain this separate issue from lifecycle remediation. |
| `/states/*` | `src/lib/states/queries.ts`; state route | `listStateJobs` uses SQL status/deadline filter, then applies `deriveLifecycle`; `countCurrentByState` repeats SQL without helper. | List/count can disagree at deadline boundaries and with placeholders. The returned display date is parsed directly from raw DB date, so a sentinel can be displayed even though `lifecycle.deadline` is null. State detail currently has a fixed 100-result limit and no pagination; separate #176/page-quality work. |
| `/closing-soon` and homepage closing block | `listClosingSoon`, `countClosingSoon` in `src/lib/queries.ts` | Uses `liveGovRecruitment`, verified recruitment gate and deadline window. | Status/deadline logic duplicated. The bounded window excludes distant sentinels, but the base live predicate is still not the helper's shared rule. |
| `/exams/*` | `src/app/(default)/exams/[pillar-slug]/page.tsx`; `getPostingsByExam` and `currentOnly` in `src/lib/queries.ts` | Uses legacy `postings.isExpired` and `postings.validThrough`. | Public exam surface is still driven by legacy `postings`, not canonical `posts → recruitments` lifecycle. Do not silently fold this into the new canonical discovery engine; inventory/migration decision is required. |

### B. Canonical detail and related-opportunity surfaces

| Surface / consumer | Source | Current behaviour | Audit finding |
|---|---|---|---|
| Recruitment hub `/jobs/{recruitment}` | `src/components/recruitment/recruitment-hub.tsx` | `buildHubData` calls `deriveLifecycle(recruitment.status, recruitment.applicationEndDate)`. | Main visible lifecycle label is correctly centralised. Keep this as the reference consumer. |
| Post leaf `/jobs/{recruitment}/{post}` | `src/db/operations/get-posts.ts`; `src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx` | Core loader maps `r.status` to `postingStatus`; route calls `deriveLifecycle(post.postingStatus, post.recruitmentApplicationEndDate ?? post.enrichment?.applicationClosingDate)`. | Status is sourced from the canonical recruitment, but the deadline can fall back to post enrichment when canonical recruitment deadline is absent. The lifecycle contract says canonical recruitment deadline; do not let unverified enrichment silently redefine recruitment lifecycle. Confirm provenance/field ownership before removing this fallback. |
| Leaf title/description metadata | Same leaf route, `composeLeafSeo` | `closed` is calculated only from `deadline && Date.now() > deadline`. | Ignores CLOSED/RESULTS/ARCHIVED recruitment status. Metadata can say “Apply by …” while visible page lifecycle says closed/results/archived. Must use the same lifecycle result as the page. |
| Leaf JobPosting markup and apply CTA | `src/components/job-posting/job-detail-page-production.tsx`; `src/components/job-posting/structured-data/post-leaf-schema.tsx` | Component uses passed `lifecycle.isOpen` to control Apply CTA and `emitJobPosting`; schema also checks resolved deadline. | Direction is broadly aligned, but verify that every schema caller passes lifecycle and that deadline resolver cannot override canonical recruitment state. |
| Related opportunities on leaf | `src/db/operations/get-related-posts.ts` | Three queries (same organisation, location, similar role) filter only quarantined recruitments; no lifecycle predicate. | **P0 user-facing defect:** closed, results or archived recruitments may appear as related opportunities. Must use canonical lifecycle and preserve upcoming vs open labels if upcoming items are intentionally included. |
| Older related-post SQL in `src/db/operations/get-posts.ts` | `getRelatedPostsForLeaf` | ACTIVE/UPCOMING and deadline >= now, plus quarantine exclusion. | Separate duplicate SQL predicate; placeholder and boundary mismatch remain. Trace actual usage before changing/removing. |
| Organization hubs | `src/lib/organizations/stats.ts`; `src/app/(default)/organizations/[slug]/page.tsx` | Loads non-quarantined canonical recruitments, derives lifecycle in TypeScript and filters live/closed. | Good lifecycle alignment in the stats service. Verify UI date labels use `lifecycle.deadline` rather than raw `applicationEndDate` for placeholder suppression. |
| Recruitment hub structured data | `src/components/recruitment/structured-data/recruitment-hub-schema.tsx` | Single-post hub may emit JobPosting when paragraphs/date/org exist and deadline alone is not past. | **P0 policy and lifecycle defect:** status CLOSED/RESULTS/ARCHIVED is ignored; missing deadline is treated as not closed. Additionally, the Charter says JobPosting belongs only on eligible individual post detail pages, not discovery/recruitment listing surfaces. Remove this hub JobPosting branch in a focused, tested change; retain suitable WebPage/Article/Breadcrumb data. |

### C. Sitemap and lifecycle automation

| Consumer | Source | Current behaviour | Audit finding |
|---|---|---|---|
| Sitemap recruitment/post URLs | `src/app/sitemap.ts` | Queries canonical recruitments/posts; uses `deriveLifecycle` only for changeFrequency/priority. Includes historical lifecycle URLs. | Lifecycle helper is used for freshness hints, not inclusion. That can be a deliberate historical-URL policy, but the inclusion decision must later be shared with page-level robots/canonical eligibility under #176. Current query does not enforce all page-level canonical/indexability rules (for example, single-post hub canonical ownership). |
| Sitemap slug query helpers | `getPostSlugsForSitemap`, `getRecruitmentSlugsForSitemap` in `src/lib/queries.ts` | Reimplement ACTIVE/UPCOMING and deadline checks in SQL for `isLive`; comments explicitly state historical URLs remain in sitemap. | Duplicate status/deadline logic for changeFrequency/priority. The comments also describe a different sitemap implementation from the current `src/app/sitemap.ts`; confirm whether these helpers are still consumed before changing them. |
| Lifecycle cron | `src/app/api/cron/update-recruitment-lifecycle/route.ts` | Calls database function `refresh_recruitment_lifecycle()`; also refreshes legacy posting urgency. | Separate DB-side lifecycle mutation for legacy postings/recruitment status. Must be audited as a writer, but should not be assumed to define the public read contract. No production function definition or DDL was changed/read in this code-only audit. |

## SQL / TypeScript semantic differences to resolve

1. **Boundary:** helper uses `deadline.getTime() < now.getTime()`; SQL predicates use `> NOW()` or `>= now()`. At exact equality, these disagree.
2. **Placeholder:** helper nulls years >=2090; raw SQL comparisons do not. Some pages map raw deadline values to Date and display them.
3. **Unknown status:** helper currently infers open from a plausible deadline; most SQL predicates admit only ACTIVE/UPCOMING. This is an explicit policy decision to resolve, not something to change accidentally.
4. **Upcoming with past deadline:** helper returns closed because deadline-passed check precedes status; SQL filters generally exclude it. This is consistent in outcome but not implemented through a common rule.
5. **Status CLOSED with future deadline:** helper returns closed; deadline-only schema/metadata consumers may incorrectly treat it as open.
6. **Missing deadline:** helper treats ACTIVE as open and UPCOMING as upcoming. This is intentional current policy; public display must not invent a deadline.

## Remediation plan — proposed, not yet implemented

### P0-A: Lock the pure lifecycle contract
- Confirm the equality/boundary rule and unknown-status behaviour.
- Keep canonical inputs limited to recruitment status + plausible canonical application deadline.
- Ensure every consumer uses `lifecycle.deadline` for display/countdown rather than raw sentinel values.
- Add tests for exact deadline equality, unknown status, UPCOMING with expired deadline, sentinel dates and missing dates.

### P0-B: Centralise SQL lifecycle predicates
- Add a database-side expression/helper that mirrors the agreed TypeScript semantics, including sentinel handling and the exact deadline boundary.
- Use it in canonical recruitment/post discovery queries: `listRecruitments`, homepage/closing-soon, sector/category, qualification, state list and state counts, related-post queries.
- Do not apply the canonical predicate to legacy `postings` without an explicit migration decision.
- Ensure count and list queries share the exact same predicate.

### P0-C: Fix visible lifecycle consumers
- Pass one computed lifecycle into leaf metadata and visible rendering; stop deadline-only metadata decisions.
- Make related-post queries exclude closed/results/archived and expired opportunities, while handling upcoming distinctly.
- Remove JobPosting from recruitment-hub schema in line with the governing Charter; JobPosting remains only on eligible individual post leaves.
- Audit organization/state date rendering for sentinel suppression.

### P0-D: Separate lifecycle from indexability
- Lifecycle answers whether an opportunity is upcoming/open/closed/results/archived.
- Indexability answers whether the URL should be indexable and included in the sitemap.
- Implement the latter as the shared gate in issue #176; do not make all closed historical pages noindex by default.
- Ensure sitemap, metadata robots and canonical ownership consume that shared gate.

### P0-E: Validate and release
- Unit tests for lifecycle semantics and SQL predicate parity.
- Integration tests for representative canonical list queries.
- Route tests for metadata, visible status, related links and structured data.
- Sitemap/robots parity tests.
- Preview URL smoke tests and production deployment verification before release.

## Explicit non-actions

- No production database writes or schema migrations.
- No change to lifecycle helper semantics yet.
- No change to historical URL retention/indexability policy yet.
- No new discovery pages or role classification migration.
- No use of the legacy `postings` table as the new canonical inventory.

## Audit conclusion

The architecture has the right central primitive, but it is not yet consistently enforced. The smallest safe next implementation is a focused P0 PR that first locks lifecycle semantics and tests, then centralises canonical SQL predicates and corrects the leaf metadata/related-links/hub-schema defects. Keep the shared indexability gate as a separate but dependent workstream under #176.
