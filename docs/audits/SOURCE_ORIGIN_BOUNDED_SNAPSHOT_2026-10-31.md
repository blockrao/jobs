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
| 7596 | Surat Municipal Corporation — Various Posts | SMC's official recruitment portal shows a notice dated 21 Oct 2026 for direct recruitment across 9 cadres, 18 posts; application window shown as 9–23 Nov 2026. Official page: https://www.suratmunicipal.gov.in/information/recruitment | **Strong page-level match; PDF content not independently parsed.** Stored status is ACTIVE, but the official application window is future-dated at the 31 Oct snapshot; lifecycle should be UPCOMING unless the product's status semantics explicitly define otherwise. |
| 7598 | Tata Institute of Social Sciences — Non-Teaching Posts | The stored PDF is hosted on the TISS domain, but the official TISS October 2026 archive did not expose a matching “Non-Teaching Posts” notice. The archive lists other October notices. Official archive: https://www.tiss.ac.in/ct-archives/ | **Not verified.** Domain ownership alone is insufficient; exact notice/advertisement identity needs manual document or issuer-page confirmation. |
| 7599 | OUAT — Professor | Stored PDF is hosted on OUAT's domain. An external search result reports the same OUAT Professor recruitment PDF, 52 vacancies and 28 Oct 2026 deadline, but the official page/PDF could not be parsed in this run. | **Partial corroboration only.** Deadline has passed and stored status CLOSED is consistent with the secondary report; confirm against the actual issuer PDF before extracting post-level facts. |
| 7601 | IIT Indore — Various Vacancies | IIT Indore's official Project Positions page lists several current project vacancies and their deadlines, but the retrieved page did not establish that the stored PDF is the exact notice for this broad Recruitment title. Official page: https://www.iiti.ac.in/careers/project_positions?page=1 | **Not verified.** Match the exact advertisement ID and positions from the issuer document before decomposition. |
| 7607 | Shaheed Mahendra Karma Vishwavidyalaya, Bastar — Non-Teaching | Official university news page lists a 14 Oct 2026 direct-recruitment advertisement for technical non-teaching posts (notice 3660), alongside separate fourth-grade and other notices. Official page: https://www.smkvbastar.ac.in/en/page/News.aspx | **Strong page-level match to the technical notice; title is broader than the identified notice.** Do not assume one recruitment equals every separate notice; check the PDF and split/merge boundary. |
| 7609 | Andhra Pradesh Public Service Commission — 160 Senior Lecturer & Lecturer Posts | No matching official APPSC notice was surfaced in the searches performed; the stored PDF endpoint was not retrievable by the web reader. | **Not verified.** Hold; do not create Post Leaves from the legacy title alone. |
| 7618 | IIT Ropar — JRF / Project Assistant | IIT Ropar's official homepage lists other current JRF/Field Assistant and project-position notices; its project archive shows older positions, but the exact stored download endpoint was not matched to this record. Official pages: https://www.iitrpr.ac.in/ and https://www.iitrpr.ac.in/project-positions-archive | **Not verified.** Risk of confusing distinct JRF/Project Assistant notices; exact advertisement identity required. |
| 7619 | Digital University Kerala — Project Intern | Official careers page explicitly lists Project Intern under the Social Engagement Centre and says the last date was extended to 04 Nov 2026 by corrigendum to notification KUDSIT/465/AD AIII/2026 dated 13 Oct 2026. Official page: https://duk.ac.in/careers/ | **Strong exact page-level match. Critical lifecycle mismatch:** database status is CLOSED although the official issuer page says applications are open through 04 Nov 2026. Do not publish the stale status; route for a separate status correction review. |
| 7623 | NIT Rourkela — Junior Research Fellow | Official NIT Rourkela project-fellowship page currently lists multiple project advertisements and dates, but the retrieved listing did not identify the stored 15 Oct PDF as this exact JRF recruitment. Official page: https://www.nitrkl.ac.in/SRICCE/Career/ | **Not verified.** Exact project/ad number and application deadline are required. |
| 7630 | Rajiv Gandhi National Aviation University — Teaching Posts | Official RGNAU careers page lists “Recruitment of Teaching Positions (including backlog positions)” with advertisement dated 22 Oct 2026 and last date 22 Dec 2026. Official page: https://rgnau.ac.in/en/careers.html | **Strong exact page-level match.** Stored ACTIVE status is directionally consistent with the official window; direct PDF content still needs parsing before post-level extraction. |

### Pilot summary and disposition

- **Strong issuer-page corroboration:** 4/10 (SMC, SMKV, Digital University Kerala, RGNAU).
- **Partial corroboration:** 1/10 (OUAT; matching issuer-hosted PDF and secondary report, but no direct issuer-page/document-content verification in this run).
- **Not verified:** 5/10 (TISS, IIT Indore, APPSC, IIT Ropar, NIT Rourkela).
- **Critical lifecycle discrepancy:** Digital University Kerala Recruitment 7619 is stored CLOSED while the issuer's official careers page states the application deadline was extended to 04 Nov 2026.
- **Potential lifecycle discrepancy:** SMC Recruitment 7596 is stored ACTIVE although the issuer page shows the application window beginning 09 Nov 2026.
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

Complete exact-document retrieval and OCR for the **first 10 pilot records** before expanding to the next batch. Start with the four strong issuer-page matches (SMC 7596, SMKV 7607, Digital University Kerala 7619, RGNAU 7630), resolve the DUK CLOSED and SMC ACTIVE lifecycle discrepancies against the actual notice/corrigenda, and extract the exact post names, vacancy counts, eligibility, dates and application instructions from the PDFs. Keep OUAT 7599 as partial corroboration and the five unverified records on hold pending issuer confirmation. If the exact documents remain unavailable, mark the record unverified rather than infer facts. Do not create Posts, update verification, correct URLs, or change statuses until a separate reviewed dry-run is approved. Only after the first 10 are resolved should the next 10 records be examined; keep the 1,445 unmapped records out of this work.

## Safety record

- SELECT-only production access.
- No production data changed.
- No canonical IDs, slugs, URLs, statuses, source fields, or RLS policies changed.
- The SQL uses a 15-second statement timeout per statement and returns aggregate counts only.
