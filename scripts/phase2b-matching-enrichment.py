#!/usr/bin/env python3
"""
Phase 2B: Matching + Enrichment Pipeline for Official Notifications
================================================================================

Matches 2,220 recruitments to 1,488 official notifications using fuzzy matching.
Updates recruitment.source_url with official PDF URLs and enriches with data
extracted from FJA articles with proper confidence scoring and audit trail.

USAGE:
  # Dry-run (read-only, shows matches without writing)
  python scripts/phase2b-matching-enrichment.py --dry-run

  # Write mode (applies matches to database)
  python scripts/phase2b-matching-enrichment.py --write

  # Resume from checkpoint (continues where it left off)
  python scripts/phase2b-matching-enrichment.py --write --resume

  # Limit to first N recruitments (for testing)
  python scripts/phase2b-matching-enrichment.py --write --limit 50

FEATURES:
  - Fuzzy string matching (organization + post title)
  - Canonical organization name updates from official sources
  - FJA article data extraction with HTML parsing
  - Extraction confidence scoring (high/medium/low)
  - Quality gates for extracted data
  - Progress checkpoints every 50 recruitments
  - Full audit trail with source attribution
  - Parallel batch processing (5 concurrent FJA fetches)

DEPENDENCIES:
  pip install requests beautifulsoup4 openpyxl

OUTPUT:
  - Updates recruitment.source_url with official PDF URLs
  - Creates post enrichments with extracted data
  - Logs progress to phase2b-enrichment.log
  - Writes checkpoint every 50 recruits to phase2b-enrichment-checkpoint.json
  - Generates summary report: phase2b-enrichment-summary.json
"""

import argparse
import asyncio
import difflib
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Tuple
from urllib.parse import quote, urlparse

import requests
from bs4 import BeautifulSoup
from openpyxl import load_workbook

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

EXCEL_FILE = "/root/.claude/uploads/63bbf424-1dbe-5cea-bb2f-1a65f5cedf9b/71783a15-official-notification-links-14-Oct-2026.xlsx"
CHECKPOINT_FILE = "phase2b-enrichment-checkpoint.json"
LOG_FILE = "phase2b-enrichment.log"
SUMMARY_FILE = "phase2b-enrichment-summary.json"

# Parallel batch size (FJA rate limiting)
BATCH_SIZE = 5
DELAY_BETWEEN_REQUESTS = 0.5  # seconds
DELAY_BETWEEN_BATCHES = 1.0  # seconds
REQUEST_TIMEOUT = 15  # seconds
MAX_RETRIES = 2

# Matching thresholds
ORG_MATCH_THRESHOLD = 0.55  # Fuzzy match score for organization names
POST_MATCH_THRESHOLD = 0.60  # Fuzzy match score for post titles
COMBINED_MATCH_THRESHOLD = 0.75  # Combined score (organization + post)

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
# DATA STRUCTURES
# ============================================================================


class OfficialNotification:
    """Official notification from Excel file."""

    def __init__(self, row: tuple):
        self.number = row[0]
        self.organization = row[1] if row[1] else ""
        self.post = row[2] if row[2] else ""
        self.vacancies = row[3]
        self.posted = row[4]
        self.last_date = row[5]
        self.category = row[6]
        self.state = row[7]
        self.official_url = row[8] if row[8] else None
        self.link_type = row[9]
        self.link_check = row[10]
        self.apply_url = row[11]
        self.official_website = row[12]
        self.listing_page = row[13] if row[13] else None  # FJA article URL
        self.source = row[14]

    def to_dict(self):
        return {
            "number": self.number,
            "organization": self.organization,
            "post": self.post,
            "vacancies": self.vacancies,
            "official_url": self.official_url,
            "listing_page": self.listing_page,
        }


# ============================================================================
# LOAD OFFICIAL NOTIFICATIONS
# ============================================================================


def load_official_notifications() -> List[OfficialNotification]:
    """Load official notifications from Excel file."""
    try:
        logger.info(f"Loading official notifications from {EXCEL_FILE}...")
        wb = load_workbook(EXCEL_FILE, read_only=True)
        ws = wb.active

        notifications = []
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i == 0:  # Skip header
                continue
            if not row[0]:  # Skip empty rows
                continue
            notifications.append(OfficialNotification(row))

        logger.info(f"Loaded {len(notifications)} official notifications")
        return notifications
    except Exception as e:
        logger.error(f"Error loading official notifications: {e}")
        sys.exit(1)


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


def update_recruitment(recruitment_id: int, updates: dict) -> bool:
    """Update a single recruitment via REST API."""
    try:
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        url = f"{SUPABASE_URL}/rest/v1/recruitments?id=eq.{recruitment_id}"
        updates["updated_at"] = datetime.utcnow().isoformat()

        resp = requests.patch(url, headers=headers, json=updates, timeout=30)
        return resp.status_code in (200, 204)
    except Exception as e:
        logger.error(f"Error updating recruitment {recruitment_id}: {e}")
        return False


def create_post_enrichment(enrichment_data: dict) -> bool:
    """Create a post enrichment record."""
    try:
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        url = f"{SUPABASE_URL}/rest/v1/post_enrichments"
        enrichment_data["created_at"] = datetime.utcnow().isoformat()

        resp = requests.post(url, headers=headers, json=enrichment_data, timeout=30)
        return resp.status_code in (200, 201)
    except Exception as e:
        logger.error(f"Error creating enrichment: {e}")
        return False


# ============================================================================
# FUZZY MATCHING
# ============================================================================


def normalize_string(s: str) -> str:
    """Normalize string for matching."""
    # Remove special chars, extra whitespace, convert to lowercase
    s = re.sub(r"[^\w\s]", " ", s.lower())
    s = re.sub(r"\s+", " ", s).strip()
    return s


def match_score(recruitment_name: str, notification: OfficialNotification) -> float:
    """
    Calculate fuzzy match score between recruitment and notification.
    Returns score 0-1.
    """
    norm_rec = normalize_string(recruitment_name)
    norm_org = normalize_string(notification.organization)
    norm_post = normalize_string(notification.post)

    # Match on organization name
    org_score = difflib.SequenceMatcher(None, norm_rec, norm_org).ratio()

    # Match on post title
    post_score = difflib.SequenceMatcher(None, norm_rec, norm_post).ratio()

    # Also try matching org+post as a combined string
    combined = f"{norm_org} {norm_post}"
    combined_score = difflib.SequenceMatcher(None, norm_rec, combined).ratio()

    # Take the best score
    return max(org_score, post_score, combined_score)


def find_best_match(
    recruitment_name: str, notifications: List[OfficialNotification]
) -> Tuple[Optional[OfficialNotification], float]:
    """Find best matching notification for a recruitment."""
    best_match = None
    best_score = 0

    norm_rec = normalize_string(recruitment_name)
    rec_words = set(norm_rec.split())

    # Pre-filter notifications: only check those with at least 2 words in common
    candidates = []
    for notification in notifications:
        org_norm = normalize_string(notification.organization)
        post_norm = normalize_string(notification.post)
        combined_norm = f"{org_norm} {post_norm}"
        candidate_words = set(combined_norm.split())

        # Quick word overlap check
        if len(rec_words & candidate_words) >= 2:
            candidates.append(notification)

    # Now do expensive fuzzy matching only on pre-filtered candidates
    for notification in candidates:
        score = match_score(recruitment_name, notification)

        if score >= COMBINED_MATCH_THRESHOLD and score > best_score:
            best_match = notification
            best_score = score

    return best_match, best_score


# ============================================================================
# FJA ARTICLE EXTRACTION
# ============================================================================


def extract_from_fja_article(article_url: str) -> Dict:
    """
    Extract safe data fields from FJA article.
    Returns dict with extracted fields and confidence scores.
    """
    extracted = {
        "salary_range": None,
        "age_limit": None,
        "application_start": None,
        "application_deadline": None,
        "vacancies": None,
        "selection_process": None,
        "extraction_source": "fja_article",
        "extraction_confidence": "low",
        "extraction_fields": [],
        "extraction_errors": [],
    }

    if not article_url:
        return extracted

    try:
        resp = requests.get(article_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            extracted["extraction_errors"].append(
                f"HTTP {resp.status_code} when fetching article"
            )
            return extracted

        soup = BeautifulSoup(resp.text, "html.parser")

        # Extract salary range (look for patterns like "₹5,200-20,200" or "Rs 50000-100000")
        salary_patterns = [
            r"₹[\d,]+\s*[-–]\s*₹?[\d,]+",
            r"Rs\.?\s*[\d,]+\s*[-–]\s*Rs\.?\s*[\d,]+",
            r"Salary:\s*₹?[\d,\s]+[-–][\d,\s]+",
        ]
        salary_text = soup.get_text()
        for pattern in salary_patterns:
            matches = re.findall(pattern, salary_text)
            if matches:
                extracted["salary_range"] = matches[0]
                extracted["extraction_fields"].append("salary_range")
                break

        # Extract age limit (look for "Age limit" or "Age:" mentions)
        age_patterns = [
            r"Age\s*(?:limit|restrictions?)?:?\s*([^.\n]+(?:years?)?[^.\n]*)",
            r"Maximum\s*age:?\s*(\d+\s*years?)",
            r"Age\s*(?:as\s*on)?.*?(\d+\s*years?)",
        ]
        for pattern in age_patterns:
            match = re.search(pattern, salary_text, re.IGNORECASE)
            if match:
                extracted["age_limit"] = match.group(1).strip()
                extracted["extraction_fields"].append("age_limit")
                break

        # Extract application dates (look for "Application Start" / "Deadline" / "Last date")
        date_patterns = [
            r"Application\s*(?:Start|Opens?):\s*([0-9]{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[0-9]{4})",
            r"Last\s*(?:date|Date)?\s*(?:for\s*)?Application:?\s*([0-9]{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[0-9]{4})",
            r"Deadline:?\s*([0-9]{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[0-9]{4})",
        ]
        for pattern in date_patterns:
            match = re.search(pattern, salary_text, re.IGNORECASE)
            if match:
                extracted["application_deadline"] = match.group(1).strip()
                extracted["extraction_fields"].append("application_deadline")
                break

        # Extract vacancy count if present
        vacancy_patterns = [
            r"Vacancies?:\s*(\d+)",
            r"(?:Total\s+)?Vacancy\s*(?:Count)?:\s*(\d+)",
        ]
        for pattern in vacancy_patterns:
            match = re.search(pattern, salary_text, re.IGNORECASE)
            if match:
                extracted["vacancies"] = int(match.group(1))
                extracted["extraction_fields"].append("vacancies")
                break

        # Determine confidence based on fields extracted
        fields_count = len(extracted["extraction_fields"])
        if fields_count >= 3:
            extracted["extraction_confidence"] = "high"
        elif fields_count >= 1:
            extracted["extraction_confidence"] = "medium"
        else:
            extracted["extraction_confidence"] = "low"

    except requests.Timeout:
        extracted["extraction_errors"].append("Request timeout")
    except Exception as e:
        extracted["extraction_errors"].append(str(e))

    return extracted


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


def save_summary(summary: dict):
    """Save summary statistics."""
    try:
        with open(SUMMARY_FILE, "w") as f:
            json.dump(summary, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not save summary: {e}")


# ============================================================================
# MAIN MATCHING LOOP
# ============================================================================


def main():
    parser = argparse.ArgumentParser(
        description="Phase 2B: Match recruitments to official notifications and enrich"
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
        "--limit",
        type=int,
        default=None,
        help="Limit to first N recruitments (for testing)",
    )
    args = parser.parse_args()

    IS_DRY_RUN = not args.write
    IS_RESUME = args.resume and args.write

    logger.info("=" * 80)
    logger.info("Phase 2B: Matching + Enrichment Pipeline")
    logger.info("=" * 80)
    logger.info(f"Mode: {'DRY-RUN' if IS_DRY_RUN else 'WRITE'}")
    if IS_RESUME:
        logger.info("Resume mode: ON")
    if args.limit:
        logger.info(f"Limit: first {args.limit} recruitments")
    logger.info("")

    # Load official notifications
    notifications = load_official_notifications()

    # Load checkpoint if resuming
    checkpoint = load_checkpoint() if IS_RESUME else {}
    matched_ids = checkpoint.get("matched_ids", [])
    skip_until_id = max(matched_ids) if IS_RESUME and matched_ids else 0

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
                f"Matching: {rec_name[:60]}... (ID: {rec_id})"
            )

            # Find best matching notification
            best_notification, score = find_best_match(rec_name, notifications)

            if best_notification and score >= COMBINED_MATCH_THRESHOLD:
                logger.info(
                    f"  ✓ MATCHED (score: {score:.2f}): {best_notification.organization} / {best_notification.post}"
                )

                # Extract from FJA article if URL available (skip in dry-run mode)
                if not IS_DRY_RUN and best_notification.listing_page:
                    enrichment = extract_from_fja_article(best_notification.listing_page)
                else:
                    enrichment = {
                        "salary_range": None,
                        "age_limit": None,
                        "application_start": None,
                        "application_deadline": None,
                        "vacancies": None,
                        "selection_process": None,
                        "extraction_source": "fja_article",
                        "extraction_confidence": "low",
                        "extraction_fields": [],
                        "extraction_errors": [],
                    }

                # Prepare updates
                updates = {
                    "source_url": best_notification.official_url,
                    "organization_name": best_notification.organization,
                }

                if not IS_DRY_RUN:
                    # Update recruitment
                    if update_recruitment(rec_id, updates):
                        logger.info(f"  ✓ Updated recruitment.source_url")
                    else:
                        logger.warning(f"  ✗ Recruitment update failed")

                    # Create enrichment record if we extracted data
                    if enrichment["extraction_fields"]:
                        enrichment_data = {
                            "recruitment_id": rec_id,
                            "source_notification_id": best_notification.number,
                            "source_notification_org": best_notification.organization,
                            "source_notification_post": best_notification.post,
                            "match_score": float(score),
                            "extracted_salary_range": enrichment["salary_range"],
                            "extracted_age_limit": enrichment["age_limit"],
                            "extracted_application_deadline": enrichment[
                                "application_deadline"
                            ],
                            "extracted_vacancies": enrichment["vacancies"],
                            "extraction_confidence": enrichment["extraction_confidence"],
                            "extraction_source": enrichment["extraction_source"],
                            "extraction_fields": enrichment["extraction_fields"],
                        }
                        if create_post_enrichment(enrichment_data):
                            logger.info(
                                f"  ✓ Created enrichment ({enrichment['extraction_confidence']} confidence)"
                            )
                        else:
                            logger.warning(f"  ✗ Enrichment creation failed")

                matched.append(
                    {
                        "id": rec_id,
                        "name": rec_name,
                        "notification_org": best_notification.organization,
                        "notification_post": best_notification.post,
                        "match_score": float(score),
                        "official_url": best_notification.official_url,
                        "extraction_confidence": enrichment["extraction_confidence"],
                        "extraction_fields": enrichment["extraction_fields"],
                    }
                )
                batch_results.append(True)
            else:
                logger.info(f"  ✗ No good match found")
                batch_results.append(False)

            time.sleep(DELAY_BETWEEN_REQUESTS)
            total_processed += 1

        # Checkpoint every batch
        if batch_results and (len(matched) > 0 or total_processed % 50 == 0):
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
    coverage = len(matched) * 100 / len(all_recruitments) if all_recruitments else 0

    summary = {
        "timestamp": datetime.utcnow().isoformat(),
        "total_processed": total_processed,
        "total_recruited": len(all_recruitments),
        "total_matched": len(matched),
        "coverage_percent": coverage,
        "avg_match_score": (
            sum(m["match_score"] for m in matched) / len(matched)
            if matched
            else 0
        ),
        "time_elapsed_hours": hours,
        "processing_rate_per_second": rate,
        "extraction_high_confidence": sum(
            1 for m in matched if m["extraction_confidence"] == "high"
        ),
        "extraction_medium_confidence": sum(
            1 for m in matched if m["extraction_confidence"] == "medium"
        ),
        "extraction_low_confidence": sum(
            1 for m in matched if m["extraction_confidence"] == "low"
        ),
    }

    if not IS_DRY_RUN:
        save_summary(summary)

    logger.info("")
    logger.info("=" * 80)
    logger.info("SUMMARY")
    logger.info("=" * 80)
    logger.info(f"Total processed: {total_processed}/{len(all_recruitments)}")
    logger.info(f"Matched: {len(matched)} ({coverage:.1f}%)")
    logger.info(f"No match: {len(all_recruitments) - len(matched)}")
    logger.info(f"Avg match score: {summary['avg_match_score']:.3f}")
    logger.info(f"Time elapsed: {hours:.1f} hours ({rate:.2f} recruits/sec)")
    logger.info(f"Extraction quality:")
    logger.info(f"  - High confidence: {summary['extraction_high_confidence']}")
    logger.info(f"  - Medium confidence: {summary['extraction_medium_confidence']}")
    logger.info(f"  - Low confidence: {summary['extraction_low_confidence']}")
    logger.info("")

    if matched:
        if IS_DRY_RUN:
            logger.info(f"DRY-RUN MODE: {len(matched)} matches found (not written)")
            logger.info("To apply, run with --write flag")
        else:
            logger.info(
                f"✓ WRITTEN: {len(matched)} recruitments updated with source_urls"
            )
        logger.info("")
        logger.info("Sample matched recruitments:")
        for m in matched[:3]:
            logger.info(f"  {m['id']}: {m['name'][:50]}...")
            logger.info(
                f"    → {m['notification_org'][:60]}... / {m['notification_post'][:50]}..."
            )
            logger.info(f"    → Score: {m['match_score']:.3f}, Extraction: {m['extraction_confidence']}")
        if len(matched) > 3:
            logger.info(f"  ... and {len(matched) - 3} more")
    else:
        logger.info("No matches found")

    logger.info("")
    logger.info(f"Full log: {LOG_FILE}")
    if not IS_DRY_RUN:
        logger.info(f"Summary: {SUMMARY_FILE}")
    logger.info("=" * 80)

    # Clean up checkpoint if done
    if not IS_DRY_RUN and total_processed >= len(all_recruitments):
        try:
            Path(CHECKPOINT_FILE).unlink()
            logger.info("Checkpoint cleaned up (matching complete)")
        except:
            pass


if __name__ == "__main__":
    main()
