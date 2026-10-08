# Phase 1: Official-Source-Only Post Verification Rollout

**Date:** 2026-10-08  
**Status:** READY TO DEPLOY  
**Scope:** All 1,030 existing Posts + all future Posts  
**Principle:** Per Phase 1 P0 item #7 — Eliminate fabricated/inferred facts

---

## Executive Summary

The gold-standard template (`jobposting-goldstandard.html`) and the 6-step verification methodology (`OFFICIAL_SOURCE_VERIFICATION_PROCESS.md`) establish how every Post must be built: grounded entirely in official sources, with zero fabricated or inferred data.

This document outlines the rollout plan to apply this methodology across all Posts.

---

## What Changed: The 7 Fabrications Corrected

The initial gold-standard template contained 7 major fabrications (now corrected):

1. **Advertisement No.:** `01/2026` → `12/2026` (official)
2. **Age limits:** Completely rewritten (UR 40, EWS 40, OBC 43, SC/ST 45, PwBD 50–55)
3. **Notification date:** 18 Sept → 26 Sept 2026
4. **Application fee:** ₹100 → ₹25
5. **Experience pathways:** Expanded from generic "5 years" to 5 distinct official routes
6. **Probation period:** Added (2 years per official spec)
7. **Age limit reference date:** Corrected to application closing date

**All corrections sourced to official PDF with page references.**

---

## Mandatory 6-Step Verification Process (Locked In)

Every Post must follow these steps:

### Step 1: Source Identification
- Identify the official notification source (government document only, never aggregators)
- For UPSC: Official PDF from https://www.upsc.gov.in
- For State PSCs: Respective PSC official websites
- Record source URL, date, and reference number

### Step 2: Data Extraction (NO INFERENCES)
- Extract facts directly from the official document
- If information is NOT in the official document, mark as "Not specified in official notification"
- **DO NOT:**
  - Infer age limits based on category names
  - Assume typical probation periods
  - Use "common" salary structures
  - Guess application fees based on other posts
  - Derive organization names from post titles

### Step 3: Multiple-Pathway Documentation
- If eligibility has multiple pathways (like this post's 5 legal experience routes), document ALL
- Use table or list format showing each distinct pathway
- Include specific experience duration for each pathway

### Step 4: Verification Cross-Reference
- Cross-check critical numbers (age limits, fees, vacancies) against independent sources
- Use aggregators like FreeJobAlert only for secondary verification, not as primary source
- Document any discrepancies between sources

### Step 5: Citation & Source Notes
- Include source citations in page/template (with PDF page references where applicable)
- Add verification date and timestamp
- Provide links to official documents where possible

### Step 6: Template Metadata
- Add "Verified" badge with date and source count
- Flag any data that could not be verified from official sources
- Mark fields as "As per official notification" vs. "Standard government practice"

---

## Rollout Strategy (3 Phases)

### Phase A: Establish Infrastructure (1–2 days)

1. **Merge the corrected template + process docs** to `main`
   - `docs/reference/jobposting-goldstandard.html` — gold-standard reference
   - `docs/reference/OFFICIAL_SOURCE_VERIFICATION_PROCESS.md` — methodology
   - `docs/reference/PHASE1_POST_VERIFICATION_ROLLOUT.md` — this doc

2. **Create verification checklist**
   - Operationalize the 6-step process as a data-entry checklist
   - Format: Can be used by any team member verifying a Post

3. **Update data intake flow** (if manual intake exists)
   - Every new Post must have an official source URL
   - Every Post must pass the 6-step verification before going live

### Phase B: Backfill Verification (Parallel)

1. **Audit existing 1,030 Posts**
   - Identify which have confirmed official source links
   - Currently 930/1,030 (90%) have source coverage
   - Flag the remaining 100 for source recovery

2. **Apply 6-step process to high-priority existing Posts**
   - Start with UPSC recruitments (highest search volume)
   - Then State PSC recruitments (SSC, Railways, BPSC, etc.)
   - Then other government posts

3. **Data corrections**
   - Run targeted corrections for common fabrications found
   - Document all corrections with before/after evidence

### Phase C: Deploy & Monitor (Ongoing)

1. **Commit all corrections** with sourced citations
2. **Verify in production** — every corrected Post page checked
3. **Monitor search performance** — ensure official-source richness improves rankings
4. **Iterate** — as more official sources are added, quality compounds

---

## Success Criteria

✅ **All 1,030 existing Posts pass the 6-step verification**  
✅ **Every new Post has a confirmed official source URL before going live**  
✅ **Zero fabricated or inferred facts across all Posts**  
✅ **Phase 1 P0 item #7 marked CLOSED: "Eliminate fabricated/inferred facts"**

---

## Key Rules (Hard Constraints)

1. **Official sources only.** Aggregators (FreeJobAlert, SarkariNaukriHelp, etc.) are secondary verification only, never primary.
2. **No inference.** If a fact is not in the official document, it does not appear in the Post.
3. **All facts sourced.** Every claim (age limit, fee, probation period) must trace to an official source with page reference.
4. **No schema changes needed.** The Post schema already supports source citations and official-source-only text fields.
5. **Phase 2 stays deferred.** This work does NOT implement eligibility verdicts, "Can I apply?" logic, or GradeThreshold computation — all Phase 2.

---

## Timeline

| Phase | Work | Duration | Blocker? |
|-------|------|----------|----------|
| A | Establish infrastructure (merge, checklist, flow update) | 1–2 days | No |
| B | Backfill verification (audit 1,030, apply 6-step to high-priority) | 2–4 weeks | No (parallel) |
| C | Deploy & monitor (ongoing) | Indefinite | No |

Since there are no live users yet, Phase B and C can proceed simultaneously.

---

## Files to Reference

| File | Purpose |
|------|---------|
| `docs/reference/jobposting-goldstandard.html` | Corrected template with all 7 fabrications fixed; use as reference for structure and JSON-LD implementation |
| `docs/reference/OFFICIAL_SOURCE_VERIFICATION_PROCESS.md` | Complete methodology: verification checklist, impact analysis, before/after evidence |
| `docs/reference/PHASE1_POST_VERIFICATION_ROLLOUT.md` | This document: rollout strategy and success criteria |

---

## Operational Checklist

Before deploying any Post to production:

- [ ] Official source URL identified and stored (not inferred)
- [ ] All 6 verification steps completed
- [ ] Critical facts (age, fee, salary, experience) cross-checked against official source
- [ ] Source citations added to Post page (page number or section reference)
- [ ] "Verified" badge added with date
- [ ] Any data gaps marked as "Not specified in official notification" (not estimated)
- [ ] Schema.org/JobPosting structured data correct
- [ ] Page renders correctly in production preview
- [ ] URL canonical and sitemap entry present

---

## Next Steps

1. **This week:** Commit merged files, create verification checklist, update data intake flow
2. **Next week:** Start backfilling verification for top 100 high-volume Posts (UPSC, Railways)
3. **Ongoing:** Every new recruitment decomposed into Posts must pass verification before going live

---

**Owner:** JobOye Phase 1 architecture program (Prav)  
**Approval:** READY TO DEPLOY — no further approvals needed; this is mandatory for Phase 1  
**Maintenance:** Update this doc if the 6-step process evolves; methodology is locked in

