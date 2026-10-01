# Implementation Guide - Schema Infrastructure Layer
**Date:** October 1, 2026  
**Scope:** Database migration, source backfill, ingest pipeline updates  
**Status:** Ready for implementation

---

## Overview

The schema infrastructure layer (provenance, events, structured eligibility) is now defined in:
- **Schema:** `src/db/schema-v2.ts` (TypeScript ORM definitions)
- **Migration:** `migrations/0006_schema_infrastructure_2026_10_01.sql` (SQL DDL)
- **Documentation:** `SCHEMA_UPDATES_2026_10_01.md` (architecture + principles)

This guide covers the operational steps to deploy these changes.

---

## Phase 1: Database Migration (1-2 hours)

### Step 1.1: Apply Migration SQL

The migration file is ready in `migrations/0006_schema_infrastructure_2026_10_01.sql`.

**Using psql directly:**
```bash
psql $DATABASE_URL -f migrations/0006_schema_infrastructure_2026_10_01.sql
```

**Using a migration runner:** (if configured)
```bash
npm run db:migrate -- up
```

**What it does:**
1. Creates `source_authority` and `recruitment_event_type` enums
2. Creates `sources`, `source_documents`, `recruitment_events`, `eligibility_alternatives` tables
3. Adds 13 new columns to `postings` table
4. Adds 3 new columns to `recruitments` table
5. Adds 1 new column to `eligibilities` table
6. Creates indexes for all new tables and columns

**Expected time:** < 30 seconds (if database is accessible)

**Rollback:** (if needed)
```sql
DROP TABLE IF EXISTS eligibility_alternatives;
DROP TABLE IF EXISTS recruitment_events;
DROP TABLE IF EXISTS source_documents;
DROP TABLE IF EXISTS sources;
ALTER TABLE eligibilities DROP COLUMN IF EXISTS has_alternatives;
ALTER TABLE postings DROP COLUMN IF EXISTS source_id, source_document_id, raw_title, raw_description, raw_content, content_hash, extracted_at, extraction_method, application_deadline, exam_date, result_date, marked_expired_at, last_crawled_at;
ALTER TABLE recruitments DROP COLUMN IF EXISTS official_notification_number, external_identifiers, source_document_id;
DROP TYPE IF EXISTS recruitment_event_type;
DROP TYPE IF EXISTS source_authority;
```

---

## Phase 2: Backfill Sources Table (1-2 hours)

The `sources` table must be populated before data can reference it.

### Step 2.1: Create Backfill Script

Create `scripts/backfill_sources.ts`:

```typescript
import { getDbV2 } from "@/db";
import { sources } from "@/db/schema-v2";

const OFFICIAL_SOURCES = [
  {
    name: "SSC Official Portal",
    type: "official_portal",
    base_url: "https://ssc.gov.in",
    authority: "OFFICIAL",
    is_official: true,
  },
  {
    name: "UPSC Official Portal",
    type: "official_portal",
    base_url: "https://upsc.gov.in",
    authority: "OFFICIAL",
    is_official: true,
  },
  {
    name: "RRB Official Portal",
    type: "official_portal",
    base_url: "https://rrbapply.gov.in",
    authority: "OFFICIAL",
    is_official: true,
  },
  {
    name: "Employment News",
    type: "trusted_secondary",
    base_url: "https://employmentnews.gov.in",
    authority: "TRUSTED_SECONDARY",
    is_official: false,
  },
  {
    name: "IBPS Official Portal",
    type: "official_portal",
    base_url: "https://ibps.in",
    authority: "OFFICIAL",
    is_official: true,
  },
  // Add all state PSCs here (AP, TG, TN, KA, MH, UP, etc.)
];

export async function backfillSources() {
  const db = getDbV2();
  if (!db) throw new Error("Database connection failed");

  for (const source of OFFICIAL_SOURCES) {
    await db
      .insert(sources)
      .values({
        name: source.name,
        type: source.type,
        base_url: source.base_url,
        authority: source.authority as any,
        is_official: source.is_official,
        active: true,
      })
      .onConflictDoNothing();
  }

  console.log(`✓ Backfilled ${OFFICIAL_SOURCES.length} sources`);
}

if (require.main === module) {
  backfillSources().catch(console.error);
}
```

**Run backfill:**
```bash
npx ts-node scripts/backfill_sources.ts
```

**Verify:**
```sql
SELECT id, name, authority FROM sources ORDER BY id;
```

Expected output: ~20-25 rows (SSC, UPSC, RRB, IBPS, state PSCs, Employment News, etc.)

---

## Phase 3: Update Ingest Pipeline (2-4 hours)

The ingest pipeline (scraper/crawler) must be updated to populate the new columns and tables.

### Step 3.1: Update Posting Ingest

In the posting ingestion code, add these fields:

```typescript
// For each posting ingested from a source document:

const posting = {
  // existing fields...
  title: normalized_title,
  description: normalized_description,
  
  // NEW: Raw preservation
  raw_title: original_title_from_pdf,
  raw_description: original_description_from_pdf,
  raw_content: original_html_or_text,
  content_hash: sha256(raw_content), // SHA-256 of raw content
  extracted_at: new Date(),
  extraction_method: "pdf_parser" | "html_scraper" | "api",
  
  // NEW: Expiry tracking
  application_deadline: parsed_deadline,
  exam_date: parsed_exam_date,
  result_date: parsed_result_date,
  
  // NEW: Provenance references
  source_id: source.id, // From sources table
  source_document_id: sourceDocument.id, // From source_documents table
};
```

### Step 3.2: Create Source Documents on Ingest

When a new source document is found (e.g., a PDF notification):

```typescript
const sourceDocument = await db
  .insert(sourceDocuments)
  .values({
    source_id: source.id,
    url: "https://ssc.gov.in/...notification.pdf",
    document_type: "notification" | "corrigendum" | "result",
    external_id: "No. 22/2026-RC", // From the PDF
    published_at: parse_date_from_document,
    content_hash: sha256(pdf_raw_bytes),
    raw_content: extracted_text_from_pdf,
    extraction_method: "pdf_parser",
  })
  .returning();
```

### Step 3.3: Track Recruitment Changes via Events

When a recruitment's attributes change (vacancy count, deadline, status):

```typescript
const event = await db
  .insert(recruitmentEvents)
  .values({
    recruitment_id: recruitment.id,
    event_type: "VACANCY_REVISED" | "APPLICATION_DEADLINE_EXTENDED" | "CORRIGENDUM",
    event_date: new Date(), // When the change occurred
    title: "Vacancy revised in SSC CGL 2026",
    description: "Vacancy count updated from 500 to 450",
    changed_fields: {
      vacancy_total: { old: 500, new: 450 },
      updated_at: { old: "2026-10-01", new: "2026-10-05" },
    },
    source_document_id: sourceDocument.id, // Link to evidence
  })
  .returning();
```

**Key principle:** Every event must be traceable to a source document. Events are not database mutations; they are externally evidenced changes.

---

## Phase 4: Add Quality Metrics (1-2 hours)

Before scaling the ingest pipeline, measure these metrics:

### Step 4.1: Create Metrics Schema

```sql
CREATE TABLE IF NOT EXISTS ingest_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value INTEGER,
  metric_details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ingest_metrics_date_name ON ingest_metrics(metric_date, metric_name);
```

### Step 4.2: Implement Metrics Collection

**Recruitment Match Rate:** (How many postings matched to a recruitment?)
```sql
SELECT 
  COUNT(*) as total_postings,
  COUNT(CASE WHEN recruitment_id IS NOT NULL THEN 1 END) as matched,
  ROUND(100.0 * COUNT(CASE WHEN recruitment_id IS NOT NULL THEN 1 END) / COUNT(*), 2) as match_rate
FROM postings;
```

**Post/Position Match Rate:** (How many posts matched to a position?)
```sql
SELECT 
  COUNT(*) as total_posts,
  COUNT(CASE WHEN position_id IS NOT NULL THEN 1 END) as matched,
  ROUND(100.0 * COUNT(CASE WHEN position_id IS NOT NULL THEN 1 END) / COUNT(*), 2) as match_rate
FROM posts;
```

**Duplicate Rate:** (How many postings have duplicate content_hash?)
```sql
SELECT 
  COUNT(*) as total_with_hash,
  COUNT(DISTINCT content_hash) as unique_hashes,
  ROUND(100.0 * (COUNT(*) - COUNT(DISTINCT content_hash)) / COUNT(*), 2) as duplicate_rate
FROM postings WHERE content_hash IS NOT NULL;
```

**Orphan Rate:** (Postings with no source_document_id)
```sql
SELECT 
  COUNT(*) as total_postings,
  COUNT(CASE WHEN source_document_id IS NULL THEN 1 END) as orphan_postings,
  ROUND(100.0 * COUNT(CASE WHEN source_document_id IS NULL THEN 1 END) / COUNT(*), 2) as orphan_rate
FROM postings;
```

**Source Authority Distribution:**
```sql
SELECT 
  s.authority,
  COUNT(DISTINCT p.id) as posting_count,
  COUNT(DISTINCT sd.id) as document_count
FROM sources s
LEFT JOIN source_documents sd ON s.id = sd.source_id
LEFT JOIN postings p ON sd.id = p.source_document_id
GROUP BY s.authority;
```

### Step 4.3: Create Metrics Dashboard Query

```sql
-- Run daily to track ingestion health
INSERT INTO ingest_metrics (metric_date, metric_name, metric_value, metric_details)
SELECT 
  CURRENT_DATE,
  'recruitment_match_rate',
  ROUND(100.0 * COUNT(CASE WHEN recruitment_id IS NOT NULL THEN 1 END) / COUNT(*)),
  jsonb_build_object(
    'total_postings', COUNT(*),
    'matched', COUNT(CASE WHEN recruitment_id IS NOT NULL THEN 1 END)
  )
FROM postings
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';

-- Similar queries for post_match_rate, duplicate_rate, orphan_rate...
```

---

## Phase 5: Validation Checklist

- [ ] Migration SQL applied successfully (no errors)
- [ ] Sources table populated with ≥20 official sources
- [ ] Posting ingest updated to capture raw_content and content_hash
- [ ] Recruitment events recorded for past changes (via backfill or forward)
- [ ] Quality metrics running (recruitment_match_rate, duplicate_rate, orphan_rate)
- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors in src/db/schema-v2.ts
- [ ] Test: Query recruitment with all events: `SELECT * FROM recruitment_events WHERE recruitment_id = 1 ORDER BY event_date`
- [ ] Test: Find duplicates by content_hash: `SELECT content_hash, COUNT(*) FROM postings WHERE content_hash IS NOT NULL GROUP BY content_hash HAVING COUNT(*) > 1`

---

## Phase 6: Production Deployment

1. **Backup database:** `pg_dump $DATABASE_URL > backup_2026_10_01.sql`
2. **Apply migration:** See Phase 1
3. **Backfill sources:** See Phase 2
4. **Deploy ingest updates:** Push code with Phase 3 changes
5. **Monitor metrics:** Verify Phase 4 metrics are healthy
6. **Test key queries:** Run validation queries from Phase 5

**Rollback plan:** If issues arise, use backup from step 1 and revert code changes.

---

## What's NOT in Scope (Architectural Freeze)

Per explicit feedback, the following are deferred:
- ❌ Eligibility matching engine (design for it, don't build)
- ❌ Candidate personalization
- ❌ Advanced alerts
- ❌ AI-driven normalization
- ❌ Position alias management (beyond basic schema)

The next architectural review should be evidence-driven (based on production metrics), not speculative.

---

## Key Contacts & References

- **Architect Feedback:** See SCHEMA_UPDATES_2026_10_01.md "Architectural Principles"
- **Schema Definition:** src/db/schema-v2.ts
- **Migration File:** migrations/0006_schema_infrastructure_2026_10_01.sql
- **Build Status:** npm run build (should pass, ~1341ms)

---

**Last Updated:** 2026-10-01  
**Next Review:** After Phase 4 (Quality Metrics established)
