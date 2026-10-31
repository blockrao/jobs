# Ten-record Recruitment → Post reconciliation dry-run

**Date:** 31 October 2026  
**Scope:** Recruitments 7596, 7598, 7599, 7601, 7607, 7609, 7618, 7619, 7623, 7630  
**Execution:** Live Supabase read-only reconciliation against each Recruitment and its exact legacy Posting external_id; no production writes.  
**Purpose:** Define safe canonical Hub and Post Leaf updates. This is not a publication approval.

## Executive result

- 10/10 Recruitment IDs resolve to exactly one expected legacy Posting by FJA article ID.
- 10/10 currently have **zero canonical rows in `public.posts`**.
- All ten legacy Posting rows are `UNVERIFIED`, `PENDING`, and `publishing_status = DRAFT`; they are not publish-ready canonical Posts.
- The Recruitment records are also `UNVERIFIED`; their `official_notification_url` and `official_application_url` fields are empty.
- Legacy rows contain issuer-hosted PDF URLs in `official_notification_url`, but the field name and hostname do not prove that the document is correct or issuer-authoritative.
- No canonical Post should be created from FJA-only facts. No Hub should be exposed as a complete public opportunity until at least one correct Post Leaf exists.
- No production data, URL, lifecycle status, sitemap or page was changed.

## Live data reconciliation

The following values are the current live Recruitment and legacy Posting values observed in the read-only query.

| Recruitment | Current Recruitment state / dates | Legacy Posting | Legacy facts needing reconciliation |
|---|---|---|---|
| 7596 SMC | ACTIVE; application 9–23 Nov 2026; notification number `P.R.O./301, 29/10/2025`; no Recruitment official URL; verification UNVERIFIED | 4269 / FJA 3075194 | 18 vacancies; broad post_names “Supervisor, Assistant Engineer and More”; salary_min 11, salary_max 208700; PDF URL stored on legacy row |
| 7598 TISS | ACTIVE; deadline 9 Nov 2026; notification number `TISS/NON-TEACHING POSITIONS/2026/02`; no Recruitment official URL; UNVERIFIED | 4271 / FJA 3070990 | 16 vacancies; generic “Non-Teaching Positions”; salary_min 7, salary_max 12 (likely pay levels, not currency); eligibility is broad and role-dependent |
| 7599 OUAT | CLOSED; deadline 28 Oct 2026; notification number `No. E-II-II-08/2026//15535 UAT`; no Recruitment official URL; UNVERIFIED | 4272 / FJA 3069846 | 52 vacancies; Professor / Associate Director of Research & Equivalent; salary_min 1, salary_max 144200 (malformed lower bound / likely pay-level contamination) |
| 7601 IIT Indore | CLOSED; deadline 28 Oct 2026; no notice number or Recruitment official URL; UNVERIFIED | 4274 / FJA 3074884 | 1 vacancy; Design & Research Assistant; ₹20,000 monthly in extracted FJA content; legacy eligibility null |
| 7607 SMKV Bastar | ACTIVE; application 16 Oct–4 Nov 2026; no notice number or Recruitment official URL; UNVERIFIED | 4280 / FJA 3074161 | 69 vacancies and mixed post_names across technical, clerical/admin and Peon roles; stored PDF is specifically the technical notice 3660 (20 posts) |
| 7609 APPSC | ACTIVE; application 18 Nov–8 Dec 2026; no notice number or Recruitment official URL; UNVERIFIED | 4282 / FJA 3073321 | 160 vacancies; Senior Lecturer DIET, Lecturer SCERT, Lecturer DIET; detailed qualifications were not in the brief notice |
| 7618 IIT Ropar | ACTIVE; deadline 20 Nov 2026; notice number `F. No. ANRF/PAIR/2025/000006/PAIR-A`; no Recruitment official URL; UNVERIFIED | 4291 / FJA 3075107 | Legacy says 1 vacancy; extracted content describes one combined conditional JRF / Project Assistant opportunity; do not split into two roles |
| 7619 KUDSIT / Digital University Kerala | CLOSED; deadline 28 Oct 2026; no notice number or Recruitment official URL; UNVERIFIED | 4292 / FJA 3073715 | One Project Intern; ₹12,000/month; legacy apply URL points to DUK careers; stored notification PDF URL; FJA extraction and issuer careers evidence report extension to 4 Nov |
| 7623 NIT Rourkela | CLOSED; deadline 29 Oct 2026; notice number `NITR / 2026 / Advt.- 25CR047 / L / ANP003`; no Recruitment official URL; UNVERIFIED | 4296 / FJA 3073751 | 2 vacancies; combined JRF / Project Associate-I conditional role; ₹37,000–42,000/month; exact older ANP003 notice must not be confused with a separate later JRF notice |
| 7630 RGNAU | ACTIVE; application 22 Oct–22 Dec 2026; notice number `RGNAU/5360/01/ADMIN/669`; no Recruitment official URL; UNVERIFIED | 4303 / FJA 3075050 | 32 vacancies; Professor, Associate Professor, Assistant Professor; salary ₹57,700–₹2,18,200; role/discipline-specific criteria must not be flattened |

## Record-level disposition

### 7596 — Surat Municipal Corporation

FJA extraction describes 18 posts across nine cadres, with an application window 9–23 Nov 2026. The official SMC recruitment dashboard observed in the source audit rendered “No Jobs are available currently” and was stale/conflicting; earlier search evidence suggested the November window. The stored Recruitment notice number is dated 29 Oct 2025 and does not match the 2026 recruitment described in the extraction. The legacy salary lower bound of 11 is clearly unsafe; the FJA salary summary itself was anomalous.

**Decision:** HOLD. Do not update status, notification number, salary, vacancy count or create a Post until the exact 2026 issuer notice and current application route are confirmed. Recruitment title can remain as a provisional internal label, not a verified public record.

### 7598 — Tata Institute of Social Sciences

FJA extraction lists 16 roles under advertisement TISS/NON-TEACHING POSITIONS/2026/02. The legacy salary values 7 and 12 appear to be pay-level endpoints, not salary amounts. The exact issuer archive did not corroborate the title in the audit; the TISS-hosted PDF URL is not sufficient without reading and matching the document.

**Decision:** HOLD canonical Post creation and all detailed eligibility/pay claims until the exact issuer notice content is read. If verified, decompose only into distinct role titles supported by the notice; preserve role-specific pay levels and eligibility.

### 7599 — Odisha University of Agriculture and Technology

FJA extraction describes 52 Professor / Associate Director of Research and equivalent posts. Deadline 28 Oct 2026; DB Recruitment is CLOSED, directionally consistent. The legacy salary lower bound of 1 is malformed and must not be used. The source evidence was partial corroboration only; exact issuer PDF content was not extracted.

**Decision:** Keep CLOSED. Do not create a generic single Professor Post. Read the issuer notice and create distinct Post Leaves only where actual advertised role/discipline groupings are explicit. Leave unsupported fields null.

### 7601 — IIT Indore

FJA extraction describes one Design & Research Assistant for a one-year Madhubani folk-art digital documentation/authenticity research project, ₹20,000 fellowship, B.Des/BFA, email application, deadline 28 Oct and interview 30 Oct. The stored Recruitment title “Various Vacancies” is too broad. The issuer careers page did not establish exact notice identity in the audit.

**Decision:** CLOSED is directionally consistent with the deadline. Correct title and create one Post Leaf only after exact issuer notice identity/content is verified. Do not use ingestion timestamp as posted date.

### 7607 — Shaheed Mahendra Karma Vishwavidyalaya, Bastar

The FJA page combines three separate advertisements (3660/2026, 3662/2026 and 3666/2026) and 69 posts. The stored official PDF URL points specifically to the technical notice 3660, for 20 posts. The issuer's official notices list 3660 separately from 3662, 3664 and 3666.

**Decision:** Scope this existing Recruitment to notice 3660 only unless all other issuer notices are separately obtained and mapped. Do not write 69 to the Recruitment total or the technical Post. For notice 3660, create only the role groupings explicitly present in its issuer PDF after reading the document. Other advertisements require separate Recruitments or an evidence-backed umbrella model; do not combine them by convenience.

### 7609 — Andhra Pradesh Public Service Commission

FJA extraction describes 160 provisional vacancies: Senior Lecturer DIET 46, Lecturer SCERT 10 and Lecturer DIET 104. Applications 18 Nov–8 Dec 2026. The brief notification says detailed qualifications and syllabus will be published on/before 18 Nov; therefore those details are not currently established by the brief notice.

**Decision:** Retain only the provisional vacancy split and application dates if corroborated against the issuer notice. Do not invent qualifications, subject eligibility or detailed selection criteria. Create separate Post Leaves for the three named roles only after the exact issuer notification is verified.

### 7618 — IIT Ropar

FJA extraction describes one combined JRF / Project Assistant opportunity under the ANRF-PAIR project. The JRF vs Project Assistant designation is conditional on NET/GATE qualification; it is not evidence of two separate vacancies. Legacy total_vacancies is 1, while Recruitment-level total_vacancies is null.

**Decision:** One Post Leaf, preserving the conditional designation and qualification pathway. Do not split into two posts. Verify the exact IIT Ropar issuer notice before populating role facts, stipend/pay and eligibility.

### 7619 — Digital University Kerala / KUDSIT

FJA extraction reports one Project Intern, ₹12,000/month, one-year contract, maximum age 25 and a 4 Nov 2026 extended deadline. The issuer careers page evidence in the audit also identifies the Project Intern / Social Engagement Centre notice and the 4 Nov extension. Live DB currently says CLOSED and stores 28 Oct as the end date.

**Decision:** High-priority lifecycle correction candidate. Update the deadline to 4 Nov and lifecycle to ACTIVE only after rechecking the issuer careers page/corrigendum at execution time and recording issuer provenance. One Post Leaf is appropriate once exact notice content is read. Public application link should be the issuer's current careers/application destination, not FJA.

### 7623 — NIT Rourkela

FJA extraction describes two JRF vacancies under NITR/2026/Advt.-25CR047/L/ANP003, deadline 29 Oct 2026 and interview 4 Nov. The legacy row carries the correct external ID 3073751 and issuer PDF URL. It must not be confused with a separate later JRF advertisement.

**Decision:** Keep CLOSED for applications. One Post Leaf can represent the two vacancies if issuer notice confirms the combined JRF / Project Associate-I conditional role. Do not create an active application CTA after the deadline; interview date may remain as a separate event if issuer-confirmed.

### 7630 — Rajiv Gandhi National Aviation University

FJA extraction and the issuer careers search evidence match advertisement RGNAU/5360/01/ADMIN/669, dated 22 Oct, with deadline 22 Dec 2026 and 32 teaching posts. The three ranks (Professor 4, Associate Professor 16, Assistant Professor 12) and disciplines are distinct. Salary and eligibility vary by rank/discipline.

**Decision:** Strongest candidate for canonical decomposition after exact PDF content is read. Create rank/discipline-specific Post Leaves where the issuer notice supplies the grouping and criteria. Do not create one undifferentiated generic “Teaching Posts” leaf with a blended eligibility rule.

## Cross-record field and page rules

1. Recruitment Hub facts remain recruitment-level: issuer, advertisement identity, overall application window, notice destination, verified overall vacancy total where the notice scope supports it, and links to its canonical Post Leaves.
2. Post Leaf facts remain role-level: exact title, role/discipline vacancy count, eligibility, pay, age, location, application method and role-specific dates only where the issuer notice supports them.
3. The FJA article ID is used only to identify the legacy source row. Do not store FJA URLs as public source/application destinations, expose FJA branding, or cite FJA as issuer evidence.
4. Do not copy `postings.date_posted` or ingestion timestamps into `posts.postedAt`. Only a verified issuer publication date may populate the appropriate publication field; notification date is not automatically WebPage datePublished.
5. JobPosting structured data belongs only on eligible individual Post Leaf pages and must match visible facts. Do not emit JobPosting on Recruitment Hubs.
6. Keep unknown or unverified values null. Do not set a generic `is_official_source`/verification flag merely because the stored URL hostname appears institutional.
7. Do not include a Recruitment Hub in a public sitemap as a complete opportunity until the canonical Recruitment → Post relationship and page eligibility gates pass. Do not publish a Post Leaf until exact issuer content and minimum useful role facts are established.
8. Keep expired opportunities historically useful only where lifecycle labels and application actions are accurate.

## Recommended execution sequence

1. Retrieve and read exact issuer PDFs/current official notice pages for all ten; prioritize 7619, 7630 and 7607 (with strict notice 3660 scope), then 7596, 7599, 7601, 7598, 7609 and 7618.
2. Produce a source-backed role manifest per Recruitment: role title, vacancy count, eligibility, pay, dates, application route, issuer URL, exact source location and verification confidence.
3. Resolve the SMC notice-number conflict and the SMKV notice-boundary issue before data writes.
4. Recheck the Digital University Kerala extension immediately before correcting 7619.
5. Generate an explicit SQL/API dry-run showing every proposed Recruitment update and every new Post row, including canonical slug and URL collision checks.
6. Obtain approval of that exact dry-run.
7. Apply one transactionally bounded production batch, then read back all ten Recruitments and all created Posts.
8. Verify rendered Hub and Post Leaf pages, canonical tags, robots/indexability, visible facts, breadcrumbs, structured data, official links, sitemap eligibility and FJA absence. Confirm deployment before describing pages as live.

**Current disposition:** no records approved for production writes in this dry-run. The live DB reconciliation establishes the exact targets and blockers, but the audit does not yet contain sufficient issuer document text for safe canonical Post creation across all ten.
