# P0 Post-Enrichment Data Integrity Audit

**Status:** Read-only audit complete; remediation not authorised or performed  
**Audit snapshot:** 31 October 2026  
**Repository:** `blockrao/jobs`  
**Production Supabase project:** `cusxodjgkrttwmdmhvso`  
**Code references inspected:** `main` at `951138baddeebde33511868f715fe3a01bd06125`; PR #190 head at `105241c4a61322e809f14cadbd326d32d5c5191e`  
**Governing framework:** JobOye Product & Discovery Operating Charter

> This document records observed production and repository evidence. It does not authorise or perform data changes, schema changes, code changes, deployment, verification-status changes, or publication changes.

## 1. Executive decision

JobOye has multiple independently maintained representations of post enrichment. The canonical leaf read path loads the structured `post_enrichments` row but constructs the returned enrichment object from `posts.enrichment` JSONB. The transformer supplies synthetic defaults for missing verification status and confidence. Production JSONB vacancy shapes also differ from the transformer and migration contract.

Historical verification values are materially unreliable: a bulk migration promoted PENDING rows to VERIFIED when no matching row existed in the then-used `fja_post_inventory` table, and assigned confidence using the presence of salary/vacancy values. Production contains a large timestamp cluster matching that migration.

**Decision:** do not copy one store wholesale into the other, do not automatically promote or downgrade verification statuses, and do not run a bulk backfill. First establish a per-field source/evidence reconciliation and one write authority per fact. JSONB should ultimately be a deterministic read projection, not an independently maintained competing store.

This is a P0 trust and correctness issue because vacancy, salary, deadline and eligibility facts affect job-seeker decisions and the accuracy of JobPosting structured data. It is also a sustainable-discovery prerequisite under the JobOye charter.

## 2. Scope and method

### Inspected

- Production schema and read-only aggregate queries against `posts`, `post_enrichments`, `recruitments`, normalized post detail tables and FJA inventory/capture tables.
- Main-branch implementations of `get-posts.ts`, `enrichment-transformer.ts` and `fact-resolvers.ts`.
- The same critical read-path code on PR #190's head where applicable.
- Enrichment-related migrations, including creation/consolidation, JSONB introduction and the 15 October verification migration.
- FJA/PDF enrichment scripts and the official-source verification documentation.
- PR #190 metadata and changed-file scope.

### Not performed

- No INSERT, UPDATE, DELETE, DDL, RPC mutation, migration application, deployment, merge, PR #190 edit or production write.
- No automatic source verification or URL reachability check.
- No exhaustive human review of the 558 vacancy conflicts or all historical field values.
- No claim that a URL is official merely because it is populated or uses a government-looking hostname.

### Snapshot caveats

Counts below are a point-in-time production snapshot from 31 October 2026. They are not a lifecycle-approved live inventory unless a query is explicitly labelled as a provisional operational filter. Re-run the accompanying read-only SQL before using these counts for execution planning.

## 3. Production inventory and storage coverage

| Measurement | Rows |
|---|---:|
| Canonical `posts` | 5,814 |
| Non-empty `posts.enrichment` JSONB | 4,932 |
| `post_enrichments` | 3,407 |
| Posts with both non-empty JSONB and a structured enrichment row | 3,407 |
| JSONB-only posts | 1,525 |
| Posts with neither representation | 882 |
| Structured-table-only posts | 0 |

The overlap proves that the two stores are not independent inventories: every structured enrichment row in this snapshot has a corresponding non-empty JSONB record. It does **not** prove that the two representations agree.

### Verification status distribution

| `post_enrichments.sourceVerificationStatus` | Rows |
|---|---:|
| VERIFIED | 2,965 |
| UNVERIFIABLE | 433 |
| PENDING | 9 |
| **Total** | **3,407** |

All 3,407 rows have a non-null `sourceVerificationDate`. However, 3,397 dates are within two seconds of their row's `created_at`. The production column is `NOT NULL DEFAULT NOW()`, so a populated date is not evidence that a verification action occurred.

The production `extractionConfidence` column defaults to 0. A default value is not an extracted or calibrated confidence score.

### JSONB verification metadata

Only one post JSONB record contains an explicit `sourceVerificationStatus` and one contains an explicit `extractionConfidence`. The inspected example is post ID 6157, where JSONB says VERIFIED/92 while `post_enrichments` says UNVERIFIABLE/92.

Do not resolve this conflict by choosing JSONB or the structured row globally.

## 4. Historical verification migration

The repository migration `supabase/migrations/20261015000002_fix_enrichment_verification_for_decomposed_posts.sql` contains this rule:

- Find posts with no matching row in the then-used `fja_post_inventory` lookup.
- For their PENDING `post_enrichments` rows, set status to VERIFIED.
- Set confidence to 85 when both salary bounds exist, 70 when a vacancy total exists, otherwise 60.
- Set `updated_at = NOW()`.

Absence from an aggregator inventory is not evidence that the facts were checked against an official recruiting authority. Presence of salary/vacancy values is not evidence of their correctness.

Production contains 2,756 rows with status VERIFIED and the exact update timestamp `2026-10-15 11:43:30.211896+00`, matching the observed bulk-update batch. Treat this population as **heuristic-promoted / evidence review required**, not as independently verified.

A later migration named `fix_official_digest_promotion_unverifiable` appears in production migration history, but its matching SQL file was not found in the inspected `main` or PR #190 branch snapshots. Recover the exact applied SQL from the migration source/history before relying on its effects.

### Verification interpretation

- `sourceVerificationDate` is currently default-generated and cannot serve as proof of verification.
- `sourceVerificationStatus` is post-level metadata and cannot prove that every individual field is verified.
- `extractionConfidence` is not a verification state.
- A source URL, a government-looking hostname, a FJA match, or a migration timestamp is not by itself independent verification.
- Preserve historical values and timestamps during remediation; record any new decision as a new auditable event.

## 5. Confirmed read-path defects

### 5.1 Structured row fetched but not used for returned enrichment

In `src/db/operations/get-posts.ts`, the loader:

1. Reads `posts.enrichment` into `enrichmentJsonb`.
2. Fetches `getPostEnrichmentData(postId)` from `post_enrichments`.
3. Merges the fetched row into an intermediate `data` object.
4. Calls `transformEnrichment(enrichmentJsonb)`.
5. Returns the transformed JSONB as the enrichment object.

The structured row is fetched, but the returned enrichment projection is built from JSONB alone. This defeats the intended use of the secondary read for canonical enrichment facts and verification metadata.

### 5.2 Synthetic verification and confidence defaults

In `src/db/operations/enrichment-transformer.ts`:

```ts
enrichment.sourceVerificationStatus =
  rawEnrichment.sourceVerificationStatus || 'PENDING';

enrichment.extractionConfidence =
  rawEnrichment.extractionConfidence || 75;
```

Consequences:

- Missing status is represented as PENDING, which is safer than VERIFIED but still hides the distinction between absent and explicitly pending.
- Missing confidence is represented as 75.
- A real value of 0 is also replaced by 75 because the expression uses `||`.
- A fabricated runtime value of 75 can satisfy downstream thresholds.

### 5.3 Resolver accepts PENDING with confidence >= 70

`src/lib/resolvers/fact-resolvers.ts` documents and implements vacancy/salary acceptance paths that can accept VERIFIED **or PENDING** when extraction confidence is at least 70, subject to resolver-specific checks.

Combined with the transformer fallback of 75, a missing confidence score can pass a downstream threshold. This is a correctness defect, not merely a display-label issue.

Do not loosen resolver safeguards or introduce a legacy scalar fallback without evidence and entity-scope validation.

### 5.4 Vacancy JSONB shape mismatch

The JSONB migration and transformer expect `vacancies` to be an object containing fields such as `total` and `categories`. Production JSONB instead contains vacancy arrays and a top-level `vacanciesTotal` field.

Observed production coverage:

| JSONB vacancy shape | Rows |
|---|---:|
| Top-level `vacanciesTotal` present | 4,133 |
| Non-empty `vacancies` array | 3,646 |
| Nested `vacancies.total` present | 0 |
| Nested `vacancies.categories` object present | 0 |

The transformer does not map the observed array/top-level contract into the expected canonical shape. The leaf route's resolver can therefore return null even when vacancy data exists in JSONB. Do not solve this by blindly trusting the JSONB number: 558 overlapping records have a different vacancy total in the structured table.

The production `posts` table has no active check constraint enforcing the JSONB shape from the 20 October migration; the inspected check constraints were unrelated to enrichment. This is schema/migration drift and must be resolved deliberately.

## 6. Conflicting fact stores

### 6.1 Vacancy totals

Among records where both stores have a vacancy total:

| Comparison | Rows |
|---|---:|
| Both stores have a value | 1,804 |
| Values equal | 1,246 |
| Values differ | 558 |

The conflict examples include differences such as 33 vs 8, 1 vs 5, 2 vs 25 and 2 vs 21. These are candidate review records, not proof that either side is correct.

### 6.2 Structured table coverage

Observed `post_enrichments` coverage includes:

| Fact | Rows with value |
|---|---:|
| Vacancy total | 2,095 |
| Vacancy category breakdown | 38 |
| Salary range | 547 |
| Pay scale / level | 669 |
| Eligibility pathways | 215 |
| Selection process | 70 |
| Application closing date | 2,032 |

JSONB has a different coverage profile, including 3,269 non-empty education arrays and 651 non-empty experience arrays. No single representation is complete enough to replace the other without reconciliation.

### 6.3 Date provenance

The 8 October consolidation migration used `COALESCE(valid_through, NOW())` to satisfy a then-NOT-NULL `applicationClosingDate` column. In production, 10 closing-date values are within two seconds of `created_at`, and 109 are on the same calendar date as `created_at`.

These are anomaly candidates, not automatically invalid deadlines. Verify against source evidence before correction.

## 7. Provenance inventory

The normalized detail tables retain source labels, but the JSONB aggregation does not preserve equivalent source metadata in the corresponding fact objects.

Observed source distributions:

| Detail table | Source | Rows |
|---|---|---:|
| `posts_vacancies` | `fja_post_inventory` | 3,638 |
| `posts_vacancies` | `fja_legacy` | 8 |
| `posts_vacancies` | `enrichment_jsonb` | 3 |
| `posts_vacancies` | `TISS ADVT 2026/02` | 13 |
| `posts_education` | `fja_post_inventory` | 3,262 |
| `posts_education` | `fja_legacy` | 8 |
| `posts_education` | `enrichment_jsonb` | 2 |
| `posts_experience` | `fja_post_inventory` | 643 |
| `posts_experience` | `fja_legacy` | 8 |
| `posts_experience` | `enrichment_jsonb` | 3 |
| `posts_selection_process` | `fja_legacy` | 11 |
| `posts_selection_process` | `enrichment_jsonb` | 9 |
| `posts_documents` | `fja_legacy` | 11 |
| `posts_documents` | `enrichment_jsonb` | 10 |
| `posts_important_dates` | `fja_legacy` | 8 |
| `posts_important_dates` | `enrichment_jsonb` | 6 |
| `posts_official_links` | `fja_legacy` | 3,103 |
| `posts_application_fee` | `fja_legacy` | 4,882 |

The `fja_post_inventory` table currently has zero rows in production, while its source label remains on thousands of derived detail rows. The newer `fja_job_inventory` and `fja_source_captures` tables contain 1,434 and 1,542 rows respectively. Discovery/extraction status in those tables must not be confused with independent official-source verification.

The current JSONB vacancy/education/experience fact objects inspected did not carry a per-item `source` property. This makes field-level provenance difficult to recover from JSONB alone.

## 8. Writer and migration lineage

| Writer / process | Observed destination or effect | Risk / disposition |
|---|---|---|
| `scripts/enrich-from-fja.py` | FJA-derived post/enrichment data | Audit field-level writes and preserve aggregator provenance |
| `scripts/enrich-posts-from-pdfs.py` | Updates `posts.salary_min`, `salary_max`, `pay_level`, `vacancy_total`, description | Script explicitly extracts recruitment-level values; default skips multi-post recruitments, but `--multi-post` applies shared salary to all posts and warns this is safe only where all roles share a pay scale |
| `src/scripts/fja-enrich-sql.ts` | Writes `posts.enrichment` and related fields | Independent JSONB writer; must be routed through canonical write contract |
| `aggregate_enrichment_for_post()` | Builds `posts.enrichment` from normalized detail tables | JSONB projection; currently loses item-level source provenance |
| `20261015000002_fix_enrichment_verification_for_decomposed_posts.sql` | Promotes PENDING rows to VERIFIED using absence from old FJA inventory | Heuristic promotion; historical review required |
| `20261020_add_enrichment_jsonb_to_posts.sql` | Adds JSONB column, object-shape check and GIN index | Production schema does not match the migration's expected nullability/check constraints |
| `getPostBySlug()` | Reads JSONB and structured row | Structured row is fetched but not used in returned enrichment projection |
| `resolvePostVacancy()` / `resolveSalary()` | Select facts using status/confidence gates | Synthetic confidence can pass threshold; retain scope and consistency guards |

Legacy scripts and the `postings` layer must not become the canonical write path for individual post facts. Recruitment-level facts must remain on `recruitments` unless the official source explicitly attributes them to a particular post.

## 9. Schema and migration drift

Observed production schema differs from inspected repository migrations:

| Item | Repository migration contract | Production observation |
|---|---|---|
| `post_enrichments.post_id` | UUID referencing `posts(id)` | Integer referencing integer `posts(id)` |
| `post_enrichments.applicationClosingDate` | NOT NULL in initial migration | Nullable |
| `posts.enrichment` | NOT NULL DEFAULT '{}' and JSONB shape check in 20 October migration | Nullable, no default; no enrichment shape check found |
| `posts.enrichment` vacancy shape | `vacancies` object | Actual JSONB includes `vacancies` arrays and top-level `vacanciesTotal` |
| Unified enrichment view | Repository migration exists | View not present in inspected production schema |

The production `post_enrichments` table has a unique `post_id` constraint and foreign-key relationship; no duplicate post IDs were found. This is a useful integrity foundation.

Do not apply repository migrations or attempt to recreate missing objects until the exact production migration history and current schema are reconciled. In particular, recover the missing official-digest correction migration SQL from the applied migration source.

## 10. Provisional live-inventory impact

A provisional query was used to understand exposure, filtering recruitments by ACTIVE/UPCOMING status, a null/future or sentinel-year application end date, non-QUARANTINED recruitment verification status, and present slugs. This is an operational slice only; it is **not** a replacement for the shared lifecycle policy.

That query returned 3,303 posts and 1,000 associated `post_enrichments` rows. Among those 1,000 rows:

| Status / provenance slice | Rows |
|---|---:|
| VERIFIED | 844 |
| UNVERIFIABLE | 155 |
| PENDING | 1 |
| VERIFIED with the 15 October heuristic-update timestamp | 763 |
| VERIFIED with `AGGREGATOR_DISCOVERED` recruitment link provenance | 618 |
| VERIFIED with null recruitment `official_link_source` | 226 |

These numbers identify a high-priority review population. They do not establish that every one of these facts is false. The provisional lifecycle predicate must be replaced with the charter's shared lifecycle policy before publication decisions.

## 11. Recommended target architecture (proposed; not yet implemented)

1. `recruitments` remains authoritative for recruitment-level facts.
2. `posts` remains canonical for individual post identity and post-level facts.
3. Establish one canonical write authority per enrichment field. Repeating facts may remain in normalized child tables; one-to-one post enrichment fields may remain in a one-to-one enrichment record. Decide field ownership from the reconciliation matrix, not by copying one entire store.
4. Maintain append-only field evidence/provenance: fact key, observed value, source URL, source type, source authority classification, extraction method, source capture/document reference, extracted timestamp, verification event/actor, and supersession history.
5. Make `posts.enrichment` a deterministic, versioned read projection generated from canonical facts. No independent writers should update the projection.
6. Preserve separate concepts: extraction confidence, evidence availability, official-source authority, and verification outcome.
7. Keep unknown/absent values unknown. No synthetic confidence, verification timestamps, closing dates or vacancy values.
8. Resolver output must include evidence state and scope, not merely a number. A fact should not pass an official-verification gate because a runtime default supplied 70+ confidence.
9. Keep post facts distinct from recruitment facts. Never distribute a recruitment total or pay range to every child post without explicit source attribution.
10. Structured data and visible content must use the same resolved, supported facts. Omit unsupported JobPosting properties rather than fabricating or promoting them.

This is a proposed direction for design review, not approval to implement a new ledger or schema. First complete the field-by-field ownership and source reconciliation, then choose the smallest coherent schema change.

## 12. Remediation sequence and acceptance criteria

### Phase A — Freeze unsafe promotion paths and complete evidence inventory

- Identify and disable or gate every writer that can assign VERIFIED without an explicit verification event.
- Stop synthetic confidence and synthetic verification-date defaults in the application contract.
- Inventory all writers, triggers, RPCs, migrations and scheduled jobs that can mutate canonical post facts.
- Recover missing applied migration SQL and reconcile production schema against migration history.

**Acceptance:** complete writer inventory; no unexplained VERIFIED assignment path; production schema/migration differences documented and reconciled; no production data changed in this phase.

### Phase B — Field-level dry-run reconciliation

For each canonical post and each important fact (vacancy total/category, salary/pay level, application dates, eligibility, education, experience, selection process, fees, documents, official notification/application links):

- Compare all candidate stores.
- Preserve source URL and capture/document evidence.
- Distinguish recruitment-level from post-level scope.
- Classify as match, conflict, single-source, missing evidence, synthetic/default candidate, or human review required.
- Produce before/after proposals without writing them.
- Include explicit reason, evidence reference, confidence methodology (if calibrated), and rollback value.

**Acceptance:** every proposed mutation is traceable to evidence; all conflicts have a disposition or remain unresolved; no automatic winner based on store priority; dry-run is reproducible and read-only.

### Phase C — Canonical write and projection contract

- Agree one canonical owner per field.
- Add evidence/provenance without losing historical observations.
- Make JSONB a generated read model.
- Align transformer, TypeScript types, resolvers and database schema.
- Add tests for null/zero confidence, absent status, conflicting sources, vacancy array/object variants, recruitment/post scope and stale/synthetic dates.

**Acceptance:** one deterministic projection; no competing writers; zero synthetic verification/confidence defaults; fact resolvers cannot promote unknown evidence.

### Phase D — Controlled correction and consumer verification

Only after explicit approval of the row-level dry-run:

- Apply a small reviewed pilot in a transaction or otherwise reversible batch.
- Compare before/after values and evidence.
- Verify recruitment hub and post leaf visible content, canonical URLs, metadata, JobPosting JSON-LD, sitemap eligibility and official links.
- Expand only after reconciliation and rollback checks pass.

**Acceptance:** approved pilot matches the signed-off dry-run; no entity-scope leakage; visible facts/schema agree; no unreviewed mass status changes.

## 13. Explicit non-goals and safeguards

- Do not merge PR #190 as part of this work.
- Do not add enrichment fixes to PR #190.
- Do not use `postings` as canonical for new post facts.
- Do not copy all `post_enrichments` values into JSONB or vice versa.
- Do not mass downgrade all VERIFIED records or mass promote any other status.
- Do not treat FJA inventory absence as official verification.
- Do not treat a URL, timestamp, extraction confidence or aggregator label as verification.
- Do not delete historical facts or provenance.
- Do not alter production, run migrations, change publication/indexability, or deploy until the dry-run has been reviewed and separately authorised.

## 14. Related evidence and code references

- PR #190 (separate government-jobs lifecycle/public hub work): https://github.com/blockrao/jobs/pull/190
- `src/db/operations/get-posts.ts`
- `src/db/operations/enrichment-transformer.ts`
- `src/lib/resolvers/fact-resolvers.ts`
- `scripts/enrich-posts-from-pdfs.py`
- `supabase/migrations/20261008120000_create_post_enrichments_table.sql`
- `supabase/migrations/20261008150000_consolidate_enrichment_to_post_enrichments.sql`
- `supabase/migrations/20261015000002_fix_enrichment_verification_for_decomposed_posts.sql`
- `supabase/migrations/20261020_add_enrichment_jsonb_to_posts.sql`
- Read-only reconciliation queries: `docs/architecture/POST_ENRICHMENT_RECONCILIATION_DRY_RUN_2026-10-31.sql`

---

**Audit conclusion:** JobOye must treat enrichment integrity as a P0 trust and discoverability foundation. The immediate deliverable is an evidence-backed, field-level dry-run—not a bulk data repair.
