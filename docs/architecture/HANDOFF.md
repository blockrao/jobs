# JobOye architecture programme — handoff

Status as of 2026-10-07, IST. Read this first in a new session, then
`ARCHITECTURE_LEDGER.md` (source of truth) and `../ARCHITECTURE_CHANGELOG.md`.

## Where the programme stands

Increments closed: MIG-001, SEC-001, ARC-001 (frozen), **SEO-001 (closed 2026-10-07)**.

**ELIG-001 scope freeze (A-082, 2026-10-07):** The full eligibility engine (qualificationExpr contract, GradeThreshold, ExperienceLeaf, MINIMUM/PREFERRED, age-rule computation, candidate verdicts) is deferred to Phase 2. The schema work done is preserved as Phase 2 preparation and must not become a Phase 1 dependency. Phase 1 stores eligibility facts as display text only (qualification_text, experience_text, age info, source reference). No "Can I apply?" logic in Phase 1.

**Phase 1 priority is discoverability:** Every valid Post must have a canonical URL, rich factual content, correct structured data, sitemap coverage, and no fabricated/inferred facts. See "Phase 1 P0 items" below.

**Open items, in order:** See "Phase 1 P0 items" below.

**Data track: UNDER REVIEW, do not start DATA-000.** The owner challenged the
scope on 2026-10-03 night as an endless-cycle risk. The sequence recorded in
ledger A-061 to A-066 is on hold; a smaller replacement is proposed below and
awaits the owner's decision. The principles in A-061 (ARC-001 stays
authoritative), A-064, A-065 and A-066 stand.

| Item | Status |
| --- | --- |
| MIG-001, SEC-001, ARC-001 | CLOSED |
| SEO-001 public representation (`SEO001_PUBLIC_REPRESENTATION.md`) | **CLOSED 2026-10-07** — Steps 1–3 live and verified; A-052 (no hreflang HTTP header) and A-053 (no language redirect) confirmed in production |
| A-039, A-041 (bounded maintenance) | **CLOSED** per ledger 2026-10-04 |
| Pre-data safety gate | Not started; backups not yet checked |
| ORG-001A registry contract and primitives | On hold with the data track; may be replaced by the write-path fix proposed below |
| DATA-000 bounded audit | ON HOLD: plan written (`DATA000_EXECUTION_PLAN.md`) but not approved; no audit work started |
| DATA-001 → DATA-005, ORG-001B, CLASS-001 → GATE-001 | Not started; on hold |

Order of the data track as recorded in A-061 to A-066 (UNDER REVIEW; not to be
executed until the owner decides): DATA-000 → DATA-001 → DATA-002 → DOC-001 → DATA-003 →
DATA-004 → DATA-005, then ORG-001B → CLASS-001 → REC-001 → POST-001 →
LIFE-001 → SHADOW-001 → READ-001 → RET-001 → GATE-001.

Contract suite (`npm run test:contracts`): 2 failed (ENT-07 → REC-001;
IDX-06 → READ-001), 103 passed, 28 skipped of 133. Open architecture
decisions: 0. Deferred empirical validation: 1 (U-07).

## WP-001 readiness gate (2026-10-04, local only)

Architect approved the sequence data → platform readiness → data flow. The
local readiness implementation and dry run are done and recorded in
`WP001_READINESS_RESULT.md` (evidence in `evidence/`). Nothing is applied to
production and nothing is pushed: the migration
`20261004060000_wp_001_observation_candidate_boundary.sql`, the write-path
rewrite, the promotion step and the file loader ride with the next deliberate
deployment. Unpushed commits: f3b6445, 34957cc and the readiness commit.
Blocking before any production load: tested backup and restore
(`WP001_BACKUP_GATE.md`, owner action), a full-fidelity dry run on the
restored copy, owner and architect review of the result. Next increment is
chosen from the result (alias seed list, posts and vacancies as rows,
recruitment dates, `/jobs` pagination). DATA-000 stays on hold.

SEO freeze (2026-10-04): G1/G3 approved by the architect and implemented
locally (`evaluateJobPostingEligibility`, tests SD-09a..j). Unit rule: one
JobPosting per resolved Post, none for unresolved multi-post notices. Freeze
once verified with the data deployment. Do not push before the backup gate.

## Phase 1 P0 items (the real work now)

Owner direction 2026-10-07 (A-082). Phase 1 = discoverability. All items below serve indexability and factual richness of individual Posts.

1. **Decompose remaining recruitments into individual Posts.** Every recruitment that contains multiple roles must produce one Post row per role. The Post is the Phase 1 product object.
2. **Canonical, indexable URL for every valid Post.** `/jobs/{recruitment-slug}/{post-slug}` — no missing pages, no 404s, correct self-canonical, bidirectional nav.
3. **Sitemap and internal linking.** Every live Post URL in sitemap. Role pages (`/posts/{role-slug}`) link to Post leaf pages. No orphan Posts.
4. **Post page factual richness.** Each Post page must include where available: title, vacancy count, qualification (text), salary/pay scale, age limits, location, key dates (open/close/exam), application URL, official source link.
5. **Resolve 22 unlinked Posts.** Identify and link them.
6. **Official-source coverage.** Increase Posts that have a confirmed official source URL.
7. **JobPosting structured data.** Verify correct schema.org/JobPosting on individual Post pages.
8. **Lifecycle / expired jobs.** Represent correctly — expired posts must not show misleading active state.
9. **Eliminate fabricated/inferred facts.** No invented URLs, no inferred salaries, no title-derived organization names promoted to canonical facts.

## Closed / on hold (for reference)

~~**Close SEO-001.**~~ **DONE 2026-10-07** — A-052 (no hreflang HTTP header) and A-053 (no language redirect on English entity URLs) both verified in production. SEO-001 CLOSED.

~~**Bounded maintenance** (A-039, A-041).~~ **DONE** — Both closed per ledger: A-039 CLOSED 2026-10-04 (paid-path auth + rate limit deployed); A-041 CLOSED 2026-10-04 (`refresh_posting_urgency_states` repaired and run).

**ELIG-001 eligibility engine:** Deferred to Phase 2 (A-082). Schema work preserved; must not become Phase 1 dependency.

**Data track (DATA-000 → GATE-001):** On hold pending owner decision. Do not start.

**ORG-001A:** On hold with data track.

## Proposed replacement for the data track (owner decision pending)

Evidence: organizations are created from scraped strings at write time
(`getOrCreateOrganization` in `src/db/operations/write-postings-v2.ts`),
which produced the bucket, title-derived and duplicate rows (Gate 2 O1–O4).
Source text is a snippet (median 292 characters) from five aggregators, and
none of 208 documents is official. The cause is the write path and the weak
source, not a missing survey of the organization universe.

1. **Demand input from the owner:** top exam pages and queries (GA4 events
   exist, see `ANALYTICS_SETUP.md`; Search Console).
2. **Write-path fix** (small, one push): organizations resolve against an
   alias table; an unmatched name creates no organization and leaves the
   posting in review. Needs a short pre-change report, a migration and a
   contract test.
3. **Seed and map:** a reviewed list of real issuing bodies with aliases, and
   a reviewed mapping of the 125 legacy rows. Applied only after the tested
   backup and restore.
4. **Pilot:** 3–5 high-demand recruitments from the official source to a
   correct page, dry-run first (`DRY_RUN`, `INGEST_OUT`). What breaks decides
   the next increment.

Deferred until the pilot says otherwise: DATA-000 to DATA-005 as written,
ORG-001B as a population programme, hierarchy, historical names, a formal
review-queue workflow.

## Rules in force (owner directions)

- Cadence: PRE-CHANGE → APPROVAL → IMPLEMENTATION → VERIFICATION → RESULT →
  CLOSURE. No implementation before approval. Every report opens with the
  scorecard. New findings go to the ledger and never expand the increment.
- Architecture is provider-independent; ARC-001 is frozen and reopened only
  on concrete contradictory evidence, through change control. No broad
  audit without a concrete output, no governance reset.
- Do not pull work forward: no recruitment identity from weak aggregator
  evidence; no canonical Post from titles; no lifecycle from stored stages;
  no public read migration before Shadow Validation.
- No acquisition system writes directly into canonical data. A discovery
  source (aggregator) is not an authority source (A-064).
- External findings are graded observed / sampled / inferred / unknown and
  are never presented as estimates of the ecosystem (A-066).
- Every data-reconstruction increment must account for the existing baseline
  **and** postings arriving while it runs, without competing sources of
  truth. About 100 postings sit in the admin review queue.
- All production schema changes go through `supabase/migrations/` (A-040).
  No direct production DDL. Historical migration files stay untouched.
- No canonical-data mutation (merges, backfills, new constraints,
  destructive migrations) without an approved pre-change report.
- The issuing/employing/conducting organization model is validated against
  real official notifications in DOC-001, not before.
- Editorial fields (review status, quality tier, publishing) are mapped
  before READ-001 (A-033).
- Hindi product work (listing URLs, navigation language, title-only "has
  Hindi") is deferred: A-054, A-055, A-056.
- Never put API keys, secrets or credentials in reports or the repository.
- Nothing is reported as verified in production unless it was actually
  tested there.

## Operational facts

- Repository `blockrao/jobs`; production branch `main`.
- Serving hosting project: **`asdf`** (team `jobing`); it serves
  www.joboye.com. The other three projects were deleted on 2026-10-03.
- Deployment limit: 100 per day on the current plan, and a plan upgrade is
  not an option. Push once per verified step; batch documentation with code;
  do not push documentation-only commits repeatedly.
- Do not redeploy from the hosting dashboard while an increment is in
  verification; it bypassed the Step 3 preview gate once.
- Previews of `asdf` have the database and are behind the host's login.
- The agent workspace cannot reach the database, the live site or the
  hosting provider from its shell. Database access is through the Supabase
  connector only (project `jobs`). Live-site checks use a browser on the
  owner's machine or the owner. Public web pages can be read with web fetch
  and search only; that is not crawling and some sites are declined.
- Local production server for served-HTML checks:
  `node node_modules/next/dist/bin/next start -p <port>`; track and kill the
  real PID. A stale server silently invalidates results.
- Framework: this Next.js version differs from common documentation; read
  `node_modules/next/dist/docs/` before changing routing or layouts. The app
  has two root layouts (`src/app/(default)`, `src/app/[locale]`), one shell
  (`src/components/root-shell.tsx`), and must not get an `src/app/layout.tsx`.
