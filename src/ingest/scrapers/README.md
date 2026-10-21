# Multi-source recruitment scrapers

Python scripts that scrape recruitment articles from external sources and output
JSONL in the FileRecord format, ready for ingestion into the database via the
TypeScript pipeline.

## Architecture

```
scrape_to_jsonl.py   ← main CLI runner
  ├── sitemap_crawler.py    ← discovers URLs from source sitemaps
  ├── extractor_base.py     ← shared fetch/parse utilities
  ├── extractor_schema_org.py      ← FreeJobAlert (JSON-LD schema.org)
  ├── extractor_sarkari_result.py  ← SarkariResult (HTML table)
  ├── extractor_sarkarinaukri.py   ← SarkariNaukri (prose + Yoast meta)
  ├── extractor_employment_news.py ← EmploymentNews (HTML definition list)
  └── to_file_record.py    ← converts extraction dict → FileRecord JSONL

JSONL output
  └── src/ingest/run-file.ts       ← reads JSONL, feeds TS pipeline
        └── adapters/multi-source-file.ts  ← FileRecord → RawPosting
              └── pipeline.ts → write-postings-v2.ts → Supabase
```

## Quick start

```bash
cd src/ingest/scrapers

# Install Python dependencies (if not already installed)
pip install requests beautifulsoup4 lxml -q

# 1. Dry run: discover SarkariResult URLs without scraping pages
python scrape_to_jsonl.py --source sarkariresult --limit 50 --output /tmp/sr.jsonl --dry-run

# 2. Scrape 200 SarkariResult pages → JSONL
python scrape_to_jsonl.py --source sarkariresult --limit 200 --output /tmp/sr.jsonl

# 3. Inspect a few records
head -3 /tmp/sr.jsonl | python -m json.tool | head -60

# 4. Dry-run the TS ingestion pipeline (reads JSONL, does NOT write to DB)
INGEST_SOURCE_FILE=/tmp/sr.jsonl npx tsx src/ingest/run-file.ts

# 5. Live ingest (writes to DB)
INGEST_SOURCE_FILE=/tmp/sr.jsonl DATABASE_URL="$DATABASE_URL" DRY_RUN=false npx tsx src/ingest/run-file.ts
```

## Supported sources

| Source key      | Site                   | Method              | TS source code |
|----------------|------------------------|---------------------|---------------|
| `freejobalert` | freejobalert.com       | JSON-LD schema.org  | ext-1         |
| `sarkariresult`| sarkariresult.com      | HTML table scraping | ext-2         |
| `sarkarinaukri`| sarkari-naukri.in      | Prose + Yoast meta  | ext-3         |
| `employmentnews`| employmentnews.gov.in | HTML definition list| ext-5         |

## Resume mode

If a scrape is interrupted, resume without re-scraping done URLs:

```bash
python scrape_to_jsonl.py --source sarkariresult --limit 500 --output /tmp/sr.jsonl --resume
```

## Scrape from a URL list

```bash
# Put URLs in a file, one per line
python scrape_to_jsonl.py --urls-file my_urls.txt --output /tmp/out.jsonl
```

## Notes

- Rate limits: freejobalert=0.5s, sarkariresult=0.8s, sarkarinaukri=0.6s, employmentnews=1.0s
- `supabase_inserter.py` in the old scratchpad is **not used** — it has wrong column names.
  All DB writes go through `write-postings-v2.ts` which handles org FK resolution.
- The `scrape_to_jsonl.py` script never writes directly to the database.
