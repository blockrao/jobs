# JobOye — Search Acquisition Foundation

**Technical implementation specification · Version 1.0**  
**Status:** Governing implementation specification  
**Parent:** Product & Discovery Operating Charter  
**Scope:** Canonical discovery inventory, role taxonomy, reusable discovery services, SEO publication controls and acquisition-page delivery

## 1. Product objective

Build a scalable organic-search acquisition system that connects high-intent government-job searches to accurate, useful and current vacancy information.

The objective is not to maximise the number of indexed URLs. It is to maximise qualified organic discovery while protecting data accuracy, canonical integrity and candidate trust.

## 2. Canonical architecture

Preserve the existing URL contract:

- Recruitment hub: `/jobs/{recruitment-slug}`
- Individual post: `/jobs/{recruitment-slug}/{post-slug}`

Canonical data relationship: `posts → recruitments → organizations`.

The legacy `postings` table must not become the source for new discovery pages. Discovery pages are curated, server-rendered entry points into canonical records; they do not own or duplicate vacancy detail pages.

## 3. Discovery-page taxonomy

**Existing destinations to reuse**
- `/government-jobs`
- `/categories/*`
- `/qualifications/*`
- `/states/*`
- `/organizations/*`
- `/exams/*`
- `/closing-soon`

**First new destinations**
- `/latest-government-jobs`
- `/teaching-jobs`
- `/engineering-jobs`

**Future candidates, subject to evidence**
- `/police-jobs`
- `/apprentice-jobs`
- Medical and healthcare jobs
- Administrative jobs
- Research and scientific jobs

Do not create duplicate pages for existing search intent.

## 4. Data architecture

Introduce an independent role-classification dimension.

### `role_taxonomy`
- id
- parent_id
- slug
- name
- description
- enabled
- display_order

### `post_role_assignments`
- id
- post_id
- role_id
- is_primary
- classification_status
- confidence
- classification_method
- evidence_text
- source_type
- source_reference
- source_locator
- reviewed_by
- reviewed_at
- created_at
- updated_at

Requirements:
- Many-to-many post-to-role assignment.
- Primary and secondary classifications.
- Auditable source evidence.
- Human review and correction.
- No automatic promotion of unreviewed classifications to public SEO inventory.

The final physical schema and indexes must be reviewed before migration.

## 5. Classification policy

Initial role families:
- Teaching: PRT, TGT, PGT, lecturer, professor.
- Engineering: civil, mechanical, electrical, electronics, JE, AE.
- Police/uniformed: constable, SI, ASI, head constable and relevant services.
- Apprenticeship: ITI, graduate, diploma and technician apprentice.

Title matching may generate candidate classifications. It is not sufficient evidence for verified classification.

Where possible, use official notification content and post descriptions. Ambiguous records must enter a review queue.

Qualification classification remains separate. A job title is not proof of educational eligibility.

## 6. Shared discovery-page engine

Build reusable server-side services for:
- Fetching canonical posts and their recruitment/organization relationships.
- Applying the shared lifecycle rules.
- Filtering by reviewed role classification.
- Applying source and verification display policy.
- Sorting and paginating.
- Calculating inventory and indexability eligibility.
- Generating contextual internal links.

Avoid duplicating SQL and business rules inside each page component.

## 7. Latest Government Jobs

**URL:** `/latest-government-jobs`  
**Purpose:** satisfy recent-notification search intent.

Sorting:
1. Plausible notification date, newest first.
2. Deterministic secondary sort.
3. Unknown or placeholder dates must not be presented as recent.

Display, when supported:
- Post title
- Recruiting organization
- Recruitment title
- Notification date
- Vacancies
- Application deadline
- Eligibility summary
- Official notification link
- Official application link

Clearly distinguish upcoming notifications from currently open applications.

This page must remain different from `/government-jobs`, which is deadline-oriented.

## 8. Page quality and publication gates

These are proposed operating thresholds, not search-engine rules:
- At least 30 relevant current posts across 10 distinct recruitments, unless a documented editorial exception is approved.
- At least 90% reviewed classification for role-hub inventory.
- No expired vacancy represented as open.
- Official notification URL for displayed vacancies, or a documented and visibly disclosed exception.
- Unique page-specific editorial content.
- Useful contextual internal links.
- No empty or thin indexable destinations.

## 9. Technical SEO contract

Every indexable discovery page must have:
- Unique title, description and H1.
- Self-referencing canonical.
- Server-rendered crawlable vacancy links.
- Breadcrumb navigation and BreadcrumbList structured data.
- ItemList structured data where appropriate.
- Real pagination links.
- Correct robots and sitemap eligibility.
- No arbitrary indexable filter combinations.
- No JobPosting structured data on listing pages.

JobPosting structured data remains restricted to eligible individual post detail pages.

Sitemap eligibility and page-level robots metadata must use the same shared decision.

## 10. Qualification and state hub remediation

Qualification pages currently use post-name regular expressions. Treat this as a heuristic, not verified eligibility.

Upgrade them to use structured eligibility evidence when coverage becomes sufficient.

State hubs should:
- Use canonical recruitment records.
- Add proper pagination.
- Exclude empty or low-value pages from indexation.
- Remain consistent with sitemap and canonical metadata.

## 11. Testing requirements

Automated tests must cover:
- Canonical URL generation.
- Recruitment and post relationship integrity.
- Lifecycle and deadline handling.
- Placeholder and missing dates.
- Role classification and review status.
- Duplicate assignment prevention.
- Official link presence and provenance.
- Sorting and pagination.
- Empty/thin page indexability.
- Canonical metadata and robots.
- Sitemap parity.
- BreadcrumbList and ItemList validity.
- No JobPosting markup on discovery pages.

## 12. Measurement

Track performance by discovery-page family:
- Indexed eligible URLs.
- Search impressions.
- Organic clicks.
- CTR.
- Average position.
- Non-brand query coverage.
- Vacancy-detail visits.
- Official notification clicks.
- Official application clicks.
- Stale or incorrectly classified vacancy rate.

Use Search Console data to guide subsequent page creation and refinement.

## 13. Delivery sequence

- **P0 — Canonical inventory and data-quality audit.**
- **P0 — Role taxonomy and evidence-backed classification.**
- **P0 — Shared discovery query engine and SEO indexability rules.**
- **P1 — Latest Government Jobs.**
- **P1 — Teaching and Engineering hubs, after classification gates pass.**
- **P2 — Police and Apprentice hubs, after inventory and evidence review.**
- **P3 — Search Console-led optimisation and expansion.**

Execution must respect the charter's current dependency sequence: complete the lifecycle/source/date trust audits and shared publication controls before public role hubs or Latest Jobs are released. Taxonomy design can proceed in parallel as a reviewed design, but production migration/backfill and public exposure remain gated.

## 14. Release policy

A merged pull request is not proof of production deployment.

Each release must pass automated checks, preview validation, production deployment verification and URL-level smoke tests.

Do not submit newly created pages for indexing until the relevant publication gates pass.

---

## Implementation control

This specification is subordinate to the **JobOye Product & Discovery Operating Charter**. If a conflict appears, the charter governs strategy and trust; record the conflict and resolve it before implementation.

All numeric publication thresholds are internal operating gates, not claims about Google ranking or indexing requirements. All public facts and links must remain evidence-backed. No production schema or data mutation is authorised by this document alone.
