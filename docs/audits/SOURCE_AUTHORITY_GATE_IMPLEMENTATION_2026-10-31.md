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

## Origin signals covered

The SQL gate and TypeScript helper recognise:

1. Recruitment `source_discovery_origin`, `official_link_source`, `enrichment_data.meta.source`, `metadata.source_provenance.discovery_origin`, and FJA `source_url`.
2. Canonical Post `sourceName`, `sourceReference`, `original_recruitment_url`, and `originalRecruitmentUrl`.
3. Legacy Posting `source`, `source_type`, `source_portals`, `source_url`, and both relationship paths: `inferred_recruitment_id` and `inferred_post_id -> posts.recruitment_id`.
4. Preliminary origin label `pilot_preliminary` and the known `fja`, `freejobalert`, `ext-1` through `ext-5`, and preliminary/aggregator source labels. A fresh read-only production reconciliation using the expanded predicate reproduced **6,365 candidates, 355 staging matches, 6,010 unmatched, and 6,003 without batch**.

FJA URL detection is host-based in the database helper; a lookalike host such as `freejobalert.com.evil.example` is not accepted.

## Publication and trust contract

An aggregator-origin Recruitment is publicly trusted only when all of the following hold:

- Recruitment `verification_status = VERIFIED`.
- `official_link_source = MANUAL_VERIFIED`.
- Issuer review is VERIFIED, with HTTPS evidence URL, reviewer, valid non-future timestamp and notes.
- Fact review is VERIFIED, with reviewer, valid non-future timestamp and notes.
- Every reviewed field has its own non-empty evidence reference and excerpt.
- The review includes evidence for `hub:notification_date`.

A generic VERIFIED status, populated HTTPS URL, or aggregator extraction alone cannot pass this gate.

A Recruitment must also have at least one non-duplicate canonical Post Leaf. Duplicate Post rows are excluded from direct anonymous reads. This prevents the 81 legacy-only records from appearing as complete Recruitment Hubs before canonical Post decomposition is reviewed.

## RLS scope

The migration replaces permissive SELECT policies on exactly these five source-sensitive tables:

- `recruitments`
- `posts`
- `eligibilities`
- `post_age_rules`
- `vacancies`

Child rows inherit the trust decision through their canonical Post. The helper functions are SECURITY DEFINER with a locked `pg_catalog` search path; only the two boolean policy entry points are executable by `anon` and `authenticated`. The helper schema is not exposed through the Data API.

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

The sitemap therefore cannot advertise a record that the application-level source gate excludes.

## Rollout and verification gates

1. Run the expanded read-only manifest against production and reconcile the expected 6,365 / 355 / 6,010 / 6,003 counts. Resolve any drift before migration approval.
2. Apply the migration only after explicit review/approval. It performs DDL, policy changes and future-write trigger installation; it does not perform a historical bulk backfill.
3. Run `scripts/audits/source-origin-rls-post-migration-check.sql` as a read-only verification. Confirm dynamic origin detection, all five RLS policies, and direct `anon` visibility.
4. Confirm `organizations` and `positions` remain readable and the adjacent restricted tables remain unexposed.
5. Benchmark query plans and REST latency for the SECURITY DEFINER predicates. The migration adds supporting indexes, but production performance must be measured before release.
6. Apply the migration before deploying application code that calls `private.is_recruitment_publicly_trusted`. Do not merge/deploy the application code ahead of the database function.
7. Preview/production verification is still required. A green CI run is not evidence that the live RLS behavior or sitemap has been verified.
8. Review and approve any later backfill or remediation as a separate change. The 81 missing canonical Post Leaves require a reviewed decomposition manifest before any write.

## Rollback

The paired rollback file is emergency-only. It restores unrestricted public-read policies and therefore reopens the exposure this change closes. Prefer fixing forward. Roll back application code that calls the private helper before using the down migration.

## Explicitly not done

- No production migration was applied.
- No production row was updated or quarantined.
- No source review was marked VERIFIED.
- No Post Leaf was created or remapped.
- No URL, slug, canonical ID or sitemap entry was changed in production.
- No preview or production deployment was verified as part of this implementation work.
