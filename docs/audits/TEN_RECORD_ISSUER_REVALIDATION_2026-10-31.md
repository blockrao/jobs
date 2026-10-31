# Ten-record issuer revalidation and canonical conflict update

**Date:** 31 October 2026  
**Scope:** Recruitment IDs 7596, 7598, 7599, 7601, 7607, 7609, 7618, 7619, 7623, 7630  
**Execution:** Live read-only Supabase queries; issuer-owned page searches; direct PDF reader attempts.  
**No production writes or page publication were performed.**

## Executive findings

The initial reconciliation has been materially improved by a fresh issuer-page pass and a deeper live DB check.

1. **TISS is a canonical duplicate conflict, not a missing-Post case.** Recruitment 7517 already contains 11 canonical Posts with the same 16-vacancy non-teaching notice, deadline 9 Nov 2026 and matching role names/counts. Target Recruitment 7598 has zero Posts. Do not create another set under 7598. Reconcile 7598 against 7517 and decide a reviewed canonical/redirect treatment.
2. **KUDSIT's deadline correction is now issuer-page confirmed.** The current indexed Digital University Kerala careers page explicitly says the Project Intern deadline was extended to 04.11.2026 under notification KUDSIT/465/AD AIII/2026 dated 13.10.2026. DB Recruitment 7619 still says CLOSED / 28 Oct 2026. This is a high-priority correction candidate, subject to a final live issuer-page check at write time.
3. **SMC notice identity is now corrected by the issuer listing.** SMC's current indexed Recruitment result lists 18 posts, application 09–23 Nov 2026, and advertisement PRO No. 301 dated 21.10.2026. DB Recruitment 7596 currently stores P.R.O./301 dated 29/10/2025. The old year/date is inconsistent with the issuer listing. Do not copy FJA's erroneous date string.
4. **SMKV notice boundaries are confirmed by the issuer.** Official notices list 3660 (technical non-teaching), 3662 (other non-teaching), 3664 (Lab Attendant) and 3666 (Peon) as separate notices. The stored PDF on Recruitment 7607 points to technical notice 3660 only. Never attach the FJA 69-post combined total to this one notice.
5. **RGNAU issuer careers page confirms the exact advertisement identity/date/deadline.** It lists RGNAU/5360/01/ADMIN/669 dated 22 Oct 2026, deadline 22 Dec 2026. FJA extraction provides a 32-vacancy split by three ranks and discipline, but exact issuer PDF content was not parsed; retain the post split as candidate facts pending document read.
6. **IIT Indore issuer project-positions page currently lists the exact Design & Research Assistant project and 28 Oct 2026 deadline.** This supports the role identity and deadline; exact PDF details still need document review.
7. **IIT Ropar has a material source-identity/date conflict.** An IIT Ropar-hosted PDF with the same ANRF/PAIR project number and same JRF/Project Assistant description says last date 01.12.2025, whereas the FJA extraction says 20.11.2026 and the stored legacy URL is a different API download endpoint. This may be a different/updated notice or a misassociation. HOLD; do not populate or publish from the current match until exact stored PDF identity is resolved.
8. **NIT Rourkela's current project-fellowship page does not surface the stored 25CR047/ANP003 notice among the visible current advertisements.** The FJA extraction says deadline 29 Oct 2026 and two vacancies; exact issuer PDF text remains unverified. Keep CLOSED only as a provisional lifecycle candidate; do not enrich from aggregator alone.
9. **The remaining exact PDF contents (TISS, OUAT, APPSC, and SMKV/RGNAU/KUDSIT/IIT Indore) were not parsed by the web reader in this run.** PDF fetch attempts returned cache/access errors. This is a retrieval limitation, not evidence that the documents are invalid.
10. **The source_documents rows are not notification document captures.** For the ten target legacy rows, the linked source_documents entries are FJA web_scraper records containing only short FJA title/summary text (78–193 characters), not the official notification PDF text. The fja_post_inventory query returned no post-level inventory rows for these ten. Do not treat the legacy source_document_id as proof of official PDF extraction.

## Canonical duplicate investigation — TISS 7598 vs 7517

Live read-only query found:

- Recruitment 7517: `org1554-2026-0025`, name “Tata Institute of Social Sciences Non-Teaching Positions 2026”, ACTIVE, deadline 9 Nov 2026, 11 canonical Posts.
- Recruitment 7598: `tiss-non-teaching-posts`, name “TISS Non-Teaching Posts Online Form 2026”, ACTIVE, same deadline and notice number, zero canonical Posts.
- Recruitment 7517 Posts match the eleven role names from the 16-vacancy notice: Deputy Registrar (2), Deputy Librarian (1), Assistant Librarian (1), Assistant Registrar (3), Assistant Manager (Publications) (1), System Analyst-cum-Programmer (1), Health Officer (1), Field Work Coordinator (1), Counsellor (1), Section Officer (3), Section Officer (Security) (1). Total = 16.
- Existing 7517 Post rows have no official source URL, no application URL, and `sourceName = aggregator`; their existence does not itself establish verification.
- The 7598 legacy Posting (4271 / FJA 3070990) matches the same advertisement identity and deadline.

**Decision:** Do not create any Posts under 7598. Reconcile 7517's existing Posts against the exact TISS notice; enrich that canonical entity if/when issuer document facts are verified. Prepare a read-only duplicate/redirect impact report for 7598 before any canonical redirect or suppression. No deletion or redirect is authorized here.

## Record dispositions after revalidation

| Recruitment | Fresh issuer evidence | Canonical disposition |
|---|---|---|
| 7596 SMC | Issuer recruitment search result: 18 posts; application 09–23 Nov 2026; PRO No. 301 dated 21 Oct 2026. | Correct-notice candidate. DB notice date is wrong (29 Oct 2025). Role details remain FJA-derived until PDF text review. |
| 7598 TISS | Official PDF URL exists in legacy row but not parsed. DB duplicate of 7517, which already has 11 Posts. | No Post creation. Reconcile with 7517; exact notice content still required for fact verification. |
| 7599 OUAT | Stored issuer-hosted PDF URL and FJA detailed vacancy table (52) but exact issuer document text not parsed. | Keep CLOSED. No post decomposition until notice content is read. |
| 7601 IIT Indore | Issuer project positions page lists Design & Research Assistant for the exact Madhubani digital documentation project; deadline 28 Oct 2026. | One role candidate; keep CLOSED. Pay/eligibility only after notice text review. |
| 7607 SMKV | Issuer pages list 3660 technical separately from 3662/3664/3666. Stored PDF points to 3660. | Scope existing Recruitment to notice 3660 only; 69-post FJA aggregate is out of scope. Need exact PDF extraction for the 20-post technical notice. |
| 7609 APPSC | No direct issuer page/PDF content retrieved in this pass. FJA says brief notice 30/2026 and 160 provisional vacancies. | Hold. Three post-group candidates only; detailed eligibility unavailable until detailed issuer notification. |
| 7618 IIT Ropar | IIT-hosted PDF with same ANRF/PAIR project number shows last date 01 Dec 2025; stored API URL may be different. | HOLD. Resolve exact stored file vs older official PDF and current 2026 opportunity before any update. |
| 7619 KUDSIT | Issuer careers result explicitly confirms Project Intern, one-year contract and extension to 04 Nov 2026 under notice KUDSIT/465/AD AIII/2026. | High-priority deadline/status correction candidate; one Post candidate. Verify PDF/current issuer page at write time. |
| 7623 NIT Rourkela | Current issuer project-fellowship page does not visibly list stored 25CR047/ANP003 notice; exact PDF not parsed. | Keep CLOSED provisionally. Two-vacancy JRF/PA grouping remains unverified. |
| 7630 RGNAU | Issuer careers result confirms advertisement RGNAU/5360/01/ADMIN/669 dated 22 Oct and deadline 22 Dec 2026. | One recruitment; rank/discipline-specific Post candidates from FJA remain pending exact notice read. |

## Exact official source references reviewed

- SMC Recruitment listing: https://www.suratmunicipal.gov.in/information/recruitment
- Digital University Kerala Careers: https://duk.ac.in/careers/
- RGNAU Careers: https://rgnau.ac.in/en/careers.html
- SMKV News & Announcements: https://www.smkvbastar.ac.in/en/page/News.aspx
- SMKV Career Notices: https://www.smkvbastar.ac.in/en/Page/career-notices.aspx?tag=NzA%3D
- IIT Indore Project Positions: https://www.iiti.ac.in/careers/project_positions?page=1
- IIT Ropar official PDF with same ANRF/PAIR project number (2025 deadline): https://www.iitrpr.ac.in/downloads/sites/default/files/Advertisement%20for%20the%20post%20of%20JRF%20or%20PA%20in%20Department%20of%20Chemistry%20under%20PAIR%20Project%20of%20Dr.%20Tharamani%20%281%29.pdf
- NIT Rourkela Project Fellowship: https://www.nitrkl.ac.in/SRICCE/Career/

## Additional P0 discovery gate — no-Post Recruitment Hubs

A separate live read-only count and source review found a public discoverability defect affecting this pilot and the wider inventory:

- Current `src/app/(default)/jobs/[recruitment-slug]/page.tsx` sets Hub indexability based on organisation resolution only; it does not require a valid canonical Post Leaf.
- Current `src/app/sitemap.ts` Hub query excludes quarantined Recruitments and unresolved organisations but does not require an existing non-duplicate Post with a non-empty slug.
- Live read-only count: **739** Recruitments currently qualify for the Hub sitemap query but have no valid non-duplicate canonical Post Leaf. The total existing sitemap Hub candidates under current exclusions is 5,533.
- All **10** pilot Recruitments are in the no-valid-Post cohort.

**Remediation prepared:** Draft PR #216, https://github.com/blockrao/jobs/pull/216, adds a matching indexability and sitemap gate plus regression tests (IDX-10). It does not mutate data or publish anything. CI has not yet run for its latest head; Vercel preview is subject to the repository's current build-rate limit. Keep the PR Draft until validation is possible.

This is required for the pilot: once verified canonical Post Leaves exist, their Hubs can become index-eligible and enter the sitemap; until then they remain reachable but noindex, follow.

## Next safe execution sequence

1. Resolve TISS duplicate identity first; preserve existing canonical Posts under 7517 unless a reviewed redirect/merge plan establishes a better canonical.
2. For KUDSIT and SMC, prepare a minimal issuer-backed Recruitment update candidate with exact issuer notice number, deadline and URL provenance. Keep unsupported fields null.
3. For SMKV, retrieve/read only notice 3660 and restrict all facts to that advertisement; separately inventory 3662/3664/3666 if JobOye later decides to ingest them as distinct Recruitments.
4. For RGNAU and IIT Indore, retrieve/read exact PDFs and compare all role/pay/eligibility rows with the extracted candidates.
5. Resolve IIT Ropar file identity; do not reuse the 2025 PDF as evidence for a 2026 deadline.
6. Finish APPSC, OUAT, TISS and NIT Rourkela issuer-document reads.
7. Produce an explicit SQL/API dry-run including canonical identity/slug collision checks, proposed Recruitment updates, proposed Post rows, evidence rows, and redirect effects.
8. Only after review/approval apply a bounded transaction; then read back data and verify rendered pages, canonical metadata, structured data, lifecycle, sitemap eligibility and absence of FJA references.

**Current state:** read-only investigation only. No production changes, no Post creation, no redirects and no publication state changes.
