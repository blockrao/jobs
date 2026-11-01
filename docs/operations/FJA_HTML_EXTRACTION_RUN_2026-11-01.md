# FJA HTML extraction run report — 2026-11-01

**Workflow:** FreeJobAlert Research Extraction  
**Run:** [GitHub Actions #27](https://github.com/blockrao/jobs/actions/runs/41271192046)  
**Run ID:** `41271192046`  
**Commit:** `85ec65f82b1adbb5ebe79609805cbd4630bfd8a3`  
**Window:** 2026-10-28 through 2026-11-01 inclusive  
**Mode:** Research-only; no production database writes  
**Artifact:** `freejobalert-extraction-41271192046` (30,657,756 bytes; expires 2026-11-15)

## Extraction result

| Measure | Result |
|---|---:|
| Listing pages fetched | 5 |
| In-window listing rows observed | 807 |
| Unique FJA article URLs | 607 |
| Detail pages processed | 607 |
| Uncaptured listings | 0 |
| Crawl/fetch/parse errors | 0 |
| FJA open-as-of-cutoff candidates | 501 |
| Closed-by-cutoff candidates | 2 |
| Walk-in/date review candidates | 104 |
| Records with organisation | 502 |
| Records with numeric vacancy candidate | 526 |
| Records with post-wise table candidates | 397 |
| Records with external URL candidates | 575 |
| Records with raw page hash | 607 |
| Records with structured capture | 607 |
| Records with all four core fields captured | 205 |
| Records with review reasons | 404 |
| Records with vacancy breakdown candidates | 286 |
| Records blocked from publication by mapper gate | 607 |

The listing update dates in the extracted detail inventory were: 144 (28 Oct), 135 (29 Oct), 153 (30 Oct), 161 (31 Oct), and 14 (1 Nov). The parser identified 457 distinct non-empty organisation strings.

## Interpretation and limitations

- This confirms that the current FJA HTML research extractor can discover and capture the full in-window inventory for this bounded date range: 607 unique article URLs, with no detail captures left uncaptured and no recorded fetch/parse errors.
- The 501 `OPEN_AS_OF_CUTOFF` values are derived from dates extracted from FJA HTML. They are not independently verified official lifecycle states.
- An external URL candidate is only a candidate. It has not been fetched or verified; this workflow did not open any notification PDF or official website.
- 404 records contain parser review reasons; 402 records are classified as walk-in/date unclear plus 2 date unclear. The source status must not be promoted to a verified open/closed state without the separately defined trust rules.
- The mapper intentionally marks all 607 enrichment candidates `REVIEW_REQUIRED`. No records were promoted, written to canonical tables or made public.
- This was a larger research extraction run, not the 5–10 record end-to-end ingestion pilot. It does not prove duplicate reconciliation, canonical database writes, public API retrieval, Hub/Leaf rendering, sitemap eligibility or daily automation.

## Required next step

Run a read-only reconciliation of this artifact against the current production `recruitments` and `posts` records. Then select 5–10 diverse, newly eligible records for a controlled pilot only after the legacy writer/publication path has been corrected or replaced to meet the canonical contract. Do not use the existing legacy `postings` promotion path as proof of canonical ingestion.
