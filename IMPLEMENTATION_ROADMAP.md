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


## Release Planning (current)

The current, gated release plan is maintained in [RELEASE_PLAN.md](./RELEASE_PLAN.md). Follow its execution order: public trust/UI hygiene → Recruitment/Post data-to-UI correctness → bounded inventory pilot and reconciliation → canonical URL/redirect repairs → release-candidate CI/build → production smoke tests and operational checks → controlled launch. Do not declare launch readiness from merged code alone; each gate needs evidence on the release commit and deployed production version.
