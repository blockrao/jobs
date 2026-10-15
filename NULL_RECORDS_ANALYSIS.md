# Analysis: 215 Recruitment Records with NULL official_notification_url and application_end_date

## Executive Summary

**Critical Issue**: 215 recruitment records (representing 106 unique organizations and 215 posts) are stored in the database with both `official_notification_url` and `application_end_date` as NULL. This blocks implementation of the proposed uniqueness constraint and violates your mandatory rule: "we might not be able to live a record if this is missing."

## Scale of the Problem

| Metric | Count |
|--------|-------|
| Total NULL records | 215 |
| Unique organizations | 106 |
| Posts in NULL records | 215 |
| Records blocking the constraint | 215 (100%) |

## Timeline of NULL Records

| Date Created | Count | Note |
|---|---|---|
| 2026-10-01 | 124 | Initial data load (largest batch) |
| 2026-10-04 | 11 | Early promotion |
| 2026-10-06 | 52 | Continued promotion |
| 2026-10-13 | 2 | Mid-period promotion |
| 2026-10-15 | 2 | **Recent promotion** (BMC, DRDO MTRDC) |
| **TOTAL** | **215** | |

## Top Organizations Affected

| Organization | Count | First | Last |
|---|---|---|---|
| Indian Institute of Information Technology Kota | 33 | 2026-10-01 | 2026-10-06 |
| Public Sector Undertaking | 10 | 2026-10-01 | 2026-10-06 |
| AIIMS / Medical Institute | 10 | 2026-10-01 | 2026-10-06 |
| Uttar Pradesh State Recruitment | 9 | 2026-10-01 | 2026-10-01 |
| Bihar Public Service Commission | 5 | 2026-10-01 | 2026-10-06 |

**Pattern**: Most are generic category names or state-level aggregates, suggesting these came from weak aggregator sources without official URLs.

## Recent 2026-10-15 Promotion Records

### Record 1: DRDO MTRDC
- **ID**: 5533
- **Name**: DRDO MTRDC Recruitment 2026 – Junior Research Fellow (1 Post)
- **Organization**: DRDO MTRDC
- **Post**: Junior Research Fellow
- **Source**: Promoted from Excel
- **Excel Status**: ALSO HAS NULL URL ("See notice" as Last date)
- **Assessment**: Correctly reflects Excel data; cannot be assigned URL

### Record 2: BMC
- **ID**: 5534
- **Name**: BMC Recruitment 2026 – Medical Officer, Assistant Medical Officer & Other (137 Posts)
- **Organization**: Brihanmumbai Municipal Corporation
- **Posts**: Medical Officer | Assistant Medical Officer & Other
- **Source**: Promoted from Excel
- **Excel Status**: Individual BMC records exist with proper URLs, but aggregated "137 Posts" record does not appear in Excel
- **Assessment**: Aggregation created from incomplete/derived source

## Root Causes

### 1. **Weak Aggregator Sources** (pre-2026-10-15)
- Generic organization names created from title scraping
- Sources lacked URL data
- ~200 records from initial loads (2026-10-01 through 2026-10-06)

### 2. **Missing Data in Promotion Logic**
- DRDO MTRDC: Excel record itself has NULL URL
- BMC: Database record is an aggregation not present in Excel structure
- Suggests promotion didn't verify URL presence before creating records

### 3. **Excel Data Gaps**
- Some records in Excel already have NULL "Official notification URL"
- Promotion faithfully reproduced NULL values
- No validation gate to require URLs

## Architectural Constraint

### Why This Blocks the Uniqueness Constraint

PostgreSQL UNIQUE constraints **cannot enforce uniqueness on NULL values**:
```sql
-- This constraint will NOT prevent duplicate NULLs
ALTER TABLE recruitments ADD UNIQUE(official_notification_url, application_end_date);
```

With 215 records having NULL keys:
- Multiple recruitments with identical (NULL, NULL) key pairs violate uniqueness intent
- Cannot deduplicate using the proposed key
- These records are unmatchable against future imports

## Remediation Options

### Option A: DELETE (Recommended for 215 NULL records)
**Rationale**: Your rule states "we might not be able to live a record if this is missing"
- Delete all 215 records
- They cannot be uniquely identified without URL and date
- They cannot be matched against future imports
- Frees database from invalid state
- Allows UNIQUE constraint implementation

**Risk**: Any valid posts these records represent are lost. But if they lack URLs, they are not discoverable in search/SEO anyway.

**Action**:
```sql
DELETE FROM recruitments 
WHERE official_notification_url IS NULL AND application_end_date IS NULL;
-- Deletes 215 records, 106 organizations, 215 posts
```

### Option B: ADD CONSTRAINTS FIRST (Conditional)
**If you want to keep some records**:
1. Manually add missing URLs to high-value records (e.g., IIT Kota's 33 records)
2. Find application_end_date from official sources
3. Then apply unique constraint
4. Delete remaining 215

**Risk**: Manual correction of 215 records is time-consuming and error-prone.

### Option C: MAKE FIELDS NULLABLE IN CONSTRAINT (Not Recommended)
**If you want to keep NULL records as-is**:
1. Create a PARTIAL unique constraint:
```sql
ALTER TABLE recruitments ADD UNIQUE(official_notification_url, application_end_date) 
WHERE official_notification_url IS NOT NULL AND application_end_date IS NOT NULL;
```
2. Allows NULL pairs (won't prevent duplicates)
3. Still doesn't solve the deduplication problem
4. Leaves 215 invalid records in database

**Risk**: Violates your mandatory rule and doesn't solve the core problem.

## Recommendation

**Option A (DELETE)** is the correct path forward:
1. **Immediate**: Delete all 215 NULL records
2. **Next**: Implement UNIQUE constraint on (official_notification_url, application_end_date)
3. **Then**: Re-run promotion with validation that URL and date are present before creating records
4. **Finally**: Verify 2026-10-15 promotion added only valid records

This ensures:
- Database is in a valid state per your mandatory rule
- Uniqueness constraint prevents re-ingestion
- Future imports cannot create invalid records
- Phase 1 discoverability (official content only) is maintained

## Decision Required

What should we do with the 215 NULL records? Recommend deletion given your mandatory constraint.

