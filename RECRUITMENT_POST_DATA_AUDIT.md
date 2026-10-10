# Recruitment and Post Data-to-UI Audit

**Audit date:** 2026-10-11  
**Scope:** Candidate-facing Recruitment hubs, canonical Post Leaves, legacy Posting pages, database field ownership and source-link hygiene.  
**Status:** Initial audit completed; remediation and deployed verification remain open.

## Product contract

- Recruitment hub describes one time-bounded hiring exercise and links to its Post Leaves.
- Post Leaf describes one normalized role within a Recruitment.
- Position hub is the evergreen role-discovery destination.
- Internal provenance, extraction confidence, raw captures, source URLs, database IDs and unverified secondary-source claims are not candidate-facing facts.
- Missing facts must be omitted or clearly labelled as unavailable. Never infer official confirmation, invent a deadline, or sum Post vacancies to fabricate a Recruitment total.
- Only resolver-approved official notification/application URLs may appear on Recruitment and Post UI. Legacy public links must pass the aggregator URL filter.

## Candidate-facing field map

| Fact | Primary owner | Display on | Fallback / rule | Empty or uncertain state |
|---|---|---|---|---|
| Recruitment name, year, status | recruitments | Recruitment hub; contextual breadcrumb on Post Leaf | Status should use the canonical lifecycle/status resolver | Show known status; do not infer from source text |
| Employer / organization | recruitments.organization_id → organizations | Recruitment hub and Post Leaf | Canonical organization relation; don't derive employer from a scraped title | Omit organization link if no valid slug |
| Exam / commission | recruitments.exam_id → exams | Recruitment hub when linked | Only show a correctly linked exam | Omit if no relation |
| Official notification / advertisement number | recruitments.official_notification_number, advertisement_number | Recruitment hub; relevant Post context | Prefer explicit official identifier; do not substitute internal IDs | Omit if unknown |
| Recruitment-wide vacancy total | recruitments.total_vacancies | Recruitment hub | Use Recruitment-owned total only; never sum Post totals | Show no total if unknown |
| Post vacancy count / category breakdown | posts.vacancy_total, vacancy_details; post_enrichments.vacanciesTotal, vacanciesByCategory; vacancies if populated | Post Leaf | Prefer verified Post-owned values; normalize/fallback only under documented resolver precedence | Distinguish unknown from zero |
| Notification, open, closing, exam and result dates | recruitments for Recruitment dates; posts.key_dates, Posting fields and post_enrichments for Post-specific dates | Recruitment hub / Post Leaf according to ownership | Explicit Post-specific date first for Post-specific events; preserve source/confidence state internally | No guessed dates; conflicting dates require review |
| Application fee | recruitment_fees or Post-level fee fields / post_enrichments.feesByCategory | Recruitment hub for shared fee; Post Leaf for role-specific fee | Use normalized rows first when populated, then documented legacy fields; do not show a Recruitment fee as Post-specific if it differs | Say “Not specified” only where UI semantics warrant it; do not assume free |
| Selection process | selection_processes, recruitments.selection_process, or post_enrichments.selectionProcess | Recruitment hub for common stages; Post Leaf for role-specific stages | Prefer structured normalized steps, then safe legacy fallback; avoid duplicates | Omit if not known |
| Age limits / relaxation / reference date | eligibilities, post_enrichments.ageRulesByCategory, ageNote, ageRelaxationRules, Post fields | Post Leaf | Keep category-specific limits and reference date together; never flatten conflicting categories into one range | Explicitly identify unknown reference date |
| Education / qualifications / marks / disciplines | eligibilities, post_enrichments.eligibilityPathways, education, Post legacy eligibility | Post Leaf | Preserve OR/AND pathways and minimum-vs-preferred distinctions; don't invent thresholds | Mark unresolved eligibility for review rather than simplifying incorrectly |
| Experience / skills / physical / domicile requirements | eligibilities, post_enrichments.experience, skills_required, legacy Post fields | Post Leaf | Use role-owned data and explicit requirement labels | Omit unsupported claims |
| Salary / pay level / duration | posts.salary_min/max, pay_level, post_enrichments.salaryMin/Max, payScale, payLevel, salary notes | Post Leaf | Prefer structured pay values and retain units, currency and period | No invented salary or inferred pay band |
| Duties / responsibilities / documents | post_enrichments.duties, responsibilities, documentsRequired; legacy Post fields | Post Leaf | Deduplicate and render readable lists | Omit empty sections |
| Official notification / application links | Resolver-approved official_notification_url, official_application_url, Post official URL fields | Recruitment hub and Post Leaf | Only authoritative/approved URL resolvers; legacy flat Posting links must pass publicLink() | Hide link if resolver rejects it; never relabel a discovery-source link as official |
| Provenance, raw source, confidence, extraction coverage, source IDs | sources, source_documents, inventory and metadata fields | Internal tooling only | Retain for auditing and reconciliation | Never render raw values in public UI |

## Initial production database evidence

These counts are the audit snapshot and must be refreshed before launch:

- 1,087 Recruitment rows and 1,553 canonical Post rows.
- 1,453 Posts had a vacancy total in the earlier coverage query; the normalized vacancies table had zero rows.
- 128 Posts had salary/pay populated in the earlier query.
- Only 9 Post records had normalized eligibilities rows.
- Only 2 Recruitment records had normalized fee rows and 2 had normalized selection-process rows.
- 572 Posts had post_enrichments records in the earlier query.
- The initial source inventory pilot contained 3 Recruitments and 8 Post candidates, all partial; immutable source-capture rows were absent before the extractor-wiring work.
- Current whole-row source-name scan: posts 0 matches; recruitments 11; legacy postings 1; articles 0; organizations 0; exams 0; post_enrichments 0; fja_post_inventory 8; source_documents 24; sources 1. Matches in source/provenance columns are intentionally retained internally and must never be rendered to candidates.
- A separate field-level check showed the remaining Recruitment matches in source_url and metadata; the one legacy Posting match was in source, source_portals, and source_url. Public legacy link rendering must keep using the aggregator-blocking URL helper.

These counts do not imply that facts are missing everywhere: some may exist in legacy fields or enrichment JSON. The required next step is a field-by-field reconciliation, not a blind backfill.

## Known data-quality risks

1. **Sparse normalized child tables.** Vacancy, fee, selection and eligibility data often remain in legacy columns or enrichment JSON. The UI must use a documented resolver/fallback order until normalized rows are backfilled and reconciled.
2. **Potential entity-boundary contamination.** Earlier pilot records included mismatches between source article and canonical Recruitment/Organization identity. Confirm every Recruitment → Post → Position → Organization relationship before promoting facts.
3. **Conflicting dates and counts.** Preserve conflict evidence internally, use verified official evidence for public display, and route unresolved conflicts to review.
4. **Unverified source URLs.** Keep them as internal evidence; only authoritative resolver-approved URLs may be published.
5. **Hindi parity.** Locale-aware links exist in the UI branch, but localized content, metadata, canonical, noindex and hreflang policy require separate verification. Do not imply that /hi is fully translated merely because the route renders.

## Required audit and repair procedure

1. Export a read-only coverage report by field, Recruitment, Post and source confidence.
2. For each displayed fact, record its source column/table, resolver precedence, ownership, UI section, verification status and fallback behavior.
3. Compare a stratified sample of Recruitment hubs and Post Leaves against official notifications, including multi-Post Recruitments, single-Post Recruitments, closed notices, date conflicts and records with incomplete data.
4. Generate a dry-run reconciliation for missing/duplicate Post rows, orphan relationships, stale slugs, wrong organization links and missing official references.
5. Review and approve changes before writing canonical tables; retain raw source captures and a rollback/export.
6. After writes, rerun orphan/duplicate/coverage checks and sample public pages for the corrected facts.
7. Validate all public outbound URLs and scan rendered HTML, metadata, JSON-LD, breadcrumbs and link destinations for aggregator branding or domains.

## Release exit criteria

- [ ] No public source inventory / raw database panels.
- [ ] No aggregator name/domain or discovery-source URL in public text, metadata, JSON-LD, or outbound links.
- [ ] Recruitment hub and Post Leaf field matrix reviewed and implemented.
- [ ] Conflicting, missing and wrong-entity facts are classified; no invented facts are displayed.
- [ ] High-risk field resolvers have contract tests.
- [ ] Canonical Post Leaves, Recruitment hub indexability/canonical policy, redirects and sitemap are verified.
- [ ] CI results are checked on the exact release commit; baseline lint debt is distinguished from regressions without weakening lint rules.
- [ ] Production smoke test confirms rendered HTML and outbound links after a successful deployment.
