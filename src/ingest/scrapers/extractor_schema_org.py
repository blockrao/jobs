"""
Schema.org JobPosting extractor — works for any site that embeds
standard JSON-LD. Proven on FreeJobAlert; reusable for any schema.org-compliant source.
"""

import logging
from typing import Optional
from extractor_base import (
    fetch_page, find_json_ld, parse_locations, parse_vacancies_from_text,
    normalise_date, build_record, clean_text,
)

logger = logging.getLogger(__name__)


def extract(url: str, source_name: str = "FreeJobAlert") -> Optional[dict]:
    """
    Extract a recruitment record from a schema.org JobPosting page.
    Returns a normalised record dict, or None if no JobPosting found.
    """
    soup = fetch_page(url)
    if soup is None:
        return None

    job_posting = find_json_ld(soup, "@type", "JobPosting")
    if not job_posting:
        logger.debug(f"No JobPosting JSON-LD at {url}")
        return None

    # --- Core fields from JSON-LD ---
    organization = None
    hiring_org = job_posting.get("hiringOrganization")
    if isinstance(hiring_org, dict):
        organization = hiring_org.get("name")
    elif isinstance(hiring_org, str):
        organization = hiring_org

    post = job_posting.get("title") or job_posting.get("name")

    # Vacancies: schema.org field first, then page text fallback
    vacancies = None
    raw_vacancies = job_posting.get("numberOfPositions") or job_posting.get("totalJobOpenings")
    if raw_vacancies is not None:
        try:
            vacancies = int(str(raw_vacancies).replace(",", ""))
        except ValueError:
            pass
    if vacancies is None:
        page_text = soup.get_text(" ", strip=True)
        vacancies = parse_vacancies_from_text(page_text)

    # Salary
    salary_min = salary_max = None
    salary_note = None
    base_salary = job_posting.get("baseSalary", {})
    if isinstance(base_salary, dict):
        value = base_salary.get("value", {})
        if isinstance(value, dict):
            salary_min = value.get("minValue") or value.get("value")
            salary_max = value.get("maxValue") or salary_min
        elif isinstance(value, (int, float)):
            salary_min = salary_max = value
    if not salary_min:
        # Some sites put salary as a string description
        salary_str = job_posting.get("salaryCurrency") or job_posting.get("estimatedSalary")
        salary_note = clean_text(str(salary_str)) if salary_str else None

    # Dates
    deadline = normalise_date(job_posting.get("validThrough"))
    posted = normalise_date(job_posting.get("datePosted"))

    # Locations
    locations = parse_locations(job_posting.get("jobLocation", []))

    # Qualification / description
    description = job_posting.get("description") or ""
    qual_text = None
    if description:
        # Try to extract qualification paragraph from description HTML/text
        import re
        m = re.search(
            r"(?:qualification|education)[:\s]+([^\n<]{20,200})",
            description, re.IGNORECASE
        )
        qual_text = m.group(1).strip() if m else None

    # Apply URL
    apply_url = job_posting.get("url") or job_posting.get("applyFor")
    if not apply_url:
        # Look for an "Apply Online" link on the page
        for a in soup.find_all("a", href=True):
            link_text = a.get_text(strip=True).lower()
            if "apply" in link_text and "online" in link_text:
                apply_url = a["href"]
                break

    return build_record(
        source_url=url,
        source_name=source_name,
        organization=organization,
        post=post,
        vacancies=vacancies,
        salary_min=float(salary_min) if salary_min else None,
        salary_max=float(salary_max) if salary_max else None,
        salary_note=salary_note,
        application_deadline=deadline,
        posted_date=posted,
        job_locations=locations,
        qualification_text=qual_text,
        apply_url=apply_url,
    )
