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
MAX_CELL_CHARS = 30000  # Keep safely below Excel's 32,767-character cell limit.

payload = json.loads(PAYLOAD_PATH.read_text(encoding="utf-8"))
items = payload.get("results", [])
BASE.mkdir(parents=True, exist_ok=True)

def json_text(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str) if value is not None else ""

def text(value):
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json_text(value)
    return str(value)

def normalized_key(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()

def first_field(fields, patterns):
    for key, value in (fields or {}).items():
        if value is not None and str(value).strip() and any(re.search(p, str(key), re.I) for p in patterns):
            return str(value).strip()
    return ""

def split_chunks(value):
    value = text(value)
    if not value:
        return []
    return [value[i:i + MAX_CELL_CHARS] for i in range(0, len(value), MAX_CELL_CHARS)]

def split_post_names(value):
    if not value or not str(value).strip():
        return []
    # Only split on strong separators; preserve the original phrase in the parent source payload.
    candidates = [part.strip(" \t\r\n-•") for part in re.split(r"\r?\n|\s*\|\s*|\s*;\s*", str(value)) if part.strip(" \t\r\n-•")]
    return candidates or [str(value).strip()]

def setup_sheet(ws, headers, widths=None):
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="1F4E78")
        cell.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}1"
    if widths:
        for i, width in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = width
    else:
        for i in range(1, len(headers) + 1):
            ws.column_dimensions[get_column_letter(i)].width = 24

def add_data_rows(ws, rows):
    for row in rows:
        ws.append(["" if value is None else value for value in row])
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)

def chunk_headers(prefix, max_count):
    return [f"{prefix}_part_{i:02d}" for i in range(1, max_count + 1)]

def chunks_to_columns(value, max_count):
    chunks = split_chunks(value)
    return chunks + [""] * (max_count - len(chunks))

def source_ref(item):
    details = item.get("details") or {}
    capture = details.get("sourceCapture") or {}
    return capture.get("artifactPath") or f"source-observation:{item.get('externalId','')}:{item.get('contentHash','')}"

def likely_links(item):
    details = item.get("details") or {}
    links = details.get("allLinks") or details.get("officialLinks") or []
    notification = []
    application = []
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

def candidate_post_fields(item, single_candidate):
    details = item.get("details") or {}
    fields = details.get("tableFields") or {}
    # Generic article-level fields are assigned to a post only when there is one unambiguous candidate.
    if not single_candidate:
        return {
            "qualification": "", "experience": "", "age": "", "salary": "",
            "location": "", "vacancy": "", "pay_level": "", "tenure": "",
            "employment_type": "", "duties": "",
            "shared_fields": fields,
            "scope_note": "MULTI_POST_SCOPE_UNRESOLVED: generic article fields were not copied onto individual posts",
        }
    return {
        "qualification": first_field(fields, [r"qualification", r"eligibility", r"educational"]),
        "experience": first_field(fields, [r"experience", r"work experience"]),
        "age": details.get("ageLimit") or first_field(fields, [r"age limit", r"age criteria"]),
        "salary": details.get("salary") or first_field(fields, [r"salary", r"pay scale", r"pay level", r"remuneration", r"emolument"]),
        "location": details.get("location") or first_field(fields, [r"job location", r"place of posting", r"location"]),
        "vacancy": first_field(fields, [r"vacanc", r"number of post", r"no of post"]),
        "pay_level": first_field(fields, [r"pay level", r"pay scale", r"grade pay"]),
        "tenure": first_field(fields, [r"duration", r"tenure", r"contract period"]),
        "employment_type": first_field(fields, [r"employment type", r"nature of appointment", r"job type"]),
        "duties": first_field(fields, [r"job profile", r"roles and responsibilities", r"duties"]),
        "shared_fields": {},
        "scope_note": "Single candidate; generic article fields mapped as candidates only and still require official verification",
    }

recruitment_headers = [
    "recruitment_key", "import_action", "source_name_internal", "source_external_id_internal",
    "source_article_title_raw", "source_article_url_internal", "source_published_date_raw",
    "organization_name_raw", "organization_canonical_match_id",
    "official_notification_number_raw", "official_notification_url_candidate",
    "official_application_url_candidate", "recruitment_vacancy_total_raw",
    "recruitment_vacancy_total_normalized_candidate", "application_start_date_raw",
    "application_start_date_normalized_candidate", "application_deadline_date_raw",
    "application_deadline_date_normalized_candidate", "application_method_raw",
    "application_url_raw", "recruitment_location_raw", "recruitment_salary_summary_raw",
    "qualification_summary_raw", "fee_rules_raw_json", "selection_process_raw_json",
    "milestones_raw_json", "document_requirements_and_instructions_raw",
    "source_status_reported", "extraction_status", "official_verification_status",
    "canonical_promotion_gate", "promotion_gate_reason", "source_capture_ref_internal",
    "source_content_hash", "source_html_sha256", "run_id", "table_fields_json",
    "all_tables_json", "all_links_json", "headings_json", "lists_json",
    "unmapped_fields_json", "other_info_raw_part_01"
]
post_headers = [
    "post_key", "recruitment_key", "source_external_id_internal", "source_post_name_raw",
    "post_name_normalized_candidate", "source_post_code_raw", "vacancy_count_raw",
    "vacancy_count_normalized_candidate", "qualification_raw", "experience_raw",
    "minimum_age_years_candidate", "maximum_age_years_candidate", "age_reference_date_raw",
    "age_relaxation_rules_raw", "salary_min_amount_candidate", "salary_max_amount_candidate",
    "salary_currency_candidate", "salary_period_candidate", "salary_raw", "pay_level_raw",
    "employment_type_raw", "tenure_raw", "location_raw", "duties_responsibilities_raw",
    "eligibility_conditions_raw", "post_milestones_json", "post_application_selection_json",
    "shared_source_fields_unresolved_json", "post_other_info_raw_part_01",
    "source_capture_ref_internal", "source_content_hash", "run_id",
    "post_structure_status", "extraction_status", "official_verification_status",
    "canonical_mapping_status", "review_note"
]

recruitment_rows = []
post_rows = []
recruitment_body_chunks = []
recruitment_details_chunks = []
recruitment_other_chunks = []
post_other_chunks = []

for item in items:
    details = item.get("details") or {}
    fields = details.get("tableFields") or {}
    tables = details.get("tables") or []
    all_links = details.get("allLinks") or details.get("officialLinks") or []
    headings = details.get("headings") or []
    lists = details.get("lists") or []
    notification_links, application_links = likely_links(item)
    body = item.get("rawText") or ""
    details_json = json_text(details)

    mapped_labels = {
        "recruiting body", "organization", "department", "advertisement number",
        "notification number", "notification date", "post date", "published",
        "updated date", "application start date", "start date", "starting date",
        "last date", "closing date", "application end", "total vacancy",
        "total post", "number of vacancy", "no of post", "qualification",
        "eligibility", "educational qualification", "application fee",
        "exam fee", "selection process", "selection procedure", "salary",
        "pay scale", "pay level", "remuneration", "job location",
        "place of posting", "location", "name of post", "post name",
    }
    unmapped_fields = {
        key: value for key, value in fields.items()
        if not any(normalized_key(key) == normalized_key(label) or
                   normalized_key(label) in normalized_key(key)
                   for label in mapped_labels)
    }
    other_payload = {
        "unmapped_table_fields": unmapped_fields,
        "other_details_fields": {
            key: value for key, value in details.items()
            if key not in {"tableFields", "tables", "allLinks", "officialLinks", "headings", "lists", "sourceCapture"}
        },
        "source_headings": headings,
        "source_lists": lists,
        "source_tables": tables,
        "all_links": all_links,
        "preservation_note": "Raw normalized body text and full details JSON are also retained in separate columns/artifacts; this payload is not AI-rewritten.",
    }
    other_json = json_text(other_payload)
    body_parts = split_chunks(body)
    detail_parts = split_chunks(details_json)
    other_parts = split_chunks(other_json)
    recruitment_body_chunks.append(body_parts)
    recruitment_details_chunks.append(detail_parts)
    recruitment_other_chunks.append(other_parts)

    recruitment_key = f"FJA-{item.get('externalId','')}"
    end_raw = first_field(fields, [r"last date", r"closing date", r"application end", r"last date to apply"])
    start_raw = first_field(fields, [r"application start", r"start date", r"starting date"])
    fee_fields = {k: v for k, v in fields.items() if re.search(r"fee", k, re.I)}
    selection_fields = {k: v for k, v in fields.items() if re.search(r"selection", k, re.I)}
    document_fields = {k: v for k, v in fields.items() if re.search(r"document|instruction|how to apply|application process", k, re.I)}
    milestone_fields = {k: v for k, v in fields.items() if re.search(r"date|deadline|exam|interview|correction|age.*reckon|notification", k, re.I)}
    notification_url = "; ".join(link["url"] for link in notification_links)
    application_url = "; ".join(link["url"] for link in application_links)
    gate = "BLOCKED_OFFICIAL_NOTIFICATION_REQUIRED" if not notification_links else "BLOCKED_PENDING_OFFICIAL_VERIFICATION"
    gate_reason = (
        "No likely notification link detected; preserve the inventory record and search official sources later"
        if not notification_links else
        "Link is a discovery candidate only; verify issuing authority and all material facts before canonical promotion"
    )
    source_capture = details.get("sourceCapture") or {}
    recruitment_base = [
        recruitment_key, "REVIEW_ONLY", "freejobalert", item.get("externalId"),
        item.get("title"), item.get("sourceUrl"), item.get("publishedDate"),
        item.get("organizationName"), "", item.get("advertisementNumber"),
        notification_url, application_url, fields.get("total vacancies") or fields.get("total vacancy") or "",
        item.get("vacancyCount"), first_field(fields, [r"application start", r"start date", r"starting date"]),
        item.get("applicationStartDate"), end_raw, item.get("applicationEndDate"),
        first_field(fields, [r"application mode", r"how to apply", r"application process", r"apply mode"]),
        application_url, details.get("location") or first_field(fields, [r"job location", r"place of posting", r"location"]),
        details.get("salary") or first_field(fields, [r"salary", r"pay scale", r"pay level", r"remuneration"]),
        item.get("qualification") or first_field(fields, [r"qualification", r"eligibility", r"educational"]),
        json_text(fee_fields), json_text(selection_fields), json_text(milestone_fields),
        json_text(document_fields), item.get("sourceStatus"), item.get("detailStatus"),
        "PENDING_OFFICIAL_REVIEW", gate, gate_reason, source_ref(item), item.get("contentHash"),
        source_capture.get("htmlSha256", ""), payload.get("runId"),
        json_text(fields), json_text(tables), json_text(all_links), json_text(headings),
        json_text(lists), json_text(unmapped_fields),  # first other-info chunk appended below
    ]
    recruitment_rows.append(recruitment_base)

    candidates = split_post_names(details.get("postNames"))
    if not candidates:
        candidates = [""]
    for index, candidate in enumerate(candidates, 1):
        one_candidate = len(candidates) == 1 and bool(candidate)
        post_fields = candidate_post_fields(item, one_candidate)
        post_key = f"{recruitment_key}-P{index:02d}" if candidate else ""
        vacancy_raw = post_fields["vacancy"]
        post_other = {
            "candidate_raw_name": candidate,
            "source_post_names_field_raw": details.get("postNames") or "",
            "unmapped_or_unassigned_source_fields": post_fields["shared_fields"],
            "source_scope_note": post_fields["scope_note"],
            "source_detail_keys": sorted(details.keys()),
            "preservation_note": "Do not AI-rewrite during extraction. Verify and enrich later; source capture is retained on parent recruitment.",
        }
        post_other_chunks.append(split_chunks(json_text(post_other)))
        post_rows.append([
            post_key, recruitment_key, item.get("externalId"), candidate, "", "",
            vacancy_raw, "", post_fields["qualification"], post_fields["experience"],
            "", "", "", "", "", "", "", "", post_fields["salary"], post_fields["pay_level"],
            post_fields["employment_type"], post_fields["tenure"], post_fields["location"],
            post_fields["duties"], post_fields["qualification"], "[]", "[]",
            json_text(post_fields["shared_fields"]),  # post other-info chunk appended below
            source_ref(item), item.get("contentHash"), payload.get("runId"),
            "CANDIDATE_NEEDS_REVIEW" if candidate else "POST_DECOMPOSITION_NOT_EXTRACTED",
            item.get("detailStatus"), "PENDING_OFFICIAL_REVIEW",
            "NOT_MAPPED_TO_CANONICAL", post_fields["scope_note"],
        ])

max_body = max((len(x) for x in recruitment_body_chunks), default=0)
max_details = max((len(x) for x in recruitment_details_chunks), default=0)
max_recruitment_other = max((len(x) for x in recruitment_other_chunks), default=0)
max_post_other = max((len(x) for x in post_other_chunks), default=0)

recruitment_headers += chunk_headers("source_body_text", max_body)
recruitment_headers += chunk_headers("source_details_json", max_details)
recruitment_headers += chunk_headers("other_info_raw", max_recruitment_other)
post_headers += chunk_headers("post_other_info_raw", max_post_other)

# Append the first other-info chunk placeholder to each fixed-width base row, then append all chunks.
for index, row in enumerate(recruitment_rows):
    row.extend(chunks_to_columns("", 1))  # fixed placeholder column; actual chunks are in the named chunk columns below
    row.extend(chunks_to_columns(" ".join([]), 0))
    # source body/details/other info are separate dynamic chunk columns.
    row.extend(chunks_to_columns("".join([]), 0))

# Rebuild recruitment row data cleanly: fixed columns end at other_info_raw_part_01.
# The first other_info field is intentionally overwritten with chunk 1 below.
for index, row in enumerate(recruitment_rows):
    row[-1] = recruitment_other_chunks[index][0] if recruitment_other_chunks[index] else ""
    row.extend(chunks_to_columns("", max_body))
    row.extend(chunks_to_columns("", max_details))
    # first other_info chunk already in fixed base row; append remaining chunks only.
    row.extend(chunks_to_columns("", max_recruitment_other - 1))
    body_values = chunks_to_columns("".join([]), 0)
    for offset, value in enumerate(chunks_to_columns(items[index].get("rawText") or "", max_body)):
        row[len(recruitment_base) + offset] = value
    detail_values = chunks_to_columns(json_text(items[index].get("details") or {}), max_details)
    detail_start = len(recruitment_base) + max_body
    for offset, value in enumerate(detail_values):
        row[detail_start + offset] = value
    other_start = len(recruitment_base) + max_body + max_details
    other_values = chunks_to_columns(json_text({
        "unmapped_table_fields": {
            key: value for key, value in ((items[index].get("details") or {}).get("tableFields") or {}).items()
            if not re.search(r"recruiting body|organization|department|advertisement|notification|application start|start date|last date|closing date|vacanc|qualification|eligibility|fee|selection|salary|pay scale|pay level|remuneration|location|name of post|post name", key, re.I)
        },
        "other_details_fields": {
            key: value for key, value in ((items[index].get("details") or {})).items()
            if key not in {"tableFields", "tables", "allLinks", "officialLinks", "headings", "lists", "sourceCapture"}
        },
        "headings": (items[index].get("details") or {}).get("headings") or [],
        "lists": (items[index].get("details") or {}).get("lists") or [],
        "tables": (items[index].get("details") or {}).get("tables") or [],
        "all_links": (items[index].get("details") or {}).get("allLinks") or (items[index].get("details") or {}).get("officialLinks") or [],
    }), max_recruitment_other)
    for offset, value in enumerate(other_values):
        row[other_start + offset] = value

for index, row in enumerate(post_rows):
    row.extend(chunks_to_columns("", max_post_other))
    post_start = len(post_headers) - max_post_other
    for offset, value in enumerate(post_other_chunks[index] + [""] * (max_post_other - len(post_other_chunks[index]))):
        row[post_start + offset] = value

wb = Workbook()
recruitments_ws = wb.active
recruitments_ws.title = "Recruitments"
setup_sheet(recruitments_ws, recruitment_headers)
add_data_rows(recruitments_ws, recruitment_rows)

posts_ws = wb.create_sheet("Posts")
setup_sheet(posts_ws, post_headers)
add_data_rows(posts_ws, post_rows)

# Helpful workbook-level metadata without introducing a third worksheet.
wb.properties.title = "JobOye Recruitment and Post Source Inventory"
wb.properties.subject = "Two-table source extraction inventory; not verified or approved for canonical publication"
wb.properties.description = "Preserves source-reported fields and raw source content. Official verification and AI rewriting are separate later stages."

xlsx_path = BASE / "FJA_Jobs_Inventory.xlsx"
wb.save(xlsx_path)

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
    "unresolvedPostRows": sum(1 for row in post_rows if row[0] == ""),
    "workbookSheets": ["Recruitments", "Posts"],
    "rawBodyTextChunks": max_body,
    "sourceDetailsJsonChunks": max_details,
    "recruitmentOtherInfoChunks": max_recruitment_other,
    "postOtherInfoChunks": max_post_other,
    "sourceReportedOnly": True,
    "officialVerificationComplete": False,
    "aiRewritingPerformed": False,
    "knownLimitations": [
        "Post decomposition is candidate-only and must be reviewed.",
        "Generic fields are not copied to each post when the article contains multiple post candidates.",
        "Official/apply links are discovery candidates based on labels and require manual validation.",
        "This workbook does not authorize canonical JobOye ingestion."
    ]
}
(BASE / "export-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Workbook generated: {xlsx_path} ({len(recruitment_rows)} recruitment rows, {len(post_rows)} post candidate rows; exactly two sheets)")
