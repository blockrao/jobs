#!/usr/bin/env python3
"""
Fetch FreeJobAlert articles for the 173 newly-fixed recruitments.

For each recruitment (organization_id != 2235, updated in last 2 hours),
search FJA and populate source_url if a matching article is found.

Usage:
  uv run --with requests --with beautifulsoup4 --with supabase \\
    scripts/fetch-fja-for-fixed-orgs.py --dry-run

  uv run --with requests --with beautifulsoup4 --with supabase \\
    scripts/fetch-fja-for-fixed-orgs.py --write
"""

import argparse
import os
import re
import sys
import time
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup
from supabase import create_client

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required", file=sys.stderr)
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def search_fja(query: str) -> Optional[str]:
    """
    Search FreeJobAlert for matching article.
    Returns the first matching article URL, or None.
    """
    try:
        search_url = f"https://www.freejobalert.com/?s={quote(query)}"
        resp = requests.get(search_url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return None
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # FJA search results have article links in .entry-title or similar
        for link in soup.find_all('a', href=re.compile(r'/\d{4}/\d{2}/')):
            href = link.get('href', '')
            if 'freejobalert.com' in href and href.startswith('http'):
                return href
        
        return None
    except Exception as e:
        print(f"  ⚠ Search error: {e}", file=sys.stderr)
        return None


def fetch_recruitments():
    """Fetch the 173 newly-fixed recruitments."""
    try:
        response = supabase.table('recruitments').select(
            'id, name, organization_id, notification_date, source_url, application_end_date'
        ).filter(
            'organization_id', 'neq', 2235
        ).filter(
            'updated_at', 'gt', 'now()-2 hours'
        ).execute()
        
        return response.data if response.data else []
    except Exception as e:
        print(f"Error fetching recruitments: {e}", file=sys.stderr)
        return []


def update_source_url(recruitment_id: int, source_url: str):
    """Update recruitment.source_url in Supabase."""
    try:
        supabase.table('recruitments').update({
            'source_url': source_url,
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }).eq('id', recruitment_id).execute()
        return True
    except Exception as e:
        print(f"  ✗ DB update failed: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', default=False)
    parser.add_argument('--write', action='store_true', default=False)
    args = parser.parse_args()
    
    IS_DRY_RUN = not args.write
    
    print(f"Fetching FJA articles for 173 recruitments...", file=sys.stderr)
    recruitments = fetch_recruitments()
    
    if not recruitments:
        print("No recruitments found", file=sys.stderr)
        return
    
    print(f"Found {len(recruitments)} recruitments to process", file=sys.stderr)
    
    matched = 0
    skipped = 0
    
    for i, rec in enumerate(recruitments, 1):
        rec_id = rec['id']
        rec_name = rec['name']
        
        # Skip if source_url already set
        if rec.get('source_url'):
            print(f"{i}/{len(recruitments)} [SKIP] {rec_id}: Already has source_url", file=sys.stderr)
            skipped += 1
            continue
        
        # Search for article
        print(f"{i}/{len(recruitments)} [SEARCH] {rec_id}: {rec_name[:60]}...", file=sys.stderr)
        article_url = search_fja(rec_name)
        
        if article_url:
            matched += 1
            status = "DRY" if IS_DRY_RUN else "WRITE"
            print(f"         [✓ {status}] Found: {article_url}", file=sys.stderr)
            
            if not IS_DRY_RUN:
                if update_source_url(rec_id, article_url):
                    print(f"         [✓ OK] Updated", file=sys.stderr)
                else:
                    print(f"         [✗ FAIL] Update failed", file=sys.stderr)
        else:
            print(f"         [✗ NO MATCH]", file=sys.stderr)
        
        # Rate limit
        time.sleep(0.5)
    
    print(f"\n--- SUMMARY ---", file=sys.stderr)
    print(f"Total: {len(recruitments)}", file=sys.stderr)
    print(f"Matched: {matched}", file=sys.stderr)
    print(f"Skipped (already had URL): {skipped}", file=sys.stderr)
    print(f"No match: {len(recruitments) - matched - skipped}", file=sys.stderr)
    
    if not IS_DRY_RUN and matched > 0:
        print(f"\n✓ Updated {matched} recruitment source_urls", file=sys.stderr)
        print(f"Next: uv run --with requests --with beautifulsoup4 scripts/enrich-from-fja.py --write", file=sys.stderr)
    elif IS_DRY_RUN:
        print(f"\n(DRY-RUN MODE: no updates applied)", file=sys.stderr)


if __name__ == '__main__':
    main()
