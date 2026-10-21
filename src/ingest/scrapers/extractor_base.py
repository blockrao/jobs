"""
Base extraction utilities shared across all source extractors.
"""

import json
import re
import time
import logging
from datetime import datetime
from typing import Optional, Any
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; JobOye-Crawler/1.0; "
        "+https://www.joboye.com/about)"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}


def fetch_page(url: str, timeout: int = 15, retries: int = 3) -> Optional[BeautifulSoup]:
    """Fetch a URL and return a BeautifulSoup object, or None on failure."""
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=timeout)
            r.raise_for_status()
            return BeautifulSoup(r.text, "html.parser")
        except requests.RequestException as e:
            wait = 2 ** attempt
            logger.warning(f"Attempt {attempt+1}/{retries} failed for {url}: {e}. Waiting {wait}s")
            time.sleep(wait)
    logger.error(f"All {retries} attempts failed for {url}")
    return None


def find_json_ld(soup: BeautifulSoup, key: str, value: str) -> Optional[dict]:
    """Find the first JSON-LD block where obj[key] == value."""
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
            # Handle both single objects and @graph arrays
            if isinstance(data, list):
                for item in data:
                    if item.get(key) == value:
                        return item
            elif isinstance(data, dict):
                if data.get(key) == value:
                    return data
                # Check @graph
                for item in data.get("@graph", []):
                    if isinstance(item, dict) and item.get(key) == value:
                        return item
        except (json.JSONDecodeError, AttributeError):
            continue
    return None


def parse_locations(location_data: Any) -> list[str]:
    """Parse jobLocation from JSON-LD into a flat list of strings."""
    if not location_data:
        return []
    if isinstance(location_data, str):
        return [location_data.strip()] if location_data.strip() else []
    if isinstance(location_data, dict):
        location_data = [location_data]
    locations = []
    for loc in location_data:
        if isinstance(loc, str):
            locations.append(loc.strip())
            continue
        if isinstance(loc, dict):
            addr = loc.get("address", {})
            if isinstance(addr, str):
                locations.append(addr.strip())
            elif isinstance(addr, dict):
                parts = [
                    addr.get("addressLocality", ""),
                    addr.get("addressRegion", ""),
                    addr.get("addressCountry", ""),
                ]
                loc_str = ", ".join(p for p in parts if p)
                if loc_str:
                    locations.append(loc_str)
    return [l for l in locations if l]


def parse_vacancies_from_text(text: str) -> Optional[int]:
    """Extract vacancy count from free text using regex fallbacks."""
    patterns = [
        r"(\d[\d,]+)\s*(?:post|posts|vacancies|vacancy|positions?|seats?)",
        r"(?:total|no\.?\s+of)?\s*(?:post|posts|vacancies|vacancy)\s*[:\-]?\s*(\d[\d,]+)",
        r"(\d[\d,]+)\s*(?:total)?\s*(?:post|posts|vacancies)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "")
            try:
                return int(raw)
            except ValueError:
                continue
    return None


def clean_text(s: Optional[str]) -> Optional[str]:
    """Strip and normalise whitespace; return None for empty strings."""
    if not s:
        return None
    cleaned = " ".join(s.split())
    return cleaned if cleaned else None


def normalise_date(raw: Optional[str]) -> Optional[str]:
    """
    Try to parse common Indian date formats and return ISO 8601 date string.
    Returns None if unparseable.
    """
    if not raw:
        return None
    raw = raw.strip()
    # Already ISO
    if re.match(r"^\d{4}-\d{2}-\d{2}", raw):
        return raw[:10]
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%d %B %Y", "%d %b %Y",
        "%B %d, %Y", "%b %d, %Y", "%d.%m.%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    logger.debug(f"Cannot parse date: {raw!r}")
    return None


def build_record(
    source_url: str,
    source_name: str,
    organization: Optional[str],
    post: Optional[str],
    vacancies: Optional[int],
    salary_min: Optional[float],
    salary_max: Optional[float],
    salary_note: Optional[str],
    application_deadline: Optional[str],
    posted_date: Optional[str],
    job_locations: list[str],
    qualification_text: Optional[str] = None,
    experience_text: Optional[str] = None,
    apply_url: Optional[str] = None,
    employment_type: str = "FULL_TIME",
    extra: Optional[dict] = None,
) -> dict:
    """Build a normalised recruitment record for DB insertion."""
    return {
        "organization": clean_text(organization),
        "post": clean_text(post),
        "vacancies": vacancies,
        "employment_type": employment_type,
        "application_deadline": application_deadline,
        "posted_date": posted_date,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "salary_note": clean_text(salary_note),
        "job_locations": job_locations,
        "qualification_text": clean_text(qualification_text),
        "experience_text": clean_text(experience_text),
        "apply_url": apply_url,
        "source_url": source_url,
        "source_site": source_name,
        "extraction_timestamp": datetime.utcnow().isoformat(),
        "status": "EXTRACTED",
        **(extra or {}),
    }
