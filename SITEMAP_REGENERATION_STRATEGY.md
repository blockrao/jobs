# Sitemap Regeneration & Google Search Console Resubmission

## Status: AUTOMATIC REGENERATION + MANUAL RESUBMISSION

### How It Works

**Good News:** The sitemap is **dynamic**, not static.

- **File:** `src/app/sitemap.ts`
- **Query:** Pulls live data from `recruitments` table on every request
- **Format:** XML, served at `https://www.joboye.com/sitemap.xml`
- **ISR Cache:** 3600 seconds (1 hour) revalidation

### What Happens After Migration

**Timeline:**

1. **SQL Migration Runs** (immediate)
   - All 5,412 recruitment slugs updated to sequential format
   - Database now contains new slugs

2. **Code Deployed** (immediate after)
   - Vercel rebuilds the app
   - `sitemap.ts` code is live

3. **First Sitemap Request** (within seconds)
   - Browser/crawler requests `/sitemap.xml`
   - sitemap.ts queries `recruitments` table
   - **Automatically generates sitemap with NEW sequential slugs**
   - Sitemap cached for 1 hour (ISR revalidate: 3600)

4. **After 1 Hour**
   - ISR revalidation triggered
   - Sitemap refreshed with any new changes

### What the Sitemap Contains

```
<urlset>
  <!-- Static pages -->
  <url>
    <loc>https://www.joboye.com/</loc>
    <lastmod>2026-10-24T13:28:00Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.joboye.com/jobs</loc>
    <priority>0.95</priority>
  </url>

  <!-- NEW: Dynamic recruitment hubs (sequential slugs) -->
  <url>
    <loc>https://www.joboye.com/jobs/upsc-2026-01</loc>
    <lastmod>2026-10-24T12:00:00Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.joboye.com/jobs/sbi-2026-03</loc>
    <lastmod>2026-10-24T11:30:00Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- ... ~5,412 recruitment hub URLs ... -->

  <!-- Post leaf pages -->
  <url>
    <loc>https://www.joboye.com/jobs/upsc-2026-01/probationary-officer</loc>
    <lastmod>2026-10-24T11:45:00Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- ... ~50,000+ post leaf URLs ... -->

  <!-- Organizations -->
  <url>
    <loc>https://www.joboye.com/organizations/upsc</loc>
    <lastmod>2026-10-24T10:00:00Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Exams -->
  <url>
    <loc>https://www.joboye.com/exams/ssc</loc>
    <lastmod>2026-10-24T09:00:00Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>
</urlset>
```

---

## Manual Steps Required

### Step 1: Verify Sitemap Regeneration

**After code deployment, verify the sitemap has new URLs:**

```bash
# Check sitemap contains new sequential slugs
curl -s https://www.joboye.com/sitemap.xml | grep -o '/jobs/[a-z0-9-]*-202[0-9]-[0-9][0-9]' | head -10

# Expected output:
# /jobs/upsc-2026-01
# /jobs/sbi-2026-03
# /jobs/isro-2026-05
# /jobs/railway-2026-02
# ... (all sequential format)

# WRONG OUTPUT (old format):
# /jobs/isro-iprc-recruitment-2026-notification-out-apply-online-d061d5
# ❌ If you see this, sitemap wasn't regenerated yet. Wait 5 mins and retry.
```

**Check sitemap is valid XML:**

```bash
# Validate XML structure
curl -s https://www.joboye.com/sitemap.xml | head -5

# Expected:
# <?xml version="1.0" encoding="UTF-8"?>
# <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
```

**Verify URL count:**

```bash
# Count URLs in sitemap
curl -s https://www.joboye.com/sitemap.xml | grep -c '<url>'

# Expected: ~55,000-60,000 URLs
# (5,412 recruitment hubs + ~50,000 post leaves + org/exam pages)
```

---

### Step 2: Resubmit Sitemap to Google Search Console

**This is a manual, one-time action:**

#### 2A: Go to Google Search Console

1. Open: https://search.google.com/search-console/
2. Select your property: `joboye.com`
3. Left sidebar → **Sitemaps**

#### 2B: Resubmit Sitemap

1. At the top, you'll see existing sitemaps:
   ```
   https://www.joboye.com/sitemap.xml
   ```

2. Click the **trash icon** to remove the old version
3. Click **Add a new sitemap**
4. Enter: `sitemap.xml`
5. Click **Submit**

**Expected feedback:**
```
✅ Sitemap submitted successfully
The new sitemap will be processed in a moment.
```

#### 2C: Wait for Processing

Google will process the sitemap within:
- **Immediately:** GSC shows "Pending" status
- **1-3 minutes:** Shows "Success" (or "Warning" if there are issues)
- **Within 24-48 hours:** New URLs appear in "Coverage" report

---

### Step 3: Monitor Google Search Console

**What to watch:**

#### 3A: Coverage Report
```
Path: Google Search Console → Indexing → Coverage

Expected BEFORE migration:
├─ Indexed ........................ 5,500+
├─ Not indexed ..................... X
├─ Errors .......................... Y
└─ Valid (with warnings) ........... Z

Expected AFTER migration:
├─ Indexed ........................ 5,500+ (same or higher)
├─ Not indexed ..................... X (should decrease)
├─ Errors .......................... 0 (should not increase)
└─ Valid (with warnings) ........... Z (should stay stable)
```

If you see a spike in 404 errors:
- ✅ This is expected initially (Google trying old URLs)
- ✅ Old URLs redirect via 301 (sitemap shows new ones)
- ✅ Google will re-index with new URLs within 24-48 hours

#### 3B: Crawl Statistics
```
Path: Google Search Console → Settings → Crawl statistics

Watch for:
- Requests per day: Should stay consistent
- KB downloaded per day: Should stay consistent
- Time spent downloading: Should stay consistent

Spike expected:
✅ Day 1: Google re-crawls all URLs (old+new)
✅ Day 2-3: Google settles on new URLs
✅ Day 4+: Back to normal crawl frequency
```

#### 3C: URL Inspector
```
For a sample of new URLs, inspect them:

1. Click "URL Inspector" at top
2. Paste: https://www.joboye.com/jobs/upsc-2026-01
3. Check status:
   ✅ "URL is on Google" 
   ✅ "Indexable"
   ✅ "Last crawled: X hours ago"

4. Click "Inspect & Debug"
5. Verify:
   ✅ "Live version is available"
   ✅ No JavaScript errors
   ✅ All properties visible
```

---

### Step 4: Verify Old URLs Still Work

**Google will still crawl old URLs initially. Make sure redirects work:**

```bash
# Test old URL redirects
curl -i https://www.joboye.com/jobs/isro-iprc-recruitment-2026-notification-out-apply-online-d061d5

# Expected:
# HTTP/1.1 301 Moved Permanently
# Location: https://www.joboye.com/jobs/isro-2026-01

# Final destination should be:
curl -L https://www.joboye.com/jobs/isro-iprc-recruitment-2026-notification-out-apply-online-d061d5

# Should return:
# HTTP/1.1 200 OK
# (content of /jobs/isro-2026-01)
```

---

## Timeline

### Immediate (0-5 minutes after code deploy)
```
✅ Sitemap.ts code is live on Vercel
✅ First `/sitemap.xml` request triggers regeneration
✅ Sitemap now contains new sequential slugs
```

### Short-term (5 minutes - 24 hours)
```
✅ You resubmit sitemap to Google Search Console
✅ Google processes new sitemap
✅ Google re-crawls all URLs
✅ Google detects 301 redirects
✅ Some old 404s in GSC (normal, being redirected)
```

### Medium-term (24-48 hours)
```
✅ New URLs indexed in Google
✅ Old URLs still indexed (pointing to new via 301)
✅ Google updates internal links
✅ Search results show new URLs
```

### Long-term (1 week+)
```
✅ Old URLs gradually deprioritized
✅ New URLs become primary in search results
✅ Old URLs eventually removed from index (can be accelerated via GSC)
✅ Normal crawl frequency resumes
```

---

## Checklist: Sitemap Resubmission

### Pre-Deployment
```bash
□ Verify current sitemap works
  curl https://www.joboye.com/sitemap.xml | head -5

□ Note current sitemap size
  curl -s https://www.joboye.com/sitemap.xml | wc -l

□ Verify it has old deterministic slugs
  curl -s https://www.joboye.com/sitemap.xml | grep isro-iprc
```

### Post-Code Deployment (5-10 minutes after Vercel deploy)
```bash
□ Verify sitemap regenerated with new slugs
  curl -s https://www.joboye.com/sitemap.xml | grep 'upsc-2026-01'
  → Expected: Found

□ Verify URL count is similar
  curl -s https://www.joboye.com/sitemap.xml | grep -c '<url>'
  → Expected: ~55,000-60,000 (same as before)

□ Spot-check a few new URLs
  curl -I https://www.joboye.com/jobs/upsc-2026-01
  → Expected: 200 OK

□ Spot-check old URL redirects
  curl -I https://www.joboye.com/jobs/isro-iprc-recruitment-2026-d061d5
  → Expected: 301 redirect
```

### Manual: Google Search Console (Within 1 hour after code deploy)
```bash
□ Go to Google Search Console
  https://search.google.com/search-console/

□ Select joboye.com property

□ Navigate to Sitemaps section
  Left sidebar → Sitemaps

□ Remove old sitemap (click trash icon)

□ Add new sitemap
  Click "Add a new sitemap"
  Enter: sitemap.xml
  Click "Submit"

□ Verify submission successful
  Status should show "Success" or "Pending"
```

### Post-Submission Monitoring (24-48 hours)
```bash
□ Check Coverage report
  Path: Google Search Console → Coverage
  Expected: Indexed count stable or increasing

□ Monitor for 404 errors
  If spike appears: Normal, being redirected via 301
  Should decline after 24-48 hours

□ Check if new URLs appear in search results
  Manually search "upsc government jobs"
  Look for joboye.com results

□ Verify URL Inspector for sample new URLs
  Path: Google Search Console → URL Inspector
  Paste: https://www.joboye.com/jobs/upsc-2026-01
  Expected: "URL is on Google" ✅
```

### Week 1 Monitoring
```bash
□ GSC Coverage: 404 errors declining
□ New URLs appearing in search results
□ Old URLs still accessible via redirect
□ Performance metrics stable
```

---

## Important Notes

### ✅ What's Automatic
- Sitemap regeneration (Next.js dynamic route)
- New URLs added to sitemap
- ISR cache invalidation after 1 hour

### ❌ What Requires Manual Action
- **Resubmitting sitemap to Google Search Console** (this is the human step)
- Google cannot auto-detect that sitemap.xml changed
- You must tell Google via GSC UI

### 🚨 If Sitemap Still Shows Old URLs

**Problem:** Sitemap regenerated 1+ hour ago but still shows old slugs

**Diagnosis:**
```bash
# Check when sitemap was cached
curl -i https://www.joboye.com/sitemap.xml | grep -i date

# Check current time
date -u

# If dates match: Sitemap is fresh
# If sitemap date is old: ISR cache not invalidated yet
```

**Solution:**
```bash
# Option 1: Wait 1 hour for ISR revalidation
# (ISR cache: 3600 seconds)

# Option 2: Purge Vercel cache immediately
# In Vercel dashboard → Settings → Cache
# Click "Clear All Cache"
# Wait 2-3 minutes
# Verify sitemap updated

# Option 3: Force regeneration via code
# Deploy a small change to sitemap.ts (e.g., comment)
# This triggers immediate regeneration
```

---

## Expected Sitemap Changes

### Before Migration
```xml
<urlset>
  <!-- Recruitment hub URLs (old format) -->
  <url>
    <loc>https://www.joboye.com/jobs/isro-iprc-recruitment-2026-notification-out-apply-online-for-22-fireman-technician-more-posts-d061d5</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- ... 5,412 long URLs ... -->
</urlset>
```

### After Migration & Resubmission
```xml
<urlset>
  <!-- Recruitment hub URLs (new sequential format) -->
  <url>
    <loc>https://www.joboye.com/jobs/isro-2026-05</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.joboye.com/jobs/upsc-2026-01</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- ... 5,412 short URLs ... -->
</urlset>
```

### Google's View (24-48 hours after resubmission)
```
Old URLs:
  https://www.joboye.com/jobs/isro-iprc-recruitment-2026-d061d5
  └─ 301 Redirect →
  └─ https://www.joboye.com/jobs/isro-2026-05
     └─ Status: Indexed
        Canonical: https://www.joboye.com/jobs/isro-2026-05
```

---

## Summary

**Process:**
1. ✅ **Automatic:** Migration runs → Sitemap auto-regenerates with new slugs
2. ✅ **Automatic:** Code deploys → Vercel serves updated sitemap.xml
3. ❌ **Manual:** You resubmit sitemap to Google Search Console
4. ✅ **Automatic:** Google re-crawls and re-indexes new URLs
5. ✅ **Automatic:** 301 redirects preserve SEO value

**Your one job:** Resubmit the sitemap to GSC (5-minute task)

**Timing:** Do this within 1 hour after code deployment for fastest indexing.

---

## Verification Script

To automate sitemap health checks:

```bash
#!/bin/bash
# Check sitemap is serving new URLs

echo "Fetching sitemap..."
SITEMAP=$(curl -s https://www.joboye.com/sitemap.xml)

echo "Checking for new sequential slugs..."
SEQUENTIAL_COUNT=$(echo "$SITEMAP" | grep -o '/jobs/[a-z0-9-]*-202[0-9]-[0-9][0-9]' | wc -l)

echo "Checking for old deterministic slugs..."
DETERMINISTIC_COUNT=$(echo "$SITEMAP" | grep -c 'isro-iprc\|recruitment.*notification')

echo ""
echo "Results:"
echo "  ✅ New sequential slugs found: $SEQUENTIAL_COUNT"
echo "  ✅ Old deterministic slugs: $DETERMINISTIC_COUNT"
echo "  ✅ Total URLs: $(echo "$SITEMAP" | grep -c '<url>')"

if [ $SEQUENTIAL_COUNT -gt 4000 ] && [ $DETERMINISTIC_COUNT -eq 0 ]; then
  echo ""
  echo "✅ SITEMAP REGENERATED SUCCESSFULLY"
  echo "Ready to resubmit to Google Search Console"
else
  echo ""
  echo "❌ SITEMAP NOT YET REGENERATED"
  echo "Wait 5-10 minutes and try again"
fi
```

---

**Status: AUTOMATIC REGENERATION CONFIRMED**

The sitemap will automatically contain the new sequential slugs within seconds of code deployment. Your only manual task is resubmitting it to Google Search Console.
