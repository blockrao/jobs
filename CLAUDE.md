# JobOye Phase 1 — Architectural Decisions & Rules

## 🏛️ Core Architecture (LOCKED — 2026-10-19)

### Locale Prefix Strategy: `localePrefix: 'always'`

**Decision:** All job URLs ALWAYS include explicit locale prefix (`/en/` or `/hi/`), never omitted.

**Rationale:**
- **Single source of truth:** One canonical URL per language per post
- **SEO resilience:** No "as-needed" stripping, no redirect chains
- **Discoverability:** Consistent, persistent, crawlable URLs
- **Structured data:** hreflang alternates match actual URLs
- **Compliance:** Follows Google's best practice for multilingual sites

**Implementation:**
- `src/proxy.ts:22` — `localePrefix: 'always'` (next-intl config)
- All incoming URLs rewritten to include locale prefix
- Example: `/jobs/ssc-cgl-2024` → `/en/jobs/ssc-cgl-2024` (internally)
- Sitemap generates `/en/jobs/...` and `/hi/jobs/...` for every post

**Never change this:**
- Do NOT revert to `localePrefix: 'as-needed'` — it causes cascading SEO failures
- Do NOT remove locale prefix from URLs
- Do NOT create bare `/jobs/...` routes (use `/en/jobs/...` instead)

---

## 🚨 Routing + Sitemap Synchronization (LOCKED)

**Rule: Every route change MUST update sitemap generation immediately.**

### Why This Matters

On 2026-10-19, we discovered only 3 posts indexed in Google despite 3,247 in database.

**Root cause:** Initial architecture used `localePrefix: 'as-needed'` which stripped the `/en/` prefix from English URLs. Sitemap had `/en/jobs/...` but actual routes were `/jobs/...`. Google got 404s.

**Solution (2026-10-19 rebuild):** Changed to `localePrefix: 'always'` and consolidated routes. Now canonical URLs match sitemap URLs exactly.

**Impact:** 3,247 posts will be re-indexed over 4 weeks.

### The Rules

1. **All job URLs must include locale prefix**: `/en/jobs/...` or `/hi/jobs/...` (never bare `/jobs/...`)
2. **Sitemap must match actual routes**: If sitemap says `/en/jobs/{slug}`, the route must exist at that URL
3. **Canonical URLs in metadata MUST match sitemap URLs**: No mismatches allowed
4. **Both locales always present**: Every job appears in both `/en/` and `/hi/` sitemap entries
5. **Run crawlability test before every deploy**: `npm run test:contracts -- crawlability`

### Applied Fixes (2026-10-19)

- **Architectural Refactor (bbad21b)**: Changed to `localePrefix: 'always'`, consolidated duplicate routes, fixed canonical URLs
- **FIX-001**: Sitemap generates `/en/jobs/` and `/hi/jobs/` with proper priorities
- **FIX-002/003/008**: Canonical URLs include locale prefix, hreflang alternates declared
- **FIX-004/005/006**: Old URL redirects use HTTP 301 to preserve SEO value

### Checklist for Every Route Change

```
□ Route includes explicit locale prefix (/en/ or /hi/)
□ Updated src/app/sitemap.ts to include this route in both locales
□ Page metadata canonical matches the sitemap URL exactly
□ hreflang alternates cover both /en/ and /hi/ versions
□ No bare /jobs/... routes (only /[locale]/jobs/...)
□ Ran: npm run test:contracts -- crawlability
□ Spot-checked live site (canonical, hreflang, no 404s)
```

See `docs/SEO_DEPLOYMENT_CHECKLIST.md` for full process.

---

## 📚 Key Documents

@AGENTS.md

@docs/architecture/HANDOFF.md

@docs/SEO_DEPLOYMENT_CHECKLIST.md
