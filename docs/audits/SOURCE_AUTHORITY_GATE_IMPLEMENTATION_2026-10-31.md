# JobOye P0 Source-Authority Gate — Implementation Review

**Date:** 2026-10-31  
**Base:** `main` at `e7af968903b912ef4462f2a2f23c491c624a7eb2`  
**Scope:** Complete aggregator-origin detection, canonical publication gate, direct anonymous RLS protection, and deterministic legacy review manifest.

## Why this implementation is separate from the older provenance branch

The older source-authority implementation is not safe to merge unchanged. The read-only production audit expanded the candidate cohort to **6,365 Recruitment records** and identified persisted origin paths that its original predicate did not cover:

- 6,282 records found by the earlier Recruitment metadata, official-link source and canonical Post source-name predicate.
- 81 additional records identified only through legacy `postings` relationships/source fields; none has a canonical Post Leaf.
- 2 additional `pilot_preliminary` Post records with FJA source-reference evidence.

The resulting reconciliation is **6,365 candidates, 355 staging matches, 6,010 without a staging match, and 6,003 without an ingest batch**. These are discovery-origin candidates, not a declaration that every fact is wrong.

A separate canonical-leaf audit found **4,839 Recruitments with at least one non-duplicate Post Leaf and 1,526 without one**. Of the 1,526 incomplete hubs, 81 have a legacy Posting relationship that needs careful reconciliation and 1,445 have no legacy Posting relationship. The no-leaf cohort includes 1,355 UPCOMING, 124 ACTIVE, 43 CLOSED and 4 ARCHIVED Recruitments.

A further production read-only check found only **4** records with `verification_status = VERIFIED` and `official_link_source = MANUAL_VERIFIED`; **0** have a complete issuer review, **0** have a complete fact review, and **0** meet the minimum source-trust gate. Therefore, applying this RLS gate to the current snapshot before completing reviews would make the entire 6,365-record source-origin cohort unavailable to anonymous readers. This is a material product/discovery impact and a **stop-ship condition**, not an incidental implementation detail.

## Origin signals covered

The SQL gate and TypeScript helper recognise:

1. Recruitment `source_discovery_origin`, `official_link_source`, `enrichment_data.meta.source`, `metadata.source_provenance.discovery_origin`, `source_url`, `official_notification_url`, and `official_application_url`.
2. Canonical Post `sourceName`, `sourceReference`, `original_recruitment_url`, `originalRecruitmentUrl`, `officialSourceUrl`, `applyPortalUrl`, `application_url`, and `officialNotificationUrl`.
3. Legacy Posting `source`, `source_type`, `source_portals`, `source_url`, and both relationship paths: `inferred_recruitment_id` and `inferred_post_id -> posts.recruitment_id`.
4. Preliminary origin label `pilot_preliminary` and known aggregator source labels.

The database URL predicate mirrors the full host registry in `src/lib/aggregators.ts`: FreeJobAlert, SarkariResult, SarkariNaukri, IndiaSarkariNaukri, SahisarkariJobs, SarkariExam, Maru Gujarat, PDF Jobs Jankari, OnlineUpCar, RojgarResult, FreshersWorld and the known social/messaging hosts. Host-boundary matching rejects lookalikes such as `freejobalert.com.evil.example`.

A further read-only URL audit found **67 distinct Recruitments** with at least one known aggregator URL across Recruitment, Post and legacy Posting fields. All 67 are already in the 6,365 candidate cohort, so this adds zero IDs. **55** have an aggregator URL in `official_notification_url` and/or `official_application_url`; 0 have MANUAL_VERIFIED link source and 0 have global VERIFIED status.

## Publication and trust contract

An aggregator-origin Recruitment is publicly trusted only when all of the following hold:

- Recruitment `verification_status = VERIFIED`.
- `official_link_source = MANUAL_VERIFIED`.
- Issuer review is VERIFIED, with HTTPS evidence URL, reviewer, valid non-future timestamp and notes.
- Fact review is VERIFIED, with reviewer, valid non-future timestamp and notes.
- The review declares a non-empty `required_fields` list, and `reviewed_fields` covers every required key.
- Every reviewed field has its own non-empty evidence reference and excerpt.
- The required set includes `hub:notification_date`.

A generic VERIFIED status, populated HTTPS URL, or aggregator extraction alone cannot pass this gate. The Recruitment must also carry an HTTPS `official_notification_url` on a non-aggregator host; if `official_application_url` is populated, it must also be HTTPS and non-aggregator. Authority evidence URLs on aggregator hosts are rejected.

A Recruitment must also have at least one non-duplicate canonical Post Leaf. Duplicate Post rows are excluded from direct anonymous reads. This prevents the 81 legacy-only records from appearing as complete Recruitment Hubs before canonical Post decomposition is reviewed.

## RLS scope

The migration replaces permissive SELECT policies on exactly these five source-sensitive tables:

- `recruitments`
- `posts`
- `eligibilities`
- `post_age_rules`
- `vacancies`

Child rows inherit the trust decision through their canonical Post. The helper functions are SECURITY DEFINER with a locked `pg_catalog` search path; only the two boolean policy entry points are executable by `anon` and `authenticated`. The helper schema is not exposed through the Data API.

Because `recruitments` and `posts` contain internal source/provenance columns (including source references and enrichment JSON), the migration also revokes anon/authenticated table SELECT on those two base tables. The Next.js server reads through its server-side database role; anonymous child-table reads remain subject to the same trust predicates. This prevents direct Supabase REST access from exposing internal aggregator references even for rows that later pass review.

The migration intentionally does not change policies or grants for `organizations` or `positions`, and does not grant anonymous access to `postings`, `exams`, `locations`, `qualifications`, `evidence`, or `recruitment_fees`.

## No mass remediation in this migration

The migration adds the origin field, guards future writes, installs the source-aware RLS policies, and dynamically detects existing source signals. It does **not** bulk-update, quarantine, suppress, delete, promote, or re-ingest any existing Recruitment or Post.

The separate read-only manifest `scripts/audits/source-origin-legacy-review-manifest.sql` rebuilds the candidate queue and staging reconciliation. The 81 legacy-only records are explicitly reported for manual canonical Post decomposition using their existing Recruitment IDs. No new Recruitment IDs, guessed Post relationships, or duplicate hubs are created.

## Application consumers

Server-rendered reads use the same database trust function so the app's owner-level database connection cannot bypass the RLS decision. The gate is applied to:

- Recruitment route and listing queries.
- Post Leaf reads and related-post discovery.
- Organization discovery counts.
- Recruitment Hub, Post Leaf and organization sitemap queries.

The sitemap therefore cannot advertise a record that the application-level source gate excludes. The same review now covers homepage statistics, qualification/sector lists, organization and legacy-posting discovery, search/autocomplete, related Post results and Recruitment Hub leaf loading. Legacy Posting discovery requires a valid mapping to a trusted canonical Post; an inferred Recruitment ID alone is not enough.

The public Post Leaf renderer no longer uses raw FJA extraction as a fallback for qualification, experience, age, salary or advertisement number. Its notification and application links come from the Recruitment-owned official URLs, and enrichment/related labels are passed through aggregator sanitization. Search announcement state uses `recruitments.notification_date`, never `posts.created_at` or `recruitments.created_at`.

## Rollout and verification gates

**Stop-ship:** Do not apply this migration to production until the review workflow and canonical Post decomposition plan have been completed and the expected public-visible inventory has been explicitly approved. The current snapshot has zero source-origin records meeting the minimum trust gate, so an immediate rollout would hide the whole current job inventory from anonymous access.

1. Run the expanded read-only manifest against production and reconcile the expected 6,365 / 355 / 6,010 / 6,003 counts. Resolve any drift before migration approval.
2. Apply the migration only after explicit review/approval. It performs DDL, policy changes and future-write trigger installation; it does not perform a historical bulk backfill.
3. Run `scripts/audits/source-origin-rls-post-migration-check.sql` as a read-only verification. Confirm dynamic origin detection, all five RLS policies, no anon/authenticated SELECT privilege on `recruitments` and `posts`, and trust-filtered anon visibility on the three child tables.
4. Confirm `organizations` and `positions` remain readable and the adjacent restricted tables remain unexposed.
5. Benchmark query plans and REST latency for the SECURITY DEFINER predicates. The migration adds a partial index for the new origin field and reuses the existing Post/legacy relationship indexes. Production query plans and REST latency must still be measured before release.
6. Apply the migration before deploying application code that calls `private.is_recruitment_publicly_trusted`. Do not merge/deploy the application code ahead of the database function.
7. Preview/production verification is still required. A green CI run is not evidence that the live RLS behavior or sitemap has been verified.
8. Review and approve any later backfill or remediation as a separate change. The 81 legacy-mapped and 1,445 unmapped no-Post Recruitments require separate reviewed decomposition manifests before any write.

## Rollback

The paired rollback file is emergency-only. It restores unrestricted public-read policies and therefore reopens the exposure this change closes. Prefer fixing forward. Roll back application code that calls the private helper before using the down migration.

## Explicitly not done

- No production migration was applied.
- No production row was updated or quarantined.
- No source review was marked VERIFIED.
- No Post Leaf was created or remapped.
- No URL, slug, canonical ID or sitemap entry was changed in production.
- No preview or production deployment was verified as part of this implementation work.
- The migration is not approved for production rollout while the zero-visible-inventory condition remains.
