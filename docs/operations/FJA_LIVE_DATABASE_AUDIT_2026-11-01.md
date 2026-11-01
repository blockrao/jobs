# JobOye FJA live database audit — 2026-11-01

**Project:** Supabase `jobs` (`cusxodjgkrttwmdmhvso`)  
**Mode:** Read-only SQL and schema inspection  
**Purpose:** Determine why earlier FJA-extracted records did not consistently appear on JobOye's public UI.

## Current table counts

| Table | Rows |
|---|---:|
| `public.recruitments` | 6,365 |
| `public.posts` | 5,814 |
| `public.postings` | 4,223 |
| `public.fja_job_inventory` | 1,434 |
| `public.fja_post_inventory` | 0 |
| `public.fja_source_captures` | 1,542 |
| `public.source_observations` | 2,975 |

The FJA private inventory and source capture tables exist in the currently connected production database. This updates an older runbook observation that they were not present at the time of that earlier inspection.

## FJA inventory processing states

| Detail status | Source status | Rows |
|---|---|---:|
| EXTRACTED | OPEN | 551 |
| EXTRACTED | CLOSED | 1 |
| PARTIAL | OPEN | 529 |
| PARTIAL | CLOSED | 28 |
| PARTIAL | UNKNOWN | 239 |
| PENDING | UNKNOWN | 86 |
| **Total** | | **1,434** |

The dedicated `fja_post_inventory` table contains zero rows despite 1,434 recruitment inventory rows. Post-wise extraction/persistence is therefore not populated in that inventory layer.

## Relationship to the legacy posting layer

Joining FJA inventory to `public.postings` by exact `external_id` produced 1,012 matches (the SQL count query returned 1,012 joined rows). Of those:
- 1,012 have an `inferred_recruitment_id` resolving to an existing recruitment row with a non-empty slug.
- 884 have an `inferred_post_id` resolving to an existing post row with a non-empty slug.
- 128 matched legacy posting rows have no resolved post leaf.
- 39 matched posting rows have `review_status = APPROVED`.
- 30 matched posting rows have `publishing_status = AUTOMATED_VALIDATION_PASS`.

The FJA-matched `postings` lifecycle distribution was:

| Review status | Publishing status | Index tier | Rows |
|---|---|---|---:|
| PENDING | DRAFT | B | 969 |
| APPROVED | AUTOMATED_VALIDATION_PASS | A | 16 |
| APPROVED | AUTOMATED_VALIDATION_PASS | B | 12 |
| APPROVED | DRAFT | B | 11 |
| PENDING | AUTOMATED_VALIDATION_PASS | B | 2 |
| REJECTED | DRAFT | B | 1 |
| PENDING | DRAFT | C | 1 |

A separate exact URL comparison found only 2 FJA inventory URLs matching recruitment source URLs, 0 matching legacy posting source URLs, and 2 matching post source URL fields; the stronger observed overlap is via `postings.external_id`.

## What this indicates

This is strong evidence for a likely cause of the earlier UI problem:

1. FJA extraction/inventory persistence did occur for a substantial set of records.
2. Many records were then written primarily into the legacy `postings` table, with inferred relationships to canonical recruitments/posts.
3. Most FJA-matched posting rows (969 of 1,012) remain `PENDING / DRAFT`, which is not the same as public publication.
4. 128 matched posting rows have no resolved Post Leaf relationship, contrary to the intended Hub + at-least-one-Leaf delivery contract.
5. The private `fja_post_inventory` table is empty, so the dedicated post-level inventory path did not persist the extracted post candidates.

This does not yet prove which exact frontend filter excluded each record. The next audit must trace the public query filters and actual page routes, and reconcile the latest 607-URL extraction artifact against the live canonical records. Do not bulk-promote these rows to make them appear.

## Security finding — staging RLS

Supabase schema inspection returned a critical `rls_disabled` advisory for:
- `staging.fja_962_notifications`
- `staging.fja_962_post_candidates`
- `staging.fja_962_field_evidence`

RLS is disabled on all three staging tables. Supabase reports that they are exposed to the `anon` and `authenticated` roles used by Supabase client libraries, allowing unrestricted row access according to the current grants. No remediation was applied during this audit.

Do not enable RLS blindly without first defining the intended service/admin access policies, because enabling RLS without policies may block required operations. Treat this as a security remediation item before using these staging tables in a new ingestion workflow.

## Immediate next actions

1. Trace public Recruitment Hub and Post Leaf query filters for FJA-linked entities and explain exactly why pending/draft records are hidden.
2. Reconcile all 607 URLs from extraction run `41271192046` against FJA inventory, source observations, canonical recruitments, canonical posts and legacy postings.
3. Correct or replace the legacy writer so the canonical Recruitment/Post relationship is explicit, not merely inferred.
4. Persist post candidates and post-level facts; the zero-row `fja_post_inventory` state must be explained.
5. Pilot 5–10 representative records through the corrected path and verify their rendered public pages before any batch write or daily scheduling.
