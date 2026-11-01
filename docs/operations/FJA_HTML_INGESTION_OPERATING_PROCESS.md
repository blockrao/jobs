# JobOye FJA HTML-Only Ingestion Operating Process

**Status:** Proposed operating standard — pilot and end-to-end acceptance required before production activation  
**Owner:** JobOye Product Manager and Internet Architect  
**Applies to:** One-time historical/backlog ingestion and recurring daily discovery/ingestion  
**Source policy:** FreeJobAlert (FJA) public HTML listing and article pages only  
**Explicit exclusion:** Official notification PDFs and all PDF extraction/crawling are out of scope until separately authorised.

## 1. Purpose and outcome

Establish one repeatable, auditable process that discovers every in-scope FJA listing URL, extracts recruitment information from its FJA HTML article, safely creates or updates JobOye's canonical entities, and verifies that the resulting canonical pages are actually available on JobOye.

A record is **not successfully ingested** merely because it was discovered, parsed, exported, or inserted into a database. Success means the expected canonical Recruitment Hub and at least one linked Post Leaf exist, the public data path can retrieve them, the pages render correctly, and the publication/indexability decision is explicit.

The product outcome is fresh, useful and trustworthy JobOye job pages. URL volume and database row counts are not success metrics.

## 2. Binding source decision

For this process, FJA HTML is the sole extraction source.

Allowed:
- FJA public listing/update HTML pages for discovery.
- FJA article/detail HTML pages for extraction.
- Links and facts visibly present in those FJA HTML pages.
- Raw FJA HTML snapshots, retrieval timestamps and SHA-256 hashes for provenance and reprocessing.

Not allowed in this workflow:
- Fetching, downloading, opening, parsing, OCR-ing or extracting facts from official notification PDFs.
- Crawling official websites or application portals to enrich or verify facts.
- Using a PDF parser as a fallback when HTML extraction is incomplete.
- Filling missing values from search snippets, other aggregators or inferred assumptions.

An external URL found in FJA HTML is an **external URL candidate**. Its presence does not by itself prove that it is official, valid, current, reachable or the correct application destination. Preserve its exact source anchor text, URL and host. Do not label it verified or imply independent official-source verification. Any future official-source verification workflow must be separately approved and must not silently change this HTML-only extraction rule.

## 3. Canonical data contract

JobOye's canonical entity and URL contract remains binding:
- Recruitment Hub: `/jobs/{recruitment-slug}`
- Individual Post Leaf: `/jobs/{recruitment-slug}/{post-slug}`
- `recruitments` owns recruitment-level facts.
- `posts` is canonical for individual post facts.
- Legacy/inferred `postings` must not be used as the canonical write destination.

Every accepted recruitment must have at least one correctly linked canonical Post Leaf. A multi-post FJA article should create or reconcile distinct post candidates where the HTML supports them. Do not flatten distinct posts into a single generic post or copy recruitment-level facts into post-level fields without evidence.

Before any implementation, inspect the current schema, database constraints, existing writer code, public query functions, page routes, lifecycle rules and publication/indexability gates. Do not assume an enrichment JSON shape is insertable into production tables.

## 4. Two operating modes

### A. One-time historical/backlog reconciliation

1. Establish the agreed FJA listing corpus and date range. Enumerate all listing URLs discovered in that corpus; do not claim complete FJA-site coverage unless the crawl demonstrably reaches the agreed cutoff.
2. Deduplicate listing URLs after safe URL normalisation while retaining the original URL.
3. Fetch each in-scope FJA article HTML within the permitted crawl rate and retain raw HTML, final URL, retrieval time and content hash.
4. Extract and stage every listing, including records with incomplete data or extraction errors.
5. Reconcile against existing FJA source URLs and canonical Recruitment/Post entities before writing.
6. Classify each listing as eligible-new, already represented, changed-existing, review-required, extraction-error or out-of-scope, with a reason.
7. Pilot and approve the writer before any bulk production writes.
8. Process eligible records in bounded batches with per-record outcomes and safe retry behaviour.
9. Reconcile all discovered URLs against final database entities and public canonical pages. Publish a complete exception list.

The historical backlog is not complete until every discovered in-scope URL has a terminal, explained outcome. Uncaptured listings, failed fetches and review-required records remain visible in the report; they are never silently discarded.

### B. Daily incremental process

1. Run once daily at a fixed agreed time, initially proposed as **02:00 India Standard Time** (20:30 UTC on the preceding day).
2. Discover new and changed rows from the FJA listing/update pages, using a persisted successful crawl watermark plus an overlap window to catch late additions and edits.
3. Fetch only unseen or changed FJA article URLs; compare content hashes to detect article changes.
4. Extract and stage HTML-only data using the same parser and normalisation contract as the backlog process.
5. Reconcile source URL, recruitment identity and post identity against the database.
6. Create new canonical entities or update existing entities only under the approved field-update policy. Never overwrite a better-supported existing value with a weaker or missing FJA value.
7. Verify the Recruitment Hub/Post Leaf relationship and public read path.
8. Revalidate relevant lifecycle, publication, canonical and sitemap decisions.
9. Emit a daily run report with discovered, new, changed, duplicate, written, publicly verified, review-required and failed counts plus record-level exceptions.
10. Advance the crawl watermark only after the listing inventory and run evidence have been persisted successfully. Failed pages must be retried; a partial run must not move the watermark past unprocessed work.

Daily automation is not considered active until the pilot passes and the scheduled workflow, monitoring, alerting and retry behaviour have been tested.

## 5. HTML extraction contract

Capture, where present, without inventing missing facts:
- FJA listing title, listing update date, listing URL and listing-row evidence.
- FJA article title, final article URL, retrieval timestamp and SHA-256 hash.
- Recruiting organisation and recruitment title.
- Individual post/designation names and post-wise table rows.
- Total vacancy text and numeric candidate as separate values.
- Post-wise vacancy counts and their source table/row.
- Qualification/eligibility, age limit, salary/pay and job location.
- Application start date, application end date, walk-in/interview date and notification date as distinct date types.
- Advertisement/reference number.
- External link candidates, including anchor text, exact URL and host.
- Raw article text, headings, paragraphs, lists, source tables and raw HTML snapshot.

Preserve raw source text alongside normalised values. Record field-level extraction provenance (FJA URL, content hash, table/row or text locator where feasible), extraction status and review reason. Do not infer an application deadline from a walk-in/interview date, notification date or modification window.

## 6. Eligibility, trust and publication gates

For the initial pilot, a record is eligible for the write path only when:
- It is a newly discovered, in-scope FJA article URL not already represented by source URL or canonical identity.
- The FJA HTML yields a usable recruitment identity and at least one defensible post candidate.
- At least one external notification/application URL candidate is present in the FJA HTML, as required by the current ingestion objective.
- Required database fields and canonical relationships can be populated without fabricating facts.

Records failing these conditions are retained in staging and reported as review-required; they are not silently dropped.

Important trust rules:
- An FJA-derived fact remains secondary-source information; do not set an independent verification flag.
- An external link candidate is stored distinctly from a verified official URL. Do not represent it as verified.
- Missing facts remain null/unknown; do not invent dates, counts, eligibility, salary or locations.
- Publication/indexability is governed by the existing JobOye lifecycle and page-quality gates, not by successful insertion alone.
- If the current public page contract requires a verified official source before indexing, preserve the record in the appropriate non-indexable/review state rather than bypassing that gate.
- JobPosting structured data may appear only on eligible Post Leaf pages and must match visible supported content. Do not emit unsupported fields.

## 7. Deduplication and update policy

Use multiple independent matching signals:
1. Exact normalised FJA article URL (primary source idempotency key).
2. Existing source observation/document URL records.
3. Advertisement/reference number where present.
4. Recruiting organisation + recruitment title + notification period.
5. Post designation and other distinguishing facts for post-level matching.

A title similarity alone is not sufficient to merge records. Ambiguous matches go to review. Preserve all source URLs and source observations when multiple FJA pages refer to the same underlying recruitment.

The writer must be idempotent: rerunning the same batch must not create duplicate Recruitment or Post entities. Updates must be field-aware and provenance-aware. A missing FJA value must never erase a populated canonical value. A weaker source value must not silently replace a stronger accepted value.

## 8. Write safety and observability

Before production writes:
- Complete a read-only audit of the previous FJA ingestion attempt and explain why records did not appear in the UI.
- Map every staging field to the actual canonical database schema and constraints.
- Confirm transaction boundaries for recruitment creation, post creation and relationship creation.
- Confirm public query filters, lifecycle state, publication flags and route lookup behaviour.
- Implement dry-run output and record-level failure capture.
- Use bounded batches, retry-safe idempotency and explicit run IDs.
- Do not write to legacy `postings` as a substitute for canonical `posts`.

Every record must receive one terminal run outcome:
- `DISCOVERED`
- `EXTRACTED`
- `DUPLICATE_EXISTING`
- `REVIEW_REQUIRED`
- `WRITE_FAILED`
- `WRITTEN_NOT_PUBLIC`
- `PUBLICLY_VERIFIED`

Record the reason and relevant entity IDs/URLs for each outcome. Do not report a batch as successful while any records remain unaccounted for.

## 9. End-to-end verification and definition of done

A record counts as successfully delivered only when all applicable checks pass:
- FJA source URL and raw HTML evidence are retained.
- Extracted fields are traceable to the FJA HTML.
- Duplicate checks are recorded.
- Canonical Recruitment Hub exists at the expected URL.
- At least one canonical Post Leaf exists and is linked to that Recruitment.
- The public data/API query retrieves the record.
- Both pages render without errors and display the intended content.
- Canonical, robots/noindex, lifecycle and sitemap decisions are correct.
- Structured data, if present, matches visible content and is eligible.
- External URL candidate is stored and displayed without an unsupported verification claim.
- The run report reconciles the source listing to its final outcome.

### Pilot acceptance

Start with 5–10 representative FJA HTML articles. Include different article layouts and single-/multi-post cases. First run extraction and duplicate reconciliation in dry-run mode. Then, only after the writer/schema/public-consumer audit, perform a controlled write to a safe test environment or a tightly bounded production pilot with explicit approval.

Scale only if:
- Every pilot listing has a documented outcome.
- No duplicate canonical entities are created.
- Every written recruitment has at least one correctly linked Post Leaf.
- All written records pass public API and rendered-page checks.
- No unsupported official verification or fabricated facts appear.
- Re-running the pilot is idempotent.
- Failure and exception reports reconcile exactly to the input inventory.

Do not move directly from a successful extraction pilot to a full backfill.

## 10. Daily run report and operational metrics

Each run must publish a durable report containing:
- Run ID, start/end time, code version, date window and watermark before/after.
- Listing pages fetched, listing URLs observed, unique URLs and changed URLs.
- Detail HTML fetch success/failure and parser status.
- New, duplicate, changed-existing, review-required and out-of-scope records.
- Writes attempted/succeeded/failed.
- Recruitment hubs and post leaves created/updated.
- Public API and UI verification success/failure.
- Canonical/indexability/sitemap outcomes.
- Per-record source URL, title, organisation, extracted URL candidates, duplicate match, canonical URL(s), final status and reason.
- Crawl errors, retry queue and next action.

Primary operating measures are source-to-public-page delivery rate, data correctness, freshness, duplicate rate, public rendering success and time to publish. Extraction volume is diagnostic, not the goal.

## 11. Rollout sequence and decision gates

1. **Audit:** inspect the prior failed importer and all relevant database/UI consumers. No writes.
2. **Dry run:** run 5–10 representative HTML articles and produce a row-by-row extraction/deduplication report.
3. **Writer design:** map staged data to canonical schema and implement idempotent writes behind tests.
4. **Controlled pilot:** write the approved small batch and verify actual public pages.
5. **Historical backlog:** process the complete agreed FJA URL corpus in bounded batches, with reconciliation after each batch.
6. **Daily automation:** enable scheduled incremental discovery only after pilot acceptance; test overlap, changed pages, retries, alerts and watermark safety.
7. **Continuous operations:** review daily exceptions and periodically reprocess changed source articles.

Each gate requires evidence and a recorded decision. If a gate fails, stop scaling and fix the failure at that stage.

## 12. Non-negotiable anti-drift rules

- FJA HTML only. No official PDF fetching or parsing in this workflow.
- Do not substitute another aggregator or inferred data source.
- Do not equate extraction, database insertion, publication and public discoverability.
- Canonical writes go to `recruitments` and `posts`, not legacy `postings`.
- Every accepted recruitment has at least one linked Post Leaf.
- All discovered URLs receive an explicit outcome.
- No bulk production writes before the 5–10-record pilot and public UI acceptance.
- Daily scheduling starts only after the pilot and operational controls pass.
- Never claim records are live until their canonical pages have been checked on the public data path and rendered UI.
- This process supplements and is subordinate to the JobOye Product & Discovery Operating Charter. If a conflict exists, the charter's trust, canonical and discovery principles prevail; document the resolution rather than silently deviating.
