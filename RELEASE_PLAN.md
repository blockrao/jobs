# JobOye Release Plan — Controlled Public Launch

**Owner:** Product / Engineering  
**Status:** Active release plan  
**Release posture:** Controlled English-first launch once all launch-blocking gates pass. Hindi remains a supported workstream but broader Hindi SEO/indexing is not a prerequisite if it is explicitly scoped and its current routes are not misleading. No release date is committed until the blocking gates have evidence.

## Release objective

The detailed field ownership and coverage audit is maintained in [RECRUITMENT_POST_DATA_AUDIT.md](./RECRUITMENT_POST_DATA_AUDIT.md). Treat it as the working contract for the Recruitment/Post data-to-UI audit and refresh its counts before release.


Publish a trustworthy job-discovery product where Recruitment hubs describe the hiring exercise, Post Leaves describe individual roles, and Position hubs support evergreen role discovery. Every public page must present the right facts from the database in a readable way, preserve provenance internally, avoid presenting unverified extraction as official truth, and resolve to the intended canonical URL.

## Non-negotiable release gates

### Gate 0 — Public trust and branding hygiene (P0)
- [ ] Remove all source-aggregator brand names and inventory/research wording from candidate-facing UI, metadata, navigation, help text, structured data, and rendered links.
- [ ] Remove or protect internal source-review routes; public requests must return a not-found response until an authenticated admin surface exists.
- [ ] Never present an aggregator URL as an official notification or official application portal. Use an organization-controlled official source where verified; otherwise label a neutral source link accurately or omit it.
- [ ] Add a regression test for prohibited source-brand strings and internal inventory panels in public Recruitment/Post components and metadata.
- [ ] Search the repository for visible strings and inspect every hit; code comments and internal tooling may retain source identifiers where operationally necessary, but must not be rendered publicly.
- [ ] After deployment, crawl representative public routes and search rendered HTML/metadata/link destinations for prohibited source-brand strings/domains.

### Gate 1 — Recruitment and Post content correctness (P0)
- [ ] Audit Recruitment hub field-by-field against canonical Recruitment, Exam, Organization, fee, selection-process, and Post records.
- [ ] Audit Post Leaf field-by-field against Post, Position, vacancy, eligibility, age-rule, enrichment, salary, fee, important-date, document, duties, and application-source data.
- [ ] For every fact, define its authoritative owner, resolver/fallback order, display label, empty-state behavior, and confidence/verification state.
- [ ] Do not fabricate missing values, infer a Recruitment total by summing Post vacancies, or show raw JSON/database column names to candidates.
- [ ] Fix incomplete, duplicated, stale, conflicting, or incorrectly joined facts. Add fixtures/contracts for high-risk entity-boundary cases.
- [ ] Check mobile layout, readability, date/time formatting, status clarity, accessible labels, external-link safety, and application CTA behavior.

### Gate 2 — Source inventory and reconciliation (P0 for data expansion; not a reason to publish unverified claims)
- [ ] Validate the bounded inventory pilot end-to-end before the full crawl.
- [ ] Confirm idempotency, immutable raw capture, stable external identity, parent Recruitment ↔ Post reconciliation, and export/database row-count reconciliation.
- [ ] Preserve raw source evidence and extraction coverage separately from canonical JobOye facts.
- [ ] Verify each promoted fact against an official notification or official organization page; leave unverified fields explicitly unknown.
- [ ] Run full inventory in controlled batches with retry/error reporting and a resumable checkpoint.
- [ ] Generate a dry-run reconciliation report before any bulk canonical-table writes; require review of creates, updates, conflicts, and rejected records.
- [ ] Apply approved changes in transactions/batches with a rollback/recovery plan and post-write integrity checks.

### Gate 3 — Canonical URLs, redirects, indexing (P0)
- [ ] Recruitment hub canonical policy is deterministic: only consolidate a Recruitment hub to a Position hub when every linked Post resolves to the same Position; otherwise do not choose an arbitrary canonical target.
- [ ] Canonical Post Leaf route is stable and indexable; redirect/legacy flat Posting URLs to the intended canonical leaf.
- [ ] Test known broken leaf URLs, legacy slugs, redirect chains/loops, mixed-role Recruitments, missing records, and genuine 404s.
- [ ] Validate canonical, robots/noindex, hreflang, title/description, Open Graph, and JSON-LD on English and supported Hindi routes.
- [ ] Ensure sitemap entries contain only eligible canonical pages and exclude redirects, noindex pages, internal routes, and stale slugs.
- [ ] Check robots.txt, sitemap.xml, and representative URL Inspection / rendered HTML output after deployment.

### Gate 4 — Release candidate quality (P0)
- [ ] All required GitHub CI checks pass on the exact release commit: type checks, contract/unit tests, production build, and any mandatory lint gate.
- [ ] Do not weaken lint rules to conceal baseline debt. Separate pre-existing debt from new regressions and document any explicitly accepted non-blocking baseline.
- [ ] Review all open release PRs and merge in dependency order; avoid mixing broad refactors with release-critical fixes.
- [ ] Verify migrations/schema assumptions against the target production database and confirm required environment variables are present.

### Gate 5 — Production smoke test and operational readiness (P0)
- [ ] Confirm deployment succeeded on the intended production commit; a rate-limit or failed deployment is not a release.
- [ ] Run HTTP/browser smoke tests for homepage, search, Recruitment hub, Post Leaf, Position hub, Organization/Exam page, language switch, and not-found/error paths.
- [ ] Check logs for database failures, rendering errors, missing relationships, and metadata exceptions.
- [ ] Confirm ingestion has observable success/failure counts, freshness timestamps, dedupe/conflict reporting, and alerts for repeated failures.
- [ ] Verify caching/revalidation behavior and that data fixes become visible without stale canonical metadata.
- [ ] Back up or export the affected production rows before approved bulk repairs; rehearse rollback for URL/data changes.
- [ ] Start with a controlled release, monitor search/indexing and application-link errors, and define a clear rollback owner/path.

## Execution sequence and exit criteria

| Phase | Work | Exit criterion |
|---|---|---|
| A. Trust/UI hotfix | Remove source-brand copy and public inventory/review panels; protect review route; add regression tests | No prohibited brand references or internal inventory details in candidate-facing UI/metadata; tests pass |
| B. Route/data contracts | Finalize Recruitment/Post field ownership and canonical/indexing rules | Field matrix reviewed; route/SEO contract tests pass |
| C. Pilot ingestion | Run and reconcile bounded source pilot with raw captures | Counts reconcile; idempotent rerun produces no duplicate writes; all candidates classified |
| D. Data/URL repair | Dry-run report, human review, transactional repairs and redirects | No orphan/duplicate regressions; sampled old URLs reach intended live canonical leaves |
| E. Release candidate | Merge required PRs in dependency order; CI/build on exact SHA | All mandatory checks pass; no unexplained failing checks |
| F. Production verification | Deploy and execute smoke tests + monitoring checks | Critical journeys and SEO metadata verified on production |
| G. Controlled launch | Announce/submit eligible sitemap; monitor crawl, errors, and candidate journeys | No P0 incidents during agreed observation window; rollback path remains available |

## Launch decision

**GO** only when Gates 0, 1 (critical facts), 3, 4, and 5 pass. Gate 2 must pass before promoting newly inventoried source records into canonical public data; unverified candidates may remain internal and must not leak into the public site. Non-critical enhancements, full Hindi content coverage, and non-blocking historical lint debt can be sequenced after an English-first controlled launch only if their current behavior is explicit, safe, and not misleading.

**NO-GO** for any confirmed wrong-entity content, broken critical Post Leaf route, invalid canonical/robots behavior, aggregator presented as official source, missing required production configuration, failed production build, or unresolved critical database error.

## Current known evidence (2026-10-11; refresh before release)
- PR #40 preview deployment for commit 248cc1ccb62a503d20f34e82284ebfa8920f39fe reached READY after successful Next.js compilation and Vercel TypeScript check. Build logs also recorded DB-query fallbacks and first-attempt >60-second static-generation timeouts for three Position hubs; this is tracked in [issue #42](https://github.com/blockrao/jobs/issues/42) and requires verification before release.
- GitHub Actions on the current branch still fails the same 15 architecture/metadata tests already failing on main; application and contract-test type-checks pass on the corrected code. Lint remains a baseline failure (279 errors on the latest audited run vs 283 on main), so changed-file regressions must continue to be separated from repository debt.

- Canonical database baseline: 1,087 Recruitments and 1,553 Posts; core Recruitment/Post relationships passed basic integrity counts.
- The normalized vacancies table was empty at audit time; salary/pay was populated on only 128 Posts; only 9 Posts had eligibility rows; fee and selection-process normalized rows were sparse. This is a content-mapping risk, not proof the corresponding facts are absent from legacy/enrichment fields.
- Source inventory pilot was 3 Recruitment records and 8 Post candidates, all partial; no immutable source-capture rows existed at audit time.
- The public Recruitment UI had exposed source inventory/raw record panels; the UI fix is tracked in PR #40.
- The source inventory extractor wiring is tracked in PR #41; the bounded pilot must be rerun after code validation.
- Vercel has reported a deployment rate-limit failure. No successful preview or production verification should be inferred from that status.
- These counts/statuses are a dated snapshot, not release evidence. Re-run the checks against the release commit and current production data.
