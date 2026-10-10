import csv, json, os
from datetime import datetime
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

base = Path(os.environ.get("FJA_OUT_DIR", "artifacts/fja"))
payload = json.loads((base / "fja-inventory.json").read_text(encoding="utf-8"))
rows = payload.get("results", [])
base.mkdir(parents=True, exist_ok=True)
wb = Workbook()
ws = wb.active
ws.title = "Recruitment Inventory"
headers = ["External ID","Recruitment / Listing Title","Organization","FJA Source URL","Listing Category","Published Date","Application Start","Application End","Advertisement Number","Qualification","Total Vacancies","Source Status","Extraction Status","Last Crawl Run","Content Hash"]
ws.append(headers)
for r in rows:
    ws.append([r.get("externalId"),r.get("title"),r.get("organizationName"),r.get("sourceUrl"),r.get("listingCategory"),r.get("publishedDate"),r.get("applicationStartDate"),r.get("applicationEndDate"),r.get("advertisementNumber"),r.get("qualification"),r.get("vacancyCount"),r.get("sourceStatus"),r.get("detailStatus"),payload.get("runId"),r.get("contentHash")])
for cell in ws[1]:
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="1F4E78")
    cell.alignment = Alignment(wrap_text=True)
ws.freeze_panes = "A2"
ws.auto_filter.ref = ws.dimensions
widths = [16,45,30,58,24,16,16,16,24,42,16,16,18,32,66]
for i,width in enumerate(widths,1): ws.column_dimensions[get_column_letter(i)].width=width
details = wb.create_sheet("Detail Evidence")
details.append(["External ID","Source URL","Post Names","Age Limit","Application Fee","Selection Process","Salary / Pay","Location","Official Links","Extracted Table Fields","Raw Detail Text","Extraction Status"])
for r in rows:
    d=r.get("details") or {}
    details.append([r.get("externalId"),r.get("sourceUrl"),d.get("postNames"),d.get("ageLimit"),d.get("applicationFee"),d.get("selectionProcess"),d.get("salary"),d.get("location"),json.dumps(d.get("officialLinks",[]),ensure_ascii=False),json.dumps(d.get("tableFields",{}),ensure_ascii=False),r.get("rawText"),r.get("detailStatus")])
for cell in details[1]:
    cell.font=Font(bold=True,color="FFFFFF"); cell.fill=PatternFill("solid",fgColor="1F4E78")
details.freeze_panes="A2"; details.auto_filter.ref=details.dimensions
for i,width in enumerate([16,58,36,24,24,34,28,28,60,80,100,18],1): details.column_dimensions[get_column_letter(i)].width=width
changes = wb.create_sheet("Run Summary")
changes.append(["Metric","Value"])
for k,v in [("Run ID",payload.get("runId")),("Started at",payload.get("startedAt")),("Finished at",payload.get("finishedAt")),("Listing pages visited",payload.get("listingPagesVisited")),("Unvisited listing queue remaining",payload.get("listingPageQueueRemaining")),("Sitemap article URLs",payload.get("sitemapArticleUrls")),("Rows processed",len(rows)),("Fully extracted",sum(r.get("detailStatus")=="EXTRACTED" for r in rows)),("Partial",sum(r.get("detailStatus")=="PARTIAL" for r in rows)),("Failed detail fetches",sum(r.get("detailStatus")=="FAILED" for r in rows))]:
    changes.append([k,v])
for cell in changes[1]:
    cell.font=Font(bold=True,color="FFFFFF"); cell.fill=PatternFill("solid",fgColor="1F4E78")
changes.column_dimensions["A"].width=32; changes.column_dimensions["B"].width=50
xlsx=base/"FJA_Jobs_Inventory.xlsx"
wb.save(xlsx)
# CSV companion for quick diffing and non-Excel workflows.
with (base/"FJA_Jobs_Inventory.csv").open("w",newline="",encoding="utf-8-sig") as f:
    writer=csv.writer(f); writer.writerow(headers)
    for r in rows:
        writer.writerow([r.get("externalId"),r.get("title"),r.get("organizationName"),r.get("sourceUrl"),r.get("listingCategory"),r.get("publishedDate"),r.get("applicationStartDate"),r.get("applicationEndDate"),r.get("advertisementNumber"),r.get("qualification"),r.get("vacancyCount"),r.get("sourceStatus"),r.get("detailStatus"),payload.get("runId"),r.get("contentHash")])
print(f"Workbook generated: {xlsx} ({len(rows)} rows)")
