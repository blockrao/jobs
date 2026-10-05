# PQ-006: per-post facts and page model: PRE-CHANGE report (analysis only, awaiting approval)

Date: 2026-10-05. No code, migration or data was changed for this report.
Closes the open question in A-076 and PAGE_QUALITY_AUDIT item F (G1 for multi-level notices).

## Scorecard

| Item | Status |
| --- | --- |
| Entity layer (ARC-001) | Designed and frozen; tables exist |
| `posts` rows | 982 (name and vacancy total only); 978 point at the placeholder Position "Other" |
| `positions` rows | 5 (4 real, 1 "Other") |
| `eligibilities`, `vacancies`, `selection_processes` rows | 0, 0, 0 |
| Posts with pay or description | 4 of 982 |
| Recruitments by post count | 378 with 1 post; 184 with 2 or more (604 posts); 452 with none |
| Live postings linked to a Post | 236 of 539 |
| Source carries qualification or location per post line | 0 of 689 lines (observed, POSTVAC pre-change) |
| Free-text eligibility on live pages | 529 of 539; 443 name a degree level; 93 name years of experience; none stored as data |
| Official source documents read | 2 of 5 pilot cases fully; PDF bodies partly unreadable (PILOT report) |
| `/recruitments/[slug]`, `/positions/[slug]` | exist, noindex (SEO-001 D2) |
| Competitor check (observed) | FreeJobAlert emits one JobPosting per whole notice, headline as title, one salary range |
| Google rule (observed in its documentation) | JobPosting only on a page with a single job; title is the job title only; markup values must be visible |

## Terms (plain, as used in ARC-001)

- **Recruitment**: one announced notice. **Post**: one opening inside it (Google's JobPosting). **Position**: the designation in the abstract, with no year or notice.
- One Recruitment has many Posts; each Post has exactly one Position; a Position is shared by many Posts.

## Page model (decision requested)

1. **Single-post recruitment** (378): the existing job page is the Post leaf and carries the JobPosting. No new page.
2. **Multi-post notice** (184, 604 posts): the existing URL becomes the notice page (post table, no JobPosting). A Post gets its own leaf page only when it has facts of its own (its own age, qualification, pay or vacancies) and passes a post-level completeness check. Other posts stay as table rows.
3. **Position page**: evergreen designation page for registry Positions, shown only when the Position has at least N Posts (N proposed 3). Today `/positions/[slug]` stays noindex.
4. Every page canonicalises to itself; notice links down, leaf links up and across. Unit rule from SEO-001 is unchanged and now has the structure to run.

Not decided here: the leaf URL shape for multi-post notices (candidate `/jobs/{notice-slug}/{post-slug}`; existing `/jobs/{slug}` URLs must keep resolving). Decided in the implementation increment, after the pilot.

## Proposed data changes (additive migration, no existing row changes)

All new columns nullable; nothing is backfilled by the migration.

- `eligibilities` (exists, empty): add `age_as_on_date`, `qualification_text` (verbatim), `qualification_expr` (jsonb, AND/OR groups of level and discipline), `education_category` (Google's five values or null), `experience_text`, `status` (PENDING / VERIFIED), `verified_at`.
- New `post_age_rules`: `post_id`, `category` (UR, OBC, SC, ST, EWS, PwBD, ExSM, Govt employee), `max_age`, `relaxation_years`, `note`.
- `vacancies` (exists, empty): use as is for category, gender and location splits; check the category enum covers UR, OBC, SC, ST, EWS, PwBD before use.
- New `recruitment_fees`: `recruitment_id`, `category`, `amount`.
- `posts`: add `employing_organization_id` (nullable) and `source_post_code`.
- New `position_aliases` (position, normalised alias) and a reviewed Position registry. A title match only proposes a candidate; a reviewer confirms (ARC-001 section 3).
- New `evidence`: `source_document_id`, `subject_type`, `subject_id`, `field`, `excerpt`, `page_ref`. Every VERIFIED value points to at least one row (ARC-001 rule 5).
- `selection_processes` (exists, empty): use as is, ordered stages.

The posting text fields stay as they are. Extracted values sit beside the verbatim text and never overwrite it.

## Pilot (the only data written, after approval)

Three real structures, about 20 rows in the new tables:

1. UPSC Advertisement 12/2026: 4 official Posts (postings 225 to 228). Facts already verified by hand against the official notice; this tests the schema and the leaf page.
2. BPSC TRE-4.0 (posting 944): four resolved levels in one notice. This decides the open G1 item for 944.
3. SBI advertisement /23: seven post lines, vacancies sum to 207 (sampled in the pilot report). Tests multi-post with counts and no per-post eligibility.

Method: official notice only (A-064); aggregators are never a fact source. Extraction output is stored PENDING with the excerpt; a reviewed sample (all 4 UPSC, 100 percent of the other two) before any value becomes VERIFIED. Unclear values stay empty.

Constraint to state plainly: the agent workspace cannot reach most official sites, and some official PDFs were unreadable in the earlier pilot. Notice documents may need to be supplied by the owner or read through the built-in browser. If a notice cannot be read, that Post stays unresolved.

## Schema.org mapping for a leaf page (renders only from VERIFIED rows)

`title` = post name only; `description` from that Post's facts; `baseSalary`, `totalJobOpenings`, `jobLocation` per Post and visible on the page; `educationRequirements.credentialCategory` from `education_category` (Google's five values); `experienceRequirements` from stored years; `directApply` false for off-site applications (shipped in PQ-004); `hiringOrganization` = employing organization when stored, otherwise the issuing body (labelled as issuer in the page text); `identifier` = our Post id. A missing value is omitted, never guessed.

## Tests

Contract tests: migration is additive (no existing column changes); every VERIFIED value has an evidence row; AND/OR qualification expressions validate; age rules sum to the posted limit; leaf JobPosting contains no value absent from the visible page; a notice page never carries a JobPosting; a Post without its own facts yields no leaf page.

## Verification and rollback

Verification: pilot rows read back against the notices; `verify:live` on the pilot leaf pages after deploy; completeness report before and after. Rollback: migration down file; pilot rows carry a batch id and delete by it. The owner waived the backup gate (A-069); even so, the pilot writes only to new tables.

## Out of scope

State and location rule (parked by the owner), Hindi per-post content, position pages going indexable, bulk extraction of the other 600 posts, organization logos, lifecycle events.

## Risks

- A wrong age or qualification on a leaf page is worse than a missing one: mitigated by official-only sources, evidence excerpts and review.
- Thin near-duplicate leaf pages: mitigated by the own-facts rule.
- Notice and leaf pages competing: mitigated by distinct canonicals and the link structure above.
- The unreadable-PDF constraint may stall the pilot for some notices.
- Benefit not proven: no evidence yet that per-post markup raises traffic; the case rests on correctness and Google's rules.

## Decisions requested

1. Approve the page model (single-post leaf, multi-post notice page with own-facts leaves, Position pages later).
2. Approve the additive migration as listed.
3. Approve the pilot set (UPSC 4, BPSC 944, SBI /23) and the review rule.
