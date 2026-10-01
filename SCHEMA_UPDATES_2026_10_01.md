# Schema Updates - October 1, 2026

## Overview
Added 5 high-leverage data infrastructure layers to support:
1. **Source/provenance tracking** — Know where every fact comes from
2. **Deduplication + external identity** — Prevent duplicates, enable canonical truth
3. **Raw source preservation** — Maintain chain: Source → Raw Data → Normalized
4. **Change history/events** — Track recruitment lifecycle (corrigendums, date changes, etc.)
5. **Structured + queryable eligibility** — Support both flat queries and OR conditions

---

## New Tables

### `sources` (Authority Layer)
Tracks data source metadata with authority levels.

```sql
id (serial)
name (varchar)
type (varchar) -- "official_portal", "employment_news", "aggregator", etc.
base_url (text)
authority (enum: OFFICIAL, TRUSTED_SECONDARY, AGGREGATED)
is_official (boolean)
active (boolean)
created_at, updated_at (timestamp)
```

**Purpose:** Enable source-aware data queries. Display: "Official SSC notification" vs "Republished in Employment News"

---

### `source_documents` (Document Provenance)
Individual source documents that back up facts.

```sql
id (serial)
source_id (FK → sources)
url (text)
document_type (varchar) -- "notification", "corrigendum", "result", etc.
external_id (varchar) -- Official reference number
published_at (timestamp)
discovered_at (timestamp)
content_hash (varchar, SHA-256) -- For dedup across sources
raw_content (text)
extracted_at (timestamp)
extraction_method (varchar) -- "pdf_parser", "html_scraper", "api", etc.
created_at (timestamp)
```

**Purpose:** Maintain audit trail. Enable source verification and change tracing.

---

### `recruitment_events` (Lifecycle History)
Track all lifecycle events with audit fields.

```sql
id (serial)
recruitment_id (FK → recruitments)
event_type (enum: NOTIFICATION_PUBLISHED, APPLICATION_OPENED, VACANCY_REVISED, etc.)
event_date (timestamp)
title (varchar)
description (text)
changed_fields (jsonb) -- {vacancies: {old: 500, new: 450}, deadline: {...}}
source_document_id (FK → source_documents)
created_at (timestamp)
```

**Purpose:** Know exactly what changed, when, and where it came from. Enable notifications + transparency.

---

### `eligibility_alternatives` (OR Conditions)
Support "Qualification A OR Qualification B" patterns.

```sql
id (serial)
eligibility_id (FK → eligibilities)
alternative_order (smallint) -- 1, 2, 3...
qualification_id (FK → qualifications)
age_min, age_max (smallint)
experience_years_min, experience_years_max (smallint)
additional_conditions (text)
description (text) -- e.g., "B.Tech in CSE"
created_at (timestamp)
```

**Purpose:** Represent complex eligibility like "B.Tech OR (B.Sc + typing test)"

---

## Modified Tables

### `recruitments` (Added External Identity + Provenance)
```sql
-- NEW FIELDS:
official_notification_number (varchar) -- e.g., "No. 22/2026-RC" (strong signal, not universal key)
external_identifiers (jsonb) -- {"ssc_ref": "22/2026-RC", "en_ref": "..."}
source_document_id (FK → source_documents) -- Primary official source

-- NEW INDEX (queryable, not enforced unique):
INDEX on (organization_id, official_notification_number)
-- Enables lookups and joining by notification; does NOT enforce uniqueness
-- Recruitment identity survives missing, changed, or duplicate notification numbers
```

**Purpose:** Provenance tracking + identity signal. Recruitment identity is based on (id, organization), not notification number. The notification_number field is queryable but not the universal key. This allows recovery if notification numbers change, duplicate, or are missing entirely.

---

### `eligibilities` (Added Alternative Support)
```sql
-- NEW FIELD:
has_alternatives (boolean) -- if true, check eligibility_alternatives for OR rules
```

**Purpose:** Flag posts with complex eligibility so UI can render alternatives.

---

### `postings` (Raw Preservation + Expiry Tracking)
```sql
-- RESTRUCTURED SOURCE REFERENCE:
source_id (FK → sources) -- NOW points to sources table (was: varchar "source")
source_document_id (FK → source_documents) -- Where this posting came from
external_id (varchar) -- Source system's ID (unchanged)

-- NEW RAW PRESERVATION FIELDS:
raw_title (text)
raw_description (text)
raw_content (text)
content_hash (varchar) -- SHA-256 for dedup
extracted_at (timestamp)
extraction_method (varchar) -- "pdf_parser", "html_scraper", etc.

-- NEW EXPIRY/STATUS TRACKING (Google JobPosting compatible):
application_deadline (timestamp) -- validThrough in structured data
exam_date (timestamp)
result_date (timestamp)
marked_expired_at (timestamp) -- When we marked it expired
last_crawled_at (timestamp) -- Last time we checked source

-- NEW INDEXES:
on (source_id)
on (content_hash) -- for dedup detection
on (application_deadline) -- for expiry queries
```

**Purpose:** 
- Preserve original source for audit/reconstruction
- Support dedup via content_hash
- Enable Google JobPosting schema with validThrough
- Track when postings expire

---

## New Enums

### `source_authority`
- `OFFICIAL` — SSC website, UPSC website (primary source)
- `TRUSTED_SECONDARY` — Employment News, trusted republishers
- `AGGREGATED` — Multiple sources combined

### `recruitment_event_type`
- `NOTIFICATION_PUBLISHED`
- `APPLICATION_OPENED`, `APPLICATION_DEADLINE_EXTENDED`
- `CORRIGENDUM`, `VACANCY_REVISED`
- `EXAM_DATE_CHANGED`, `EXAM_HELD`
- `ADMIT_CARD_RELEASED`, `ANSWER_KEY_RELEASED`
- `RESULT_DECLARED`, `FINAL_RESULT`
- `OTHER`

---

## Data Flow Implications

### Before (Old Model)
```
Source Portal
    ↓
Scraper
    ↓
postings table (single flat record)
    ↓
(Info lost; no audit trail)
```

### After (New Model)
```
Source Portal (SSC.gov.in)
    ↓
sources.id = 1, authority = "OFFICIAL"
    ↓
source_documents (PDF notification, corrigendum, etc.)
    ↓
postings (raw_content preserved) + postings.source_document_id
    ↓
recruitments (with official_notification_number + source_document_id)
    ↓
recruitment_events (lifecycle tracking)
    ↓
(Full audit trail; can trace any fact back to source)
```

---

## Implementation Notes

### Migration Strategy (Not Yet Applied)
1. Add new tables: `sources`, `source_documents`, `recruitment_events`, `eligibility_alternatives`
2. Migrate `postings.source` (varchar) → `postings.source_id` (FK)
3. Add new columns to `recruitments`, `eligibilities`, `postings`
4. Backfill `sources` table with existing source types (SSC, UPSC, etc.)
5. Set `postings.source_id` based on existing `postings.source` values
6. Set `source_authority` defaults based on known sources
7. Backfill `recruitment_events` from change logs if available

### Indexing Strategy
- **Dedup detection:** `postings.content_hash`, `source_documents.content_hash`
- **Candidate matching:** `eligibilities (age_min, age_max)`, `eligibility_alternatives (qualification_id)`
- **Expiry queries:** `postings.application_deadline`, `postings.marked_expired_at`
- **Source tracking:** `source_documents.source_id`, `recruitment_events.event_type`

---

## Next Steps

### Schema-Level (Done)
- ✅ Define sources, source_documents, recruitment_events, eligibility_alternatives tables
- ✅ Add external identity fields to recruitments
- ✅ Add raw preservation fields to postings
- ✅ Add expiry tracking fields to postings
- ✅ Add alternative eligibility support

### Operational (In Progress)
- ⏳ Create Drizzle migrations to apply schema changes
- ⏳ Write backfill scripts for historical data
- ⏳ Update ingest pipeline to populate `sources`, `source_documents`, `recruitment_events`
- ⏳ Update scraper to store `raw_content`, `content_hash`, `extraction_method`
- ⏳ Write dedup logic: detect duplicates by content_hash + official_notification_number

### UI/Product (Later)
- Show "Official Source: SSC" badge on postings
- Display "Last Updated: [date] via [source]" on recruitment pages
- Show recruitment event timeline: "Application extended by 2 weeks" + date + source
- Enable "Jobs matching my eligibility" matching engine (uses queryable eligibilities)

---

## Architectural Principles (Established Oct 2026)

### Recruitment Identity
- **Core Principle:** Recruitment identity must survive missing, changed, or duplicate notification numbers.
- **Identity Key:** (organization_id, id) is the permanent recruitment identity.
- **Notification Number:** Acts as a queryable identity signal, not the universal key.
- **Implication:** Deduplication is content-based (via source_documents + content_hash), not notification-based.

### Events as Evidence
- **Core Principle:** `recruitment_events` represents externally evidenced changes from source documents, not every database mutation.
- **Event Source:** Every event must be traceable to a source_document.
- **Change Tracking:** Only meaningful, document-evidenced changes are recorded (corrigenda, vacancy revisions, date changes, result announcements).

### No Further Architecture Expansion
- The foundation (provenance, events, structured eligibility, raw preservation) is now frozen.
- Next work: **Ingest real data → measure quality metrics → let production data expose next problems.**
- Quality metrics to measure: recruitment match rate, post/position match rate, duplicate rate, orphan rate, confidence by source.

---

## Backward Compatibility

**Breaking Changes:**
- `postings.source` (varchar) is being replaced by `postings.source_id` (FK)
  - Any code querying `postings.source` must migrate to join `postings → sources → sources.name`

**Non-Breaking Additions:**
- All new columns are optional (nullable or have defaults)
- Existing queries continue to work
- New functionality is behind feature flags initially

---

## Success Metrics

Once fully implemented, you can answer:

1. **Provenance:** "Show me the official SSC notification for SSC CGL 2026"
   ```sql
   SELECT sd.url, sd.published_at
   FROM recruitments r
   JOIN source_documents sd ON r.source_document_id = sd.id
   WHERE r.organization_id = (SELECT id FROM organizations WHERE slug = 'ssc')
   AND r.year = 2026
   AND sd.document_type = 'notification'
   ```

2. **Identity Lookup:** "Find recruitment by organization and notification number"
   ```sql
   SELECT * FROM recruitments
   WHERE organization_id = 1 
   AND official_notification_number = 'No. 01/2026-RC'
   -- May return 0, 1, or multiple matches (identity survives missing/changed notification numbers)
   -- Real recruitment dedup is content-based (via source documents + content_hash)
   ```

3. **Change History:** "What changed in this recruitment and when?"
   ```sql
   SELECT event_type, changed_fields, event_date, sd.url
   FROM recruitment_events re
   JOIN source_documents sd ON re.source_document_id = sd.id
   WHERE recruitment_id = 42
   ORDER BY event_date
   ```

4. **Candidate Matching:** "Which jobs can someone with B.Sc apply to?"
   ```sql
   SELECT p.name
   FROM posts p
   JOIN eligibilities e ON p.id = e.post_id
   WHERE (e.qualification_id = 5) -- B.Sc
   OR EXISTS (
     SELECT 1 FROM eligibility_alternatives ea
     WHERE ea.eligibility_id = e.id
     AND ea.qualification_id = 5
   )
   ```

---

**Last Updated:** 2026-10-01  
**Version:** 1.0
