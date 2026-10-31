# P0 — Legacy official-source review queue design

**Status:** Design proposal for issue #208. No schema change or production write is authorized by this document.

## 1. Problem and production baseline

The existing official-digest review workflow matches a Recruitment through `metadata.ingest_batch + official_notification_url`. It covers only 355 of the 5,381 Recruitment records in the three extraction-origin cohorts. The remaining 5,026 have no matching staging row; 5,019 of them have no ingest batch.

Read-only production snapshot, 2026-10-31 06:47 UTC:

| Measure | Records |
| --- | ---: |
| Legacy unmatched Recruitments | 5,026 |
| Linked to one or more canonical Posts | 3,581 |
| No canonical Post | 1,445 |
| Canonical Post rows | 4,373 |
| Posts currently marked live | 2,737 |
| With HTTP(S) official notification URL | 1,977 |
| Without HTTP(S) official notification URL | 3,049 |
| With HTTP(S) official application URL | 1,284 |
| Without HTTP(S) official application URL | 3,742 |
| Live Recruitment records | 3,506 |

A separate earlier snapshot found 15 Posts still carrying an official-source boolean and zero Posts in this unmatched cohort with `sourceVerificationStatus = VERIFIED`. These 15 flags require individual disposition; neither automatic acceptance nor automatic overwrite is appropriate.

## 2. Non-negotiable design invariants

1. **No duplicate canonical entities.** Queue items reference existing `recruitments.id` and `posts.id`; the queue never creates Recruitment or Post entities.
2. **No canonical URL mutation.** Recruitment/Post slugs, IDs, parent-child relationships and redirects remain unchanged during review.
3. **No synthetic ingestion batches.** Do not fabricate `metadata.ingest_batch` just to satisfy the current digest staging trigger.
4. **Discovery origin is immutable and separate.** `source_discovery_origin` records where a candidate was discovered. It is not the official-link verification state.
5. **Authority, facts, link destinations and lifecycle are separate decisions.** A verified notification source does not automatically verify every field, an application URL, or an open application window.
6. **Evidence must bind to the reviewed value.** A review must become stale if the Recruitment/Post field changes after review.
7. **Absence is explicit.** Reviewers must be able to record `NOT_STATED` or `NOT_APPLICABLE` with a source locator and excerpt; null is never silently interpreted as zero or verified absence.
8. **No bulk suppression or repair from shared labels.** Similar titles, source URLs or extraction timestamps create review clusters, not proof that all rows are identical or wrong.

## 3. Recommended workflow segmentation

### A. Source discovery before issuer review — 3,049 records

No HTTP(S) official notification URL exists. Queue these as `SOURCE_DISCOVERY_REQUIRED`. Research must find the issuing authority's own recruitment page/notice. If no notice can be found, record a reasoned `NO_ISSUER_NOTICE_FOUND` or `SOURCE_UNRESOLVED` disposition. These records cannot pass authority review.

### B. Issuer authority and entity matching — 1,977 records

A URL is only a candidate. Reviewer confirms:
- HTTPS and issuer-controlled domain/page;
- redirects resolve to the intended issuer;
- notice number/title/organization match the Recruitment;
- notice is the correct year/recruitment cycle;
- the notice actually supports the Recruitment entity and its Post list.

Known entity-conflict clusters (including four different organizations pointing at one UPSC PDF) must be quarantined for manual identity resolution, not approved from host trust alone.

### C. Canonical Post decomposition — 1,445 records without a Post

Review the issuer notice for distinct role/post entities. Create a Post only when the notice provides a real role/post that can be represented as a canonical leaf. If the notice is one general recruitment with no defensible post decomposition, record an explicit exception for product review; do not create a generic placeholder leaf to satisfy a count requirement.

### D. Field-level fact review

For each existing Post, enumerate supported fact families: role/title, vacancy split, education, experience, age, salary, fees, selection process, documents, dates and official destinations. Review each populated fact against the issuer notice. Record explicit `NOT_STATED` where the source was checked and does not state the field. Application URL verification is independent from notification URL authority.

## 4. Recommended data model (proposal; inspect schema and access policies before implementation)

Use a dedicated review case linked to canonical identity rather than reusing the import/promotion staging table for legacy entities.

### `official_source_review_cases`

One case per existing Recruitment + notification-source revision:
- primary key;
- `recruitment_id` FK to `recruitments.id`;
- `source_discovery_origin` snapshot;
- `notification_url` and URL fingerprint;
- case state: `SOURCE_DISCOVERY_REQUIRED`, `AUTHORITY_REVIEW_REQUIRED`, `FACT_REVIEW_REQUIRED`, `READY`, `REJECTED`, `BLOCKED_ENTITY_CONFLICT`;
- issuer authority evidence URL, reviewer, timestamp and notes;
- created/updated timestamps.

A change to the official notification URL creates a new review revision or invalidates the previous case. It must not overwrite review history.

### `official_source_review_facts`

One row per Recruitment/Post fact under review:
- primary key and case FK;
- `recruitment_id` FK; nullable `post_id` FK for hub-level facts;
- `target_type`: `HUB` or `POST`;
- stable `field_key`;
- `review_status`: `VERIFIED`, `NOT_STATED`, `NOT_APPLICABLE`, `REJECTED`, `PENDING`;
- exact reviewed value snapshot (JSONB) and deterministic value hash;
- evidence URL/reference, page/section locator and excerpt;
- reviewer identity, timestamp and notes.

The review is valid only while the current canonical field value still matches the reviewed value snapshot/hash. A changed value invalidates the field review and returns it to pending. A missing field is validly reviewed only with an explicit `NOT_STATED` or `NOT_APPLICABLE` decision and evidence.

### Review decision projection

A single database function/view should calculate whether a Recruitment and each Post are eligible for public factual claims. It must require:
- an approved issuer authority review for the current notification URL;
- every required hub/Post fact key to have a current, evidence-backed decision;
- official notification/application link verification independently;
- lifecycle/publication policy independently.

The public application, live discovery queries and sitemap should consume the same decision source. Do not maintain separate subtly different eligibility rules in each route.

**Important:** This is a proposed model, not an approved migration. Before implementation, inspect current RLS/privileges, existing review metadata contracts, official-digest trigger dependencies and query performance. Add schema, code and rollback in separate additive-first steps.

## 5. Processing order

1. Freeze the 5,026-row unmatched manifest, including all 4,373 linked Post records and fact-family counts.
2. Resolve high-risk entity-contamination clusters first; preserve exact source evidence.
3. Process the 1,977 notification-URL candidates through issuer and entity matching.
4. Process 3,049 missing-notification-URL records through source discovery; no public official-source claims until resolved.
5. Process 1,445 no-Post Recruitment records through canonical decomposition review.
6. Pilot 10–20 records spanning all three source origins, source-present/source-missing cases, existing/no-Post cases, and manual-link conflicts.
7. Validate reviewer workflow, evidence completeness, stale-review invalidation, RLS and public payload behaviour.
8. Expand in controlled batches with a per-batch before/after reconciliation and explicit owner approval for production writes.

## 6. Acceptance criteria

- Every one of the 5,026 unmatched Recruitments has a queue case or an explicit documented exclusion/disposition.
- Every linked Post is referenced by its existing ID and slug; no duplicates are created.
- Missing notification URLs, missing Posts, manual-link conflicts and source/entity mismatches are separately classified.
- Every verified field has evidence URL/reference, locator, excerpt, reviewer and timestamp.
- Any post-review value change invalidates the affected review.
- Notification authority, application-link validity, fact verification, lifecycle and JobPosting eligibility remain distinct.
- No production data is changed until the manifest, schema/RLS plan, pilot and rollback have been reviewed and approved.

## 7. Guardrails

- Aggregators remain internal discovery inputs and are never displayed as official sources.
- Never expose the FJA name or URL in public UI.
- No mass re-ingestion, status reset, link overwrite, page creation, deletion or canonical URL change as a shortcut.
- Keep the Latest Government Jobs page behind the same source/date/publication contract.


## 8. Production RLS finding and public gate requirement

A read-only policy inspection (2026-10-31) found RLS enabled but unrestricted `public read USING (true)` policies on `recruitments`, `posts`, `eligibilities` and `post_age_rules`. Direct anonymous Supabase REST reads could therefore bypass Next.js filtering.

The source-review result must be consumed consistently by:
- Recruitment Hub and Post Leaf server queries;
- listing, related-job and sitemap queries;
- direct public RLS policies on canonical Recruitment/Post and exposed child-fact tables.

PR #189 adds a shared RLS predicate for the four existing public-read tables. The legacy queue must ultimately write/produce the same authoritative decision; do not create a separate review state that the server and RLS policies interpret differently.

A fresh read-only audit of the 5,381 extraction-origin Recruitments found zero existing `metadata.source_provenance` records, zero issuer reviews marked VERIFIED, zero fact reviews marked VERIFIED and zero complete notification-date evidence chains. Five legacy MANUAL_VERIFIED link labels exist, but none has the new authority/fact evidence. They remain pending entity and notification matching.

This confirms that the queue must review both the issuer-to-Recruitment identity and field facts. A manually verified URL host alone does not establish that the notice belongs to the named organization or supports its Post records.
