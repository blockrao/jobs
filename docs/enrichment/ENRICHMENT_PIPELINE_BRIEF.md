# Posting enrichment pipeline — task brief

**For a new thread.** This document is self-contained: everything a fresh
session needs to pick up and execute the enrichment work is here. Do not
assume context from any other session.

---

## What this is

JobOye has 1,087 active postings. 814 of them have an `official_notification_url`
pointing to the issuing body's PDF or recruitment page. Of those 814, **793 still
have at least one key structured field missing** (salary max, age limits, or
apply URL). The goal of this task is to work through that backlog — fetching each
official source, extracting the structured fields, and writing them to the
database.

**793 postings need enrichment. 697 of those link to PDFs. 96 link to web pages.**

---

## What we already have

- **`enrichment_source` column** on `public.postings`: tracks provenance.
  - `'official_notification'` = enriched from the issuing body's document
  - `'aggregator'` = only aggregator snippet, not yet enriched
  - `NULL` = not yet assessed
- **`enriched_at`** — timestamp of last enrichment pass
- **`enrichment_notes`** — free text; record confidence issues or unparsed clauses here
- **Posting 976 (FACT Engineer IT)** is already enriched and marked
  `enrichment_source = 'official_notification'`. It's the reference example.

---

## Database access

- **Supabase project ID:** `cusxodjgkrttwmdmhvso` (project name: `jobs`)
- **Access:** via Supabase MCP tool (`mcp__Supabase__execute_sql` and
  `mcp__Supabase__apply_migration`)
- **Production branch:** `main` in repo `blockrao/jobs`

---

## The fields to enrich

For each posting, extract from the official notification and write to
`public.postings`:

| Field | DB column | Notes |
|-------|-----------|-------|
| Employment type | `employment_type` | Enum: FULL_TIME, PART_TIME, CONTRACTOR, INTERN, TEMPORARY, OTHER, APPRENTICESHIP, DEPUTATION, FELLOWSHIP, INTERNSHIP, PERMANENT. Fixed-tenure/contract posts → TEMPORARY |
| Salary minimum | `salary_min` | Monthly, in INR integers. If pay band given, use minimum |
| Salary maximum | `salary_max` | Monthly, in INR integers. If pay band given, use maximum. If consolidated/fixed pay, set both min and max to same value |
| Age minimum | `age_limit_min` | Integer years. "Above 18" → 18 |
| Age maximum | `age_limit_max` | Integer years. "Less than 35" → 35 |
| Apply URL | `apply_url` | Direct link to application form or official careers portal |
| Application deadline | `valid_through` | Only update if current value is NULL or clearly wrong |

**Do not change:** `title`, `slug`, `status`, `official_notification_url`,
`post_names`, `total_vacancies` (unless explicitly stated as a fixed count in
the notification — panel formations leave it NULL).

---

## Enrichment rules

1. **Official source only.** Only write a value you found in the official
   notification. Never infer from the aggregator title or description text.
   If a field isn't in the notification, leave it NULL.

2. **One migration per posting (or small batch).** All writes go through
   `supabase/migrations/` — no direct SQL on production. Name migrations
   `YYYYMMDDHHMMSS_enrich_posting_NNN.sql` or batch as
   `YYYYMMDDHHMMSS_enrich_batch_NNN_to_NNN.sql`.

3. **Mark enrichment_source.** Every posting you update must also get:
   ```sql
   enrichment_source = 'official_notification',
   enriched_at       = NOW(),
   enrichment_notes  = '<one line: source clause or confidence note>'
   ```

4. **Mark failed attempts.** If you fetch the URL and cannot extract a field
   (PDF is scanned-only, page is behind a login, content is in an image), write:
   ```sql
   enrichment_source = 'aggregator',
   enriched_at       = NOW(),
   enrichment_notes  = 'PDF scanned/unreadable' -- or appropriate reason
   ```
   This marks it as attempted so future passes skip it.

5. **Employment type caution.** The enum has no `CONTRACT` value. Map as:
   - Fixed-term / contract / adhoc → `TEMPORARY`
   - Deputation → `DEPUTATION`
   - Apprenticeship → `APPRENTICESHIP`
   - Internship / trainee → `INTERNSHIP`
   - Regular / permanent → `PERMANENT`
   - Consultancy / off-roll → `CONTRACTOR`

6. **No pre-change report needed for this enrichment backlog** — each UPDATE
   is a bounded write of NULL fields from a verified official source. The
   enrichment_source column itself is the audit trail. Pre-change reports
   are required for merges, schema changes, or writes that overwrite
   non-NULL canonical values.

---

## Query to find your work queue

Run this in the Supabase SQL editor or via the MCP tool to get the list to
work through, freshest deadline first:

```sql
SELECT 
  id,
  slug,
  official_notification_url,
  employment_type,
  salary_min, salary_max,
  age_limit_min, age_limit_max,
  apply_url,
  valid_through,
  enrichment_source,
  enriched_at
FROM public.postings
WHERE status = 'ACTIVE'
  AND official_notification_url IS NOT NULL
  AND (enrichment_source IS NULL OR enrichment_source = 'aggregator')
  AND (salary_max IS NULL OR age_limit_min IS NULL OR age_limit_max IS NULL OR apply_url IS NULL)
ORDER BY valid_through ASC NULLS LAST;
```

This returns the 793 postings that still need work, oldest deadline first
(most urgent). Filter to `official_notification_url ILIKE '%.pdf'` for
PDF-only batches (697 rows) or exclude that for web pages (96 rows).

---

## How to process a posting

### Step 1 — Fetch the document

**For PDFs:**
```bash
# Download to a temp dir (never run the shell from inside downloaded content)
mkdir -p /tmp/enrich/ID && curl -L "URL" -o /tmp/enrich/ID/notification.pdf
pdfinfo /tmp/enrich/ID/notification.pdf
pdffonts /tmp/enrich/ID/notification.pdf
# If fonts present (text layer exists):
pdftotext /tmp/enrich/ID/notification.pdf /tmp/enrich/ID/notification.txt
cat /tmp/enrich/ID/notification.txt
# If no fonts (scanned):
# → Rasterize key pages: pdftoppm -jpeg -r 150 -f 1 -l 3 ...
# → Read images visually. Mark as aggregator if unreadable.
```

**For web pages:**
Use WebFetch to read the page. Look for the salary, age, and application
details in the page text.

### Step 2 — Extract fields

Look for these patterns in Indian government notifications:

- **Salary:** "Pay Level", "Pay Band", "₹ XX,XXX/-", "Consolidated pay of ₹",
  "Fixed remuneration", "Stipend of ₹"
- **Age:** "Age limit", "not exceeding X years", "between X and Y years",
  "above X years", "below X years as on DD.MM.YYYY"
- **Employment type:** "Contract basis", "Deputation", "Permanent",
  "Regular", "Temporary", "Adhoc", "Fixed tenure"
- **Apply URL:** "Apply online at", "Applications through", official portal link
  at the end of the notification
- **Deadline:** "Last date", "closing date", "apply before"

### Step 3 — Write a migration

```sql
-- enrichment: <org name> <post name> posting <id>
-- Source: <official_notification_url>
UPDATE public.postings
SET
  employment_type    = 'TEMPORARY',  -- or whichever applies
  salary_min         = 25000,
  salary_max         = 25000,
  age_limit_min      = 18,
  age_limit_max      = 40,
  apply_url          = 'https://...',
  enrichment_source  = 'official_notification',
  enriched_at        = NOW(),
  enrichment_notes   = 'Fixed pay ₹25,000 §3; age 18-40 §4; apply at careers portal §12'
WHERE id = NNN;
```

Apply via `mcp__Supabase__apply_migration` with project_id `cusxodjgkrttwmdmhvso`.

### Step 4 — Commit

```
git add supabase/migrations/TIMESTAMP_enrich_batch_NNN_to_NNN.sql
git commit -m "data: enrich postings NNN-NNN from official notifications"
```

Batch migrations into groups of 10–20 postings per commit to stay within
the one-push-per-verified-step rule. Do not push after every single posting.

---

## Priority order

Work the queue in this order:

1. **Deadlines in the next 30 days** — most time-sensitive for users
2. **PDFs with text layers** — fastest to process
3. **Web pages** — slower, may need WebFetch per page
4. **Scanned PDFs** — hardest; mark as aggregator if OCR fails

---

## Progress check

To see how far along you are at any point:

```sql
SELECT 
  enrichment_source,
  COUNT(*) as count
FROM public.postings
WHERE status = 'ACTIVE' AND official_notification_url IS NOT NULL
GROUP BY enrichment_source
ORDER BY count DESC;
```

When `enrichment_source = 'official_notification'` reaches ~800, the backlog
is cleared.

---

## What NOT to do

- Do not write to any field whose current value is already non-NULL and
  correct — only fill gaps (NULL fields)
- Do not infer salary from title ("Senior" → higher pay)
- Do not set `total_vacancies` from aggregator text; only from an explicit
  number in the notification
- Do not change `slug`, `title`, `status`, or `official_notification_url`
- Do not push documentation-only commits separately from the migration they
  document
- Do not touch the DATA-000 track or any org/category tables — this task
  is enrichment of `postings` only

---

## Reference: the completed FACT example

Posting 976 (`fact-engineer-recruitment-2026-apply-online-b3560b`) was
enriched manually on 2026-10-07 from Official Notification No. 7/2026.

Migration: `supabase/migrations/20261007160000_fact_engineer_it_enrich.sql`  
Pre-change report: `docs/pre-change/FACT_ENGINEER_IT_ENRICH.md`

Changes made:
- `employment_type`: FULL_TIME → TEMPORARY (§2: fixed tenure contract, adhoc)
- `salary_max`: NULL → 31000 (§3: consolidated fixed pay = salary_min)
- `age_limit_min`: NULL → 18 (§1: above 18 years)
- `age_limit_max`: NULL → 35 (§1: less than 35 years as on 01.10.2026)
- `apply_url`: NULL → https://www.fact.co.in/careers (§14)
