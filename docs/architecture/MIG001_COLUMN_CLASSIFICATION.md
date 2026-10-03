# MIG-001 — classification of the 18 live-only columns

These columns exist in the production database and are not declared in
`src/db/schema.ts`. They are classified, not copied: the aim is for the
application schema to state the real database contract on purpose.

Measured 2026-10-03. "Rows set" is the count of rows holding a non-default
value. No column is changed by MIG-001; "Proposed action" is a
recommendation for the increment named.

Classes: REQUIRED · INTENTIONAL DB-ONLY · LEGACY · UNKNOWN · REMOVE LATER.

## `postings` (201 rows)

| Column | Purpose | Rows set | Current consumers | Owner | App needs it | Class | Proposed action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `is_expired` | Marks a posting as no longer open | 1 | Written by the lifecycle function and trigger; read by the search views and `search-queries.ts` | Lifecycle | Indirectly, through views | INTENTIONAL DB-ONLY | Keep. Becomes a derived cache of the canonical lifecycle (A-018); decide declaration in the lifecycle increment |
| `expiration_reason` | Why it expired | 1 | Same writers; `expired_postings` view | Lifecycle | No | INTENTIONAL DB-ONLY | Same as `is_expired` |
| `expired_at` | When it expired | 1 | Same writers; `expired_postings` view | Lifecycle | No | INTENTIONAL DB-ONLY | Same as `is_expired` |
| `search_text` | Full-text search vector | 5 | Written by `refresh_posting_urgency_states()`; read by `search-queries.ts` | Search | Yes, via raw SQL | INTENTIONAL DB-ONLY | Keep. Not a plain ORM column type; document as database-maintained |
| `announcement_state` | Freshness bucket | 5 | Same writer; search views and `/api/search/jobs` | Search | Yes, via views | INTENTIONAL DB-ONLY | Keep as derived read-model |
| `closing_state` | Deadline bucket | 5 | Same | Search | Yes, via views | INTENTIONAL DB-ONLY | Keep as derived read-model |
| `urgency_score` | Sort score | 5 | Same | Search | Yes, via views | INTENTIONAL DB-ONLY | Keep as derived read-model |
| `days_to_closing` | Days until deadline | 5 | Same; two search components | Search | Yes, via views | INTENTIONAL DB-ONLY | Keep as derived read-model |
| `source_type` | Authority of the posting's source | 4 | None in code | Provenance | No | REMOVE LATER | Duplicates `sources.authority` (A-029). Retire in the provenance increment |
| `official_application_url` | Official apply link | 0 | None | Provenance | No | LEGACY | Empty and overlaps `apply_url`. Retire with the provenance increment unless ARC-001 gives it an owner |

## `recruitments` (183 rows)

| Column | Purpose | Rows set | Current consumers | Owner | App needs it | Class | Proposed action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `calculated_status` | A second status vocabulary | 0 | None. The function that would fill it is unreferenced | Lifecycle | No | REMOVE LATER | Retire in the lifecycle increment, in a separate destructive migration (S-01) |
| `status_last_calculated` | Timestamp of the last lifecycle refresh | 0 | Written by `refresh_recruitment_lifecycle()` | Lifecycle | No | LEGACY | Retire with the database lifecycle function when the domain service replaces it (A-019) |
| `days_to_closing` | Days until deadline | 0 | None. The recruitment page computes its own value | Lifecycle | No | LEGACY | Retire in the lifecycle increment |
| `source_url` | Where the recruitment was found | 0 | None on this table | Provenance | No | UNKNOWN | Decide in ARC-001: provenance belongs to the evidence chain (A-017), not a column |
| `official_notification_url` | Official notification link | 0 | None on this table | Provenance | No | UNKNOWN | Decide in ARC-001, as above |
| `official_application_url` | Official apply link | 0 | None on this table | Provenance | No | UNKNOWN | Decide in ARC-001, as above |
| `verification_status` | Verified or not | 0 | None on this table | Governance | No | UNKNOWN | Decide in ARC-001 with the governance fields (A-033) |
| `last_verified_at` | When verified | 0 | None on this table | Governance | No | UNKNOWN | Decide in ARC-001 with the governance fields (A-033) |

## Summary

| Class | Columns |
| --- | --- |
| REQUIRED | 0 |
| INTENTIONAL DB-ONLY | 8 |
| LEGACY | 3 |
| REMOVE LATER | 2 |
| UNKNOWN | 5 |

None needs to be added to `src/db/schema.ts` now. `schema.ts` already
carries a comment recording that the ten `postings` columns are deliberately
undeclared; that comment stays accurate.

## Related drift noted while classifying (recorded, not acted on)

- `postings.verification_status` is `varchar(50)` live and declared as
  length 40 in `schema.ts`.
- Five unique indexes exist live and are undeclared in `schema.ts`
  (Phase 0 baseline §2).
- `refresh_posting_urgency_states()` reads a table, `organizations_new`,
  that does not exist, so it cannot currently run. This explains why only 5
  postings carry search and urgency values.
- An enum `organization_role` (EXAM_AUTHORITY, RECRUITING_BODY, EMPLOYER)
  exists and is used by no column.
