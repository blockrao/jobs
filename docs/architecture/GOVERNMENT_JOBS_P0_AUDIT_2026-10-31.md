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
