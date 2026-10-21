"""
EmploymentNews.gov.in HTML extractor.

Employment News (Rozgar Samachar) is a weekly official Government of India publication.
Their website lists vacancy advertisements directly from official notifications.

Structure: listings page → individual advertisement page.
Each ad has structured fields in a definition list or table.
"""

import re
import logging
from typing import Optional
from extractor_base import (
    fetch_page, parse_vacancies_from_text, normalise_date,
    build_record, clean_text,
)

logger = logging.getLogger(__name__)


def _get_field(soup, label: str) -> Optional[str]:
    """
    Find a field value from the page.
    Employment News uses <strong> labels followed by text, or definition lists.
    """
    label_lower = label.lower()
    # Pattern 1: <strong>Label:</strong> value
    for strong in soup.find_all("strong"):
        if label_lower in strong.get_text(strip=True).lower():
            # Value is either in the next sibling or parent's text
            parent = strong.parent
            if parent:
                text = parent.get_text(strip=True)
                # Remove the label part
                parts = re.split(re.escape(strong.get_text(strip=True)), text, maxsplit=1, flags=re.I)
                if len(parts) > 1:
                    val = parts[1].strip().lstrip(":").strip()
                    if val:
                        return val
    # Pattern 2: table cells
    for td in soup.find_all("td"):
        if label_lower in td.get_text(strip=True).lower():
            nxt = td.find_next_sibling("td")
            if nxt:
                return nxt.get_text(strip=True)
    return None


def _extract_vacancies_en(soup) -> Optional[int]:
    """Employment News-specific vacancy extraction."""
    # Try "No. of Posts" or "Vacancies"
    for label in ["no. of posts", "number of posts", "no of vacancies", "total vacancies", "vacancies"]:
        val = _get_field(soup, label)
        if val:
            try:
                return int(re.sub(r"[^\d]", "", val.split()[0]))
            except (ValueError, IndexError):
                pass
    # Text fallback
    return parse_vacancies_from_text(soup.get_text(" ", strip=True))


def _extract_organization_en(soup, url: str) -> Optional[str]:
    """Extract organization from Employment News page."""
    # Try "Name of Organisation" or "Department"
    for label in ["name of organisation", "organization", "organisation", "department", "ministry"]:
        val = _get_field(soup, label)
        if val and len(val) > 3:
            return val
    # Fallback: H1 or H2
    for tag in ["h1", "h2"]:
        el = soup.find(tag)
        if el:
            return el.get_text(strip=True)
    return None


def _extract_post_en(soup) -> Optional[str]:
    """Extract post/role name."""
    # Try "Name of Post" or "Post"
    for label in ["name of post", "post name", "designation", "post"]:
        val = _get_field(soup, label)
        if val and len(val) > 3:
            return val
    h1 = soup.find("h1")
    return h1.get_text(strip=True) if h1 else None


def _extract_salary_en(soup) -> tuple[Optional[float], Optional[float], Optional[str]]:
    """Extract pay/salary from Employment News page."""
    for label in ["pay scale", "pay band", "salary", "emoluments", "remuneration", "pay level"]:
        val = _get_field(soup, label)
        if val:
            # Try numeric range
            m = re.search(r"[₹₹]?\s*(\d[\d,]+)\s*(?:–|-|to)\s*[₹₹]?\s*(\d[\d,]+)", val)
            if m:
                lo = int(m.group(1).replace(",", ""))
                hi = int(m.group(2).replace(",", ""))
                return float(lo), float(hi), val
            return None, None, val
    return None, None, None


def extract(url: str, source_name: str = "EmploymentNews") -> Optional[dict]:
    """
    Extract a recruitment record from an Employment News advertisement page.
    """
    soup = fetch_page(url)
    if soup is None:
        return None

    post = _extract_post_en(soup)
    if not post:
        logger.debug(f"No post found at {url}")
        return None

    organization = _extract_organization_en(soup, url)

    # Dates
    deadline = normalise_date(
        _get_field(soup, "last date") or
        _get_field(soup, "closing date") or
        _get_field(soup, "last day")
    )
    posted = normalise_date(
        _get_field(soup, "notification date") or
        _get_field(soup, "advertisement date") or
        _get_field(soup, "issue date")
    )

    vacancies = _extract_vacancies_en(soup)
    salary_min, salary_max, salary_note = _extract_salary_en(soup)

    qual_text = (
        _get_field(soup, "essential qualification") or
        _get_field(soup, "qualification") or
        _get_field(soup, "educational qualification")
    )
    experience_text = _get_field(soup, "experience")

    # Location
    locations = []
    location_val = _get_field(soup, "place of posting") or _get_field(soup, "location")
    if location_val:
        locations = [location_val]

    # Apply link
    apply_url = None
    for a in soup.find_all("a", href=True):
        txt = a.get_text(strip=True).lower()
        if "apply" in txt or "notification" in txt:
            href = a["href"]
            if href.startswith("http"):
                apply_url = href
                break

    return build_record(
        source_url=url,
        source_name=source_name,
        organization=organization,
        post=post,
        vacancies=vacancies,
        salary_min=salary_min,
        salary_max=salary_max,
        salary_note=salary_note,
        application_deadline=deadline,
        posted_date=posted,
        job_locations=locations,
        qualification_text=qual_text,
        experience_text=experience_text,
        apply_url=apply_url,
    )
