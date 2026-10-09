# JKSSB Advertisement 08 of 2026 — unverified prototype

**Status: UNVERIFIED / research-only / not connected to production.**

This is a deliberately isolated example of how a recruitment hub and one Post leaf could be represented in JobOye's canonical entity model. It is not a production seed and must not be imported into Supabase as-is.

## Candidate canonical URL map

| Entity | Proposed URL | Meaning |
|---|---|---|
| Organization | `/organizations/jkssb` | JKSSB organization hub, only if no canonical organization already exists |
| Recruitment | `/jobs/jkssb-advertisement-08-of-2026` | Recruitment hub for Advertisement Notification No. 08 of 2026 |
| Post leaf | `/jobs/jkssb-advertisement-08-of-2026/horticulture-technician-grade-iv-srinagar` | This recruitment's Horticulture Technician Grade-IV post/location instance |
| Evergreen role/Position hub | `/posts/horticulture-technician-grade-iv` | Role discovery hub; reuse the existing canonical Position slug if one exists |

The paths above are **proposed examples only**. They will not resolve to this fixture until route integration and data matching are implemented. The repository's existing canonical contract uses `/jobs/[recruitment-slug]` for recruitment and `/jobs/[recruitment-slug]/[post-slug]` for the leaf. The old `/recruitments/[slug]` path redirects to `/jobs/[slug]`.

## Source boundaries

- The third-party article is discovery-only. It must not be treated as evidence that any fact is official, must not be published as a source link, and must not make the page indexable.
- The values copied into the fixture are unverified research leads. The recruitment total and department totals are included to illustrate the hub, but must be reconciled against the official notification before publication.
- The sample Post is item 105, Horticulture Technician Grade-IV, Srinagar. Its aggregator-reported 3 vacancies and category split are intentionally held back from the Post's operational vacancy fields until independently confirmed.
- Official notification and application URLs remain null. Do not invent them or use the JKSSB homepage as a substitute for the notification or application endpoint.
- The listed application window ends on 9 October 2026. Do not label the recruitment open or closed from this historical aggregator data. Check the official portal and any extension/corrigendum at review time.

## Proposed verification workflow

1. **Match before creating:** search the existing organization, recruitment, Position and Post records. Reuse canonical entities; never create duplicates because a name/slug search is inconclusive.
2. **Acquire official evidence:** obtain the official notification PDF and official application notice/portal, plus every corrigendum, extension or cancellation notice relevant to the recruitment. Record source URL, retrieval timestamp, document title/number/date, content hash, and reviewer.
3. **Extract into a staging ledger:** each material fact must have entity scope, proposed value, source document ID, page/table/paragraph reference, short excerpt, and status. Keep third-party leads in a separate provenance class.
4. **Reconcile totals:** notification recruitment total must reconcile with department totals; post item counts and category breakdowns must reconcile with the original tables. Do not fill Post vacancy totals with the Recruitment total.
5. **Review field by field:** set a field to `VERIFIED` only when an official source supports that exact value and the reviewer records evidence. Use `CONFLICT`, `NOT_STATED`, `UNVERIFIED` or `NOT_APPLICABLE` as appropriate; blank is not zero.
6. **Second-person approval:** a reviewer other than the extractor approves critical identity, vacancy, eligibility, dates, fees, salary/pay level, selection process and application links. Resolve all conflicts or omit the disputed field.
7. **Import dry run:** map only approved fields to existing organization/recruitment/post/enrichment schema. Run duplicate checks and a read-only comparison against existing records. Produce a diff for review; no automatic production writes.
8. **Publish gate:** only after approval, route/data validation, canonical and redirect checks, structured-data parity, and route tests may the entry be proposed for publication/indexing. Keep the unverified preview noindex and clearly labelled.
9. **Post-publication monitoring:** retain evidence history and review dates; recheck application status and official corrigenda before representing a deadline as current.

## Required status semantics

- `UNVERIFIED`: source lead exists but has not been reviewed against official documentation.
- `IN_REVIEW`: official evidence collected; field-by-field reconciliation is underway.
- `CONFLICT`: official sources conflict or source scope is ambiguous.
- `VERIFIED`: official evidence and reviewer approval recorded for that exact field.
- `NOT_STATED`: checked official source does not state the field.
- `SUPERSEDED`: a later official notice replaces the prior fact.

**Do not treat verification as one blanket boolean for the whole page.** Track verification at field/evidence level, then derive page readiness from critical fields. A recruitment can have verified identity and total while individual Post eligibility fields remain unverified.

## Files

- `jkssb-advertisement-08-2026.unverified.json` — sample staging record and candidate URL map.
