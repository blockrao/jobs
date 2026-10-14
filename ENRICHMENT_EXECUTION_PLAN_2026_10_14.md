# JobOye · 173 Unknown Organization Recruitments — Enrichment Execution Plan
**Date:** 2026-10-14 · **Recruiter:** Claude · **Scope:** All 173 unknown organization recruitments  
**Data Sources:** FreeJobAlert captured articles (86) + new article captures (32+) + official PDFs (55)

## Problem Statement
173 recruitments display as "Unknown Organization" because the promoter pipeline didn't:
1. Resolve organization names from FJA articles
2. Match articles to recruitment records  
3. Propagate org data to recruitment & posts tables

## Solution Strategy: Data-Driven Organization Resolution via FJA Enrichment

### Phase 1: Enrich from 86 Captured FJA Articles (**Week of 2026-10-14**)
**Input:** `fja_source_captures` table (HTML for 86 recruitments already captured)  
**Process:**
1. Run `promote-article-facts.ts` in batches (10-20 at a time)
2. Script extracts: organization_name, salary, vacancies, qualifications, experience, fees, dates
3. **Automatic org resolution:** ArticleFacts includes org_name → matches/creates organization records
4. **Output:** `post_enrichments` rows with sourceVerificationStatus='PENDING' (FJA = secondary source)
5. **Updates:** recruitment.organization_id is updated via the posts → orgs lookup

**Expected Impact:**
- ~86 recruitments get properly-named organizations
- All post enrichment fields populated with EXTRACTION_CONFIDENCE=80

### Phase 2: Fetch & Enrich 32 Remaining FJA Articles (**Week of 2026-10-21**)
**Input:** recruitment records identified as "missing FJA article" from Phase 1 analysis  
**Process:**
1. Batch fetch articles from FreeJobAlert using identify + scrape
2. Store in `fja_source_captures`
3. Promote via `promote-article-facts.ts`

**Expected Impact:**
- ~32 additional recruitments resolved

### Phase 3: PDF-Based Enrichment for ~55 PDF-Only Cases (**Week of 2026-10-28**)
**Input:** Recruitments with no FJA article available  
**Process:**
1. Batch download official PDFs from `official_notification_url`
2. Extract organization, vacancies, salary using OCR/parsing
3. Create fja_source_captures placeholder entries OR direct enrichment via SQL

**Expected Impact:**
- ~55 remaining recruitments resolved

---

## Implementation: Phase 1 Execution (86 Captured Articles)

### Step 1: Identify the 86 Recruitments with Captured FJA Articles
```sql
SELECT DISTINCT fsc.recruitment_inventory_id as recruitment_id, r.slug, r.application_end_date
FROM fja_source_captures fsc
JOIN recruitments r ON r.id = fsc.recruitment_inventory_id
WHERE r.organization_id = 2235  -- Only unknown-org recruitments
ORDER BY r.id
```

### Step 2: Run promote-article-facts.ts
```bash
# From the jobs repo root
npx ts-node scripts/promote-article-facts.ts --dry-run --limit 20
npx ts-node scripts/promote-article-facts.ts --apply --limit 20 --batch-id phase1-batch1
npx ts-node scripts/promote-article-facts.ts --apply --limit 20 --batch-id phase1-batch2
npx ts-node scripts/promote-article-facts.ts --apply --limit 20 --batch-id phase1-batch3
npx ts-node scripts/promote-article-facts.ts --apply --limit 20 --batch-id phase1-batch4
npx ts-node scripts/promote-article-facts.ts --apply --limit 6 --batch-id phase1-batch5
```

### Step 3: Verify Organization Resolution
```sql
-- Check how many unknown recruitments now have proper orgs
SELECT 
  COUNT(*) as with_real_org,
  COUNT(*) FILTER (WHERE o.slug != 'unknown-organization') as properly_named
FROM recruitments r
JOIN organizations o ON o.id = r.organization_id
WHERE r.id IN (
  SELECT DISTINCT fsc.recruitment_inventory_id 
  FROM fja_source_captures fsc 
  WHERE recruitment_inventory_id IN (SELECT id FROM recruitments WHERE organization_id = 2235)
);

-- Check enrichment data propagation
SELECT 
  COUNT(*) as post_enrichments_created,
  COUNT(*) FILTER (WHERE "sourceVerificationStatus" = 'PENDING') as with_fja_data
FROM post_enrichments pe
WHERE pe.post_id IN (
  SELECT id FROM posts 
  WHERE recruitment_id IN (SELECT DISTINCT fsc.recruitment_inventory_id FROM fja_source_captures fsc)
);
```

---

## Success Criteria

### Phase 1 (86 articles):
- [ ] 86 recruitments show proper organization names (not "Unknown Organization")
- [ ] All 86 have post_enrichments with FJA-extracted data
- [ ] sourceVerificationStatus = 'PENDING' (data is from secondary source)
- [ ] extractionConfidence = 80 or higher
- [ ] No errors in article parsing/promotion

### Phase 2 (32 articles):
- [ ] Additional 32 recruitments resolved
- [ ] Same enrichment quality as Phase 1

### Phase 3 (55 PDF cases):
- [ ] Remaining 55 resolved via PDF extraction
- [ ] Manual spot-checks on 10-15 to verify OCR quality

---

## Cost-Benefit Analysis

| Approach | Cost | Speed | Data Quality | Risk |
|----------|------|-------|--------------|------|
| **Manual PDF parse (all 173)** | $$$$ | Slow (2-3 weeks) | High | Medium (OCR errors) |
| **FJA enrichment (this plan)** | $ | Fast (3 weeks) | High (leverages curated articles) | Low (proven pipeline) |
| **Hybrid (FJA + PDFs)** | $$ | Medium (3-4 weeks) | High | Low |

**Decision:** Hybrid FJA-first approach minimizes cost while maximizing speed and quality.

---

## Next Steps  
1. **Immediate:** Execute Phase 1 with `promote-article-facts.ts` (86 recruitments, ~2 hours)
2. **Day 2:** Analyze results, identify Phase 2 candidates (32 articles to fetch)
3. **Day 3:** Batch fetch Phase 2 articles, promote
4. **Day 5+:** Handle Phase 3 (PDFs)

**Timeline:** Full 173 resolved by **end of 2026-10-21** (one week)
