# WP-001 v2 — real-data integration pilot: PRE-CHANGE revision

Status: 2026-10-04. Revises `WP001_PRECHANGE_REPORT.md` after the architect's
"WP-001 Approval and Direction" (approved in principle). Analysis only; no code,
migration or data change. Where v1 and v2 differ, v2 governs.

## Scorecard

| Item | Result |
| --- | --- |
| Decision | WP-001 APPROVED IN PRINCIPLE with three required changes |
| Production data changed | None |
| Change 1 | Unresolved organizations go to **Organization Candidates**, never canonical. v1 step 2 (create `verified=false` organization) is **withdrawn**; `organizations.verified` is **not added** |
| Change 2 | Lightweight **raw observation** layer before canonical posting |
| Change 3 | The ~800 notices are an integration pilot; measure the architect's list (section 6) |
| Blocking prerequisite | Tested backup/restore: `WP001_BACKUP_GATE.md`, NOT RUN |
| Pushes needed | 1 (migration + code + tests), after owner approves this note |
| Owner decisions open | 3 (section 7) |

## 1. Flow

Source → Raw Source Observation → Normalize/Classify → Resolve → Validate →
Canonical Posting → Public Projection.

## 2. Schema (one additive migration, A-040; no existing column changed)

- `source_observations(id, source, external_id, source_url, fetched_at,
  content_hash, raw jsonb, run_id)`. Append-only. A new row only when
  `content_hash` differs from the latest for (source, external_id). Answers
  "what did the source tell us when we ingested it". Stores the collected
  facts and labelled fields; not the aggregator's descriptive prose beyond what
  is already stored today.
- `organization_aliases(id, organization_id, alias_normalized unique, source,
  created_at)`.
- `organization_candidates(id, raw_name, normalized_name, source, source_url,
  evidence jsonb, confidence, reason, proposed_organization_id null,
  status, observation_id, created_at)`; unique (normalized_name, source).
  Not a canonical organization; never linked from public pages.
- `posting_field_observations` is **not** added now. Deadline history is kept
  by the observation rows; a posting field changes only per section 4.

## 3. Organization resolution

1. Normalized labelled "Company Name" matches `organization_aliases` → existing
   canonical organization.
2. Recognizable but not established → candidate row, with proposed canonical
   organization if one is near. The posting is **not** created in `postings`
   (`organization_id` stays NOT NULL); the observation and candidate are kept and
   counted as "held".
3. Establishing a candidate as canonical is an explicit, reviewed act (seed
   list or owner decision), outside the automatic path.
4. The headline guess `inferOrg(title)` is no longer used to create anything.

## 4. Existing postings and changing values

- Idempotent on (`source`, `external_id`) via `postings_source_external_idx`.
- Fill empty fields only. Reviewed/curated values (review_status decided, or
  edited by an editor) are never silently overwritten.
- New observation vs current value: same → no change; different → update if
  the current value is unreviewed/source-derived, else flag for review
  (record in `posting_updates`, which already exists). Previous observation is
  retained. Deadlines (extensions, corrigenda) follow this rule.
- No duplicate merging in this step.

## 5. Publication safety gate (pilot only)

Rule from v1 section 4 stays, tightened: official/issuer-domain notification
link required; aggregator-only link means draft; source and verification state
kept internally; public pages direct to the official notification. Conservative
over coverage; the 449-of-799 figure is an upper bound.

## 6. Pilot measurements (actual results after load)

Coverage; organization (alias-resolved, candidates, newly established
canonical, bucket/title-derived prevented); recruitment (identified, duplicate
candidates, unresolved); posts/vacancies (extracted, counts captured,
mismatches); dates (present, missing, conflicting, changed); provenance
(official links, aggregator-only, observations, evidence); quality (needing
review, failure reasons, architectural gaps). Output as a table from the dry run
first, then from the load.

ARC-001 test inside the pilot: issuing vs employing organization on 3-5 real
multi-post notifications. A genuine contradiction goes through change control;
otherwise ARC-001 is unchanged.

## 7. Order and decisions

Order (architect): 1 backup/restore → 2 observation + candidate tables →
3 organization write path → 4 contract tests → 5 dry run on ~800 → 6 owner
review → 7 production load → 8 measure → 9 next increment from failures.

Owner decisions: (1) approve this v2 (candidates and observation boundary) to
start step 2 after the gate; (2) run the backup gate; (3) confirm DATA-000 is
cancelled in favour of WP-001 so HANDOFF and the ledger can be updated.

Contract tests (step 4): alias variant resolves with no new row; headline-style
name creates no organization and one candidate; clean unknown name creates a
candidate, not an organization; re-run is idempotent; unreviewed deadline is
updated by a newer observation; reviewed deadline is flagged, not overwritten;
no write to `postings` without a resolved organization.

Not doing: ecosystem audit, hierarchy, historical names, full review queue,
mass duplicate reconciliation, reading every PDF, redesigning ARC-001, official
document acquisition, geography model, AI layer.
