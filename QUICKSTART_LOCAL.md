# Quick Start: Local Scraper (Claude Code)

**TL;DR**: Run this once, then keep running it daily. Beats $100/mo proxy service.

## 3-Step Setup

### Step 1: Get Supabase connection string
- Go to https://supabase.com → Your project → Settings → Database
- Copy the PostgreSQL connection string (password field: use your dashboard password)

### Step 2: Set DATABASE_URL
```bash
# In Claude Code terminal, one-time setup:
cp .env.local.example .env.local

# Edit .env.local and paste your connection string
# On Mac/Linux: nano .env.local
# On Windows: just edit the file in VS Code
```

### Step 3: Run the scraper
```bash
npm run ingest
```

Done. Takes 2-3 mins. Check your Vercel app—jobs are live in Supabase.

## Repeat

Every day/week, just run:
```bash
npm run ingest
```

To automate daily at 8 AM:
- **Mac/Linux**: Add to `crontab -e`: `0 8 * * * cd /path/to/jobs && npm run ingest`
- **Windows**: Use Task Scheduler to run `npm run ingest` daily

## What's happening

- Crawls 5 job portals (full network access, no proxy blocks)
- Deduplicates & normalizes data
- Writes to your Supabase database
- UI auto-refreshes when you visit the page

## If something breaks

Check `SCRAPER_LOCAL.md` for troubleshooting. Most issues:
- Wrong DATABASE_URL → copy it exactly
- Not in the right directory → `cd /path/to/jobs` first
- .env.local not loaded → restart terminal

---

**Cost**: $0 (your machine's internet)  
**Frequency**: Once daily or on-demand  
**Data freshness**: As fresh as your last run  
**Next**: Build alerts system once data is reliable
