# Organization Quality Replacement Pilot — Implementation Plan
**Date:** 2026-10-15  
**Scope:** Pragmatic write-path fix (3-5 days) vs. full DATA track (4-6 weeks)  
**Owner Decision:** Replace full sequence with this pilot (A-082 extension, approved 2026-10-15)

---

## Executive Summary

**Problem:** Current write path (`getOrCreateOrganization` in `write-postings-v2.ts`) creates weak, duplicate, and bucket-organization rows from aggregator strings (median 292 characters), not from official sources. This produced ~125 poor-quality organizations over time.

**Root Cause:** Write path writes to canonical schema at ingest time without verification. Aggregator is not an authority source.

**Solution:** 
- **Immediate (3-5 days):** Alias-table write-path fix
- **Future (after pilot proves viability):** Full DATA track (organized sequence: audit → population → hierarchy)

**Expected Impact:** 
- Top 30 organizations cover **81.9% of all vacancies** (129,104 / 157,622)
- These 30 are well-vetted from official notifications
- Pilot tests the write-path fix on real data before scale-up

---

## Data Insight: The Top 30 Organizations

### Coverage
- **Total Vacancies (all 1,612 notifications):** 157,622
- **Top 30 Organization Vacancies:** 129,104
- **Coverage Percentage:** 81.9%

### Top 30 Breakdown (by vacancy count)

| Rank | Organization | Vacancies | Notifications | Category |
|------|--------------|-----------|---------------|----------|
| 1 | BPSC - Bihar Public Service Commission | 32,388 | 1 | State PSC |
| 2 | Department of Local Self Government Rajasthan | 24,752 | 1 | Local Bodies |
| 3 | UPESSC - Uttar Pradesh Education Service Selection Commission | 15,012 | 2 | State PSC |
| 4 | JSSC - Jharkhand Staff Selection Commission | 7,299 | 1 | State PSC |
| 5 | TNPSC - Tamil Nadu Public Service Commission | 6,574 | 1 | State PSC |
| 6 | RRB - Railway Recruitment Boards | 3,548 | 1 | Railways |
| 7 | Canara Bank | 3,500 | 1 | Banking |
| 8 | GPRB - Gujarat Police Recruitment Board | 3,000 | 1 | Police |
| 9 | JKSSB - Jammu & Kashmir Services Selection Board | 2,863 | 1 | State PSC |
| 10 | APPSC - Andhra Pradesh Public Service Commission | 2,733 | 11 | State PSC |
| 11-30 | (20 more organizations) | 52,335 | 50 | Various |

### Category Distribution (Top 30)
- **State PSC & Selection Boards:** 25 organizations
- **Other Departments & Local Bodies:** 6 organizations
- **Railways & Metro:** 6 organizations
- **Universities, Schools & Teaching:** 5 organizations
- **Banking & Insurance:** 3 organizations
- **Defence & Police:** 3 organizations
- **Central Govt Departments:** 1 organization
- **Health & Medical:** 1 organization

---

## Implementation Steps

### Phase 1: Preparation (Day 1–1.5)

#### 1.1 Identify canonical organizations in existing database
```sql
-- Find which top 30 already exist as canonical organizations
SELECT id, name FROM organizations
WHERE LOWER(name) IN (
  'bpsc', 'upessc', 'jssc', 'tnpsc', 'appsc', ...
)
```

**Action:** Run query to identify existing org IDs for top 30.

#### 1.2 Build alias seed data
For each top 30 organization:
- **Canonical form:** Primary name to use in system
- **Aliases:** Common variants, abbreviations, shorthand
- **Source:** "official_notification" (these come from Category A ingest)

**Example:**
```
Organization ID: 2439 (APPSC)
Aliases:
  - "APPSC"
  - "Andhra Pradesh Public Service Commission"
  - "APPSC - ANDHRA PRADESH PUBLIC SERVICE COMMISSION"
  - "ap public service commission"
```

#### 1.3 Create migration for organization aliases
Generate `20261016_org_quality_001_canonical_aliases.sql`:
- INSERT 150–200 aliases for top 30 organizations
- Batch as single VALUES clause
- Include alias_raw and alias_normalized columns

**File:** Will be committed with this plan.

---

### Phase 2: Validation (Day 1.5–2.5)

#### 2.1 Dry-run alias resolution against official dataset
```python
# Pseudocode: test organization resolution on Category A ingest
from src.ingest.organization_resolution import resolveOrganization, loadOrgIndex
from src.db import getDb

db = getDb()
org_index = await loadOrgIndex(db)

# Load top 1,612 official notifications
excel_rows = read_excel("official-notifications-dataset.xlsx")

resolution_results = {
  "ALIAS": 0,  # Resolved to canonical org via alias
  "EXISTING": 0,  # Resolved to existing org by name
  "CANDIDATE": 0,  # Held as candidate (ambiguous/unrecognized)
  "NONE": 0,  # Rejected (no org name)
}

for row in excel_rows:
  result = resolveOrganization(org_index, row["Organisation"])
  resolution_results[result.kind] += 1

print(f"ALIAS: {resolution_results['ALIAS']}")
print(f"EXISTING: {resolution_results['EXISTING']}")
print(f"CANDIDATE: {resolution_results['CANDIDATE']}")
print(f"NONE: {resolution_results['NONE']}")
```

**Success Criteria:**
- ≥1,400 rows (≥87% of 1,612) resolve to ALIAS or EXISTING
- <100 rows held as candidates
- Zero rejected due to "no org name" (all have organizations)

**Output:** Dry-run report with counts and sample failures.

#### 2.2 Identify high-demand test recruitments
From the Excel dataset, select 3–5 recruitments from top-10 organizations:
- **Selection criteria:**
  - Organization is in top 30
  - ≥500 vacancies
  - Open (no closing date passed)
  - High search/GA4 intent
- **Examples:** BPSC (32k vacancies), UPESSC (15k vacancies), APPSC (11 notifications)

**Output:** List of 5 test recruitments with org names, vacancy counts, URLs.

---

### Phase 3: Write-Path Fix (Day 2–3)

#### 3.1 Review write-path organization resolution
File: `src/db/operations/write-postings-v2.ts`, lines 331–370

Current logic:
```typescript
const resolution = resolveOrganization(orgIndex, norm.organizationName);
if (resolution.kind === "CANDIDATE") {
  // Hold as candidate, do not create posting
}
if (resolution.kind === "ALIAS" || resolution.kind === "EXISTING") {
  // Use the resolved organization
  const org = resolution.organization;
}
```

**Assessment:** Write path already gates on alias resolution correctly. No code change needed if migration is applied.

**Verification needed:**
1. Confirm `loadOrgIndex()` loads organization_aliases table ✓ (line 293)
2. Confirm alias lookup happens before candidate creation ✓ (lines 331–340)
3. Confirm organization_mapping vs. organization_aliases (two different tables):
   - `organization_mapping`: Maps official notification names to canonical org IDs (970 rows from Category A)
   - `organization_aliases`: Normalized alias forms for lookup during ingest

**Action:** No code change; migration applies the fix.

#### 3.2 Apply migration to staging
```bash
# Option A: Local dev
npm run db:migrate:dev -- --name "org_quality_001_canonical_aliases"

# Option B: Staging Supabase project
supabase migration up --project-ref <staging-ref>

# Option C: Remote via MCP
mcp__Supabase__apply_migration(project="<staging>", migration_file="...")
```

---

### Phase 4: Pilot Test (Day 3–4)

#### 4.1 Dry-run ingest on test recruitment

**Setup:**
```bash
export DRY_RUN=true
export INGEST_OUT=/tmp/pilot-test-output.json
npm run ingest -- --source official --recruitment "BPSC-2026-01"
```

**Expected Output:**
- Posting records created and marked as PENDING
- Organization resolved via alias (not held as candidate)
- All 5 test recruitments produce ≥95% posting-creation rate

**Measurements:**
- Postings created (target: ≥4,500 for BPSC)
- Held candidates (target: <50)
- Rejected (target: <50)
- Organization resolution breakdown (ALIAS, EXISTING, CANDIDATE, NONE)

#### 4.2 Spot-check schema.org JobPosting output
For 10 random posts from test recruitments:
1. Verify organizationId is set (not NULL)
2. Verify jobLocation country = "IN"
3. Verify baseSalary omitted if salary is NULL (no fabrication)
4. Verify totalJobOpenings present if vacancy count exists

**Tool:** Use SQL to fetch 10 sample postings; validate schema.org structure.

#### 4.3 Compare with Phase 1 official posts

**Baseline (existing official posts):**
- Count of posts with organizationId != NULL
- Count of posts held during ingest (candidates)
- Organization quality issues from Gate 2

**Pilot (new test posts from this ingest):**
- Count of posts with organizationId != NULL
- Count held as candidates
- Organization name variety and quality

**Success Criteria:** Pilot posts have fewer candidates held, higher org resolution rate.

---

### Phase 5: Production Push (Day 4–5)

#### 5.1 Code review + approval
- Migration SQL reviewed for syntax, constraints
- Dry-run report reviewed
- Success criteria met

#### 5.2 Apply migration to production
```bash
supabase migration up --project-ref cusxodjgkrttwmdmhvso
# or via MCP tool
```

#### 5.3 Run actual ingest on Category A dataset
```bash
export DRY_RUN=false
npm run ingest -- --source official --all
```

**Monitoring:**
- Ingest job runs without errors
- Database write rate normal
- Organization_aliases table is used (not bypassed)

#### 5.4 Verification queries
```sql
-- Count postings by organization resolution
SELECT 
  COUNT(*) as total_posts,
  COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END) as org_linked,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as org_missing
FROM postings
WHERE source = 'official' AND created_at > now() - interval '24 hours';

-- Sample newly ingested organizations
SELECT org.id, org.name, COUNT(p.id) as post_count
FROM organizations org
LEFT JOIN postings p ON org.id = p.organization_id
WHERE org.created_at > now() - interval '24 hours'
GROUP BY org.id, org.name
ORDER BY post_count DESC
LIMIT 30;
```

---

## Scope Boundaries (What This Pilot Does NOT Include)

This pilot is **not** the full DATA track. It does NOT include:

1. **DATA-000 (Bounded Audit):** Comprehensive survey of all 1,612 organizations
2. **DATA-001–DATA-005:** Population work, deduplication, hierarchy resolution
3. **ORG-001B:** Formal organization registry with sector, hierarchy, historical names
4. **Manual review of legacy rows:** The ~125 existing weak organizations remain in their current state
5. **Heuristic fixes for title-derived org names:** Candidates remain candidates

**Pilot scope:** Write-path fix + alias table for top 30 orgs, demonstrated on Category A ingest.

---

## Success Criteria (Pilot Completion)

✅ **Alias table populated** with top 30 organizations and ≥100 aliases  
✅ **Dry-run passes:** ≥87% of test dataset resolves to ALIAS/EXISTING, <100 candidates held  
✅ **5 test recruitments ingested:** All produce posting records with organization_id set  
✅ **Schema.org validation:** 10-spot check shows no fabricated facts, proper null handling  
✅ **Production push clean:** No errors, organization_aliases table used as expected  

---

## Next Steps After Pilot

### Immediate (after Day 5)
- Document pilot results in a closure report
- Measure user impact: posts discoverable via correct organization, search performance, GA4

### Medium-term (Week 2)
- Owner decides: approve for scale-up (ingest all 1,612 official notifications) or rework

### Long-term (Phase 2)
- Full DATA track (if approved): audit → population → hierarchy
- Or: smaller incremental fixes based on pilot learnings

---

## Files & Artifacts

### To Create (this task)
1. `20261016_org_quality_001_canonical_aliases.sql` (migration)
2. `REPLACEMENT_PILOT_DRY_RUN_RESULTS.md` (validation report)
3. `REPLACEMENT_PILOT_TEST_RECRUITMENTS.md` (test dataset details)

### To Modify (minimal)
- None (write path already supports this)

### To Review (reference)
- `src/db/operations/write-postings-v2.ts` (lines 331–370)
- `src/ingest/organization-resolution.ts` (loadOrgIndex, resolveOrganization)

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Alias table miss (new org name not covered by alias) | Dry-run identifies gaps; extend aliases for any org name in top 50 |
| Production performance impact | Migration uses indexed lookup (alias_normalized); no sequential scan |
| Candidates held unexpectedly | Dry-run reports help identify unmapped variants; add more aliases |
| Legacy candidates still in queue | Out of scope; handled by future Phase 2 audit |

---

## Timeline & Ownership

| Phase | Days | Owner | Deliverable |
|-------|------|-------|-------------|
| 1: Prep | 1–1.5 | Claude | Alias seed SQL |
| 2: Validate | 1.5–2.5 | Claude | Dry-run report + test recruitment list |
| 3: Write-path fix | 2–3 | Claude | Migration applied to staging |
| 4: Pilot test | 3–4 | Claude | Pilot results + spot-check validation |
| 5: Production | 4–5 | Architect | Approval + production push |
| **Total** | **5 days** | | |

---

## Appendix: Top 30 Organizations (Complete List)

See `top_30_orgs.txt` for full names and rankings.

**Canonical aliases to seed (sample):**

```
BPSC → ["BPSC", "Bihar Public Service Commission", "BPSC BIHAR"]
UPESSC → ["UPESSC", "UP Education Service Selection Commission"]
JSSC → ["JSSC", "Jharkhand Staff Selection Commission"]
TNPSC → ["TNPSC", "Tamil Nadu Public Service Commission"]
APPSC → ["APPSC", "Andhra Pradesh Public Service Commission"]
RRB → ["RRB", "Railway Recruitment Board", "Railway Recruitment Boards"]
Canara Bank → ["Canara Bank", "CANARA"]
... (27 more)
```

---

**Document Owner:** Architect  
**Status:** Approved 2026-10-15, Ready for Implementation  
**Revision:** 1.0
