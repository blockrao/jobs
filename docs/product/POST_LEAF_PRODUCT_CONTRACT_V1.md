# JobOye Post Leaf Product Contract

**Version:** 1.0  
**Status:** Implementation contract draft  
**Owner:** JobOye Product / Engineering  
**Scope:** Individual Post Leaf at `/jobs/[recruitment-slug]/[post-slug]`  
**Architecture constraint:** Recruitment and Post are separate entities. A Post Leaf describes one normalized role within a Recruitment. It must not silently inherit facts from sibling Posts or turn Recruitment-wide facts into Post facts.

## 1. Product outcome

A candidate should be able to understand the specific role, judge whether it may be relevant, verify material facts against the responsible official source, and reach the correct application path without reconstructing the recruitment from multiple pages or PDFs.

The page is not successful merely because every section exists. It is successful when facts are correct, scoped to the right entity, useful on mobile, current enough to act on, and transparent about uncertainty.

## 2. Non-negotiable data and trust rules

1. **Source before completeness.** Never invent or infer a value to fill a blank. A field is displayable only under the applicable resolver/evidence contract.
2. **Entity ownership.** Post-owned facts belong to this Post. Recruitment-owned facts may be presented as recruitment context and clearly labelled as such. Organization-owned facts belong to the canonical organization. No sibling-Post leakage.
3. **Unknown is not false, zero, open, or not applicable.** Distinguish:
   - known value;
   - not stated in the available official source;
   - not verified by JobOye;
   - conflicting sources / needs review;
   - not applicable (only when evidence supports this);
   - closed/expired (only when a reliable deadline and applicable timezone/status rule support it).
4. **No misleading authority claims.** Do not say “verified”, “officially confirmed”, “complete”, or “last checked” unless the page has evidence and a recorded check timestamp supporting that exact claim.
5. **No URL-purpose substitution.** Application portal, official notification, employer website, and third-party reference are different link types. Never label a generic homepage or aggregator as the application portal or official notification.
6. **No fabricated totals.** Do not sum incomplete Post counts to create a Recruitment total. Do not present a Recruitment total as this Post's vacancy count.
7. **Conflict-safe.** If two candidate values conflict and precedence cannot be proven, surface the uncertainty or omit the fact; do not silently pick whichever is convenient.
8. **Display and structured-data parity.** Schema.org facts must be supported by the same resolved facts visible to candidates. Never use richer JSON-LD than the page can substantiate.
9. **Graceful degradation.** Missing optional data must not break the page, create empty headings, or block access to known facts and official sources.
10. **Preserve source evidence.** Enrichment or rewriting must not overwrite raw source material or remove provenance.

## 3. Information architecture and page hierarchy

### P0 — first-screen decision layer

- Breadcrumbs: Jobs → Organization (when known) → Recruitment → Post.
- One clear H1 using the Post title; show organization and relevant location only when known.
- Application state: open / closed / deadline unknown, only when supported by resolver output.
- Compact “At a glance” facts, conditionally rendered:
  - Post-specific vacancy count;
  - qualification / discipline summary;
  - age limit and reference date, when sourced;
  - salary / pay level, when authoritative;
  - work location;
  - employment type / service terms;
  - application deadline.
- Primary CTA: apply only when an application endpoint passes the application-URL resolver; label the destination honestly.
- Secondary CTA: official notification only when its URL passes the notification resolver.
- Share action must work or not render. No dead `#` links.
- On mobile, keep the title, application status, deadline (if known), and primary action easy to find without a large decorative hero.

### P1 — complete candidate decision detail

Render the following sections only when relevant evidence/data exists. If a section is important but its data is unknown, use a concise, honest state only where it helps the candidate; do not fill the page with repeated “See Notification” text.

1. **Vacancy details:** this Post's total; official category/reservation breakdown; location/category allocations. Show source basis and totals only when they reconcile. Never fabricate a breakdown.
2. **Eligibility:** qualification level, accepted disciplines/subjects, marks/CGPA semantics, experience, age limit and calculation date, category relaxations, nationality/residency, physical/medical requirements, licences, and other mandatory conditions where stated. Keep minimum requirements distinct from preferred criteria. Do not show a computed “eligible/not eligible” verdict in this phase.
3. **Pay and service:** pay level/matrix or scale, grade/pay components when stated, currency and pay period, allowances only when supported, employment type, tenure, probation, cadre/group, and service conditions.
4. **Important dates:** notification/publication date, application start, application end, fee deadline, correction window, exam/interview/admit-card milestones when confirmed. Preserve source timezone/date-only semantics; do not imply an exam date when unknown.
5. **Selection process:** only the confirmed process and stages. Recruitment-wide process must be labelled as such if shown on a Post Leaf.
6. **Application fee:** category-wise fee, exemptions, payment mode and fee deadline only when sourced.
7. **How to apply:** correct application URL and mode, ordered instructions grounded in the notification, and the distinction between applying on an external portal and reading a notification. No generic steps that imply a portal is verified when it is not.
8. **Documents required:** only stated/verified documents; separate mandatory from conditional documents.
9. **Role and service details:** duties, responsibilities, reporting/work location, tenure, probation, and other conditions where the official source provides them.
10. **Official sources and verification:** separate notification and application links; source organization; evidence/verification state; last-checked timestamp only when actually recorded; correction/report issue affordance if supported.
11. **Recruitment context:** link to the canonical Recruitment Hub and sibling Posts. Label Recruitment-wide facts; do not imply sibling vacancy counts are this Post's count.
12. **Related opportunities:** relevant canonical Position hub and related Posts, without keyword-stuffed link blocks.
13. **FAQs / direct answers:** include only useful questions answered by facts already resolved on this page or by an explicitly cited source. No invented answers, repetitive boilerplate, or FAQ markup solely for rich-result targeting.

## 4. Fact contract

For each candidate-facing fact, engineering must be able to answer:
- What is the entity owner: Post, Recruitment, or Organization?
- Which canonical source/table/related row owns it?
- Which query loads it?
- Which resolver validates it and what are its acceptance/rejection rules?
- Which component displays it?
- Which structured-data field, if any, consumes it?
- What is the expected behavior for missing, invalid, stale, partial, or conflicting data?
- What automated test protects this behavior?

Canonical resolver contracts remain the source of truth for rendering. Do not add a UI-only fallback that bypasses validation. If a needed fact is unavailable through a resolver, fix the source-to-resolver path or document why the value cannot yet be trusted.

## 5. SEO, GEO, AEO and crawlability

- Post Leaf is the canonical individual-role destination. Canonical URL, internal links, sitemap inclusion and indexability must agree with the settled URL contract.
- Recruitment Hub and Post Leaf have distinct purposes. Do not index duplicate thin projections of the same entity.
- Server-render essential title, facts, source links and explanatory content. Core information must not require client-side interaction to exist in HTML.
- Use descriptive title/meta description based only on resolved facts. Do not generate stale or misleading “Apply in N days” copy from unstable render-time values without a deliberate cache-safe strategy.
- Emit `JobPosting` JSON-LD only when the page genuinely describes one specific job/post and all required properties are supported. Follow current Google Search Central requirements; omit unsupported properties, keep JSON-LD in parity with visible content, and implement expiry/closed-job behavior deliberately.
- Validate JSON-LD syntax, required/recommended fields, entity identity, employment type, organization, location, dates, canonical URL, and lifecycle state in automated tests.
- Use semantic HTML, one meaningful H1, ordered heading levels, descriptive internal-link text, crawlable anchors, accessible focus states, and no dead links.
- Create original value through accurate role-specific synthesis, source-grounded explanations, useful comparison/context, and clear uncertainty—not templated filler or scaled near-duplicate paragraphs.
- GEO/AEO readiness means answerable, well-scoped, source-attributed facts and concise direct answers; do not promise rankings, AI citations, or rich-result display.
- Do not add FAQ structured data unless current search-engine policy and actual content eligibility justify it; visible FAQs must help candidates regardless of markup.

## 6. Performance, accessibility and interaction

- Prioritize server-side data loading and avoid avoidable serial requests, duplicate database reads, and client-side fetches for core content.
- No dead buttons, placeholder `href="#" `, misleading CTAs, or controls with no action.
- Responsive at 320px–desktop with no horizontal overflow; readable type, visible focus, keyboard-operable links/actions, meaningful link labels, and adequate touch targets.
- Avoid layout shifts from late-loading content; use optimized/lazy-loaded media only where media is actually needed.
- Measure real route performance before setting numerical budgets. Establish baseline LCP, INP, CLS and server/route latency, then set enforceable budgets based on production measurements rather than arbitrary promises.

## 7. Change/freshness and candidate confidence

Future-capable, not a prerequisite to falsely claim today: record source checks and material changes with timestamps and evidence references; show what changed and when only after a reliable change-history source exists. A future notification-change tracker should compare source-backed facts, not generated prose alone. Application-readiness checklists and eligibility pathways must remain non-judgmental until data quality, rule semantics and a separately approved eligibility engine are ready.

## 8. Acceptance criteria

### P0 — must pass before declaring the Post Leaf reliable

- [ ] Post facts and Recruitment facts remain separated throughout query → resolver → UI → JSON-LD.
- [ ] Populated authoritative values render; missing values do not become fabricated values or empty sections.
- [ ] Post vacancy totals are sourced from the correct Post record or validated breakdown; Recruitment totals are never substituted or summed from incomplete Posts.
- [ ] Application and notification links have distinct, correct labels and verified destination semantics; no dead or mislabelled links.
- [ ] Date/status behavior covers open, closed, unknown, date-only/timezone and invalid-date cases.
- [ ] Partial salary ranges are not rendered as complete ranges; unsupported salary is omitted.
- [ ] Eligibility cannot leak from a sibling Post; minimum and preferred conditions are not conflated.
- [ ] The page does not claim verification/completeness/freshness without supporting evidence.
- [ ] The Post Leaf's canonical, indexability, sitemap and internal-link behavior match the approved URL architecture.
- [ ] JSON-LD is valid, entity-correct, visible-content-consistent, and lifecycle-safe.
- [ ] No broken links or nonfunctional actions in the rendered page.
- [ ] Automated regression tests cover missing, populated, conflicting, related-row-only, and multi-Post cases.
- [ ] Production link/route behavior is verified before claiming deployment success.

### P1 — quality and usefulness

- [ ] Candidate can find deadline, application state, essential eligibility, pay and apply/notification actions quickly on mobile when the data exists.
- [ ] All applicable sections use the fact contract; no repeated placeholder copy across the page.
- [ ] Recruitment Hub, sibling Posts and Position hub links are correct and semantically labelled.
- [ ] Accessible headings, keyboard interaction, visible focus, responsive layout and no horizontal overflow are tested.
- [ ] Performance baseline and regressions are measured on representative Post Leaves.

### P2 — differentiated capabilities after data quality foundation

- [ ] Source-backed change history and freshness indicators.
- [ ] Candidate document/application checklist based only on confirmed requirements.
- [ ] Explainable eligibility pathways after separate Phase 2 contract and testing.
- [ ] Useful role/recruitment FAQs grounded in verified page facts.
- [ ] Candidate feedback/correction workflow with moderation and evidence capture.

## 9. Required test matrix

Every P0 fact path must include as applicable:
1. authoritative value populated on Post;
2. authoritative value populated on Recruitment;
3. value present only in a related row;
4. missing value;
5. invalid or malformed value;
6. conflicting candidate fields;
7. partial values (e.g. one salary bound or incomplete category breakdown);
8. multiple Posts under one Recruitment;
9. stale/expired value;
10. correct UI rendering and correct JSON-LD omission/inclusion;
11. correct CTA destination and label;
12. mobile/keyboard behavior.

Tests must assert outcomes, not just that components render. Do not weaken tests to make a change pass.

## 10. Delivery sequence and release gates

1. **Baseline:** inventory existing components, data paths, SEO/URL behavior, broken actions, and performance; map findings to the existing `RECRUITMENT_POST_DATA_TO_UI_INTEGRITY_REGISTER.md` rather than creating a duplicate audit register.
2. **P0 integrity:** fix fact-path, entity ownership, URL purpose, dates, vacancy, salary, eligibility and trust-claim issues with regression tests.
3. **Page usability:** prioritize the first-screen decision layer, responsive hierarchy, empty states and functioning actions.
4. **SEO/structured data:** validate canonical/indexability, metadata, JSON-LD parity and lifecycle.
5. **Completeness:** connect already-stored canonical related data to the correct UI where safe; do not perform production backfills or schema changes without explicit approval.
6. **Differentiation:** only then add freshness/change history, checklist and future eligibility features.
7. **Release verification:** run typecheck/build/tests and route-level checks; review CI and diff; verify representative live pages and external destinations. No merge/deployment or production data write without explicit authorization.

## 11. Success measures

Track source-fact fidelity and cross-entity leakage; percentage of eligible facts rendered correctly; broken/mislabelled CTA rate; time to find deadline/eligibility/apply action in usability checks; mobile performance and accessibility regressions; structured-data validity; freshness lag where recorded; search impressions/clicks and qualified visits. Separate implementation completion from observed candidate/search outcomes.

## 12. Reference material

- Google Search Central — JobPosting structured data: https://developers.google.com/search/docs/appearance/structured-data/job-posting
- Google Search Central — Creating helpful, reliable, people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Existing data integrity register: `docs/audits/RECRUITMENT_POST_DATA_TO_UI_INTEGRITY_REGISTER.md`

These references are implementation constraints, not guarantees of rankings or rich-result eligibility.
