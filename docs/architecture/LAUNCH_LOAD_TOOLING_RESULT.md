# Launch load: implementation and tooling result (local, nothing deployed)

Date: 2026-10-04. Covers owner approval of 2026-10-04 14:14 IST (scope, Option A, safeguards).
No production write, no push, no alias applied.

## Scorecard

| Item | Result |
| --- | --- |
| Advertisement number as recruitment identity key | Done, 6 tests (LI-1..4, LI-U1..2) |
| Recruitment start/end dates (fill start once, extend end, never shorten) | Done (LI-4) |
| `/jobs` pagination (page 2+ treated as filtered: noindex, canonical to `/jobs`, per SEO-001) | Done (LG-2, LG-U1..3) |
| Date guard on organization, category, exam, commission pages | Done (LG-1) |
| Search fix A-068 and param numbering; same date guard on search | Done (S-1..5) |
| Full contract suite | 178 passed; only the two known baseline failures (ENT-07, IDX-06); typecheck clean |
| Export, manifest, verify, rollback tooling | Built and rehearsed end to end on local scratch |
| Alias seed | Sheet v2 delivered; **not applied; awaiting owner marks** |

## Findings that change the plan

1. **Search needs derived columns.** Text search reads `search_text`, which only
   `refresh_posting_urgency_states()` fills, and nothing in the application calls it. Production today:
   7 of 54 approved postings have search text. After promotion, the function must be run once
   (part of the promotion step, with its own before/after hash), or search returns nothing for the
   new pages. `/jobs` and entity pages do not depend on it.
2. **Connector size.** The export is about 8.6 MB of SQL (152 chunks: observations 3.4 MB, postings
   2.7 MB). That cannot be carried through the database connector (every chunk would have to pass
   through the agent and be re-typed). The same chunk files are applied by `apply.sh` with `psql`,
   run by the owner with the production connection string held only in his terminal. The rehearsal
   applied all 152 chunks in 15 seconds. **This deviates from "connector/chunked" and needs the
   owner's approval.** All approved safeguards are unchanged.
3. Existing-row protection by construction: the export contains only keys production lacks (list
   taken from production just before export); INSERT only, no ON CONFLICT, no UPDATE.

## Rehearsal (scratch only; all 712 organizations simulated as seeded, so this is the maximum-volume case)

- Loaded: 899 postings, 896 recruitments (three notices share an advertisement number), 1,001 posts,
  899 source documents, 919 observations, 712 organizations and aliases, 0 candidates.
- Apply: per-chunk hash check, per-table verification (count and fingerprint of manifest rows) all equal.
- Existing rows (125 organizations, 5 baseline postings): before and after hashes identical.
- Rollback by manifest: target returned exactly to the baseline hashes.
- Negative tests: a tampered chunk stops the run; a key conflict (row appearing before its chunk) stops
  the run and is not absorbed.
- Owner-side script `apply.sh` (psql only) tested on the same target: stops at the first conflict;
  clean run printed BEFORE, VERIFY and AFTER blocks; VERIFY equals the manifest for all 10 tables.

## Files

`scripts/launch-load/`: `tables.ts` (natural keys, load order), `export.ts`, `state-hash.ts`,
`apply.sh` (owner, psql), `apply-local.ts`, `rehearse.ts`. Outputs per export: `chunks/`, `manifest.json`,
`verify.sql`, `rollback.sql`, `state.sql`, `chunk_list.txt`.

## Still needed before a production load

1. Owner marks the alias seed sheet (Y / N / EDIT); the seed becomes part of this release.
2. Owner approves the deployment push of the code (6 local commits).
3. Owner approves the apply route (psql by owner) or another route.
4. After deployment: production keys list and slim baseline taken just before export; real export;
   load PENDING; verification report. Promotion is a separate GO, followed by the derived-column refresh.
