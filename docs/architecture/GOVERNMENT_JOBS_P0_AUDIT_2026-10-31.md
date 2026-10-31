# Government Jobs P0 Audit — 2026-10-31

Status: read-only production audit completed; focused remediation is in pull request #190.

## Scope

Audited the `/government-jobs` listing, canonical post-detail route, shared lifecycle query, A-070 official-link provenance, content enrichment coverage, SEO metadata and Google Search Central JobPosting requirements.

Production checks were SELECT-only. No database rows, schema, URLs, sitemap entries or deployments were changed during this audit.

## Governing decisions

- Preserve the canonical entity contract: `posts → recruitments → organizations`.
- Recruitment status and application deadline determine lifecycle; quarantine excludes public visibility.
- A URL being populated does not prove that it is an official recruiting-body URL.
- A-070 defines `MANUAL_VERIFIED` as affirmative official-link provenance. `AGGREGATOR_DISCOVERED`, missing provenance and unknown legacy values are not verification.
- Keep job detail pages accessible where useful, but emit Google `JobPosting` only when the leaf is open, indexable, has a manually verified notification link and a manually verified application link. Content completeness must also be enforced before widening this gate.
- Database errors must not be rendered as a valid zero-job inventory.

## Production snapshot

Captured at `2026-10-31 00:01:44 UTC`. Counts are time-sensitive because lifecycle status changes.

| Measure | Count |
|---|---:|
| Live canonical posts across six government sectors | 2,848 |
| Distinct live recruitments represented | 2,599 |
| Live posts with a notification URL | 1,062 |
| Live posts with `MANUAL_VERIFIED` link provenance | 0 |
| Live posts with `AGGREGATOR_DISCOVERED` provenance | 780 |
| Live posts with no link-provenance value | 1,781 |
| Live posts with non-standard/unknown legacy provenance values | 287 |
| Live posts with sentinel deadline dates (year >= 2090) | 0 |
| Live posts with description length >= 150 characters | 614 |
| Live posts with positive vacancy count | 2,105 |
| Live posts with a location in the audited post/recruitment fields | 300 |
| Live posts with a recruitment application URL | 369 |

A prior read-only query returned 2,951 posts. The later 2,848 result is the current snapshot; the inventory is not a fixed count and should be timestamped in reporting.

### Enrichment coverage and provenance mismatch

The canonical leaf loader reads `posts.enrichment` JSONB and transforms that object into the `post.enrichments` shape consumed by the detail page.

| Canonical `posts.enrichment` JSONB measure | Live posts |
|---|---:|
| Non-empty JSONB enrichment object | 2,483 |
| Explicit `sourceVerificationStatus = VERIFIED` | 1 |
| Explicit `sourceVerificationStatus = PENDING` | 0 |
| Explicit `sourceVerificationStatus = UNVERIFIABLE` | 0 |
| Missing source verification status (transformer defaults to PENDING) | 2,847 |
| Has an education array | 1,648 |
| Has an experience array | 330 |
| Has duties | 1 |
| Has responsibilities | 0 |

A separate `post_enrichments` table query returned 825 VERIFIED, 155 UNVERIFIABLE, 1 PENDING and 1,867 without a row. That table is fetched by the current loader, but the returned `enrichment` object is built from `posts.enrichment` JSONB; the table's verification status is not propagated into the transformed object. The two status distributions therefore must not be conflated.

This is a P0 provenance/data-contract mismatch to reconcile. Until then, the canonical leaf treats missing JSONB verification status as PENDING and labels those extracted eligibility/experience/age facts as reported. The enrichment verification state is also distinct from official-link provenance: even a VERIFIED enrichment record does not automatically make its notification or application URL officially verified.

## Findings

### P0 — lifecycle and quarantine consistency

The listing's previous SQL selected ACTIVE/UPCOMING recruitments with a future or missing deadline, but did not exclude `verification_status = 'QUARANTINED'`. Canonical detail and recruitment loaders already excluded quarantined records.

The query also returned placeholder dates (year >= 2090) as real deadlines, although the shared lifecycle helper treats these as unknown. The page independently calculated days remaining rather than using the central lifecycle resolver.

**Remediation in PR #190:** shared live-post query excludes quarantined records, normalizes implausible dates to NULL for display and ordering, and the page uses `deriveLifecycle` / `lifecycleLabel`. The listing heading now says “Current and Upcoming Government Jobs” because UPCOMING records are included.

### P0 — false-empty listing on query failure

The page wrapped its listing and sector-count queries in `safeQuery` with empty fallbacks. A database error could therefore look like a legitimate zero-result page.

**Remediation in PR #190:** query failures propagate to the route error boundary rather than being converted into empty inventory data; missing DATABASE_URL is also a hard error on this indexable page rather than a fabricated zero-result state.

### P0 — official-link provenance misrepresentation

The canonical detail page labelled any populated notification URL as “Official notification” and stated that page facts were read from the official notification. The database's A-070 provenance field distinguishes `MANUAL_VERIFIED` from `AGGREGATOR_DISCOVERED`; the production snapshot contained zero active posts with the explicit `MANUAL_VERIFIED` value.

**Remediation in PR #190:** carry `official_link_source` through the canonical post loader. Only explicit `MANUAL_VERIFIED` links receive official labels or appear as official citations in structured data. Other links remain accessible but are labelled as not manually verified. The page disclaimer now reflects the actual provenance.

### P0 — JobPosting structured data eligibility

The detail renderer previously gated `JobPosting` primarily on lifecycle and indexability. Google Search Central says JobPosting markup belongs on single-job detail pages, must describe a single open job, must not contain incomplete descriptions, and must include a way to apply. Google also instructs publishers to remove JobPosting markup when a job is no longer available.

**Remediation in PR #190:** require an open lifecycle, an indexable leaf, both manually verified notification and application links, a Tier A result from the existing deterministic content-quality gate, and VERIFIED eligibility before emitting `JobPosting`. The leaf now resolves eligibility from canonical enrichment rather than relying on the removed FJA extraction-table path, and labels non-VERIFIED eligibility/experience/age extracts as reported rather than confirmed. This is a conservative baseline; responsibilities, experience and other field-level completeness still need a deeper audit.

Google references:
- https://developers.google.com/search/docs/appearance/structured-data/job-posting
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies

### P1 — lifecycle freshness

The canonical post-detail route used a 24-hour ISR interval, while the government-jobs listing used one hour. This could leave deadline/status and JobPosting output stale for a full day after the underlying recruitment changed.

**Remediation in PR #190:** reduce the detail-page ISR interval to one hour. This is a compromise between freshness and request/database cost; event-driven invalidation and Google Indexing API integration remain separate work.

## Work deliberately not done

- No database/schema migrations or bulk data changes.
- No canonical URL or redirect changes.
- No sitemap policy changes.
- No automatic removal of records solely because official-link provenance is absent; that would remove most of the useful inventory before the verification workflow is repaired.
- No visual PostCard redesign yet. It must follow the publication and provenance contract.

## Next P0/P1 work

1. Establish and document the canonical Post indexability/content-completeness contract. The current Tier A reuse is only the first schema gate; do not reuse legacy `postings.index_tier` as if it were canonical `posts` policy.
2. Reconcile official-link provenance and verify the current 1,062 notification URLs against issuing-body domains. Do not infer officialness from URL shape alone.
3. Audit canonical post enrichment and field-level provenance, especially eligibility, duties, responsibilities, location and application mechanism.
4. Reconcile live post/recruitment counts and document their entity definitions; expose timestamped counts.
5. Validate sitemap lifecycle policy, detail-page structured data and Google Indexing API coverage.
6. Only then implement the visual government-jobs listing redesign and test its server-rendered output, mobile usability, crawlable pagination and query cost.

## Pull request

https://github.com/blockrao/jobs/pull/190

The PR is intentionally not merged or deployed until its CI checks and review are complete.


Additional provenance breakdown: 273 `fja_official_link_extracted`, 6 `official_link_extracted`, 7 freeform portal labels and 1 `pending_verification`; these 287 values are not A-070 `MANUAL_VERIFIED` provenance.


## Follow-up audit — enrichment lineage and verification authority (2026-10-31)

This follow-up inspected the canonical leaf loader, JSONB transformer, historical migrations and current production rows. All production queries were SELECT-only.

### Confirmed application data-flow defect

The canonical detail loader currently does all of the following:

1. Reads posts.enrichment JSONB in getPostCoreData().
2. Separately fetches the matching post_enrichments row through getPostEnrichmentData().
3. Merges that row into an intermediate data object.
4. Calls transformEnrichment(enrichmentJsonb) using only the JSONB object.
5. Returns transformedEnrichment as the canonical post.enrichment.

Therefore, the separate table's sourceVerificationStatus, sourceVerificationDate, extractionConfidence and other structured fields are not actually projected into the canonical enrichment object. The secondary table read is currently ineffective for those returned enrichment facts. This is a code-path defect, not just a difference in SQL reporting.

### Historical status authority is also unsafe

Migration 20261015000002_fix_enrichment_verification_for_decomposed_posts.sql sets post_enrichments.sourceVerificationStatus = 'VERIFIED' for PENDING records when the post has no matching FJA inventory record. It assigns confidence based on the presence of salary or vacancy values. Absence of an FJA inventory row is not evidence that an official notice was independently checked. This migration therefore cannot be treated as a valid source-verification event for the affected records.

A production query found 2,965 VERIFIED, 433 UNVERIFIABLE and 9 PENDING rows in post_enrichments (all rows, not only the government-sector live subset). A further query found 2,756 VERIFIED rows sharing the same updated_at timestamp of 2026-10-15 11:43:30.211896+00; this is consistent with a bulk status operation and requires reconciliation against the migration and source evidence before any of these statuses are used as authoritative. Every row in the status distribution had a non-null sourceVerificationDate, but the date alone does not establish who verified what or against which official evidence.

**Decision:** do not simply copy post_enrichments.sourceVerificationStatus into posts.enrichment, and do not wire the table's VERIFIED value into the page or JobPosting gate. The historical migration demonstrates that VERIFIED can mean “not found in FJA inventory”, not “independently verified against the issuing authority”. Until field-level evidence and verification provenance are available, these statuses are not safe to use as proof.

### JSONB transformer manufactures a confidence score

src/db/operations/enrichment-transformer.ts currently defaults missing sourceVerificationStatus to PENDING, which is conservative, but defaults missing extractionConfidence to 75 for any non-empty JSONB object. A production-wide SELECT found 4,932 non-empty posts.enrichment objects, but only one object contained an explicit extractionConfidence, and only one contained an explicit sourceVerificationStatus. Consequently, the current transformer can present a synthetic confidence value of 75 for thousands of records without stored confidence evidence.

This default must be removed or changed to an explicit unknown/zero representation, with downstream consumers checked before implementation. Confidence must never be invented by a presentation transformer.

### Current all-sector live snapshot (separate scope from the six-sector table above)

A later SELECT across all live canonical posts (all sectors) returned 3,303 posts, of which 1,000 had a post_enrichments row and 2,503 had non-empty JSONB. Among the 1,000 table rows, 844 were VERIFIED, 155 UNVERIFIABLE and 1 PENDING. The difference from the earlier six-government-sector snapshot is expected from the wider sector scope and changing lifecycle inventory; these numbers must not be mixed.

### Required remediation sequence

1. Keep the current PR's conservative PENDING interpretation; do not promote table statuses into the canonical object.
2. Audit every writer and migration that sets sourceVerificationStatus, especially the October 15 decomposed-post migration. Classify statuses as genuine source verification, heuristic/system-assigned, or unknown.
3. Define verification evidence as a first-class contract: the exact official source URL, source identity, evidence location/quote or document reference, fields covered, verifier or process identity, verified timestamp, and evidence freshness. A single post-level status must not imply every extracted field is verified.
4. Define the canonical enrichment storage contract and one authoritative read/write path. Until then, treat posts.enrichment as the display payload and the separate table as an untrusted legacy verification store; do not merge them implicitly.
5. Remove the synthetic confidence default and add unit/contract tests for absent, pending, unverifiable and evidence-backed values.
6. Re-run the live inventory audit and only then reconsider JobPosting eligibility. No bulk backfill or production mutation is approved by this audit.

No database rows or schema were changed in this follow-up.
