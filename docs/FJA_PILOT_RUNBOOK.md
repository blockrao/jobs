# FJA Inventory Pilot Runbook

**Status:** Pilot-first; full crawl is not approved until the review gates below pass.  
**Workflow:** `.github/workflows/fja-jobs-inventory.yml`  
**Default run mode:** `pilot`

## Purpose

Validate the end-to-end path from FJA article discovery through extraction, persistence, workbook export, official-source verification, and an explicit promotion decision. This pilot does not publish data into canonical JobOye recruitments or posts.

## Pilot sample

1. UCSL Supervisor Recruitment 2026 — multi-post recruitment: `https://www.freejobalert.com/articles/ucsl-supervisor-recruitment-2026-apply-online-3071727`
2. MDU Recruitment 2026 — multiple research posts: `https://www.freejobalert.com/articles/mdu-recruitment-2026-apply-online-for-7-field-investigator-research-assistant-and-more-posts-3071555`
3. AAI Consultant Recruitment 2026 — specializations and remuneration: `https://www.freejobalert.com/articles/aai-consultant-recruitment-2026-apply-online-3071441`

## Run procedure

1. Open GitHub Actions → **FJA Jobs Inventory** → **Run workflow**.
2. Select **pilot**. Keep the three default URLs unless deliberately testing a changed URL.
3. Confirm the repository Actions secret `DATABASE_URL` is configured. The crawler must fail closed if the database URL is absent.
4. Download the run artifact and inspect all six workbook tabs plus `fja-inventory.json`.
5. Query `public.fja_job_inventory` for the three IDs and confirm the rows correspond to the same run ID. Check `public.source_observations` for a new source observation and content hash per successfully fetched article.
6. For each sample, open the official notification independently and complete the field-by-field verification checklist below. Keep official notification URLs separate from application URLs.
7. Record defects and decisions before changing extraction rules. Re-run the same pilot after changes to test idempotency and regression.

## Required manual review per sample

- **Identity:** correct FJA article ID, title, organization, source URL, and notification/advertisement number where stated.
- **Recruitment/post model:** all distinct posts represented; each post belongs to the right recruitment; no cross-post leakage.
- **Counts:** recruitment total versus post-level counts reconcile where the source supports reconciliation; preserve category, backlog, and PwBD breakdowns.
- **Eligibility:** essential/desirable qualification, discipline, experience, age minimum/maximum, age reference date, relaxations, and category conditions.
- **Compensation:** numeric amount, currency, period, pay level/grade, raw wording, and per-post variation.
- **Dates:** application opening/closing, fee deadline, correction window, exam/interview, and age cutoff are separate events with the applicable scope and timezone where stated.
- **Application and selection:** fee/exemptions, application instructions, required documents, selection stages, and relevant FAQs.
- **Evidence:** each material normalized fact links back to its source URL, source section/table, and raw evidence. FJA and official-source captures remain separate.
- **Source links:** official notification URL and application URL are distinct; if no official notification is identified, the item stays in the research inventory and is blocked from canonical ingestion.
- **Completeness:** compare the workbook against the whole article and notification, including prose, tables, headings, instructions, and other substantive sections not mapped to columns.
- **Repeat run:** same source content should not create duplicate observations; changed content should create a new observation and retain the earlier observation.

## Acceptance gates before full crawl

All must pass:

1. Three article pages fetched successfully, with no unexplained skips or silent failures.
2. Correct article IDs and titles; full normalized body text preserved in the JSON artifact. Original HTML archival strategy is documented before scale.
3. No fabricated post rows: unresolved post decomposition is explicitly marked for review.
4. Post-specific facts are correctly assigned; no facts are silently copied from one post to another.
5. All material facts reviewed against official notifications, with conflicts preserved rather than silently overwritten.
6. Missing official notification blocks canonical ingestion, but does not drop the inventory item.
7. Excel has all six sheets and clearly labels source-reported versus manually verified information.
8. Database rows and workbook rows reconcile to the run artifact and run ID.
9. Re-running the same three URLs is idempotent for inventory identity and creates no duplicate observation for unchanged content.
10. A changed-content test demonstrates that the new observation is retained without deleting the old observation.
11. Run summary reports failures, skipped pages, unresolved posts, absent official links, and known limitations.
12. Product/architecture review signs off on defects and the full-crawl plan.

## Explicit non-goals

- Do not promote pilot discoveries directly into canonical JobOye recruitments/posts.
- Do not treat extraction status as factual verification.
- Do not infer missing values or mark a source as official based solely on an anchor label.
- Do not launch the scheduled daily crawl until the pilot gates are signed off.

## Known implementation limitations to resolve during the pilot

- Current extraction uses HTML tables and heuristics; it is not yet a robust post-decomposition engine.
- The workbook's post rows are candidate/evidence rows, not canonical normalized posts.
- Date rows are evidence candidates and may require manual classification and scope assignment.
- Official notification discovery currently relies on link-label heuristics and must be manually confirmed.
- The crawler preserves full normalized body text, but the original HTML capture is not yet emitted as a separate immutable artifact.
- The crawler's page-classification label is a generic recruitment classifier, not necessarily FJA's own listing category.
