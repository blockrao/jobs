# Alias seed: demand basis finding (analysis only, no data changed)

Date: 2026-10-04. The owner dropped Search Console as a ranking source (no data yet) and asked for a basis from real external search-demand data. Nothing is applied.

## Scorecard

| Item | Status |
| --- | --- |
| Keyword-level search demand obtained | NO (not available to this workspace) |
| Ranking inferred | NO |
| Observed coverage of the 751-notice rehearsal | measured (below) |
| Alias seed applied | NO |

## What was tried (observed)

- Google Trends: automated reads are disallowed by the site.
- Semrush and Ahrefs public overview pages: show only a site rank and total traffic, no keyword volumes.
- Wikipedia pageviews (public, 60 days) for about 75 issuing bodies: tested and rejected as a demand basis. Interest in an institution is not job-seeker search demand: for example EPFO (81,810 views) and BSF (58,622) outrank BPSC (4,149), and IIT Kharagpur (21,829) outranks several state commissions. The ordering would mislead alias priority, so no ranking is built from it. (A paging limit also zeroed part of the batch; it was not pursued once the bias was clear.)

## What the corpus shows (observed, rehearsal scratch copy)

693 notices held as organization candidates, from 494 distinct issuing bodies once acronym and city variants are collapsed. The tail is long: top 10 bodies cover 10% of held notices, top 50 cover 28%, top 100 cover 43%. A per-name seed of 50 to 100 bodies therefore resolves at most 28 to 43% of held notices, before any other gate.

Family view of the same 693 notices (327 in these families): university 82 notices over 60 bodies; IIT 55 over 19; AIIMS 35 over 15; district and collector offices 33 over 32; IIM 23 over 8; municipal and corporations 22 over 19; public service commissions 18 over 11; courts 16; banks 14; NIT 14; IISER 10; IIIT 5. Family-level alias rules (for example one reviewed pattern for "Indian Institute of Technology <place>") would reach far more notices than per-name aliases. That is a design option for review, not a change.

## Decision requested

Real demand needs an external keyword source I cannot reach. Options, owner to choose:
1. Provide a keyword-volume export for the attached term list (`evidence/aliasseed_keyword_candidates.csv`: 150 observed bodies plus 6 major recruiters I named from general knowledge, each with "<body> recruitment" and "<body> vacancy"), from Google Keyword Planner, Semrush or Ahrefs.
2. Prioritize the first seed tranche by observed notice coverage (measured above), labelled as coverage and not demand, and layer demand when data exists.
3. Wait for the site's own GA4/Search Console data.
