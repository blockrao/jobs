# Local Scraper Setup (Claude Code)

Run the government jobs scraper from your machine using Claude Code. Bypasses cloud proxy restrictions entirely.

## Setup (One-time)

### 1. Get your Supabase connection string
- Go to https://supabase.com → Your project → Settings → Database
- Copy the "Connection string" (PostgreSQL URI)
- It looks like: `postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres`

### 2. Create `.env.local`
```bash
cp .env.example .env.local
# Edit .env.local and paste your Supabase connection string
```

### 3. Install dependencies (if not done)
```bash
npm install
```

## Running the Scraper

From Claude Code terminal:

```bash
# Recommended: Uses .env.local (dry-run mode by default)
npm run ingest

# With explicit DATABASE_URL (if .env.local not set)
DATABASE_URL="postgresql://..." npm run ingest

# Enable live writes to Supabase (add to .env.local first: DRY_RUN=false)
DRY_RUN=false npm run ingest

# Or run raw pipeline directly
npx tsx src/ingest/run.ts
```

## What happens

1. **Phase 1**: Crawls 5 portals (sarkariresult, indiasarkarinaukri, sarkarinaukri, sahisarkarijobs, freejobalert)
   - Takes ~2-3 minutes
   - Outputs job count per portal

2. **Phase 2**: Deduplicates by (title, org, location)
   - Earliest deadline wins
   - Highest confidence tiebreaker

3. **Phase 3**: Normalizes data
   - Infers job stages (NOTIFICATION_OUT → FINAL_RESULT_OUT)
   - Generates slugs for URLs
   - Assigns exam codes (SSC, UPSC, etc.)

4. **Phase 4**: Writes to Supabase (or simulates in dry-run mode)
   - Default: DRY_RUN mode (preview only, no actual writes)
   - Set DRY_RUN=false to enable live writes
   - Inserts new postings
   - Updates existing ones (dedup key: source + externalId)
   - Creates timeline entries for stage progression

5. **Phase 5**: Audit dump
   - Saves raw data to `/tmp/joboye-raw-postings.json`
   - For manual review & debugging

## Schedule Options

### Option A: Manual (Run when you want)
```bash
# Dry-run mode (preview, safe)
npm run ingest

# Live mode (writes to Supabase)
DRY_RUN=false npm run ingest
```

### Option B: Daily via macOS/Linux cron
```bash
# Edit crontab
crontab -e

# Add this line (runs at 8 AM daily in live mode)
0 8 * * * cd /path/to/jobs && DRY_RUN=false npm run ingest >> /tmp/scraper.log 2>&1
```

### Option C: Windows Task Scheduler
1. Create a batch file `run-scraper.bat`:
```batch
@echo off
cd C:\path\to\jobs
set DRY_RUN=false
npm run ingest >> C:\logs\scraper.log 2>&1
```
2. Schedule it via Task Scheduler (Tasks → Create Task)

## Data in your UI

Once scraper runs:
- Visit https://your-app.vercel.app
- Browse jobs from the last scraper run
- Data is live from Supabase (fetches on page load)

## Troubleshooting

**"Cannot find module 'playwright'"** or similar
```bash
npm install  # Make sure all deps are installed
```

**"WAF/anti-bot block"**
- Normal on first attempt; retry logic handles it
- If all portals fail after retries, check your internet connection
- Local machine should bypass proxy blocks that cloud had

**"Connection refused" to Supabase**
- Check DATABASE_URL is correct
- Verify password and project ref in the URL
- Make sure Supabase project isn't paused

**"Confidence < 40" skipped**
- Postings below 40% confidence are skipped as low-quality
- This is intentional; they won't show in UI without manual review

## Next Steps

1. **First run (dry-run)**: `npm run ingest` (takes 2-3 mins, safe preview)
2. **Review output**: Check the dry-run results for quality & count
3. **Enable live mode**: Add `DRY_RUN=false` to `.env.local`
4. **Second run (live)**: `npm run ingest` to actually insert/update data
5. **Schedule it**: Set up cron/Task Scheduler for daily live runs
6. **Build notifications**: Once data is reliable, add the alerts system

---

**Note**: You can also run this from Claude Code in the browser, or in the desktop app. Either way, your machine's network is used (not Vercel's proxy-restricted network).
