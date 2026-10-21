# GOOGLE SEARCH CONSOLE SETUP & SITEMAP SUBMISSION GUIDE

**For:** JobOye Site (joboye.com)  
**Purpose:** Get 28 hubs indexed by Google within 24–48 hours  
**Timeline:** 10–15 minutes total setup  

---

## STEP 1: VERIFY DOMAIN IN GSC (5 minutes)

### Go to Google Search Console
- URL: https://search.google.com/search-console
- Sign in with Google account (same as joboye.com Gmail)

### Add Property
- Click **"+ Create Property"** button (top left)
- Select: **"URL prefix"** tab
- Enter: `https://joboye.com`
- Click **"Continue"**

### Verify Domain

**Option A: HTML File Upload (Recommended if you have admin access)**
1. Download HTML verification file (example: `google1234abcd.html`)
2. Upload to `/public/` folder on Vercel
3. Verify in GSC → Click "Verify" button
4. Result: ✅ Verified

**Option B: DNS TXT Record (If you have DNS access)**
1. GSC provides a TXT record (example: `google-site-verification=abc123xyz...`)
2. Go to your domain registrar (likely Vercel's DNS settings)
3. Add TXT record to DNS
4. Wait 10–30 minutes for DNS propagation
5. Click "Verify" in GSC
6. Result: ✅ Verified

**Option C: HTML Meta Tag (Easiest)**
1. GSC provides meta tag: `<meta name="google-site-verification" content="..." />`
2. Add to `<head>` of `/public/index.html`
3. Click "Verify" in GSC
4. Result: ✅ Verified

---

## STEP 2: SUBMIT SITEMAP (3 minutes)

### Navigate to Sitemap Section
- In GSC (left sidebar) → Click **"Sitemaps"**

### Submit Your Sitemap
- Sitemap URL: `https://joboye.com/sitemap.xml`
- Click **"Submit"** button
- Result: "Sitemap successfully submitted" ✅

### Verify Submission
- Check "Status" column
- You should see: **"1 of 1 indexed"** (or similar)
- This means Google found and processed your sitemap

---

## STEP 3: REQUEST INDEXING (2 minutes)

### Use URL Inspection Tool
- In GSC (left sidebar) → Click **"URL Inspection"**
- Enter: `https://joboye.com/`
- Click "Inspect URL" button

### Request Indexing
- Wait for inspection to complete
- Click **"Request Indexing"** button (if "Indexed" shows red/orange)
- Google will crawl the homepage and follow links to all hubs

---

## STEP 4: MONITOR INDEXING PROGRESS (Oct 23–30)

### Coverage Report
- In GSC (left sidebar) → Click **"Coverage"**
- Look for statistics:
  - **"Indexed"** (green) = Good
  - **"Not indexed"** (orange/red) = Needs attention
  - **"Error"** (red) = Fix immediately

### Expected Timeline
- **Day 1 (Oct 21):** Homepage indexed
- **Day 2–3 (Oct 22–23):** 10–15 hubs indexed
- **Day 4–7 (Oct 24–28):** All 28 hubs indexed
- **Day 8+ (Oct 29+):** Internal linking mesh fully crawled

### What to Look For
- ✅ All 28 hub pages show "Indexed" status
- ✅ sitemap.xml shows as submitted
- ✅ "Crawl stats" shows 200-level responses (no 404s)

---

## STEP 5: PERFORMANCE MONITORING (Ongoing)

### Weekly Check-Ins

**Each Week, Review:**

1. **Coverage Report**
   - Check: Are all 28 hubs indexed?
   - Action: If any show "Not indexed", check why (robots.txt, noindex tag, etc.)

2. **Performance Tab**
   - Check: How many impressions from Google? (will start after indexing)
   - Check: What's the average position for keywords?
   - Goal: By week 4, you should see 50–100+ impressions

3. **Core Web Vitals**
   - Check: Are any pages failing (red)?
   - Target: All pages should be Green ✅
   - Action: Optimize if any page > 3 seconds load time

4. **Mobile Usability**
   - Check: Any mobile issues reported?
   - Target: Zero errors
   - Note: All JobOye hubs are mobile-responsive, so no issues expected

---

## OPTIONAL: SPEED UP INDEXING (Advanced)

If hubs are not indexed within 7 days:

1. **Resubmit Sitemap**
   - Go to Sitemaps section
   - Delete existing sitemap
   - Re-submit: `https://joboye.com/sitemap.xml`

2. **Fetch as Googlebot**
   - In URL Inspection tool
   - Click "Test Live URL" → "See Google's cached version"
   - This tells you if Google can actually read the page

3. **Check robots.txt**
   - Verify: `/public/robots.txt` allows `/hubs/` crawling
   - Current robots.txt is correct ✅

4. **Check Indexability**
   - Ensure no `<meta name="robots" content="noindex">` tags in hub files
   - All JobOye hubs allow indexing ✅

---

## EXPECTED RESULTS (Post-Indexing)

### 1–2 Weeks After Indexing
- ✅ All 28 hubs appear in Google Search
- ✅ Breadcrumb navigation shows in search results
- ✅ Job schema shows rich snippets (salary range, role title)
- ✅ First organic traffic arrives (10–50 sessions/day)

### 2–4 Weeks After Indexing
- ✅ 50+ keywords ranking #8–15 (average position)
- ✅ Organic traffic: 100–500 sessions/month
- ✅ Average click-through rate: 1–2%
- ✅ Internal linking working (breadcrumbs visible in SERP)

### 4–8 Weeks After Indexing
- ✅ 100+ keywords ranking #5–10 (average position)
- ✅ Organic traffic: 2K–5K sessions/month
- ✅ Click-through rate: 2–3%
- ✅ Long-tail keywords starting to rank
- ✅ Real traffic for comparison keywords (e.g., "diploma vs ITI")

---

## TROUBLESHOOTING

### Problem: "Not indexed" Status (7+ days after submission)

**Check 1: Is the page crawlable?**
- In URL Inspection, click "Test Live URL"
- GSC should show "Page is indexable"
- If showing red ❌, check for:
  - `<meta name="robots" content="noindex">` (remove if present)
  - robots.txt blocking `/hubs/` (should allow)

**Check 2: Is the page reachable?**
- Try visiting manually: `https://joboye.com/hubs/upsc-comprehensive-guide.html`
- Should load instantly (< 3 seconds)
- If slow, optimize images/CSS

**Check 3: Resubmit Sitemap**
- Delete old sitemap in GSC
- Re-submit fresh sitemap.xml
- Wait 5–7 more days

### Problem: "Crawl error" in Coverage Report

**Action:** Click on error → Click "Test Live URL" → See what's wrong
- Most common cause: Page moved / URL changed
- Solution: Update sitemap.xml with correct URLs

### Problem: Low Traffic After Indexing (30+ days)

**Common causes:**
1. Keywords too competitive (FreeJobAlert dominates)
   - Solution: Focus on long-tail keywords (Phase 2 strategy)
2. Not enough backlinks (still 0 backlinks)
   - Solution: Start backlink building (Phase 3)
3. Low click-through rate (< 1%)
   - Solution: Improve title + meta description for CTR boost

---

## FINAL CHECKLIST

Before submitting to GSC, verify:

- [ ] Domain verified in GSC ✅
- [ ] All 28 hubs uploaded to Vercel
- [ ] sitemap.xml in `/public/` folder ✅
- [ ] robots.txt in `/public/` folder ✅
- [ ] All hubs have: BreadcrumbList schema ✅
- [ ] All hubs have: Job entity schema ✅
- [ ] All hubs have: FAQPage schema ✅
- [ ] All hubs have: AggregateOffer schema ✅
- [ ] Homepage has: Organization + WebSite schema ✅
- [ ] No `<meta name="robots" content="noindex">` tags ✅
- [ ] All pages load under 3 seconds (95+ PageSpeed) ✅

---

## NEXT STEPS

**Today (Oct 21):**
1. Verify domain in GSC (choose one of 3 methods above)
2. Submit sitemap: `https://joboye.com/sitemap.xml`
3. Request indexing via URL Inspection tool

**Tomorrow (Oct 22):**
- Verify submission status: Check Sitemaps section → Should show "Success"

**Week 1 (Oct 22–28):**
- Monitor Coverage report daily
- All hubs should be indexed by Oct 28

**Week 2+ (Oct 29+):**
- Check Performance tab for keyword rankings
- Begin Phase 2: Long-tail keyword targeting + hub creation
- Begin Phase 3: Backlink building

---

✅ **READY TO SUBMIT TO GSC**

All JobOye files are prepared for Google indexing. Sitemap is valid, schemas are correct, robots.txt is optimized. You're ready to go.

