# Source-origin and public RLS audit

**Snapshot:** 31 October 2026, 13:50 IST  
**Database:** JobOye production Supabase  
**Method:** Read-only production queries. No database rows, policies, grants, schemas or application state were modified.

## Executive finding

The source-origin predicate used by the existing provenance implementation is incomplete, and the proposed RLS migration does not actually replace the production public-read policies.

The expanded audit finds **6,365 of 6,365 canonical Recruitments with at least one known aggregator or preliminary-source signal** when all currently persisted origin indicators are considered.

This is not a claim that all 6,365 records contain incorrect facts. It means their discovery origin cannot be treated as issuer verification. They require the same authority and fact-review rules before JobOye makes official claims about them.

Two specific gaps must be corrected before the source gate is deployed:

1. Legacy `postings.source` / `source_portals` and `pilot_preliminary` / FJA source-reference indicators are not covered by the candidate migration's origin predicate.
2. Five public job-data tables still have anonymous SELECT policies with `USING (true)`; the source migration currently contains no replacement RLS policy DDL.

## 1. Expanded source-origin cohort

| Cohort | Recruitments |
|---|---:|
| Original canonical signals (Recruitment enrichment metadata, official-link source, canonical Post sourceName) | 6,282 |
| Additional legacy-posting-only Recruitments | 81 |
| Additional `pilot_preliminary` / FJA source-reference Recruitments | 2 |
| **Expanded source-origin candidate cohort** | **6,365** |
| Total canonical Recruitments | 6,365 |
| Without a known aggregator/preliminary signal | 0 |

The three original canonical signals cover:
- Recruitment `enrichment_data.meta.source`: `institutional_aggregation`, `institution_aggregation`, `fja_html`.
- Recruitment `official_link_source`: `AGGREGATOR_DISCOVERED`, `fja_official_link_extracted`, `official_link_extracted`.
- Canonical Post `sourceName`: `aggregator`, `freejobalert`, `aggregator_extracted`.

### 1.1 The 81 legacy-posting-only Recruitments

The 81 additional records are mapped through `postings.inferred_recruitment_id`, with:
- `postings.source = 'fja'`;
- `postings.source_type = 'UNKNOWN'`;
- `postings.source_portals = ['fja']`;
- no `inferred_post_id`;
- zero canonical Posts for every one of the 81 Recruitments.

These records are invisible to the current origin predicate because their Recruitment enrichment source and official-link source are NULL and they have no canonical Post source label.

**This is a direct provenance bypass.** If the proposed migration only backfills from Recruitment metadata, official-link source and canonical Post sourceName, these 81 rows receive no `AGGREGATOR_DISCOVERED` origin and can pass the default non-aggregator trust path.

They also violate the canonical Recruitment → Post Leaf requirement. They must not be promoted or published as complete Recruitment entities until each existing Recruitment has at least one correctly matched canonical Post. Do not create duplicate Recruitment records or change canonical URLs to solve this.

### 1.2 Two additional preliminary records

Two canonical Posts use `sourceName = 'pilot_preliminary'` and have `sourceReference` / original recruitment URLs on the FJA domain:

| Recruitment ID | Recruitment | Post ID | Current state |
|---:|---|---:|---|
| 7581 | NLC India Apprentice Recruitment 2026 | 6629 | UNVERIFIED; `official_link_source = pending_verification`; no official notification URL |
| 7582 | KSRTC-SWIFT Recruitment 2026 | 6630 | UNVERIFIED; `official_link_source = official_CMD_listing`; no source-provenance review |

The current TypeScript and SQL source predicates do not include `pilot_preliminary` or FJA source-reference URL fields. These two records could therefore be treated as non-aggregator-origin records by the default trust path.

### 1.3 Legacy staging coverage is now outdated

The expanded cohort (including the 81 legacy-posting-only and two preliminary-source records) was reconciled against `official_digest_promote` using the existing `metadata.ingest_batch + official_notification_url` key.

| Measure | Records |
|---|---:|
| Expanded source-origin candidates | 6,365 |
| With `metadata.ingest_batch` | 362 |
| Matching staging row | 355 |
| Without staging match | **6,010** |
| Without `metadata.ingest_batch` | **6,003** |

The prior #208 figure of 5,026 unmatched records is outdated. The legacy review design must be recalculated against the expanded 6,365-record cohort. The 83 newly identified records (81 legacy-posting-only plus two preliminary-source records) have no ingest batch and no staging match, so they have no safe staging-based review path until their origin and canonical entity relationships are reconciled.

The 3,447 legacy posting rows with both `inferred_recruitment_id` and `inferred_post_id` were checked: all 3,447 point to the same Recruitment; no conflicting Recruitment ID mapping was found in that subset.

## 2. Source registry authority

The source registry classifies each of the following as `authority = AGGREGATED` and `is_official = false`:

- `fja`
- `freejobalert`
- `ext-1`
- `ext-2`
- `ext-3`
- `ext-4`
- `ext-5`

These values are useful discovery provenance. They are not issuing-authority evidence.

## 3. Direct anonymous Supabase read exposure

The production audit checked actual table grants as well as RLS policies. Five job-data tables currently grant anonymous SELECT and have a permissive public-read policy with `USING (true)`.

| Table | Rows | Anonymous SELECT | Current public policy | Required treatment |
|---|---:|---|---|---|
| `recruitments` | 6,365 | Yes | `public read USING (true)` | Replace with Recruitment source-trust gate |
| `posts` | 5,814 | Yes | `public read USING (true)` | Replace with parent Recruitment source-trust gate |
| `eligibilities` | 20 | Yes | `public read USING (true)` | Gate through canonical Post → Recruitment |
| `post_age_rules` | 78 | Yes | `public read USING (true)` | Gate through canonical Post → Recruitment |
| `vacancies` | 0 | Yes | `public read USING (true)` | Gate through canonical Post → Recruitment, even while empty |

The original PR #189 description names only four tables. The production inventory shows five source-sensitive job-data tables, including `vacancies`.

### 3.1 Shared reference tables that can remain public

| Table | Rows | Current policy | Decision |
|---|---:|---|---|
| `organizations` | 2,013 | Public read | Keep public; it is shared organization/entity reference data |
| `positions` | 408 | Public read | Keep public; it is shared role taxonomy/reference data |

### 3.2 Tables with grants but no permissive SELECT policy

`exams`, `locations` and `qualifications` have anonymous SELECT grants but no SELECT policies, so RLS currently returns no rows. Do not accidentally make these public while changing the source gate.

`evidence` and `recruitment_fees` have public-read policy definitions but no anonymous SELECT grant. `postings` has an `APPROVED` policy but no anonymous SELECT grant. They are not currently direct anonymous REST read paths according to the grants audit.

## 4. Migration review

The source-authority migration in the current provenance branch adds the discovery-origin column, trust functions and write guards. However, it contains no `CREATE POLICY`, `ALTER POLICY` or `DROP POLICY` statements.

That conflicts with the PR #189 description, which claims the migration replaces public-read RLS policies on four tables.

The source-authority migration is not present in the production migration history. The latest recorded migration is `20261028100717`; no source-provenance migration has been applied.

**Do not apply the current migration unchanged.** The RLS bypass remains open, and the origin backfill would miss the 81 legacy-posting-only records and two preliminary-source records.

## 5. Required architecture corrections

1. **Expand the origin predicate.** Include Recruitment metadata, official-link source, canonical Post source labels, `pilot_preliminary`, FJA source-reference URLs, legacy `postings.source`, `source_type` and `source_portals`.
2. **Backfill and guard legacy posting writes.** When a source posting maps to an existing Recruitment through either `inferred_recruitment_id` or `inferred_post_id`, persist the aggregator discovery origin on the parent Recruitment. Preserve that origin immutably.
3. **Enforce the canonical Recruitment → Post relationship.** The 81 legacy-posting-only Recruitments must be decomposed into correctly matched canonical Posts before source/fact promotion. Preserve existing Recruitment IDs and URLs.
4. **Replace five public job-data RLS policies.** Gate Recruitments directly; gate Posts through their parent Recruitment; gate eligibilities, post_age_rules and vacancies through Post → Recruitment. Preserve public read for organizations and positions.
5. **Rebuild the legacy review queue.** Use the expanded 6,365 cohort and 6,008 unmatched count, not the previous 5,026. Provide a deterministic path for the 6,001 records without an ingest batch.
6. **Test the direct REST boundary.** Anonymous SELECT must return only source-trusted rows on all five job-data tables. Test both unreviewed and reviewed sample records, including the 81 legacy-posting-only cases.
7. **Keep the review non-destructive.** No bulk demotion, deletion, quarantine or re-ingestion until the frozen manifest, per-record review route, recovery and pilot are approved.

## 6. Audit artifacts and disposition

Reproduce the audit using `scripts/audits/source-origin-rls-audit-read-only.sql` with a read-only database role.

- No production database writes were performed.
- No RLS policies or grants were changed.
- No canonical IDs, slugs or Recruitment/Post relationships were changed.
- No records were suppressed or deleted.

**Disposition:** source-origin coverage and public RLS audit complete. Provenance migration remains blocked pending the expanded origin predicate, five-table RLS gate, and a safe canonical Post/review path for the 81 additional records.
