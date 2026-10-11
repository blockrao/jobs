# Implementation Roadmap: Graph Model & Canonical Hubs

## Product architect execution checkpoint — 2026-10-11

This checkpoint supersedes any assumption that an open PR or READY deployment is release acceptance. Work is ordered by public correctness and data integrity, not by ingestion throughput.

### P0 — Public candidate experience (in progress; branch changes not yet production)

- [x] Replace the internal `/fja-review` page with `notFound()` and noindex metadata on the SEO-policy branch. Commit: `720ec781c8de51a2a54533f170e67a8e00d512b3`.
- [x] Remove inventory/extraction panels and source-comparison copy from the public Recruitment Hub component on the SEO-policy branch. Commit: `158b19ffe9e9c96d71a44c67a8b56a859ed29e36`.
- [ ] CI and preview verify that `/fja-review` is a real 404; representative hubs/leaf pages expose no internal inventory or source-review fields; official notification/application links remain resolver-approved only.
- [ ] Confirm no public FreeJobAlert/source-aggregator branding remains in rendered pages, navigation, metadata, structured data, sitemap, or error states. Internal ingestion provenance may remain in restricted/backend tooling.

### Sitemap indexability correction — 2026-10-11

- [x] Exclude Recruitment Hub `/jobs/{recruitment-slug}` URLs from sitemap output because the hub is supporting/noindex.
- [x] Exclude a legacy posting `/jobs/{slug}` entry when its slug collides with a Recruitment Hub; otherwise the sitemap advertises a non-indexable route.
- [x] Add a sitemap contract regression test for the collision.
- [x] Architecture contract tests, application type-check, and contract-test type-check passed on commit `a6b7052720bd32c685009be20de9300ad6e37e8f`.
- [ ] Full CI remains red because repository lint reports 278 errors / 88 warnings, mostly pre-existing `no-explicit-any` violations. Do not suppress rules; establish a measured baseline and remediate in bounded batches.
- [ ] Preview/production sitemap XML and HTTP behavior still require verification. This code is not deployed.

### P0 — Canonical serving and SEO release gate

- [ ] Verify PRs #48 and #51 together: canonical Recruitment-scoped Post Leaf resolution, legacy slug redirects, English/Hindi route parity, page/entity metadata agreement, robots, canonical, JobPosting JSON-LD dates, and sitemap policy.
- [ ] The current production audit observed `/hi/jobs/...` output with `lang="en"` and English canonical metadata, and no Hindi URLs/hreflang alternates in the inspected sitemap. Treat this as an open defect until preview tests demonstrate the intended untranslated-Hindi noindex/follow policy and genuine-translation hreflang policy.
- [ ] Verify representative live HTML and HTTP status for English/Hindi hubs and leaves, unknown slugs, `/fja-review`, sitemap, and robots. A Vercel READY state alone does not pass this gate.
- [ ] Keep lint debt transparent; do not disable checks or weaken architecture contracts to manufacture green CI.

### P0 — Data-injection readiness gate (not ready for canonical promotion)

- [ ] Capture raw source material with stable provenance and capture timestamps; the last audited production snapshot had zero rows in `fja_source_captures`.
- [ ] Complete extraction coverage reporting for recruitment-level and role-level fields, distinguishing “not present in source” from “not extracted”.
- [ ] Verify material facts against official notification/application sources; record field-level evidence and unresolved discrepancies.
- [ ] Dry-run deterministic identity matching and reconciliation for Organization, Recruitment, Post, and Position; route ambiguous or multi-role notices to review.
- [ ] Demonstrate idempotent reruns and before/after counts. Keep inventory candidates staged until validation passes; no direct promotion of partial/unverified inventory into public canonical pages.
- [ ] Refresh production DB counts before any write/backfill. The earlier snapshot (3 partial inventory records, 8 partial Post candidates, 0 raw captures) is historical evidence, not a current complete inventory count.

### Execution rule

Finish the public UI and canonical serving gates first, then the source-capture/verification/reconciliation pilot, then a bounded data injection. Do not make scraping/ingestion the product centre; it is a supporting input pipeline. Production schema changes remain migration-only, and production writes require an explicit reviewed plan.

---


## Current corrective work — 2026-10-11

This section supersedes older sprint assumptions where they conflict with the frozen canonical model and current route implementation. Do not treat ingestion/scraping as the product core; the public contract is Organization → Recruitment → Post → Position, with one deterministic URL and SEO policy per entity.

### P0 — Canonical hub-to-leaf serving and multilingual route correctness

- [ ] **Post lookup scope:** verify that `/jobs/:recruitmentSlug/:postSlug` resolves a Post only within its canonical Recruitment; old slugs must not attach a leaf to an unrelated Recruitment. PR #48: https://github.com/blockrao/jobs/pull/48
- [ ] **Recruitment hub metadata:** metadata must resolve the same Recruitment that the page renders. Untranslated `/hi` hubs use the English canonical and `noindex,follow`; English hubs remain indexable. PR #49: https://github.com/blockrao/jobs/pull/49
- [ ] **Localized Post Leaf:** `/hi/jobs/:recruitmentSlug/:postSlug` must reach the locale route, use the canonical Post→Recruitment relationship for canonical URLs, and not publish Unix epoch placeholders as `datePosted`. PR #50: https://github.com/blockrao/jobs/pull/50
- [ ] **Central SEO contract and sitemap:** route metadata must use `src/lib/seo`; only genuinely translated entities get Hindi hreflang; sitemap URLs must be absolute, canonical, unique, and include eligible job listings as well as canonical Post Leaves. PR #51: https://github.com/blockrao/jobs/pull/51
- [ ] **Release gate:** preview-verify English and Hindi hub/leaf routes, unknown-slug 404, canonical/robots/lang, JobPosting JSON-LD, and sitemap uniqueness. No production deploy until these pass and the existing lint baseline is understood.

### P1 — Entity identity and ingestion integrity

- [ ] Recruitment resolution uses official notification identity where available, then organization + exam + year + title similarity; a slug is a URL, not a canonical identity key.
- [ ] Position resolution uses semantic category/name identity, not a slug lookup.
- [ ] Keep ingestion as an input pipeline only. Do not make scraping or ingestion refactors a prerequisite for serving-path fixes unless a specific public defect is traced to bad source data.
- [ ] Keep production schema changes migration-only; no direct production DDL or `drizzle-kit push`.

### CI baseline

- Architecture contract tests are being used as the invariant gate. Failures must be fixed in implementation or in stale tests only when the current behavior is demonstrably correct; never weaken a contract just to turn CI green.
- The repository lint command has a pre-existing broad failure baseline (hundreds of errors, primarily explicit `any` and React compiler rules). Track and remediate that separately; do not claim the product release is clean while the required lint check remains red.
- Type-check success is necessary but not sufficient. PRs remain unmerged until route behavior and relevant checks are verified.

---


## Summary

Transitioning from single-entity (postings) to multi-entity graph model with canonical hubs for Position, Exam, Recruitment, and Organization. Postings become data instances linking to normalized graph.

**Frozen Ontology**: Organization → Recruitment → Post → Position (many-to-many relationships, not hierarchies)

**Canonical Hubs**: `/positions/[slug]`, `/exams/[slug]`, `/recruitments/[slug]`, `/organizations/[slug]`

---

## Implementation Order

### **Sprint 1: Foundation (Days 1-2)**

#### 1.1 Database Schema
- **Files**: `src/db/schema-v2.ts`, `SCHEMA_MIGRATION.md`
- **Task**: 
  - Run Phase 1 migration (locations, qualifications, organizations_new, exams_new, positions)
  - Seed reference data (Indian states, education levels, major orgs, exams, positions)
  - Run Phase 2 migration (recruitments, selection_processes, posts, eligibilities, vacancies)
  - Seed recruitment data (SSC CGL 2024, UPSC CSE 2025, ITBP 2026, key recruitments)
  - Run Phase 3 migration (extend postings table)
  - Run Phase 4 migration (canonical_pages table)
- **Verification**: 
  - All tables exist with correct schemas
  - Foreign key constraints verified
  - Indexes created
  - No constraint violations

#### 1.2 Data Backfill
- **Task**: Populate new tables from existing postings
  - Infer Recruitment from existing exam_id
  - Infer Position from postings' patterns (e.g., "Constable GD" → Position "Constable")
  - Extract Eligibility from postings' eligibility text
  - Create Posts linking Recruitment → Position
  - Populate Vacancies from existing vacancy data
- **Code**: `src/db/operations/backfill.ts` (new script)
- **Verification**: 
  - All postings have inferred_recruitment_id
  - All postings have inferred_post_id
  - Orphaned postings logged and reviewed

---

### **Sprint 2: Query & API Layer (Days 3-4)**

#### 2.1 Update Database Operations
- **Files to Update**:
  - `src/db/operations/write-postings.ts` — add inferredRecruitmentId, inferredPostId logic
  - `src/db/operations/get-*.ts` — create new query functions for graph model

- **New Functions to Add**:
  ```typescript
  // Recruitment queries
  export async function getRecruitmentBySlug(slug: string)
  export async function getRecruitmentPosts(recruitmentId: number)
  export async function getRecruitmentVacancies(recruitmentId: number)
  
  // Position queries
  export async function getPositionBySlug(slug: string)
  export async function getPositionPostings(positionId: number)
  export async function getPositionRelatedExams(positionId: number)
  export async function getPositionRelatedRecruitments(positionId: number)
  
  // Exam queries (update existing)
  export async function getExamRelatedPositions(examId: number)
  export async function getExamRelatedRecruitments(examId: number)
  
  // Organization queries (new)
  export async function getOrganizationBySlug(slug: string)
  export async function getOrganizationRecruitments(orgId: number)
  export async function getOrganizationExams(orgId: number)
  ```

#### 2.2 Update Scraper Pipeline
- **Files to Update**: `src/ingest/`
  - `run.ts` — log new relationship inference
  - `write-postings.ts` — add inferred_recruitment_id, inferred_post_id to insert

- **Changes**:
  - Detect recruitment year from posting (e.g., "SSC CGL 2024" → year 2024)
  - Link to existing recruitment if it exists, else create placeholder
  - Link to inferred post (position match → post lookup)
  - Set confidence_score based on matching strength
  - Set is_canonical if this is primary source for the posting

---

### **Sprint 3: Routes & Pages (Days 5-6)**

#### 3.1 Build Canonical Hub Routes
- **Files to Create**:
  - `src/app/positions/[slug]/page.tsx` — Position hub
  - `src/app/exams/[slug]/page.tsx` — Exam hub (new, replaces old exam page)
  - `src/app/recruitments/[slug]/page.tsx` — Recruitment campaign hub
  - `src/app/organizations/[slug]/page.tsx` — Organization hub

#### 3.2 Update Job Detail Route
- **File**: `src/app/jobs/[slug]/page.tsx`
- **Changes**:
  - Fetch Posting + inferred Post + inferred Recruitment + Position
  - Display canonical hub links (e.g., "View all positions", "See recruitment timeline")
  - Show related postings from same Recruitment

#### 3.3 Update Exam Hub Route (Redirect)
- **File**: `src/app/[exam-slug]/page.tsx` (old)
- **Change**: Redirect to `/exams/[slug]` (new canonical URL)

---

### **Sprint 4: Features & Content (Days 7-8)**

#### 4.1 Position Hub (`/positions/[slug]`)
- **Content**:
  - Career overview & description
  - Typical qualification, age, salary
  - Career path (Constable → Head Constable → Inspector)
  - All related Exams (which exams recruit for this position)
  - All related Recruitments (current, past, upcoming)
  - Latest Postings from this position
  - Related Articles (preparation guides, salary reports)

- **Query Logic**:
  ```typescript
  const position = await db.query.positions.findFirst({
    where: eq(positions.slug, slug),
    with: {
      posts: {
        with: {
          recruitment: true,
          eligibility: true,
          vacancies: true,
          postings: { limit: 10 }
        }
      }
    }
  });
  ```

#### 4.2 Recruitment Hub (`/recruitments/[slug]`)
- **Content**:
  - Recruitment timeline (notification → application → exam → results)
  - Exam reference (if applicable)
  - All Posts in this recruitment
  - Vacancy breakdown (location × category)
  - Eligibility requirements
  - Notification & official links
  - Related Articles (cutoffs, results, admit card guides)

- **Dynamic**: Content changes based on recruitment status (UPCOMING vs ACTIVE vs RESULTS)

#### 4.3 Exam Hub (`/exams/[slug]`)
- **Content**:
  - Exam pattern & syllabus
  - All Positions that this exam recruits for
  - All Recruitments using this exam
  - Notification & official links
  - Previous papers & cutoffs (from articles)
  - Preparation resources

#### 4.4 Organization Hub (`/organizations/[slug]`)
- **Content**:
  - Organization info (if exam authority: exams list; if employer: recruitment list)
  - All related Recruitments
  - All related Exams (if exam authority)
  - Contact & official links

---

### **Sprint 5: Analytics & Redirect (Days 9-10)**

#### 5.1 Update Analytics Tracking
- **File**: `src/components/analytics-tracker.tsx` and `src/lib/analytics.ts`
- **Changes**:
  - Track Position hub views: `trackPositionView(slug, name)`
  - Track Recruitment hub views: `trackRecruitmentView(slug, name, status)`
  - Track canonical page views (entity type + slug)
  - Deprecate old exam-only tracking

#### 5.2 SEO & Canonical Tags
- **Changes** to all new routes:
  - Add canonical link meta tags
  - Add structured data (JSON-LD) for JobPosting, EmploymentApplication
  - Add Open Graph tags for social sharing
  - Add sitemap entries for canonical pages

#### 5.3 Old URL Redirects
- **File**: `src/app/middleware.ts` or redirect config
- **Changes**:
  - `/[exam-slug]` → `/exams/[slug]` (301 permanent redirect for SEO)
  - Track redirect clicks in analytics
  - Phase out old exam hub gradually (keep both for 2-4 weeks)

---

### **Sprint 6: Testing & Optimization (Days 11-12)**

#### 6.1 End-to-End Testing
- **Scenarios**:
  - Create new recruitment, verify Position hub aggregates it
  - Update recruitment status, verify hub content changes
  - Ingest new posting, verify it links to Position/Recruitment/Post
  - Orphaned postings (don't match any recruitment) — fallback behavior

#### 6.2 Query Performance
- **File**: Add indexes as needed
  - Verify postings.inferred_recruitment_idx is used
  - Verify postings.inferred_post_idx is used
  - Monitor slow queries in production

#### 6.3 Content Completeness
- **Audit**: Each canonical hub has all necessary data
  - Position hub: career path, salary range, related exams, recent postings
  - Recruitment hub: all posts, vacancy breakdowns, timeline, eligibility
  - Exam hub: syllabus, related positions, notification link

---

## Code Deliverables by Sprint

### Sprint 1 (Database)
- [ ] `src/db/schema-v2.ts` — new schema with all entities
- [ ] `SCHEMA_MIGRATION.md` — migration instructions
- [ ] `src/db/operations/backfill.ts` — data population script
- [ ] `src/db/seed.ts` — updated to seed reference data

### Sprint 2 (Queries)
- [ ] `src/db/operations/get-recruitments.ts` — recruitment queries
- [ ] `src/db/operations/get-positions.ts` — position queries
- [ ] `src/db/operations/get-exams.ts` — exam queries (updated)
- [ ] `src/db/operations/get-organizations.ts` — organization queries (new)
- [ ] `src/ingest/write-postings.ts` — updated for inference
- [ ] `src/ingest/run.ts` — updated logging

### Sprint 3 (Routes)
- [ ] `src/app/positions/[slug]/page.tsx` — position hub
- [ ] `src/app/exams/[slug]/page.tsx` — exam hub
- [ ] `src/app/recruitments/[slug]/page.tsx` — recruitment hub
- [ ] `src/app/organizations/[slug]/page.tsx` — organization hub
- [ ] `src/app/jobs/[slug]/page.tsx` — updated detail page
- [ ] `src/app/[exam-slug]/page.tsx` — redirect old exam route

### Sprint 4 (Components)
- [ ] Position hub components (PositionHeader, CareerPath, RelatedExams, etc.)
- [ ] Recruitment hub components (Timeline, PostsList, VacancyBreakdown, etc.)
- [ ] Exam hub components (SyllabusTabs, RelatedPositions, etc.)
- [ ] Organization hub components

### Sprint 5 (Analytics & SEO)
- [ ] `src/lib/analytics.ts` — new tracking events
- [ ] `src/components/analytics-tracker.tsx` — updated tracker
- [ ] SEO/structured data utilities
- [ ] Redirect middleware
- [ ] Sitemap generator updates

### Sprint 6 (Tests)
- [ ] Integration tests for graph relationships
- [ ] Route tests for all hubs
- [ ] Backfill script tests
- [ ] Performance benchmarks

---

## Key Decisions to Confirm

### 1. Organization Roles Handling
**Question**: How to represent Organization roles in code?

**Option A**: Array in database + ORM auto-handles it
```typescript
organizations: {
  roles: ['EXAM_AUTHORITY', 'RECRUITING_BODY']
}
```

**Option B**: Separate junction table (overkill unless querying by role frequently)

**Decision**: Option A (simpler, sufficient for this use case)

---

### 2. Posting Inference Strategy
**Question**: How aggressively to infer recruitment/post from new postings?

**Option A**: Strict (only infer if confidence > 70%)
- Pros: Clean, avoids false links
- Cons: Some postings stay orphaned

**Option B**: Liberal (infer even at 40% confidence, mark as PENDING)
- Pros: More coverage, but flagged for review
- Cons: More manual cleanup

**Decision**: Hybrid — infer at 50%+, mark <70% as PENDING for review

---

### 3. Backward Compatibility
**Question**: Keep old exam hub route (`/[exam-slug]`) or redirect immediately?

**Option A**: Parallel (both routes work for 2-4 weeks, then deprecate)
- Pros: Gradual migration, less SEO risk
- Cons: More maintenance

**Option B**: Redirect immediately (301 to `/exams/[slug]`)
- Pros: Clean, forces traffic to new canonical URL
- Cons: Any caching issues manifest immediately

**Decision**: Parallel for 2-4 weeks, then redirect

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Backfill data quality (orphaned postings) | Log all orphaned postings; manual review before GO LIVE |
| Performance regression on canonical hubs | Query optimization + indexing in Sprint 6; load test |
| Breaking changes to old exam routes | Keep old routes in parallel; 301 redirect after verification |
| SEO impact from URL changes | Canonical tags, 301 redirects, sitemap updates |
| Data inconsistency (postings vs. posts) | Dual-write during transition; backfill validates consistency |

---

## Definition of Done

All sprints complete when:
- [ ] All tables created & indexes verified
- [ ] Reference data seeded (states, qualifications, major orgs, exams, positions)
- [ ] Recruitment & Post data populated for key campaigns
- [ ] Postings backfilled with inferred relationships (orphaned set identified & reviewed)
- [ ] Query functions tested & performant
- [ ] All 4 canonical hub routes live and rendering
- [ ] Old exam route redirecting (or parallel until cutover)
- [ ] Analytics tracking updated & verified
- [ ] SEO/structured data in place
- [ ] 2-week production soak with zero critical bugs
- [ ] Documentation updated (AGENTS.md, route guides)

---

## Success Metrics (Post-Launch)

- **Canonical hub discovery**: Unique users to `/positions/*`, `/exams/*`, `/recruitments/*`
- **Position hub engagement**: Time on page, clicks to related content
- **Recruitment hub usage**: Views per status (UPCOMING vs ACTIVE vs RESULTS)
- **Posting quality**: Percentage successfully linked to Recruitment/Post (target: >95%)
- **SEO impact**: Ranking improvement for "job title salary", "exam name cutoff", etc.
- **Performance**: P95 page load time <2s for canonical hubs

---

## Post-Launch Maintenance

- **Weekly**: Monitor orphaned postings; adjust inference confidence thresholds
- **Monthly**: Update recruitment statuses (ACTIVE → RESULTS); refresh positions data
- **Quarterly**: Add new exams/organizations; expand position coverage


---

## Routing release gate — legacy root exam URL decoupling (2026-10-11)

**Decision:** the canonical exam URL is `/exams/{slug}`. Legacy root URLs `/{exam-slug}` are compatibility redirects only; they must not share the locale route segment or layout.

- [x] Add a pure, unit-tested decision function for known legacy exam redirects.
- [x] Generate the redirect allowlist from the authoritative `exams` table before each production build.
- [x] Fail the build if `DATABASE_URL` is absent, the query fails, the table is empty, or any slug is invalid/duplicated. Never silently publish an empty manifest.
- [x] Redirect only manifest-listed root exam slugs in proxy; no per-request DB lookup for arbitrary root paths.
- [x] Remove the overloaded `src/app/[locale]/page.tsx` compatibility route so non-locale root paths are not interpreted as locale params.
- [ ] CI: application and contract type checks, route contract tests, and lint on the current PR head.
- [ ] Fresh preview HTTP verification: known legacy slug returns one-hop 301 to `/exams/{slug}`; unknown root path returns 404; `/hi` and `/en` resolve intentionally; locale job leaves, articles, exams, organizations, static assets, sitemap and robots remain correct.
- [ ] Confirm Vercel Preview build has the authoritative `DATABASE_URL` and generated manifest before cutover.

**Release policy:** this routing change is not accepted on source inspection alone. Keep PR #51 open until CI and preview HTTP acceptance criteria pass. No production deployment is authorized by this checkpoint.
