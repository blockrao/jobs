# Search and Homepage Discovery Refresh

**Status:** Approved implementation direction  
**Issue:** #195  
**Branch:** `feat/search-home-discovery-refresh`  
**Scope:** Search correctness, search UX, homepage discovery UX and on-page discoverability. No ingestion or data remediation.

## 1. Research synthesis

### Existing JobOye implementation
The homepage already has strong inventory and internal-discovery assets: closing-soon recruitments, largest open recruitments, open notifications, sector/category links, qualification links, topic hubs, organisations, trust messaging and FAQs. The problem is hierarchy and task flow: the page is organised as a long sequence of content blocks, while the first screen must immediately orient a new visitor and provide the fastest routes into current opportunities.

The search implementation has several correctness and UX gaps:
- Full search runs after a short typing debounce, while suggestions also make requests. This creates unnecessary API pressure and interacts poorly with the per-IP request limit.
- The API supports offset pagination, but the UI does not provide a continuation control.
- The UI's `hasMore` signal is inferred from a full page; there is no extra-row/total-count proof.
- Query, filters and sort are not represented in the URL, so state cannot be reliably shared or restored.
- Hindi/Hinglish query parsing can produce an unfiltered open-recruitment browse when no filters are extracted. A failed interpretation must never masquerade as relevant search results.
- Search cards, suggestion dropdown and page layout predate the shared JobOye discovery card visual system.
- Search results intentionally return one result per recruitment and expose matching post leaves. Preserve that contract and canonical URL ownership.

### External research
- Google's faceted-navigation guidance explains how filter combinations can create effectively unbounded URL spaces, waste crawl resources and delay discovery of valuable URLs. Search filter state should therefore be useful to people but not create indexable crawl traps.
- Google's URL guidance recommends readable, stable URLs and minimising unnecessary parameters. Search state can use a small, deterministic set of query parameters while remaining noindex.
- Indeed's job-search guidance supports the basic interaction model: keyword/title search first, then location and filters; result cards should make important fit details scannable.
- FreeJobAlert demonstrates the importance of broad inventory navigation by education and central/state government job groupings.
- SarkariRE demonstrates a qualification-first entry path, bilingual orientation and explicit official-source context. JobOye should take the user-centred patterns, not copy competitors' claims or visual identity.

## 2. Product direction

### Search
1. Keep `/search` as a utility page with `noindex,follow`; do not index arbitrary query/filter combinations.
2. Use explicit submit/Enter for full search. Keep suggestions debounced, abortable and keyboard accessible.
3. URL state is limited to supported query, lifecycle/date filters, location and sort. Restore state on load and use replace/push deliberately; do not encode session or tracking values.
4. Add real pagination with stable offset/limit and a continuation signal backed by an extra fetched row (or an exact total where cheap).
5. Distinguish loading, service failure, no matches, partial matches and no-query browse. Never present a technical failure as zero matches.
6. Keep English, Hindi and Hinglish handling deterministic and honest. If Hindi/Hinglish parsing extracts no valid searchable constraints, do not silently return all open recruitments. Offer a clear refinement path or a safe text-search fallback only where supported.
7. Preserve one result per recruitment and link to the recruitment hub; expose matching post leaves as direct secondary links. Never invent canonical links.
8. Use the shared JobOye opportunity-card language where data contracts match; otherwise create a search-specific card with the same visual tokens and semantic hierarchy.
9. Add contract tests for common Indian government-job queries, abbreviation expansion, partial matching, unsupported/ambiguous Hindi, filter composition, pagination and canonical link behavior.

### Homepage
1. The first screen should answer three questions: what JobOye covers, how to search, and where to browse if the visitor is not sure what to type.
2. Primary action: a prominent search field with examples (post, exam, organisation, qualification/state) and a clear submit button.
3. Secondary quick paths: Latest Government Jobs, Closing Soon, All Government Jobs, and popular categories.
4. Put actionable current opportunity inventory above long-form explanation. Prioritise open opportunities and clear deadlines; do not manufacture vacancy or freshness claims.
5. Offer browse-by-category, state and qualification pathways in clear grouped blocks; avoid overwhelming visitors with a huge unstructured link wall.
6. Retain organisation discovery and genuinely useful guides, but place them after the core job-finding journey.
7. Keep trust messaging concise and precise; official-source claims must remain supported by the existing product contract.
8. Keep key homepage content server-rendered and crawlable. Client-side locale switching must not become the only way core content appears.
9. Keep structured data limited to visible content and appropriate types; do not add JobPosting markup to the homepage.

## 3. Visual system
- Clear page-width and section rhythm; a high-contrast, restrained brand hero rather than an oversized decorative banner.
- Strong bordered white cards with readable titles and compact metadata.
- Search controls sized for touch, visible labels, keyboard focus and predictable dropdown behavior.
- Responsive mobile-first layout: one-column result cards and filters on small screens; denser filter/result layout on desktop.
- No decorative urgency colour without visible text; colour supplements status labels rather than replacing them.

## 4. SEO and crawl guardrails
- Search utility stays noindex/follow and has a stable canonical.
- Search parameter variations must not enter XML sitemaps or internal SEO navigation.
- Keep internal links to curated canonical hubs and recruitment/post pages.
- Search page must not emit JobPosting schema.
- Homepage title/description and visible H1 must reflect the real service, not unsupported superlatives or year-stamped claims that go stale.
- Structured data must describe only visible, accurate homepage content.

## 5. Release gates
- Unit/contract tests for query handling, URL state, pagination and canonical links.
- Lint and application type-check.
- Verify representative queries: `SSC CGL`, `B.Tech jobs in Haryana`, `12th pass railway jobs`, `bank clerk`, Hindi and Hinglish variants, and no-result terms.
- Inspect homepage and search page at desktop and mobile widths.
- Verify title, description, canonical, robots, server-rendered content, accessibility, no JobPosting on search/home, and pagination.
- Exact-head CI and preview verification before merge. Production rollout only after Vercel deployment and live-page checks.

## 6. Explicit exclusions
No ingestion, extraction, data completeness, source provenance remediation, lifecycle data correction, database schema redesign or broad infrastructure changes. Existing canonical data contracts are consumed as inputs.
