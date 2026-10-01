# Deployment Checklist: Schema Infrastructure + Ingest Pipeline
**Status:** Ready to Deploy  
**Date:** October 1, 2026  
**Target:** Production database

---

## Pre-Deployment (1 hour)

### Database Backup
```bash
# Create backup before any changes
pg_dump $DATABASE_URL > backup_2026_10_01_pre_deployment.sql
echo "✅ Backup created: backup_2026_10_01_pre_deployment.sql"
```

### Verify Database Connectivity
```bash
psql $DATABASE_URL -c "SELECT version();"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM postings;"
```

**Expected output:** PostgreSQL version string + current posting count

---

## Phase 1: Database Migration (5 minutes)

### Apply Schema Migration
```bash
psql $DATABASE_URL -f migrations/0006_schema_infrastructure_2026_10_01.sql
```

**Expected output:** No errors, all CREATE TABLE/TYPE statements succeed

### Verify New Tables Created
```bash
psql $DATABASE_URL -c "
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sources', 'source_documents', 'recruitment_events', 'eligibility_alternatives')
ORDER BY table_name;"
```

**Expected output:**
```
      table_name       
-----------------------
 eligibility_alternatives
 recruitment_events
 source_documents
 sources
(4 rows)
```

### Check New Columns on Postings
```bash
psql $DATABASE_URL -c "
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'postings' 
AND column_name IN ('source_id', 'source_document_id', 'raw_title', 'raw_description', 'content_hash', 'extracted_at')
ORDER BY column_name;"
```

**Expected output:** All 6+ new columns listed

---

## Phase 2: Backfill Sources Table (10 minutes)

### Create Sources Backfill Script
Create `scripts/backfill-sources-production.ts`:

```typescript
import { getDbV2 } from "@/src/db";
import { sources } from "@/src/db/schema-v2";

const OFFICIAL_SOURCES = [
  {
    name: "SSC Official Portal",
    type: "official_portal",
    baseUrl: "https://ssc.gov.in",
    authority: "OFFICIAL" as const,
    isOfficial: true,
    active: true,
  },
  {
    name: "UPSC Official Portal",
    type: "official_portal",
    baseUrl: "https://upsc.gov.in",
    authority: "OFFICIAL" as const,
    isOfficial: true,
    active: true,
  },
  {
    name: "RRB Official Portal",
    type: "official_portal",
    baseUrl: "https://rrbapply.gov.in",
    authority: "OFFICIAL" as const,
    isOfficial: true,
    active: true,
  },
  {
    name: "IBPS Official Portal",
    type: "official_portal",
    baseUrl: "https://ibps.in",
    authority: "OFFICIAL" as const,
    isOfficial: true,
    active: true,
  },
  {
    name: "Employment News",
    type: "trusted_secondary",
    baseUrl: "https://employmentnews.gov.in",
    authority: "TRUSTED_SECONDARY" as const,
    isOfficial: false,
    active: true,
  },
  // Aggregators (scraper sources)
  {
    name: "SarkariResult",
    type: "aggregator",
    baseUrl: "https://sarkariresult.com",
    authority: "AGGREGATED" as const,
    isOfficial: false,
    active: true,
  },
  {
    name: "India SarkariNaukri",
    type: "aggregator",
    baseUrl: "https://indiasarkarinaukri.com",
    authority: "AGGREGATED" as const,
    isOfficial: false,
    active: true,
  },
  {
    name: "SarkariNaukri",
    type: "aggregator",
    baseUrl: "https://sarkarinaukri.com",
    authority: "AGGREGATED" as const,
    isOfficial: false,
    active: true,
  },
  {
    name: "Sahisarkarijobs",
    type: "aggregator",
    baseUrl: "https://sahisarkarijobs.com",
    authority: "AGGREGATED" as const,
    isOfficial: false,
    active: true,
  },
  {
    name: "FreeJobAlert",
    type: "aggregator",
    baseUrl: "https://freejobalert.com",
    authority: "AGGREGATED" as const,
    isOfficial: false,
    active: true,
  },
];

async function backfillSources() {
  const db = getDbV2();
  if (!db) throw new Error("Database connection failed");

  console.log(`📝 Backfilling ${OFFICIAL_SOURCES.length} sources...`);

  let created = 0;
  for (const source of OFFICIAL_SOURCES) {
    const result = await db
      .insert(sources)
      .values(source)
      .onConflictDoNothing()
      .returning();

    if (result.length > 0) {
      console.log(`  ✅ ${source.name}`);
      created++;
    } else {
      console.log(`  ⏭️  ${source.name} (already exists)`);
    }
  }

  console.log(`\n✅ Backfill complete: ${created} new sources created`);

  const count = await db
    .select()
    .from(sources)
    .then((rows) => rows.length);

  console.log(`📊 Total sources in database: ${count}`);
}

backfillSources().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
```

### Run Backfill
```bash
npx ts-node scripts/backfill-sources-production.ts
```

**Expected output:**
```
📝 Backfilling 10 sources...
  ✅ SSC Official Portal
  ✅ UPSC Official Portal
  ✅ RRB Official Portal
  ✅ IBPS Official Portal
  ✅ Employment News
  ✅ SarkariResult
  ✅ India SarkariNaukri
  ✅ SarkariNaukri
  ✅ Sahisarkarijobs
  ✅ FreeJobAlert

✅ Backfill complete: 10 new sources created
📊 Total sources in database: 10
```

### Verify Sources Table
```bash
psql $DATABASE_URL -c "SELECT id, name, authority, is_official FROM sources ORDER BY id;"
```

**Expected output:** 10 rows with correct authority levels

---

## Phase 3: Deploy Ingest Pipeline Update (Immediate)

The new ingest code is already in production build:
- `src/db/operations/write-postings-v2.ts` — Main ingest handler with provenance
- `src/ingest/run.ts` — Updated to use write-postings-v2

### Deploy to Production
```bash
git push origin main
# Deploy via your CI/CD (Vercel, etc.)
```

**What's included:**
- ✅ Raw content preservation (raw_title, raw_description, raw_content)
- ✅ Content hash calculation (SHA-256 for dedup)
- ✅ Source document tracking (source_id, source_document_id)
- ✅ Recruitment event logging (source-driven, not DB-change-driven)
- ✅ Expiry tracking (application_deadline, exam_date, last_crawled_at)

### Test Ingest (Dry-Run)
```bash
# Test the pipeline in dry-run mode
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

**Expected output:**
```json
{
  "success": true,
  "message": "Ingestion complete",
  "stats": {
    "inserted": "N",
    "updated": "N",
    "skipped": "N",
    "inferred": "N",
    "orphaned": "N"
  }
}
```

---

## Phase 4: Validate Data Quality (30 minutes)

### Run Quality Metrics Queries

**Recruitment Match Rate:**
```bash
psql $DATABASE_URL -c "
SELECT 
  COUNT(*) as total_postings,
  COUNT(CASE WHEN inferred_recruitment_id IS NOT NULL THEN 1 END) as matched,
  ROUND(100.0 * COUNT(CASE WHEN inferred_recruitment_id IS NOT NULL THEN 1 END) / COUNT(*), 2) as match_rate_pct
FROM postings;"
```

**Post/Position Match Rate:**
```bash
psql $DATABASE_URL -c "
SELECT 
  COUNT(*) as total_posts,
  COUNT(CASE WHEN position_id IS NOT NULL THEN 1 END) as matched,
  ROUND(100.0 * COUNT(CASE WHEN position_id IS NOT NULL THEN 1 END) / COUNT(*), 2) as match_rate_pct
FROM posts;"
```

**Duplicate Detection (content_hash):**
```bash
psql $DATABASE_URL -c "
SELECT 
  COUNT(*) as total_with_hash,
  COUNT(DISTINCT content_hash) as unique_hashes,
  COUNT(*) - COUNT(DISTINCT content_hash) as duplicates,
  ROUND(100.0 * (COUNT(*) - COUNT(DISTINCT content_hash)) / COUNT(*), 2) as duplicate_rate_pct
FROM postings WHERE content_hash IS NOT NULL;"
```

**Orphan Rate (no source_document_id):**
```bash
psql $DATABASE_URL -c "
SELECT 
  COUNT(*) as total_postings,
  COUNT(CASE WHEN source_document_id IS NULL THEN 1 END) as orphan_postings,
  ROUND(100.0 * COUNT(CASE WHEN source_document_id IS NULL THEN 1 END) / COUNT(*), 2) as orphan_rate_pct
FROM postings;"
```

**Source Authority Distribution:**
```bash
psql $DATABASE_URL -c "
SELECT 
  s.authority,
  COUNT(DISTINCT p.id) as posting_count,
  COUNT(DISTINCT sd.id) as document_count
FROM sources s
LEFT JOIN source_documents sd ON s.id = sd.source_id
LEFT JOIN postings p ON sd.id = p.source_document_id
GROUP BY s.authority
ORDER BY posting_count DESC;"
```

### Log Results
```bash
# Save metrics to file for tracking
psql $DATABASE_URL -c "
INSERT INTO ingest_metrics (metric_date, metric_name, metric_value, metric_details)
SELECT 
  CURRENT_DATE,
  'recruitment_match_rate',
  ROUND(100.0 * COUNT(CASE WHEN inferred_recruitment_id IS NOT NULL THEN 1 END) / COUNT(*)),
  jsonb_build_object(
    'total_postings', COUNT(*),
    'matched', COUNT(CASE WHEN inferred_recruitment_id IS NOT NULL THEN 1 END)
  )
FROM postings
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';" 2>&1 | tee -a deployment_metrics.log
```

---

## Phase 5: Rollback Plan (If Needed)

### If Issues Arise Before First Ingest

```bash
# Restore from backup
psql $DATABASE_URL < backup_2026_10_01_pre_deployment.sql

# Revert code
git revert HEAD~2 HEAD  # Reverts migration + ingest commits
git push origin main

# Verify rollback
psql $DATABASE_URL -c "SELECT COUNT(*) FROM postings;"  # Should match pre-backup count
```

### If Issues Arise After Ingest

```bash
# Keep backup + new data
# Fix data with SQL corrections
# Example: Fix orphaned postings by linking to source_documents manually

UPDATE postings 
SET source_document_id = (
  SELECT id FROM source_documents 
  WHERE external_id = postings.external_id 
  LIMIT 1
)
WHERE source_document_id IS NULL;
```

---

## Post-Deployment (Ongoing)

### Daily Metrics Check
```bash
# Run this query daily to monitor ingestion health
psql $DATABASE_URL -c "
-- Recruitment match rate
SELECT 'recruitment_match_rate' as metric, 
  ROUND(100.0 * COUNT(CASE WHEN inferred_recruitment_id IS NOT NULL THEN 1 END) / COUNT(*)) as percent_value
FROM postings WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
UNION ALL
-- Orphan rate
SELECT 'orphan_rate', 
  ROUND(100.0 * COUNT(CASE WHEN source_document_id IS NULL THEN 1 END) / COUNT(*))
FROM postings WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
UNION ALL
-- Duplicate detection
SELECT 'duplicate_rate',
  ROUND(100.0 * (COUNT(*) - COUNT(DISTINCT content_hash)) / COUNT(*))
FROM postings WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND content_hash IS NOT NULL;"
```

### Weekly Audit
```bash
# Check for orphaned/problematic postings
psql $DATABASE_URL -c "
SELECT COUNT(*) as problem_postings
FROM postings 
WHERE 
  (source_document_id IS NULL AND created_at >= CURRENT_DATE - INTERVAL '7 days')
  OR (confidence_score < 40 AND created_at >= CURRENT_DATE - INTERVAL '7 days')
  OR (inferred_recruitment_id IS NULL AND inferred_post_id IS NULL AND created_at >= CURRENT_DATE - INTERVAL '7 days');"
```

---

## Deployment Checklist

- [ ] Database backup created
- [ ] Database connectivity verified
- [ ] Migration SQL applied (`migrations/0006_*.sql`)
- [ ] New tables verified (sources, source_documents, recruitment_events, eligibility_alternatives)
- [ ] New columns on postings verified
- [ ] Sources table backfilled (10+ sources)
- [ ] New ingest code deployed to production
- [ ] Dry-run test passed
- [ ] Quality metrics queries executed
- [ ] All metrics logged to file
- [ ] Rollback plan documented
- [ ] Daily metrics monitoring set up
- [ ] Team notified of changes

---

## Success Criteria

✅ All new tables present and indexed  
✅ 10+ sources in database  
✅ New ingest pipeline deployed  
✅ Recruitment match rate ≥ 50%  
✅ Orphan rate < 10%  
✅ No errors in ingest logs  
✅ Duplicate detection working (content_hash)  
✅ Recruitment events being logged  

---

## Support

**Questions?** See:
- `SCHEMA_UPDATES_2026_10_01.md` — Architecture principles
- `IMPLEMENTATION_GUIDE.md` — Detailed deployment guide
- `src/db/operations/write-postings-v2.ts` — Ingest code with comments

**Emergency rollback:** Contact database team with backup filename

---

**Prepared by:** Claude (Senior Architect)  
**Date:** October 1, 2026  
**Status:** READY FOR DEPLOYMENT
