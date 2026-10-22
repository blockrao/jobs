# Phase 5: Testing & Validation — Complete Guide

**Status**: Ready for Execution  
**Duration**: 1-2 hours (implementation + validation)  
**Goal**: Prevent regressions and ensure data completeness never drops below 75%

---

## Overview

Phase 5 implements three levels of testing:

1. **Unit Tests** — Verify data completeness metrics
2. **CI/CD Automation** — Run tests on every commit
3. **Monitoring** — Track completeness over time

---

## Testing Strategy

### Test Suite: `completeness.test.ts`

**Location**: `src/components/recruitment/__tests__/completeness.test.ts`

**What it Tests**:

#### 1. Salary Data Completeness
- ✅ At least 50% of recruitments have `salary_note`
- ✅ At least 30% have structured `salary_breakdown`
- ✅ No completely empty salary fields

#### 2. Timeline Data Completeness
- ✅ At least 20% have admit card or interview dates
- ✅ At least 10% have interview dates
- ✅ Valid date formats

#### 3. Posting Locations Completeness
- ✅ At least 80% of posts have locations
- ✅ No orphaned location records
- ✅ Valid city/state values

#### 4. Cutoff Marks Completeness
- ✅ At least 50% of recruitments have cutoff marks
- ✅ No orphaned cutoff records
- ✅ Valid cutoff ranges (0-1000)
- ✅ All 5 categories for major exams

#### 5. Data Integrity
- ✅ No duplicate entries
- ✅ Valid timestamp formats
- ✅ Foreign key constraints respected

#### 6. Overall Score
- ✅ **Minimum 75% completeness required**
- Logs detailed metrics for monitoring

---

## Running Tests Locally

### Prerequisites
```bash
# Install dependencies
npm install

# Setup test database
DATABASE_URL=postgresql://localhost:5432/joboye_test npm run test:setup
```

### Run Completeness Tests
```bash
# Run once
npm run test -- completeness.test.ts

# Run with verbose output
npm run test -- completeness.test.ts --reporter=verbose

# Run in watch mode (auto-rerun on changes)
npm run test:watch -- completeness.test.ts

# Generate coverage report
npm run test -- completeness.test.ts --coverage
```

### Run All Tests
```bash
npm run test
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/data-completeness-check.yml`

**What it Does**:
1. Runs on every push to `main`/`develop`
2. Runs on all pull requests
3. Runs daily at 2 AM UTC (catch data drift)
4. Creates test report as artifact
5. Comments on PRs with results
6. Fails pipeline if completeness drops below 75%

**Trigger Paths**:
- `src/db/**` (schema changes)
- `src/components/recruitment/**` (UI changes)
- `supabase/migrations/**` (data migrations)

**Workflow Steps**:
```
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Setup test database
5. Apply migrations
6. Run completeness tests
7. Generate report
8. Upload artifacts
9. Comment PR (if PR)
10. Check pass/fail
```

---

## Test Results Interpretation

### Output Example
```
=== DATA COMPLETENESS METRICS ===
Total Recruitments: 2841
With Salary Note: 1976 (69.6%)
With Salary Breakdown: 852 (30.0%)
With Admit Card Date: 412 (14.5%)
With Interview Date: 298 (10.5%)
Posts with Locations: 3294/4116 (80.0%)
Recruitments with Cutoffs: 1523/2841 (53.6%)
===================================

✅ All tests passed
✅ Overall completeness: 75.4%
```

### Interpreting Failures
```
❌ Test failed: "should have salary_note for at least 50%"
- Current: 48%
- Required: 50%
- Action: Add more salary data or adjust threshold

❌ Test failed: "should have posting locations for at least 80%"
- Current: 72%
- Required: 80%
- Action: Run location seeding again or fix orphaned records
```

---

## Adding New Tests

### Template
```typescript
it('should verify [feature]', async () => {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(sql`condition`);
  
  expect(result[0]?.count || 0).toBeGreaterThanOrEqual(expectedCount);
});
```

### Steps
1. Add test to `completeness.test.ts`
2. Set reasonable threshold (70-80% for quality metrics)
3. Add to CI/CD workflow if needed
4. Document in this guide

---

## Monitoring & Alerting

### Dashboard Metrics
Track over time:
- Salary completeness %
- Location coverage %
- Cutoff mark coverage %
- Overall completeness %

### Alert Thresholds
- ⚠️ **Yellow**: Completeness drops below 80%
- 🔴 **Red**: Completeness drops below 75%
- 🟢 **Green**: Completeness at or above 75%

### Scheduled Monitoring
Daily 2 AM UTC run captures:
- Trend in completeness
- Data drift detection
- Missing field counts
- Orphaned record counts

---

## Regression Prevention

### What Gets Tested
1. **Schema Changes** — Do new migrations break completeness?
2. **UI Changes** — Are all fields being displayed?
3. **Data Changes** — Is seeded data consistent?

### How It Works
```
Developer makes a change
           ↓
Commit triggers CI/CD workflow
           ↓
Database migrations applied
           ↓
Completeness tests run
           ↓
If completeness < 75%: FAIL (block merge)
If completeness ≥ 75%: PASS (allow merge)
           ↓
Report generated and posted to PR
```

---

## FAQ

### Q: Why 75% as the threshold?
**A**: Phase 4 brought us to 75% completeness. The tests prevent regression below this level. As we add more data in future phases, thresholds can be raised.

### Q: What if the test fails?
**A**: 
1. Check the PR comment for which metric failed
2. Run `npm run test -- completeness.test.ts` locally
3. Either add missing data or adjust the threshold
4. Re-run test to verify
5. Push to re-trigger CI/CD

### Q: How often should I run these tests?
**A**:
- **Local**: Before committing schema/UI changes
- **CI/CD**: Automatically on every commit
- **Monitoring**: Daily at 2 AM UTC (scheduled job)

### Q: Can I skip the tests?
**A**: No. The tests are required in CI/CD. If needed, adjust the threshold, but don't disable the tests.

### Q: How do I interpret the metrics?
**A**: Each metric shows "[current]/[total] ([percentage]%)". The percentage must meet the threshold shown in the test name.

---

## Next Steps

### After Phase 5 Setup
1. Commit test suite and CI/CD workflow
2. Run tests locally to verify they pass
3. Create PR and confirm CI/CD runs
4. Monitor test results over time
5. Proceed to Phase 6: Monitoring & Audit

### Phase 6 Will Add
- Monthly audit script
- Completeness dashboard
- Slack alerts
- Trend analysis

---

## Files

| File | Purpose | Lines |
|------|---------|-------|
| completeness.test.ts | Test suite | 280+ |
| data-completeness-check.yml | CI/CD workflow | 80+ |
| PHASE_5_TESTING_GUIDE.md | This guide | - |

---

## Success Criteria

✅ All tests pass  
✅ Overall completeness ≥ 75%  
✅ No orphaned records  
✅ No data integrity issues  
✅ CI/CD workflow running  
✅ PR comments working  

---

**Status**: Phase 5 ready to implement  
**Prepared**: 2026-10-22  
**By**: Claude Haiku 4.5
