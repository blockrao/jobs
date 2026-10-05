# PQ-004 Freshness policy (pre-change note)

Source: `PAGE_QUALITY_AUDIT_AND_PLAN.md` section 5D. Status: code and docs only, written locally, nothing applied, nothing pushed.

## Scorecard

| Item | Status |
| --- | --- |
| Visible "Last Verified" only from `lastVerifiedAt` | Already true; no change |
| Separate meaningful-change date for sitemap `lastmod` | Designed; code and migration file written; NOT applied |
| Supersession flag (pure helper, tests) | Written; not wired to any write or report |
| Stale-page classifier (pure helper, tests) | Written; not wired to any report |
| Database changes made | None. Migration file and rollback only |
| Production data changes | None |
| Contract suite | New tests FR-01..FR-12 pass; `tsc` clean; IDX-06 and ENT-07 fail as already known |
| Decision needed from owner | Yes, see the end |

## What the code does today (investigated)

- Sitemap: `src/app/sitemap.ts` sets posting `lastModified` from `postings.updatedAt` (via `getPostingSlugsPageForSitemap` in `src/lib/queries.ts`). Articles use their own `updatedAt`. Other entity types emit no `lastmod`.
- `updated_at` is set by application code, not by a database trigger (no trigger exists in `supabase/migrations`). It moves on:
  - every changed field in the file/observation write path, `write-postings-v2.ts` (`set.updatedAt = new Date()` whenever `set` is non-empty). That includes derived and bookkeeping fields: `indexTier`, `qualityMissing`, `qualityEvaluatedAt`, `flaggedForReview`, `reviewNotes`, provenance fields, and enrichment fills of previously empty values;
  - admin actions (stage change, approve, reject), `promotion.ts` approval, `approve-pending-jobs.ts`;
  - insert.
- It does NOT move on the Last Verified action (`publishing-queries.ts` sets `lastVerifiedAt`, `verificationStatus`, `flaggedForReview`, `publishingStatus` without `updatedAt`). Verification therefore does not touch the sitemap today. Good, and it stays so.
- Consequence: a re-ingest that only recomputes the quality tier or adds a review note refreshes `lastmod` for a page whose reader-visible content did not change. Search engines learn to ignore `lastmod` when it is noisy, so the honest fix is a date that moves only for meaningful change.
- Visible date: `src/app/[locale]/jobs/[slug]/page.tsx` shows "Last Verified" only from `lastVerifiedAt`, and only when set. Unchanged.

## Policy

1. Visible Last Verified = `lastVerifiedAt` only. Never `updatedAt`, never `content_changed_at`.
2. Sitemap `lastmod` = `coalesce(content_changed_at, updated_at)`.
3. "Meaningful change" = a reader-visible fact changed: `validThrough`, `totalVacancies`, `officialNotificationUrl`, `applyUrl`, `examDate`, `currentStage`, `extraContent`, title or description text. This is the existing `MATERIAL_FIELDS` list in `write-postings-v2.ts` plus stage and page content. Quality tier, review notes, flags, provenance, and fills of internal fields are not meaningful.
4. Supersession and staleness only flag for human review. They never change data or stage by themselves.

## Smallest design

- Additive nullable column `postings.content_changed_at timestamptz`. Migration `supabase/migrations/20261005130000_pq_004_content_changed_at.sql` (`ADD COLUMN IF NOT EXISTS`, no backfill, no default). Rollback `supabase/rollback/pq_004_content_changed_at.down.sql`. Nothing is applied.
- `src/db/schema.ts` declares `contentChangedAt` (migration README rule 7).
- Sitemap uses `pickSitemapLastmod(contentChangedAt, updatedAt)` in `src/lib/freshness/lastmod.ts`. With the column NULL everywhere the output is identical to today, so applying the migration changes no behaviour by itself.
- Not in this increment: the writers that set `content_changed_at` (the material-field branch in `write-postings-v2.ts`, admin stage change, `extraContent` updates). Until they do, the column stays NULL and the sitemap behaves as today. Proposed as PQ-004b after the migration is applied, with its own pre-change note, because it touches the write path. One-time backfill is not proposed: NULL falls back safely.

## Helpers (pure, no database)

- `evaluateSupersession(a, b)` in `src/lib/freshness/supersession.ts`. Orders the two notices of one recruitment by publication date and flags the older one when: the newer text quotes the older advertisement number; the newer text says cancels/replaces/supersedes/in modification of; the older text says cancelled or withdrawn (STRONG); or only the newer date plus a different advertisement number (WEAK). Equal or missing dates flag nothing. Caller guarantees the two belong to one recruitment.
- `classifyStalePage(...)`: `DEADLINE_SOON_UNVERIFIED` (open stage, deadline within 7 days, no verification in 14 days or never), `DEADLINE_PASSED_STAGE_OPEN` (open stage, deadline passed), else `OK`. Open stages match `OPEN_STAGES` in `content-quality/gate.ts`.
- Neither is called from production code yet. A report job or admin list using them is a later increment.

Known limits: the text patterns are English only; Hindi "radd" notices are not matched. Advertisement-number matching ignores punctuation and needs at least 3 characters.

## Deployment order (schema change)

The job page query reads every column of `postings`, and `getPostingSlugsPageForSitemap` now selects `content_changed_at`. Deploying this code before the column exists breaks every job page query and empties the sitemap (its query failure is caught and returns no rows).

1. Owner applies the migration through the recorded path (A-040).
2. Verify the column exists (one read-only check by the owner or connector).
3. Deploy the code. Nothing is pushed yet; this rides with the next deliberate deployment, after the backup gate and not before. Per the deployment-limit rule, batch it with other code.
4. Rollback: redeploy code that does not select the column, then run the rollback file.

## Decision for the owner

Approve the design (nullable `content_changed_at`, sitemap coalesce, writers deferred to PQ-004b), or choose the alternative of not adding a column and using `lastVerifiedAt` as lastmod. The alternative is not recommended: verification is a human act that happens rarely and would understate real changes.
