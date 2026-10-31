# JobOye Source-Origin Review Queue — Read-Only Audit

**Audit date:** 31 October 2026  
**Production project:** `cusxodjgkrttwmdmhvso`  
**Execution mode:** SELECT-only, read-only transactions; no production writes  
**Reproducibility:** `scripts/audits/source-origin-review-queue-read-only.sql`

## Executive result

The self-contained audit query reproduced the expanded source-origin population and exact staging reconciliation counts:

| Measure | Result |
|---|---:|
| Production Recruitments with a persisted aggregator/preliminary origin signal | **6,365** |
| Exact staging matches (batch + official URL) | 355 |
| **Without an exact staging match — review queue** | **6,010** |
| Without `metadata.ingest_batch` | **6,003** |
| With a batch but no exact staging match | 7 |
| Without a valid non-duplicate canonical Post Leaf | **1,526** |
| No valid Post Leaf, but a legacy Posting relationship exists | 81 |
| No valid Post Leaf and no legacy Posting relationship | 1,445 |
| With a valid canonical Post Leaf | 4,839 |

The 355 staging matches are reconciliation pointers only. They do not establish issuer authority or the accuracy of any job fact. An aggregator-origin signal identifies discovery provenance; it does not prove that every field on the Recruitment is incorrect.

## Queue design

The query is intentionally self-contained and does not depend on `private.is_aggregator_url` or the unmerged source-authority migration. It detects origin from:

- Recruitment enrichment source, source-provenance metadata and official-link source labels.
- Known aggregator hosts in Recruitment, canonical Post and legacy Posting URL fields.
- Canonical Post `sourceName` values.
- Legacy Posting `source`, `enrichment_source`, `source_type` and `source_portals`, including inferred Recruitment/Post relationships.

The review queue is deterministic and paginated at 100 rows by default. Its priority is:

1. `LEGACY_POST_MAPPING_REVIEW_REQUIRED` — no valid Post Leaf, but an existing legacy relationship can be reconciled.
2. `SOURCE_TO_POST_DECOMPOSITION_REVIEW_REQUIRED` — no valid Post Leaf and no legacy relationship.
3. `MANUAL_SOURCE_RECONSTRUCTION_REQUIRED` — a Post Leaf exists, but the Recruitment has no ingest batch/staging lineage.
4. `STAGING_LINK_RECONCILIATION_REQUIRED` — a batch exists but the exact staging URL match is missing.

Each queue row includes Recruitment identity, organization, lifecycle and verification state, Recruitment-level source URLs/dates, ingest batch, canonical Post count, legacy mapping state, Post source references and legacy Posting source/evidence references. The first page was executed with a 10-row page size and returned `total_queue_rows = 6010`; it correctly surfaced the ten-record pilot cohort as the first ten legacy-mapped rows.

## Legacy mapping cohort

The 81 no-Post/legacy-mapped records are a high-value first review cohort:

- 81 distinct Recruitment IDs map to 81 distinct legacy Posting IDs.
- Recruitment names and legacy titles match 81/81.
- Organization IDs match 81/81.
- All 81 legacy rows are marked UNVERIFIED / PENDING in the audited snapshot.
- Recruitment-level official notification/application URL fields are empty for this cohort; the legacy Posting rows hold the notification destinations.
- These structural matches are not issuer verification. The exact notice, recruiting body, post titles, vacancies, dates and application path still require official-source review.

The ten-record issuer revalidation and record-specific exceptions are documented separately in [the bounded production snapshot audit](SOURCE_ORIGIN_BOUNDED_SNAPSHOT_2026-10-31.md) and [the ten-record issuer revalidation](TEN_RECORD_ISSUER_REVALIDATION_2026-10-31.md).

## URL-origin parser checks

The SQL includes six deterministic host-normalization cases. All passed:

- User-info before a known aggregator hostname.
- Trailing-dot hostnames.
- Scheme-relative subdomains with explicit ports.
- Lookalike suffixes such as `freejobalert.com.evil.example`.
- Prefix lookalikes such as `notfreejobalert.com`.
- A hostname appearing only in URL user-info (`freejobalert.com@official.gov`).

Matching uses exact host or a dot-boundary subdomain match, not substring matching. This registry is an audit aid, not a complete global inventory of every aggregator domain.

## Decision and next actions

1. Begin with the 81 legacy-mapped records, using the linked issuer destinations and the existing Recruitment IDs. Do not create Posts until the exact official notice supports the post-level decomposition.
2. Resolve the 1,445 no-Post/no-legacy-mapping records through source-backed reconstruction. Do not infer relationships or create guessed Posts.
3. Review the 4,484 unmatched records that already have valid canonical Post Leaves for source lineage, identity contamination, fact-level evidence and publication eligibility.
4. Resolve the seven batch-present/no-exact-match records individually.
5. Keep all changes as a dry-run proposal with before/after values, issuer evidence, reviewer identity, confidence and affected Hub/Leaf/sitemap/structured-data impact. No bulk promotion, demotion, quarantine, deletion, Post creation or URL migration is authorized by this audit.

## Safety

- No production row, schema, policy, grant, canonical ID, slug, URL or publication state was changed.
- No source-authority migration was applied.
- The queue is not a verification decision and must not be used to mark records VERIFIED.
- Public visibility, field authority, lifecycle and JobPosting eligibility remain separate decisions.
