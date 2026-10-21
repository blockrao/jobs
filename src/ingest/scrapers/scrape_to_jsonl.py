"""
Multi-source recruitment scraper → JSONL output (FileRecord format).

Scrapes URLs from any supported source and writes one JSON record per line,
in the FileRecord format that src/ingest/adapters/multi-source-file.ts reads.

Usage:
    # Scrape SarkariResult via sitemap, output 200 records
    python scrape_to_jsonl.py --source sarkariresult --limit 200 --output sr.jsonl

    # Scrape from a URL list file
    python scrape_to_jsonl.py --urls-file my_urls.txt --output out.jsonl

    # Dry run (fetch sitemap URLs only, no page fetching)
    python scrape_to_jsonl.py --source sarkarinaukri --limit 100 --dry-run

    # Resume from a previous run (skip already-scraped URLs)
    python scrape_to_jsonl.py --source sarkariresult --limit 500 --output sr.jsonl --resume

Environment:
    HTTP_PROXY / HTTPS_PROXY — set these if behind a proxy

Sources:
    freejobalert    — JSON-LD schema.org (FreeJobAlert.com)
    sarkariresult   — HTML table scraping (SarkariResult.com)
    sarkarinaukri   — HTML prose scraping (sarkari-naukri.in)
    employmentnews  — HTML definition-list scraping (employmentnews.gov.in)
"""

import argparse
import json
import logging
import sys
import time
from pathlib import Path
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("scrape_to_jsonl")

# Extractor dispatch map: source name → (extractor_module, source_label)
EXTRACTORS = {
    "freejobalert": ("extractor_schema_org", "FreeJobAlert"),
    "sarkariresult": ("extractor_sarkari_result", "SarkariResult"),
    "sarkarinaukri": ("extractor_sarkarinaukri", "SarkariNaukri"),
    "employmentnews": ("extractor_employment_news", "EmploymentNews"),
}

# Rate limits per source (seconds between requests)
RATE_LIMITS = {
    "freejobalert": 0.5,
    "sarkariresult": 0.8,
    "sarkarinaukri": 0.6,
    "employmentnews": 1.0,
}


def detect_source(url: str) -> Optional[str]:
    """Detect source from URL domain."""
    url_lower = url.lower()
    if "freejobalert" in url_lower:
        return "freejobalert"
    elif "sarkariresult" in url_lower:
        return "sarkariresult"
    elif "sarkari-naukri" in url_lower:
        return "sarkarinaukri"
    elif "employmentnews" in url_lower:
        return "employmentnews"
    return None


def load_extractor(source: str):
    """Dynamically import and return the extract function for a source."""
    if source not in EXTRACTORS:
        raise ValueError(f"Unknown source: {source}. Choose from: {list(EXTRACTORS)}")
    module_name, label = EXTRACTORS[source]
    import importlib
    mod = importlib.import_module(module_name)
    return mod.extract, label


def discover_urls(source: str, limit: int) -> list[str]:
    """Discover URLs from a source's sitemap."""
    from sitemap_crawler import discover
    return discover(source, limit=limit)


def load_existing_ids(jsonl_path: Path) -> set[str]:
    """Load already-scraped IDs from an existing JSONL file for resume."""
    if not jsonl_path.exists():
        return set()
    ids = set()
    with open(jsonl_path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    rec = json.loads(line)
                    ids.add(rec.get("url", ""))
                    ids.add(rec.get("id", ""))
                except Exception:
                    pass
    logger.info(f"Resume: found {len(ids)} existing records in {jsonl_path}")
    return ids


def main():
    parser = argparse.ArgumentParser(description="Multi-source recruitment scraper → JSONL")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--source", choices=list(EXTRACTORS), help="Discover URLs from this source's sitemap")
    group.add_argument("--urls-file", help="File with one URL per line (auto-detects source from URL)")

    parser.add_argument("--urls", nargs="+", help="URLs directly on command line")
    parser.add_argument("--limit", type=int, default=0, help="Max URLs to scrape (0 = no limit; only with --source)")
    parser.add_argument("--output", required=True, help="Output .jsonl file path")
    parser.add_argument("--dry-run", action="store_true", help="Discover URLs only, do not fetch pages")
    parser.add_argument("--resume", action="store_true", help="Skip URLs already in the output file")
    parser.add_argument("--progress", type=int, default=25, help="Log progress every N URLs (default: 25)")
    args = parser.parse_args()

    out_path = Path(args.output)
    existing_ids = load_existing_ids(out_path) if args.resume else set()

    # Collect URLs to process
    urls = []
    if args.source:
        logger.info(f"Discovering URLs from {args.source} sitemap (limit={args.limit or 'none'})...")
        urls = discover_urls(args.source, args.limit)
        logger.info(f"Discovered {len(urls)} URLs")
    elif args.urls_file:
        with open(args.urls_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    urls.append(line)
        logger.info(f"Loaded {len(urls)} URLs from {args.urls_file}")
    if args.urls:
        urls.extend(args.urls)

    if not urls:
        logger.error("No URLs to process")
        sys.exit(1)

    if args.dry_run:
        logger.info(f"[DRY RUN] Would scrape {len(urls)} URLs")
        for u in urls[:10]:
            logger.info(f"  {u}")
        if len(urls) > 10:
            logger.info(f"  ... and {len(urls) - 10} more")
        return

    # Filter already-done URLs
    if existing_ids:
        before = len(urls)
        urls = [u for u in urls if u not in existing_ids]
        logger.info(f"Skipping {before - len(urls)} already-scraped URLs")

    from to_file_record import to_file_record

    stats = {"total": len(urls), "extracted": 0, "failed": 0, "skipped_no_extractor": 0}
    mode = "a" if args.resume and out_path.exists() else "w"

    with open(out_path, mode) as out_f:
        for i, url in enumerate(urls):
            # Progress logging
            if (i + 1) % args.progress == 0:
                logger.info(f"Progress: {i+1}/{stats['total']} — extracted: {stats['extracted']}, failed: {stats['failed']}")

            # Detect source
            source = args.source or detect_source(url)
            if not source:
                logger.warning(f"Cannot detect source for URL: {url}")
                stats["skipped_no_extractor"] += 1
                continue

            # Get extractor
            try:
                extract_fn, label = load_extractor(source)
            except ValueError as e:
                logger.warning(str(e))
                stats["skipped_no_extractor"] += 1
                continue

            # Extract
            try:
                record = extract_fn(url, source_name=label)
            except Exception as e:
                logger.error(f"Extractor crashed on {url}: {e}")
                stats["failed"] += 1
                time.sleep(RATE_LIMITS.get(source, 1.0))
                continue

            if record is None:
                logger.debug(f"No record extracted from {url}")
                stats["failed"] += 1
                time.sleep(RATE_LIMITS.get(source, 1.0))
                continue

            # Convert to FileRecord and write JSONL
            file_record = to_file_record(record)
            out_f.write(json.dumps(file_record, ensure_ascii=False) + "\n")
            out_f.flush()
            stats["extracted"] += 1

            time.sleep(RATE_LIMITS.get(source, 0.5))

    # Final summary
    logger.info("=" * 60)
    logger.info("SCRAPING COMPLETE")
    logger.info(f"  Total URLs:    {stats['total']}")
    logger.info(f"  Extracted:     {stats['extracted']}")
    logger.info(f"  Failed:        {stats['failed']}")
    logger.info(f"  No extractor:  {stats['skipped_no_extractor']}")
    logger.info(f"  Output file:   {out_path} ({out_path.stat().st_size if out_path.exists() else 0} bytes)")


if __name__ == "__main__":
    main()
