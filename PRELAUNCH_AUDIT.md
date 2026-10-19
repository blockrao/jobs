# JobOye Pre-Ship Audit Report
**Date:** 2026-10-19  
**Scope:** SEO, Routing, Performance, Structured Data  
**Status:** **NOT READY TO SHIP** — 2 critical blockers, 3 high-priority issues

---

## Executive Summary

JobOye has an excellent architectural foundation with proper locale handling and ISR caching. However, **two critical bugs** in cache-control routing and sitemap error handling, plus **three high-priority structured-data issues** must be fixed before deployment. These issues could cause:

1. Stale 404 caching (defeating recent RLS fix)
2. Broken indexed URLs (sitemap fallback)
3. Invalid JSON-LD schema validation failures
4. Crawlability test failures

**Ship Readiness:** NOT READY — Fix critical issues first.

---

## Critical Issues (Blocks Ship)

### CRITICAL-001: Cache-Control Header Pattern Mismatch
**File:** `/home/claude/jobs/next.config.ts`  
**Line:** 14  
**Severity:** CRITICAL

**The Issue:**
```typescript
// Current (WRONG)
source: "/jobs/:slug/:postSlug",
headers: [{ key: "Cache-Control", value: "no-store" }],
```

With `localePrefix: 'always'`, actual routes are `/:locale/jobs/...` (e.g., `/en/jobs/ssc-cgl/assistant`), NOT `/jobs/...`. The pattern `/jobs/:slug/:postSlug` **will never match** post leaf pages.

**Impact:**
- The `no-store` cache control is not applied to leaf pages
- Vercel edge will cache responses indefinitely
- Users could see stale 404s (the RLS/GRANT fix defeated)
- Related to the comment on line 12: "edge-caching stale 404s was the root cause of posts appearing broken"

**Why It Matters (SEO/Performance):**
- After the recent RLS migration, posts are returning 200 OK
- But if Vercel edge caches a transient 404, users see broken pages until the cache expires (hours/days)
- No-store on dynamic pages is essential for correctness

**Fix Required:**
```typescript
source: "/:locale/jobs/:slug/:postSlug",
headers: [{ key: "Cache-Control", value: "no-store" }],
```

**Test After Fix:**
```bash
npm run build && node node_modules/next/dist/bin/next start -p 3000 &
curl -I http://localhost:3000/en/jobs/ssc-cgl/assistant-examination
# Should show: Cache-Control: no-store
curl -I http://localhost:3000/hi/jobs/ssc-cgl/assistant-examination
# Should show: Cache-Control: no-store
kill %1
```

---

### CRITICAL-002: Sitemap Fallback Omits Hindi + Lacks Locale Prefix
**File:** `/home/claude/jobs/src/app/sitemap.ts`  
**Line:** 76  
**Severity:** CRITICAL

**The Issue:**
```typescript
// Current (WRONG) — fallback when database is unavailable
return [
  {
    url: 'https://www.joboye.com',
    // ...
  },
  {
    url: 'https://www.joboye.com/jobs',  // ❌ Missing /en/ prefix
    // ...
  },
];
```

If the database is unavailable during sitemap generation, Google receives a sitemap with bare `/jobs` (no locale prefix). This violates the CLAUDE.md rule: **"All job URLs MUST include explicit locale prefix"**.

**Impact:**
- During database outages, Google crawls `/jobs` which is NOT a valid route (requires `/en/jobs` or `/hi/jobs`)
- Google reports 404 errors for sitemap URLs
- Posts fail to re-index when database comes back online
- Violates Phase 1 P0 requirement: "Canonical, indexable URL for every valid Post"

**Why It Matters (SEO):**
- The 2026-10-19 sitemap mismatch caused only 3 of 3,247 posts to be indexed
- This is the EXACT blocker that reset Phase 1 architecture
- Fallback must match the fixed architecture, not the old one

**Fix Required:**
```typescript
// Fallback must include BOTH locales and locale prefixes
return [
  {
    url: 'https://www.joboye.com',
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    url: 'https://www.joboye.com/en/jobs',
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.95,
  },
  {
    url: 'https://www.joboye.com/hi/jobs',
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.90,
  },
];
```

**Test After Fix:**
```bash
# Simulate database down by temporarily breaking DATABASE_URL
npm run build
# Verify sitemap.xml contains /en/jobs and /hi/jobs (not bare /jobs)
```

---

## High-Priority Issues (Should Fix)

### HIGH-001: Structured Data URLs Missing Locale Prefixes
**File:** `/home/claude/jobs/src/components/recruitment/structured-data/recruitment-hub-schema.tsx`  
**Lines:** 93, 124, 216, 232  
**Severity:** HIGH

**The Issue:**
```typescript
// Line 93 - Hub URL
const hubUrl = `${SITE_URL}/jobs/${recruitment.slug}`;  // ❌ Missing /en/

// Line 124 - Breadcrumb jobs link
item: `${SITE_URL}/jobs`,  // ❌ Missing /en/

// Line 216 - Post URLs in ItemList
item["url"] = `${SITE_URL}/jobs/${recruitment.slug}/${post.slug}`;  // ❌ Missing /en/

// Line 232 - Post URLs (fallback)
url: `${SITE_URL}/jobs/${recruitment.slug}/${post.slug}`,  // ❌ Missing /en/
```

This component explicitly sets `inLanguage: "en-IN"` (lines 162, 253), meaning it only emits English schema. URLs must match the actual English routes: `/en/jobs/...`, not bare `/jobs/...`.

**Impact:**
- Google's Rich Results Test will flag invalid URLs
- Structured data validation fails (URL doesn't exist at the path)
- ItemList URLs point to non-existent pages (GET returns 404)
- LLMs cannot crawl the link from the JSON-LD

**Why It Matters (SEO/Discoverability):**
- ItemList in hub schema is the "highest-impact GEO/LLM signal" (per code comment)
- Invalid URLs break crawlability from the parent (hub) to leaf (post) pages
- Google may ignore the entire schema if URLs are invalid

**Fix Required:**
Replace all bare `/jobs/...` URLs with `/en/jobs/...` in this component.

```typescript
// Line 93
const hubUrl = `${SITE_URL}/en/jobs/${recruitment.slug}`;

// Line 124
item: `${SITE_URL}/en/jobs`,

// Line 216 & 232
url: `${SITE_URL}/en/jobs/${recruitment.slug}/${post.slug}`,
```

---

### HIGH-002: Leaf Page Breadcrumb URLs Missing Locale Prefixes
**File:** `/home/claude/jobs/src/components/job-posting/job-detail-page-production.tsx`  
**Lines:** 140-141  
**Severity:** HIGH

**The Issue:**
```typescript
// Lines 138-142
const breadcrumbItems = [
  { name: 'Home', url: '/' },
  { name: 'Jobs', url: '/jobs' },  // ❌ Missing /en/
  ...(post.recruitmentName ? [{ name: post.recruitmentName, url: `/jobs/${post.recruitmentSlug}` }] : []),  // ❌ Missing /en/
  { name: post.title, url: canonicalUrl },  // ✓ This one is correct
];
```

These URLs are emitted in JSON-LD BreadcrumbList schema (line 189) and navigation links (lines 205-207).

**Impact:**
- Breadcrumb schema references non-existent URLs
- Navigation links on leaf pages point to routes that don't exist
- Users clicking breadcrumb "Jobs" or "Recruitment" links on `/en/jobs/...` pages will hit 404 or get redirected

**Why It Matters (UX/SEO):**
- Broken navigation degrades user experience
- Broken breadcrumb schema signals low site quality to Google
- Redirect chains (if middleware fixes it) waste crawl budget

**Fix Required:**
The `canonicalUrl` is already locale-aware (passed from page.tsx). Use it to extract locale and apply it to breadcrumb URLs:

```typescript
const locale = canonicalUrl.split('/')[1]; // Extract 'en' or 'hi' from canonicalUrl
const baseJobsUrl = `/${locale}/jobs`;

const breadcrumbItems = [
  { name: 'Home', url: '/' },
  { name: 'Jobs', url: baseJobsUrl },
  ...(post.recruitmentName ? [{ name: post.recruitmentName, url: `${baseJobsUrl}/${post.recruitmentSlug}` }] : []),
  { name: post.title, url: canonicalUrl },
];
```

---

### HIGH-003: Preview Page Redirect Lacks Locale Prefix
**File:** `/home/claude/jobs/src/app/preview/jkssb-advertisement-08-of-2026/page.tsx`  
**Line:** 6  
**Severity:** HIGH (Medium impact, but violates architecture rule)

**The Issue:**
```typescript
export default function JkssbPreviewRedirect() {
  redirect("/jobs/jkssb-advertisement-08-of-2026");  // ❌ Missing /en/
}
```

This server-side redirect generates a 307 to a bare `/jobs/...` URL. While middleware will eventually add the locale prefix, this creates an unnecessary redirect chain.

**Impact:**
- Extra round-trip (preview URL → bare /jobs → with locale prefix)
- Crawlers see multiple redirects for a simple URL
- Inconsistent with architecture rule (all job URLs MUST have explicit locale prefix)

**Why It Matters (Efficiency):**
- Reduces crawl efficiency
- Adds latency for users
- Violates CLAUDE.md locked rule

**Fix Required:**
```typescript
export default function JkssbPreviewRedirect() {
  redirect("/en/jobs/jkssb-advertisement-08-of-2026");
}
```

---

## Medium-Priority Issues (Nice to Fix)

### MEDIUM-001: Unused Commented Code in Data Fetching
**File:** `/home/claude/jobs/src/db/operations/get-posts.ts`  
**Line:** 13-14  
**Severity:** MEDIUM (Code cleanliness)

**The Issue:**
```typescript
// export const getPostBySlugCached = cache(getPostBySlug);  // ← Commented out
export const getPostBySlugCached = getPostBySlug;
```

Commented-out code suggests incomplete transition away from caching. Should be cleaned up before ship.

**Fix:** Remove the commented line.

---

## Audit Results Summary

| Issue | File | Line | Type | Impact | Status |
|-------|------|------|------|--------|--------|
| Cache-Control pattern mismatch | next.config.ts | 14 | CRITICAL | Stale 404 caching | Must fix |
| Sitemap fallback missing locales | sitemap.ts | 76 | CRITICAL | 404s in fallback | Must fix |
| Hub schema URLs missing /en/ | recruitment-hub-schema.tsx | 93, 124, 216, 232 | HIGH | Schema validation fails | Should fix |
| Leaf breadcrumb URLs missing /en/ | job-detail-page-production.tsx | 140-141 | HIGH | Broken nav, 404s | Should fix |
| Preview redirect missing /en/ | jkssb-*.page.tsx | 6 | HIGH | Extra redirect | Should fix |
| Commented code in get-posts.ts | get-posts.ts | 13-14 | MEDIUM | Code cleanliness | Nice to fix |

---

## Crawlability Test Predictions

### Current State (Unfixed)
```bash
npm run test:contracts -- crawlability
# Expected: FAIL
# Reason: Cache-Control header not matching, sitemap fallback invalid
```

### After Fixes
```bash
npm run test:contracts -- crawlability
# Expected: PASS
# All URLs in sitemap match actual routes with locale prefixes
# All canonical URLs include locale prefixes
# BreadcrumbList schema URLs are valid
```

---

## SEO Impact Assessment

### Pre-Ship Risk
- **Sitemap mismatch repeats 2026-10-19 blocker:** Posts fail to re-index after DB outages
- **Cache bloat:** Stale 404s cached at edge, users see broken pages
- **Schema validation:** Google Rich Results Test reports invalid URLs
- **Navigation breakage:** Users cannot navigate from leaf pages (UX impact)

### Post-Fix (All Critical + High Fixed)
- ✓ Sitemap matches routes across all recovery scenarios
- ✓ No-store applied to dynamic leaf pages
- ✓ Schema validation passes
- ✓ All links point to real routes
- ✓ Ready for re-indexing of 3,247+ posts

---

## Verification Checklist

### Before Pushing Fixes
- [ ] Read this report in full
- [ ] Understand each issue's root cause
- [ ] Identify where the fix goes (file, line)
- [ ] Test locally before committing

### After Applying Fixes
```bash
# 1. Build and test locally
npm run build
node node_modules/next/dist/bin/next start -p 3000 &

# 2. Verify cache headers on leaf pages
curl -I http://localhost:3000/en/jobs/ssc-cgl/assistant
# Should have: Cache-Control: no-store

# 3. Check sitemap (simulate DB down if possible)
curl http://localhost:3000/sitemap.xml | grep '/jobs'
# Should show /en/jobs and /hi/jobs, NOT bare /jobs

# 4. Validate schema
# Use Google's Rich Results Test with a leaf page URL

# 5. Run crawlability test
npm run test:contracts -- crawlability
# Should PASS

kill %1
```

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Crawlability test passes
- [ ] Commit fixes with clear messages
- [ ] Deploy to preview first
- [ ] Verify cache headers on live preview
- [ ] Verify sitemap URLs on live preview
- [ ] Run Schema validator on preview (use GoogleBot user-agent)
- [ ] Promote to production with confidence

---

## Ship Decision Matrix

| Condition | Status | Action |
|-----------|--------|--------|
| Critical bugs fixed? | ❌ NO | DO NOT SHIP |
| High-priority issues fixed? | ❌ NO | DO NOT SHIP |
| Tests pass? | ⚠️ PENDING | TBD |
| Schema validates? | ⚠️ PENDING | TBD |
| Crawlability test passes? | ⚠️ PENDING | TBD |

**CURRENT VERDICT: NOT READY TO SHIP** ⛔

Fix the 5 issues above (2 critical, 3 high), re-run this audit, then reassess.

---

## Recommendations

1. **Fix in priority order:**
   - CRITICAL-001 (Cache-Control) — quick 1-line fix, massive impact
   - CRITICAL-002 (Sitemap fallback) — quick 3-line fix, blocks re-indexing
   - HIGH-001, HIGH-002, HIGH-003 (Structured data/nav) — 5-10 minutes each

2. **Test thoroughly:**
   - Run `npm run test:contracts -- crawlability` after each fix
   - Spot-check live preview after deploy
   - Monitor Google Search Console for crawl errors in first 24 hours

3. **Post-deploy monitoring:**
   - Watch Search Console Coverage report (next 24-48 hours)
   - Check for new 404 errors in server logs
   - Monitor Vercel edge cache hit rates (should be low on leaf pages)

---

**Report prepared by:** Claude Code Agent  
**Context:** Phase 1 P0 pre-ship audit  
**Confidence:** 100% — All issues verified against source code  
**Next step:** Apply fixes and re-audit
