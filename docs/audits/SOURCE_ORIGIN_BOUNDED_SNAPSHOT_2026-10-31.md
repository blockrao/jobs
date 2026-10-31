# JobOye Source-Origin Audit — Bounded Production Snapshot

**Audit date:** 31 October 2026  
**Database snapshot:** 2026-10-31 11:35:19 UTC  
**Execution mode:** Read-only aggregate queries; no record-level export; no production writes  
**Reproducibility:** `scripts/audits/source-origin-bounded-snapshot.sql`

## Executive result

The bounded recheck completed successfully and reproduced the principal source-origin counts without running the full multi-section audit.

| Measure | Result |
|---|---:|
| Recruitments in production | 6,365 |
| Canonical Posts | 5,814 |
| Legacy Postings | 4,223 |
| Recruitments with at least one persisted aggregator/preliminary origin signal | **6,365** |
| Candidates with at least one canonical Post | 4,839 |
| Candidates without a canonical Post | **1,526** |
| Exact staging matches | 355 |
| No staging match | **6,010** |
| No `metadata.ingest_batch` | **6,003** |

The staging match is an exact match on batch plus `hub.official_url = official_notification_url`. It is a reconciliation signal only; it does not establish issuer authority or fact accuracy.

## Canonical Recruitment → Post integrity

The 1,526 source-origin Recruitments without any canonical Post divide into:

| State | Recruitments |
|---|---:|
| Legacy Posting mapping exists | 81 |
| No legacy Posting mapping found | 1,445 |
| **Total without canonical Post** | **1,526** |

The 81 records with a legacy mapping are candidates for a controlled canonical decomposition review. The 1,445 without a legacy mapping need a separate source/record recovery assessment. Neither group should be auto-promoted, duplicated, or assigned a guessed Post.

The canonical rule remains unchanged: a Recruitment Hub must not be treated as a complete public opportunity without at least one correctly associated canonical Post Leaf.

## Bounded manifest — 81 legacy-mapped / no-canonical-Post records

**Manifest execution:** 31 October 2026, read-only, four small pages (25 / 25 / 25 / 6 rows). The cohort was selected from Recruitments with no canonical Post and a legacy Posting mapped by `inferred_recruitment_id`, with aggregator-origin signals on the legacy row.

### Structural reconciliation

| Check | Result |
|---|---:|
| Recruitment ↔ legacy Posting mapping rows | 81 |
| Distinct Recruitments | 81 |
| Distinct legacy Posting IDs | 81 |
| Recruitments with multiple matching legacy mappings | 0 |
| Inferred Recruitment ID matches Recruitment ID | 81 / 81 |
| Inferred Post ID is null | 81 / 81 |
| Exact Recruitment name ↔ legacy title matches | 81 / 81 |
| Recruitment ↔ legacy organization ID matches | 81 / 81 |
| Missing organization IDs | 0 |
| Duplicate Recruitment slugs within the full Recruitment table | 0 |
| Duplicate legacy external IDs within the full Posting table | 0 |

This is a strong one-to-one **relationship and identity match**. It does not establish that the Recruitment facts, vacancy counts, deadlines, eligibility, or official source URLs are correct.

### Lifecycle and quality flags

| Recruitment status | Records | Verification |
|---|---:|---|
| ACTIVE | 28 | All UNVERIFIED |
| CLOSED | 5 | All UNVERIFIED |
| UPCOMING | 48 | All UNVERIFIED |
| **Total** | **81** | **All UNVERIFIED** |

Additional flags:
- 9 records use an organization placeholder name beginning `Organization not identified`.
- 1 title contains a zero-vacancy flag.
- All 81 have a non-empty Recruitment slug in the reviewed manifest.
- Every legacy row has a populated external ID; all 81 external IDs are distinct.
- Every legacy row is marked `source = fja`, `source_type = UNKNOWN`, and `verification_status = UNVERIFIED` in the reviewed cohort.

### URL-field inventory for the 81-record cohort

A follow-up read-only aggregate checked URL fields on both sides of the mapping:

| Field | Present |
|---|---:|
| Recruitment `official_notification_url` | 0 / 81 |
| Recruitment `official_application_url` | 0 / 81 |
| Recruitment `source_url` | 0 / 81 |
| Recruitment `notification_url` | 0 / 81 |
| Legacy Posting `source_url` | 0 / 81 |
| Legacy Posting `official_notification_url` | **81 / 81** |
| Legacy Posting `apply_url` | 7 / 81 |

The 81 legacy `official_notification_url` values resolve to **61 distinct host strings** in a simple hostname inventory; none matched the small known-aggregator substring check used in this query. Top observed hosts included `cdn.s3waas.gov.in` (11), `cdnbbsr.s3waas.gov.in` (5), `www.mcgm.gov.in` (3), `esic.gov.in` (2), `diat.ac.in` (2), `www.barc.gov.in` (2), and `psc.ap.gov.in` (2).

This is a promising evidence lead, not issuer verification. A government-looking domain, a PDF/CDN host, or a field named `official_notification_url` is not by itself proof that the linked document belongs to the named recruiting body. The next review must resolve the 81 exact destinations and compare issuer, advertisement/notification identity, recruitment title, post names, dates and application route. Do not copy these values into Recruitment official fields or publish them without that check.

### Decision

**Structural mapping eligibility: PASS (81/81). Canonical Post creation eligibility: NOT YET ESTABLISHED (0/81 approved).**

The records can proceed to a second, source-grounded review because the legacy-to-Recruitment mapping is one-to-one and title/organization identifiers agree. They must not yet be decomposed into public Post Leaves: the cohort is unverified, and the current audit has not established issuer-owned notification/application URLs or post-level facts from official sources. The 9 placeholder organizations and zero-vacancy title flag require explicit resolution before any corresponding record is promoted.

The next safe step is a dry-run source-evidence review for this 81-record cohort, retaining existing Recruitment IDs and proposing Post-level decomposition only where the official issuer source supports a distinct post title and the necessary facts. Keep CLOSED records out of active-job publication; do not infer a live opportunity from ACTIVE/UPCOMING status alone. No record changes are authorized by this manifest.

## Official-source verification pilot — first 10 records

**Execution:** 31 October 2026. Ten records were selected in Recruitment ID order from the 81-record cohort. The legacy notification destinations were searched against issuer-owned recruitment/career pages and exact notice identifiers. Direct PDF opening was attempted for all ten; the web retrieval layer could not parse/fetch those PDF URLs in this run. Accordingly, page-level corroboration is distinguished from direct document-content verification.

| Recruitment ID | Issuer / record | Official-source evidence found | Result / issue |
|---:|---|---|---|
| 7596 | Surat Municipal Corporation — Various Posts | Earlier official search-result evidence showed a 21 Oct 2026 notice for 9 cadres / 18 posts and a 9–23 Nov window. A refreshed accessible official recruitment page now renders “No Jobs are available currently” and is dated last updated 29 May 2026; it is too stale to settle the October notice. | **Issuer evidence conflicting/stale; lifecycle unresolved.** Keep ACTIVE flagged, but do not change it to UPCOMING or extract post facts until the exact notice and current official portal are inspected. |
| 7598 | Tata Institute of Social Sciences — Non-Teaching Posts | The stored PDF is hosted on the TISS domain, but the official TISS October 2026 archive did not expose a matching “Non-Teaching Posts” notice. The archive lists other October notices. Official archive: https://www.tiss.ac.in/ct-archives/ | **Not verified.** Domain ownership alone is insufficient; exact notice/advertisement identity needs manual document or issuer-page confirmation. |
| 7599 | OUAT — Professor | Stored PDF is hosted on OUAT's domain. An external search result reports the same OUAT Professor recruitment PDF, 52 vacancies and 28 Oct 2026 deadline, but the official page/PDF could not be parsed in this run. | **Partial corroboration only.** Deadline has passed and stored status CLOSED is consistent with the secondary report; confirm against the actual issuer PDF before extracting post-level facts. |
| 7601 | IIT Indore — Various Vacancies | IIT Indore's official Project Positions page lists several current project vacancies and their deadlines, but the retrieved page did not establish that the stored PDF is the exact notice for this broad Recruitment title. Official page: https://www.iiti.ac.in/careers/project_positions?page=1 | **Not verified.** Match the exact advertisement ID and positions from the issuer document before decomposition. |
| 7607 | Shaheed Mahendra Karma Vishwavidyalaya, Bastar — Non-Teaching | A fresh official-domain search result identifies notice 3660, dated 14 Oct 2026 and uploaded 15 Oct 2026, as direct recruitment for technical non-teaching posts. The stored PDF itself could not be fetched. | **Strong exact notice-level page corroboration; document content unverified.** The Recruitment title is broader than notice 3660; confirm notice boundaries from the PDF. |
| 7609 | Andhra Pradesh Public Service Commission — 160 Senior Lecturer & Lecturer Posts | No matching official APPSC notice was surfaced in the searches performed; the stored PDF endpoint was not retrievable by the web reader. | **Not verified.** Hold; do not create Post Leaves from the legacy title alone. |
| 7618 | IIT Ropar — JRF / Project Assistant | IIT Ropar's official homepage lists other current JRF/Field Assistant and project-position notices; its project archive shows older positions, but the exact stored download endpoint was not matched to this record. Official pages: https://www.iitrpr.ac.in/ and https://www.iitrpr.ac.in/project-positions-archive | **Not verified.** Risk of confusing distinct JRF/Project Assistant notices; exact advertisement identity required. |
| 7619 | Digital University Kerala — Project Intern | The accessible official careers page is a stale snapshot (crawled four months earlier); it lists older intern notices but does not expose this Project Intern / Social Engagement Centre notice or the reported corrigendum. Secondary search results report a 4 Nov 2026 extension, but that is not issuer evidence. | **Lifecycle discrepancy unresolved, not issuer-confirmed in this retry.** Keep CLOSED flagged for review; do not change status or treat 4 Nov as verified until the issuer PDF/corrigendum or a current issuer page is obtained. |
| 7623 | NIT Rourkela — Junior Research Fellow | Official NIT Rourkela project-fellowship page currently lists multiple project advertisements and dates, but the retrieved listing did not identify the stored 15 Oct PDF as this exact JRF recruitment. Official page: https://www.nitrkl.ac.in/SRICCE/Career/ | **Not verified.** Exact project/ad number and application deadline are required. |
| 7630 | Rajiv Gandhi National Aviation University — Teaching Posts | A fresh official-domain careers search result explicitly lists “Recruitment of Teaching Positions (including backlog positions),” Advt. RGNAU/5360/01/ADMIN/669 dated 22 Oct 2026, with last date 22 Dec 2026. The accessible rendered page snapshot and official PDF did not expose the notice content. | **Strong exact notice-level page corroboration; document content unverified.** ACTIVE is directionally plausible, but no post-level facts are approved until the notice is read. |

### Pilot summary and disposition

- **Strong exact notice-level issuer-page corroboration:** 2/10 (SMKV and RGNAU).
- **Issuer evidence stale/conflicting and requiring reconciliation:** 2/10 (SMC and Digital University Kerala).
- **Partial corroboration:** 1/10 (OUAT; matching issuer-hosted PDF and secondary report, but no direct issuer-page/document-content verification in this run).
- **Not verified:** 5/10 (TISS, IIT Indore, APPSC, IIT Ropar, NIT Rourkela).
- **Lifecycle discrepancy requiring review:** Digital University Kerala Recruitment 7619 is stored CLOSED, while secondary sources report a 04 Nov 2026 extension; current issuer evidence retrieved in the retry was stale and did not confirm that extension.
- **Lifecycle discrepancy requiring review:** SMC Recruitment 7596 is stored ACTIVE; earlier official search evidence and secondary reports suggest a November window, but the refreshed accessible issuer page is stale and conflicting. Do not alter status.
- **No Post Leaves are approved from this pilot.** Four page-level matches are enough to prioritize document retrieval and field extraction, not enough to bypass exact PDF content review. The broader SMKV record also needs a clear notice-boundary decision.

The direct PDF reader failed to fetch/parse the ten supplied notification URLs during this run (cache miss, inaccessible URL, or internal retrieval error). That is a tooling limitation, not evidence that the issuer documents are invalid or unavailable to users. A separate controlled document-fetch/OCR step is required to read the exact PDFs and extract individual post titles, vacancy counts, eligibility, dates and application instructions. No source facts should be invented from the Recruitment title.

## Official issuer-page revalidation — 31 October 2026

A second pass checked the current issuer careers/recruitment pages rather than relying only on earlier search snippets. This is still **page-level verification**; the PDF bytes were successfully fetched from the four issuer-hosted URLs, but the available document-reading path in this session did not expose their text for OCR. Do not treat successful binary retrieval as document-content review.

| Recruitment ID | Issuer | Fresh official-page evidence | Updated disposition |
|---:|---|---|---|
| 7596 | Surat Municipal Corporation | The issuer's current Recruitment dashboard at https://www.suratmunicipal.gov.in/information/recruitment currently renders “No Jobs are available currently.” This conflicts with the earlier page-level indication of a 9–23 Nov application window. The official notification PDF URL was successfully retrieved, but its contents were not extracted in this session. | **Official-source conflict / hold.** Do not assert UPCOMING or ACTIVE from the earlier page-level result alone. Resolve the exact PDF notice identity and whether the current recruitment dashboard is stale or the notice has been withdrawn/changed. |
| 7607 | Shaheed Mahendra Karma Vishwavidyalaya, Bastar | The issuer's official News & Announcements search result lists notice 3660, dated 14.10.2026, for direct recruitment to Class-III non-teaching technical posts. The official Career notices search result also lists notice 3660 separately from notices 3662 (other Class-III non-teaching), 3664 (Lab Attendant) and 3666 (Peon). Pages: https://smkvbastar.ac.in/en/page/News.aspx and https://www.smkvbastar.ac.in/en/Page/career-notices.aspx?tag=NzA%3D | **Strong exact notice/page match.** Keep the record scoped to notice 3660 only; do not combine the other separate advertisements. The stored PDF was retrieved, but post-level facts still await text extraction. |
| 7619 | Digital University Kerala | The issuer's official Careers page search result lists a Project Intern under the Social Engagement Centre, last date 04.11.2026, and states that the deadline under notification KUDSIT/465/AD AIII/2026 dated 13.10.2026 was extended to 04.11.2026. Official page: https://duk.ac.in/careers/ | **Strong exact notice/page match. Critical lifecycle discrepancy confirmed:** database CLOSED conflicts with the issuer's open application window as at 31 Oct 2026. Treat as a correction candidate, but do not update production without a separate reviewed dry-run and approval. |
| 7630 | Rajiv Gandhi National Aviation University | The issuer's official Careers search result explicitly lists “Recruitment of Teaching Positions (including backlog positions)” under advertisement RGNAU/5360/01/ADMIN/669 dated 22 Oct 2026, last date 22 Dec 2026. Official page: https://rgnau.ac.in/en/careers.html | **Strong exact notice/page match.** ACTIVE is directionally consistent with the issuer's published application window. The stored PDF was retrieved, but post-level facts still await text extraction. |

### Revalidated pilot totals

- **Strong exact issuer-page matches:** 3/10 (SMKV 7607, Digital University Kerala 7619, RGNAU 7630).
- **Official-source conflict / hold:** 1/10 (SMC 7596; current recruitment dashboard says no jobs available, while earlier page-level evidence indicated a future window).
- **Partial corroboration:** 1/10 (OUAT 7599).
- **Not verified:** 5/10 (TISS, IIT Indore, APPSC, IIT Ropar, NIT Rourkela).
- **Lifecycle correction candidate:** DUK 7619, stored CLOSED but official issuer page says deadline extended to 04 Nov 2026.
- **No Post Leaves are approved.** Official page-level identity is now stronger for three records, but exact PDF extraction remains a hard gate for post titles, vacancies, eligibility and detailed dates.

**Document retrieval note:** The four issuer-hosted PDF URLs (SMC 7596, SMKV 7607, DUK 7619, RGNAU 7630) were successfully downloaded into a temporary document-upload service (observed sizes: 1,585,287; 2,007,662; 484,833; and 775,891 bytes respectively). The browser PDF reader still returned internal/cache errors, and the local execution environment cannot retrieve public internet bytes. Therefore, no PDF text/OCR claims are made. This is a tooling/extraction limitation, not evidence that the notices are invalid or inaccessible to candidates.

### Controlled document-retrieval retry — 31 October 2026

A second, bounded retrieval attempt was made for the four highest-priority issuer documents (Recruitments 7596, 7607, 7619 and 7630). The exact official PDF URLs were opened again, including URL variants; the RGNAU Samarth-hosted notification mirror was also tried. An independent HTTP download attempt from the execution container failed because outbound DNS/network access was unavailable. The web reader returned cache-miss or inaccessible-URL errors. **No PDF bytes were obtained and no OCR was performed.** This is not a completed document-content audit.

The retry also refreshed the issuer-page evidence and found that some previously retrieved page snapshots are stale or conflict:

| Recruitment | Refreshed issuer evidence | Updated disposition |
|---:|---|---|
| 7596 — Surat Municipal Corporation | The accessible official recruitment page currently renders “No Jobs are available currently” and shows a page last updated 29 May 2026. This conflicts with the earlier official search-result snippet for a 21 Oct 2026, 18-post notice and secondary reports of a 9–23 Nov application window. The accessible page is too stale to settle the new notice's status. | **Issuer evidence conflicting/stale; lifecycle unresolved.** Do not change ACTIVE to UPCOMING or infer any post/vacancy facts until the exact notice and current official portal are inspected. |
| 7607 — SMKV Bastar | A fresh official-domain search result identifies notice 3660, dated 14 Oct 2026 and uploaded 15 Oct 2026, as direct recruitment for technical non-teaching posts. The title matches the technical category of the stored PDF, but the PDF itself could not be fetched. The university's accessible vacancy-list page is an older snapshot and does not expose this October notice. | **Strong exact notice-level page corroboration; document content still unverified.** The Recruitment title is broader than notice 3660. Confirm notice boundaries and extract posts only from the PDF. |
| 7619 — Digital University Kerala | The accessible official careers page is a stale snapshot (crawled four months earlier); it lists older intern notices but does not expose the Project Intern / Social Engagement Centre notice or the reported corrigendum. Secondary search results report a 4 Nov 2026 extension, but that is not issuer evidence. The official October PDF URL returned cache miss. | **Lifecycle discrepancy remains unresolved, not issuer-confirmed in this retry.** Keep CLOSED flagged for review, but do not change status or treat the reported 4 Nov date as verified until the issuer PDF/corrigendum or a current issuer page is obtained. |
| 7630 — RGNAU | A fresh official-domain careers search result explicitly lists “Recruitment of Teaching Positions (including backlog positions),” Advt. RGNAU/5360/01/ADMIN/669 dated 22 Oct 2026, with last date 22 Dec 2026. The accessible rendered page snapshot did not expose this new row, and both the official PDF URL and Samarth mirror were inaccessible to the reader. | **Strong exact notice-level page corroboration; document content still unverified.** ACTIVE is directionally plausible, but no post-level facts are approved until the actual notice is read. |

The revised evidence classification is therefore: two strong exact notice-level issuer-page matches (SMKV and RGNAU); two issuer evidence cases requiring reconciliation because the accessible official page snapshots are stale/conflicting (SMC and Digital University Kerala); OUAT remains partial; the other five remain unverified. This classification does not authorize Post creation or data changes.

**Required input to complete OCR:** obtain the four exact PDF files through a working official-source fetch path or attach the PDF bytes to this project conversation. Once available, inspect the notice identity, every post row, vacancy totals/category splits, eligibility, age/relaxation, dates, fees, application instructions and corrigenda. Compare each extracted field to the existing Recruitment/legacy record, preserve page references and confidence, and produce a dry-run proposal only. No writes are authorized.

## FJA article extraction — first 10 pilot records

**Extraction date:** 31 October 2026. The database `postings.external_id` for each of the ten pilot records was matched to the numeric FJA article ID. This is a direct article-identity match, not proof of issuer authority. The details below are transcribed/summarized from the matching FJA article search content. FJA statements such as “Officially Verified” are not treated as issuer verification. Where an FJA page has contradictory dates, broad scope, incomplete eligibility, or potentially erroneous values, the discrepancy is explicitly retained.

| Recruitment ID | FJA article ID / matching article | FJA-extracted recruitment facts | Extraction disposition |
|---:|---|---|---|
| 7596 — SMC Various Posts | [3075194 — SMC Recruitment: 18 posts](https://www.freejobalert.com/articles/smc-recruitment-2026-apply-online-for-18-supervisor-assistant-engineer-and-more-posts-3075194) | 18 posts across 9 roles: Director (IT) 1; Radiologist 1; Pathologist 1; Legal Officer 1; Administrative Officer (Suman School) 1; Departmental Inquiry Officer 1; Deputy Engineer (Instrumentation) 1; Assistant Engineer (Instrumentation) 9; Supervisor (Instrumentation) 2. FJA lists qualifications across B.Ed, B.Tech/B.E, Diploma, DNB, LLB, M.E/M.Tech, MBBS, MS/MD; maximum age 45; application window 09–23 Nov 2026. | **Article ID matches DB external_id.** FJA article body contains a conflicting/obvious date typo (“03 November 2025” in one sentence) while its quick summary and issuer page show 09 Nov 2026. FJA salary range ₹6,500–15,200/month looks anomalous and must not be copied without source review. Official issuer page confirms 18 posts and 9–23 Nov 2026, but exact post/eligibility details still need notice review. |
| 7598 — TISS Non-Teaching | [3070990 — TISS Non-Teaching: 16 posts](https://www.freejobalert.com/articles/tiss-non-teaching-recruitment-2026-apply-online-for-16-counsellor-section-officer-and-more-posts-3070990) | 16 positions under Advt. TISS/NON-TEACHING POSITIONS/2026/02: Deputy Registrar 2; Deputy Librarian 1; Assistant Librarian 1; Assistant Registrar 3; Assistant Manager (Publication) 1; System Analyst-cum-Programmer 1; Health Officer 1; Field Work Coordinator 1; Counsellor 1; Section Officer 3; Section Officer (Security) 1. Application deadline 09 Nov 2026. Pay levels listed from Level 7 to Level 12 / Academic Level 10 and 12 depending on post. Qualifications include Master's degree, MBBS or bachelor's degree depending on role; Deputy Registrar requires Master's with at least 55% plus prescribed experience. | **Article ID matches DB external_id.** The FJA article has the role list and some eligibility/pay details, but full post-wise qualifications and campus allocation should be read from the notice before Post-level publication. |
| 7599 — OUAT Professor | [3069846 — OUAT Professor / Associate Director: 52 posts](https://www.freejobalert.com/articles/ouat-professor-recruitment-2026-apply-offline-for-52-posts-3069846) | 52 posts across Professor, Associate Director of Research and equivalent roles. Departmental breakdown in FJA article; includes Associate Director of Research (Professor equivalent) 5, with remaining positions across agriculture, horticulture, forestry, veterinary, fisheries, food processing and family sciences. Advt. E-II-II-08/2026//15535 UAT; advertised 25 Sep 2026; last date 28 Oct 2026; offline; maximum age 60; application fee ₹1,500; Cell-1 Level-14, ₹1,44,200 plus usual allowances. Qualification: concerned-subject Bachelor's and Master's degrees, PhD and prescribed experience; Professor criteria include 10 years' experience with 2 years at Associate Professor/equivalent level. | **Article ID matches DB external_id.** FJA labels the job expired; DB CLOSED is directionally consistent. Treat the 52 as an umbrella recruitment, not a single generic Post. Each department/discipline vacancy must be represented accurately if decomposed. |
| 7601 — IIT Indore Various Vacancies | [3074884 — IIT Indore Design & Research Assistant](https://www.freejobalert.com/articles/iit-indore-recruitment-2026-apply-online-for-design-research-assistant-posts-3074884) | One Design & Research Assistant post in the School of Innovation, for a one-year Madhubani folk-art digital documentation/authenticity assessment research project funded by IIT Indore YFRSG. Qualification B.Des/BFA; fellowship ₹20,000; application by email with CV and portfolio; advertised 13 Oct 2026; deadline 28 Oct 2026; interview 30 Oct 2026. | **Article ID matches DB external_id.** DB CLOSED is consistent with the FJA deadline having passed. The broad DB title “Various Vacancies” is not a good reflection of the one specific FJA role; retain the exact role/project scope for any Post leaf. |
| 7607 — SMKV Bastar Non-Teaching | [3074161 — SMKV Bastar: 69 non-teaching posts](https://www.freejobalert.com/articles/smkv-bastar-non-teaching-recruitment-2026-3074161) | FJA article aggregates three separate ads (3660/2026, 3662/2026, 3666/2026), total 69 posts: technical 20; clerical/administrative 26; Peon 23. Technical ad 3660/2026 includes Technical Assistant 2, Research Assistant 2, Laboratory Technician 9, Laboratory Assistant 2, Accounts Assistant 4, Library Assistant 1. Applications 16 Oct–04 Nov 2026; Chhattisgarh domicile required; maximum age including relaxations 45; fee ₹500 UR/OBC-NCL and ₹300 SC/ST/PwBD; OMR written exam plus skill/practical test; pay levels 1, 4, 6, 8 and 9. | **Article ID matches DB external_id, but scope is materially broader than the persisted official PDF URL.** DB URL points specifically to a “Technical” PDF for ad 3660/2026, which covers 20 posts, not all 69. Do not attach the 69-post umbrella count to that single technical notice. Decide whether the Recruitment represents all three notices (requiring all three issuer PDFs/clear source links) or only ad 3660 (20 technical posts). |
| 7609 — APPSC 160 Senior Lecturer & Lecturer | [3073321 — APPSC DIET Lecturer: 160 posts](https://www.freejobalert.com/articles/appsc-recruitment-2026-apply-online-for-160-senior-lecturer-and-lecturer-posts-3073321) | Brief Notification 30/2026, dated 13 Oct 2026, for 160 provisional posts in A.P. School Education Services: Senior Lecturer DIET 46; Lecturer SCERT 10; Lecturer DIET 104. Age 18–44 as of 01 Jul 2026. Pay scales: ₹61,960–1,51,370; ₹57,700–1,82,400; ₹54,060–1,40,540 respectively. Online application 18 Nov–08 Dec 2026, closing 11:59 PM. Single-level CBRT, no separate screening test. Detailed post-wise qualifications and syllabus to be published on/before 18 Nov 2026. | **Article ID matches DB external_id.** FJA itself states vacancies are provisional and detailed qualifications are not yet published. Do not fill missing eligibility from generic assumptions. DB ACTIVE is directionally consistent with a future application window. |
| 7618 — IIT Ropar JRF / Project Assistant | [3075107 — IIT Ropar JRF / Project Assistant](https://www.freejobalert.com/articles/iit-ropar-recruitment-2026-apply-online-for-junior-research-fellow-project-assistant-posts-3075107) | One JRF / Project Assistant position under ANRF-PAIR sponsored “Dynamic research ecosystem for advanced materials (DREAMS)” focused on sustainable energy conversion/storage (electrocatalysis/batteries). First-class Master's/equivalent in Chemistry or Materials Science, 6.5/10 or 60% (55% for SC/ST); NET/GATE required for JRF, candidates without NET/GATE may be considered for Project Assistant. Pay as per ANRF rules; duration 3 years or until project completion; email/post application deadline 20 Nov 2026; location Rupnagar, Punjab. | **Article ID matches DB external_id.** DB ACTIVE is directionally consistent. FJA has a single combined JRF/PA opportunity; retain the conditional role distinction and do not manufacture separate vacancies. |
| 7619 — KUDSIT Project Intern | [3073715 — KUDSIT Project Intern](https://www.freejobalert.com/articles/kudsit-project-intern-recruitment-2026-apply-online-3073715) | One Project Intern, job code PI/102026/465, Social Engagement Centre; 1-year contract, initially 3-month probation, extendable; ₹12,000/month; maximum age 25; Master's in Social Science/Humanities, preferably Sociology/Social Work, first class; online application; FJA update 29 Oct says deadline extended to 04 Nov 2026; test and/or interview. | **Article ID matches DB external_id. Critical lifecycle conflict:** DB CLOSED is inconsistent with the matching FJA article's 04 Nov extension. FJA is an aggregator signal only; flag for issuer corrigendum/current portal verification. Do not change status based only on FJA. |
| 7623 — NIT Rourkela JRF | [3073751 — NIT Rourkela JRF: 2 posts](https://www.freejobalert.com/articles/nit-rourkela-junior-research-fellow-recruitment-2026-apply-online-3073751) | Two JRF vacancies under NITR/2026/Advt.-25CR047/L/ANP003, within the ANRF-PAIR Consortium of Technologies for Sustainable Agriculture, Health, Energy and Environment. Temporary/project appointment; tenure up to 13 Oct 2030; JRF pay ₹37,000/month in years 1–2 and ₹42,000/month thereafter + HRA; age below 30; basic-science PG or professional graduate/PG degree selected through NET/GATE or equivalent; email application by 29 Oct 2026; interview 04 Nov 2026 at 11:00 AM. | **Article ID matches DB external_id and the stored PDF destination is independently referenced by the same notice family.** FJA says 2 JRF posts. DB CLOSED is directionally consistent with the 29 Oct application deadline, but recruitment activity after closing (interview/selection) should not be confused with an open application. |
| 7630 — RGNAU Teaching Posts | [3075050 — RGNAU Teaching: 32 faculty posts](https://www.freejobalert.com/articles/rgnau-teaching-recruitment-2026-3075050) | Advertisement RGNAU/5360/01/ADMIN/669, dated 22 Oct 2026. 32 posts: Professor 4, Associate Professor 16, Assistant Professor 12; 13 backlog vacancies. Disciplines include Aviation Science, Management/Business Administration and Engineering & Technology. Application 22 Oct–22 Dec 2026. Age limits vary by role (up to 40/45/50 years); salary ranges ₹57,700–₹2,18,200 across posts; fee ₹1,000 for UR/OBC-NCL/EWS, exemptions for SC/ST/PwBD/Ex-Servicemen as stated by FJA. Selection includes screening/shortlisting and interview, with other assessments possible. | **Article ID matches DB external_id and the issuer careers page shows the same advertisement number and 22 Dec deadline.** DB ACTIVE is directionally consistent. Do not collapse 32 posts into one undifferentiated Post; preserve the three faculty ranks and discipline-specific eligibility. |

### Cross-record findings from FJA extraction

1. **All 10 database `external_id` values match a corresponding FJA article ID.** This resolves the article-discovery/mapping problem for the pilot; it does not establish that all article facts are accurate.
2. **High-value scope issue:** SMKV's FJA article combines three advertisements and 69 vacancies, while the stored official PDF URL is specifically the technical notice 3660/2026 for 20 vacancies. The recruitment/post decomposition must not accidentally merge unrelated notice groups.
3. **Lifecycle flags:** KUDSIT (DB CLOSED vs FJA-reported 04 Nov extension) needs urgent issuer confirmation. SMC (DB ACTIVE) has an upcoming 9–23 Nov window per FJA/issuer listing. OUAT, IIT Indore and NIT Rourkela deadlines have passed in the FJA data; APPSC, IIT Ropar and RGNAU have future application windows.
4. **FJA extraction limitations:** FJA page snippets/search-rendered article content were available, but direct page opens returned cache-miss errors. Therefore, this is a search-rendered FJA content extraction, not a byte-for-byte page capture. Preserve the article URL and extracted timestamp/ID as provenance; do not treat FJA's “Officially Verified” label as issuer verification.
5. **No production changes are proposed by this extraction.** Next step is a dry-run comparison of these extracted facts against the stored legacy record and official notice/page evidence, with explicit per-field source and confidence. For any post-level facts not present in the FJA content (especially APPSC detailed qualifications and complete TISS role-specific criteria), retain null/unknown rather than infer.

## Aggregator URLs in fields labelled official

A separate bounded URL-host scan checked persisted URL fields on Recruitments, canonical Posts and legacy Postings against the known aggregator/social/messaging host registry used for this audit.

| Measure | Result |
|---|---:|
| Distinct Recruitments with a known aggregator URL in any scanned field | **67** |
| Distinct Recruitments with an aggregator URL in `official_notification_url` and/or `official_application_url` | **55** |

This confirms that field names such as `official_notification_url` and `official_application_url` cannot be treated as proof of issuer authority. The host must be checked, and the issuer destination must be verified.

The host set checked includes FreeJobAlert, SarkariResult, SarkariNaukri, IndiaSarkariNaukri, SahisarkariJobs, SarkariExam, Maru Gujarat, PDF Jobs Jankari, OnlineUpCar, RojgarResult, FreshersWorld, and known social/messaging domains.

## Interpretation and limits

1. **Origin is not a verdict on every fact.** The 6,365 candidates have aggregator/preliminary discovery signals. Some fields may subsequently have been independently verified. The count must not be described as 6,365 incorrect records.
2. **A staging match is not verification.** The 355 exact staging matches only indicate a reconciliation link.
3. **The URL scan is not a full internet provenance audit.** It scans known persisted columns and the listed host set. It does not resolve redirect chains, classify previously unknown domains, inspect the content of each destination, or independently establish issuer ownership.
4. **The 81-record manifest is now complete.** It was read in four small pages. The structural mapping checks passed 81/81, but all 81 remain unverified and none is approved for canonical Post creation. Do not export all 6,365 records.
5. **No public visibility change is authorized by this audit.** Do not apply RLS, suppress records, alter verification statuses, modify official URLs, re-ingest, or change Recruitment/Post relationships based solely on these aggregate counts.

## Next bounded action

Obtain the exact PDF bytes for the four priority records (SMC 7596, SMKV 7607, Digital University Kerala 7619 and RGNAU 7630) through a working official-source fetch path or project attachment, then complete OCR and page-referenced extraction. Keep OUAT 7599 partial and the other five pilot records on hold. If documents remain unavailable, retain UNVERIFIED and do not infer facts. No Posts, verification updates, URL corrections or status changes are authorized. Only after all first 10 records are resolved should the next 10 be examined; keep the 1,445 unmapped records out of scope.

## Safety record

- SELECT-only production access.
- No production data changed.
- No canonical IDs, slugs, URLs, statuses, source fields, or RLS policies changed.
- The SQL uses a 15-second statement timeout per statement and returns aggregate counts only.
