# Institutional Aggregation: UPPSC Payload Reuse Audit

Audit date: 31 October 2026  
Production project: cusxodjgkrttwmdmhvso  
Execution: read-only Supabase queries  
Reproducible SQL: scripts/audits/institutional-aggregation-uppsc-payload-cluster-read-only.sql

## Findings

The institutional_aggregation cohort contains 4,002 Recruitments:
- 4,002 have enrichment_data.meta.verified = false.
- 536 are marked VERIFIED or MANUALLY_VERIFIED on the Recruitment row.
- 2,470 lack official_notification_url.
- 2,795 lack official_application_url.

## Exact repeated payload

A cluster of 1,220 rows shares the exact JSONB hash 5a74fdfd45727e6f51e7201868c3a329 and the same institution/reference text: “UPPSC Registrar, Assistant Architect, Reader, Professor, Inspector and Other Post Direct”.

All 1,220:
- Link to 251 distinct organisations across seven sectors.
- Share created_at 2026-10-21 13:46:58.259881+00.
- Share updated_at 2026-10-24 11:55:35.501751+00.
- Share meta.extraction_timestamp 2026-10-24T10:04:17.817498.
- Have meta.verified=false.
- Have no official notification URL, official application URL or valid canonical Post Leaf.
- 1,199 have no notification_date.
- 454 are nevertheless marked VERIFIED / MANUALLY_VERIFIED.
- 1,198 have status UPCOMING and 5 have status ACTIVE.

The 1,331 Recruitments created at the same timestamp are all institutional_aggregation records. They contain only six distinct enrichment payloads:
- UPPSC text: 1,220 rows across 251 organisations.
- MP HSTST: 51 rows, one organisation.
- Delhi Pollution Control Committee: 50 rows, one organisation.
- CBSE/KVS/NVS: 4 rows, one organisation.
- HLL Lifecare: 3 rows, one organisation.
- NCERT Non-Teaching: 3 rows, one organisation.

The other 111 rows have five distinct payloads and separate update timestamps. The 1,220 UPPSC rows alone were updated together at 11:55:35.501751 UTC.

## Sector distribution of the 1,220 rows

| Sector | Rows | Recruitment marked verified |
|---|---:|---:|
| PRIVATE | 788 | 254 |
| GOVERNMENT_CENTRAL | 192 | 73 |
| GOVERNMENT_STATE | 169 | 93 |
| PSU | 23 | 18 |
| RAILWAY | 19 | 6 |
| BANKING | 17 | 8 |
| DEFENCE | 12 | 2 |
| Total | 1,220 | 454 |

## Root-cause assessment

Established: one identical UPPSC institution/reference JSONB payload was applied to 1,220 different Recruitment IDs across 251 organisations in a single update-time batch. This is a batch-level payload reuse defect.

Not established: the exact writer, operator, import file or SQL statement. The affected records have no ingest-batch ID, source URL, official_link_source or metadata value in the sampled rows. The repository history inspected so far does not identify a writer transaction matching the 24 October 11:55 UTC update. Do not attribute this to a particular script without evidence.

## Safe disposition

1. Treat this repeated payload as cross-entity contaminated and unusable for all 1,220 records until each entity is independently reconciled.
2. Do not mass-change Recruitment verification statuses; the 454 status values need separate evidence review.
3. Do not create Post Leaves from the shared payload.
4. Preserve Recruitment IDs, slugs, organisation relationships and historical values.
5. Keep these Hubs out of index/sitemap eligibility until a valid canonical Post Leaf and page-quality gates pass. PR #216 addresses the no-valid-Post indexability rule but still requires deployment verification.
6. Add a writer-level guard requiring enrichment writes to be keyed to Recruitment ID and source capture/document ID. Reject shared payload assignment across unrelated organisations unless explicitly supported by the source.
7. Recover the import artefact or execution record for the 24 October update. If unavailable, record writer attribution as unknown.
8. Build an official-source review queue for all 1,220, resolving organisation identity and issuer URLs before Post decomposition.

## Limitations and safety

- All audit queries are read-only; no production values were changed.
- The repeated hash proves identical stored JSONB, not that every other Recruitment field is false.
- Do not generalise the 1,220-row finding to the remaining 2,782 institutional_aggregation records.
- This audit authorises no production updates, Post creation, redirects or publication changes.
