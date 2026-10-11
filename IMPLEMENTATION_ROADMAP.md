# Implementation Roadmap: Graph Model & Canonical Hubs

## Product architect checkpoint — 2026-10-11 evening

This checkpoint supersedes older status bullets where they conflict with the current verified state.

### Verified on exact preview commit `8aa3ad1b936a2e6db5a880ae812dcd822c14cfdd`
- [x] Vercel preview reached READY; `/posts` and a role page returned HTTP 200 after the request-rendering change.
- [x] `/fja-review` returned 404 on the preview.
- [x] Sampled Hindi Recruitment Hub and Post Leaf returned `lang="hi"`, English canonical, `noindex, follow`, and no `JobPosting` JSON-LD.
- [x] Sampled Recruitment Hub and Post Leaf HTML did not expose the internal inventory/source-review fields.
- [x] Sitemap had 2,827 unique URLs and excluded the sampled Recruitment Hub URL.
- [ ] Sitemap still advertised at least one legacy posting URL whose canonical pointed to a different Recruitment URL; targeted exclusion committed below.
- [ ] Recruitment Hub metadata was still indexable on that preview; targeted noindex/canonical policy committed below.

### Newer, not-yet-preview-verified commits
- [x] `0f6ebfe`: sitemap query resolves canonical Recruitment mapping through both direct inferred recruitment and inferred Post relationships.
- [x] `44229a8`: exclude legacy posting aliases whose resolved canonical Recruitment differs from the posting slug.
- [x] `edc45f0`: Recruitment Hubs are noindex; single-role hubs canonicalize to `/posts/{role-slug}`; mixed-role hubs do not assert an arbitrary role canonical.
- [ ] Exact head `edc45f0c5110bdb3633a6f81a3ecb543c9db3d50` has no READY preview. Vercel reports build-rate-limit failure. Do not promote the older preview.
- [x] CI architecture contract tests, application type-check, and contract-test type-check passed on the PR merge commit associated with `edc45f0`.
- [ ] Lint remains red: 209 errors / 78 warnings in the latest completed run. The majority are repository-wide `no-explicit-any` and unused-variable findings. No rules or test scope have been weakened.

### Next release gates
1. Build a preview of the exact current head when Vercel permits it.
2. Re-run route acceptance for English/Hindi hub and leaf pages, unknown slugs, redirects, canonical/robots/lang, and JobPosting JSON-LD.
3. Validate sitemap entries against actual canonical responses, not just uniqueness; ensure non-indexable Recruitment Hubs and legacy aliases are absent.
4. Review lint errors by production-critical file and remediate in bounded batches without broad suppression.
5. Only after public route acceptance, resume a staged official-source verification and idempotent data-reconciliation pilot. No production writes until a reviewed plan and dry-run evidence exist.

---


## Product architect execution checkpoint — 2026-10-11

This checkpoint supersedes any assumption that an open PR or READY deployment is release acceptance. Work is ordered by public correctness and data integrity, not by ingestion throughput.

### Latest verified checkpoint — 2026-10-11

- Candidate SHA: `8efa2f4f4bcaee632d2d49e29c930a5a21245e93` on PR #51.
- [x] Application TypeScript, contract-test TypeScript, and architecture contract tests passed on this SHA.
- [ ] Lint remains failing: 212 errors / 81 warnings in the latest run. Do not merge until release gates are agreed; do not disable rules or weaken contracts.
- [x] Recruitment Hub location field now reads from the typed Post projection; previous CI caught and drove correction of stale Position-field references.
- [x] Fresh read-only production DB audit on 2026-10-11: 3 inventory rows (all OPEN/PARTIAL), 8 Post candidates (all PARTIAL/PENDING official verification), 0 raw captures, 1,553 canonical Posts (19 with non-empty descriptions; 1,453 with vacancy totals), and 0 normalized vacancies. No production writes were made.
- [ ] Preview verification and exact-SHA deployment checks remain outstanding; this branch is not production-released.

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
- [ ] Full CI remains red because repository lint reports 212 errors / 81 warnings on the latest candidate SHA (down from 278 / 88 on the earlier audited commit). Do not suppress rules; remediate in bounded batches.
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
- [x] Refresh production DB counts before any write/backfill. Read-only audit on 2026-10-11 reconfirmed 3 OPEN/PARTIAL inventory rows, 8 PARTIAL/PENDING Post candidates, 0 raw captures, 1,553 canonical Posts (19 non-empty descriptions; 1,453 vacancy totals), and 0 normalized vacancies. This is a current snapshot, not proof of complete source coverage.

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

## Preview acceptance checkpoint — 2026-10-11 (role metadata patch)

Preview tested on the isolated role-metadata branch at commit `dca78bcd7aaf1c83b81cfcf67aedc48e9bb24f7a` (`https://asdf-ezsii59v5-jobing.vercel.app`). This is acceptance evidence for the sampled routes only, not a release approval.

- [x] Preview deployment reached READY.
- [x] Canonical role page `/posts/junior-research-fellow-jobs` returns HTTP 200, self-canonicalizes, and now emits matching role-specific Open Graph and Twitter titles/descriptions.
- [x] Sample English Post Leaf returns HTTP 200, self-canonicalizes, and includes `JobPosting` JSON-LD.
- [x] Sample Hindi Post Leaf returns `lang="hi"`, canonicalizes to its English leaf, is `noindex, follow`, and omits `JobPosting` JSON-LD.
- [x] Sample Recruitment Hub returns `noindex, follow` and canonicalizes to its single role's `/posts/{role-slug}` page.
- [x] Sitemap has 2,422 unique URLs in this preview response: 1,553 nested job leaf URLs, 36 role discovery URLs, no legacy two-segment `/jobs/{recruitment}` URLs, and no `/hi/` URLs.
- [x] Architecture contract tests, application type-check, and contract-test type-check pass on the role-metadata branch.
- [ ] Lint remains red at 209 errors / 78 warnings; the completed run showed repository-wide lint findings and none in the changed role page or new test.
- [ ] The final response for `/hi/posts/{role-slug}` resolves to the English canonical page, but the intermediate redirect status was not independently captured; verify redirect status and cache policy.
- [ ] Sitemap verification is structural so far. Reconcile every sitemap URL against its live status, canonical, robots/indexability policy, and structured-data eligibility before release.
- [ ] Do not merge or promote until remaining route and sitemap acceptance gates are complete.

## Follow-up found during sitemap route sampling — 2026-10-11

- [x] A representative sitemap sample revealed that `/jobs` was listed in the sitemap while the rendered route was served by `/[locale]/jobs` with `noindex, follow`.
- [ ] Fix the locale-aware jobs metadata so the unfiltered English `/jobs` canonical remains indexable, while `/hi/jobs` and filtered/search/paginated variants remain noindex and canonicalize to `/jobs`.
- [ ] Add regression coverage for English canonical listing, Hindi mirror, and filtered listing. Keep this as a separate stacked change; do not treat sitemap uniqueness as proof of indexability consistency.

## Jobs listing indexability — follow-up acceptance checkpoint (2026-10-11)

The /jobs metadata correction and focused unit tests are on fix/jobs-listing-indexability in draft PR #55. Search and page-2 variants are now also covered by the regression test file. The branch still has no successful CI or fresh Vercel preview; the commit status reports Vercel build-rate-limit failure, so no branch-level runtime claim is made.

### Current production sample (diagnostic only; not proof of PR behavior)

- [x] /jobs returns HTTP 200 but still emits noindex, follow, despite being included in /sitemap.xml.
- [x] /hi/jobs, /jobs?filter=open, /jobs?q=police, and /jobs?page=2 return noindex, follow and canonicalize to /jobs.
- [x] Production sitemap currently contains 3,509 unique URLs, including 1,087 one-segment /jobs/{slug} URLs, 1,553 nested job leaves, and 36 /posts/{role-slug} URLs.
- [x] A sampled production Recruitment Hub still returns HTTP 200 with a self-canonical and no robots meta tag, while the current branch source contains the noindex/canonical policy and sitemap exclusion. Treat this as production-versus-branch drift until a fresh preview of the exact branch is available; do not infer that the branch implementation failed from the production response alone.
- [ ] /en/jobs still returns HTTP 200 with noindex, follow and canonical /jobs in the production sample. Capture a raw redirect response on the exact branch preview to decide whether an explicit as-needed locale redirect is needed.
- [ ] Fresh preview of the exact PR #55 head; verify /jobs indexability, locale redirect behavior, filtered/search/pagination metadata, and sitemap-to-canonical consistency.
- [ ] Run contract tests and app/test type checks on the exact PR head; do not merge/promote while Vercel preview remains unavailable.


## Production deployment verification — 2026-10-11 (after user deployment)

- [x] Live `https://www.joboye.com/jobs` returns HTTP 200, self-canonical `https://www.joboye.com/jobs`, and no robots noindex directive. The canonical All Jobs listing is indexable.
- [x] Live `/hi/jobs`, `/jobs?filter=open`, `/jobs?q=police`, and `/jobs?page=2` return `noindex, follow` and canonical `/jobs`.
- [x] Live sitemap returns HTTP 200 with 2,422 unique `<loc>` entries; includes `/jobs`, 1,553 nested job-leaf URLs and 36 `/posts/{role}` URLs; no one-segment legacy Recruitment Hub URLs found. This is structural verification, not a complete per-URL status/canonical/robots reconciliation.
- [x] Sampled live Recruitment Hub returns `noindex, follow` and canonical to its corresponding role page.
- [x] Exact current PR #55 preview `13e7a5790e7f2b49c77b25332cc66d628bec9eff` confirms the clean listing is indexable and search/filter/page-2 variants are noindex + canonical `/jobs`; `/hi/jobs` is noindex + canonical `/jobs`.
- [ ] Listing social metadata defect found in preview and production: OG/Twitter inherited generic homepage copy and locale-root URL (`/en` or `/hi`) instead of the listing title/description and canonical `/jobs`. Fix committed to `fix/jobs-listing-indexability` in `d7b85ad` and `9d7f2f7`; regression assertions committed in `d1c8879`. These commits still need an exact-head READY preview and test results.
- [ ] `/en/jobs` renders the English listing and carries canonical `/jobs`; the current web-fetch evidence does not expose the initial redirect response headers, so the 301/308/as-needed redirect behavior is NOT yet proven either way. Capture the raw first response before changing routing.
- [ ] Sitemap reconciliation remains open: check a representative cohort across all URL families for HTTP status, canonical, robots, hreflang, and structured-data policy; then expand automated coverage. Do not infer complete correctness from the sitemap count alone.
- [ ] No merge/promotion until latest PR #55 exact-head preview, tests, route policy and sitemap gates pass.


## Sitemap reconciliation finding — 2026-10-11

- [x] Sampled the live sitemap by route family: 2,422 URLs total; 1,553 job-leaf URLs, 36 role URLs, 702 organization URLs, 69 exam URLs, 35 state URLs, 10 commission URLs, 7 category URLs, one article URL, plus static entries.
- [x] Representative URLs from the major families returned HTTP 200 and self-canonical metadata. The sampled job leaf had self-canonical metadata and JobPosting JSON-LD; role, organization, exam, category, state, and index pages were self-canonical and indexable in the sample.
- [x] Found a real sitemap/indexability mismatch: `/commissions/banking` and `/commissions/ssc` render `noindex, follow` but were present in the sitemap (10 commission URLs in total).
- [x] Removed commission URLs from sitemap generation in commit `2cbd627` and added a contract test that no `/commissions/*` URLs are emitted in commit `5ab8c19`.
- [ ] The commission sitemap fix and listing social-metadata fix are not yet verified on a READY preview for the exact current PR #55 head. Verify sitemap output drops all 10 commission URLs and preserves canonical/indexable route families.
- [ ] This was a representative cohort audit, not an exhaustive 2,422-URL live HTTP audit. Expand automated reconciliation to sample or check every URL for status, canonical, robots, hreflang, and structured-data policy before closing the release gate.


## Follow-up execution check — 2026-10-11

- [x] Rechecked PR #55: still open, draft, unmerged; latest head remains `a88aed49ea18ef7ee527f2995dbcf1113a491c31`.
- [x] Rechecked Vercel: latest READY preview remains commit `d7b85ad25569ead17bc9ad35c539775277589f99`; the two metadata/sitemap changes after that are not on the preview. Attempting a fresh deployment returned HTTP 402 `api-deployments-free-per-day`, with retry-after 24 hours. Do not spam build attempts.
- [x] Confirmed the stale preview still has generic OG/Twitter listing metadata and its sitemap still contains all 10 commission URLs. This is expected for the older deployment and is not evidence the new branch fixes failed.
- [x] Source review of `src/proxy.ts` confirms next-intl is configured with `localePrefix: "as-needed"` and handles locale-aware routes; this supports the intended `/en/jobs` canonicalization design. The fetch layer follows/obscures the initial redirect response, so the actual first-hop HTTP status remains unverified.
- [x] CI configuration finding: `.github/workflows/quality-gates.yml` only runs `pull_request` checks when the PR targets `main`, while PR #55 targets the stacked feature branch `fix/role-page-twitter-metadata`. GitHub reports zero check runs on the latest head. Therefore no test/build success can be claimed for this PR head. The workflow/stacked-PR policy needs a deliberate CI fix or a safe integration branch strategy.
- [ ] Next: once Vercel deployment quota clears, create one exact-head preview, run the full route/sitemap acceptance checklist, and capture raw redirect headers using a client that does not follow redirects. Keep PR draft until CI and preview gates are green.


## CI and bounded lint follow-up — 2026-10-11

- [x] Fixed stacked-branch CI trigger coverage in `.github/workflows/quality-gates.yml`: pull-request checks remain targeted at `main`, while pushes to `fix/**`, `feat/**`, and `chore/**` run the quality gates for stacked feature branches. This preserves CI on the PR head without launching duplicate PR-event and push-event suites for feature-base PRs. Commits: `140c6877c225f67728ba076152f043d99a8cc1b4`, `8927ec610005a85b907af2b46356cd479751d963`.
- [x] GitHub Actions now runs for PR #55 despite its feature-branch base. On exact code head `63054fffd742b8d17443d4248f7adcc45b2d3341`, architecture contract tests, application type-check, and contract-test type-check passed.
- [x] Removed unchecked `any` casts from both jobs listing row renderers by narrowing optional listing metadata fields once per row. Commits: `387fbbe17adb806d7511e6fabafca0813a3c0b58`, `63054fffd742b8d17443d4248f7adcc45b2d3341`. Latest lint run no longer reports findings in these two listing files.
- [ ] Lint remains failing at 197 errors / 75 warnings on the exact code head above (down from 209 errors / 75 warnings on the prior head). No lint rules were disabled. Treat this as a broad repository baseline; remediate in separate bounded batches rather than expanding this SEO fix indiscriminately.
- [ ] The roadmap update itself will create a new head and trigger fresh CI; use the resulting exact-head checks for the next checkpoint.
- [ ] Vercel preview remains blocked by its daily deployment quota. Do not merge or promote until the exact-head READY preview verifies the listing OG/Twitter metadata, sitemap excludes all commission URLs, and the route/sitemap acceptance checklist passes.


### Full sitemap audit tooling added — 2026-10-11

- [x] Added `src/scripts/audit-sitemap.ts` and the `npm run audit:sitemap` command. It fetches every sitemap URL with manual redirect handling and checks HTTP 200, same sitemap origin, query/hash absence, noindex directives (including `X-Robots-Tag`), self-canonical metadata, and `JobPosting` JSON-LD on job-detail URLs.
- [x] Audit supports `--base` for production or a preview host, `--limit` for a small smoke test, `--concurrency` (default 4, maximum 8), and bounded retries for transient 429/5xx/network failures. For previews it fetches each sitemap path from the preview host while comparing canonical metadata with the absolute URL in sitemap XML.
- [ ] This script has not yet been run against a fresh exact-head preview because Vercel's deployment quota remains blocked. First smoke-test with `npm run audit:sitemap -- --base https://<preview-host> --limit 20`, then run the full sitemap audit and archive its summary/failures before closing the release gate.
- [ ] The audit checks canonical/indexability and job structured data; hreflang target validation remains a separate acceptance check and should be added if the first full run shows that it is needed.

## Production promotion follow-up — 2026-10-11

- [x] Rechecked production after the user's promotion: `/jobs` returns HTTP 200, has canonical `https://www.joboye.com/jobs`, and is not marked noindex. `/hi/jobs`, search, filter, and page-2 views are noindex/follow and canonical to `/jobs`.
- [x] Corrected locale-aware listing navigation so English forms, filters, and pagination generate `/jobs` rather than `/en/jobs`; Hindi continues to use `/hi/jobs`. Commit: `70928041198d0abaaf7e5558653bc9f7a571146b`.
- [ ] Social metadata remains a production acceptance item: the current production response still shows generic layout-level OG/Twitter metadata and `og:url=https://www.joboye.com/en`, despite the correct canonical. The promoted production deployment is commit `d7b85ad25569ead17bc9ad35c539775277589f99`, which predates the latest branch head; verify page-level metadata on a fresh deployment of the latest branch before closing this item.
- [ ] Do not treat the fetch tool's HTTP 200 for `/en/jobs` as proof that the first request does not redirect: the tool follows redirects and returns the final response. The proxy's `localePrefix: "as-needed"` policy and canonical generated links are in place; raw first-hop redirect status still needs a client that does not follow redirects.
- [ ] Latest CI on `1ee272ac3dfdb390e50632e93d95c7b75efb60f2`: application type-check, architecture contract tests, and contract-test type-check passed; lint failed with the existing repository-wide baseline of 197 errors / 75 warnings. The new canonical-link commit will trigger a new exact-head run.
- [ ] Full sitemap audit and fresh exact-head preview verification remain open. Do not merge or promote until exact-head checks and the sitemap audit are reviewed.

## Canonical listing navigation follow-up — 2026-10-11

- [x] English locale-aware listing now emits `/jobs` for form submissions and generated filters/pagination; Hindi remains `/hi/jobs`. Added render-level regression tests for the generated paths.
- [x] On code commit `70928041198d0abaaf7e5558653bc9f7a571146b`, application type-check, contract-test type-check, and architecture contract tests passed; lint remains the repository-wide failure. The new render assertions landed after that run and need validation on the next exact-head CI run.
- [ ] The full sitemap audit remains pending; run `npm run audit:sitemap -- --base https://www.joboye.com --limit 20` first, then the full audit. A fresh preview is still needed to verify the latest branch metadata fix without relying on the older production deployment.
