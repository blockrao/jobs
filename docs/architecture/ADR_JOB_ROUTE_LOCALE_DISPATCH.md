# ADR — Job route dispatch, canonical leaves, and locale handling

**Status:** Implemented on `fix/seo-policy-contracts`; pending CI and preview verification  
**Scope:** Public job URLs, `src/proxy.ts`, `src/i18n/locale-aware-paths.ts`, SEO metadata, language switcher  
**Related contracts:** SEO-001 public representation policy; Recruitment → Post architecture; canonical Post Leaf route contract

## Context

JobOye has two overlapping generations of public job routes:

- `/jobs/[slug]` is a compatibility endpoint. Historically it has been used for both Recruitment hubs and flat scraped Posting records.
- `/jobs/[recruitment-slug]/[post-slug]` is the canonical individual Post Leaf.
- `/posts/[slug]` is the role/Position discovery hub.
- The locale route tree includes both one-segment job compatibility pages and two-segment Post Leaves. The middleware path classifier must reflect that actual route tree.

The old implementation had a dead nested-slug branch in the one-segment `[locale]/jobs/[slug]` page, excluded two-segment Post Leaves from locale middleware, and treated legacy flat Posting URLs as independently indexable pages. Recruitment metadata also differed between the default and locale route implementations, and Hindi hub metadata skipped Recruitment resolution.

## Decisions

1. **The URL locale is authoritative.** English remains unprefixed; Hindi is served under `/hi`. Do not use browser-language negotiation to redirect visitors between languages.
2. **The locale classifier follows concrete route shapes.** `/jobs/[slug]` and `/jobs/[recruitment-slug]/[post-slug]` are locale-aware. Unsupported deeper paths are not routed through next-intl. The language switcher uses this same classifier.
3. **A flat Posting URL is not a second canonical detail page.** When the Posting resolves to both a canonical Recruitment and canonical Post, permanently redirect `/jobs/[posting-slug]` to `/jobs/[recruitment-slug]/[post-slug]`. Preserve `/hi` when the old URL was requested under Hindi.
4. **Recruitment hub URLs are transitional and noindex.** If every linked Post resolves to the same Position, canonicalize the hub to `/posts/[position-slug]`. If the Recruitment spans multiple Positions, do not guess a role; keep it noindex with a self-canonical until the product has a deliberate multi-role hub representation.
5. **Untranslated Hindi remains reachable, not indexable.** The Hindi Post Leaf route may render field-level English fallbacks, but until genuine Hindi content exists it remains `noindex, follow`, canonical to the English Post Leaf, and has no hreflang. Do not emit duplicate JobPosting structured data on that noindex route.
6. **No data mutation is part of this route refactor.** Recruitment and Post identity, ownership and lifecycle remain database/domain concerns; URL resolution must not infer identity from slug text alone.

## Required verification

- `isLocaleAwarePath` tests cover both one- and two-segment job routes, Hindi-prefixed equivalents, unsupported deeper paths, and the intentionally excluded JKSSB preview route.
- Pure route helper tests cover canonical leaf URL construction, preserving `/hi`, unambiguous single-Position hub canonicalization, and mixed-Position safe fallback.
- CI must pass the architecture contract suite and application/contract TypeScript checks.
- A fresh Vercel preview must verify HTTP redirect status/location, `<html lang>`, canonical and robots metadata, and absence of duplicate JobPosting JSON-LD.
- Production promotion remains blocked until the fresh preview and release gates pass.

## Site-wide multilingual requirement (added 2026-10-10)

The product requirement is that every public page family must be capable of serving a deliberate language experience under `/hi`. This is **not yet implemented site-wide**. The current route tree has locale-aware counterparts only for selected families; the proxy currently redirects unsupported `/hi/*` paths to unprefixed paths. That is a legacy fallback, not a valid final multilingual contract.

Do not solve this by blindly routing every URL through next-intl or by adding a generic catch-all that renders unrelated content. The existing root-level dynamic exam redirect at `/[locale]`, two root layouts, and several overlapping job route shapes make indiscriminate dispatch risky. The route-family inventory and migration must be deliberate, shared page components should be reused, and the URL prefix must remain authoritative.

Rollout acceptance criteria:
- Every public route is explicitly classified as localized/translated, localized with English fallback (noindex + English canonical), English-only canonical, or retired/redirected.
- All intended public families have working `/hi` counterparts and the language switcher lands on the equivalent route.
- Server-rendered `html lang`, canonical, robots, hreflang, sitemap and structured data agree with actual rendered language.
- Hindi fallback does not get indexed as duplicate English content; hreflang is emitted only for genuine translated, indexable pairs.
- Middleware preserves locale through both old-slug redirects and route dispatch; API, static assets, admin auth, and the JKSSB preview exception remain unchanged.
- Direct requests and in-app navigation are verified in a fresh preview for every route family before rollout.

## Confirmed compatibility-route defect and fix (2026-10-10)

The production UPSC Law Officer URL resolves to Posting 227, Recruitment 204, Post 3, Position `law-officer`. It is a legacy flat Posting slug, not a Recruitment slug and not a duplicate Post. The English `(default)/jobs/[recruitment-slug]` page previously queried Recruitment only, so it could 404 instead of consolidating the URL. The locale one-segment route already attempted Recruitment then Posting and redirected when canonical links existed. The English route now mirrors that fallback and permanently redirects to the canonical Post Leaf. The proxy's legacy Recruitment redirect now retains `/hi`, and `/recruitments/[slug]` aliases use permanent redirects.

## Follow-up backlog

- Verify the target URL `/jobs/upsc-law-officer-land-building-department-delhi-2026-t7rx` returns a permanent redirect to `/jobs/land-and-building-department-govt-nct-delhi-2026-01/law-officer-jobs`.
- Verify the Hindi counterpart redirects to the `/hi/jobs/...` Post Leaf and that its metadata follows SEO-001.
- Audit internal links and sitemap entries so only canonical Post Leaves and approved role hubs are promoted as indexable targets.
- Later, add genuinely translated Hindi hub/leaf content and reciprocal hreflang only when the required translated fields exist.
