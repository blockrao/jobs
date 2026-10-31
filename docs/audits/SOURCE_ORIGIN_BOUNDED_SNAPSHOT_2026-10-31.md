# JobOye Source-Origin Audit — Bounded Production Snapshot

**Audit date:** 31 October 2026  
**Database snapshot:** 2026-10-31 11:35:19 UTC  
**Execution mode:** Read-only aggregate queries; no record-level export; no production writes  
**Reproducibility:** `scripts/audits/source-origin-bounded-snapshot.sql`

## Executive result

The bounded recheck completed successfully and reproduced the principal source-origin counts without running the full multi-section audit.

| Measure | Result |
|---|---:|
| Recruitments in production | 6,365 |
| Canonical Posts | 5,814 |
| Legacy Postings | 4,223 |
| Recruitments with at least one persisted aggregator/preliminary origin signal | **6,365** |
| Candidates with at least one canonical Post | 4,839 |
| Candidates without a canonical Post | **1,526** |
| Exact staging matches | 355 |
| No staging match | **6,010** |
| No `metadata.ingest_batch` | **6,003** |

The staging match is an exact match on batch plus `hub.official_url = official_notification_url`. It is a reconciliation signal only; it does not establish issuer authority or fact accuracy.

## Canonical Recruitment → Post integrity

The 1,526 source-origin Recruitments without any canonical Post divide into:

| State | Recruitments |
|---|---:|
| Legacy Posting mapping exists | 81 |
| No legacy Posting mapping found | 1,445 |
| **Total without canonical Post** | **1,526** |

The 81 records with a legacy mapping are candidates for a controlled canonical decomposition review. The 1,445 without a legacy mapping need a separate source/record recovery assessment. Neither group should be auto-promoted, duplicated, or assigned a guessed Post.

The canonical rule remains unchanged: a Recruitment Hub must not be treated as a complete public opportunity without at least one correctly associated canonical Post Leaf.

## Bounded manifest — 81 legacy-mapped / no-canonical-Post records

**Manifest execution:** 31 October 2026, read-only, four small pages (25 / 25 / 25 / 6 rows). The cohort was selected from Recruitments with no canonical Post and a legacy Posting mapped by `inferred_recruitment_id`, with aggregator-origin signals on the legacy row.

### Structural reconciliation

| Check | Result |
|---|---:|
| Recruitment ↔ legacy Posting mapping rows | 81 |
| Distinct Recruitments | 81 |
| Distinct legacy Posting IDs | 81 |
| Recruitments with multiple matching legacy mappings | 0 |
| Inferred Recruitment ID matches Recruitment ID | 81 / 81 |
| Inferred Post ID is null | 81 / 81 |
| Exact Recruitment name ↔ legacy title matches | 81 / 81 |
| Recruitment ↔ legacy organization ID matches | 81 / 81 |
| Missing organization IDs | 0 |
| Duplicate Recruitment slugs within the full Recruitment table | 0 |
| Duplicate legacy external IDs within the full Posting table | 0 |

This is a strong one-to-one **relationship and identity match**. It does not establish that the Recruitment facts, vacancy counts, deadlines, eligibility, or official source URLs are correct.

### Lifecycle and quality flags

| Recruitment status | Records | Verification |
|---|---:|---|
| ACTIVE | 28 | All UNVERIFIED |
| CLOSED | 5 | All UNVERIFIED |
| UPCOMING | 48 | All UNVERIFIED |
| **Total** | **81** | **All UNVERIFIED** |

Additional flags:
- 9 records use an organization placeholder name beginning `Organization not identified`.
- 1 title contains a zero-vacancy flag.
- All 81 have a non-empty Recruitment slug in the reviewed manifest.
- Every legacy row has a populated external ID; all 81 external IDs are distinct.
- Every legacy row is marked `source = fja`, `source_type = UNKNOWN`, and `verification_status = UNVERIFIED` in the reviewed cohort.

### Decision

**Structural mapping eligibility: PASS (81/81). Canonical Post creation eligibility: NOT YET ESTABLISHED (0/81 approved).**

The records can proceed to a second, source-grounded review because the legacy-to-Recruitment mapping is one-to-one and title/organization identifiers agree. They must not yet be decomposed into public Post Leaves: the cohort is unverified, and the current audit has not established issuer-owned notification/application URLs or post-level facts from official sources. The 9 placeholder organizations and zero-vacancy title flag require explicit resolution before any corresponding record is promoted.

The next safe step is a dry-run source-evidence review for this 81-record cohort, retaining existing Recruitment IDs and proposing Post-level decomposition only where the official issuer source supports a distinct post title and the necessary facts. Keep CLOSED records out of active-job publication; do not infer a live opportunity from ACTIVE/UPCOMING status alone. No record changes are authorized by this manifest.

## Aggregator URLs in fields labelled official

A separate bounded URL-host scan checked persisted URL fields on Recruitments, canonical Posts and legacy Postings against the known aggregator/social/messaging host registry used for this audit.

| Measure | Result |
|---|---:|
| Distinct Recruitments with a known aggregator URL in any scanned field | **67** |
| Distinct Recruitments with an aggregator URL in `official_notification_url` and/or `official_application_url` | **55** |

This confirms that field names such as `official_notification_url` and `official_application_url` cannot be treated as proof of issuer authority. The host must be checked, and the issuer destination must be verified.

The host set checked includes FreeJobAlert, SarkariResult, SarkariNaukri, IndiaSarkariNaukri, SahisarkariJobs, SarkariExam, Maru Gujarat, PDF Jobs Jankari, OnlineUpCar, RojgarResult, FreshersWorld, and known social/messaging domains.

## Interpretation and limits

1. **Origin is not a verdict on every fact.** The 6,365 candidates have aggregator/preliminary discovery signals. Some fields may subsequently have been independently verified. The count must not be described as 6,365 incorrect records.
2. **A staging match is not verification.** The 355 exact staging matches only indicate a reconciliation link.
3. **The URL scan is not a full internet provenance audit.** It scans known persisted columns and the listed host set. It does not resolve redirect chains, classify previously unknown domains, inspect the content of each destination, or independently establish issuer ownership.
4. **The 81-record manifest is now complete.** It was read in four small pages. The structural mapping checks passed 81/81, but all 81 remain unverified and none is approved for canonical Post creation. Do not export all 6,365 records.
5. **No public visibility change is authorized by this audit.** Do not apply RLS, suppress records, alter verification statuses, modify official URLs, re-ingest, or change Recruitment/Post relationships based solely on these aggregate counts.

## Next bounded action

Run a read-only, source-evidence dry-run for the **same 81 records**. Verify issuer-owned notification/application destinations and extract only post-level facts supported by the official issuer source. Keep existing Recruitment IDs; propose a canonical Post only when the official evidence supports a distinct post title and the required facts. Explicitly resolve the 9 placeholder organizations and the one zero-vacancy title flag. Keep the 1,445 unmapped records out of this pass. No Post creation, verification update, URL correction, or publication-status change is authorized without a separately reviewed dry-run and explicit approval.

## Safety record

- SELECT-only production access.
- No production data changed.
- No canonical IDs, slugs, URLs, statuses, source fields, or RLS policies changed.
- The SQL uses a 15-second statement timeout per statement and returns aggregate counts only.
