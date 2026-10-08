# Phase 1 P0: Next Steps After Verification Framework Deploy

**Date:** 2026-10-08  
**Status:** Verification framework live on `main`; ready for operational rollout  
**Scope:** 1,030 existing Posts + 486 undecomposed recruitments  

---

## Current State

| Item | Count | Status |
|------|-------|--------|
| **Existing Posts** | 1,030 | Live; 930/1,030 have official source URLs (90%) |
| **Posts with verified data** | 3 | BPSC, RRC ALP, CSJMU (verified 2026-10-07) |
| **Posts corrected (gold-standard)** | 1 | Assistant Legislative Counsel (UPSC 12/2026) — template verified |
| **Undecomposed recruitments** | 486 | 348 ACTIVE + 138 UPCOMING |

---

## Immediate Actions (This Week)

### 1. Update Data Intake Flow

**For humans/scripts ingesting new Posts:**

Before any Post goes live:
- [ ] Source URL captured and verified (official government site, not aggregator)
- [ ] 6-step verification checklist completed
- [ ] Critical facts (age, fee, experience) cross-checked against official source
- [ ] Source citations added to Post template
- [ ] "Verified" badge with date added

**Implementation:** Update `src/db/operations/write-postings-v2.ts` to reject Posts without:
- `official_source_url` (NOT NULL constraint)
- `source_verification_date`
- `source_verification_status` (e.g., "VERIFIED" vs. "PENDING")

### 2. Create Verification Checklist Template

**For data-entry teams:**

```
Post ID: ___________
Recruitment: ___________
Official Source URL: ___________
Verification Date: ___________

STEP 1: Source Identification
- [ ] Source is official government document (not aggregator)
- [ ] Source URL recorded and accessible
- [ ] PDF/document date captured

STEP 2: Data Extraction
- [ ] Title extracted from official source
- [ ] Vacancy count verified from official source
- [ ] Age limits extracted (NOT inferred)
- [ ] Application fee verified
- [ ] Experience requirements extracted (all pathways documented)
- [ ] Important dates verified (notification, application close, exam)

STEP 3: Multiple-Pathway Documentation
- [ ] If multiple eligibility pathways exist, all are documented
- [ ] Each pathway includes specific duration/requirements
- [ ] Not simplified to generic "X years"

STEP 4: Cross-Reference Verification
- [ ] Cross-checked age limits against at least one independent source
- [ ] Cross-checked fee against source document
- [ ] Cross-checked critical vacancy count
- [ ] Any discrepancies documented

STEP 5: Citation & Source Notes
- [ ] Source citations in template (page number where applicable)
- [ ] Verification date recorded
- [ ] Official source link included on Post page

STEP 6: Template Metadata
- [ ] "Verified" badge added with date
- [ ] Any data gaps marked as "Not specified in official notification"
- [ ] No inferred/estimated values present

Verified by: ___________
Date: ___________
```

### 3. Priority High-Volume Recruitments (This Week)

Apply 6-step verification to top 20 by search volume (use GA4 data):

Expected improvements:
- UPSC posts (highest search volume) → apply verification first
- Railway/RRC posts → second priority
- SSC posts → third priority

---

## Medium-Term Rollout (2–4 Weeks)

### Phase B: Backfill Verification

**Priority order:**

1. **Top 100 high-search-volume Posts** (UPSC, Railways, State PSCs)
   - Target: Complete in Week 2
   - Method: Pull official source for each; apply 6-step verification; update Post in DB

2. **Remaining 930 Posts with official source URLs** (Week 3–4)
   - Batch verification: 200–300 Posts/day
   - Parallel: Multiple team members can work simultaneously (each gets a batch)

3. **Remaining ~100 Posts without official source URLs**
   - Source recovery: search for official notifications, attempt to find PDF
   - If unfindable: mark with `source_status = "SOURCE_NOT_FOUND"` (do not invent)

### Decomposing 486 Undecomposed Recruitments

**Apply verification at decomposition time:**

When breaking a multi-role recruitment into individual Posts:
1. Pull the official recruitment notice
2. For each role, extract data using 6-step process
3. Create Post with verified data (don't reuse generic template text)
4. Mark with `source_verification_status = "VERIFIED"` before going live

---

## Database Changes Needed

### Add Verification Metadata to Posts Table

```sql
-- Add to posts table:
ALTER TABLE posts ADD COLUMN official_source_url TEXT;
ALTER TABLE posts ADD COLUMN source_verification_date TIMESTAMP;
ALTER TABLE posts ADD COLUMN source_verification_status VARCHAR(50);
  -- Options: VERIFIED, PENDING, UNVERIFIABLE, SOURCE_NOT_FOUND

-- Constraint: Require source_verification_status before posts.is_live = true
ALTER TABLE posts ADD CONSTRAINT require_verification_for_live
  CHECK (is_live = false OR source_verification_status = 'VERIFIED');
```

**Migration:** Create `supabase/migrations/YYYYMMDDHHMMSS_add_source_verification_metadata.sql`

---

## Success Metrics

Track for Phase 1 completion:

| Metric | Target | Current | Timeline |
|--------|--------|---------|----------|
| Posts with verified data | 1,030 (100%) | 3 (0.3%) | Week 4 |
| Posts with official source URL | 1,030 (100%) | 930 (90%) | Week 2 |
| Fabricated/inferred facts | 0 | ✅ Eliminated in corrections |  |
| Verification checklist adoption | 100% of new Posts | TBD | Week 1 |
| Phase 1 P0 item #7 status | CLOSED | IN PROGRESS | Week 4 |

---

## Risk Mitigation

**If official source not available for a Post:**

- [ ] Attempt secondary source (state PSC website, news archive, etc.)
- [ ] If still unavailable: mark `source_status = "SOURCE_NOT_FOUND"`
- [ ] Do NOT invent or estimate data
- [ ] Leave fields empty or mark as "Source not available"
- [ ] Escalate to Prav for decision on whether Post should go live

**Aggregator data:**

- Acceptable for secondary cross-reference only
- NEVER as primary source
- If aggregator and official source disagree: trust official source
- Document discrepancies

---

## Reference Files

| File | Purpose |
|------|---------|
| `docs/reference/jobposting-goldstandard.html` | Template structure reference |
| `docs/reference/OFFICIAL_SOURCE_VERIFICATION_PROCESS.md` | Full 6-step methodology |
| `docs/reference/PHASE1_POST_VERIFICATION_ROLLOUT.md` | Deployment strategy |
| `docs/reference/NEXT_STEPS_OPERATIONAL.md` | This document |

---

## Who Owns What

| Work | Owner | Timeline |
|------|-------|----------|
| Verification checklist creation | Team | This week |
| Data intake flow update | Claude (dev) | This week |
| DB schema changes (source metadata) | Claude (dev) | This week |
| Top 20 Post verification | Team | This week |
| Backfill verification (top 100) | Team | Week 2 |
| Backfill verification (remaining 930) | Team | Week 3–4 |
| Decomposition + verification (486 new) | Team/Claude | Parallel with backfill |

---

## Rollout Checkpoints

- [ ] **End of Week 1:** Verification checklist live, top 20 Posts verified, data intake updated
- [ ] **End of Week 2:** Top 100 Posts verified, DB schema changes deployed
- [ ] **End of Week 3–4:** All 1,030 existing Posts verified, 486 decomposition complete
- [ ] **Completion:** Phase 1 P0 item #7 marked CLOSED

---

**Approved by:** Prav  
**Start date:** 2026-10-08  
**Target completion:** 2026-10-22 (2 weeks aggressive, 4 weeks comfortable)

