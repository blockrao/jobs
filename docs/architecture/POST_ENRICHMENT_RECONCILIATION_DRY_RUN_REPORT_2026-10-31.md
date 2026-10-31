# Post-Enrichment Reconciliation Dry-Run Report

**Snapshot:** 31 October 2026  
**Environment:** Production Supabase, read-only  
**Repository evidence:** `main` at `951138baddeebde33511868f715fe3a01bd06125`; PR #190 head at `105241c4a61322e809f14cadbd326d32d5c5191e`  
**Companion query suite:** [POST_ENRICHMENT_RECONCILIATION_DRY_RUN_2026-10-31.sql](./POST_ENRICHMENT_RECONCILIATION_DRY_RUN_2026-10-31.sql)

> This is a dry-run classification report. It does not propose automatic winning values and does not authorise production mutation.

## 1. Result summary

The read-only reconciliation identifies **2,770 unique post records** in the union of the explicit review cohorts below.

| Review signal | Records |
|---|---:|
| Exact 15 October update-timestamp cohort | 2,764 |
| Of that timestamp cohort: VERIFIED | 2,756 |
| Of that timestamp cohort: PENDING | 8 |
| Vacancy totals differ between JSONB and `post_enrichments` | 558 |
| Explicit JSONB vs structured verification-status contradiction | 1 |
| Closing date within two seconds of row creation | 10 |
| Unique posts across these cohorts | **2,770** |
| Overlap between timestamp cohort and vacancy-conflict cohort | 553 |

The 2,764 timestamp cohort includes 2,756 VERIFIED rows matching the historical heuristic promotion timestamp and eight PENDING rows sharing that timestamp. The eight PENDING rows are retained as a timestamp-collision/reconciliation question; they are not assumed to have been promoted by the same statement.

These cohorts overlap. Do not add the row counts to estimate the number of unique records.

## 2. What the dry-run proves

### A. Historical verification needs evidence review

The migration `20261015000002_fix_enrichment_verification_for_decomposed_posts.sql` sets PENDING rows to VERIFIED based on absence from the then-used `fja_post_inventory` lookup, and assigns confidence from the presence of salary/vacancy fields.

That rule does not establish that the facts were checked against the recruiting authority. The 2,756 matching VERIFIED rows are therefore a historical review cohort, not an automatically invalid population and not a trusted verified population.

Required disposition per field:
- Recover the exact official notification/application source and relevant page/section.
- Confirm the fact is attributable to the individual post rather than only the recruitment.
- Preserve the historical status/confidence and record any new verification event separately.
- If evidence cannot be recovered, leave the fact's verification state unknown/unverified rather than inventing a downgrade rationale.

### B. Vacancy conflicts require source-level adjudication

There are 558 posts with a non-null vacancy total in both stores and unequal values. A sample candidate illustrates why field-level reconciliation is necessary:

| Field | Post ID 2 — Assistant Legislative Counsel |
|---|---:|
| `posts.enrichment.vacanciesTotal` | 8 |
| `posts.vacancy_total` | 8 |
| `recruitments.total_vacancies` | 8 |
| `post_enrichments.vacanciesTotal` | 33 |

The three values of 8 agree with each other, while the structured enrichment row says 33. This is a high-priority candidate for inspecting the actual notification's post-wise and recruitment-wise vacancy table. It is **not** an instruction to overwrite 33 with 8 without checking the source document.

For each of the 558 conflicts, record:
- official notification URL and document/capture identifier;
- source page/table/paragraph;
- post-specific value and recruitment-wide total, separately;
- whether category counts sum to the claimed total;
- original values from all stores;
- proposed value, rationale, reviewer and rollback value.

### C. One explicit verification contradiction

Post ID 6157 (`law-officer-jobs`) has:
- JSONB `sourceVerificationStatus = VERIFIED`;
- structured `sourceVerificationStatus = UNVERIFIABLE`;
- confidence 92 in both stores.

The structured row's status must not be silently overwritten by JSONB. Inspect the actual official-source verification event and its scope. A verified URL does not prove every extracted fact on the post is verified.

### D. Deadline timestamps need review

Ten `applicationClosingDate` values are within two seconds of `post_enrichments.created_at`. The earlier consolidation migration used `COALESCE(valid_through, NOW())` to populate a then-required deadline. This makes the ten records plausible synthetic-date candidates.

A further 109 rows have a closing date on the same calendar day as creation; that broader signal is not sufficient to classify them as synthetic. Review the ten close matches first and verify every proposed correction against an official notification.

## 3. Current live-slice exposure (provisional only)

Using the same provisional operational predicate documented in the main audit—not the final shared lifecycle contract—the production slice contained:

| Measurement | Rows |
|---|---:|
| Provisional posts | 3,303 |
| With `post_enrichments` | 1,000 |
| VERIFIED | 844 |
| UNVERIFIABLE | 155 |
| PENDING | 1 |
| VERIFIED in the 15 October heuristic timestamp cohort | 763 |

Within that slice, 618 VERIFIED rows were associated with recruitment-level `official_link_source = AGGREGATOR_DISCOVERED`, and 226 VERIFIED rows had a null recruitment-level `official_link_source`.

These are prioritisation signals only. `official_link_source` describes link provenance, not necessarily the verification status of every field. The provisional live predicate must be replaced by the charter's shared lifecycle policy before any publication/indexability action.

## 4. Candidate packet and reproducibility

The companion SQL file contains SELECT-only queries for:
1. JSONB/structured coverage and overlap.
2. Verification-status and timestamp distributions.
3. Explicit JSONB-vs-structured verification conflicts.
4. Vacancy mismatch summary and complete conflict candidate list.
5. Actual JSONB vacancy-shape distribution.
6. Closing-date anomaly candidates.
7. Source labels in normalized detail tables.
8. The provisional live slice and provenance breakdown.
9. A candidate evidence packet containing the union of the timestamp, vacancy-conflict, explicit status-conflict and deadline-timestamp cohorts.

The final candidate-packet query was executed with a three-row sample to validate its joins and selected columns. The aggregate cohort counts were independently re-run. The complete row-level result has not been exported or persisted as a second copy of production data; run the SELECT query when reviewers need the full packet.

All SQL in the companion file is read-only. It contains no INSERT, UPDATE, DELETE, DDL, migration or RPC mutation.

## 5. Recommended review order

1. **Post ID 6157:** resolve the explicit VERIFIED/UNVERIFIABLE contradiction first; capture the actual verification evidence.
2. **558 vacancy conflicts:** inspect official notifications and preserve recruitment-vs-post scope. Start with high-confidence cross-store agreements such as post ID 2, but do not auto-correct.
3. **10 deadline candidates:** verify whether the deadline is real or a `NOW()` placeholder.
4. **2,756 heuristic VERIFIED records:** audit official-source evidence field by field; prioritize those in the provisional live slice (763).
5. **Remaining 1,525 JSONB-only posts and 882 posts with neither enrichment representation:** classify coverage gaps and decide whether enrichment is useful and source-supported.

## 6. No correction has been approved

No values were changed. No status was promoted/downgraded. No data was deleted. No migration was run. No code or deployment was changed.

A correction proposal must include, for every field:
- canonical entity and field key;
- existing value(s) and store(s);
- official source URL plus capture/document reference;
- exact evidence location;
- recruitment/post scope;
- verification decision and method;
- proposed value or explicit no-change/unknown decision;
- reason, reviewer and rollback value.

Only after review of that report should a small, reversible pilot be separately authorised.
