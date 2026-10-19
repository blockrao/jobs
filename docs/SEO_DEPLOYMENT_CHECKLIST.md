# SEO Deployment Checklist

**Last Updated:** 2026-10-19  
**Status:** Phase 1 P0 prevention mechanism  
**Scope:** All deployments affecting routes, sitemaps, or search visibility

---

## 🎯 Purpose

Prevent recurrence of critical SEO blockers like the **sitemap URL mismatch** that prevented indexation of 3,247 posts despite 100% schema compliance.

Root cause: Architecture migrated to locale-based routing (`/[locale]/jobs/...`) but sitemap generation was not updated, causing Google to crawl broken URLs and return 404s.

This checklist ensures every routing change is reflected in sitemap generation and metadata.

---

## ✅ Pre-Deployment Verification (Required)

### Phase 1: Routing Changes

- [ ] **Are you changing any route patterns?** (e.g., adding segments, renaming params, moving files)
  - YES → Go to Phase 2
  - NO → Skip to Phase 3

### Phase 2: Sitemap Sync (Critical)

When routing changes, sitemap MUST be updated immediately.

- [ ] **Identify all affected routes**
  - [ ] Hub pages (e.g., `/[locale]/jobs`)
  - [ ] Leaf pages (e.g., `/[locale]/jobs/[slug]/[post-slug]`)
  - [ ] Old deprecated routes (e.g., `/jobs/[slug]/[post-slug]`)

- [ ] **Update sitemap generation** (`src/app/sitemap.ts`)
  - [ ] Query generates URLs matching actual route pattern
  - [ ] Locale prefixes included (`/en/jobs/...`, `/hi/jobs/...`)
  - [ ] Hub pages prioritized correctly (1.0 for root, 0.95 for EN, 0.90 for HI)
  - [ ] Post pages have correct priority (0.8 for EN, 0.7 for HI)
  - [ ] `lastModified` timestamps are accurate

- [ ] **Verify sitemap structure locally**
  ```bash
  npm run build
  # Test with local server
  node node_modules/next/dist/bin/next start -p 3000 &
  curl http://localhost:3000/sitemap.xml | head -50
  # Verify locale prefixes are present
  grep -c '/en/jobs' sitemap.xml  # Should be > 1500
  grep -c '/hi/jobs' sitemap.xml  # Should be > 1500
  kill %1
  ```

- [ ] **Update page metadata** (`src/app/[locale]/jobs/[slug]/[post-slug]/page.tsx`)
  - [ ] Canonical URL includes locale: `` `${baseUrl}/${locale}/jobs/...` ``
  - [ ] hreflang alternates declared for EN/HI/x-default
  - [ ] OpenGraph `url` uses canonical URL

- [ ] **Update old route redirects** (if deprecating routes)
  - [ ] Old routes redirect 301/307 to new locale routes
  - [ ] Example: `/jobs/{slug}` → `/en/jobs/{slug}`
  - [ ] Redirect is tested locally

### Phase 3: Data Validation

- [ ] **Check post table consistency**
  ```sql
  -- Posts in database
  SELECT COUNT(*) FROM posts WHERE "isLive" = true;
  
  -- Expected in sitemap
  -- Should match (posts count) × 2 locales ± 5%
  ```

- [ ] **Verify URL generation logic**
  - [ ] All recruitment slugs are valid (lowercase, hyphens)
  - [ ] All post slugs are unique per recruitment
  - [ ] No URL encoding issues (spaces, special chars)

### Phase 4: Crawlability Gate

- [ ] **Run crawlability test before deploy**
  ```bash
  npm run test:contracts -- crawlability
  ```
  - [ ] All sampled URLs return 200 OK
  - [ ] Canonical URLs match page URLs
  - [ ] hreflang alternates declared correctly
  - [ ] Old routes redirect properly

### Phase 5: Robots.txt

- [ ] **Verify robots.txt allows crawling**
  ```bash
  curl https://joboye.com/robots.txt
  # Should NOT have "Disallow: /" or "Disallow: /jobs"
  ```

- [ ] **Check for conflicting sitemaps**
  ```bash
  curl https://joboye.com/robots.txt | grep -i sitemap
  # Should list /sitemap.xml (not multiple conflicting sitemaps)
  ```

---

## 🚀 Deployment Checklist

### Before pushing to main

- [ ] All checks above passed ✓
- [ ] Crawlability test passed locally
- [ ] Sitemap URLs verified with correct locales
- [ ] Commit message references issue (e.g., "FIX-001: Sitemap locale prefix")

### During deployment

- [ ] Monitor deployment logs for errors
- [ ] Check that deploy completes without rollback

### Post-deployment (1 hour after go-live)

- [ ] [ ] Fetch live sitemap: `curl https://joboye.com/sitemap.xml | wc -l`
  - [ ] Should contain ~6,500+ URLs
  - [ ] Spot-check URLs have `/en/` and `/hi/` prefixes

- [ ] [ ] Test canonical URL on live site
  ```bash
  curl -s https://joboye.com/en/jobs/ssc-cgl-2024/assistant-examination \
    | grep 'rel="canonical"'
  # Should show: <link rel="canonical" href="https://joboye.com/en/jobs/...">
  ```

- [ ] [ ] Verify hreflang alternates on live site
  ```bash
  curl -s https://joboye.com/en/jobs/ssc-cgl-2024/assistant-examination \
    | grep hreflang
  # Should show 3 links: en, hi, x-default
  ```

- [ ] [ ] Test old route redirect
  ```bash
  curl -I https://joboye.com/jobs/ssc-cgl-2024/assistant-examination
  # Should show: HTTP/2 307 (or 301)
  # Location: https://joboye.com/en/jobs/ssc-cgl-2024/assistant-examination
  ```

---

## 📊 Monitoring After Deploy

### Google Search Console

- [ ] [ ] Check Coverage report (next 24 hours)
  - [ ] Monitor for new 404 errors (should stay near 0)
  - [ ] New index rate should be normal (not dropping)

- [ ] [ ] Check Sitemaps report
  - [ ] "Sitemaps" shows new sitemap was processed
  - [ ] "Read" and "Submitted" counts equal

- [ ] [ ] Check Inspect URL tool (24-48 hours)
  - [ ] Pick a few post URLs to inspect
  - [ ] Status should be "URL is on Google" or "Discovered, not indexed" (not "404")

### Server Logs

- [ ] [ ] Check 404 rates in server logs
  ```bash
  # Example: tail CloudFlare/hosting logs for 404s
  # Should NOT spike after deploy
  ```

---

## 🔒 Prevention: Locked Practices

### ✋ NEVER

1. **Never update routes without updating sitemap**
   - If you're thinking about route changes, sitemap changes are automatic
   - Pair commit: route change + sitemap sync in same PR

2. **Never remove old routes without 301 redirects**
   - Old URLs may be indexed or bookmarked
   - Always redirect to new URLs to preserve SEO value

3. **Never skip the crawlability test**
   - This is the gate that catches mismatches before they go live
   - If test fails, don't deploy

4. **Never commit sitemap/routes without verifying locally first**
   - Build + test locally (see Phase 2 above)
   - Dead URLs are expensive to fix

### ✅ ALWAYS

1. **Always verify sitemap URLs have locale prefixes**
   - Use grep to check: `grep -c '/en/' sitemap.xml && grep -c '/hi/' sitemap.xml`
   - Both should be > 1500

2. **Always test redirects if changing old routes**
   - Use curl with `-I` flag to check status code
   - Should be 301, 307, or 308 (not 200 and not 404)

3. **Always run crawlability test**
   ```bash
   npm run test:contracts -- crawlability
   ```

4. **Always spot-check production after deploy**
   - 1 canonical URL fetch
   - 1 hreflang check
   - 1 old route redirect test

---

## 📋 Issue Template

If you find an SEO crawlability issue, file a bug with:

- [ ] **Title:** `SEO: <issue type>` (e.g., "SEO: Sitemap URLs missing locale prefix")
- [ ] **Severity:** (Critical / High / Medium)
- [ ] **Evidence:**
  - [ ] Google Search Console screenshot
  - [ ] curl command and output showing the problem
  - [ ] Expected vs actual comparison

- [ ] **Root cause hypothesis**
  - [ ] Routing change not reflected in sitemap
  - [ ] Canonical URL mismatch
  - [ ] hreflang alternates missing
  - [ ] 301 redirect broken

- [ ] **Proposed fix**
  - [ ] File(s) to change
  - [ ] Change description

---

## 🔗 Related Documentation

- **HANDOFF.md** → Phase 1 P0 items, crawlability as critical blocker
- **Architecture LEDGER** → A-052, A-053 (sitemap, hreflang verification)
- **Crawlability Test** → `tests/contracts/seo/crawlability.test.ts`
- **FIX-001, FIX-002, FIX-003, FIX-004** → Applied fixes for reference

---

## 📞 Questions?

- **Crawlability test failing?** Check Phase 2 above; verify sitemap URLs have locale prefixes
- **Canonical mismatch?** Ensure route params are passed to generateMetadata correctly
- **hreflang not showing?** Check alternates object in Metadata return

---

**Last remediated:** 2026-10-19 (FIX-001 through FIX-004)  
**Next review:** After any route or sitemap changes
