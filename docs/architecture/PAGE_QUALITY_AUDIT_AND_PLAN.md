# PQ-001 — Page quality audit (BPSC TRE-4.0) and the process that stops gaps recurring

Status: PRE-CHANGE report, 2026-10-05. Analysis and proposal only; nothing in section 5
is implemented until the owner approves it (cadence: PRE-CHANGE → APPROVAL → ...).
Page audited: `/jobs/bpsc-tre-4-0-recruitment-2026-notification-out-apply-online-for-32-388-school-teacher-posts-7ba6a1` (posting 944) and its Hindi version.

## 0. Scorecard

| # | Dimension | State on 2026-10-05 | Verdict |
|---|---|---|---|
| 1 | Facts against the official notice (Advertisement 15/2026) | Vacancies, level split, pay, age, fee, dates, exam, link all match | PASS |
| 2 | Superseded notice handled (14/2026 cancelled) | Corrected today; was wrong for ~2 weeks | PASS (fixed), process gap |
| 3 | Indexability | Was `noindex` (Tier B: location missing) until the fix applied today | PASS (fixed), systemic gap |
| 4 | Visible freshness | No "last updated" or "last verified" on the page | GAP (fix prepared) |
| 5 | Sitemap freshness (`lastmod`) | Uses `updatedAt`, not a meaningful-change date; page not yet seen in the sitemap | GAP |
| 6 | Structured data | One generic JobPosting for a four-level notice (conflicts with the approved G1 rule); not read live | GAP, needs decision |
| 7 | Canonical and language links | Self-canonical, reciprocal en/hi/x-default (verified by running the site's own rules, not read live) | PASS |
| 8 | Depth against competitors | About 1,200 words, no tables, 4 generic FAQs; competitors 2,400-8,500 words, tables, up to 25 FAQs | GAP (fix prepared) |
| 9 | Hindi | Title, overview, eligibility, requirements, timeline now Hindi; age notes still English | PARTIAL (fix prepared) |
| 10 | Trust signals | Official PDF and apply links present; no verified date, no author or source line | GAP |
| 11 | Duplicates | Aggregator draft (posting 17, recruitment 16) for the same recruitment | OPEN (held) |
| 12 | Topic coverage | One page; competitors run 5-6 pages per topic | GAP |
| 13 | Performance, mobile, Core Web Vitals | Not measured (no route from the workspace to the live site) | UNKNOWN |
| 14 | Real search visibility | joboye.com appears in none of five searches, including the exact page title | EXPECTED, not yet crawled |

## 1. Method and limits

- Facts read from the two official PDFs the owner supplied (both read in full, one page of 15/2026 per image).
- Live page read in the built-in browser (text only). The in-pane script tool ran in the wrong origin, so the page head, robots tag, markup and sitemap could not be read directly; those were evaluated by running the site's own functions on the stored values (`evaluateContentQuality`, `evaluateJobPostingEligibility`, `entitySeo`).
- Competitors: nine pages read through the fetch tool (two refused). This was a content comparison only. It is not a ranking: search position depends on domain authority, links and topic coverage, none of which were measured. The first scoring matrix presented in this session confused the two and was withdrawn.
- Search results were taken from a search tool that is not Google; their order is a rough proxy.

## 2. Findings on the page

1. **Wrong notice for two weeks.** The page cited and linked the cancelled Advertisement 14/2026. Nothing detects that a newer notice supersedes an older one for the same recruitment.
2. **Not indexable.** The page sat in Tier B (noindex, not in the sitemap) because the gate had no location. The stored `quality_missing` also still listed eligibility although eligibility existed.
3. **No freshness signal.** A-072 correctly removed the fake "Last Verified" stamp but nothing honest replaced it. A page can be accurate and still look stale.
4. **Sitemap `lastmod`** is `updatedAt`; the policy (SEO-001 section 2, rule 4) says last meaningful content change. Held since A-072.
5. **Structured data.** The gate counts post names, and this posting stores one combined name, so it passes as a single JobPosting for four materially different jobs. Half of the Tier A pages (125 of 265) are the opposite case and emit none, so treatment is inconsistent.
6. **Thin by comparison.** No tables, four template FAQs (vacancies, eligibility, last date, fee), no author or source line.
7. **Hindi gap.** The age and relaxation text had no Hindi version in use although the column exists.

## 3. Evidence that these are site-wide, not one page

From the production database (586 live approved postings):

| Measure | Count |
|---|---|
| Tier A (indexable) | 265 |
| Tier B (not indexed) | 299 |
| Tier B blocked **only** by missing location | **224** |
| Live postings missing location | 272 |
| Tier A with pay stated | 12 of 265 |
| Tier A with age stated | 12 of 265 |
| Tier A with fee stated | 9 of 265 |
| Tier A with requirements | 14 of 265 |
| Tier A with a Hindi title | 5 of 265 |
| Tier A with a verified date | 4 of 265 |
| Tier A with more than one post name (no JobPosting) | 125 of 265 |
| Tier A with no deadline | 9 |

Reading: the indexable pages are mostly thin, and a single missing field hides another 224. Organisation `state` is filled for only 13 organisations, so location cannot be derived from it today.
Opening the gate for those 224 now would index pages as thin as the rest. The standard in `gate.ts` warns against exactly that ("scaled, minimally-transformed pages"), so depth has to come before volume.

## 4. Why these were missed (root causes)

1. **No definition of a complete page.** SEO-001 defines addresses, language, canonical, robots, sitemap and structured data. It does not define content depth, freshness, trust signals or topic coverage. A page could satisfy every approved policy and still be thin and stale.
2. **Verification stopped at data correctness.** Work was checked against the database and the official PDF, not against the page as served (robots tag, sitemap, markup).
3. **Derived values are computed at write time.** `index_tier` and `quality_missing` are set by the write path; an enrichment done outside it (SQL, fills) does not recompute them.
4. **No supersession detection** between notices of one recruitment.
5. **Ingestion does not extract location** for state-level and central notices.
6. **No feedback loop.** No Search Console data, no SERP check, no competitor check; correctness was the only metric.
7. **Deployment-order risk** for schema changes: the page query reads every column, so code deployed before a migration breaks every job page. Nothing in the process states the order.

## 5. Proposed plan (for approval; nothing here is implemented)

Order is by value and dependency. Each item is its own increment with a pre-change note, per the rules in force.

**A. Finish this page (in progress).**
1. Owner applies migration A-076 (additive, nullable `extra_content`). 2. Code deployed (tables, notice, FAQs, Hindi age notes). 3. Data SQL for posting 944 including "Last Verified" (the posting was read in full against the official notice on 2026-10-05). 4. Live check of robots, sitemap, tables, FAQs, Hindi. 5. Owner submits the page in Search Console.

**B. Page Completeness Standard (PQ-002).** Define "complete" per posting type as a checklist the gate can report on: official link, apply link, vacancies, pay, age, fee, qualification, selection process, dates, verified date, at least N notice-specific FAQs, Hindi for the main fields. Reported as a second score beside the tier; it does not change indexing at first. Output: the same table as section 3, produced by one script, so the gap is visible every week.

**C. Release gate for page changes (PQ-003).** A definition of done that every increment touching public pages must attach to its RESULT:
- a live-page check (HTTP status, robots, canonical, hreflang, sitemap presence, JSON-LD parses, no console error) for the changed pages, both languages, delivered as a runnable script (`npm run verify:live -- <slug>`) because the workspace cannot reach the site;
- the deployment order for any schema change (migration first, then code, then data), written into `supabase/migrations/README.md`;
- recompute of derived fields whenever a field the gate reads is changed outside the write path.

**D. Freshness policy (PQ-004).** (a) Visible "Last Verified" only from `lastVerifiedAt` (already so); (b) a separate meaningful-change date for sitemap `lastmod` (the item held since A-072); (c) supersession detection: a new notification for a recruitment flags older links and descriptions for review instead of silently keeping them; (d) a stale-page report (deadline soon, not verified in 14 days).

**E. Location (PQ-005).** Owner and architect decide the rule for state-level and central notices (state name, "All India", or per-post). Applies to 224 pages, so it follows B: depth first, volume second.

**F. Structured-data unit (PQ-006).** Resolve G1 for multi-level notices by creating resolved Post rows (the "posts and vacancies as rows" increment already chosen in WP-001), then emit one JobPosting per level. This keeps Google for Jobs eligibility for the most important notices without breaking the rule. Until then, posting 944 either keeps one generic JobPosting (conflicts with G1) or stores four post names and emits none. Owner decision.

**G. Discoverability programme (PQ-007).** Topic cluster per major recruitment (age limit, salary, exam pattern, eligibility, notice comparison, Hindi), internal links among them, visible updates when the recruitment moves (admit card, result). Search Console as the feedback loop (owner action); a recurring real-SERP and competitor check replaces content-only comparisons.

**H. Duplicates.** Propose the merge of posting 17 / recruitment 16 into 944 / 1348 after the backup gate (held, as before).

## 6. Process so it stays fixed (what changes in how work is done)

1. **"Done" means the page as served.** No page-affecting increment closes without the live-page check output attached (C).
2. **One definition of complete** (B), reported with the scorecard in every page-related report.
3. **New findings go to the ledger** as usual and never expand the increment; this report's items are A-076 and PQ-002 to PQ-007 once approved.
4. **Owner-run SQL carries its order and its verification query** in the file header.
5. **Competitor and SERP checks use real results** and state what was not measured.

## 7. Decisions needed from the owner

1. Approve A (migration A-076, then deploy, then data).
2. Posting 944 JobPosting: keep one generic (conflicts with G1) or four post names now with no JobPosting until F.
3. Approve B to D as increments (B first).
4. Location rule (E) after B; no change before.
5. Search Console: submit this page now; consider sharing Search Console data later as the feedback loop.

## 8. Corrections to earlier statements in this session

- The first competitor matrix scored content, not discoverability, and ranked JobOye third; that was wrong as a discoverability result.
- "The page is live" was said before checking that it was indexable.
- "Last Verified" was removed (correctly) without an honest freshness signal replacing it.
