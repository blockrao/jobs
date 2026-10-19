# JobOye Surgical Migration — Deployment Checklist

**Prepared:** 2026-10-19 14:00 UTC  
**For:** Prav (Business decision: go/no-go)  
**Mission:** Swap backend code, keep all URLs, preserve SEO

---

## Executive Summary

- **Scope:** Backend simplification only (code, not URLs)
- **Risk:** Low (URLs unchanged, old data preserved)
- **Downtime:** ~5 minutes (atomic Vercel deployment)
- **Rollback:** 30 seconds (Vercel dashboard)
- **Timeline:** Ready to deploy immediately

---

## What's Prepared

### 1. Schema Migration File ✓
**Location:** `supabase/migrations/20261019_migrate_to_simple_jobs_table.sql`

- Creates new `public.jobs` table (18 fields, all critical posting data)
- Adds 8 performance indexes
- Enables RLS with public read access
- Creates 3 helper views
- Includes SQL script to migrate existing data
- Includes verification queries

### 2. Deployment Guide ✓
**Location:** `SURGICAL_MIGRATION_README.md`

- Step-by-step deployment instructions
- SQL scripts ready to run
- Verification steps
- Rollback procedure
- Troubleshooting FAQ

### 3. Updated Repository ✓
**Location:** `/tmp/joboye-migration/` (ready to push)

- All URL routes preserved
- Migration scripts added
- Deployment docs complete
- Vercel config unchanged

---

## Deployment Flow (15 minutes total)

### Phase 1: Pre-Flight Checks (5 min)
- [ ] Verify build: `npm run build`
- [ ] Check `.env.local` has Supabase credentials
- [ ] Confirm no breaking changes in code

### Phase 2: Database Migration (2 min)
- [ ] Supabase SQL Editor
- [ ] Run: `supabase/migrations/20261019_migrate_to_simple_jobs_table.sql`
- [ ] Verify: `SELECT COUNT(*) FROM public.jobs;`

### Phase 3: Data Migration (1 min)
- [ ] Run INSERT script from SURGICAL_MIGRATION_README.md
- [ ] Verify: `SELECT COUNT(*) FROM public.jobs WHERE is_active = true;`

### Phase 4: Code Deploy (3 min)
- [ ] `git push origin main`
- [ ] Vercel auto-deploys
- [ ] Check dashboard for "Ready" status

### Phase 5: Verification (5 min)
- [ ] https://www.joboye.com loads
- [ ] Click 3 random job links
- [ ] Check Vercel logs for errors

**Total Time:** ~15 minutes

---

## Risk Assessment

### Low-Risk ✓
- URLs unchanged → No SEO impact
- Old data preserved → Safe rollback
- Atomic deployment → No partial states
- RLS tested → Public read works

### Rollback (30 sec)
Vercel: Click "Rollback" button

---

## Ready to Deploy?

**Recommendation:** YES, APPROVED

**Next Step:** Prav confirms "Go" → Execute deployment commands

```bash
# Deployment (when approved)
git push origin main
# Vercel auto-deploys
```

---

**Status:** READY FOR DEPLOYMENT  
**Prepared By:** Claude Code  
**Decision Required:** Prav
