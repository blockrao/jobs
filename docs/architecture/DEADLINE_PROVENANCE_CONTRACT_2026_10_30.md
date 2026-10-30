# Deadline Provenance Contract — 2026-10-30

**Status:** Proposed implementation contract; no runtime or production data changes in this document-only change  
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

- Resolve the effective expiry instant to the final representable instant of that date in `Asia/Kolkata` (23:59:59.999999 IST).
- Preserve the original date text and mark precision `DATE_ONLY` and timezone `Asia/Kolkata`.
- Do not interpret UTC midnight as the end of the application window.
- Do not apply this India timezone rule to a non-India recruitment unless the source establishes that timezone.

### 2.2 Explicit date-time deadlines

- Preserve the exact stated wall-clock time.
- If the source explicitly supplies a timezone or UTC offset, preserve it and resolve the instant from it.
- If the timezone is omitted but the issuing authority/recruitment is demonstrably India-based, use `Asia/Kolkata` and record that the timezone basis was the India-source rule, not an explicit source statement.
- If neither the timezone nor an India-based authority can be established, classify the effective deadline as `UNKNOWN`; do not invent a timezone or assert a precise expiry instant.

### 2.3 Unknown and legacy deadlines

- Existing rows are not to be bulk-converted based on timestamp shape (including 00:00 UTC or 23:59 IST).
- Do not infer precision from the stored timestamp alone.
- Retain the existing timestamp as historical stored data, but mark its precision `UNKNOWN` until source evidence is recovered.
- Do not backfill a guessed closing time. Recover from the official notification or another preserved source observation with traceable provenance.
- If only a date can be verified, classify it as `DATE_ONLY`; if the source is inaccessible or ambiguous, leave it `UNKNOWN`.

## 3. Lifecycle boundary

The lifecycle service must compare the current instant against the resolved effective expiry instant:

- Before the expiry instant: deadline has not passed.
- At the expiry instant: the deadline has not passed.
- After the expiry instant: deadline has passed.

For `DATE_ONLY`, the resolved expiry is the end of the stated India-local date. For `DATE_TIME`, it is the exact resolved instant. `UNKNOWN` must not be converted into an invented instant.

The status rules remain separate and authoritative: `CLOSED`, `RESULTS` and `ARCHIVED` remain non-live regardless of a future deadline. This contract does not silently change the existing unknown-status fallback; that behaviour must be explicitly decided and tested in the lifecycle-policy implementation.

## 4. Data model and provenance requirements

The implementation PR should add nullable recruitment-level metadata alongside `application_end_date`:

- `application_end_date_precision`: `DATE_ONLY`, `DATE_TIME` or `UNKNOWN`.
- `application_end_date_timezone`: IANA timezone or explicit offset used to resolve the deadline; nullable when unknown.
- `application_end_date_source_text`: exact source-stated deadline text, retained for audit and reprocessing.
- `application_end_date_timezone_basis`: distinguishes explicit source timezone from the India-source default; nullable for unknown.

The existing source observation must retain the captured deadline text and source context. Where available, preserve the official notification URL/source locator that supports the value. Do not treat an aggregator URL as the official evidence source.

These fields must be written atomically with the canonical deadline. A later sighting may extend a deadline only when the new source evidence supports that extension; it must not replace a more precise verified deadline with a less precise value. Conflicting or earlier dates require a reviewable exception, not silent overwrite.

The database migration must be additive and nullable. It must not rewrite existing `application_end_date` values or manufacture precision for historical rows.

## 5. Ingestion implementation requirements

1. Add a dedicated deadline parser returning the effective instant, precision, timezone, timezone basis and original source text. Do not overload the legacy generic date parser used for notification/exam dates.
2. Update every adapter that extracts an application closing date to use the dedicated parser. Preserve raw source text in the observation facts.
3. Update FJA promotion to preserve its captured source deadline text and precision. Do not parse a date-only value as UTC midnight and then treat it as a precise expiry instant.
4. Extend `RawPosting` / normalized types and the canonical writer to pass deadline metadata into recruitment resolution and date refresh.
5. Ensure the canonical recruitment is the sole lifecycle deadline owner. Post enrichment may retain source observations but cannot silently redefine recruitment lifecycle.
6. Add unit tests for date-only, explicit time, AM/PM, 24-hour time, explicit IST/UTC offsets, missing timezone, invalid dates, ambiguous text and timezone-default eligibility.
7. Add writer tests proving precision metadata and effective instant are persisted together, and that a less-precise later observation cannot degrade a verified deadline.
8. Add a dry-run report for legacy rows that can be reconciled from retained source evidence. No production backfill until the report is reviewed.

## 6. Rollout and safety

- Add schema migration and Drizzle schema in one focused PR.
- Run parser, lifecycle and writer tests; run typecheck and build.
- Produce a read-only inventory of affected legacy rows and source evidence.
- Deploy the additive schema before enabling writes to the new columns.
- Verify a small, explicitly allowlisted pilot from official notification evidence.
- Reconcile stored values and public rendering before expanding ingestion.
- Do not run a bulk production backfill or update recruitment lifecycle/status as part of the schema deployment.

## 7. Out of scope

- No change to the recruitment/post canonical URL contract.
- No use of legacy `postings` as the source of truth.
- No mass status changes or inferred deadline backfill.
- No blanket noindex of historical recruitments.
- No expansion of SEO landing pages.
- No change to exam, notification, result or interview date semantics.

## 8. Acceptance criteria

- The original source deadline text is retained and traceable.
- Date-only India deadlines resolve through the stated India-local calendar day.
- Explicit times and explicit timezones are preserved without truncation.
- Unresolved timezone/precision remains `UNKNOWN`, not guessed.
- Existing historical timestamps are not reinterpreted without evidence.
- Canonical lifecycle uses only the recruitment-owned, provenance-qualified deadline.
- Unit, writer, integration and type checks pass.
- Production migration and pilot are separately verified; merge alone is not release evidence.

**Decision principle:** JobOye must never close an application early because a date-only value was stored at UTC midnight, and must never leave an application open past an explicitly stated closing time because ingestion discarded its time.
