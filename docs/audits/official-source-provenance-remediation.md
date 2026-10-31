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
- All 362 recruitments had `official_link_source = 'AGGREGATOR_DISCOVERED'`; 30 were nevertheless marked `VERIFIED`.
- 3,262 `posts_education` rows and 643 `posts_experience` rows labelled `source = 'fja_post_inventory'`; all had confidence 60 and `verified_at IS NULL`.
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
- The migration redefines `aggregate_enrichment_for_post` and backfills canonical education/experience JSONB from their child tables with `fact_id`, `source`, `confidence_score` and `verified_at`. This closes the provenance gap created when earlier consolidation dropped row-level metadata.
- Education/experience facts sourced from `fja_post_inventory` (or lacking a verification timestamp) are hidden unless the exact per-post fact-review key is present, regardless of the parent recruitment's `official_link_source`. This is important because the read-only audit found FJA-derived child rows under both aggregator-discovered and NULL/other parent source labels.
- Static contract tests cover the source helper, leaf/hub gates, live discovery queries, sitemap exclusion, migration gate and null-fee rendering.

### Review and rollout notes

- The source-authority review is intentionally manual. The reviewer must open the issuing authority's own recruitment page and confirm that it publishes or links to the notification. A document being parsed, an HTTPS URL existing, or a discovery source finding the link is not sufficient.
- The database migration includes production demotion statements. They must be reviewed with the row-level dry-run manifest before migration deployment.
- This branch does not run production writes. It does not restore NIT Warangal eligibility or fee facts; those remain subject to official PDF verification.
- CI, build and preview smoke checks remain pending until GitHub reports results. No passing result is claimed here.
