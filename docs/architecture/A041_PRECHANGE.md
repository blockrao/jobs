# A-041 pre-change report: refresh_posting_urgency_states() reads a missing table

Date: 2026-10-04. Analysis plus a local rehearsal. Nothing applied to production.

## Scorecard

| Item | Status |
| --- | --- |
| Defect reproduced | YES (scratch): `relation "organizations_new" does not exist` |
| Fix | one migration, function body only, table name `organizations_new` to `organizations` |
| Migration alone changes any row | NO (0 rows) |
| Function run on scratch after fix | updates only rows that are APPROVED with AUTOMATED_VALIDATION_PASS/PUBLISHED; 0 other rows, 0 review/publishing/title/date/organization changes |
| Applied to production | NO, approval requested |

## Evidence (production, read-only, 2026-10-04)

- `organizations_new` does not exist; the function body in production is the baseline file (`supabase/baseline/functions/refresh_posting_urgency_states.sql`).
- The helper functions it calls (`get_announcement_state`, `get_closing_state`, `calculate_urgency_score`, `generate_posting_search_text`) exist.
- Postings with `search_text` or `announcement_state`: 5 of 201. Postings the function would update (APPROVED and AUTOMATED_VALIDATION_PASS/PUBLISHED): 7.
- No caller: nothing in the database, `vercel.json` or `src/` calls the function. The 5 populated rows came from an earlier manual or legacy run.
- Consumers: `src/lib/search-queries.ts` (`/search`, `/api/search/jobs`) filter and rank on `search_text`, `announcement_state`, `closing_state`, `urgency_score`.

## Change

`supabase/migrations/20261004140000_a_041_fix_urgency_function_org_table.sql`: `CREATE OR REPLACE FUNCTION` with the identical body except the table name. It does not run the function, alter a table or touch a row. Historical migrations untouched.

## What this does and does not fix (observed)

- It repairs the function so a call succeeds.
- It does not make anything call it. Until a call happens the values stay as they are. The function's own filter covers 7 of 201 postings today; the other 47 APPROVED rows are DRAFT and stay out by that rule, which this change does not widen.

## Decision requested

1. Apply the migration to production (function replacement only).
2. Either (a) one approved manual run, which writes derived columns (`announcement_state`, `closing_state`, `urgency_score`, `days_to_closing`, `search_text`) on the 7 eligible rows, or (b) leave it uncalled until the lifecycle or promotion step is chosen to call it (a scheduling decision, not part of A-041).

Recommendation: apply (1) and run (2a) once so `/search` has data for those 7; scheduling stays out of scope.
