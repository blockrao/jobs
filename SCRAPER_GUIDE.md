# Job Scraper Guide

This document explains how the job scraping pipeline works and how to populate your site with job data.

## Overview

The scraping pipeline automatically:
1. **Crawls** 5 government job portals in parallel
2. **Deduplicates** postings using source + external ID
3. **Normalizes** data (stages, slugs, formatting)
4. **Detects exams** from posting titles (e.g., "SSC CGL" → `ssc-cgl` exam)
5. **Links jobs** to exam pages automatically
6. **Writes to database** with confidence scoring

## Job Sources

The following portals are configured and ready to scrape:

1. **FreeJobAlert** (`freejobalert`)
   - URL: https://www.freejobalert.com
   - Focus: Government notifications, exam alerts
   
2. **SarkariResult** (`sarkariresult`)
   - URL: https://www.sarkariresult.com
   - Focus: Exam results, recruitment notifications
   
3. **Sarkari Naukri** (`sarkarinaukri`)
   - URL: https://www.sarkarinaukri.com
   - Focus: Government job listings
   
4. **India Sarkari Naukri** (`indiasarkarinaukri`)
   - URL: https://www.indiasarkarinaukri.com
   - Focus: Central government jobs
   
5. **Sahi Sarkari Jobs** (`sahisarkarijobs`)
   - URL: https://www.sahisarkarijobs.com
   - Focus: State government jobs, PSC exams

## Running the Scraper

### Prerequisites

1. Ensure `.env.local` exists with `DATABASE_URL` set:
   ```bash
   cp .env.example .env.local
   # Add your Supabase connection string to DATABASE_URL
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Dry-Run Mode (Safe Preview)

Test the scraper without writing to database:

```bash
# Default behavior: dry-run enabled
npm run ingest

# Or explicitly set dry-run
DRY_RUN=true npm run ingest
```

This will:
- Fetch from all 5 portals
- Show statistics (total jobs, duplicates removed, etc.)
- Display exam detection results
- Simulate database writes (no data changed)
- Exit with summary

### Live Mode (Write to Database)

Run the scraper and save jobs to your database:

```bash
# Enable live mode
DRY_RUN=false npm run ingest
```

This will:
- Crawl all 5 portals
- Insert new postings (with `reviewStatus = PENDING` if confidence < 70)
- Update existing postings if already in database
- **Auto-link jobs to exams** based on title matching
- Return count of inserted/updated postings

## Exam Auto-Linking

### How It Works

The pipeline detects exam keywords in posting titles and automatically links jobs to the correct exam page.

**Keyword Matching Examples:**
- "SSC CGL" → `ssc-cgl` → Shows on `/ssc-cgl` page
- "UPSC IAS" → `upsc-ias` → Shows on `/upsc-ias` page
- "IBPS PO" → `ibps-po` → Shows on `/ibps-po` page
- "Bihar PSC" → `bpsc-ias` → Shows on `/bpsc-ias` page
- "Railway NTPC" → `rrb-ntpc` → Shows on `/rrb-ntpc` page

### Confidence Scoring

Postings are auto-approved (`reviewStatus = APPROVED`) if confidence ≥ 70%, otherwise marked as `PENDING` for review.

**Confidence Factors:**
- Exact keyword match: 85% confidence
- Loose keyword match: 70% confidence
- Below 40% confidence: Skipped entirely (low-quality data)

### Adding New Exam Keywords

Edit `src/ingest/exam-linker.ts` to add more exam keywords:

```typescript
const EXAM_KEYWORDS: Record<string, string[]> = {
  "your exam keyword": ["exam-slug"],
  // ... more entries
};
```

Then re-run the scraper to apply new keywords.

## Understanding the Output

### Dry-Run Example Output

```
📡 Phase 1: Crawling 5 government job portals...
  Fetching from sarkariresult...
  → 156 jobs fetched in 12.3s
  Fetching from freejobalert...
  → 89 jobs fetched in 8.1s
  [... more portals ...]

✅ Crawled 450 raw postings

Per-portal summary
  SarkariResult          156 jobs
  FreeJobAlert            89 jobs
  Sarkari Naukri         95 jobs
  India Sarkari Naukri   62 jobs
  Sahi Sarkari Jobs      48 jobs
  ─────────────────────────────
  TOTAL raw postings: 450

📊 Phase 2: Deduplicating...
✅ Deduplicated to 380 unique postings

🔧 Phase 3: Normalizing...
✅ Normalized 380 postings (245 linked to exams)

💾 Phase 4: Simulating database write...
✅ Database write simulation:
   • Would insert: 320 new postings
   • Skipped (low confidence): 60
   • Exams detected: 245 postings will auto-link
```

### Live Mode Output

Same as dry-run, but with actual database statistics:

```
✅ Database write complete:
   • Inserted: 320 new postings
   • Updated: 45 existing postings
   • Skipped: 60 (low confidence)
   • Exams linked: 245 postings auto-linked to exam pages
```

## Reviewing Pending Postings

After running in live mode, check for pending postings in the database:

```sql
-- Find low-confidence postings awaiting review
SELECT id, title, source, confidence, review_status
FROM postings
WHERE review_status = 'PENDING'
ORDER BY confidence DESC
LIMIT 20;

-- Approve a batch of pending postings
UPDATE postings
SET review_status = 'APPROVED'
WHERE review_status = 'PENDING' AND confidence >= 60;
```

## Scheduling Regular Runs

To keep job data fresh, schedule the scraper to run periodically:

```bash
# Run every 6 hours via cron
0 */6 * * * cd /path/to/project && DRY_RUN=false npm run ingest >> scraper.log 2>&1
```

Or set up a scheduled task using your deployment platform:
- **Vercel**: Cron jobs (Edge Functions)
- **Supabase**: SQL Cron extension
- **GitHub Actions**: Scheduled workflows

## Troubleshooting

### No jobs found from a portal

1. Check if portal is online:
   ```bash
   curl -s https://www.freejobalert.com | grep -i "job" | head -3
   ```

2. Portal may have updated HTML structure. Check adapter file:
   ```bash
   cat src/ingest/adapters/freejobalert.ts
   ```

3. Verify robots.txt allows crawling:
   ```bash
   curl -s https://www.freejobalert.com/robots.txt | grep "Anthropic\|ClaudeBot"
   ```

### Jobs not linking to exams

1. Check if posting title contains exam keyword:
   ```sql
   SELECT title FROM postings WHERE exam_id IS NULL LIMIT 5;
   ```

2. Add missing keyword to `src/ingest/exam-linker.ts`

3. Re-run scraper in live mode to update existing postings:
   ```bash
   DRY_RUN=false npm run ingest
   ```

### High number of PENDING postings

1. Review confidence thresholds in `src/ingest/write-postings.ts` (line 91)

2. Check source data quality:
   ```sql
   SELECT source, COUNT(*), AVG(confidence)
   FROM postings
   WHERE review_status = 'PENDING'
   GROUP BY source
   ORDER BY COUNT(*) DESC;
   ```

3. Lower auto-approve threshold if data quality is acceptable:
   ```typescript
   reviewStatus: primaryScore >= 60 ? "APPROVED" : "PENDING"  // Changed from 70
   ```

## Next Steps

1. **First run**: `npm run ingest` (dry-run to see results)
2. **Review output**: Check how many jobs found and exam linking rate
3. **Go live**: `DRY_RUN=false npm run ingest` to populate database
4. **Review pending**: Manually approve/reject low-confidence postings
5. **Schedule**: Set up recurring runs to keep data fresh

Your site will automatically display linked jobs on exam pages once the scraper populates the data!
