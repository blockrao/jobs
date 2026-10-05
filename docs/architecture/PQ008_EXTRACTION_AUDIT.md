# PQ-008 step 1: extraction audit (aggregator page vs stored)

Status: RESULT of the read-only audit, 2026-10-05. No data or code changed.

## Scorecard

| Question | Answer |
|---|---|
| Do the aggregator pages contain the missing data? | Yes, in all 3 pages read (UPESSC, VMMC, GSRTC) |
| Is the loss in our scraper? | Yes, in every sampled case |
| Is it one source? | Mostly: 568 of 604 live postings come from FreeJobAlert |
| Can the workspace scrape in bulk? | No: the shell is refused (HTTP 403 via the proxy) |

## Method and limits
Three FreeJobAlert pages were read with the fetch tool (a summarising reader, not a raw HTML parse) and compared with the stored row and with `src/ingest/adapters/freejobalert.ts`. Sample is small (3), chosen across a large notice, a walk-in and a mid-size notice; not a statistical loss rate. Page text was used only to establish which fields exist, not copied.

## Evidence
| Page | Page offers | We store |
|---|---|---|
| UPESSC 12,405 posts (id 1063) | Pay, age and relaxation, fee by category, qualification, selection, dates, apply and official links, 10 FAQs; about 4,200 words | Vacancies only; description 272 characters |
| GSRTC Helper 2,510 (id 985) | Pay, age by category, fee by category, qualification, selection, dates, links; about 6,500 words | Vacancies only; description 295 characters |
| VMMC walk-in (id 1064) | Pay, qualification, selection, dates, official link; no age, no fee | Vacancies only |

## Causes found in the code (FreeJobAlert adapter)
1. Age limit, age relaxation, application fee and selection process are not extracted at all by this adapter (the fee and age fields exist in the shared type but this adapter never sets them).
2. Salary is read only from a table row labelled salary, pay scale, pay level and similar; a page that states pay in prose or another label yields nothing (22 of 568 postings have pay).
3. Description is the page's meta description or first paragraph only, so no body text, tables or FAQs are kept (average 305 characters).
4. Apply link is found only by anchor text "apply online / apply now / registration"; 88 of 568 have one.
5. A missing field is accepted silently; nothing flags a thin extraction at write time.

## Constraint on the fix
Aggregator pages are discovery-grade (A-064), and their text is their own writing. We extract facts into structured fields and write our own wording; we do not copy their articles.
The workspace cannot reach the aggregators from the shell, so a bulk run needs another runner.

## Proposed next steps (for owner decision)
1. Fix the FreeJobAlert extractor (age, relaxation, fee, selection, pay variants, apply link, FAQ-style facts) with fixture tests built from real saved pages.
2. Run it in dry-run mode on a runner that can reach the site; review the diff of what would be filled.
3. Fill-only apply after backup; never overwrite existing values; recompute tier and completeness.
4. Highest-demand pages first, official PDF check for those.
