# JobOye / FreeJobAlert Inventory Data Contract v1

**Status:** Design contract for the FJA inventory pilot; schema and extractor changes require separate review.  
**Purpose:** Capture FJA recruitment listings comprehensively, normalize consistently, preserve evidence, and keep manual verification/enrichment separate from extraction and publication.

## 1. Principles adopted from the prior JobOye ingestion discussion

1. **Capture first, verify separately.** Populate every field supported by the source. A database NULL is not a reason to omit a source-supported value from the inventory.
2. **Official notification is mandatory for canonical ingestion.** If the actual official government/institution/organization notification URL cannot be found and captured, do not promote the listing into canonical JobOye recruitment/post records. Still retain it in the research inventory, flagged as not eligible for canonical ingestion until the official source is found.
3. **Keep source, normalized facts, verification, and generated content separate.** Raw FJA content is preserved; official notification content is separately captured; normalized values are derived with traceable evidence; manually verified facts and AI-enriched/rephrased content are separate layers.
4. **Recruitment and Post are different entities.** One recruitment can have multiple posts, each with its own vacancies, eligibility, age, pay, location and deadline. Do not collapse post-level facts into a single recruitment row.
5. **No extraction-confidence field.** Manual verification and the enrichment process are the quality-control steps. Use extraction status to report process outcomes, not subjective confidence.
6. **Preserve unmapped source content.** Keep job descriptions, responsibilities, institution/about sections, eligibility prose, application instructions, FAQs, headings, links, tables and any other substantive content even if no current database column maps to it.
7. **Do not infer missing facts.** Leave unknown values empty, record NOT_FOUND/PARTIAL/NEEDS_REVIEW where appropriate, and retain source evidence.
8. **Do not write FJA discoveries directly into canonical JobOye records.** Inventory is a discovery/audit layer; official-source verification and publication gates remain separate.

## 2. Standard formats

### Salary
- Store numeric amounts without currency symbols, commas or prose.
- Currency code: `INR`.
- Period enum: `MONTH` or `YEAR` for v1 (extend only if a real source requirement appears).
- Keep `salary_min` and `salary_max` numeric and nullable.
- Preserve original salary wording in a note/raw evidence field.
- Do not convert monthly to annual or vice versa unless a documented rule explicitly requires it.
- For a fixed single salary, follow the canonical schema's documented meaning for min/max; do not silently duplicate the amount into both fields.

### Age
- Store `age_limit_min` and `age_limit_max` as numeric years, nullable.
- Store the age-calculation/reference date separately when explicitly stated.
- Preserve original wording in `age_note` and category-wise relaxation wording in a dedicated note/structured representation.
- Do not infer a minimum age of zero or an unstated reference date.

### Dates, counts and controlled values
- Dates: ISO 8601 `YYYY-MM-DD`.
- Timestamps: ISO 8601 with timezone offset.
- Vacancy counts: integers.
- Currency: ISO code `INR`.
- Verification status: controlled enum aligned to the actual schema (conceptually PENDING, VERIFIED, UNVERIFIABLE; reconcile allowed values before implementation).
- Employment arrangement and working schedule are different concepts. Contract-based work can also be full-time; do not overload one field if the model needs both.

## 3. Excel workbook design

### Sheet A — Recruitment Inventory
One row per unique FJA recruitment article:
- source slug, FJA external/article ID, FJA URL, source title, organization name
- article published/updated timestamps where available (distinguish these from official notification date)
- official notification number/advertisement number exactly as source-stated; record which source supplied it
- recruitment type and application mode when explicit
- explicit recruitment-level total vacancies, plus a note on how the total was derived if derived
- summary fields for dates only as convenience; authoritative individual events belong in Dates & Milestones
- FJA source status, extraction status, first/last seen, crawl run ID, content hash
- official notification URL and official application URL in separate fields
- canonical-ingestion eligibility gate and reason (e.g. WAITING_FOR_OFFICIAL_NOTIFICATION, READY_FOR_MANUAL_VERIFICATION, DO_NOT_PROMOTE)

### Sheet B — Post Details
One row per distinct post/role in the recruitment:
- parent FJA external ID and stable post key
- raw and normalized post name
- vacancy count and raw category/PwBD/backlog breakdown
- essential and desirable qualification (raw text preserved)
- experience requirement
- numeric minimum/maximum age, reference date, raw age wording and relaxation rules
- numeric salary min/max, currency, period, pay level/grade and raw pay wording
- location, employment arrangement, work schedule, tenure/duration when stated
- post-specific deadline
- job description, duties/responsibilities and required skills only when source-supported
- evidence text/source section and extraction status

### Sheet C — Dates & Milestones
One row per date event, rather than a single flattened start/end pair:
- parent recruitment ID; post key when applicable
- event type as stated/normalized (notification, application start, deadline, fee deadline, correction window, exam/interview, age cutoff)
- start/end date, time and timezone when available
- scope (all posts, named post, category, etc.)
- raw source wording and evidence status

### Sheet D — Application & Selection
One row per fee/rule/instruction/stage:
- parent recruitment ID; post key when applicable
- record type: fee, exemption, application method, instruction, selection stage, document, eligibility condition, other
- category/scope, amount and currency if a fee, stage order, raw value and evidence
- application checklist and exact step-by-step instructions where provided

### Sheet E — Source Content & Field Evidence
Preserve complete source content and make field mappings auditable:
- parent ID, optional post key, field path, extracted/normalized value
- exact source URL and source section/table/heading
- supporting snippet/raw table row and extraction method
- status: EXTRACTED, PARTIAL, NOT_FOUND, FAILED, NEEDS_REVIEW
- official-source verification status is separate from extraction status
- unmapped fields/content collection for review
- raw FJA content and raw official notification content remain separate, immutable captures

Capture job descriptions, institutional background, FAQs, instructions, responsibilities, eligibility, dates, all links, original headings and source tables. Later AI rephrasing/enrichment must be stored separately from source text.

### Sheet F — Run Summary
Record run ID, start/end timestamps, seed pages, listing pages visited, sitemap URLs, discovered article URLs, unique IDs, detail pages fetched, duplicates, non-recruitment pages skipped, failed listing/detail URLs, extracted/partial/failed/needs-review counts, unvisited queue, crawl limitations and overall outcome.

## 4. Source-of-truth and ingestion gates

- FJA content is source-reported, not automatically official-source verified.
- Capture the official notification URL and the notification content when available; also capture the official application URL separately.
- If the official notification URL is missing, retain the item in the FJA research inventory but block canonical JobOye ingestion.
- Verification records whether facts were checked against the official source; extraction status only describes the capture process.
- Preserve disagreements between FJA and the official document as reviewable conflicts; do not silently overwrite evidence.
- Canonical schema mapping must be checked against actual Drizzle/Postgres fields and enum constraints before any live schema changes.

## 5. Pilot acceptance criteria

Use three contrasting FJA pages: multi-post recruitment, research/role-specific recruitment, and a recruitment with different deadlines or compensation arrangements.

1. Stable and unique source URL/external ID.
2. Recruitment fields and post-level fields are separated correctly.
3. Every distinct post creates its own Post Details row.
4. Different dates/deadlines remain separate events.
5. Every source-supported field is captured, including fields without a current database mapping.
6. Salary, age, date, currency, vacancy and controlled values follow the standard formats above.
7. Every populated normalized value can be traced to source evidence.
8. Missing values are not guessed.
9. FJA facts and official-notification facts remain distinguishable.
10. The inventory can retain a listing while correctly blocking canonical ingestion when the mandatory official notification URL is unavailable.
11. Explicit source totals are reconciled with post-level totals when comparable; differences are flagged.
12. Crawl limitations and failures are visible; a capped or partial crawl is never labelled complete.
13. No record is automatically published to canonical JobOye recruitment/post pages as a side effect of inventory capture.
