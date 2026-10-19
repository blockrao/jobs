#!/usr/bin/env python3
"""
Find official government notification URLs for posts missing officialSourceUrl.

Strategy:
  1. Load the 91 distinct recruitments whose live posts have no officialSourceUrl.
  2. For each recruitment: search FreeJobAlert by org name + key words from title.
  3. From the found FJA article page, extract the official government notification URL
     (typically a PDF from a .gov.in / .nic.in / official org domain).
  4. Update officialSourceUrl on all live posts in that recruitment (fill-only, never overwrite).
  5. Also store the FJA article URL on recruitments.source_url if it was NULL.

Rules:
  - Only write to posts where officialSourceUrl IS NULL (never overwrite).
  - Official URL must pass publicLink() logic: government/official domains only,
    never freejobalert.com or other aggregator domains.
  - A URL that doesn't look official is skipped (logged).
  - Rate-limited to be polite to FJA.

Usage:
  uv run --with requests --with beautifulsoup4 --with supabase \\
    scripts/find-official-notification-urls.py --dry-run

  uv run --with requests --with beautifulsoup4 --with supabase \\
    scripts/find-official-notification-urls.py --write
"""

import argparse
import os
import re
import sys
import time
from typing import Optional
from urllib.parse import quote, urlparse

import requests
from bs4 import BeautifulSoup
from supabase import create_client

# ── Config ──────────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required", file=sys.stderr)
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Delay between FJA requests (seconds) — be polite
SEARCH_DELAY = 2.5
SCRAPE_DELAY = 2.0

# Domains that are never official government notification URLs
AGGREGATOR_DOMAINS = {
    "freejobalert.com", "sarkariresult.com", "sarkarinaukri.com",
    "govtjobprime.com", "freshersworld.com", "rojgarresult.com",
    "jobsarkari.com", "naukri.com", "indeed.com", "shine.com",
    "timesjobs.com", "monster.com", "linkedin.com", "facebook.com",
    "twitter.com", "instagram.com", "youtube.com", "telegram.me",
    "t.me", "whatsapp.com", "joboye.com",
}

# Official domain patterns — .gov.in, .nic.in, .ac.in, .res.in, .edu.in, etc.
OFFICIAL_DOMAIN_PATTERNS = [
    r"\.gov\.in$", r"\.nic\.in$", r"\.ac\.in$", r"\.res\.in$",
    r"\.edu\.in$", r"\.org\.in$", r"\.mil\.in$",
    # Known official orgs without standard TLD
    r"upsc\.gov\.in", r"ssc\.gov\.in", r"ibps\.in$",
    r"rrbapply\.gov\.in", r"indianrailways\.gov\.in",
    r"indianarmy\.nic\.in", r"airmenselection\.cdac\.in",
    r"joinindianarmy\.nic\.in", r"joinindiannavy\.gov\.in",
    r"afcat\.cdac\.in", r"uiic\.co\.in", r"licindia\.in",
    r"niacl\.org\.in", r"orientalinsurance\.org\.in",
]


def is_official_url(url: str) -> bool:
    """Check if URL is from an official government/institutional domain."""
    if not url or not url.startswith("http"):
        return False
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower().lstrip("www.")
        # Block known aggregators
        for agg in AGGREGATOR_DOMAINS:
            if domain == agg or domain.endswith("." + agg):
                return False
        # Accept known official patterns
        for pattern in OFFICIAL_DOMAIN_PATTERNS:
            if re.search(pattern, domain):
                return True
        # Also accept direct PDF links that look like official notifications
        # even from less common domains (e.g. society websites, PSU domains)
        path = parsed.path.lower()
        if path.endswith(".pdf") and not any(
            agg in domain for agg in AGGREGATOR_DOMAINS
        ):
            return True
        return False
    except Exception:
        return False


def search_fja(query: str) -> Optional[str]:
    """
    Search FreeJobAlert for a matching article.
    Returns the first matching article URL, or None.
    """
    try:
        search_url = f"https://www.freejobalert.com/?s={quote(query)}"
        resp = requests.get(search_url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"  ✗ Search HTTP {resp.status_code}", file=sys.stderr)
            return None

        soup = BeautifulSoup(resp.text, "html.parser")

        # FJA article URLs follow the /articles/ pattern:
        # https://www.freejobalert.com/articles/some-recruitment-slug-2026-NNNNNNN
        for link in soup.find_all("a", href=re.compile(r"freejobalert\.com/articles/[a-z0-9-]+")):
            href = link.get("href", "")
            if href.startswith("http"):
                return href

        # Fallback: h2/h3 entry-title links (older FJA page structure)
        for link in soup.select("h2.entry-title a, h3.entry-title a, .post-title a"):
            href = link.get("href", "")
            if "freejobalert.com" in href and href.startswith("http"):
                return href

        return None
    except Exception as e:
        print(f"  ⚠ Search error: {e}", file=sys.stderr)
        return None


def scrape_official_url_from_fja(fja_url: str) -> Optional[str]:
    """
    Scrape an FJA article page and extract the official government notification URL.
    Returns the official URL if found, else None.
    """
    try:
        resp = requests.get(fja_url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")

        # Strategy 1: Look for links labeled "Official Notification", "Notification PDF", etc.
        notification_keywords = [
            "official notification", "notification pdf", "download notification",
            "official advertisement", "recruitment notification", "advt", "advertisement",
            "official pdf", "view notification", "check notification",
        ]
        for a in soup.find_all("a", href=True):
            href = a.get("href", "")
            text = a.get_text(strip=True).lower()
            if any(kw in text for kw in notification_keywords):
                if is_official_url(href):
                    return href

        # Strategy 2: Find all PDF links from official domains
        for a in soup.find_all("a", href=re.compile(r"\.pdf", re.I)):
            href = a.get("href", "")
            if is_official_url(href):
                return href

        # Strategy 3: Find any link to official domains
        for a in soup.find_all("a", href=True):
            href = a.get("href", "")
            if is_official_url(href):
                return href

        return None
    except Exception as e:
        print(f"  ⚠ Scrape error for {fja_url}: {e}", file=sys.stderr)
        return None


def build_search_query(recruitment_name: str, org_name: Optional[str]) -> str:
    """Build a focused FJA search query from recruitment name."""
    # Remove common boilerplate from FJA headlines
    name = recruitment_name
    # Remove "Apply Online for X Posts" suffix and similar
    name = re.sub(r"\s*-\s*Apply (Online|Offline) for.*$", "", name, flags=re.I)
    name = re.sub(r"\s*-\s*Apply (Online|Offline)$", "", name, flags=re.I)
    name = re.sub(r"\s*Recruitment \d{4}.*$", "", name, flags=re.I)
    name = name.strip()

    # If we stripped too much, use org name + "Recruitment 2026"
    if len(name) < 10 and org_name:
        return f"{org_name} Recruitment 2026"

    return name[:100]  # Keep reasonably short


def fetch_target_recruitments():
    """Fetch the 91 distinct recruitments needing official source URLs."""
    resp = supabase.rpc("execute_sql", {}).execute()  # fallback
    # Use raw SQL via Supabase REST
    result = supabase.table("posts").select(
        "recruitment_id:recruitmentId, organizationName, "
        "recruitments!inner(id, name, source_url)"
    ).eq("isLive", True).is_("officialSourceUrl", "null").eq("sourceName", "aggregator").execute()

    # Build deduplicated list by recruitment_id
    seen = {}
    for row in result.data:
        rid = row.get("recruitment_id")
        if rid and rid not in seen:
            r = row.get("recruitments", {})
            seen[rid] = {
                "recruitment_id": rid,
                "recruitment_name": r.get("name", ""),
                "recruitment_source_url": r.get("source_url"),
                "org_name": row.get("organizationName"),
            }
    return list(seen.values())


def fetch_target_posts_for_recruitment(recruitment_id: int) -> list:
    """Fetch all live posts in a recruitment that need officialSourceUrl."""
    result = supabase.table("posts").select("id").eq(
        "recruitmentId", recruitment_id
    ).eq("isLive", True).is_("officialSourceUrl", "null").execute()
    return [row["id"] for row in result.data]


def update_posts_official_url(post_ids: list[int], official_url: str, dry_run: bool) -> int:
    """Set officialSourceUrl on posts (fill-only)."""
    if dry_run:
        print(f"    DRY-RUN: would update {len(post_ids)} posts → {official_url}")
        return len(post_ids)
    result = supabase.table("posts").update(
        {"officialSourceUrl": official_url}
    ).in_("id", post_ids).is_("officialSourceUrl", "null").execute()
    return len(result.data) if result.data else 0


def update_recruitment_source_url(recruitment_id: int, fja_url: str, dry_run: bool):
    """Store the discovered FJA article URL on the recruitment (fill-only)."""
    if dry_run:
        print(f"    DRY-RUN: would set recruitments[{recruitment_id}].source_url → {fja_url}")
        return
    supabase.table("recruitments").update(
        {"source_url": fja_url}
    ).eq("id", recruitment_id).is_("source_url", "null").execute()


def main():
    parser = argparse.ArgumentParser(
        description="Find official notification URLs for posts missing officialSourceUrl"
    )
    parser.add_argument("--dry-run", action="store_true", default=False,
                        help="Show what would be written without actually writing")
    parser.add_argument("--write", action="store_true", default=False,
                        help="Actually write to the database")
    parser.add_argument("--limit", type=int, default=0,
                        help="Limit to first N recruitments (for testing)")
    args = parser.parse_args()

    if not args.dry_run and not args.write:
        print("Pass --dry-run or --write", file=sys.stderr)
        sys.exit(1)

    dry_run = not args.write
    if dry_run:
        print("=== DRY RUN — no database writes ===\n")

    recruitments = fetch_target_recruitments()
    if args.limit:
        recruitments = recruitments[: args.limit]

    print(f"Processing {len(recruitments)} recruitments\n")

    stats = {"searched": 0, "fja_found": 0, "official_found": 0, "posts_updated": 0, "skipped": 0}

    for i, rec in enumerate(recruitments, 1):
        rid = rec["recruitment_id"]
        name = rec["recruitment_name"]
        org = rec["org_name"]
        existing_fja = rec["recruitment_source_url"]

        print(f"[{i}/{len(recruitments)}] {name[:70]}")

        # Step 1: Find FJA article URL
        fja_url = existing_fja
        if not fja_url:
            query = build_search_query(name, org)
            print(f"  -> Searching FJA: '{query}'")
            fja_url = search_fja(query)
            stats["searched"] += 1
            time.sleep(SEARCH_DELAY)

            if not fja_url:
                print("  ✗ No FJA article found")
                stats["skipped"] += 1
                continue

            print(f"  ✓ FJA article: {fja_url}")
            # Store FJA source_url on recruitment
            update_recruitment_source_url(rid, fja_url, dry_run)
        else:
            print(f"  → Already has FJA URL: {fja_url}")

        stats["fja_found"] += 1

        # Step 2: Scrape FJA article for official notification URL
        print(f"  → Scraping for official URL...")
        official_url = scrape_official_url_from_fja(fja_url)
        time.sleep(SCRAPE_DELAY)

        if not official_url:
            print("  ✗ No official URL found on FJA page")
            stats["skipped"] += 1
            continue

        print(f"  ✓ Official URL: {official_url}")
        stats["official_found"] += 1

        # Step 3: Update posts
        post_ids = fetch_target_posts_for_recruitment(rid)
        if not post_ids:
            print(f"  ✗ No posts to update (already filled?)")
            continue

        updated = update_posts_official_url(post_ids, official_url, dry_run)
        stats["posts_updated"] += updated
        print(f"  ✓ Updated {updated} posts")

    print("\n=== Summary ===")
    print(f"Recruitments searched:  {stats['searched']}")
    print(f"FJA articles found:     {stats['fja_found']}")
    print(f"Official URLs found:    {stats['official_found']}")
    print(f"Posts updated:          {stats['posts_updated']}")
    print(f"Skipped (no URL):       {stats['skipped']}")
    if dry_run:
        print("\n(Dry run — no writes made)")


if __name__ == "__main__":
    main()
