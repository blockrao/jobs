# JobOye Production Readiness Audit — 2026-10-25

**Repository:** `blockrao/jobs`  
**Reviewed ref:** `main` at `67b98fcdb8b40b1b26beb66cae965d423989ce51`  
**Scope:** URL/entity architecture, canonical/indexing signals, sitemap/robots, post/recruitment data flow, vacancy integrity, caching, and release verification.  
**Evidence limitation:** This is a repository/code audit plus read-only queries against the connected production Supabase database. The current environment could not retrieve `https://joboye.com` or its live sitemap/robots endpoints, so this document does **not** claim live HTTP verification. Rendered HTML and HTTP behavior must be checked separately.

## Executive decision

**Not yet certifiable as production-ready.** The route contract is clearly documented and the latest main commit has a successful GitHub quality-gates run, but important consistency and observability gaps remain. Do not perform another broad URL migration or a broad SEO rewrite until the P0 data/identity gates and exhaustive URL checks pass.

The agreed URL contract remains:

- `/jobs` — job discovery listing.
- `/jobs/{recruitment-slug}` — recruitment entity hub.
- `/jobs/{recruitment-slug}/{post-slug}` — canonical post leaf.
- `posts` is the canonical post entity; inferred `postings` relationships must not determine canonical job identity.
- Legacy recruitment slugs resolve only through explicit `recruitment_slug_redirects` mappings; no fuzzy/partial slug fallback.
- Hindi localization is explicitly out of scope for this stabilization phase. Do not add Hindi routes or translations in this phase.

## Findings and remedies

### P0 — Vacancy facts are not governed by one end-to-end trust policy

**Evidence:** Read-only production queries found 1,025 recruitment rows with a non-null `total_vacancies`; 12 are outside the 1–100,000 sanity range, all 12 have `VERIFIED` status but no official notification URL. Of the totals present, 499 are not in `VERIFIED` or `MANUALLY_VERIFIED` status. In `posts`, 130 rows have non-positive `vacancy_total`, 4,148 have values from 1 to 100,000, and none exceed 100,000. The `post_enrichments` table has 2,095 rows with non-null `vacanciesTotal` and a maximum of 33,320. The leaf page composes metadata and passes a visible vacancy value using `enrichment?.vacanciesTotal ?? post.vacancyTotal ?? 0`, while the post schema component documents resolver-gated vacancy facts, so visible metadata/UI and structured data may use different policies.

**Risk:** absurd or unverified counts can leak into title tags, descriptions, visible UI, hub cards, related pages, or JSON-LD even after the homepage fix.

**Remedy:**
1. Define one shared typed resolver for recruitment totals and post totals separately; do not conflate the two entity levels.
2. Require evidence/status and semantic ownership for each displayed total. A plausibility cap is a sanity check, not proof.
3. Use the resolved result consistently for H1, title, meta description, visible cards, JSON-LD, and summary components.
4. Omit unknown/untrusted totals; never sum post totals to manufacture a recruitment total.
5. Add contract tests covering each public surface, including metadata and schema output, with implausible and unverified fixtures.

### P0 — Recruitment Hub still derives totals by summing Post totals

**Evidence:** `src/components/recruitment/recruitment-hub.tsx` currently calculates `totalVacancies` from `sourceExtract.vacancyCount`, then `recruitment.totalVacancies`, then a sum of every positive `post.vacancyTotal`. Its post rows also fall back to raw `fjaExtract.vacancyCountRaw` and `post.vacancyTotal`; `vacanciesVerified` is true whenever `post.vacancyTotal != null`, which treats mere column presence as verification. This conflicts with the documented data-to-UI integrity contract, which explicitly forbids deriving a recruitment-wide total by summing Post records.

**Risk:** incomplete or stale Post rows can inflate the recruitment headline and title, even when the recruitment-level total is unknown. Unverified counts can be presented without a reported/unverified label. This is a direct data correctness issue and must be fixed before production certification.

**Remedy:**
1. Never sum Post totals to produce a Recruitment total.
2. Resolve Recruitment totals only from the recruitment-owned total field and the agreed verification/source/plausibility gate. If not trusted, omit the count from the title and headline.
3. Resolve each Post count through `resolvePostVacancy`; do not treat non-null legacy columns as proof of verification.
4. Keep a separately labelled “reported by source listing” value only if the product deliberately chooses to show it, and never represent it as verified or use it as a canonical vacancy fact in JSON-LD.
5. Add unit tests for a recruitment with multiple Posts where the recruitment total is null, wrong, implausible, or unverified; ensure the Hub never sums the Posts.

### P0 — Slug uniqueness and lookup determinism need a database constraint

**Evidence:** Read-only production queries (2026-10-25) found 4,932 posts, zero missing/blank post slugs, zero duplicate recruitment slugs, zero duplicate `(recruitment_id, slug)` groups, and zero posts orphaned by `recruitment_id`. There are 864 global duplicate `posts.slug` groups (for example, `junior-research-fellow` appears in 44 different recruitments). Because the public URL includes the recruitment slug as well as post slug, these global repeats are not themselves canonical URL collisions. The post lookup is scoped by recruitment, but its `LIMIT 1` is still nondeterministic if a duplicate pair is ever introduced.

**Risk:** global slug-only consumers may confuse posts across recruitments; future data can create an ambiguous URL unless the pair uniqueness is enforced.

**Remedy:**
1. Confirm DB unique constraints/indexes for `(recruitment_id, slug)` and the canonical lookup contract.
2. Add a database-enforced unique constraint for the chosen canonical identity after verifying current data.
3. Keep all public lookups scoped by both recruitment and post slug; prohibit slug-only canonical lookups.
4. Add CI tests for duplicate pair fixtures and verify global repeated role slugs remain valid when attached to different recruitments.

### P0 — Legacy redirects need a complete, executable integrity audit

**Evidence:** Read-only production queries found 32,199 rows in `recruitment_slug_redirects`: 5,412 identity rows where `old_slug = new_slug` (these are not HTTP redirects when the exact canonical lookup succeeds) and 26,787 actual old-to-new mappings. All actual mappings had existing targets, zero actual redirect chains, zero old-slug collisions with current canonical recruitment slugs, and zero targets that disagree with the row's `recruitment_id`. The identity rows are redundant and should be understood before cleanup, but must not be misreported as HTTP redirect loops.

**Risk:** mapping integrity is encouraging at the database level, but live HTTP responses, route resolution, and cache behavior have not yet been exercised. Identity rows add noise and may be mistaken for actual redirects by future audits.

**Remedy:** keep the current rows unchanged during stabilization; add a read-only redirect report that distinguishes identity mappings from true redirects, validates every true target against a 200 canonical route, and tests all mappings after deployment. Do not delete identity rows without a separately rehearsed migration.

### P1 — Sitemap generation is not yet demonstrably unique or route-valid

**Evidence:** `src/app/sitemap.ts` builds recruitment hubs and post leaves directly from DB rows, and appends a substantial static URL list. It excludes quarantined recruitments and unresolved organizations, but does not visibly deduplicate the final URL array or verify static paths exist before emitting them.

**Risk:** duplicate sitemap entries, stale static URLs, or canonical URLs that redirect/404 can waste crawl budget and conceal route regressions.

**Remedy:**
1. Deduplicate by normalized absolute URL before returning the sitemap.
2. Test all static sitemap entries against the App Router route inventory and flag unknown paths.
3. Check every dynamic sitemap URL for a unique backing entity and no redirect required.
4. Test sitemap failure behavior in production: a database outage should not silently publish a partial sitemap. The current code rethrows, which is safer than a false near-empty sitemap; verify monitoring alerts on this failure.
5. Test sitemap origin against the configured production canonical origin.

### P1 — Site-origin configuration can produce malformed canonicals if misconfigured

**Evidence:** `src/lib/site.ts` uses `NEXT_PUBLIC_SITE_URL` verbatim except for removing one trailing slash; only the Vercel-provided fallbacks add `https://`.

**Risk:** if the explicit environment variable is set to a bare hostname, has a path, or uses the wrong host, canonical tags, JSON-LD IDs, robots sitemap location, and sitemap URLs may be invalid or inconsistent.

**Remedy:** normalize and validate the configured origin at startup/build time: require HTTPS in production, reject paths/query/hash, and ensure the production value is exactly `https://joboye.com` (or the deliberately selected canonical host). Verify Vercel production and preview environments use the intended stable production origin.

### P1 — Request-scoped caching for post metadata/rendering is disabled

**Evidence:** `src/db/operations/get-posts.ts` exports `getPostBySlugCached = getPostBySlug`; the cache wrapper is commented out with a note that it was disabled due to production 500s. The leaf route calls this function in both `generateMetadata` and the page render.

**Risk:** duplicate DB work for a single request, increased latency/connection load, and a latent reliability issue. Re-enabling caching blindly could reintroduce the previous 500s.

**Remedy:** investigate the original failure and add a reproducible regression test. Prefer supported Next.js request memoization or React `cache()` only after verifying runtime behavior. Measure query count/latency and error rate before and after; do not trade correctness for a speculative performance optimization.

### P1 — Recruitment/post data paths still have legacy schema ambiguity

**Evidence:** `get-posts.ts` uses a mixture of snake_case columns (`p.recruitment_id`, `p.vacancy_total`) and quoted camelCase columns (`p."recruitmentId"`, `p."postedAt"`, `p."organizationId"`). Some related-post queries join with `COALESCE(p."recruitmentId"::integer, p.recruitment_id)`. The data integrity register also documents snake_case and camelCase columns coexisting.

**Risk:** queries can choose conflicting values, silently drop records, or create different answers between the canonical detail route, related jobs, hub summaries, and listings.

**Remedy:** declare the canonical column for every important field and create a field-level data contract. Audit disagreement rates between old/new columns in production; reconcile data; then migrate readers to one canonical field. Do not remove compatibility columns until usage and migration status are proven.

### P1 — Some legacy query helpers have weaker visibility filters than the canonical route

**Evidence:** `getRecruitmentBySlug` queries by slug and redirect but does not apply the `notQuarantined` predicate used by `getRecruitmentWithPosts`. It may be safe if unused on public routes, but usage needs to be confirmed.

**Risk:** if a public route or API uses this helper, quarantined records could bypass the public visibility rule.

**Remedy:** inventory all callers. Apply a common visibility predicate to public loaders, or clearly isolate an admin-only loader. Add a contract test that quarantined entities are never returned from public query functions.

### P1 — Some query paths swallow database errors into empty results

**Evidence:** `src/lib/queries.ts` documents that missing `DATABASE_URL` causes queries to degrade to empty results; `getPostsByRecruitment` catches errors and returns `[]`. In contrast, the recruitment hub loader intentionally rethrows so a DB error does not masquerade as a cached 404.

**Risk:** users and crawlers can receive plausible empty states or missing content when the database is unhealthy, making a production incident look like legitimate absence of data.

**Remedy:** standardize error semantics by route type. Public entity pages should distinguish genuine not-found from infrastructure failure; do not cache infrastructure failures as 404/empty content. Add error monitoring and an alert for DB connectivity/query failure.

### P1 — Route policy is distributed across route files and older SEO helpers

**Evidence:** the project contains a central `src/lib/seo/index.ts` policy and a separate `src/lib/hreflang.ts` helper. The leaf page currently specifies `alternates: generateAlternates(...)` before spreading `pageSeo(...)`; because `pageSeo` is spread later, it overwrites the earlier alternates object. Thus the stale Hindi alternate helper is not necessarily emitted by that route, but the implementation is confusing and dead code can mislead future changes. The proxy redirects `/hi/... ` and `/en/...` prefixes to unprefixed paths, so locale SEO must remain deliberately disabled until the separate Hindi project.

**Risk:** inconsistent canonical/alternate logic and stale comments can cause accidental reintroduction of invalid hreflang signals.

**Remedy:** during stabilization, remove unused alternate-language generation from the English job routes and centralize canonical/robots output through the existing SEO policy. Do not emit Hindi alternates until real translated pages exist, are indexable, and return 200 without redirect. Keep the future localization effort separate.

### P2 — Structured-data and visible-content parity needs automated verification

**Evidence:** the post leaf has a dedicated `post-leaf-schema.tsx` resolver-gated graph, while the route separately composes metadata and component props. This is a good separation of concerns, but it creates multiple places where facts can diverge unless tested.

**Risk:** Google can reject or ignore markup when the structured data claims facts not visibly supported on the page, or when deadline, salary, employer, or vacancy values differ across UI and JSON-LD.

**Remedy:** test rendered page HTML and JSON-LD together. Assert one canonical URL, one intended JobPosting graph on eligible post leaves only, no JobPosting on hubs/listings, no fabricated fields, and exact parity for salary/vacancies/deadline/employer/source. Run Rich Results Test / Schema Markup Validator on a representative sample after deployment.

### P1 — Supabase security advisor still reports database hardening work

**Evidence:** On 2026-10-25, the connected production Supabase project's advisors reported 32 functions with mutable `search_path` (WARN), one extension in the `public` schema (`unaccent`, WARN), and 64 RLS-enabled tables without policies (INFO). The no-policy findings include many backup/internal schemas and some `public` tables. The same snapshot reported three RLS init-plan warnings, 16 unindexed foreign keys, 6 duplicate indexes, 22 unused indexes, and 65 tables without primary keys (many are backups/staging tables).

**Risk:** mutable function search paths can create name-resolution/security risks depending on function privileges and body. RLS enabled with no policies is normally fail-closed for API roles, but may break intended API access; backups/internal schemas should not be exposed. Index findings can affect performance but should not trigger blind index deletion.

**Remedy:** classify findings by schema and exposure. Inspect each of the 32 function definitions and privileges; pin a safe search path (or schema-qualify references) where appropriate. Confirm no backup/internal schema is exposed through PostgREST and no service-role credentials reach the client. For no-policy tables, explicitly document whether access should be denied or add least-privilege policies only where required. Review duplicate/unused indexes with query plans and usage windows before changing them.

### P2 — Repository documentation contains contradictory routing instructions

**Evidence:** `CANONICAL_ROUTES_DEPLOYMENT_CHECKLIST.md` still describes locale-prefixed routes as a required migration and labels the current English-only routes broken, which conflicts with the currently locked unprefixed URL contract and the explicit decision to defer Hindi.

**Risk:** a future developer or agent may follow obsolete guidance and reintroduce route churn.

**Remedy:** mark the document superseded and point it to the current URL contract; update or archive outdated migration instructions so the repository has one source of truth.

## Read-only production database snapshot (2026-10-25)

The connected Supabase project named `jobs` is active and healthy. The following queries were read-only; no production rows or schema were changed:

- 5,412 recruitments; 4,932 posts; 1,523 organizations; 3,262 legacy `postings`; 32,199 recruitment redirect-table rows.
- Recruitment slugs: no missing/blank slugs and no duplicate recruitment slug groups.
- Post slugs: no missing/blank slugs; 864 globally duplicated slug groups, but **zero** duplicate `(recruitment_id, slug)` groups. Most are reusable role slugs such as `junior-research-fellow` across different recruitments.
- Recruitment redirects: 26,787 actual old-to-new mappings, all target an existing recruitment, with zero actual redirect chains and zero old-slug collisions against current recruitment slugs. The other 5,412 rows are identity mappings (`old_slug = new_slug`) and are not necessarily HTTP redirects.
- Vacancy values: 12 recruitment totals exceed 100,000 and lack an official notification URL; 499 recruitment rows with totals are not in a verified state. There are 130 post totals that are zero/negative, 4,148 plausible positive post totals, and 654 null post totals. Enrichment vacancy totals max out at 33,320.
- 817 live/upcoming recruitments currently reference the unresolved placeholder organization; the sitemap and hub indexability logic exclude this placeholder, but it remains a major content-quality backlog.
- The queried `posts` legacy/camelCase relationship columns had zero disagreement for `recruitmentId` vs `recruitment_id` and `organizationId` vs `employing_organization_id` on rows where both were populated; `recruitmentName` matched the joined recruitment name in the sampled comparison. This does not eliminate broader legacy-column ambiguity.
- Supabase advisors reported 32 mutable-search-path functions, one public-schema extension, 64 RLS-enabled/no-policy tables, 16 unindexed foreign keys, 3 RLS init-plan warnings, 6 duplicate indexes, 22 unused indexes, and 65 no-primary-key tables. Most no-PK/no-policy findings appear to involve backups/staging, but each must be classified before remediation.

These findings refine earlier hypotheses: global duplicate post slugs are expected under the two-segment entity URL contract; the urgent vacancy issue is recruitment-level totals and non-positive post totals, not post totals above 100,000 in the current DB snapshot.

## Release gates (must pass before certification)

### Gate A — Data and identity
- [ ] Production duplicate/empty slug audit completed and all canonical URL collisions resolved.
- [ ] Redirect map audit has zero self-loops, cycles, missing targets, and multi-hop redirects.
- [ ] No public query returns quarantined entities.
- [ ] Recruitment totals and Post totals are separately resolved and trust-gated.
- [ ] Canonical columns and legacy-column disagreement report reviewed.

### Gate B — HTTP and URL behavior
- [ ] Every sitemap URL returns 200 and is self-canonical, or is intentionally excluded.
- [ ] Every legacy URL redirects once to a 200 canonical destination.
- [ ] Random invalid URLs return real 404s, not homepage fallbacks or false 200s.
- [ ] Query/filter URL behavior is intentional and canonical/noindex policy is consistent.
- [ ] `http`, `www`, non-`www`, trailing slash, encoded path and locale-prefix behavior are tested against the chosen domain policy.

### Gate C — SEO and structured data
- [ ] Production canonical origin is exactly the selected HTTPS domain.
- [ ] No unintended `/hi` or `/en` alternates are emitted during stabilization.
- [ ] Sitemap and robots point to the same canonical origin.
- [ ] Eligible post leaves have valid, visible-content-matched JobPosting JSON-LD; hubs/listings do not.
- [ ] Titles, descriptions, H1s, breadcrumbs and canonical URLs refer to the same entity.
- [ ] Schema validation and representative Google Rich Results checks pass.

### Gate D — System reliability
- [ ] Production `DATABASE_URL` and required environment variables are validated without exposing secrets.
- [ ] DB errors do not masquerade as 404s or empty successful pages.
- [ ] Metadata/render query behavior and ISR cache invalidation are measured.
- [ ] GitHub CI and Vercel production deployment refer to the same commit SHA.
- [ ] Post-deploy smoke test covers homepage, jobs listing, at least 10 hubs, 20 leaves, organizations, exams, sitemap, robots, redirect cases, and invalid paths.

## Execution order

1. **Read-only production data audit** (slugs, redirects, source/verification, vacancy trust, legacy-column disagreement).
2. **P0 fixes** (identity collisions and one shared vacancy policy).
3. **Canonical/redirect/sitemap fixes** and tests.
4. **Reliability and caching fixes** with regression tests.
5. **Deploy to production and execute full URL inventory checks.**
6. **Only after stabilization:** separate SEO/GEO/LLM discoverability pass, then separate Hindi localization project.

## Important scope boundary

This report does not authorize destructive database cleanup, bulk slug rewrites, or a broad localization migration. Such actions must follow a read-only report, an explicit mapping/rehearsal, and a rollback plan.
