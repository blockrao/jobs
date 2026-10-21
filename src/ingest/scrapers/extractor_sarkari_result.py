"""
SarkariResult.com HTML extractor.

SarkariResult uses a consistent HTML table layout:
- Title in <h1>
- Important dates table: Open Date, Last Date, Exam Date
- Application fee table
- Vacancy table with category/count
- Organization from breadcrumb or H1 text
- Apply Online link

No JSON-LD. Pure HTML scraping.
"""

import re
import logging
from typing import Optional
from extractor_base import (
    fetch_page, parse_vacancies_from_text, normalise_date,
    build_record, clean_text,
)

logger = logging.getLogger(__name__)


def _find_table_value(soup, label_text: str) -> Optional[str]:
    """
    Find a value in a two-column table where the left column contains label_text.
    Case-insensitive partial match.
    """
    label_lower = label_text.lower()
    for td in soup.find_all("td"):
        cell_text = td.get_text(strip=True).lower()
        if label_lower in cell_text:
            sibling = td.find_next_sibling("td")
            if sibling:
                return sibling.get_text(strip=True)
    return None


def _extract_vacancies(soup) -> Optional[int]:
    """
    Try to extract vacancy count from SarkariResult page.
    Strategies:
      1. Look for "Total Post" or "Total Vacancy" in a table
      2. Scan page text with regex
    """
    total = _find_table_value(soup, "total post") or _find_table_value(soup, "total vacancy")
    if total:
        try:
            return int(re.sub(r"[^\d]", "", total))
        except ValueError:
            pass
    # Fallback: page text regex
    page_text = soup.get_text(" ", strip=True)
    return parse_vacancies_from_text(page_text)


def _extract_salary(soup) -> tuple[Optional[float], Optional[float], Optional[str]]:
    """Extract pay scale / salary from the page."""
    salary_note = None
    # Try common label matches
    for label in ["pay scale", "salary", "pay band", "pay level"]:
        val = _find_table_value(soup, label)
        if val:
            salary_note = val
            break
    if salary_note:
        # Try to parse numeric range like "₹35,400 – ₹1,12,400"
        m = re.search(r"[₹₹]?\s*(\d[\d,]+)\s*(?:–|-|to)\s*[₹₹]?\s*(\d[\d,]+)", salary_note)
        if m:
            lo = int(m.group(1).replace(",", ""))
            hi = int(m.group(2).replace(",", ""))
            return float(lo), float(hi), salary_note
    return None, None, salary_note


def _extract_organization(soup, url: str) -> Optional[str]:
    """
    Derive the organization name from the page.
    Order: breadcrumb > meta > title heuristic.
    """
    # Breadcrumb (common pattern: Home > Recruitment > <Org>)
    breadcrumb = soup.find("div", class_=re.compile(r"breadcrumb", re.I))
    if breadcrumb:
        links = breadcrumb.find_all("a")
        if len(links) >= 2:
            # Take the last breadcrumb link that is not "Recruitment"
            for link in reversed(links):
                txt = link.get_text(strip=True)
                if txt and txt.lower() not in ("home", "recruitment", "job"):
                    return txt

    # H1 heuristic: "SSC CGL Recruitment 2024" → "SSC"
    h1 = soup.find("h1")
    if h1:
        h1_text = h1.get_text(strip=True)
        m = re.match(r"^([A-Z][A-Za-z\s&,\.]+?)(?:\s+Recruitment|\s+Bharti|\s+\d{4})", h1_text)
        if m:
            return m.group(1).strip()
    return None


def _extract_apply_url(soup) -> Optional[str]:
    """Look for the official Apply Online or notification link."""
    for a in soup.find_all("a", href=True):
        txt = a.get_text(strip=True).lower()
        if "apply online" in txt:
            href = a["href"]
            if href.startswith("http"):
                return href
    return None


def _extract_qualification(soup) -> Optional[str]:
    """Try to extract qualification text from a table or section."""
    for label in ["qualification", "eligibility", "education"]:
        val = _find_table_value(soup, label)
        if val and len(val) > 10:
            return val
    return None


def extract(url: str, source_name: str = "SarkariResult") -> Optional[dict]:
    """
    Extract a recruitment record from a SarkariResult article page.
    Returns a normalised record dict, or None on failure.
    """
    soup = fetch_page(url)
    if soup is None:
        return None

    # Post title
    h1 = soup.find("h1")
    post = h1.get_text(strip=True) if h1 else None
    if not post:
        logger.debug(f"No H1 found at {url}")
        return None

    organization = _extract_organization(soup, url)

    # Dates
    deadline = normalise_date(
        _find_table_value(soup, "last date") or
        _find_table_value(soup, "closing date") or
        _find_table_value(soup, "apply last date")
    )
    posted = normalise_date(
        _find_table_value(soup, "starting date") or
        _find_table_value(soup, "begin date") or
        _find_table_value(soup, "notification date")
    )
    exam_date = normalise_date(_find_table_value(soup, "exam date"))

    vacancies = _extract_vacancies(soup)
    salary_min, salary_max, salary_note = _extract_salary(soup)
    qual_text = _extract_qualification(soup)
    apply_url = _extract_apply_url(soup)

    # Location: SarkariResult is India-wide; extract from page text if possible
    locations = []
    location_val = _find_table_value(soup, "location") or _find_table_value(soup, "state")
    if location_val:
        locations = [location_val]
    else:
        page_text = soup.get_text(" ", strip=True)
        india_wide = re.search(r"\bAll India\b|\bPan India\b|\bAcross India\b", page_text, re.I)
        if india_wide:
            locations = ["All India"]

    extra = {}
    if exam_date:
        extra["exam_date"] = exam_date

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
        apply_url=apply_url,
        extra=extra,
    )
