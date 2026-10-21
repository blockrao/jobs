"""
Sitemap crawler — discovers article URLs from each source's sitemap.

Usage:
    python sitemap_crawler.py --source freejobalert --limit 500 --output fja_urls.txt
    python sitemap_crawler.py --source sarkariresult --limit 200 --output sr_urls.txt
    python sitemap_crawler.py --all --limit 300 --output mixed_urls.txt

Output: one URL per line, ready for run_extraction.py
"""

import argparse
import re
import sys
import time
import logging
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional
import requests

logger = logging.getLogger("sitemap_crawler")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; JobOye-Crawler/1.0; "
        "+https://www.joboye.com/about)"
    )
}

SITEMAP_CONFIGS = {
    "freejobalert": {
        "index": "https://www.freejobalert.com/sitemap.xml",
        "child_pattern": r"post-sitemap",   # only fetch post sitemaps, not category/tag
        "url_pattern": r"freejobalert\.com/[a-z0-9-]+/\d+",
    },
    "sarkariresult": {
        "index": "https://www.sarkariresult.com/sitemap_index.xml",
        "child_pattern": r"post-sitemap",
        # Match article URLs (not image URLs: skip .png/.jpg/.webp)
        "url_pattern": r"sarkariresult\.com/[a-z0-9/-]+/$",
        "url_exclude": r"\.(png|jpg|jpeg|webp|gif|svg|pdf)$",
    },
    "sarkarinaukri": {
        "index": "https://www.sarkari-naukri.in/sitemap_index.xml",
        "child_pattern": r"post-sitemap",   # only post sitemaps, not page/category/tag
        # Match article slug URLs (trailing slash), exclude image assets
        "url_pattern": r"sarkari-naukri\.in/[a-z0-9-]+/",
        "url_exclude": r"\.(png|jpg|jpeg|webp|gif|svg|pdf)$",
    },
    "employmentnews": {
        # Employment News doesn't have a public sitemap; use their category pages
        "index": None,
        "category_pages": [
            "https://employmentnews.gov.in/NewVacancy/NewVacancy.aspx",
        ],
        "url_pattern": r"employmentnews\.gov\.in.*VacancyDetails",
    },
}


def fetch_xml(url: str) -> Optional[ET.Element]:
    """Fetch and parse an XML sitemap."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        return ET.fromstring(r.content)
    except Exception as e:
        logger.error(f"Failed to fetch XML from {url}: {e}")
        return None


def get_urls_from_sitemap(
    sitemap_url: str,
    url_pattern: Optional[str] = None,
    url_exclude: Optional[str] = None,
) -> list[str]:
    """Parse a sitemap XML and return matching URLs."""
    root = fetch_xml(sitemap_url)
    if root is None:
        return []

    # Collect all loc elements regardless of namespace
    all_locs = []
    for el in root.iter():
        if el.tag.endswith("}loc") or el.tag == "loc":
            url = el.text.strip() if el.text else ""
            if url:
                all_locs.append(url)

    urls = []
    for url in all_locs:
        if url_pattern and not re.search(url_pattern, url, re.I):
            continue
        if url_exclude and re.search(url_exclude, url, re.I):
            continue
        urls.append(url)

    return urls


def get_sitemap_children(index_url: str, child_pattern: Optional[str] = None) -> list[str]:
    """From a sitemap index, return child sitemap URLs."""
    root = fetch_xml(index_url)
    if root is None:
        return []

    children = []
    for el in root.iter():
        if el.tag.endswith("}loc") or el.tag == "loc":
            url = el.text.strip() if el.text else ""
            if url:
                if child_pattern is None or re.search(child_pattern, url):
                    children.append(url)

    return children


def discover_freejobalert(limit: int = 0) -> list[str]:
    """Discover FJA article URLs via sitemap index."""
    cfg = SITEMAP_CONFIGS["freejobalert"]
    logger.info("Crawling FreeJobAlert sitemaps...")

    child_sitemaps = get_sitemap_children(cfg["index"], cfg["child_pattern"])
    logger.info(f"  Found {len(child_sitemaps)} child sitemaps matching '{cfg['child_pattern']}'")

    all_urls = []
    for i, sm_url in enumerate(child_sitemaps):
        logger.info(f"  Fetching sitemap {i+1}/{len(child_sitemaps)}: {sm_url}")
        urls = get_urls_from_sitemap(sm_url, cfg["url_pattern"])
        all_urls.extend(urls)
        logger.info(f"    → {len(urls)} article URLs")
        if limit and len(all_urls) >= limit:
            break
        time.sleep(0.3)

    if limit:
        all_urls = all_urls[:limit]
    logger.info(f"FreeJobAlert: {len(all_urls)} URLs total")
    return all_urls


def discover_sarkariresult(limit: int = 0) -> list[str]:
    """Discover SarkariResult article URLs via sitemap."""
    cfg = SITEMAP_CONFIGS["sarkariresult"]
    logger.info("Crawling SarkariResult sitemaps...")

    child_sitemaps = get_sitemap_children(cfg["index"], cfg["child_pattern"])
    logger.info(f"  Found {len(child_sitemaps)} child sitemaps")

    all_urls = []
    for i, sm_url in enumerate(child_sitemaps):
        logger.info(f"  Fetching sitemap {i+1}/{len(child_sitemaps)}: {sm_url}")
        urls = get_urls_from_sitemap(
            sm_url,
            url_pattern=cfg.get("url_pattern"),
            url_exclude=cfg.get("url_exclude"),
        )
        all_urls.extend(urls)
        logger.info(f"    → {len(urls)} article URLs")
        if limit and len(all_urls) >= limit:
            break
        time.sleep(0.5)

    if limit:
        all_urls = all_urls[:limit]
    logger.info(f"SarkariResult: {len(all_urls)} URLs total")
    return all_urls


def discover_sarkarinaukri(limit: int = 0) -> list[str]:
    """Discover SarkariNaukri article URLs via sitemap index."""
    cfg = SITEMAP_CONFIGS["sarkarinaukri"]
    logger.info("Crawling SarkariNaukri sitemaps...")

    child_sitemaps = get_sitemap_children(cfg["index"], cfg["child_pattern"])
    logger.info(f"  Found {len(child_sitemaps)} child sitemaps matching '{cfg['child_pattern']}'")

    all_urls = []
    for i, sm_url in enumerate(child_sitemaps):
        logger.info(f"  Fetching sitemap {i+1}/{len(child_sitemaps)}: {sm_url}")
        urls = get_urls_from_sitemap(
            sm_url,
            url_pattern=cfg.get("url_pattern"),
            url_exclude=cfg.get("url_exclude"),
        )
        all_urls.extend(urls)
        logger.info(f"    → {len(urls)} article URLs")
        if limit and len(all_urls) >= limit:
            break
        time.sleep(0.4)

    if limit:
        all_urls = all_urls[:limit]
    logger.info(f"SarkariNaukri: {len(all_urls)} URLs total")
    return all_urls


def discover_employment_news(limit: int = 0) -> list[str]:
    """
    Employment News doesn't have a sitemap; scrape their listing pages.
    This returns URLs from the vacancy listing page.
    """
    from extractor_base import fetch_page
    cfg = SITEMAP_CONFIGS["employmentnews"]
    pattern = cfg["url_pattern"]
    all_urls = []

    for page_url in cfg.get("category_pages", []):
        logger.info(f"Scraping Employment News listings: {page_url}")
        soup = fetch_page(page_url)
        if soup is None:
            continue
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if not href.startswith("http"):
                from urllib.parse import urljoin
                href = urljoin(page_url, href)
            if re.search(pattern, href, re.I):
                all_urls.append(href)
        time.sleep(1.0)

    if limit:
        all_urls = all_urls[:limit]
    logger.info(f"EmploymentNews: {len(all_urls)} URLs")
    return all_urls


def discover(source: str, limit: int = 0) -> list[str]:
    """Dispatch to the right discovery function."""
    if source == "freejobalert":
        return discover_freejobalert(limit)
    elif source == "sarkariresult":
        return discover_sarkariresult(limit)
    elif source == "sarkarinaukri":
        return discover_sarkarinaukri(limit)
    elif source == "employmentnews":
        return discover_employment_news(limit)
    else:
        logger.error(f"Unknown source: {source}")
        return []


def main():
    parser = argparse.ArgumentParser(description="Discover article URLs from source sitemaps")
    parser.add_argument("--source", choices=["freejobalert", "sarkariresult", "sarkarinaukri", "employmentnews"],
                        help="Specific source to crawl")
    parser.add_argument("--all", action="store_true", help="Crawl all sources")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max URLs per source (0 = no limit)")
    parser.add_argument("--output", default="discovered_urls.txt",
                        help="Output file (default: discovered_urls.txt)")
    args = parser.parse_args()

    if not args.source and not args.all:
        parser.print_help()
        sys.exit(1)

    sources = (
        ["freejobalert", "sarkariresult", "sarkarinaukri", "employmentnews"]
        if args.all
        else [args.source]
    )

    all_urls = []
    for src in sources:
        urls = discover(src, args.limit)
        all_urls.extend(urls)

    out_path = Path(args.output)
    with open(out_path, "w") as f:
        for url in all_urls:
            f.write(url + "\n")

    logger.info(f"Wrote {len(all_urls)} URLs to {out_path}")


if __name__ == "__main__":
    main()
