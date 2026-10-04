# A-070 / A-071 / A-072 — record and pre-change note

Date: 2026-10-05. Status: applied to production (A-070, A-071), pending architect acceptance; A-072 proposed, not implemented.

## Scorecard
| Item | State |
| --- | --- |
| Official-link provenance column | Applied |
| Links promoted to recruitments | Applied (single distinct URL per recruitment; 4 recruitments with conflicting links held) |
| Lifecycle v2 function and trigger | Applied; contradicts S-01/S-02 (A-071) |
| 552 bulk verified stamps cleared | Applied |
| 856 deadlines to end of IST day | Applied (0 UTC dates shifted) |
| Lifecycle run | 17 postings expired |
| Code fixes | Not implemented (A-072) |
| Push | None |

## What was applied (data statements)
1. Link promotion: per recruitment, if all non-REJECTED postings carry a single distinct notification URL (and likewise apply URL), copy to `recruitments.official_notification_url` / `official_application_url`; `official_link_source` = MANUAL_VERIFIED if any such posting is MANUALLY_VERIFIED, else AGGREGATOR_DISCOVERED.
2. `update postings set last_verified_at = null where verification_status is null and last_verified_at is not null and source_type = 'UNKNOWN'` (552 rows).
3. `update postings set valid_through = ((valid_through at time zone 'UTC')::date + 1)::timestamp at time zone 'Asia/Kolkata' - interval '1 second' where valid_through is not null and (valid_through at time zone 'UTC')::time = time '00:00'` (856 rows).
4. `select * from refresh_recruitment_lifecycle()`.

## Rollback
- Functions/column: `supabase/rollback/a_071_*.down.sql`, `a_070_*.down.sql` (never applied automatically).
- Data: schema `backup_20261005` (`recruitments`, `postings_cols`) in the same database. This is not a tested restore and is not independent of the database.

## Deviations to be ruled on
A-040 (applied before migration file), S-01/S-02 and "no lifecycle from stored stages" (lifecycle v2), A-064 (aggregator-discovered links on recruitments, flagged by provenance), backup gate (not a tested restore).

## PRE-CHANGE (A-072, no implementation until approved)
1. `src/app/[locale]/jobs/[slug]/page.tsx` (~376): render the "Last Verified" row only when `posting.lastVerifiedAt` is set; remove the `?? posting.updatedAt` fallback. Effect: pages without a real verification show no verified date.
2. `src/ingest/promotion.ts:114`: remove `lastVerifiedAt: now` from automated promotion (keep `updatedAt`). Manual approval in `publishing-queries.ts` keeps its stamp. Effect: automated promotion no longer claims verification.
Verification: contract/unit test for both; live check of a promoted posting. Both ride with the next deployment; no push before the backup gate.

## Out of scope, recorded
Sitemap `lastmod` from a meaningful-change field; duplicate postings (354/874, 356/357); 4 held link conflicts; 240 recruitments without official link; far-future outlier deadlines (e.g. recruitment 1399); 117 inconsistent region values.
