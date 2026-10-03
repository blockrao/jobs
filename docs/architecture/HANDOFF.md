# JobOye architecture programme — handoff

Status as of 2026-10-03, 20:50 IST. Read this first in a new session, then
`ARCHITECTURE_LEDGER.md` (source of truth) and `../ARCHITECTURE_CHANGELOG.md`.

## Where the programme stands

| # | Increment | Status |
| --- | --- | --- |
| 1 | MIG-001 migration boundary | CLOSED |
| 2 | SEC-001 public trust boundary | CLOSED |
| 3 | ARC-001 logical architecture (`ARC001_LOGICAL_ARCHITECTURE.md`) | CLOSED, frozen |
| 4 | SEO-001 public representation (`SEO001_PUBLIC_REPRESENTATION.md`) | Steps 1–3 live; OPEN on one deployment |
| 5 | Organization Registry | Not started — next formal pre-change report |
| 6–10 | Posting Classification → Official Document Acquisition → Recruitment Identity → Post Extraction → Lifecycle and Events | Not started |
| 11–14 | Shadow Validation → Canonical Read Migration → Legacy Retirement → Final Readiness Gate | Not started |

Contract suite (`npm run test:contracts`): 2 failed (ENT-07 → Recruitment
Identity; IDX-06 → Canonical Read Migration), 103 passed, 28 skipped of 133.
Open architecture decisions: 0. Deferred empirical validation: 1 (U-07).

## Immediate pending items

1. **Close SEO-001.** The hosting plan's daily deployment limit was hit on
   2026-10-03 (~20:10 IST). After it resets the owner deploys `main` once on
   the serving project. Then re-check on https://www.joboye.com: (a) no
   `hreflang` in the HTTP `Link` header of an entity page (A-052); (b) an
   English entity URL is not redirected for a Hindi `Accept-Language` or a
   Hindi preference cookie (A-053). Both are fixed in `main` and verified on
   a preview. If both pass, record SEO-001 CLOSED. Do not expand SEO-001.
2. **Bounded maintenance, after SEO-001 closes, before the data sequence**
   (isolated changes, own verification, not roadmap increments, SEC-001 not
   reopened): A-039 secure the unauthenticated paid-API endpoint
   `/api/query/normalize`; A-041 assess the database function that reads a
   missing table and fix if bounded.
3. **Pre-data safety gate.** Before the Organization Registry or Posting
   Classification modifies production data, backup and restore must be
   *tested*: snapshot exists, a restore is actually performed, the procedure
   is documented, the recovery point suits the first mutation. What backups
   the database plan provides has not been checked yet.
4. **Organization Registry pre-change report** (analysis only until
   approved). Ledger: A-003, A-014. Baseline: about 108 of 201 postings have
   organization problems (54 in 6 bucket organizations, 44 with title-derived
   names, about 10 misfiled); 125 organization rows.

## Rules in force (owner directions)

- Cadence: PRE-CHANGE → APPROVAL → IMPLEMENTATION → VERIFICATION → RESULT →
  CLOSURE. No implementation before approval. Every report opens with the
  scorecard. New findings go to the ledger and never expand the increment.
- Architecture is provider-independent; ARC-001 is frozen and reopened only
  on concrete contradictory evidence. No broad audit, no governance reset.
- Do not pull work forward: no recruitment identity from weak aggregator
  evidence; no canonical Post from titles; no lifecycle from stored stages;
  no public read migration before Shadow Validation.
- Every data-reconstruction increment must account for the existing baseline
  **and** postings arriving while it runs, without competing sources of
  truth. About 100 postings sit in the admin review queue.
- All production schema changes go through `supabase/migrations/` (A-040).
  No direct production DDL. Historical migration files stay untouched.
- No canonical-data mutation (merges, backfills, new constraints,
  destructive migrations) without an approved pre-change report.
- The issuing/employing/conducting organization model is validated against
  real official notifications in Official Document Acquisition, not before.
- Editorial fields (review status, quality tier, publishing) are mapped
  before Canonical Read Migration (A-033).
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
  connector only (project `jobs`). Live-site checks need a browser on the
  owner's machine or the owner.
- Local production server for served-HTML checks:
  `node node_modules/next/dist/bin/next start -p <port>`; track and kill the
  real PID. A stale server silently invalidates results.
- Framework: this Next.js version differs from common documentation; read
  `node_modules/next/dist/docs/` before changing routing or layouts. The app
  has two root layouts (`src/app/(default)`, `src/app/[locale]`), one shell
  (`src/components/root-shell.tsx`), and must not get an `src/app/layout.tsx`.
