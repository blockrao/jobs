# Post / Vacancy increment: PRE-CHANGE report (analysis only, awaiting approval)

Date: 2026-10-04. No code, migration or data was changed for this report.

## Scorecard

| Item | Status |
| --- | --- |
| Recruitment rows from the file path | 17 of 751 loaded notices (706 unresolved, correctly held) |
| Post rows created | 12; Vacancy rows created: 0 |
| Notices with a post table in the source | 609 of 751 (observed) |
| Notices with more than one post line | 241 (observed) |
| Notices with a post table disagreeing with the stated total | 11 (observed) |
| Notices with a total but no post table | 87 (observed) |
| Post table carries qualification or location per line | 0 of 689 (observed): the source gives name and count only |
| Evidence basis | local rehearsal on a copy of production state (inferred for production) |

## Findings (real data)

1. Post rows today are one per notice, not one per post line. MECON 3070765 lists 59 post lines (sum 159, equals stated total) and stores 1 post. CIHTS 3066997: 40 lines, 1 stored. Chhattisgarh SAGES 3070827: 26 lines, 1 stored.
2. A source post table is not always a list of posts. ITBP 3070096 lines read "Athletics: 5", a sports discipline, not a post. A line-to-Post rule needs a per-line classifier, not a blind copy.
3. Some lines combine posts ("Project Associate I/ Project Associate II"). The unit rule says one JobPosting per resolved Post, so these stay unresolved until split by a rule or a reviewer.
4. Sum disagreements exist (CSJMU 3069708: lines sum 33, stated 36). The promotion step already blocks these (POST_COUNT_MISMATCH); the new model must keep that block.
5. The source has no category (UR/OBC/SC/ST), gender or location split, so `vacancies` rows (category_type is NOT NULL) cannot be filled honestly from this source. Writing a fake category to satisfy the column is rejected.

## Proposal (revision 2; small, one push, no production data change)

A. Post rows: one `posts` row per source post line of the latest observation, only when the recruitment is identified. Name is the cleaned line; `vacancy_total` is the line count. A line that fails the classifier creates no Post. No schema change: the unresolved state is recorded in the dry-run report and the observation, not in a new column (no migration).
A1. Classifier (conservative, unresolved by default). A line becomes a Post only if all hold: name is 3 to 200 characters; it is not a bare category or reservation label (UR, OBC, SC, ST, EWS, PwBD, Gen); it is not a known discipline or sport list (the ITBP "Athletics" case); it is not generic ("various posts", "total", "other posts"); it has no "/" or " and " joining two post titles (combined names stay unresolved); the count is a positive integer. Before approval I will attach the rule list as code, the rejected lines from the 751 loaded notices, and a labelled sample of 50 lines with the false-positive count.
A2. Existing rows: the 12 Post rows created by the current one-per-notice path are left in place and not rewritten. New per-line Posts are written only for recruitments that have no Post yet, or whose existing Post name matches a line. Nothing is replaced or deleted.
B. Vacancies: not populated from this source. `posts.vacancy_total` carries the line count. Category rows wait for an official notification (DOC-001 territory, not pulled forward).
C. Postings: unchanged. `postings.post_names` stays as it is; the JobPosting unit rule is unchanged (resolved Post only).
D. Contract tests: line-to-Post, classifier negatives (ITBP discipline case), combined name, sum mismatch, idempotent re-run including a renamed source line (no duplicate Post), reviewed rows untouched, 12 existing Posts untouched.
E. Rehearsal on the scratch copy of production state first, with before/after counts. Nothing is applied to production; production backfill stays out of scope.

## A1 classifier evidence (measured; classifier is a prototype, not deployed)

Input: latest observation per notice in the scratch copy, 1,529 source lines from 581 notices (observed). Prototype and rules: `evidence/postvac_a1_classifier_prototype.py` and `postvac_a1_base_rules.py`. Rejected lines: `evidence/postvac_a1_rejected_lines.tsv` (488 lines). Labelled sample: `evidence/postvac_a1_labelled_sample.tsv`.

Final-rule outcome (1,529 lines): accepted 1,041; rejected 488 (no role noun 147, combined 128, short or numeric 73, academic discipline 58, department 37, sport 22, generic header 18, zero count 4, category label 1). Notices where every line is accepted: 425 of 581 (73%); 156 notices keep at least one unresolved line.

Measurement history (labels are the assistant's, not independent; the owner or reviewer should spot-check):

| Round | Sample | Accepted lines wrongly accepted |
| --- | --- | --- |
| 1 | 30 accepted, 20 rejected | 2 of 30 (Plastic Surgery, Centre for Teacher Education); 7 of 20 rejects were genuine posts (false rejects) |
| 2 (fresh) | 40 accepted | 2 of 40 (header "No of Posts", "Sports Shooting") |
| 3 (fresh) | 40 accepted | 1 of 40 (Civil Engineering) |
| 4 (fresh, final rules) | 50 accepted | 1 of 50 (Equestrian, via an over-broad suffix rule, since fixed) |

After each round rules were tightened (department, header and sport patterns, then a required role noun), so only a fresh sample is a fair test. Pooled fresh-sample result before the final fix: 4 of 130 wrongly accepted (3.1%). After the final fix all 5 known wrong lines and Equestrian are rejected on re-check, but the final ruleset has been tested on one fresh sample only (0 of 50 after the fix, by re-check, not a new draw), so the residual false-positive rate is unknown, plausibly 1 to 3%.

Cost of strictness: rejected lines are unresolved, not lost. Known false rejects include "Headmaster/ Headmistress", "Assistant Manager/ Operations", "Associate Professor - Continuing Education and Extension", "Instructor/P.Way".

Parser findings (source side, not fixed here): some notices produce numeric "names" (serial-number columns, for example MECON 3070765 yields lines like "28", "06"), and some post tables hold departments, disciplines or sports. These are why the "59 post lines" for MECON overstate real posts.

Safeguards that bound a false positive: a Post alone publishes nothing (JobPosting needs APPROVED, Tier A, a real organization and a non-template description); every classifier Post is tagged with the classifier version in provenance for reversal; apply stays out of production in this increment.

Fresh final-rule gate (2026-10-04): 50 lines drawn at random (seed 101) from the 876 accepted lines not used in any earlier sample, with the final rules unchanged since the draw (`evidence/postvac_a1_fresh50_final_rules.tsv`). Reviewed blind by a separate reviewer instance that saw only the line text and count, not the rules or earlier labels (a model reviewer, not a human): 48 genuine, 0 not-a-post, 2 unsure (#1 bare "Executive", #35 "Project Technical Staff II (Phlebotomist / Lab technician)"). Clear false positives: 0 of 50. The two unsure lines are listed for owner spot-check.

Amendment 1, existing-Post identity (owner, supersedes the earlier rule): an exact normalized-name match within the same Recruitment is sufficient. Strong name similarity (at least 0.85, no other candidate within 0.1) is sufficient only with unambiguous supporting evidence (same count, same source observation lineage, or the same normalized name stem). Line position and count are supporting evidence only, never sufficient. Otherwise the line is UNRESOLVED and goes to review; a changed source text never creates a duplicate Post.

Amendment 2, vacancy_total (owner): `posts.vacancy_total` is the count of that one line, populated only when the line passed the Post classifier. It is never the raw number of source lines and never taken from a rejected line (numeric, department, discipline, sport, header, combined, zero count). Counts of rejected lines feed nothing, including recruitment-level totals. A mismatch between the sum of accepted lines and the stated notice total stays a flag (POST_COUNT_MISMATCH), not a correction.

## Out of scope

Organization alias seed (needs the real GA4/Search Console export, no invented ranking), description and location enrichment, official-source ingestion, the 950-notice load, any backfill of production.

## Risks

Classifier false positives create wrong Posts. Mitigation: conservative, unresolved by default, dry-run report listing every rejected line before any apply. Locale: names are English only.

## Decision requested

Approve A, B, C, D, E as written, or amend.
