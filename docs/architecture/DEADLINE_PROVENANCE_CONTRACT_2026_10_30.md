# Deadline Provenance Contract — 2026-10-30

**Status:** Implemented in PR #186 using immutable source-observation JSONB facts plus the canonical recruitment deadline; review, CI and release verification pending. No production data changes  
**Parent:** JobOye Product & Discovery Operating Charter  
**Tracking:** Issue #174; lifecycle consumers audited in PR #180  
**Scope:** Canonical recruitment application deadlines only. Exam dates, notification dates and other date fields are not changed by this contract.

## 1. Problem and evidence

The public lifecycle audit found that the canonical recruitment deadline is stored as `timestamptz`, while the ingestion pipeline does not consistently preserve the source's stated precision.

Confirmed source-level evidence:

- `src/ingest/adapters/util.ts::parseIndianDate` strips time expressions (including `| 10:11 PM`, `(23:00 Hours)` and `23:00 Hrs`) and returns UTC midnight.
- `src/db/operations/write-postings-v2.ts` passes `norm.validThrough` into `resolveRecruitment` and `refreshRecruitmentDates`, which write that value to canonical `recruitments.application_end_date`.
- `scripts/promote-fja-to-canonical.ts::parseSourceDate` accepts date-only formats and constructs UTC-midnight dates; the FJA promotion mapping does not preserve deadline precision.
- Production read-only validation recorded a large cluster at 05:30 IST, consistent with UTC midnight, alongside another cluster at 23:59 IST. The audit also found 123 recruitments whose stored deadline fell on the audit's India-local date. These distributions are evidence of mixed conventions, not proof of the intended deadline for any individual record.

The current database timestamp alone cannot reliably tell us whether a source stated a date only or an exact closing time.

## 2. Canonical contract

Every newly ingested canonical recruitment deadline must carry an explicit precision classification:

- `DATE_ONLY`: the source states a calendar date but no closing time.
- `DATE_TIME`: the source states a closing time.
- `UNKNOWN`: source precision or timezone cannot be established safely, including legacy rows until evidence is recovered.

The contract applies to the recruitment-level `application_end_date`, because recruitment lifecycle is owned by the canonical `recruitments` entity. A post enrichment date must not silently override that canonical deadline.

### 2.1 Date-only deadlines

For India-based recruitment notifications, a source-stated date-only deadline remains valid through the end of that calendar date in `Asia/Kolkata`.

- Represent the deadline as an **exclusive cutoff** at midnight immediately after the stated date in `Asia/Kolkata`.
- This makes the entire stated local calendar date valid without relying on a sub-millisecond timestamp that JavaScript `Date` cannot represent.
- Preserve the original date text and mark precision `DATE_ONLY`, timezone `Asia/Kolkata`, and timezone basis `INDIA_SOURCE_DEFAULT` when the issuing authority/recruitment is demonstrably India-based.
- Do not interpret UTC midnight as the end of the application window.
- Do not apply this India timezone rule to a non-India recruitment unless the source establishes that timezone.

### 2.2 Explicit date-time deadlines

- Preserve the exact stated wall-clock time.
- If the source explicitly supplies a timezone or UTC offset, preserve it and resolve the instant from it.
- If the timezone is omitted but the issuing authority/recruitment is demonstrably India-based, use `Asia/Kolkata` and record `INDIA_SOURCE_DEFAULT`, not an explicit source timezone.
- If neither the timezone nor an India-based authority can be established, classify the effective deadline as `UNKNOWN`; do not invent a timezone or assert a precise expiry instant.

### 2.3 Unknown and legacy deadlines

- Existing rows are not to be bulk-converted based on timestamp shape (including 00:00 UTC or 23:59 IST).
- Do not infer precision from the stored timestamp alone.
- Retain the existing timestamp as historical stored data, but mark its precision `UNKNOWN` until source evidence is recovered.
- Do not backfill a guessed closing time. Recover from the official notification or another preserved source observation with traceable provenance.
- If only a date can be verified, classify it as `DATE_ONLY`; if the source is inaccessible or ambiguous, leave it `UNKNOWN`.

## 3. Lifecycle boundary

The lifecycle service must compare the current instant against the resolved **exclusive cutoff**:

- Before the cutoff: the application window remains open.
- At or after the cutoff: the application window is closed.
- For `DATE_ONLY`, the cutoff is midnight immediately after the stated India-local date.
- For `DATE_TIME`, the cutoff is the exact stated closing instant.
- `UNKNOWN` must not be converted into an invented instant.

This exclusive-boundary convention is deliberate: it avoids JavaScript's millisecond precision limit while ensuring a date-only deadline remains valid for the entire stated local day.

The status rules remain separate and authoritative: `CLOSED`, `RESULTS` and `ARCHIVED` remain non-live regardless of a future deadline. This contract does not silently change the existing unknown-status fallback; that behaviour must be explicitly decided and tested in the lifecycle-policy implementation.

## 4. Data model and provenance requirements

The canonical lifecycle value remains on `recruitments.application_end_date`. Its evidence is retained in the linked `source_observations.facts` JSONB record rather than duplicated into new recruitment columns in this release:

- `deadlinePrecision`: `DATE_ONLY`, `DATE_TIME` or `UNKNOWN`.
- `deadlineTimezone`: IANA timezone or explicit offset used to resolve the deadline; null when unknown.
- `deadlineTimezoneBasis`: `EXPLICIT_SOURCE`, `INDIA_SOURCE_DEFAULT` or `UNKNOWN`.
- `deadlineSourceText`: exact source-stated deadline text.
- `deadlineSourceLabel`: the source field/label from which the deadline was extracted.
- `deadlineSourceUrl`: candidate issuing-body notification locator when captured; it is not, by itself, proof of official authority.

The observation is linked to its posting, which resolves to the canonical recruitment. This avoids a schema migration and duplicated metadata in this release. A direct recruitment-level evidence foreign key or denormalised metadata may be considered only if queryability or audit requirements demonstrate a material need. Do not treat an aggregator URL as the official evidence source.

**Source-authority gate:** a parsed deadline may create or extend the canonical recruitment deadline only when its source-registry record is explicitly `authority = OFFICIAL` and `is_official = true`. `TRUSTED_SECONDARY`, `AGGREGATED`, missing and unknown source records may contribute observations/candidate facts only. An aggregator's capture of an official notification URL does not make the aggregator's deadline an official fact; the deadline itself must be supported by evidence from the issuing body.

The observation facts must be persisted with the ingestion event. The canonical deadline may be created or extended only through the OFFICIAL source-registry gate. A populated canonical deadline may be extended automatically only when all of the following are true:

1. A prior observation is linked to a posting belonging to the same recruitment.
2. Its source registry row is explicitly `authority = OFFICIAL` and `is_official = true`.
3. Its persisted `facts.lastDate` exactly matches the current canonical `application_end_date`, and its precision, source text and timezone provenance are complete.
4. The new candidate is later than the current deadline, has a resolved timezone and source text, and has equal-or-better precision (`DATE_TIME` is more precise than `DATE_ONLY`).

Earlier official dates (potential corrections), less-precise candidates, missing/mismatched historical evidence and provenance lookup failures do not change the canonical deadline. The incoming observation is still linked to its posting with `outcome = 'LOADED'`; `outcome_reason` receives the prefix `DEADLINE_REVIEW_REQUIRED:` and a stable reason code so the case can be reviewed. Aggregated and secondary sources remain observation-only. This deliberately permits evidence-backed official extensions while preventing silent corrections or precision degradation.

Review queue query (read-only):

```sql
SELECT id, posting_id, observed_at, outcome_reason, facts
FROM public.source_observations
WHERE outcome_reason LIKE 'DEADLINE_REVIEW_REQUIRED:%'
ORDER BY observed_at DESC, id DESC;
```

No recruitment-level schema migration is part of this release. The deadline precision and source evidence remain in the linked `source_observations.facts` JSONB record. Do not add recruitment columns or rewrite existing `application_end_date` values as part of this work. If a future queryability or audit requirement demonstrates a material need for denormalised fields, propose a separate additive migration with its own review and rollout.

## 5. Ingestion implementation requirements

1. Add a dedicated deadline parser returning the exclusive cutoff, precision, timezone, timezone basis and original source text. The parser must return `UNKNOWN` with no effective instant when timezone context is not established. Do not overload the legacy generic date parser used for notification/exam dates.
2. Update every adapter that extracts an application closing date to use the dedicated parser. Preserve raw source text in the observation facts.
3. Update FJA promotion to preserve its captured source deadline text and precision as an observation/candidate. FJA data is aggregated and must not set or extend the canonical recruitment deadline unless the deadline is independently verified against issuing-body evidence.
4. Extend `RawPosting` / normalized types and the canonical writer to pass deadline metadata into recruitment resolution and date refresh.
5. Ensure the canonical recruitment is the sole lifecycle deadline owner. Post enrichment may retain source observations but cannot silently redefine recruitment lifecycle.
6. Add unit tests for date-only, explicit time, AM/PM, 24-hour time, explicit IST/UTC offsets, missing timezone, invalid dates, ambiguous text and timezone-default eligibility.
7. Add writer tests proving precision metadata and effective instant are persisted together, and that a less-precise later observation cannot degrade a verified deadline.
8. Reconcile an existing deadline only from matching linked OFFICIAL evidence; automatically apply later equal-or-better precision extensions and persist all other conflicts as review-required observation outcomes.
9. Add a dry-run report for legacy rows that can be reconciled from retained source evidence. No production backfill until the report is reviewed.

## 6. Rollout and safety

- No schema migration is required for this release; provenance remains in existing `source_observations.facts` JSONB.
- Run parser, lifecycle and writer tests; run typecheck and build.
- Produce a read-only inventory of affected legacy rows and source evidence.
- Verify a small, explicitly allowlisted pilot from issuing-body evidence after code approval.
- Reconcile stored values and public rendering before expanding ingestion.
- Do not run a bulk production backfill or update recruitment lifecycle/status as part of this release.

## 7. Out of scope

- No change to the recruitment/post canonical URL contract.
- No use of legacy `postings` as the source of truth.
- No mass status changes or inferred deadline backfill.
- No blanket noindex of historical recruitments.
- No expansion of SEO landing pages.
- No change to exam, notification, result or interview date semantics.

## 8. Acceptance criteria

- The original source deadline text and precision/timezone metadata are retained in the linked source observation and traceable to the canonical recruitment.
- Date-only India deadlines resolve to the exclusive midnight cutoff after the stated India-local calendar day.
- Explicit times and explicit timezones are preserved without truncation.
- Unzoned times use `Asia/Kolkata` only with an explicitly supplied India-based recruitment context, recorded as `INDIA_SOURCE_DEFAULT`.
- Unresolved timezone/precision remains `UNKNOWN`, not guessed.
- Existing historical timestamps are not reinterpreted without evidence.
- Canonical lifecycle uses only the recruitment-owned, provenance-qualified deadline.
- Unit, writer, integration and type checks pass, including traceable official extensions and review-required conflicts.
- Review-required cases are queryable from `source_observations.outcome_reason`.
- Production migration and pilot are separately verified; merge alone is not release evidence.

**Decision principle:** JobOye must never close an application early because a date-only value was stored at UTC midnight, and must never leave an application open past an explicitly stated closing time because ingestion discarded its time.
