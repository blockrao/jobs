# JobOye Pre-Ship Audit: Quick Fixes Guide
**Status:** 5 Issues Ready to Apply  
**Estimated Time:** 5-10 minutes  
**Files to Edit:** 4 files

---

## Fix #1: Cache-Control Header Pattern (CRITICAL)
**File:** `src/app/next.config.ts`  
**Line:** 14  
**Priority:** CRITICAL — Prevents stale 404 caching

### Current Code:
```typescript
headers: async () => [
  {
    // Prevent Vercel edge from caching post leaf pages
    source: "/jobs/:slug/:postSlug",  // ❌ WRONG
    headers: [
      {
        key: "Cache-Control",
        value: "no-store",
      },
    ],
  },
```

### Fixed Code:
```typescript
headers: async () => [
  {
    // Prevent Vercel edge from caching post leaf pages
    source: "/:locale/jobs/:slug/:postSlug",  // ✅ FIXED
    headers: [
      {
        key: "Cache-Control",
        value: "no-store",
      },
    ],
  },
```

### Verification:
```bash
npm run build
node node_modules/next/dist/bin/next start -p 3000 &
curl -I http://localhost:3000/en/jobs/ssc-cgl/assistant
# Should show: Cache-Control: no-store
kill %1
```

---

## Fix #2: Sitemap Fallback (CRITICAL)
**File:** `src/app/sitemap.ts`  
**Line:** 76  
**Priority:** CRITICAL — Prevents sitemap 404s during DB outages

### Current Code (Error Fallback):
```typescript
} catch (error) {
  console.error('[sitemap] Error fetching posts:', error);
  // Fallback to at least hub pages
  return [
    {
      url: 'https://www.joboye.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://www.joboye.com/jobs',  // ❌ WRONG — missing locale
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
  ];
}
```

### Fixed Code:
```typescript
} catch (error) {
  console.error('[sitemap] Error fetching posts:', error);
  // Fallback to at least hub pages (must include both locales)
  return [
    {
      url: 'https://www.joboye.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://www.joboye.com/en/jobs',  // ✅ FIXED
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: 'https://www.joboye.com/hi/jobs',  // ✅ ADDED
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.90,
    },
  ];
}
```

### Verification:
```bash
npm run build
# Verify fallback would be used if DB is down
# The sitemap should now have /en/jobs and /hi/jobs in fallback
```

---

## Fix #3: Hub Structured Data URLs (HIGH)
**File:** `src/components/recruitment/structured-data/recruitment-hub-schema.tsx`  
**Lines:** 93, 124, 216, 232  
**Priority:** HIGH — Invalid schema URLs block crawling

### Issue:
All job URLs in this file are missing the `/en/` prefix even though the component hardcodes `inLanguage: "en-IN"`.

### Fix Instructions:

**Line 93 — Hub URL:**
```typescript
// BEFORE:
const hubUrl = `${SITE_URL}/jobs/${recruitment.slug}`;

// AFTER:
const hubUrl = `${SITE_URL}/en/jobs/${recruitment.slug}`;
```

**Line 124 — Breadcrumb Jobs Link:**
```typescript
// BEFORE:
{
  "@type": "ListItem",
  position: 2,
  name: "Jobs",
  item: `${SITE_URL}/jobs`,  // ❌
},

// AFTER:
{
  "@type": "ListItem",
  position: 2,
  name: "Jobs",
  item: `${SITE_URL}/en/jobs`,  // ✅
},
```

**Line 216 — ItemList Post URLs (First Block):**
```typescript
// BEFORE:
if (post.slug) {
  item["url"] = `${SITE_URL}/jobs/${recruitment.slug}/${post.slug}`;  // ❌
}

// AFTER:
if (post.slug) {
  item["url"] = `${SITE_URL}/en/jobs/${recruitment.slug}/${post.slug}`;  // ✅
}
```

**Line 232 — ItemList Post URLs (Second Block):**
```typescript
// BEFORE:
itemListElement: resolvedPosts.map((post, i) => ({
  "@type": "ListItem",
  position: i + 1,
  name: post.name ?? post.slug,
  url: `${SITE_URL}/jobs/${recruitment.slug}/${post.slug}`,  // ❌
})),

// AFTER:
itemListElement: resolvedPosts.map((post, i) => ({
  "@type": "ListItem",
  position: i + 1,
  name: post.name ?? post.slug,
  url: `${SITE_URL}/en/jobs/${recruitment.slug}/${post.slug}`,  // ✅
})),
```

### Verification:
Use Google's Rich Results Test on a recruitment hub page and verify all URLs in the JSON-LD schema are valid.

---

## Fix #4: Leaf Page Breadcrumb URLs (HIGH)
**File:** `src/components/job-posting/job-detail-page-production.tsx`  
**Lines:** 140-141  
**Priority:** HIGH — Broken navigation and schema

### Current Code:
```typescript
const breadcrumbItems = [
  { name: 'Home', url: '/' },
  { name: 'Jobs', url: '/jobs' },  // ❌ Missing /en/
  ...(post.recruitmentName ? [{ name: post.recruitmentName, url: `/jobs/${post.recruitmentSlug}` }] : []),  // ❌ Missing /en/
  { name: post.title, url: canonicalUrl },
];
```

### Fixed Code:
```typescript
// Extract locale from canonical URL (already locale-aware)
const locale = canonicalUrl.split('/')[1] || 'en';
const baseJobsUrl = `/${locale}/jobs`;

const breadcrumbItems = [
  { name: 'Home', url: '/' },
  { name: 'Jobs', url: baseJobsUrl },  // ✅ Now locale-aware
  ...(post.recruitmentName ? [{ name: post.recruitmentName, url: `${baseJobsUrl}/${post.recruitmentSlug}` }] : []),  // ✅ Now locale-aware
  { name: post.title, url: canonicalUrl },
];
```

### Verification:
```bash
# Load a leaf page from both locales and verify breadcrumb URLs
curl -s https://localhost:3000/en/jobs/ssc-cgl/assistant | grep 'breadcrumb' -A 20
# Should show: /en/jobs and /en/jobs/ssc-cgl

curl -s https://localhost:3000/hi/jobs/ssc-cgl/assistant | grep 'breadcrumb' -A 20
# Should show: /hi/jobs and /hi/jobs/ssc-cgl
```

---

## Fix #5: Preview Page Redirect (HIGH)
**File:** `src/app/preview/jkssb-advertisement-08-of-2026/page.tsx`  
**Line:** 6  
**Priority:** HIGH — Unnecessary redirect chain

### Current Code:
```typescript
export default function JkssbPreviewRedirect() {
  redirect("/jobs/jkssb-advertisement-08-of-2026");  // ❌ Missing /en/
}
```

### Fixed Code:
```typescript
export default function JkssbPreviewRedirect() {
  redirect("/en/jobs/jkssb-advertisement-08-of-2026");  // ✅ Fixed
}
```

### Verification:
```bash
curl -I http://localhost:3000/app/preview/jkssb-advertisement-08-of-2026
# Should show 307 redirect to /en/jobs/... (not to /jobs/...)
```

---

## Fix #6 (Optional): Clean Up Commented Code (MEDIUM)
**File:** `src/db/operations/get-posts.ts`  
**Line:** 13  
**Priority:** MEDIUM — Code cleanliness

### Current Code:
```typescript
// export const getPostBySlugCached = cache(getPostBySlug);  // ← Remove this line
export const getPostBySlugCached = getPostBySlug;
```

### Fixed Code:
```typescript
export const getPostBySlugCached = getPostBySlug;
```

Just delete line 13 (the commented line).

---

## Batch Apply All Fixes

### Step 1: Apply fixes to files
- Fix #1: Edit `next.config.ts`, line 14
- Fix #2: Edit `src/app/sitemap.ts`, line 76+
- Fix #3: Edit `src/components/recruitment/structured-data/recruitment-hub-schema.tsx`, lines 93, 124, 216, 232
- Fix #4: Edit `src/components/job-posting/job-detail-page-production.tsx`, lines 137-143
- Fix #5: Edit `src/app/preview/jkssb-advertisement-08-of-2026/page.tsx`, line 6
- Fix #6 (optional): Edit `src/db/operations/get-posts.ts`, line 13

### Step 2: Test locally
```bash
cd /home/claude/jobs
npm run build
npm run test:contracts -- crawlability
# Should PASS all tests
```

### Step 3: Commit with proper attribution
```bash
git add -A
git commit -m "Fix: Pre-ship audit — Critical locale prefix and cache-control issues

- Fix cache-control header pattern for leaf pages (/:locale/jobs)
- Fix sitemap fallback to include both /en and /hi locales
- Add /en prefix to all structured data URLs (hub + leaf schemas)
- Add locale-awareness to leaf page breadcrumb navigation
- Fix preview page redirect to use /en/jobs
- Clean up commented code in get-posts.ts

Fixes pre-ship audit blockers blocking re-indexing and edge cache issues."
```

### Step 4: Deploy and verify
```bash
# Push to preview
git push

# After deploy:
# 1. Verify cache headers
curl -I https://preview.joboye.com/en/jobs/ssc-cgl/assistant
# Should have: Cache-Control: no-store

# 2. Check sitemap
curl https://preview.joboye.com/sitemap.xml | head -50
# Should have /en/jobs and /hi/jobs

# 3. Validate schema
# Use Google Rich Results Test on hub and leaf pages

# 4. Monitor Search Console (24-48 hours)
# Check for 404 errors, new indexed URLs
```

---

## Expected Outcomes After Fixes

| Issue | Before | After |
|-------|--------|-------|
| Cache-Control on leaf pages | ❌ Not applied | ✅ no-store applied |
| Sitemap fallback | ❌ `/jobs` (404) | ✅ `/en/jobs`, `/hi/jobs` |
| Hub schema URLs | ❌ `/jobs/...` (invalid) | ✅ `/en/jobs/...` (valid) |
| Leaf breadcrumbs | ❌ `/jobs/...` (404) | ✅ `/:locale/jobs/...` (valid) |
| Preview redirect | ❌ Extra hop | ✅ Direct to /en/jobs |
| Crawlability test | ⚠️ FAIL | ✅ PASS |

---

## Risk Assessment

**Risk of applying these fixes:** MINIMAL ✓
- All changes are correctness fixes, not refactors
- All changes align with CLAUDE.md locked rules
- All changes fix bugs, not features

**Risk of NOT applying fixes:** CRITICAL ⚠️
- Stale 404 caching breaks recent RLS fix
- Sitemap fallback repeats 2026-10-19 blocker
- Schema validation failures block crawling
- Navigation broken from leaf pages

---

**Ready to apply?** Let's fix these issues and get to launch. 🚀
