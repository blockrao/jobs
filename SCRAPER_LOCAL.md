# Local Scraper Setup (Claude Code)

Run the government jobs scraper from your machine using Claude Code. Bypasses cloud proxy restrictions entirely.

## Setup (One-time)

### 1. Get your Supabase connection string
- Go to https://supabase.com → Your project → Settings → Database
- Copy the "Connection string" (PostgreSQL URI)
- It looks like: `postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres`

### 2. Create `.env.local`
```bash
cp .env.local.example .env.local
# Edit .env.local and paste your Supabase connection string
```

### 3. Install dependencies (if not done)
```bash
npm install
```

## Running the Scraper

From Claude Code terminal:

```bash
# Full pipeline: crawl → deduplicate → normalize → database write
npx tsx src/ingest/run.ts

# With explicit DATABASE_URL (if .env.local not set)
DATABASE_URL="postgresql://..." npx tsx src/ingest/run.ts
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

4. **Phase 4**: Writes to Supabase
   - Inserts new postings
   - Updates existing ones (dedup key: source + externalId)
   - Creates timeline entries for stage progression

5. **Phase 5**: Audit dump
   - Saves raw data to `/tmp/rojgarsetu-raw-postings.json`
   - For manual review & debugging

## Schedule Options

### Option A: Manual (Run when you want)
```bash
# Just run the command above whenever
npx tsx src/ingest/run.ts
```

### Option B: Daily via macOS/Linux cron
```bash
# Edit crontab
crontab -e

# Add this line (runs at 8 AM daily)
0 8 * * * cd /path/to/jobs && DATABASE_URL="postgresql://..." npx tsx src/ingest/run.ts >> /tmp/scraper.log 2>&1
```

### Option C: Windows Task Scheduler
1. Create a batch file `run-scraper.bat`:
```batch
@echo off
cd C:\path\to\jobs
set DATABASE_URL=postgresql://...
npx tsx src/ingest/run.ts >> C:\logs\scraper.log 2>&1
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

1. **First run**: `npx tsx src/ingest/run.ts` (takes 2-3 mins)
2. **Check results**: Visit your Vercel app, refresh browser
3. **Schedule it**: Set up cron/Task Scheduler for daily runs
4. **Build notifications**: Once data is reliable, add the alerts system

---

**Note**: You can also run this from Claude Code in the browser, or in the desktop app. Either way, your machine's network is used (not Vercel's proxy-restricted network).
