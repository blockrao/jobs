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

## Proposal (small, one push, no production data change)

A. Post rows: one `posts` row per post line of the latest observation, only when the recruitment is identified. Name is the cleaned line; `vacancy_total` is the line count. Lines that fail the classifier (discipline, category, "various posts", combined names) create no Post and mark the recruitment `post_unit_unresolved`.
B. Vacancies: not populated from this source. `posts.vacancy_total` carries the line count. Category rows wait for an official notification (DOC-001 territory, not pulled forward).
C. Postings: unchanged. `postings.post_names` stays as it is; the JobPosting unit rule is unchanged (resolved Post only).
D. Contract tests: line-to-Post, classifier negatives (ITBP discipline case), combined name, sum mismatch, idempotent re-run, reviewed rows untouched.
E. Rehearsal on the scratch copy of production state first, with before/after counts.

## Out of scope

Organization alias seed (needs the real GA4/Search Console export, no invented ranking), description and location enrichment, official-source ingestion, the 950-notice load, any backfill of production.

## Risks

Classifier false positives create wrong Posts. Mitigation: conservative, unresolved by default, dry-run report listing every rejected line before any apply. Locale: names are English only.

## Decision requested

Approve A, B, C, D, E as written, or amend.
