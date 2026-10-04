# Post/Vacancy (A1) rehearsal result: scratch copy of production state, nothing applied to production

Date: 2026-10-04. Code is committed locally and not pushed.

## Scorecard

| Check | Result |
| --- | --- |
| Classifier port matches the measured prototype | 0 differences over 1,529 lines |
| Contract tests | 20 new (10 unit, 10 database) pass; suite otherwise unchanged: only the two known failures (ENT-07, IDX-06) |
| Existing 12 one-per-notice Posts | untouched: 12 present, 0 changed in any column |
| Duplicate Posts | 0 (check on recruitment + lower(name)) |
| New Posts | 11, all from accepted lines, all with vacancy_total from their own line (none null or non-positive), all slug-tagged `-pl1-` |
| Rejected / unresolved lines creating Posts | 0 new (the 3 rejected-type names present are among the 12 old Posts) |
| Postings changed | 0 (77 before and after); APPROVED 18 before and after |
| Recruitments changed | 0 (17 before and after) |

## Method

Scratch database seeded with the production copy (125 organizations, 68 postings), then the captured 751 open notices loaded with the previous code (creates the 12 old Posts), snapshot, then loaded again with the new code. Comparison on the snapshot. Evidence basis: local rehearsal (inferred for production); production was not touched.

## Result detail

Only 17 recruitments are identified in the current state because most notices are held as organization candidates; per-line Posts therefore exist only for recruitments that resolve. Recruitment 9 gained 3 Posts, recruitment 16 gained 6; the line already present as an old Post (for example "Commercial cum Ticket Clerk") matched exactly and created nothing. Old Posts whose names the classifier would now reject (recruitments 2, 6, 14) stay in place by A2.

## Not covered here

No production write, no backfill, no Vacancy category rows. The two lines the blind reviewer marked unsure are unchanged.
