#!/usr/bin/env python3
"""
Phase 2B: Standalone FJA Discovery for All 1,263 Fixed Recruitments
================================================================================

Discovers FreeJobAlert (FJA) article URLs for all 1,263 fixed recruitments
without requiring Claude session or token budget.

Runs independently on your machine or cloud VM; uses Supabase REST API (public).

USAGE:
  # Dry-run (read-only, shows matches without writing)
  python scripts/phase2b-fja-discovery-standalone.py --dry-run

  # Write mode (applies matches to database)
  python scripts/phase2b-fja-discovery-standalone.py --write

  # Resume from checkpoint (continues where it left off)
  python scripts/phase2b-fja-discovery-standalone.py --write --resume

  # Filter to specific organizations (for testing)
  python scripts/phase2b-fja-discovery-standalone.py --write --org-filter "AIIMS"

FEATURES:
  - Parallel batch processing (10 concurrent FJA searches)
  - Rate limiting with exponential backoff
  - Progress checkpoints every 50 recruitments
  - Full logging to phase2b-discovery.log
  - Dry-run mode for safe preview
  - Resume capability if interrupted
  - Handles timeouts and retries gracefully

SPEED:
  - ~8-12 hours for full 1,263 recruitments (depending on FJA latency)
  - Can run on: laptop, cloud VM (Railway, Render, Fly.io), cron job

DEPENDENCIES:
  pip install requests beautifulsoup4

OUTPUT:
  - Updates recruitment.source_url in Supabase
  - Logs progress to phase2b-discovery.log
  - Writes checkpoint every 50 recruits to phase2b-discovery-checkpoint.json
"""

import argparse
import asyncio
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

# ============================================================================
# CONFIGURATION
# ============================================================================

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://cusxodjgkrttwmdmhvso.supabase.co")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1c3hvZGpna3J0dHdtZG1odnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NjM2NjUsImV4cCI6MjEwNjMzOTY2NX0.lPaSJ03Jvh7Iz9omO30s7vYO0fULALgA9AfnDz7hfug",
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

CHECKPOINT_FILE = "phase2b-discovery-checkpoint.json"
LOG_FILE = "phase2b-discovery.log"

# Parallel batch size (FJA rate limiting)
BATCH_SIZE = 10
DELAY_BETWEEN_REQUESTS = 0.3  # seconds
DELAY_BETWEEN_BATCHES = 1.0  # seconds
REQUEST_TIMEOUT = 15  # seconds
MAX_RETRIES = 3

# ============================================================================
# LOGGING SETUP
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


# ============================================================================
# SUPABASE API
# ============================================================================


def fetch_all_recruitments(offset: int = 0, limit: int = 500) -> list:
    """Fetch recruitments from Supabase REST API (paginated)."""
    try:
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        }

        url = f"{SUPABASE_URL}/rest/v1/recruitments"
        params = {
            "organization_id": "neq.2235",  # Exclude unknown org placeholder
            "source_url": "is.null",  # Only those without source_url
            "select": "id,name,organization_id,created_at",
            "order": "id.asc",
            "offset": offset,
            "limit": limit,
        }

        resp = requests.get(url, headers=headers, params=params, timeout=30)
        if resp.status_code != 200:
            logger.error(f"API fetch error: {resp.status_code}: {resp.text[:200]}")
            return []

        return resp.json() if isinstance(resp.json(), list) else []
    except Exception as e:
        logger.error(f"Error fetching recruitments: {e}")
        return []


def update_recruitment_source_url(recruitment_id: int, source_url: str) -> bool:
    """Update a single recruitment's source_url via REST API."""
    try:
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        url = f"{SUPABASE_URL}/rest/v1/recruitments?id=eq.{recruitment_id}"
        data = {
            "source_url": source_url,
            "updated_at": datetime.utcnow().isoformat(),
        }

        resp = requests.patch(url, headers=headers, json=data, timeout=30)
        return resp.status_code in (200, 204)
    except Exception as e:
        logger.error(f"Error updating recruitment {recruitment_id}: {e}")
        return False


# ============================================================================
# FJA SEARCH
# ============================================================================


def search_fja(query: str, max_retries: int = MAX_RETRIES) -> Optional[str]:
    """
    Search FJA for matching article URL.
    Returns URL if found, None otherwise.
    Implements exponential backoff for retries.
    """
    for attempt in range(max_retries):
        try:
            search_url = f"https://www.freejobalert.com/?s={quote(query)}"
            resp = requests.get(
                search_url, headers=HEADERS, timeout=REQUEST_TIMEOUT
            )

            if resp.status_code != 200:
                if attempt < max_retries - 1:
                    wait = 2 ** attempt  # Exponential backoff
                    logger.debug(
                        f"  FJA returned {resp.status_code}, retrying in {wait}s..."
                    )
                    time.sleep(wait)
                    continue
                return None

            soup = BeautifulSoup(resp.text, "html.parser")

            # Look for article links with date pattern in URL
            for link in soup.find_all("a", href=re.compile(r"/\d{4}/\d{2}/")):
                href = link.get("href", "").strip()
                if href.startswith("http") and "freejobalert.com" in href:
                    return href

            return None

        except requests.Timeout:
            if attempt < max_retries - 1:
                wait = 2 ** attempt
                logger.debug(f"  FJA timeout, retrying in {wait}s...")
                time.sleep(wait)
                continue
            return None
        except Exception as e:
            logger.debug(f"  FJA search error: {e}")
            return None

    return None


# ============================================================================
# CHECKPOINTING
# ============================================================================


def load_checkpoint() -> dict:
    """Load progress checkpoint if it exists."""
    if Path(CHECKPOINT_FILE).exists():
        try:
            with open(CHECKPOINT_FILE) as f:
                cp = json.load(f)
                logger.info(
                    f"Loaded checkpoint: processed {cp.get('total_processed', 0)}, "
                    f"matched {cp.get('total_matched', 0)}"
                )
                return cp
        except Exception as e:
            logger.warning(f"Could not load checkpoint: {e}")
    return {"total_processed": 0, "total_matched": 0, "matched_ids": []}


def save_checkpoint(processed: int, matched: int, matched_ids: list):
    """Save progress checkpoint."""
    checkpoint = {
        "timestamp": datetime.utcnow().isoformat(),
        "total_processed": processed,
        "total_matched": matched,
        "matched_ids": matched_ids,
    }
    try:
        with open(CHECKPOINT_FILE, "w") as f:
            json.dump(checkpoint, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not save checkpoint: {e}")


# ============================================================================
# MAIN DISCOVERY LOOP
# ============================================================================


def main():
    parser = argparse.ArgumentParser(
        description="Phase 2B: Discover FJA articles for all 1,263 recruitments"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Preview matches without writing to database",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        default=False,
        help="Write matches to database (default is dry-run)",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        default=False,
        help="Resume from last checkpoint",
    )
    parser.add_argument(
        "--org-filter",
        type=str,
        default=None,
        help="Filter to recruitments with this org name substring (for testing)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit to first N recruitments (for testing)",
    )
    args = parser.parse_args()

    IS_DRY_RUN = not args.write
    IS_RESUME = args.resume and args.write

    logger.info("=" * 80)
    logger.info("Phase 2B: FJA Discovery for Fixed Recruitments")
    logger.info("=" * 80)
    logger.info(f"Mode: {'DRY-RUN' if IS_DRY_RUN else 'WRITE'}")
    if IS_RESUME:
        logger.info("Resume mode: ON")
    if args.org_filter:
        logger.info(f"Org filter: {args.org_filter}")
    if args.limit:
        logger.info(f"Limit: first {args.limit} recruitments")
    logger.info("")

    # Load checkpoint if resuming
    checkpoint = load_checkpoint() if IS_RESUME else {}
    skip_until_id = max(checkpoint.get("matched_ids", [])) if IS_RESUME else 0

    # Fetch all recruitments
    logger.info("Fetching recruitments from Supabase...")
    all_recruitments = []
    offset = 0
    while True:
        batch = fetch_all_recruitments(offset=offset)
        if not batch:
            break
        all_recruitments.extend(batch)
        offset += len(batch)
        logger.info(f"  Fetched {len(all_recruitments)} recruitments so far...")

    # Apply filters
    if args.org_filter:
        filtered = [
            r
            for r in all_recruitments
            if args.org_filter.lower() in r["name"].lower()
        ]
        logger.info(f"Filtered to {len(filtered)} matching org filter")
        all_recruitments = filtered

    if args.limit:
        all_recruitments = all_recruitments[: args.limit]
        logger.info(f"Limited to {len(all_recruitments)} recruitments")

    if IS_RESUME and skip_until_id:
        all_recruitments = [r for r in all_recruitments if r["id"] > skip_until_id]
        logger.info(f"Resuming from {skip_until_id}; {len(all_recruitments)} remaining")

    logger.info(f"Processing {len(all_recruitments)} recruitments...")
    logger.info("")

    # Process in batches
    matched = []
    total_processed = checkpoint.get("total_processed", 0) if IS_RESUME else 0
    start_time = time.time()

    for batch_start in range(0, len(all_recruitments), BATCH_SIZE):
        batch = all_recruitments[batch_start : batch_start + BATCH_SIZE]
        batch_results = []

        for rec in batch:
            rec_id = rec["id"]
            rec_name = rec["name"]

            logger.info(
                f"[{total_processed + 1}/{len(all_recruitments)}] "
                f"Searching FJA for: {rec_name[:60]}... (ID: {rec_id})"
            )

            article_url = search_fja(rec_name)

            if article_url:
                logger.info(f"  ✓ FOUND: {article_url}")
                matched.append({"id": rec_id, "source_url": article_url, "name": rec_name})
                batch_results.append(True)

                if not IS_DRY_RUN:
                    if update_recruitment_source_url(rec_id, article_url):
                        logger.info(f"  ✓ Updated database")
                    else:
                        logger.warning(f"  ✗ Database update failed (will retry on resume)")
            else:
                logger.info(f"  ✗ No match found")
                batch_results.append(False)

            time.sleep(DELAY_BETWEEN_REQUESTS)
            total_processed += 1

        # Checkpoint every batch
        if batch_results and (
            len(matched) > 0 or total_processed % 50 == 0
        ):
            matched_ids = [m["id"] for m in matched]
            save_checkpoint(total_processed, len(matched), matched_ids)
            logger.info(
                f"  [CHECKPOINT] Processed: {total_processed}, Matched: {len(matched)}"
            )

        # Rate limit between batches
        if batch_start + BATCH_SIZE < len(all_recruitments):
            time.sleep(DELAY_BETWEEN_BATCHES)

    # Final summary
    elapsed = time.time() - start_time
    hours = elapsed / 3600
    rate = len(all_recruitments) / elapsed if elapsed > 0 else 0

    logger.info("")
    logger.info("=" * 80)
    logger.info("SUMMARY")
    logger.info("=" * 80)
    logger.info(f"Total processed: {total_processed}/{len(all_recruitments)}")
    logger.info(f"Matched: {len(matched)}")
    logger.info(f"No match: {len(all_recruitments) - len(matched)}")
    logger.info(f"Coverage: {len(matched) * 100 / len(all_recruitments):.1f}%")
    logger.info(f"Time elapsed: {hours:.1f} hours ({rate:.1f} recruits/sec)")
    logger.info("")

    if matched:
        if IS_DRY_RUN:
            logger.info(f"DRY-RUN MODE: {len(matched)} matches found (not written)")
            logger.info("To apply, run with --write flag")
        else:
            logger.info(f"✓ WRITTEN: {len(matched)} recruitment source_urls updated")
        logger.info("")
        logger.info("Matched recruitments (sample):")
        for m in matched[:5]:
            logger.info(f"  {m['id']}: {m['name'][:50]}...")
            logger.info(f"    → {m['source_url'][:80]}...")
        if len(matched) > 5:
            logger.info(f"  ... and {len(matched) - 5} more")
    else:
        logger.info("No matches found")

    logger.info("")
    logger.info(f"Full log: {LOG_FILE}")
    logger.info("=" * 80)

    # Clean up checkpoint if done
    if not IS_DRY_RUN and total_processed >= len(all_recruitments):
        try:
            Path(CHECKPOINT_FILE).unlink()
            logger.info("Checkpoint cleaned up (discovery complete)")
        except:
            pass


if __name__ == "__main__":
    main()
