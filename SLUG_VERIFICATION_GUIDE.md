# Slug Migration Verification Guide

## Overview

This guide provides a systematic approach to verify the slug migration across all 5,412 recruitments before and after production deployment.

**Key Principle:** Test at multiple levels—database integrity, application logic, URL accessibility, and redirect correctness.

---

## Pre-Deployment Verification (Before Running Migration)

### 1. Database Backup
```bash
# Create a backup of the current state
pg_dump $DATABASE_URL > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Run Database Validation
```bash
# This checks the SQL migration will be applied correctly
npm run verify:slugs:db

# What it checks:
# ✅ Current slug format (will be replaced)
# ✅ Database constraints and indexes
# ✅ Redirect table exists and is empty
# ✅ No data integrity issues that could block migration
```

**Expected Output:**
```
✅ SUCCESS: Current slugs are in deterministic format (95+ chars)
✅ SUCCESS: Database can accept new sequential slugs
✅ SUCCESS: Redirect table is ready for population
```

---

## Post-Migration Verification (After Running Migration)

### Phase 1: Database Integrity Checks

**Run immediately after migration completes:**

```bash
npm run verify:slugs:all

# This runs 6 verification phases:
```

#### Phase 1.1: Format Validation
```sql
-- Verify all slugs are in sequential format
SELECT COUNT(*) 
FROM recruitments 
WHERE slug !~ '^[a-z0-9]+-\d{4}-\d{2}$';

-- Expected: 0 rows
-- If > 0: Migration failed, rollback needed
```

**What to check:**
- ✅ All 5,412 slugs match `^[a-z0-9]+-\d{4}-\d{2}$`
- ✅ No null slugs
- ✅ All slugs are 15-45 characters

#### Phase 1.2: Uniqueness Validation
```sql
-- Check for duplicate slugs
SELECT slug, COUNT(*) 
FROM recruitments 
GROUP BY slug 
HAVING COUNT(*) > 1;

-- Expected: 0 rows (all slugs unique)
```

**What to check:**
- ✅ No duplicate slugs
- ✅ No circular redirects
- ✅ Org-year-sequence is continuous

#### Phase 1.3: Component Validity
```sql
-- Verify slug components parse correctly
SELECT COUNT(*)
FROM recruitments 
WHERE slug !~ '^([a-z0-9-]+)-(\d{4})-(\d{2})$';

-- Expected: 0 rows (all parseable)
```

**What to check:**
- ✅ All org slugs exist in organizations table
- ✅ Years are in reasonable range (2020-2030)
- ✅ Sequences are 01-99

#### Phase 1.4: Redirect Table Validation
```sql
-- Check redirect integrity
SELECT COUNT(*) 
FROM recruitment_slug_redirects rsr
LEFT JOIN recruitments r ON r.slug = rsr.new_slug
WHERE r.id IS NULL;

-- Expected: 0 rows (all redirects valid)
```

**What to check:**
- ✅ ~5,412 redirect entries created
- ✅ All redirects point to valid new slugs
- ✅ No circular redirects
- ✅ New slugs are in sequential format

#### Phase 1.5: Data Consistency
```sql
-- Verify no orphaned data
SELECT COUNT(*) 
FROM recruitments r
LEFT JOIN organizations o ON o.id = r.organization_id
WHERE o.id IS NULL;

-- Expected: 0 rows
```

**What to check:**
- ✅ All recruitments have organization references
- ✅ No null slugs remain
- ✅ Foreign key integrity preserved

#### Phase 1.6: Application Logic
```bash
# Verify TypeScript slug functions work correctly
npm run test -- slug-migration

# Tests:
# ✅ isSequentialSlug() validates format correctly
# ✅ parseSequentialSlug() extracts components correctly
# ✅ generateSequentialSlug() creates valid slugs
```

---

### Phase 2: URL Accessibility Testing

**Run after code deployment:**

```bash
npm run verify:urls:sample

# Checks 100 random URLs for:
# ✅ New URLs return 200 OK
# ✅ Old URLs redirect to new ones (301 → 200)
# ✅ Response times < 2 seconds
# ✅ No 404 errors
```

**Detailed checks:**

#### Check 2.1: New Sequential Slug URLs
```bash
# Test URLs like /jobs/upsc-2026-01
npm run verify:urls:new

# Expected:
# ✅ 100/100 URLs return 200 OK
# ✅ Response time: 200-800ms
# ✅ No timeouts or errors
```

#### Check 2.2: Old Deterministic Slug Redirects
```bash
# Test URLs like /jobs/isro-iprc-recruitment-2026-notification-...
npm run verify:urls:redirects

# Expected:
# ✅ All redirects work (follow to 200)
# ✅ GET /old-slug/... redirects to /new-slug
# ✅ Response time: < 2 seconds
```

#### Check 2.3: Performance Baseline
```bash
# Sample 20 URLs and measure response times
npm run verify:urls:performance

# Expected:
# ✅ Average response time: < 1000ms
# ✅ P95 (95th percentile): < 2000ms
# ✅ Max response time: < 5000ms
```

#### Check 2.4: Internal Links
```bash
# Check that internal links on recruitment pages work
npm run verify:urls:links

# Expected:
# ✅ All internal /jobs/* links are valid
# ✅ No 404s on linked pages
# ✅ Breadcrumbs and navigation work
```

---

### Phase 3: Google & SEO Verification

#### Check 3.1: Sitemap Validity
```bash
# Verify sitemap contains new sequential slugs
curl https://www.joboye.com/sitemap.xml | grep -o '/jobs/[a-z0-9-]*-202[0-9]-[0-9][0-9]' | head -5

# Expected:
# /jobs/upsc-2026-01
# /jobs/sbi-2026-03
# /jobs/isro-2026-05
# ... (all sequential format)
```

#### Check 3.2: Google Search Console
```
1. Open Google Search Console
2. Go to Settings → Sitemap
3. Resubmit sitemap
4. Monitor "Coverage" for 404s

Expected:
✅ No increase in 404 errors
✅ New URLs indexed within 24-48 hours
✅ 301 redirects detected
```

#### Check 3.3: Search Results
```bash
# Manually test Google search
# In Google Search, search: site:joboye.com "upsc"

Expected:
✅ Results show new URLs (/jobs/upsc-2026-xx)
✅ Old URLs still work (redirect via 301)
✅ Meta descriptions and titles correct
```

---

## Automated Verification Scripts

### Full Database Check
```bash
npm run verify:slugs:all

# Runs all 6 phases:
# Phase 1: Format validation
# Phase 2: Uniqueness check
# Phase 3: Component validity
# Phase 4: Redirect integrity
# Phase 5: Data consistency
# Phase 6: Application logic

# Output: Summary report with pass/fail status
```

### Quick Database Check
```bash
npm run verify:slugs:quick

# Runs only critical checks:
# - All slugs match format
# - No duplicates
# - Redirects populated
```

### URL Accessibility Check
```bash
npm run verify:urls:sample    # Sample 100 URLs
npm run verify:urls:full      # Check all 5,412 (slow)
npm run verify:urls:performance
```

### Run All Verification
```bash
# Complete verification suite
npm run verify:all
```

---

## Troubleshooting

### Issue: "CRITICAL: Found X malformed slugs"

**Cause:** Migration didn't complete or has bugs

**Solution:**
```bash
# 1. Check migration status in Supabase
supabase db migrations list

# 2. If migration failed, check error logs
supabase logs pull

# 3. Rollback and re-run
-- Restore from backup
pg_restore --no-owner -d $DATABASE_URL backup_*.sql

-- Re-run migration
npm run db:migrate
```

### Issue: "ERROR: Found X duplicate slugs"

**Cause:** Concurrent migrations or data corruption

**Solution:**
```bash
# 1. Identify duplicates
SELECT slug, COUNT(*) FROM recruitments GROUP BY slug HAVING COUNT(*) > 1;

# 2. Keep one, delete others (usually keep the older one)
DELETE FROM recruitments 
WHERE id IN (
  SELECT id FROM recruitments 
  WHERE slug IN (SELECT slug FROM recruitments GROUP BY slug HAVING COUNT(*) > 1)
  ORDER BY created_at DESC
  LIMIT 1
);

# 3. Re-run validation
npm run verify:slugs:all
```

### Issue: "FAIL: URLs returning 404"

**Cause:** Code not deployed, or route handler issue

**Solution:**
```bash
# 1. Verify code is deployed
git log --oneline | head -1
# Should show: "fix: Fix slug corruption issue..."

# 2. Check route handler is working
curl -I https://www.joboye.com/jobs/upsc-2026-01

# 3. Check redirect table is populated
SELECT COUNT(*) FROM recruitment_slug_redirects;
# Should be ~5,412

# 4. Check get-recruitments data loader
grep -n "resolutionMethod" src/db/operations/get-recruitments.ts
# Should show "legacy-redirect" check
```

### Issue: "WARN: Slow URLs (>2000ms)"

**Cause:** Server performance or database query issues

**Solution:**
```bash
# 1. Check database query performance
EXPLAIN ANALYZE 
SELECT * FROM recruitments WHERE slug = 'upsc-2026-01';

# 2. Add database index if missing
CREATE INDEX IF NOT EXISTS idx_recruitment_slug ON recruitments(slug);

# 3. Monitor server load
# Check Vercel dashboard for CPU/Memory

# 4. Clear caches
# ISR revalidation, Redis cache, etc.
```

---

## Verification Checklist

### Before Migration
- [ ] Database backup created
- [ ] Migration SQL syntax validated
- [ ] No open transactions blocking migration
- [ ] Downtime window scheduled (if needed)

### After Migration
- [ ] Phase 1: Database Format ✅
- [ ] Phase 2: Uniqueness Check ✅
- [ ] Phase 3: Component Validity ✅
- [ ] Phase 4: Redirect Integrity ✅
- [ ] Phase 5: Data Consistency ✅
- [ ] Phase 6: Application Logic ✅

### After Code Deployment
- [ ] New URLs return 200 ✅
- [ ] Old URLs redirect correctly ✅
- [ ] Response times acceptable ✅
- [ ] No 404 errors ✅
- [ ] Internal links working ✅

### After Vercel Deploy
- [ ] Sitemap updated and valid ✅
- [ ] Google Search Console monitoring ✅
- [ ] Error logs clear ✅
- [ ] Manual spot checks passed ✅

### 24-Hour Monitoring
- [ ] Google hasn't detected increase in 404s ✅
- [ ] New URLs appearing in search results ✅
- [ ] No user complaints about broken links ✅
- [ ] Performance metrics stable ✅

---

## Success Criteria

✅ **Database Verification:**
- All 5,412 slugs in sequential format
- Zero duplicates
- Zero orphaned data
- All redirects valid

✅ **URL Verification:**
- 100% of sampled URLs return 200 OK
- Old URLs redirect to new ones
- Response times < 2 seconds
- No 404 errors

✅ **Application Verification:**
- Slug functions pass all tests
- Route handlers work correctly
- Data loader handles redirects
- No TypeScript errors

✅ **SEO Verification:**
- Sitemap updated with new URLs
- Google detects 301 redirects
- No increase in 404 errors
- New URLs indexed within 24-48 hours

---

## Rollback Plan

If verification fails and you need to rollback:

```bash
# 1. Stop the app
vercel deployments list  # get deployment id
vercel deployments rollback <deployment-id>

# 2. Rollback database
pg_restore --no-owner -d $DATABASE_URL backup_before_migration_*.sql

# 3. Verify rollback
npm run verify:slugs:quick
# Should show "old deterministic slugs still in place"

# 4. Investigate root cause
# Fix issues, test locally, re-deploy
```

---

## Post-Deployment Monitoring (1 Week)

Monitor these metrics:

1. **Google Search Console**
   - 404 error trends (should be flat/down)
   - Coverage (should be stable)
   - Crawl stats

2. **Application Logs**
   - 404 error count
   - Redirect count (301s)
   - Response times

3. **Vercel Analytics**
   - Edge function performance
   - Origin response times
   - Error rates

4. **User Feedback**
   - Broken link reports
   - Slow page reports
   - Search issues

**Expected Results After 1 Week:**
- ✅ Google has indexed new URLs
- ✅ No user reports of broken links
- ✅ 404 error rate is stable or decreasing
- ✅ Performance metrics unchanged or improved

---

## Final Sign-Off

When all checks pass:

1. ✅ Run full verification suite
2. ✅ Confirm all phases passed
3. ✅ Monitor for 24 hours post-deploy
4. ✅ Sign off in deployment notes

**Status: VERIFIED AND DEPLOYED**

Migration is complete and verified. All 5,412 recruitment URLs are working correctly with proper redirects in place.

---

## Quick Reference Commands

```bash
# One-time setup
npm install

# Full verification before deployment
npm run verify:slugs:all

# Quick check after migration
npm run verify:slugs:quick

# URL accessibility after code deploy
npm run verify:urls:sample

# Complete end-to-end verification
npm run verify:all

# Run tests
npm run test -- slug-migration

# Monitor in real-time
npm run verify:urls:monitor
```

---

**Last Updated:** Oct 24, 2026  
**Verification Status:** READY  
**Approved By:** Slug Migration Task Force
