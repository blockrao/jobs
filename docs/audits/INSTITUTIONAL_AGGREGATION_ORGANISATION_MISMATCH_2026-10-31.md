# Institutional Aggregation: Organisation Identity Mismatch Audit

Audit date: 31 October 2026  
Production project: cusxodjgkrttwmdmhvso  
Scope: 4,002 Recruitments where enrichment_data.meta.source = institutional_aggregation  
Execution: read-only Supabase SQL  
Reproducible query: scripts/audits/institutional-aggregation-organisation-mismatch-read-only.sql

## Summary

The deterministic distinctive-token comparison reproduced:

| Measure | Records |
|---|---:|
| Institutional aggregation cohort | 4,002 |
| Potential issuer/organisation mismatches | 51 |
| Already mapped to Unclassified Government Jobs | 45 |
| Conflicting but apparently resolved organisation | 6 |
| Resolved mismatches with valid canonical Post Leaves | 6 |
| Resolved mismatch rows marked VERIFIED / MANUALLY_VERIFIED | 0 |

The 45 placeholder records are already noindex under the unresolved-organisation rule. The six remaining records are not protected by that rule because their organisation IDs point to non-placeholder organisations.

## Six resolved-organisation conflicts

| Recruitment ID | Recruitment / issuer | Linked organisation | Valid Post Leaves |
|---:|---|---|---:|
| 668 | AIIMS Jodhpur Project Technical Support-III | AIIMS / Medical Institute | 1 |
| 947 | IIT Delhi Junior and Senior Project Assistant | Indian Institute of Information Technology Kota | 1 |
| 950 | IIT Delhi Project Scientist / Project Attendant | Indian Institute of Information Technology Kota | 2 |
| 951 | IIT Delhi Research Associate / Junior Project Assistant | Indian Institute of Information Technology Kota | 3 |
| 962 | IIT Indore Junior Research Fellow | Indian Institute of Information Technology Kota | 1 |
| 963 | IIT Indore Research Project Specialist | Indian Institute of Information Technology Kota | 1 |

All six are UNVERIFIED and have AGGREGATOR_DISCOVERED source-link provenance. Their official notification URLs point to IIT Delhi, IIT Indore or AIIMS Jodhpur domains, while the linked Organisation rows point to another institution or a generic AIIMS entity.

The six records have nine valid canonical Post Leaves in total. Because the organisation is not the unresolved placeholder, the current Post Leaf and Recruitment Hub indexability rules can treat these pages as indexable. This is the remaining publication risk.

## Existing placeholder candidates

Of the 51 candidates, 45 already use the Unclassified Government Jobs placeholder. These include the 42 One Stop Centre Sivasagar rows with unrelated notification destinations, the National Law University Delhi row and two rows in the repeated UPPSC payload cohort. The existing unresolved-organisation rule already keeps these pages out of the index and sitemap.

## Alias false-positive control

The audit also checked the Engineers India / EIL Associate Engineer rows. The heuristic does not flag the EIL Associate Engineer organisation because the issuer and organisation share the distinctive Engineer token. This is a useful alias control, not proof that the duplicate organisation records should remain separate.

## Heuristic and limitations

The SQL uses three text fields:

1. The issuer name in enrichment_data.institution.name.
2. The Recruitment title.
3. The linked Organisation name.

It removes generic institution/recruitment words, normalises simple plurals and checks whether a distinctive issuer token appears in the Recruitment title but not in the Organisation name.

A match is a **review candidate**, not an identity decision. It is used only to identify pages whose employer attribution may be unsafe. It must never automatically merge organisations, change organization_id, rewrite slugs, create redirects or modify canonical Post relationships.

The heuristic currently covers only the 4,002 institutional_aggregation cohort. The same audit must be expanded to all 6,365 source-origin Recruitments before this can be considered complete.

## Recommended disposition

1. Keep the six resolved-organisation conflicts noindex and suppress employer attribution until issuer/organisation relationships are reviewed.
2. Do not change the six organization_id values based only on this heuristic.
3. Verify each issuer directly and prepare a separate before/after organisation-mapping proposal with source evidence.
4. Preserve the 45 already-unresolved records in their current noindex state.
5. Extend the same read-only audit to all source-origin Recruitments.
6. Keep the official-link / JobPosting evidence gate in PR #221. All six records are aggregator-discovered and must not emit official CTAs or JobPosting markup until exact issuer evidence is accepted.

## Safety

This audit used SELECT-only queries. No production data, organisation mapping, canonical URL, Post relationship, verification state, page indexability or sitemap state was changed.
