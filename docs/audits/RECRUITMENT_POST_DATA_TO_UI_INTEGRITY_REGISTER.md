# Recruitment and Post Data-to-UI Integrity Register

**Status:** Initial audit / baseline inventory  
**Scope:** Recruitment Hub and Post Leaf data fidelity  
**Principle:** Values already stored in the database should render on the appropriate page when populated. Missing values must not be invented. This register records column population, not semantic validity.

## Operating rules

1. Trace each field from database column → query → transformation/resolver → component props → rendered UI.
2. Keep Recruitment-level facts on the Recruitment Hub and Post-specific facts on the Post Leaf, with concise summaries on the Hub where useful.
3. Do not infer a recruitment-wide vacancy total by summing Post records. Prefer an explicitly stored recruitment total; show Post-level totals only from an appropriate explicit field or a documented, reliable vacancy breakdown.
4. Do not treat a non-null value as proof of correctness. Validate its meaning, entity ownership, and source before presenting it.
5. Missing values should be omitted or clearly represented as unavailable, not fabricated.
6. Keep UI fallbacks separate from Schema.org/JSON-LD resolution contracts unless that contract is deliberately reviewed and tested.

## Initial production column-population baseline

Read-only aggregate queries against the production database reported:

### Recruitment table

| Field | Populated rows | Total rows | Initial interpretation |
|---|---:|---:|---|
| total_vacancies | 16 | 1,083 | Recruitment-level vacancy totals are sparse; do not substitute a sum of Post totals. |
| official_notification_url | 794 | 1,083 | Strong candidate for direct UI rendering when resolver output is absent. |
| official_application_url | 126 | 1,083 | Candidate for direct UI rendering. |
| apply_url | 10 | 1,083 | Secondary application-link fallback; validate label and precedence. |
| notification_date | 13 | 1,083 | Very sparse; investigate whether data is stored in another field or genuinely missing. |
| application_start_date | 124 | 1,083 | Candidate for timeline/snapshot display. |
| application_end_date | 687 | 1,083 | Candidate for deadline display; verify date semantics and timezone formatting. |
| selection_process | 12 | 1,083 | Candidate for display; do not infer from other fields. |

### Posts table

| Field | Populated rows | Total rows | Initial interpretation |
|---|---:|---:|---|
| vacancy_total | 1,443 | 1,543 | High-priority trace: Post Leaf and Recruitment Hub card currently use resolver-dependent display in relevant code. |
| salary_min | 103 | 1,543 | Trace to Post Leaf salary presentation. |
| salary_max | 102 | 1,543 | Trace to Post Leaf salary presentation; verify min/max consistency. |
| description | 9 | 1,543 | Very sparse in this column; check if canonical content is in a related enrichment/content table before concluding it is missing. |
| officialSourceUrl | 51 | 1,543 | Trace to correct notification/source link UI. |
| applyPortalUrl | 21 | 1,543 | Trace to application CTA. |
| application_url | 20 | 1,543 | Trace to application CTA; clarify precedence among overlapping URL fields. |
| application_method | 1 | 1,543 | Very sparse; check alternate authoritative fields, do not infer. |
| application_checklist | 1 | 1,543 | Very sparse; check alternate content tables before concluding absent. |
| key_dates | 1 | 1,543 | Very sparse; check alternate date sources before concluding absent. |

**Important:** These are raw column-population counts, not a statement that the values are correct, current, or all expected to be populated. The Posts schema contains both snake_case and camelCase columns, so the audit must confirm which columns are canonical and which are legacy/compatibility fields.

## Initial confirmed code-level lead

In `src/components/recruitment/recruitment-hub.tsx`, the Post-card vacancy display checks `post.resolvedVacancyCount`. The shared query in `src/db/operations/get-recruitments.ts` loads Post rows and their vacancy rows, and the schema defines `posts.vacancy_total`. This is a likely data-path gap to investigate: a populated stored Post total may be available without a non-null resolver result. Confirm the canonical field semantics and trace the Post Leaf before implementing a fallback.

The Recruitment Hub already has fallback variables for stored recruitment values:
- `resolvedTotalVacancies ?? recruitment.totalVacancies`
- `resolvedApplicationUrl ?? recruitment.officialApplicationUrl ?? recruitment.applyUrl`
- `resolvedOfficialSource ?? recruitment.officialNotificationUrl`
- `resolvedSelectionProcess ?? recruitment.selectionProcess`

Do not assume this proves all page paths are fixed. Confirm the live route passes these raw fields and inspect all consuming components.

## Discrepancy register

| ID | Priority | Entity / field | Evidence so far | Next check | Acceptance criteria | Status |
|---|---|---|---|---|---|---|
| DUI-001 | P0 | Post vacancy total | 1,443/1,543 Post rows have `vacancy_total`; Hub cards use `resolvedVacancyCount`. | Trace query mapping and Post Leaf display; compare representative DB rows with live UI. | Correct stored Post total displays in Post Leaf and Hub summary; no invented recruitment total. | Open |
| DUI-002 | P0 | Recruitment vacancy total | 16/1,083 recruitment rows have `total_vacancies`. | Check BPSC and other reported cases; determine whether missing is genuinely unknown or stored in another recruitment-owned field. | Explicit recruitment total appears where populated; missing total is not inferred by summing Posts. | Open |
| DUI-003 | P0 | Notification/application URLs | 794 notification URLs, 126 official application URLs, 10 apply URLs populated. IIM Nagpur Recruitment 923 has both official URLs in production, but the resolver's domain allowlist excludes `.ac.in` and `.samarth.edu.in`; the Leaf Official Sources section also only read Post-owned URL fields. | PR #7 proposes resolver allowlist and Leaf source-section fixes. Verify official ownership of the exact Samarth destination, CI, deployed CTA + source links, and URL labels across Hub/Leaf. | Correct link and label render whenever the appropriate stored field exists; no URL-purpose substitution. | In progress — code fix proposed, awaiting review/CI/live verification |
| DUI-004 | P0 | Application deadline and dates | 687 end dates, 124 start dates, 13 notification dates populated. | Trace all page date sources, timezone formatting, and status/deadline logic. | Dates are consistent across Hub and Leaf; no date invented or shifted. | Open |
| DUI-005 | P1 | Salary | 103 salary minima and 102 maxima populated. | Find Post Leaf UI and ensure null/partial ranges are handled. | Populated values display with correct units/range; partial data is not misrepresented. | Open |
| DUI-006 | P1 | Post description | Only 9 Posts have a non-empty `description` in this column. | Inspect enrichment/content tables and page rendering before diagnosing content absence. | Correct Post-owned description appears where stored in the canonical source. | Open |
| DUI-007 | P1 | Application method/checklist/key dates | These columns have 1 populated row each. | Inspect related tables and legacy columns for canonical equivalents. | Correct data source and page owner documented; no inferred application instructions. | Open |
| DUI-008 | P1 | Organization website | Reported recent backfill needs count/quality verification. | Recount non-empty values; validate domain-to-organization mapping and organization structured data. | Values match the organization, and structured-data behavior is verified independently. | Open |
| DUI-009 | P1 | Selection process | 12 recruitment rows populated. | Trace Hub and Leaf ownership and resolver fallback. | Stored value renders on the appropriate recruitment page when present. | Open |
| DUI-010 | P1 | Qualification/eligibility | Eligibility rows are fetched by shared recruitment query. | Trace eligibility relation, per-Post ownership, and leaf display; check cross-Post leakage. | Eligibility is attached to the correct Post only and shown when data exists. | Open |

## Gate 1 — IIM Nagpur URL trace (2026-10-09)

Read-only production query for Recruitment 923 (`indian-institute-of-management-nagpur-2026-01`) returned:
- `official_notification_url`: `https://www.iimnagpur.ac.in/junior-executive-regular-obc-2/`
- `official_application_url`: `https://iimnagpurnt.samarth.edu.in/index.php/site/login`
- `official_link_source`: `AGGREGATOR_DISCOVERED`
- `application_end_date`: `2026-10-10 00:00:00+00`
- `application_start_date`, `notification_date`, `selection_process`, and recruitment total vacancies: null.

Code trace found:
- The Post Leaf route calls `resolveRecruitmentApplicationUrl(recruitmentData.recruitment)` and passes the result into `JobPostingPage`.
- The resolver accepts only `.gov.in` and `.nic.in` domains, so the stored IIM Nagpur institution domain and Samarth portal URL resolve to null.
- The top-level action buttons and How to Apply section already consume the resolved Recruitment application URL, but the Official Sources section reads only `post.officialSourceUrl` and `post.applyPortalUrl`, omitting Recruitment-owned URLs.
- Draft PR #7 proposes the resolver and Official Sources fixes. Because the application URL provenance is currently `AGGREGATOR_DISCOVERED`, confirm the exact portal destination against the institution's official link before considering the source provenance verified. CI and live behavior remain unverified.

## Gate 1B — Post vacancy count conflict (2026-10-09)

Read-only production query confirmed a concrete contradiction for Post ID 2, Assistant Legislative Counsel:
- `posts.vacancy_total`: 8
- `recruitments.total_vacancies`: 8
- `post_enrichments.vacanciesTotal`: 33
- `post_enrichments.vacanciesByCategory`: SC 4 + ST 3 + OBC 8 + General 18 = 33
- Enrichment status/confidence: `VERIFIED` / 85
- Post and Recruitment both reference the same UPSC Advertisement No. 12/2026 notification URL.

The agreement between Post and Recruitment totals does not independently prove the Post count, but the conflicting enrichment value must not win solely because its verification flag and confidence threshold pass. The category sum confirms the enrichment is internally arithmetical; it does not establish that 33 belongs to this Post.

**Proposed code safeguard:** if both Post-level candidate counts are populated, positive, and disagree, `resolvePostVacancy()` returns `null` pending source-based reconciliation. It does not silently prefer either count. A focused resolver contract test covers this case, pending CI execution and review.

DUI-001 remains open until the code change is reviewed, CI passes, and affected page/structured-data outputs are verified. No production data was changed.

## Required verification matrix

For every P0 fix, test at least:
1. Field populated directly on the recruitment record.
2. Field populated on the Post record.
3. Field available only through related rows (e.g. vacancy breakdown).
4. Field missing.
5. Conflicting or duplicate candidate fields, where precedence must be explicit.
6. Two Posts under one Recruitment, to ensure Post facts do not leak between them.
7. Live route rendering, link destination, canonical/noindex, and Schema.org output where relevant.

## Change-control rules

- Audit queries are read-only. No production data updates are authorized by this document.
- Implement UI/query fixes in focused PRs with regression tests.
- Do not weaken existing tests to make the PR pass.
- Do not merge or deploy based solely on an agent's narrative; require diff review, CI evidence, and appropriate live verification.
- Escalate contradictory source data, uncertain field semantics, schema changes, destructive cleanup, and production writes.

## Next actions

1. Trace `vacancy_total` from DB through the Post Leaf and Hub card rendering.
2. Verify the reported BPSC vacancy case against its actual stored row and live UI.
3. Verify the IIM Nagpur Recruitment Hub URL/date behavior shown in the screenshot.
4. Trace duplicate URL/date fields and document a single display precedence per semantic purpose.
5. Continue the register only after the P0 paths are tested.
