# JobOye Inventory-to-Canonical Schema Mapping Audit

**Status:** Repository inspection only; no schema or runtime changes in this document.  
**Reviewed against:** `src/db/schema.ts`, `src/components/job-posting/structured-data/job-posting-schema.tsx`, `src/components/job-posting/structured-data/post-leaf-schema.tsx`, `src/lib/structured-data.ts`.  
**Purpose:** Make the next implementation step concrete without assuming the existing canonical schema is a flat two-table model.

## 1. Core finding

The Excel import interface should have exactly two main sheets—`Recruitments` and `Posts`—but the existing canonical database is relational and already contains supporting tables for repeated and typed facts. The implementation must map workbook rows into those relationships rather than stuffing every field into two database rows.

The repository currently has three different representations that must not be conflated:

1. Legacy `postings` table, which includes scraped headline, postNames, legacy source fields, and older content fields.
2. Canonical `recruitments` and `posts` entities, with a recruitment parent and individual posts.
3. Internal FJA collection inventory, which is source-specific research data and must never publish directly into either canonical layer.

## 2. Current canonical destination map

| Workbook concept | Current canonical destination | Notes / guardrails |
|---|---|---|
| Recruitment identity/name/year | `recruitments.name`, `year`, `slug`, generated `id` | Canonical identity is JobOye-managed, not an external article ID |
| Organization | `recruitments.organization_id` | Resolve to an existing organization; do not create duplicates from name alone |
| Official notification number | `recruitments.official_notification_number` and/or `advertisement_number` | Preserve exact printed identifier; inspect semantics before deciding which field |
| Official notification URL | `recruitments.official_notification_url` / `notification_url` | Keep distinct from application URL; do not accept an aggregator URL as official |
| Official application URL | `recruitments.official_application_url` / `apply_url` | Store only after validating the issuing body's destination |
| Recruitment lifecycle dates | `recruitments.notification_date`, `application_start_date`, `application_end_date`, `exam_date`, `result_date` | Use timestamp type carefully; multiple independent milestones may need a supporting event model |
| Recruitment total vacancies | `recruitments.total_vacancies` | Populate only if the number's scope is clear; post totals and reservation breakdowns remain separate |
| Recruitment description | `recruitments.description` | Preserve complete useful context, not just a source headline |
| Recruitment fee rules | `recruitment_fees` | One row per applicable category/rule; retain exemption wording in `note` |
| Recruitment selection stages | `selection_processes` | Preserve ordered stages and detailed conditions; avoid flattening role-specific stages into shared recruitment rules |
| Post parent | `posts.recruitment_id` | Required relation; enforce that every imported post has exactly one parent |
| Post identity/title | `posts.name`, `posts.slug`, `posts.position_id` | Canonical post identity is distinct from the source's title-like phrase; resolve Position carefully |
| Post-specific vacancy total | `posts.vacancy_total` | Do not copy recruitment-wide totals into each post |
| Vacancy/reservation/location breakdown | `vacancies`, `posts.vacancy_details` | Use normalized vacancy rows where location/category detail is available; reconcile totals without forcing unlike scopes to sum |
| Post description/responsibilities | `posts.description`; assess `responsibilities` placement and rendering | Preserve substantive duties; do not bury key visible content in opaque JSON |
| Qualification/experience/eligibility | `eligibilities` | Use typed fields and `qualification_expr` when the rule can be normalized; retain full original prose and evidence |
| Age limits and reference date | `eligibilities.age_min`, `age_max`, `age_as_on_date` | Never infer unstated bounds or reference dates |
| Category-specific age relaxation | `post_age_rules` plus notes/conditions | Preserve category, condition, rule type and relaxation wording; don't reduce “as per rules” to arithmetic |
| Salary | `posts.salary_min`, `salary_max`, `pay_level` | Confirm how currency and period are represented before import; the shown canonical posts definition has no dedicated `salary_currency` or `salary_period` columns |
| Employment type | `recruitments.employment_type` and any post-level field supported by current canonical contract | The canonical `posts` definition shown does not expose a post-specific employment-type column; do not infer it from recruitment type |
| Extra structured page content | Existing `ExtraContent` / `extra_content` only where attached to the actual page entity | Use typed modules where available, but keep core queryable facts relational |
| Source captures and change history | `source_observations`, source-document/provenance tables, and a proposed immutable raw capture store | Keep FJA and official notification captures separate; do not leak discovery provenance publicly |
| Field-level verification | Existing eligibility verification fields plus a proposed consistent evidence/review model | Existing fields are not a complete general-purpose per-field verification system; audit before extending |

## 3. Schema gaps to resolve before migration

1. **Post-level pay semantics:** canonical `posts` exposes numeric salary min/max and `pay_level`, but this file does not show dedicated currency/period columns. Define and document the representation before loading pay values; do not assume `salary_min/max` alone are sufficient.
2. **Post-level employment type:** recruitment has employment type; canonical `posts` does not expose it in the reviewed definition. Decide whether this is needed at post level and add it only through a reviewed migration.
3. **Repeated milestones:** recruitment date columns cover several common milestones, but a notice may contain more event types, separate fee deadlines, interview dates, age cutoffs, or post-specific dates. Preserve these in an event model or versioned structured payload until a relational event model is approved.
4. **Raw source bytes:** the current inventory stores normalized text, but scale requires an immutable original HTML/PDF capture strategy with hash and capture metadata.
5. **Post inventory and review state:** add a separate internal `fja_post_inventory` model linked to `fja_job_inventory`; do not confuse it with canonical `posts`.
6. **Field-level evidence:** the existing eligibility table has source metadata, but a general fact/evidence/conflict model across pay, dates, vacancies, URLs and selection details still needs design.
7. **Unknown values vs defaults:** canonical fields with defaults (notably employment type) must not cause unknown source facts to be silently treated as known. Inventory preserves null/unknown; promotion must explicitly resolve the canonical value or document why the default is semantically correct.

## 4. Structured-data builder audit findings

The repository currently contains multiple JobPosting builders:

- `src/lib/structured-data.ts` — legacy posting-based builder with lifecycle and content-quality gates.
- `src/components/job-posting/structured-data/job-posting-schema.tsx` — resolver-based JobPosting + breadcrumbs.
- `src/components/job-posting/structured-data/post-leaf-schema.tsx` — canonical post-leaf JobPosting + breadcrumbs.

The post-leaf builder's current implementation contains assumptions that require review against the new contract:

- It emits `hiringOrganization` whenever an organization name is present, although its own comment says the organization verification flag is absent.
- It emits `jobLocation` with country `IN` for every post, even when city and state are missing or the role may be national/remote.
- It falls back from the official notification publication date to `postedAt` for `datePosted`; this needs an explicit policy decision and tests so an ingestion/listing date is not mistaken for the employer's publication date.
- It currently emits a JobPosting node from the resolved leaf component's input; the calling route and data contract need a test proving publication/verification eligibility is checked before rendering.
- The two component builders have overlapping but not identical rules for source URLs, employer verification, location and datePosted. Avoid editing only one and assuming the entire site is consistent.

These are audit findings from code inspection, not proof that every route currently exposes incorrect markup. Before changing behavior, map each builder to its call sites and rendered production route, then test the exact leaf-page HTML.

## 5. Next implementation order

1. Confirm this mapping against the live database schema/migrations and the actual canonical query/write paths.
2. Map the exact two-sheet headers to current columns or a documented JSON payload; mark true schema gaps explicitly.
3. Add the separate source-specific post inventory and immutable capture/evidence model through reviewed migrations.
4. Convert the exporter to the two-sheet contract and test import/export reconciliation.
5. Unify or explicitly delegate structured-data behavior to one authoritative leaf builder, with shared resolvers and route-level eligibility gates.
6. Add tests for source-provenance leakage, post/recruitment scope, unknown values, JobPosting eligibility, date semantics, salary units, location semantics and visible-content consistency.
7. Run and review the three-record pilot; do not scale or enable daily scheduling until all gates pass.
