# FJA Inventory Pilot Runbook — Two-Table Contract

**Status:** Pilot-first. Full crawl remains blocked pending acceptance.  
**Workflow:** `.github/workflows/fja-jobs-inventory.yml`  
**Contract:** [Collection → Canonical Data → Verification → Structured Data](./JOBOYE_COLLECTION_CANONICAL_VERIFICATION_STRUCTURED_DATA_CONTRACT.md)

## Goal

Validate source discovery, extraction, database persistence, two-sheet workbook export, official-notification review, and an explicit promotion decision. This pilot does not publish into canonical JobOye entities. FJA is an internal discovery input; its identifiers and URLs must not appear in public canonical records, pages, APIs, sitemaps, or JSON-LD.

## Three-record pilot

1. UCSL Supervisor Recruitment 2026 — https://www.freejobalert.com/articles/ucsl-supervisor-recruitment-2026-apply-online-3071727
2. MDU Recruitment 2026 — https://www.freejobalert.com/articles/mdu-recruitment-2026-apply-online-for-7-field-investigator-research-assistant-and-more-posts-3071555
3. AAI Consultant Recruitment 2026 — https://www.freejobalert.com/articles/aai-consultant-recruitment-2026-apply-online-3071441

## Run steps

1. Open GitHub Actions → **FJA Jobs Inventory** → **Run workflow**, select **pilot**.
2. Confirm the repository Actions secret `DATABASE_URL` is configured.
3. Download the artifact. Inspect the workbook's two sheets—`Recruitments` and `Posts`—plus run JSON and source-capture artifacts.
4. Reconcile the three inventory rows, post candidates, source observations, capture hashes and run ID.
5. Compare each sample with its official notification. Keep the notification URL distinct from the application URL.
6. Record defects, correct the contract/extractor, then rerun to test idempotency and changed-content history.
7. Do not promote pilot discoveries into canonical JobOye entities during collection.

## Workbook contract

### Recruitments
One row per recruitment notice. Capture internal source identity and URL; title and organization; official notification and advertisement number; explicit recruitment total; recruitment-wide dates, application method/URL, location and summary fields; fee, selection, documents and milestones; source capture reference; extraction outcome; official-verification state; and unmapped content.

Source IDs/URLs are private ingestion metadata, not JobOye canonical identity or public data.

### Posts
One row per distinct post. Every `recruitment_key` must match a parent row. Capture post title, post-specific vacancies, qualification, experience, age limits/reference date/relaxations, salary amounts/currency/period/raw wording, employment type and tenure, location, duties, post-specific dates and instructions, evidence, verification state, and unmapped content.

Do not fabricate posts from ambiguous text. Mark unresolved candidates for review. Repeated dates, fee rules, selection stages and evidence may be stored as structured arrays or internal supporting records; the workbook still has only two main sheets.

## Review checklist

- Source identity, organization and advertisement number are correct.
- Every distinct post is represented and linked to the right recruitment; no cross-post leakage.
- Vacancy totals and post counts reconcile when the notice supports reconciliation; preserve reservation/backlog/PwBD breakdowns.
- Eligibility, experience, age/reference date/relaxations and compensation are role-specific and faithful to the evidence.
- Opening/closing dates, fee deadlines, interview/exam dates and age cutoffs are separate events with correct scope.
- Official notification and application URLs are distinct and manually validated.
- Source-reported, normalized and officially verified facts are distinguishable at field level; conflicts are preserved.
- Raw article content and raw official notification capture are stored separately; original HTML/PDF bytes are retained immutably.
- No FJA identifier, URL or branding leaks into public canonical fields, pages, APIs, sitemaps or structured data.
- JSON-LD is generated from approved canonical post records, matches visible content, and follows current Google JobPosting policies.
- Unchanged re-runs are idempotent; changed source content creates a new observation while preserving prior captures.

## Acceptance gates before full crawl

1. All three article pages fetch successfully with no unexplained failures.
2. Exactly two workbook sheets use the agreed headers.
3. Raw normalized content and immutable original source captures are available.
4. Post decomposition and parent relationships pass manual review.
5. Material facts are reviewed against official notices; conflicts and unknowns remain explicit.
6. Missing official notification blocks canonical promotion but does not drop inventory.
7. Workbook, database, observations and run artifacts reconcile.
8. Repeat and changed-content tests pass.
9. Public-provenance leakage and structured-data tests pass.
10. Product/architecture review approves the pilot before scaling.

## Known gaps

The exporter and crawler changes in this implementation branch target the exact two-sheet contract, add source-specific `fja_post_inventory` and `fja_source_captures` tables, preserve full page structure, and archive immutable HTML captures by content hash in both the database and workflow artifact. These changes still require review, migration application, a successful pilot run, and manual verification before they can be treated as operational. Post decomposition remains heuristic except where an explicit post-title table row is captured; dates and official-link detection still need manual validation. Raw official-notification capture and general-purpose field-level evidence records remain follow-up work. Daily scheduling remains disabled until sign-off.
