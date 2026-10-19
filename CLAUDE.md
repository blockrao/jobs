# JobOye Phase 1 — Critical Rules & Reminders

## 🚨 Routing + Sitemap Synchronization (LOCKED)

**Rule: Every route change MUST update sitemap generation immediately.**

### Why This Matters

On 2026-10-19, we discovered only 3 posts indexed in Google despite 3,247 in database.

**Root cause:** Architecture migrated routes from `/jobs/{slug}/{post-slug}` → `/[locale]/jobs/{slug}/{post-slug}` but `src/app/sitemap.ts` was not updated. Google crawled the sitemap, followed URLs without locale prefix, got 404s, and stopped indexing.

**Impact:** 3,244 posts invisible in search for ~4 weeks until fixed.

### The Rule

1. **When you change routes**, immediately update `src/app/sitemap.ts` to generate matching URLs
2. **All sitemap URLs must include locale prefix**: `/en/jobs/...` and `/hi/jobs/...`
3. **Canonical URLs in page metadata MUST match sitemap URLs**: Use `/${locale}/jobs/...` not `/jobs/...`
4. **Run crawlability test before deploy**: `npm run test:contracts -- crawlability`

### Applied Fixes (2026-10-19)

- **FIX-001**: `src/app/sitemap.ts` — Sitemap now generates `/en/jobs/` and `/hi/jobs/` URLs
- **FIX-002**: `src/app/[locale]/jobs/[slug]/[post-slug]/page.tsx` — Added hreflang alternates (EN, HI, x-default)
- **FIX-003**: `src/app/[locale]/jobs/[slug]/[post-slug]/page.tsx` — Canonical URL now includes locale prefix
- **FIX-004**: `src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx` — Old route redirects 301 to new locale routes

### Checklist for Every Route Change

```
□ Updated src/app/sitemap.ts to generate URLs matching new routes
□ Verified locale prefixes (/en/, /hi/) in sitemap URLs
□ Updated page generateMetadata to use correct canonical URL
□ Verified hreflang alternates if bilingual
□ Ran crawlability test: npm run test:contracts -- crawlability
□ Spot-checked live site after deploy (canonical, hreflang, redirects)
```

See `docs/SEO_DEPLOYMENT_CHECKLIST.md` for full process.

---

## 📚 Key Documents

@AGENTS.md

@docs/architecture/HANDOFF.md

@docs/SEO_DEPLOYMENT_CHECKLIST.md
