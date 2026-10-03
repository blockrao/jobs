# JobOye architecture programme — handoff

Status as of 2026-10-03, 23:00 IST. Read this first in a new session, then
`ARCHITECTURE_LEDGER.md` (source of truth) and `../ARCHITECTURE_CHANGELOG.md`.

## Where the programme stands

Increments closed: MIG-001, SEC-001, ARC-001 (frozen). SEO-001 is open on one
deployment.

**Open items, the real work, in order:** (1) close SEO-001, (2) A-039,
(3) A-041, (4) tested backup and restore. See "Immediate pending items".

**Data track: UNDER REVIEW, do not start DATA-000.** The owner challenged the
scope on 2026-10-03 night as an endless-cycle risk. The sequence recorded in
ledger A-061 to A-066 is on hold; a smaller replacement is proposed below and
awaits the owner's decision. The principles in A-061 (ARC-001 stays
authoritative), A-064, A-065 and A-066 stand.

| Item | Status |
| --- | --- |
| MIG-001, SEC-001, ARC-001 | CLOSED |
| SEO-001 public representation (`SEO001_PUBLIC_REPRESENTATION.md`) | Steps 1–3 live; OPEN on one deployment and a live re-check |
| A-039, A-041 (bounded maintenance) | Not started; independent of the data track |
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

## Immediate pending items (items 1–3 are the real work; do these first)

1. **Close SEO-001.** The hosting plan's daily deployment limit was hit on
   2026-10-03 (~20:10 IST). After it resets the owner deploys `main` once on
   the serving project. Then re-check on https://www.joboye.com: (a) no
   `hreflang` in the HTTP `Link` header of an entity page (A-052); (b) an
   English entity URL is not redirected for a Hindi `Accept-Language` or a
   Hindi preference cookie (A-053). Both are fixed in `main` and verified on
   a preview. If both pass, record SEO-001 CLOSED. Do not expand SEO-001.
   The owner has not yet confirmed the deployment. Documentation commits
   made after 2026-10-03 20:50 IST are local and unpushed; they ride with the
   next code push (A-039).
2. **Bounded maintenance** (isolated changes, own verification, not roadmap
   increments, SEC-001 not reopened): A-039 secure the unauthenticated
   paid-API endpoint `/api/query/normalize`; A-041 assess the database
   function that reads a missing table and fix if bounded. They do not wait
   for the data track.
3. **Pre-data safety gate.** Before any production data is modified, backup
   and restore must be *tested*: snapshot exists, a restore is actually
   performed, the procedure is documented, the recovery point suits the first
   mutation. What backups the database plan provides has not been checked
   yet. DOC-001 and DATA-004 cannot write to production without it.
4. **Data track: owner decision pending.** DATA-000 is on hold and must not be
   started. A smaller replacement is proposed in the next section.
5. **ORG-001A pre-change report** (on hold; may be replaced by the write-path
   fix proposed below; analysis only until approved). Ledger:
   A-003, A-014, A-062. The ORG-001 specification is the contract. Open
   proposed points are listed in A-062. Baseline: about 108 of 201 postings
   have organization problems (54 in 6 bucket organizations, 44 with
   title-derived names, about 10 misfiled); 125 organization rows. These
   records are not cleaned before ORG-001B.

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
