# URL Redirect Fix - Testing Instructions

## Overview
This document provides step-by-step instructions to verify the slug redirect fix is working correctly before deployment.

**Estimated time**: 15-20 minutes for full verification

---

## Phase 1: Automated Test Suite (5 minutes)

### Prerequisites
- Node.js 18+ installed
- `npm install` already ran
- You can modify files and run scripts

### Run Tests

```bash
# Start the dev server (in one terminal)
cd /home/claude/jobs
npm run dev

# Wait for "ready - started server on 0.0.0.0:3000"
# Then in another terminal:

cd /home/claude/jobs
node test-url-redirect-fix.mjs
```

### Expected Output

```
[INFO] Starting URL redirect fix verification
[INFO] Base URL: http://localhost:3000

[INFO] TEST 1: Legacy slug redirect via recruitment_slug_redirects table
[SUCCESS] Legacy slug redirect works correctly

[INFO] TEST 2: New sequential slug returns 200 with correct canonical
[SUCCESS] New slug returns correct status without unexpected redirects

[INFO] TEST 3: Invalid slug returns 404 (no smart resolver fallback)
[SUCCESS] All invalid slugs return 404

[INFO] TEST 4: No circular redirect chains
[SUCCESS] No circular redirects (chain length: 1)

[INFO] TEST 5: Sample 20 random recruitment URLs
  Passed: 20/20
  Failed: 0/20
[SUCCESS] (test result)

============================================================
TEST SUMMARY
============================================================
[GREEN] PASS: Legacy Slug Redirect
[GREEN] PASS: New Sequential Slug
[GREEN] PASS: Invalid Slug 404
[GREEN] PASS: No Circular Redirects
[GREEN] PASS: Sample Sitemap URLs

Results: 5/5 tests passed
```

**If any test fails**: Review the error message and check the code changes in next.config.ts and get-recruitments.ts.

---

## Phase 2: Manual Spot Checks (10 minutes)

### 1. Test New Sequential Slug (Should 200, no redirects)

```bash
# In your terminal with the dev server running:
curl -i -L http://localhost:3000/jobs/org33-2026-0004

# Expected response:
# HTTP/1.1 200 OK
# (should NOT have 308/301/302 redirects)
# HTML content with the correct job title
```

**What to verify**:
- [ ] Status is 200 (not 301/308/etc)
- [ ] URL bar shows `/jobs/org33-2026-0004` (no redirect)
- [ ] Page title contains job name
- [ ] No "wrong job" content

### 2. Test Invalid Slug (Should 404)

```bash
curl -i http://localhost:3000/jobs/fake-slug-that-does-not-exist

# Expected response:
# HTTP/1.1 404 Not Found
# (should NOT redirect to any other page)
```

**What to verify**:
- [ ] Status is 404 (not 200)
- [ ] No redirect to another page
- [ ] Error message displays

### 3. Test Legacy Slug Redirect (Should 301 then 200)

```bash
curl -i -L http://localhost:3000/jobs/isro-iprc-recruitment-2026-d061d5

# Expected response:
# HTTP/1.1 301 Moved Permanently
# Location: /jobs/org5-2026-0001
# 
# Then:
# HTTP/1.1 200 OK
# (final page with correct job)
```

**What to verify**:
- [ ] First response is 301 (not 308)
- [ ] Location header points to new canonical slug
- [ ] Final page returns 200
- [ ] Final page shows correct recruitment (not wrong one)

### 4. Test Homepage Cards Link to Correct Jobs

```bash
# 1. Open http://localhost:3000 in browser
# 2. Look at the "Recently Added Jobs" or "Featured Jobs" cards
# 3. Click 3-4 job cards
# 4. Verify each one shows the correct job (title matches card)
```

**What to verify**:
- [ ] Job cards link to correct URLs
- [ ] Each page loads without redirects
- [ ] Job title on page matches card title
- [ ] No 404 or wrong job pages

### 5. Test Multiple Redirect Checks

Use curl with verbose output to see the full redirect chain:

```bash
# Test: New slug (should have no redirects)
curl -v http://localhost:3000/jobs/org33-2026-0004 2>&1 | grep -E "^[<>]"
# Expected: Only one request, no 3xx responses

# Test: Old slug (should have exactly 1 redirect)
curl -v http://localhost:3000/jobs/isro-iprc-recruitment-2026-d061d5 2>&1 | grep -E "^[<>]"
# Expected: Two requests (301 then 200)
```

---

## Phase 3: Browser Testing (5 minutes)

### Test in Browser

1. **Open http://localhost:3000**
   - [ ] Homepage loads without errors
   - [ ] Job cards are visible
   - [ ] Search works

2. **Click on a job card**
   - [ ] Page loads with correct job title
   - [ ] URL is `/jobs/org-xxxxx-yyyy-zzzz` (new format)
   - [ ] No redirect visible (URL doesn't change)

3. **Click on a post/position**
   - [ ] Post page loads with correct job context
   - [ ] Breadcrumbs show correct recruitment

4. **Test invalid URL directly**
   - Open: `http://localhost:3000/jobs/fake-url`
   - [ ] Get 404 error page
   - [ ] Can navigate back home

---

## Phase 4: Sitemap Verification (Optional, thorough)

If you want to test more comprehensively:

```bash
# 1. Download and analyze sitemap
curl http://localhost:3000/sitemap.xml > sitemap.xml

# 2. Extract all job URLs
grep -oP '/jobs/[^<]+' sitemap.xml | sort | uniq > job-urls.txt

# 3. Test a sample of 50 URLs
head -50 job-urls.txt | while read url; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$url")
  if [ "$status" != "200" ] && [ "$status" != "301" ]; then
    echo "FAIL: $url returned $status"
  fi
done

# Should have minimal or zero FAIL entries
```

---

## What Success Looks Like

✓ Automated tests: 5/5 pass
✓ New slugs: 200 OK, no redirects
✓ Invalid slugs: 404 Not Found
✓ Legacy slugs: 301 → canonical slug → 200
✓ Homepage cards: All link to correct jobs
✓ Redirect chains: No loops, max 1 hop (except legacy → canonical)
✓ No unexpected 404s or 308 errors

---

## If Tests Fail

### Symptom: "New slug returns 301 or 308"

**Check**: Is the dev server running with the latest code?
```bash
# Kill dev server
Ctrl+C

# Pull latest
git fetch origin main
git checkout main

# Restart
npm run dev
```

### Symptom: "Invalid slugs return 200 instead of 404"

**Check**: Are you running the latest code changes?
- Verify `src/db/operations/get-recruitments.ts` has the smart-resolver removed
- Verify next.config.ts doesn't have the regex rule

```bash
# Verify changes are in place
git diff HEAD~1 next.config.ts
git diff HEAD~1 src/db/operations/get-recruitments.ts
# Should show the removals
```

### Symptom: "Old slug doesn't redirect to canonical"

**Check**: Is the slug in the recruitment_slug_redirects table?
```sql
SELECT old_slug, new_slug FROM recruitment_slug_redirects 
WHERE old_slug = 'isro-iprc-recruitment-2026-d061d5'
LIMIT 1;
```

If not found, the slug needs to be added to the redirect table during data migration.

---

## Ready to Deploy?

**Checklist**:
- [ ] Automated test suite passes (5/5)
- [ ] Manual curl tests pass (all expected status codes)
- [ ] Homepage job cards tested (work correctly)
- [ ] Browser testing done (no unexpected behavior)
- [ ] No redirect loops detected
- [ ] Old URLs still redirect to canonical (301)

**Once all checks pass**:
```bash
# Build
npm run build

# Deploy
vercel deploy
```

---

## Troubleshooting

### "Cannot reach http://localhost:3000"
- Ensure `npm run dev` is actually running and shows "ready - started server on 0.0.0.0:3000"
- Try `curl http://localhost:3000` directly to confirm

### "Test script crashes"
- Make sure you have `node-fetch` available: `npm ls node-fetch`
- Test was written for Node 18+: `node --version`

### "Some tests show FAIL but I think they should pass"
- Check the database has recruitment data
- Check the redirect table has legacy slug mappings
- Verify the dev server has fresh data (might need to rebuild indexes)

---

## Questions?

Refer to:
- `SLUG_FIX_IMPLEMENTATION_COMPLETE_2026_10_24.md` - detailed technical docs
- `SLUG_CORRUPTION_ROOT_CAUSE_ANALYSIS_2026_10_24.md` - root cause forensics
- Commit cea6dab - exact code changes made
