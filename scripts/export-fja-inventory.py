import csv, json, os, re
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

base = Path(os.environ.get("FJA_OUT_DIR", "artifacts/fja"))
payload = json.loads((base / "fja-inventory.json").read_text(encoding="utf-8"))
rows = payload.get("results", [])
base.mkdir(parents=True, exist_ok=True)
wb = Workbook()

def setup_sheet(ws, headers, widths=None):
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="1F4E78")
        cell.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    if widths:
        for i, width in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = width

def add_rows(ws, data_rows):
    for row in data_rows:
        ws.append([("" if v is None else v) for v in row])
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)

def as_text(value):
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)

# A — Recruitment Inventory: one row per FJA article, not one row per post.
ws = wb.active
ws.title = "Recruitment Inventory"
headers = ["External ID","FJA Article Title","Organization","FJA Source URL","Page Classification","FJA Published Date","Application Start (summary only)","Application End (summary only)","Advertisement Number","Qualification (summary only)","Recruitment Vacancy Total (source-stated only)","Source Status","Extraction Status","Official Notification URL(s)","Application URL(s)","Canonical Ingestion Gate","Gate Reason","Run ID","Content Hash"]
setup_sheet(ws, headers, [16,46,30,62,22,18,22,22,26,42,24,16,18,58,58,30,44,32,66])
for r in rows:
    d = r.get("details") or {}
    links = d.get("officialLinks") or []
    notification_urls = [x.get("url","") for x in links if re.search(r"official|notification|advertisement|pdf", x.get("label",""), re.I)]
    application_urls = [x.get("url","") for x in links if re.search(r"apply|registration|application", x.get("label",""), re.I)]
    gate = "WAITING_FOR_OFFICIAL_NOTIFICATION" if not notification_urls else "READY_FOR_MANUAL_VERIFICATION"
    reason = "No likely official notification link identified by label; manual source search required" if not notification_urls else "Candidate link detected; official source and facts still require manual verification"
    ws.append([r.get("externalId"),r.get("title"),r.get("organizationName"),r.get("sourceUrl"),r.get("listingCategory"),r.get("publishedDate"),r.get("applicationStartDate"),r.get("applicationEndDate"),r.get("advertisementNumber"),r.get("qualification"),r.get("vacancyCount"),r.get("sourceStatus"),r.get("detailStatus"),"; ".join(notification_urls),"; ".join(application_urls),gate,reason,payload.get("runId"),r.get("contentHash")])
add_rows(ws, [])

# B — Post Details: deliberately does not invent a post breakdown.
ws = wb.create_sheet("Post Details")
setup_sheet(ws, ["Parent External ID","Post Key","Raw Post Name / Candidate","Vacancies","Qualification / Eligibility Raw Text","Experience Raw Text","Age Raw Text","Salary Raw Text","Location Raw Text","Source URL","Evidence / Table Fields","Post Structure Status"], [18,24,48,16,54,38,30,32,28,62,80,30])
for r in rows:
    d = r.get("details") or {}
    table_fields = d.get("tableFields") or {}
    post_names = d.get("postNames")
    candidates = []
    if isinstance(post_names, str) and post_names.strip():
        # Split only on explicit separators that commonly indicate separate lines/items.
        candidates = [p.strip() for p in re.split(r"\n|\s*\|\s*|\s*;\s*", post_names) if p.strip()]
    if not candidates:
        candidates = [""]
    for idx, name in enumerate(candidates, 1):
        status = "CANDIDATE_NEEDS_REVIEW" if name else "POST_BREAKDOWN_NOT_EXTRACTED"
        ws.append([r.get("externalId"),f"{r.get('externalId')}-P{idx:02d}" if name else "",name,"",
          as_text(r.get("qualification")), "", as_text(d.get("ageLimit")), as_text(d.get("salary")),
          as_text(d.get("location")),r.get("sourceUrl"),as_text(table_fields),status])
add_rows(ws, [])

# C — Dates & Milestones: preserves date-bearing source rows as separate events.
ws = wb.create_sheet("Dates & Milestones")
setup_sheet(ws, ["Parent External ID","Post Key (if explicit)","Event Type (normalized guess)","Date Value(s) (parsed where recognized)","Raw Date / Row Wording","Source URL","Evidence Status"], [18,22,32,34,72,62,24])
date_label = re.compile(r"date|deadline|last date|closing|start|exam|interview|correction|age.*reckon|notification", re.I)
date_pattern = re.compile(r"\b(?:\d{1,2}[ ./-](?:\d{1,2}|[A-Za-z]{3,9})[ ./,-]\d{4}|\d{4}-\d{2}-\d{2})\b")
for r in rows:
    d = r.get("details") or {}
    table_fields = d.get("tableFields") or {}
    emitted = False
    for label, value in table_fields.items():
        if date_label.search(str(label)):
            dates = "; ".join(date_pattern.findall(str(value)))
            event = "APPLICATION_DEADLINE" if re.search(r"last date|closing|deadline", str(label), re.I) else "DATE_EVENT_NEEDS_REVIEW"
            ws.append([r.get("externalId"),"",event,dates,str(label)+": "+str(value),r.get("sourceUrl"),"SOURCE_REPORTED_UNVERIFIED"])
            emitted = True
    if not emitted:
        ws.append([r.get("externalId"),"","NO_DATE_ROW_DETECTED","","No date-bearing table row detected; review full source text",r.get("sourceUrl"),"NEEDS_REVIEW"])
add_rows(ws, [])

# D — Application & Selection: rows remain source-reported and are not treated as verified.
ws = wb.create_sheet("Application & Selection")
setup_sheet(ws, ["Parent External ID","Post Key (if explicit)","Record Type","Raw Field / Heading","Raw Value","Source URL","Verification Status"], [18,22,28,40,90,62,26])
rule_label = re.compile(r"fee|selection|application|apply|document|eligib|experience|relaxation|reservation|instruction|how to|mode of", re.I)
for r in rows:
    d = r.get("details") or {}
    table_fields = d.get("tableFields") or {}
    emitted = False
    for label, value in table_fields.items():
        if rule_label.search(str(label)):
            kind = "FEE" if re.search(r"fee", str(label), re.I) else ("SELECTION_STAGE" if re.search(r"selection", str(label), re.I) else "APPLICATION_OR_ELIGIBILITY_RULE")
            ws.append([r.get("externalId"),"",kind,str(label),str(value),r.get("sourceUrl"),"SOURCE_REPORTED_UNVERIFIED"])
            emitted = True
    for key in ("applicationFee","selectionProcess"):
        value = d.get(key)
        if value and not any(str(value) == str(x[4]) for x in ws.iter_rows(min_row=2, values_only=True)):
            ws.append([r.get("externalId"),"",key.upper(),key,str(value),r.get("sourceUrl"),"SOURCE_REPORTED_UNVERIFIED"])
            emitted = True
    if not emitted:
        ws.append([r.get("externalId"),"","NO_RULE_ROW_DETECTED","","Manual review required; no matching table row detected",r.get("sourceUrl"),"NEEDS_REVIEW"])
add_rows(ws, [])

# E — Source Content & Field Evidence: table rows + the available full normalized text.
ws = wb.create_sheet("Source Content & Field Evidence")
setup_sheet(ws, ["Parent External ID","Post Key (if explicit)","Field Path / Content Type","Extracted Value","Source URL","Source Section","Evidence Text","Extraction Method","Extraction Status","Official Verification State","Review Note"], [18,22,38,76,62,34,90,26,22,28,56])
for r in rows:
    d = r.get("details") or {}
    for label, value in (d.get("tableFields") or {}).items():
        ws.append([r.get("externalId"),"",f"tableFields.{label}",str(value),r.get("sourceUrl"),"HTML table row",f"{label}: {value}","HTML table extraction",r.get("detailStatus"),"NOT_VERIFIED","Preserved from FJA; confirm against official notification"])
    raw_text = r.get("rawText") or ""
    ws.append([r.get("externalId"),"","rawText.full_normalized_body",raw_text[:32000],r.get("sourceUrl"),"Full page body text","Full text is preserved in fja-inventory.json; Excel cell is capped at 32,000 characters","DOM body text extraction",r.get("detailStatus"),"NOT_VERIFIED","Excel cell length limit; use JSON artifact for full text"])
    for link in d.get("officialLinks") or []:
        ws.append([r.get("externalId"),"", "link",link.get("url",""),r.get("sourceUrl"),"Anchor element",link.get("label",""),"HTML link extraction",r.get("detailStatus"),"NOT_VERIFIED","Link label is a discovery hint, not proof that the URL is official"])
add_rows(ws, [])

# F — Run Summary: report coverage and limitations, not only successful extraction counts.
ws = wb.create_sheet("Run Summary")
setup_sheet(ws, ["Metric","Value","Interpretation / Limitation"], [38,52,100])
metrics = [
 ("Run ID",payload.get("runId"),"Identifier for this crawl run"),
 ("Started at",payload.get("startedAt"),"ISO timestamp"),
 ("Finished at",payload.get("finishedAt"),"ISO timestamp"),
 ("Listing pages visited",payload.get("listingPagesVisited"),"In URL-scoped pilot mode this is zero by design"),
 ("Unvisited listing queue remaining",payload.get("listingPageQueueRemaining"),"Relevant only to discovery crawl mode"),
 ("Sitemap article URLs",payload.get("sitemapArticleUrls"),"Sitemap discovery supplement; not proof of exhaustive coverage"),
 ("Discovered article URLs",payload.get("discoveredArticleUrls"),"In pilot mode this should equal supplied valid unique article URLs"),
 ("Recruitment rows exported",len(rows),"One row per article; not the number of posts"),
 ("Fully extracted",sum(r.get("detailStatus")=="EXTRACTED" for r in rows),"Process classification only; does not mean factually verified"),
 ("Partial",sum(r.get("detailStatus")=="PARTIAL" for r in rows),"Requires review"),
 ("Failed detail fetches",sum(r.get("detailStatus")=="FAILED" for r in rows),"See failedDetailUrls in JSON"),
 ("Non-recruitment pages skipped",payload.get("nonRecruitmentPagesSkipped"),"Skipped page count from crawler classifier"),
 ("Failed detail URL list",as_text(payload.get("failedDetailUrls") or []),"Review each failure; run is not clean if non-empty"),
 ("Articles with no detected official notification link",sum(1 for r in rows if not any(re.search(r"official|notification|advertisement|pdf",x.get("label",""),re.I) for x in ((r.get("details") or {}).get("officialLinks") or []))),"Must remain blocked from canonical ingestion pending manual source discovery"),
 ("Posts structurally resolved",sum(1 for r in rows if (r.get("details") or {}).get("postNames")),"Candidate only; post-level facts still require verification"),
 ("Workbook limitation","Not yet a publication-ready normalized dataset","Post decomposition and dates are evidence candidates; manual review is mandatory"),
 ("Raw capture limitation","JSON artifact preserves the full normalized body text; no immutable original HTML file is emitted yet","Before scaling, decide whether to persist raw HTML separately with content hash and retention policy"),
 ("Source authority","FJA reported, not officially verified","Official notification and application links must be checked separately"),
 ("Run outcome","REVIEW_REQUIRED","Do not scale until the three sample records pass manual field-by-field review"),
]
add_rows(ws, [[a,b,c] for a,b,c in metrics])

xlsx = base / "FJA_Jobs_Inventory.xlsx"
wb.save(xlsx)
headers = ["External ID","FJA Article Title","Organization","FJA Source URL","Page Classification","FJA Published Date","Application Start (summary only)","Application End (summary only)","Advertisement Number","Qualification (summary only)","Recruitment Vacancy Total (source-stated only)","Source Status","Extraction Status","Official Notification URL(s)","Application URL(s)","Canonical Ingestion Gate","Gate Reason","Run ID","Content Hash"]
with (base / "FJA_Jobs_Inventory.csv").open("w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    for r in rows:
        d = r.get("details") or {}
        links = d.get("officialLinks") or []
        notification_urls = [x.get("url","") for x in links if re.search(r"official|notification|advertisement|pdf", x.get("label",""), re.I)]
        application_urls = [x.get("url","") for x in links if re.search(r"apply|registration|application", x.get("label",""), re.I)]
        gate = "WAITING_FOR_OFFICIAL_NOTIFICATION" if not notification_urls else "READY_FOR_MANUAL_VERIFICATION"
        reason = "No likely official notification link identified by label; manual source search required" if not notification_urls else "Candidate link detected; official source and facts still require manual verification"
        writer.writerow([r.get("externalId"),r.get("title"),r.get("organizationName"),r.get("sourceUrl"),r.get("listingCategory"),r.get("publishedDate"),r.get("applicationStartDate"),r.get("applicationEndDate"),r.get("advertisementNumber"),r.get("qualification"),r.get("vacancyCount"),r.get("sourceStatus"),r.get("detailStatus"),"; ".join(notification_urls),"; ".join(application_urls),gate,reason,payload.get("runId"),r.get("contentHash")])
print(f"Workbook generated: {xlsx} ({len(rows)} recruitment article rows; six sheets)")
