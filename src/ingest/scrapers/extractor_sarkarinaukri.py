"""
SarkariNaukri (sarkari-naukri.in) HTML extractor.

These pages are prose-style (no structured tables). The Yoast meta description
carries a compact summary: "<Title> Last Date <date> (<City>, <State>), For <qual>".
We combine that with body-text scanning for vacancies, salary, and links.
"""

import re
import logging
from typing import Optional
from extractor_base import (
    fetch_page, parse_vacancies_from_text, normalise_date,
    build_record, clean_text,
)

logger = logging.getLogger(__name__)

# Patterns for the Yoast-style meta description
LAST_DATE_RE = re.compile(r"last date[:\s]+(\d{1,2}[\s/\-][A-Za-z0-9]+[\s/\-]\d{2,4})", re.I)
LOCATION_RE = re.compile(r"\(([^,)]+),\s*([^)]+)\)")
QUAL_RE = re.compile(r"\bfor\s+([A-Za-z0-9 ./&,+\-]{3,60}?)(?:,|\.|$)", re.I)
SALARY_RE = re.compile(r"(?:rs\.?|₹)\s*(\d[\d,]+)\s*(?:[-–/]\s*(?:rs\.?|₹)?\s*(\d[\d,]+))?", re.I)


def _extract_from_meta(meta_desc: str) -> dict:
    """Extract structured fields from the Yoast meta description."""
    out = {}
    m = LAST_DATE_RE.search(meta_desc)
    if m:
        out["application_deadline"] = normalise_date(m.group(1))
    m = LOCATION_RE.search(meta_desc)
    if m:
        out["city"] = clean_text(m.group(1))
        out["state"] = clean_text(m.group(2))
    m = QUAL_RE.search(meta_desc)
    if m:
        out["qualification_text"] = clean_text(m.group(1))
    return out


def _extract_salary(text: str) -> tuple[Optional[float], Optional[float], Optional[str]]:
    m = SALARY_RE.search(text)
    if not m:
        return None, None, None
    lo = float(m.group(1).replace(",", ""))
    hi = float(m.group(2).replace(",", "")) if m.group(2) else lo
    return lo, hi, m.group(0)


def _extract_links(soup) -> tuple[Optional[str], Optional[str]]:
    """Find apply and notification links."""
    apply_url = None
    notification_url = None
    for a in soup.find_all("a", href=True):
        txt = a.get_text(strip=True).lower()
        href = a["href"]
        if not href.startswith("http"):
            continue
        if ("apply" in txt or "registration" in txt or "online form" in txt) and not apply_url:
            apply_url = href
        elif ("notification" in txt or "advertisement" in txt or "notice" in txt or
              href.lower().endswith(".pdf")) and not notification_url:
            notification_url = href
    return apply_url, notification_url


def extract(url: str, source_name: str = "SarkariNaukri") -> Optional[dict]:
    """
    Extract a recruitment record from sarkari-naukri.in.
    """
    soup = fetch_page(url)
    if soup is None:
        return None

    # Title from H1 or og:title meta
    title_el = soup.find("h1")
    title = clean_text(title_el.get_text()) if title_el else None
    if not title:
        og = soup.find("meta", property="og:title")
        title = og["content"].strip() if og else None

    if not title:
        logger.debug(f"No title found at {url}")
        return None

    # Organization: inferred from title (SarkariNaukri is a pure aggregator)
    organization = None
    for pat in [
        r"\bSSC\b", r"\bUPSC\b", r"\bRRB\b", r"\bIBPS\b", r"\bSBI\b", r"\bRBI\b",
        r"\bNHAI\b", r"\bDRDO\b", r"\bISRO\b", r"\bBSF\b", r"\bCRPF\b",
    ]:
        if re.search(pat, title):
            organization = re.search(pat, title).group(0)
            break

    # Meta description
    meta_el = soup.find("meta", attrs={"name": "description"})
    meta_desc = meta_el.get("content", "") if meta_el else ""
    if not meta_desc:
        og_desc = soup.find("meta", property="og:description")
        meta_desc = og_desc.get("content", "") if og_desc else ""

    fields = _extract_from_meta(meta_desc)

    # Body text for supplementary extraction
    body = soup.find("article") or soup.find("main") or soup.find("body")
    body_text = clean_text(body.get_text(" ")) if body else ""

    vacancies = parse_vacancies_from_text(body_text[:3000])
    salary_min, salary_max, salary_note = _extract_salary(body_text[:3000])
    apply_url, notification_url = _extract_links(soup)

    # Dates: also try body text if meta didn't yield deadline
    deadline = fields.get("application_deadline")
    if not deadline:
        m = LAST_DATE_RE.search(body_text[:2000])
        if m:
            deadline = normalise_date(m.group(1))

    # Posted date from meta or og:article:published_time
    posted = None
    for attr in [("property", "article:published_time"), ("name", "date"), ("property", "og:updated_time")]:
        el = soup.find("meta", attrs={attr[0]: attr[1]})
        if el and el.get("content"):
            posted = el["content"][:10]  # YYYY-MM-DD
            break

    locations = []
    if fields.get("city") and fields.get("state"):
        locations = [f"{fields['city']}, {fields['state']}"]
    elif fields.get("state"):
        locations = [fields["state"]]

    return build_record(
        source_url=url,
        source_name=source_name,
        organization=organization or "",  # Will be inferred from title by TS pipeline
        post=title,
        vacancies=vacancies,
        salary_min=salary_min,
        salary_max=salary_max,
        salary_note=salary_note,
        application_deadline=deadline,
        posted_date=posted,
        job_locations=locations,
        qualification_text=fields.get("qualification_text"),
        apply_url=apply_url,
        extra={"notification_url": notification_url} if notification_url else None,
    )
