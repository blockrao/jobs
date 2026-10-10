# Site-wide locale route matrix

**Status:** Inventory established 2026-10-10; site-wide implementation is not complete.  
**Source of truth:** `IMPLEMENTATION_ROADMAP.md`, SEO-001 public-representation policy, and `ADR_JOB_ROUTE_LOCALE_DISPATCH.md`.  
**Requirement:** Every public page family must support an intentional Hindi experience under `/hi`. A route that silently strips `/hi` is a temporary compatibility behavior, not completion.

## Route-family inventory

| Public family | English route(s) | Locale counterpart currently present | Current status / required action |
|---|---|---|---|
| Home | `/` | No usable `/hi` home route | P0: root route conflicts with legacy `/[locale]` exam redirect. Resolve root route architecture before adding Hindi home. |
| Jobs listing/search | `/jobs`, `/search` | `/hi/jobs`; no `/hi/search` | P0: make search and filtered listing routes locale-aware; preserve query/filter semantics. |
| Recruitment hub | `/jobs/[recruitment-slug]` | `/hi/jobs/[slug]` compatibility page | Partial: share entity dispatch and SEO policy; Recruitment is transitional/noindex. |
| Canonical Post Leaf | `/jobs/[recruitment-slug]/[post-slug]` | `/hi/jobs/[recruitment-slug]/[post-slug]` | Partial: route exists, but current implementation renders English Post data, is noindex, canonical to English, and has no hreflang. Keep this until genuine Hindi fields/content exist. |
| Legacy flat Posting URL | `/jobs/[posting-slug]` | `/hi/jobs/[posting-slug]` compatibility dispatch | Fix in PR #32: both trees should permanently redirect to the canonical leaf when relationship is known; preserve `/hi`. |
| Position/role hub | `/posts/[slug]` | None | P0: add Hindi route using shared hub data and page component; fallback policy must be explicit. |
| Posts index | `/posts` | None | Add locale counterpart or deliberately classify as a redirect; don't silently strip locale. |
| Exam hub/detail | `/exams`, `/exams/[slug]` | Both exist | Partial: validate actual translated fields, canonical/hreflang, and list/detail link preservation. |
| Organization detail/index | `/organizations/[slug]`, `/organizations` | Detail exists; index missing | Add index counterpart; audit translated names and detail metadata. |
| Articles detail/index | `/articles/[slug]`, `/articles` | Detail exists; index missing | Add index counterpart; use real translated article fields before enabling hreflang. |
| Commission detail/list | `/commissions/[slug]` | Detail exists; list missing | Add list route if public; ensure exam links preserve locale. |
| Recruitment index | `/recruitments` | None; detail is redirect alias | Add locale counterpart or explicit redirect policy. Keep detail alias permanently redirected, not a second hub. |
| Position index/detail | `/positions`, `/positions/[slug]` | Detail exists; index missing | Add index counterpart; keep role discovery canonical policy consistent with `/posts/[slug]`. |
| State index/detail | `/states`, `/states/[slug]` | None | Add locale routes; use translated names only where genuine. |
| Category index/detail | `/categories`, `/categories/[slug]` | None | Add locale routes or explicit redirect policy; filter/query variants remain noindex. |
| News | `/news` | None | Add `/hi/news` or explicitly retire/redirect it. Current proxy strips the prefix. |
| Static information | `/about`, `/contact`, `/privacy`, `/terms` | None | Add locale pages and reviewed translations; privacy/terms translations require content/legal review. |
| Reports / review | `/reports`, `/fja-review` | None | Decide public vs operational status; localize only public content. |
| Admin | `/admin/*` | Not required | Keep admin non-localized; preserve authentication and redirects. |
| Preview routes | `/preview/*`, JKSSB preview | Not necessarily | Treat as explicit preview exceptions; never index or route them through generic locale dispatch by accident. |
| API / assets | `/api/*`, static files | Not required | Exclude from locale routing and redirects. |

## Rules for the eventual implementation

1. The URL is authoritative. Do not use `Accept-Language` or a cookie to redirect between English and Hindi.
2. English remains unprefixed; Hindi is under `/hi`. Never create `/en` canonical URLs.
3. Every family must have a deliberate route classification. No generic middleware rule should strip `/hi` simply because the counterpart is not implemented yet.
4. Reuse data access and shared UI components. Avoid copied English/Hindi page implementations drifting in data resolution, fact ownership, or structured data.
5. An English-fallback Hindi page is reachable but `noindex, follow` and canonical to English until genuinely translated content exists. No hreflang for a translation that does not exist.
6. Emit reciprocal hreflang only when both versions are translated and indexable. Sitemap alternates must match page metadata.
7. Preserve locale in old-slug redirects. Do not let middleware convert a valid `/hi/jobs/...` URL into English.
8. The route family, page language, canonical, robots, hreflang, sitemap and structured data must agree.
9. Preserve existing admin auth, API/static exclusions, and the explicit JKSSB preview exception.
10. Release in batches; verify direct load and client navigation for every family on a fresh preview before production promotion.

## Immediate implementation order

- [x] Centralize job route classification and canonical route helpers.
- [x] Add English flat Posting → canonical Post Leaf fallback in `/jobs/[slug]`.
- [x] Preserve `/hi` through legacy Recruitment slug redirect paths.
- [x] Add regression tests for English/Hindi legacy redirect-path construction.
- [ ] Confirm CI on latest PR #32 head.
- [ ] Verify HTTP redirect status and Location for the supplied UPSC Law Officer URL in a fresh preview.
- [ ] Verify the same redirect and locale preservation under `/hi`.
- [ ] Phase 1: design route-tree/root-layout migration to remove the `/[locale]` legacy-exam collision and support Hindi home safely.
- [ ] Phase 2: implement missing route counterparts in the P0/P1 order above.
- [ ] Phase 3: validate the complete SEO and navigation matrix; only then claim site-wide multilingual readiness.
