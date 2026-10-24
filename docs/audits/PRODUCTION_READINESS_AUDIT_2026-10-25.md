# JobOye Production Readiness Audit — 2026-10-25

**Repository:** `blockrao/jobs`  
**Reviewed ref:** `main` at `67b98fcdb8b40b1b26beb66cae965d423989ce51`  
**Scope:** URL/entity architecture, canonical/indexing signals, sitemap/robots, post/recruitment data flow, vacancy integrity, caching, and release verification.  
**Evidence limitation:** This is a repository/code audit plus prior documented production findings. The current environment could not retrieve `https://joboye.com` or its live sitemap/robots endpoints, so this document does **not** claim live HTTP verification. Production database values and rendered HTML must be checked separately.

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

**Evidence:** `src/lib/vacancy-integrity.ts` provides a plausibility predicate and the latest `src/lib/queries.ts` homepage paths apply a stricter gate (verified status, official notification URL, and a 1–100,000 range). However, `src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx` composes page titles/descriptions and passes the visible vacancy value using `enrichment?.vacanciesTotal ?? post.vacancyTotal ?? 0`. The post schema component documents resolver-gated vacancy facts, so visible metadata/UI and structured data may use different policies.

**Risk:** absurd or unverified counts can leak into title tags, descriptions, visible UI, hub cards, related pages, or JSON-LD even after the homepage fix.

**Remedy:**
1. Define one shared typed resolver for recruitment totals and post totals separately; do not conflate the two entity levels.
2. Require evidence/status and semantic ownership for each displayed total. A plausibility cap is a sanity check, not proof.
3. Use the resolved result consistently for H1, title, meta description, visible cards, JSON-LD, and summary components.
4. Omit unknown/untrusted totals; never sum post totals to manufacture a recruitment total.
5. Add contract tests covering each public surface, including metadata and schema output, with implausible and unverified fixtures.

### P0 — Slug uniqueness and lookup determinism need production proof

**Evidence:** `getPostCoreData` in `src/db/operations/get-posts.ts` selects by `p.slug = postSlug` plus recruitment match/redirect mapping and then uses `LIMIT 1` without explicit ordering. The prior audit recorded 279 groups of duplicate live post slugs; those groups must be checked specifically for collisions within the same recruitment and for ambiguity in any lookup that selects by slug alone.

**Risk:** duplicate candidates can make the displayed post nondeterministic or bind a valid URL to the wrong entity. This is a correctness and trust failure, not merely an SEO issue.

**Remedy:**
1. Run read-only production queries for duplicate `posts.slug`, duplicate `(recruitment_id, slug)`, null/empty slugs, and duplicate canonical URL strings.
2. Confirm the actual DB unique constraints/indexes and compare them with the route lookup contract.
3. Where a canonical URL can identify more than one row, quarantine/resolve the data before creating a unique constraint; do not choose a row by arbitrary `LIMIT 1`.
4. Add database-enforced uniqueness for the chosen canonical identity and CI tests for duplicate fixtures.
5. Preserve a redirect only when its target is unique, exists, and is not itself a redirect.

### P0 — Legacy redirects need a complete, executable integrity audit

**Evidence:** `src/proxy.ts` handles locale-prefix redirects, allowlisted legacy exam paths, and sector query redirects; recruitment legacy redirects are resolved by data loaders and route pages. The route code relies on `recruitment_slug_redirects` and `permanentRedirect`.

**Risk:** a redirect mapping can point to a missing target, a quarantined record, itself, or another old slug and create a chain. The source comments say redirects target guaranteed URLs, but this must be verified against current production data.

**Remedy:** create a read-only redirect audit that reports missing targets, self-maps, cycles, multi-hop chains, duplicate old slugs, targets outside the canonical contract, and target routes that return 404. Require every valid mapping to resolve in one hop to a canonical URL and test all mappings after deployment.

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

### P2 — Repository documentation contains contradictory routing instructions

**Evidence:** `CANONICAL_ROUTES_DEPLOYMENT_CHECKLIST.md` still describes locale-prefixed routes as a required migration and labels the current English-only routes broken, which conflicts with the currently locked unprefixed URL contract and the explicit decision to defer Hindi.

**Risk:** a future developer or agent may follow obsolete guidance and reintroduce route churn.

**Remedy:** mark the document superseded and point it to the current URL contract; update or archive outdated migration instructions so the repository has one source of truth.

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
