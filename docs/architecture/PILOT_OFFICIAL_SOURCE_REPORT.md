# Official-source pilot: report (2026-10-04)

Read-only. No database writes, no alias application, no production change, no
architecture change. Official sources read through the built-in browser (public
pages, no sign-in). Evidence grading per A-066: **observed** = read on the
official page itself; **sampled** = read from an official PDF through a text
summariser (counts cross-checked where possible); **unknown** = not readable.
Aggregator content was never used as official evidence (A-064).

## Scorecard

| Case | Official source reached | Document read | Chain tested | Result |
| --- | --- | --- | --- | --- |
| 1 SBI "207 SCO" | yes (sbi.bank.in) | advertisement PDFs /15, /21, /23 | full | Matches **CRPD/SCO/2026-27/23**. Not a merge. |
| 2 SSC CHSL 2026 | yes (ssc.gov.in notice board) | notice of 07-09-2026 | full | Aggregator facts correct. Duplicated in our data (2 postings, 2 recruitments, 3 organization rows). |
| 3 UPSC Advt 12-2026 | yes (upsc.gov.in) | listing only; PDF body unreadable | partial | Existence and date observed; post/vacancy content **unknown**. |
| 4 MPESB | yes (esb.mp.gov.in) | listing only; rulebook PDFs unreadable | partial (lifecycle) | Constable notice content **unknown**; Group-3 reopen event observed. |
| 5 Institute (IIT Delhi) | page reached, content script-rendered and empty | none | not tested | Recorded inaccessible. |

Representative cases tested to the full chain: **2**. Partial: **2**. Inaccessible: **1**.
Four structures covered: multi-post single advertisement with counts (SBI),
exam notice with posts and tentative total (SSC), single-post advertisements
under one notice (UPSC, not verified), state board with reopen/postpone (MPESB).

## Case 1: SBI

- Official advertisement list (observed) shows seven open SCO advertisements
  (/15, /20–/25). Our posting 151 ("SBI 207 SCO", last date 2026-10-05, 207 posts,
  age 23 to 50, start 04 Sep) corresponds to **/23** (Wealth Management and Premier
  Banking): the PDF lists seven post lines, 1 + 5 + 24 + 9 + 4 + 91 + 73 = **207**
  (sampled; Hindi PDF, sum cross-checked), age bands 23 to 50, apply window 04-09 to
  25-09-2026, **extended to 05-10-2026** (observed on the official list).
- Traps that were not followed: /21 (Group CISO, 1 post) also starts 04 Sep; /15 is 35
  posts (TFO-IBG), regular basis, window 29 Aug to 19 Sep. Neither matches.
- Our data: organization 61 "State Bank of India" (one clean row); recruitment 143 with
  no advertisement number, no official URL, status UNVERIFIED; **0 Posts, 0 vacancy
  rows**, post_names empty. Six other concurrent SCO advertisements are not in the
  database (coverage, not mismatch).
- JobPosting eligibility: **ineligible** (Tier B; MULTI_POST_UNRESOLVED). Correct: seven
  materially different posts, no resolved Posts.

## Case 2: SSC CHSL 2026

- Official notice dated 07-09-2026 (observed on the notice board; PDF sampled): apply
  07-09 to 07-10-2026 (23:00), fee to 08-10, correction 14 to 16-10; three posts
  (LDC/JSA, DEO, DEO Grade A); **"approx. 2536 tentative vacancies", total only, no
  per-post counts**. The official calendar had planned the notice for April 2026
  (schedule slipped, observed).
- Our data: postings 16 and 140 are the **same notice**, held as two recruitments (15,
  134) under two organization rows (16, 140), plus a third SSC row (3). All 0 Posts.
  Recruitment rows carry no dates, no official URL or number.
- The notice board also carries CHSL **2025** lifecycle events (first round of allocation
  17-08-2026, identity verification, final vacancies): a different recruitment with its own
  timeline. Year is the only separator in our model today.
- Eligibility: ineligible (Tier B; MULTI_POST_UNRESOLVED). Correct.

## Case 3: UPSC (partial)

- Official page lists **Advertisement No. 12-2026**, file dated 25-09-2026 (observed).
  PDF body could not be read (viewer blank, no text extraction, fetch timeout). Post,
  vacancy and employing-body content: **unknown**.
- Our data: four curated Tier A postings (225 to 228) with Posts 1 to 4, each with its
  own employing organization, plus aggregator posting 166 ("UPSC JTO, Law Officer and
  More Posts", organization UPSC, no recruitment). By title, 166 and 225 to 228 look like
  one notice held twice (inferred, not verified against the PDF).

## Case 4: MPESB (partial)

- Official home (observed): Police Constable (G.D.) 2026 online form start 22-09-2026,
  rulebook 09-09-2026, revised page 15-09-2026. Vacancy count and last date: **unknown**
  (PDFs unreadable); the aggregator's 7,500 and 06 Oct remain unverified.
- **Lifecycle failure observed:** Group-3 Sub Engineer and Other Posts: official
  "online form reopen, start 13-10-2026" and an exam-date-postponed notice (01-10-2026).
  Our posting 13 carries last date 2026-09-12 (stale). It is Tier C and is now correctly
  absent from `/jobs` (A-067 guard), but the recruitment is **reopening**, which our
  model cannot express (only `valid_through`).
- Organization: both postings sit under "Madhya Pradesh State Recruitment", a
  bucket-style name. The official body is the M.P. Employees Selection Board.

## Case 5: IIT Delhi

Official careers page reaches a project-positions page on `ird.iitd.ac.in` that renders
no content without script data. Not tested. Our posting 128 sits under the bucket
organization "Educational Institution", no recruitment, listing-only source.

## Post-deadline notices (brief)

Official sites hang results, call letters, answer keys and final lists off the original
advertisement (SBI list, SSC notice board). The gate already classes such titles Tier C
("belongs on a recruitment timeline"). Rule supported by the evidence: **after the last
date, an application posting leaves `/jobs`; result/admit-card/answer-key notices are
not job listings and should be discoverable from the recruitment's timeline, which does
not exist yet.** Nothing was changed.

## Chain findings

| Link | Finding |
| --- | --- |
| Official Source → Source Document | **Not represented.** `official_notification_url` is null on every pilot recruitment; no official document is recorded. |
| Organization | SBI, SSC, UPSC resolvable. SSC split across 3 rows; MPESB and institute under buckets. |
| Recruitment | Grain is the **advertisement** (SBI: 7 concurrent under one body). Our rows have no advertisement number. Same notice duplicated (SSC; likely UPSC). |
| Post | Official notices state post lines (SBI 7, SSC 3). We hold 0. |
| Vacancy | SBI: per-post counts exist officially. SSC: tentative total only. No tentative flag, no per-post rows. |
| Lifecycle / events | Extension (SBI), reopen and postponement (MPESB), schedule slip (SSC) cannot be recorded; only `valid_through`. |
| Canonical / public | Pages exist as Tier B with correct aggregator facts; duplicates not collapsed. |
| JobPosting eligibility | No false eligibility: all pilot rows ineligible, for correct reasons. |

## Representation failures the pilot actually shows

1. No official-source document layer (nothing ties a posting to its official notice).
2. Recruitment identity has no advertisement number, so concurrent advertisements and
   duplicates across aggregators cannot be told apart or merged.
3. No lifecycle event record (extension, reopen, postponement); a reopening recruitment
   is indistinguishable from an expired one.
4. Vacancy has no tentative/approximate qualifier; per-post counts exist only in the
   official PDFs.
5. Organization duplicates (SSC x3) and bucket organizations (MPESB, institute).

## Limits

Two cases fully tested. PDF bodies for UPSC and MPESB were unreadable from this
environment (not a source fault); the SBI and SSC PDF contents are text-summariser
readings, cross-checked by arithmetic (SBI) and by the official page dates (SSC).
Every claim above is graded observed or sampled except where marked unknown or inferred.
