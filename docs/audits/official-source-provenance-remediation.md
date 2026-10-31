# P0 — Official-source provenance and publication remediation

**Status:** Audit findings recorded; remediation manifest is read-only. No production rows were changed.

## Decision

JobOye must distinguish three separate things:

1. A source document was parsed.
2. A candidate fact was extracted from that document or an aggregator.
3. The fact and its provenance were verified against the issuing authority's own publication.

Only the third can support an official-source verification claim. A field such as `posts_source = 'document'` proves neither who issued the document nor that the extracted content was checked against it.

## Confirmed implementation defect

The legacy `promote_official_digest` migration currently:

- sets recruitment `verification_status = 'VERIFIED'` when `posts_source = 'document'`;
- sets post `sourceName = 'official_notification'`, `isOfficialSource = true`, and `is_official_source = true` unconditionally;
- writes `sourceVerificationStatus = 'VERIFIED'` to post enrichment on the same document-only condition;
- records `official_link_source = 'AGGREGATOR_DISCOVERED'` on the recruitment.

This allows aggregator-discovered records to carry an official verification state. The original migration is historical and must not be edited after application; correction must be a new forward migration.

## Audit cohort recorded from the production read-only review

The previous read-only audit found:

- 542 posts created in the `official_digest_20261015` decomposition batch, across 362 recruitments.
- All 362 recruitments were discovered through an aggregator (then recorded in the overloaded `official_link_source` field); 30 were nevertheless marked `VERIFIED` without review metadata.
- 3,262 `posts_education` rows and 643 `posts_experience` rows labelled `source = 'fja_post_inventory'`; education rows had confidence 60 and `verified_at IS NULL`. The experience table did not have a `verified_at` column at audit time, so it could not represent fact verification at all.
- These child facts were spread across multiple parent recruitment source labels, including `AGGREGATOR_DISCOVERED`, NULL, `GOA_GOV_IN` and `MANUAL_VERIFIED`; parent source labels alone therefore cannot safely gate them.
- The `fja_post_inventory` table was empty at the time of the audit, so the surviving fact rows had no matching raw inventory record.
- 19 `eligibilities` rows were marked VERIFIED without a complete issuer evidence chain: none had all of `source_type=OFFICIAL_NOTIFICATION`, `verified_at`, `source_ref` and `source_locator`.
- 1,897 `post_enrichments` rows were marked VERIFIED while linked education/experience child facts included FJA-sourced rows with `verified_at IS NULL`; another 289 were already UNVERIFIABLE. The forward migration demotes the 1,897 aggregate records until the underlying facts are reviewed.
- 472 posts across 421 recruitments shared an identical government-deputation education statement. This is a review cohort, not proof that all 472 are incorrect.
- NIT Warangal recruitment 4855 / slug `org1460-2026-0004` contains four role leaves with cross-recruitment qualification contamination. These facts must be checked against the 2026 NITW/FR-2/2026 issuer notification before restoration.

These are the audit snapshot counts, not guaranteed current counts. Re-run the SQL manifest against a read-only connection before any remediation.

## Public rendering defect confirmed

`src/components/job-posting/job-detail-page-production.tsx` previously rendered a null fee amount as `Nil`. A null means unknown/not stated; it does not mean the fee is zero. The leaf renderer now displays `Not stated` for a null amount. This is a narrow presentation correction and does not verify any fee data.

## Remediation sequence

### P0-A — stop false source claims (required before new digest promotions)

- Replace the document-only verification rule with an explicit source-authority decision.
- Require issuer-controlled source evidence; a URL being populated is not proof of officialness.
- Keep aggregator extraction as candidate evidence, never as the public official source.
- Preserve field-level source, extraction confidence, verification status and verification timestamp through every JSONB consolidation step.
- Keep unknown/unverified facts out of verified public facts and JobPosting structured data.
- Test recruitment and post source states independently, including issuer-host and aggregator-host cases.

### P0-B — produce and review the remediation manifest

Run `scripts/audits/official-source-provenance-dry-run.sql` with a read-only role. Export the detailed rows and reconcile every affected fact against that recruitment's own issuer notification. Do not bulk-delete or bulk-correct the cohort based only on shared text or source labels.

The release is deliberately staged:

1. Apply `20261031120000_p0_official_digest_source_authority_gate.sql` first. It adds the schema, backfills only the discovery-origin column, and installs write guards; it does not demote the existing public cohort.
2. Deploy and smoke-test the application source gates. The new code treats `source_discovery_origin = 'AGGREGATOR_DISCOVERED'` plus any link state other than `MANUAL_VERIFIED` as unverified, so hubs/leaves are noindex and discovery surfaces exclude them.
3. Only after the application gate is live, apply `20261031130000_p0_official_digest_source_authority_remediation.sql`. It demotes the historical cohort, clears stale child-fact evidence markers, and refreshes JSONB projections.
4. Run `scripts/audits/official-source-provenance-post-migration-check.sql` with a read-only role. It checks that discovery origin remains `AGGREGATOR_DISCOVERED`, that no unreviewed record is promoted to `MANUAL_VERIFIED`, and that verified eligibility/fact rows retain evidence pointers.

Do not apply both migrations together before the application deploy. Once stage 2 has been applied, do not roll back to the pre-gate application: that code does not enforce the new provenance contract. If the application needs recovery after stage 2, use a forward-compatible hotfix or redeploy the gated build.

### P0-C — repair NIT Warangal

- Treat the NITW faculty recruitment as a separate evidence-led case.
- The official faculty page search listing confirms Advertisement NITW/FR-2/2026 dated 15-10-2026 and exposes Faculty Recruitment 2026 / Apply Online Portal actions. The official PDF endpoint currently returns a retrieval cache miss/inaccessible response in the available research channel.
- Secondary pages conflict on application dates and fee details. They are not accepted as evidence for correcting JobOye facts.
- Therefore role-specific qualifications, experience, fee, vacancy split, deadline and application portal remain unverified until the official PDF and portal target can be inspected directly or supplied for review.
- Do not reuse qualifications from another recruitment or infer fee = zero from a null.
- Publish only fields supported by the issuer source; label unknown fields as not stated or omit them.

### P0-D — production remediation (separate approval)

Any quarantine, backfill, source URL correction, enrichment rewrite or status change must be delivered as a separate dry-run diff and reviewed before production writes. This PR does not perform production data mutations.

## Acceptance criteria

- No promotion can mark a recruitment or post VERIFIED solely because `posts_source = 'document'`.
- No aggregator-derived post is labelled as an official-notification source.
- Source authority and fact verification are represented separately.
- Provenance metadata survives canonical JSONB transformations.
- Public qualification/experience/fee values are displayed only under an explicit, tested evidence policy.
- Null fee values never render as Nil/zero.
- The row-level manifest is reconciled against issuer evidence before any production update.
- NIT Warangal public pages are corrected only after official notice verification.

## Implementation added to remediation PR #189 (draft)

The current branch now contains the first end-to-end protection slice:

- A forward migration adds two separate manual gates to `official_digest_promote`: (1) issuer-source authority review, and (2) fact-accuracy review. A promotion cannot transition from PENDING to PROMOTED unless the official notification URL and issuer evidence URL are HTTPS, and both reviews have reviewer identities, timestamps and notes.
- Fact review requires every populated hub/post staging fact, explicit application-window review, and per-post review of education, experience, eligibility, age rules, vacancies, salary, fees, documents, selection process, important dates and official links.
- Each reviewed field must have a matching evidence object with a non-empty `evidence_ref` and `excerpt`. Use keys `hub:<field>` and `post:<post-name>:<field>` (the staging JSON does not carry canonical post slugs). For absent facts, record the evidence reference and an excerpt supporting that the item is not stated.
- `recruitments.source_discovery_origin` now preserves immutable discovery origin; `official_link_source` is reserved for the A-070 link-verification state (`MANUAL_VERIFIED` only after the issuer review passes). The original aggregator discovery trail is never overwritten.
- Database triggers defend the recruitment, post and post-enrichment write paths against the legacy promotion function's unconditional official labels. Aggregator-discovered rows without both matching reviews are forced to UNVERIFIABLE / `aggregator_extracted` and cannot carry an official-source boolean.
- Approved review evidence is persisted in `recruitments.metadata.source_provenance` and `posts.enrichment.source_provenance`. Preservation triggers prevent later JSONB enrichment consolidation from erasing it.
- The same review keys gate education, experience and other canonical enrichment fact families at transformation/render time. A recruitment passing source review does not automatically authorize every child fact.
- Canonical `eligibilities` rows are exposed only when status is VERIFIED and `verified_at`, `source_ref` and `source_locator` are all present. The digest review sync writes these fields from the issuer URL and the per-post eligibility evidence reference; revoking review returns the rows to PENDING.
- The read-only audit found 19 eligibility rows marked VERIFIED without a complete evidence chain (11 had no source type; the remaining 8 lacked a complete reference/locator/timestamp combination). The migration demotes rows missing any required provenance and the hub loader excludes them.
- Updating review fields on an already-promoted staging row automatically synchronizes the associated recruitment and child records: complete reviews upgrade them; incomplete or revoked reviews demote them and remove active provenance.
- The migration demotes existing aggregator-discovered VERIFIED recruitment rows, clears their last-verified timestamps, removes the false post-level official flags and marks linked post enrichment UNVERIFIABLE. It does not delete records. These statements are migration code only and have **not** been run against production.
- The post-leaf loader now reads recruitment-level verification status, source origin and persisted review metadata. Unverified aggregator-discovered leaves suppress extracted eligibility, experience, fees, dates, salary, vacancies, application links and official-source claims; they receive noindex and no JobPosting structured data. Even after recruitment review, child fact families remain hidden unless their own review keys are present.
- Recruitment hubs for the same cohort suppress extracted detail/link payloads, remain canonical at their existing URL, and receive noindex. Once verified, hub and post fields are still individually filtered against the persisted review-key manifest.
- The `/jobs` list, sector-based live listings (including All Government Jobs), qualification live-post listings/counts and dynamic sitemap require persisted issuer and fact review metadata. Live listings additionally require a verified non-null application end date, so the legacy promotion function cannot make a no-deadline record appear open by default.
- Drizzle schema now permits a null source-verification timestamp, matching the migration's truthful representation of unverified records.
- The migration adds missing `verified_at`, `source_ref` and `source_locator` fields to experience facts, adds source pointers to education facts, redefines `aggregate_enrichment_for_post`, and backfills canonical education/experience JSONB with `fact_id`, `source`, `confidence_score`, `verified_at`, `source_ref` and `source_locator`. This closes the provenance gap created when earlier consolidation dropped row-level metadata.
- Education/experience facts sourced from `fja_post_inventory` (or lacking a verification timestamp) are hidden unless the exact per-post fact-review key is present, regardless of the parent recruitment's `official_link_source`. This is important because the read-only audit found FJA-derived child rows under both aggregator-discovered and NULL/other parent source labels.
- Static contract tests cover the source helper, leaf/hub gates, live discovery queries, sitemap exclusion, migration gate and null-fee rendering.

### Review and rollout notes

- The source-authority review is intentionally manual. The reviewer must open the issuing authority's own recruitment page and confirm that it publishes or links to the notification. A document being parsed, an HTTPS URL existing, or a discovery source finding the link is not sufficient.
- The database migration includes production demotion statements. They must be reviewed with the row-level dry-run manifest before migration deployment.
- This branch does not run production writes. It does not restore NIT Warangal eligibility or fee facts; those remain subject to official PDF verification.
- CI, build and preview smoke checks remain pending until GitHub reports results. No passing result is claimed here.


### Additional production source inventory (2026-10-31 06:20 UTC)

A separate read-only production inventory identified three unverified extraction-origin values that must be treated together by the source-origin backfill and publication gate:

| `enrichment_data.meta.source` | Recruitment rows | `meta.verified=false` | Globally VERIFIED/MANUALLY_VERIFIED |
|---|---:|---:|---:|
| `institutional_aggregation` | 4,002 | 4,002 | 536 |
| `fja_html` | 1,265 | 1,265 | 6 |
| `institution_aggregation` | 114 | 114 | 0 |
| **Total** | **5,381** | **5,381** | **542** |

3,130 of these rows have a NULL `official_link_source`, so discovery origin cannot be reconstructed from that field alone. Four `fja_html` records marked VERIFIED/MANUAL_VERIFIED point to the same UPSC Advt 12/2026 PDF while naming four different organisations and have no field-level `source_provenance`. They remain subject to issuer and fact review.

The Stage 1 backfill, dry-run manifest and post-migration checks must cover all three exact source values. This is an expanded read-only audit; no production records were changed.


### Public-discovery impact and lifecycle separation (2026-10-31 06:23 UTC)

A read-only production query quantified the impact of the 5,381-row extraction-origin cohort:

- 4,435 total live Recruitment records.
- 3,630 live records in the extraction-origin cohort (**81.8%**): 664 ACTIVE and 2,966 UPCOMING.
- 2,472 Post rows are associated with those live Recruitments; 851 currently have `posts.isLive = true`.
- 677 have a syntactically valid HTTP(S) notification URL, but zero have `official_link_source = 'MANUAL_VERIFIED'`.
- 2,964 of the 2,966 UPCOMING records have no application end date; 257 of the 664 ACTIVE records also have no application end date.

This is a material discovery/indexability impact. Do not apply the source gate or remediation migration as an unreviewed mass suppression. The frozen row-level manifest and a source-review/replacement plan must be reviewed first.

Keep three decisions separate:
1. **Source authority and fact review:** whether the issuer and each public fact are supported by evidence.
2. **Recruitment lifecycle/publication:** whether an upcoming, open, closed or archived recruitment page remains useful and indexable.
3. **JobPosting structured data:** only for an open post with manually verified official notification/application links and a plausible, non-future, source-evidenced notification date.

A reviewed UPCOMING recruitment can remain a useful indexable Recruitment Hub while its application window is not yet announced. The source-authority gate must not require `application_end_date IS NOT NULL`; the page should state the missing window accurately, and JobPosting schema/Apply actions remain separately gated.

No production migration or data mutation has been applied.


### Existing-record review-queue coverage (2026-10-31 06:27 UTC)

The proposed `official_digest_promote` workflow was matched against the 5,381 existing extraction-origin Recruitments using `metadata.ingest_batch + official_notification_url`:

| Source | Existing rows | With ingest batch | Matching staging row |
|---|---:|---:|---:|
| `fja_html` | 1,265 | 0 | 0 |
| `institution_aggregation` | 114 | 12 | 12 |
| `institutional_aggregation` | 4,002 | 350 | 343 |
| **Total** | **5,381** | **362** | **355** |

5,019 rows have no ingest batch and 5,026 have no matching staging row. The current review trigger can therefore re-verify only 355 existing rows. Before the Stage 2 remediation is applied, a legacy-record review/backfill path must be designed for the remaining 5,026, preserving Recruitment/Post identity and canonical URLs and retaining the same authority/fact evidence requirements.

No staging backfill or production mutation has been performed.
