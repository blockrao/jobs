# Government Jobs Hub — UX and Discovery Specification

**Date:** 2026-10-31  
**Route:** `/government-jobs`  
**Status:** Implemented on draft PR #190; awaiting CI and rendered-page verification  
**Product owner:** JobOye Product Manager / Internet Architect

## 1. Product objective

Turn the national government-jobs directory into a premium, high-trust discovery experience that helps job seekers quickly identify relevant recruitment opportunities, understand their context, and reach the canonical post page.

The page is a discovery hub, not an application portal and not a substitute for the recruiting body's notification.

## 2. Experience direction

- Light, editorial interface with a restrained navy and indigo visual system.
- Clear typographic hierarchy, generous spacing, high-contrast actions and compact, scannable job cards.
- Mobile-first responsive layout; cards remain a single readable column on small screens.
- A strong page introduction, inventory summary, sector navigation, primary job list and contextual discovery sidebar.
- Use typographic organisation initials as a robust fallback rather than introducing an unverified logo dependency.
- No decorative interaction that does not work.

## 3. Information architecture

1. Breadcrumb: Home → Government Jobs in India.
2. Hero: H1, current-year context, plain-language description, links to Search and Closing Soon, live inventory count and sector count.
3. Sector navigation: six canonical sector hubs, each with its current post count.
4. Main inventory: current and upcoming canonical Post leaves, with status, available vacancy count, post title, organisation, parent recruitment and available application deadline.
5. Contextual sidebar: existing qualification, state, category and closing-soon destinations plus an apply-safely checklist.
6. Supporting guidance: concise use instructions and visible FAQs.
7. Crawlable pagination: sequential previous/next anchors.

## 4. Job-card content contract

Use only fields already returned by `listLivePostsBySector`:
- Post title and canonical post-leaf URL.
- Organisation name and organisation hub URL.
- Parent recruitment name and recruitment hub URL.
- Recruitment lifecycle status.
- Vacancy count only when a positive value is present.
- Application deadline only when the shared lifecycle resolver returns a plausible date.

Do not invent or imply qualification, salary, location name, official verification, application availability or an apply action when the listing query does not provide those facts. The individual detail page remains the place to inspect richer information.

## 5. Search and AI discovery invariants

- Preserve the canonical hierarchy: recruitment hub `/jobs/{recruitment-slug}`; post leaf `/jobs/{recruitment-slug}/{post-slug}`.
- Every job title links directly to its canonical post leaf.
- Organisation and parent recruitment links preserve entity relationships.
- Render the meaningful listing content and links on the server.
- Keep descriptive HTML anchor text and semantic headings.
- Retain BreadcrumbList and ItemList structured data; add CollectionPage context. Never add JobPosting markup to this listing page.
- Keep page-number URLs distinct and sequentially linked. The page number is reflected in canonical metadata and ItemList positions.
- Do not introduce indexable filter/sort parameter combinations or client-only infinite scroll.
- Do not claim that JobOye is an official recruiting authority or that a listed link is independently verified.

## 6. Explicit non-goals

- No schema or database migration.
- No new filtering/search backend.
- No new query-parameter URL space.
- No changes to canonical URLs, redirects, sitemap eligibility or lifecycle policy.
- No mass creation of state/qualification/category landing pages.
- No use of JobPosting structured data on this directory page.
- No deployment or merge implied by this specification.

## 7. Acceptance criteria

### Product and UX
- Clear H1 and page purpose visible immediately.
- Sector links and primary search/closing-soon paths are easy to find.
- Cards expose the key available decision facts without overclaiming.
- Mobile layout has no horizontal overflow and keeps actions touch-friendly.
- Empty, loading/error and pagination states remain understandable.
- Links are keyboard accessible with visible focus treatment.

### Search and machine readability
- One meaningful H1; ordered H2/H3 hierarchy.
- Breadcrumb, CollectionPage and ItemList JSON-LD agree with visible page content.
- No JobPosting schema on the listing.
- Canonical page and paginated URLs are correct.
- All canonical job, recruitment and organisation links are ordinary crawlable anchors.
- No filters generate uncontrolled crawlable URL combinations.

### Engineering and release
- Existing lifecycle and publication gates remain unchanged by presentation work.
- Type-check, lint and contract tests pass on the final PR head.
- Inspect rendered HTML for metadata, links and JSON-LD.
- Verify mobile and desktop layouts, keyboard focus and no horizontal overflow.
- Verify production only after approved merge and deployment; no claim of production availability before then.

## 8. Measurement after release

Establish a baseline and monitor:
- Search Console impressions/clicks and query coverage for the hub.
- Organic clicks from the hub to canonical post leaves.
- Click-throughs to organisation and recruitment hubs.
- Engagement with sector and Closing Soon paths.
- Mobile Core Web Vitals and page errors.
- Crawl/indexing status of paginated pages and linked canonical leaves.

Do not use raw indexed URL count as the success metric. The goal is qualified discovery and useful progression to real recruitment opportunities.
