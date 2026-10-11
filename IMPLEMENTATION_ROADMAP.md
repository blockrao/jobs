# Implementation Roadmap: Graph Model & Canonical Hubs

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

# Production Hardening & Scale Readiness (Added 2026-10-10)

This programme is additive to the frozen Recruitment → Post → Position model. It does not authorize a broad rewrite, unreviewed production database changes, weakening CI gates, or expanding locale middleware before route ownership is explicit.

## Product architecture principles

- **Correctness before scale:** canonical entities, route ownership, metadata and ingestion identity must be correct before increasing traffic or adding locale coverage.
- **Evidence before optimization:** capture route/query/cache baselines; use traces, query plans and load tests to select optimizations.
- **Fail safely:** bound external/database waits, avoid unbounded retries, preserve useful public pages during optional-service failures, and expose failures to operators.
- **One source of truth:** shared canonical/SEO policy, shared locale route classifier, canonical schema definitions, and explicit source provenance.
- **Small reversible changes:** one concern per PR, migration rollback plan, preview smoke tests and explicit rollback steps.
- **No false green:** never swallow critical errors as successful empty output without monitoring; never claim readiness without current-deployment evidence.
- **Multilingual by contract:** English remains unprefixed; Hindi uses `/hi`; URL determines locale; untranslated Hindi is reachable but noindex/follow and canonical to English; hreflang only for genuinely translated, indexable pairs.

## Execution sequence and release gates

### H0 — Close the current routing foundation (PR #32)
- [ ] Keep PR #32 open until a current-head deployment/preview is available and verified.
- [ ] Confirm CI architecture contracts and both TypeScript checks pass; diagnose lint failure without disabling rules or introducing new debt.
- [ ] HTTP-smoke-test legacy Posting → canonical Post Leaf, legacy Recruitment redirects, mixed-role Recruitment noindex/canonical behavior, and supported `/hi` leaf routes.
- [ ] Assert status, Location, canonical, robots, html lang, hreflang, structured data, and absence of duplicate JSON-LD.
- [ ] Verify query strings, trailing slashes, invalid locale prefixes, unknown paths and redirect loops.
- [ ] Do not merge on a stale preview or inferred behavior.

### H1 — Root route ownership (issue #34)
- [ ] Inventory indexed/linked legacy root exam-slug URLs.
- [ ] Benchmark a narrow redirect-table/proxy approach; no database lookup for arbitrary root paths.
- [ ] Add integration tests for known legacy slugs, unknown roots, `/hi`, `/en`, invalid prefixes and static assets.
- [ ] Remove the legacy exam redirect's dependency on `[locale]` only after the replacement redirect is verified end-to-end.

### H2 — Route-family Hindi coverage (issue #33)
- [ ] Maintain an explicit route matrix: owner, translation readiness, canonical, robots, hreflang, structured data and sitemap policy.
- [ ] Ship one page-family batch at a time; do not broaden middleware globally.
- [ ] Test direct navigation, internal links, language switching, query strings and trailing slashes.
- [ ] Ensure `/en` never appears in canonical URLs, hreflang or sitemap; add reciprocal hreflang only for truly translated/indexable pairs.

### H3 — Database and request-path resilience
- [ ] Inventory hot routes and their queries; collect p50/p95/p99 latency and query-count baselines.
- [ ] Verify serverless connection/pooler limits, connection and query timeouts, idle cleanup, and bounded concurrency.
- [ ] Review indexes with query plans and production-safe evidence before migration.
- [ ] Remove N+1 access patterns and unsafe data-boundary casts where evidence supports it.
- [ ] Bound retries and degrade only optional data; critical failures must be observable.
- [ ] Review admin auth, ingestion validation, least privilege/RLS, secret handling, abuse controls and dependency advisories.

### H4 — Rendering, cache and CDN
- [ ] Classify each page family as static, ISR, dynamic or no-store and document freshness requirements.
- [ ] Reproduce the Post Leaf stale-404 case before changing current no-store headers.
- [ ] Define cache key, TTL, invalidation and stale-content policy; verify actual response headers on the deployed platform.
- [ ] Preserve correct redirects, freshness and error behavior while reducing avoidable origin/database requests.

### H5 — Observability and operations
- [ ] Add structured request/error logs with request correlation; do not log secrets or sensitive data.
- [ ] Measure route latency, DB latency, 4xx/5xx, cache hit rate, ingestion freshness and ingestion-quality metrics.
- [ ] Add uptime/route smoke checks and actionable alerts with documented response instructions.
- [ ] Document environment validation, health checks, deploy rollback, database backup and restore verification.
- [ ] Make sitemap query failures visible and monitor sitemap URL counts/completeness; avoid silent empty sitemap success.

### H6 — Performance and capacity proof
- [ ] Establish production baseline for TTFB, Core Web Vitals, build/client bundle size, route p75/p95, query p95 and cache hit ratio.
- [ ] Set explicit budgets after baseline collection; target p95 under 2 seconds for canonical hubs as an initial objective, subject to measurement.
- [ ] Load-test realistic mixes of listing, search, Post Leaf and Recruitment/Position pages at expected peak concurrency.
- [ ] Test degraded DB/network behavior, cold starts and cache misses; document safe capacity and bottlenecks.
- [ ] Optimize based on evidence and rerun the same benchmark after each material change.

## Definition of done for production hardening

- All critical/high findings have evidence, a tracked remediation and a rollback plan.
- Route/SEO/entity contract suites, application and test type-checks, lint policy and production build are green.
- Current-head preview passes route/header smoke tests; no known critical redirect, canonical or leaf-render failure.
- Query and cache behavior has measured baselines; capacity claims are backed by load-test results.
- Ingestion/provenance and sitemap health are observable; operational alerts and recovery procedures are tested.
- No production schema/data mutation occurs without reviewed migration and rollback instructions.
- Issues #32/#34/#33 remain in dependency order; the multilingual rollout is not used to bypass unresolved routing foundations.

## Active tracking

- PR #32: canonical Post Leaf and locale route-dispatch foundation — finish verification before merge.
- Issue #34: decouple legacy root exam redirects from the `[locale]` route segment.
- Issue #33: explicit route-family matrix and phased `/hi` rollout.
- Issue #36: production hardening audit — database, cache, performance, resilience, security and observability.
