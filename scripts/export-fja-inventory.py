import csv
import json
import os
import re
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

BASE = Path(os.environ.get("FJA_OUT_DIR", "artifacts/fja"))
PAYLOAD_PATH = BASE / "fja-inventory.json"
MAX_CELL_CHARS = 30000
payload = json.loads(PAYLOAD_PATH.read_text(encoding="utf-8"))
items = payload.get("results", [])
BASE.mkdir(parents=True, exist_ok=True)

def as_json(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str) if value is not None else ""

def as_text(value):
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return as_json(value)
    return str(value)

def chunks(value):
    value = as_text(value)
    return [value[i:i + MAX_CELL_CHARS] for i in range(0, len(value), MAX_CELL_CHARS)] if value else [""]

def chunk_headers(prefix, count):
    return [f"{prefix}_part_{i:02d}" for i in range(1, count + 1)]

def padded_chunks(value, count):
    parts = chunks(value) if value else []
    return (parts + [""] * count)[:count]

def first_field(fields, patterns):
    for key, value in (fields or {}).items():
        if value is not None and str(value).strip() and any(re.search(pattern, str(key), re.I) for pattern in patterns):
            return str(value).strip()
    return ""

def setup_sheet(ws, headers):
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="1F4E78")
        cell.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}1"
    for index, header in enumerate(headers, 1):
        ws.column_dimensions[get_column_letter(index)].width = min(60, max(18, len(header) + 2))

def append_rows(ws, rows):
    for row in rows:
        ws.append(["" if value is None else value for value in row])
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")

def extract_links(details):
    # Prefer a full-link capture when the crawler provides it; retain legacy officialLinks otherwise.
    return details.get("allLinks") or details.get("officialLinks") or []

def classify_link_candidates(links):
    notification, application = [], []
    for link in links:
        label = str(link.get("label") or "")
        url = str(link.get("url") or "")
        if not url:
            continue
        if re.search(r"notification|advertisement|recruitment notice|detailed notice|official pdf", label, re.I):
            notification.append({"label": label, "url": url})
        if re.search(r"apply|application|registration|online form", label, re.I):
            application.append({"label": label, "url": url})
    return notification, application

def split_candidates(value):
    if not value or not str(value).strip():
        return []
    # Heuristic candidates only; preserve the original complete postNames value elsewhere.
    return [part.strip(" \t\r\n-•") for part in re.split(r"\r?\n|\s*\|\s*|\s*;\s*", str(value)) if part.strip(" \t\r\n-•")]

def other_payload(item, details, fields, links):
    known_detail_keys = {
        "tableFields", "tables", "allLinks", "officialLinks", "headings", "lists",
        "sourceCapture", "postNames", "ageLimit", "applicationFee", "selectionProcess",
        "salary", "location", "rawText"
    }
    return {
        "unmapped_table_fields": {
            key: value for key, value in fields.items()
            if not re.search(
                r"organization|recruiting body|department|advertisement|notification|published|updated|application start|start date|starting date|last date|closing date|application end|total vacan|total post|number of vacan|no.? of post|qualification|eligibility|educational|application fee|exam fee|selection process|selection procedure|salary|pay scale|pay level|remuneration|job location|place of posting|location|name of post|post name",
                str(key), re.I
            )
        },
        "other_detail_fields": {key: value for key, value in details.items() if key not in known_detail_keys},
        "all_headings": details.get("headings") or [],
        "all_lists": details.get("lists") or [],
        "all_tables": details.get("tables") or [],
        "all_links": links,
        "crawler_raw_text_copy": details.get("rawText") or item.get("rawText") or "",
        "preservation_policy": "Raw source evidence only. No AI rewrite or official verification is performed by this exporter."
    }

recruitment_fixed_headers = [
    "recruitment_key", "import_action", "source_name_internal", "source_external_id_internal",
    "source_article_title_raw", "source_article_url_internal", "source_published_date_raw",
    "organization_name_raw", "organization_canonical_match_id", "official_notification_number_raw",
    "official_notification_url_candidate", "official_application_url_candidate",
    "recruitment_vacancy_total_raw", "recruitment_vacancy_total_normalized_candidate",
    "application_start_date_raw", "application_start_date_normalized_candidate",
    "application_deadline_date_raw", "application_deadline_date_normalized_candidate",
    "application_method_raw", "application_url_raw", "recruitment_location_raw",
    "recruitment_salary_summary_raw", "qualification_summary_raw", "fee_rules_raw_json",
    "selection_process_raw_json", "milestones_raw_json", "document_requirements_and_instructions_raw",
    "source_status_reported", "extraction_status", "official_verification_status",
    "canonical_promotion_gate", "promotion_gate_reason", "source_capture_ref_internal",
    "source_content_hash", "source_html_sha256", "run_id", "table_fields_json",
    "all_tables_json", "all_links_json", "headings_json", "lists_json", "unmapped_fields_json"
]
post_fixed_headers = [
    "post_key", "recruitment_key", "source_external_id_internal", "source_post_name_raw",
    "post_name_normalized_candidate", "source_post_code_raw", "vacancy_count_raw",
    "vacancy_count_normalized_candidate", "qualification_raw", "experience_raw",
    "minimum_age_years_candidate", "maximum_age_years_candidate", "age_reference_date_raw",
    "age_relaxation_rules_raw", "salary_min_amount_candidate", "salary_max_amount_candidate",
    "salary_currency_candidate", "salary_period_candidate", "salary_raw", "pay_level_raw",
    "employment_type_raw", "tenure_raw", "location_raw", "duties_responsibilities_raw",
    "eligibility_conditions_raw", "post_milestones_json", "post_application_selection_json",
    "shared_source_fields_unresolved_json", "source_capture_ref_internal", "source_content_hash",
    "run_id", "post_structure_status", "extraction_status", "official_verification_status",
    "canonical_mapping_status", "review_note"
]

recruitment_base_rows = []
post_base_rows = []
recruitment_body_values = []
recruitment_details_values = []
recruitment_other_values = []
post_other_values = []

for item in items:
    details = item.get("details") or {}
    fields = details.get("tableFields") or {}
    links = extract_links(details)
    notification_links, application_links = classify_link_candidates(links)
    body = item.get("rawText") or details.get("rawText") or ""
    details_json = as_json(details)
    other_json = as_json(other_payload(item, details, fields, links))
    source_capture = details.get("sourceCapture") or {}
    external_id = str(item.get("externalId") or "")
    recruitment_key = f"FJA-{external_id}"
    start_raw = first_field(fields, [r"application start", r"start date", r"starting date"])
    end_raw = first_field(fields, [r"last date", r"closing date", r"application end", r"last date to apply"])
    fees = {key: value for key, value in fields.items() if re.search(r"fee", str(key), re.I)}
    selection = {key: value for key, value in fields.items() if re.search(r"selection", str(key), re.I)}
    milestones = {key: value for key, value in fields.items() if re.search(r"date|deadline|exam|interview|correction|age.*reckon|notification", str(key), re.I)}
    documents = {key: value for key, value in fields.items() if re.search(r"document|instruction|how to apply|application process", str(key), re.I)}
    notification_url = "; ".join(link["url"] for link in notification_links)
    application_url = "; ".join(link["url"] for link in application_links)
    gate = "BLOCKED_OFFICIAL_NOTIFICATION_REQUIRED" if not notification_links else "BLOCKED_PENDING_OFFICIAL_VERIFICATION"
    gate_reason = (
        "No likely notification link detected; retain inventory and find the issuing body's official notice during enrichment"
        if not notification_links else
        "Detected URL is only a candidate; validate issuing authority and facts before canonical promotion"
    )
    source_ref = source_capture.get("artifactPath") or f"source-observation:{external_id}:{item.get('contentHash','')}"
    recruitment_base = [
        recruitment_key, "REVIEW_ONLY", "freejobalert", external_id, item.get("title"),
        item.get("sourceUrl"), item.get("publishedDate"), item.get("organizationName"), "",
        item.get("advertisementNumber"), notification_url, application_url,
        first_field(fields, [r"total vacan", r"total post", r"number of vacan", r"no.? of post"]),
        item.get("vacancyCount"), start_raw, item.get("applicationStartDate"), end_raw,
        item.get("applicationEndDate"),
        first_field(fields, [r"application mode", r"how to apply", r"application process", r"apply mode"]),
        application_url,
        details.get("location") or first_field(fields, [r"job location", r"place of posting", r"location"]),
        details.get("salary") or first_field(fields, [r"salary", r"pay scale", r"pay level", r"remuneration", r"emolument"]),
        item.get("qualification") or first_field(fields, [r"qualification", r"eligibility", r"educational"]),
        as_json(fees), as_json(selection), as_json(milestones), as_json(documents),
        item.get("sourceStatus"), item.get("detailStatus"), "PENDING_OFFICIAL_REVIEW",
        gate, gate_reason, source_ref, item.get("contentHash"), source_capture.get("htmlSha256", ""),
        payload.get("runId"), as_json(fields), as_json(details.get("tables") or []), as_json(links),
        as_json(details.get("headings") or []), as_json(details.get("lists") or []),
        as_json(other_payload(item, details, fields, links).get("unmapped_table_fields"))
    ]
    recruitment_base_rows.append(recruitment_base)
    recruitment_body_values.append(chunks(body))
    recruitment_details_values.append(chunks(details_json))
    recruitment_other_values.append(chunks(other_json))

    candidates = split_candidates(details.get("postNames"))
    if not candidates:
        candidates = [""]
    one_unambiguous_post = len(candidates) == 1 and bool(candidates[0])
    for index, candidate in enumerate(candidates, 1):
        # Generic article-level facts are not assigned to individual posts for multi-post notices.
        if one_unambiguous_post:
            qualification = item.get("qualification") or first_field(fields, [r"qualification", r"eligibility", r"educational"])
            experience = first_field(fields, [r"experience", r"work experience"])
            age = details.get("ageLimit") or first_field(fields, [r"age limit", r"age criteria"])
            salary = details.get("salary") or first_field(fields, [r"salary", r"pay scale", r"pay level", r"remuneration", r"emolument"])
            location = details.get("location") or first_field(fields, [r"job location", r"place of posting", r"location"])
            pay_level = first_field(fields, [r"pay level", r"pay scale", r"grade pay"])
            tenure = first_field(fields, [r"duration", r"tenure", r"contract period"])
            employment_type = first_field(fields, [r"employment type", r"nature of appointment", r"job type"])
            duties = first_field(fields, [r"job profile", r"roles and responsibilities", r"duties"])
            unresolved_shared_fields = {}
            note = "Single candidate; generic article fields are candidates only and still require official verification."
        else:
            qualification = experience = age = salary = location = pay_level = tenure = employment_type = duties = ""
            unresolved_shared_fields = fields
            note = "MULTI_POST_SCOPE_UNRESOLVED: generic article-level facts retained in other info; not copied onto this post."
        post_other = {
            "candidate_name_raw": candidate,
            "article_post_names_field_raw": details.get("postNames") or "",
            "unmapped_and_unassigned_fields": unresolved_shared_fields,
            "all_details_keys": sorted(details.keys()),
            "raw_source_text_reference": source_ref,
            "preservation_policy": "Candidate only; do not AI-rewrite or mark verified during extraction."
        }
        post_key = f"{recruitment_key}-P{index:02d}" if candidate else ""
        post_base_rows.append([
            post_key, recruitment_key, external_id, candidate, "", "",
            first_field(fields, [r"vacanc", r"number of post", r"no.? of post"]) if one_unambiguous_post else "",
            "", qualification, experience, "", "", "", "", "", "", "", "", salary, pay_level,
            employment_type, tenure, location, duties, qualification, "[]", "[]",
            as_json(unresolved_shared_fields), source_ref, item.get("contentHash"), payload.get("runId"),
            "CANDIDATE_NEEDS_REVIEW" if candidate else "POST_DECOMPOSITION_NOT_EXTRACTED",
            item.get("detailStatus"), "PENDING_OFFICIAL_REVIEW", "NOT_MAPPED_TO_CANONICAL", note
        ])
        post_other_values.append(chunks(as_json(post_other)))

max_body = max((len(value) for value in recruitment_body_values), default=1)
max_details = max((len(value) for value in recruitment_details_values), default=1)
max_recruitment_other = max((len(value) for value in recruitment_other_values), default=1)
max_post_other = max((len(value) for value in post_other_values), default=1)

recruitment_headers = (
    recruitment_fixed_headers + chunk_headers("source_body_text", max_body)
    + chunk_headers("source_details_json", max_details)
    + chunk_headers("other_info_raw", max_recruitment_other)
)
post_headers = post_fixed_headers + chunk_headers("post_other_info_raw", max_post_other)

recruitment_rows = []
for index, base_row in enumerate(recruitment_base_rows):
    recruitment_rows.append(
        base_row
        + padded_chunks("".join(recruitment_body_values[index]), max_body)
        + padded_chunks("".join(recruitment_details_values[index]), max_details)
        + padded_chunks("".join(recruitment_other_values[index]), max_recruitment_other)
    )
post_rows = [
    base_row + padded_chunks(as_json(post_other_values[index][0]) if len(post_other_values[index]) == 1 else "".join(post_other_values[index]), max_post_other)
    for index, base_row in enumerate(post_base_rows)
]

# Ensure every output row has exactly as many cells as its header.
assert all(len(row) == len(recruitment_headers) for row in recruitment_rows), "Recruitments row/header width mismatch"
assert all(len(row) == len(post_headers) for row in post_rows), "Posts row/header width mismatch"

workbook = Workbook()
recruitments_ws = workbook.active
recruitments_ws.title = "Recruitments"
setup_sheet(recruitments_ws, recruitment_headers)
append_rows(recruitments_ws, recruitment_rows)
posts_ws = workbook.create_sheet("Posts")
setup_sheet(posts_ws, post_headers)
append_rows(posts_ws, post_rows)
workbook.properties.title = "JobOye Recruitment and Post Source Inventory"
workbook.properties.subject = "Two-table source inventory; not verified or approved for canonical publication"
workbook.properties.description = "Source-reported content preserved. Official verification and any AI rewriting are later, separate stages."
workbook.save(BASE / "FJA_Jobs_Inventory.xlsx")

def write_csv(path, headers, rows):
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
        writer.writerows(rows)

write_csv(BASE / "Recruitments.csv", recruitment_headers, recruitment_rows)
write_csv(BASE / "Posts.csv", post_headers, post_rows)

summary = {
    "runId": payload.get("runId"),
    "recruitmentRows": len(recruitment_rows),
    "postCandidateRows": len(post_rows),
    "unresolvedPostRows": sum(1 for row in post_rows if not row[0]),
    "workbookSheets": ["Recruitments", "Posts"],
    "sourceBodyTextChunkColumns": max_body,
    "sourceDetailsJsonChunkColumns": max_details,
    "recruitmentOtherInfoChunkColumns": max_recruitment_other,
    "postOtherInfoChunkColumns": max_post_other,
    "sourceReportedOnly": True,
    "officialVerificationComplete": False,
    "aiRewritingPerformed": False,
    "canonicalPromotionAuthorized": False,
    "limitations": [
        "Post decomposition is heuristic candidate data requiring review.",
        "Generic article-level facts are not copied onto each post for multi-post notices.",
        "Detected official/application URLs are candidates based on link labels, not verified URLs.",
        "The crawler must emit full links, structured table/list/heading content and immutable original HTML capture for maximum preservation."
    ]
}
(BASE / "export-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Workbook generated: {BASE / 'FJA_Jobs_Inventory.xlsx'} ({len(recruitment_rows)} recruitment rows; {len(post_rows)} post candidate rows; exactly two sheets)")
