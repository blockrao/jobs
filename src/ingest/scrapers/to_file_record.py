"""
Converts a normalised extraction dict to the FileRecord format consumed by
src/ingest/adapters/freejobalert-file.ts (and the new multi-source-file.ts).

FileRecord shape (TypeScript):
  {
    id: string               // stable external identifier (URL path or slug)
    url: string              // canonical source URL
    listTitle?: string       // title from listing page
    title?: string           // title from detail page (preferred)
    published?: string       // ISO 8601 publication date
    fetchedAt?: string       // ISO 8601 fetch timestamp
    metaDescription?: string // raw meta description
    rows: string[][]         // key-value pairs extracted from tables
    links: [string, string][]  // [linkText, href] pairs
    source_site?: string     // source name tag e.g. "SarkariResult"
    html?: string            // optional raw article HTML for section extraction
  }

The TS file reads `rows` as a 2-column key-value bag and `links` for notification/apply links.
We translate our flat dict into that bag format.
"""

from datetime import datetime
from typing import Optional
from urllib.parse import urlparse


def url_to_id(url: str) -> str:
    """Derive a stable external ID from a URL (path component, no trailing slash)."""
    try:
        path = urlparse(url).path.rstrip("/")
        # Keep only the last two path segments to avoid overly long IDs
        parts = [p for p in path.split("/") if p]
        return "/".join(parts[-2:]) if len(parts) >= 2 else path or url
    except Exception:
        return url


def to_file_record(record: dict) -> dict:
    """
    Convert a normalised extraction dict to a FileRecord-compatible dict
    for JSONL output.

    The TypeScript freejobalert-file.ts reads:
      - rec.id → externalId
      - rec.url → sourceUrl
      - rec.title → title
      - rec.published → datePosted
      - rec.fetchedAt → observedAt
      - rec.rows → key-value bag for fields (company name, last date, vacancies, etc.)
      - rec.links → [label, url] pairs for notification/apply links
      - rec.source_site → stored in rows["Source Site"]
    """
    rows = []

    # Organization / company
    if record.get("organization"):
        rows.append(["Company Name", record["organization"]])

    # Vacancies
    if record.get("vacancies") is not None:
        rows.append(["No. of Posts", str(record["vacancies"])])

    # Dates
    if record.get("application_deadline"):
        rows.append(["Last Date to Apply", record["application_deadline"]])
    if record.get("posted_date"):
        rows.append(["Notification Date", record["posted_date"]])
    if record.get("exam_date"):
        rows.append(["Exam Date", record["exam_date"]])
    if record.get("application_start_date"):
        rows.append(["Start Date", record["application_start_date"]])

    # Salary
    if record.get("salary_note"):
        rows.append(["Pay Scale", record["salary_note"]])
    elif record.get("salary_min"):
        sal = f"₹{int(record['salary_min'])}"
        if record.get("salary_max") and record["salary_max"] != record["salary_min"]:
            sal += f" – ₹{int(record['salary_max'])}"
        rows.append(["Pay Scale", sal])

    # Location
    if record.get("job_locations"):
        rows.append(["Job Location", ", ".join(record["job_locations"])])

    # Qualification
    if record.get("qualification_text"):
        rows.append(["Qualification", record["qualification_text"]])

    if record.get("experience_text"):
        rows.append(["Experience", record["experience_text"]])

    # Source site tag (used by multi-source-file.ts to know which adapter)
    if record.get("source_site"):
        rows.append(["Source Site", record["source_site"]])

    # Employment type
    if record.get("employment_type") and record["employment_type"] != "FULL_TIME":
        rows.append(["Employment Type", record["employment_type"]])

    # Advertisement number
    if record.get("advertisement_number"):
        rows.append(["Advertisement No.", record["advertisement_number"]])

    # Links: [label, url]
    links = []
    if record.get("notification_url"):
        links.append(["Click Here for Notification", record["notification_url"]])
    if record.get("apply_url"):
        links.append(["Click Here to Apply Online", record["apply_url"]])

    # Add "Link Description" header row if we have links (FJA table format)
    if links:
        rows.append(["Link Description", "Link"])
        rows.extend(links)

    url = record["source_url"]
    return {
        "id": url_to_id(url),
        "url": url,
        "title": record.get("post") or record.get("title"),
        "listTitle": record.get("post") or record.get("title"),
        "published": record.get("posted_date"),
        "fetchedAt": record.get("extraction_timestamp") or datetime.utcnow().isoformat(),
        "metaDescription": record.get("meta_description"),
        "rows": rows,
        "links": links,
        "source_site": record.get("source_site"),
        # Include raw extra fields so the TS adapter can access them
        "_extra": {k: v for k, v in record.items() if k not in (
            "organization", "post", "title", "vacancies", "application_deadline",
            "posted_date", "salary_min", "salary_max", "salary_note", "job_locations",
            "qualification_text", "experience_text", "apply_url", "notification_url",
            "source_url", "source_site", "extraction_timestamp", "status",
            "advertisement_number", "exam_date", "application_start_date",
            "employment_type", "meta_description",
        ) if v is not None},
    }
