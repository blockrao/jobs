import hashlib
import json
import os
from pathlib import Path
from openpyxl import load_workbook

base = Path(os.environ.get("FJA_OUT_DIR", "artifacts/fja"))
payload_path = base / "fja-inventory.json"
workbook_path = base / "FJA_Jobs_Inventory.xlsx"
if not payload_path.exists():
    raise SystemExit(f"Missing crawler payload: {payload_path}")
if not workbook_path.exists():
    raise SystemExit(f"Missing workbook: {workbook_path}")

payload = json.loads(payload_path.read_text(encoding="utf-8"))
items = payload.get("results", [])
wb = load_workbook(workbook_path, read_only=True, data_only=True)
expected_sheets = ["Recruitments", "Posts"]
if wb.sheetnames != expected_sheets:
    raise SystemExit(f"Expected exactly {expected_sheets}, found {wb.sheetnames}")

recruitments = wb["Recruitments"]
posts = wb["Posts"]
recruitment_headers = [cell.value for cell in next(recruitments.iter_rows(min_row=1, max_row=1))]
post_headers = [cell.value for cell in next(posts.iter_rows(min_row=1, max_row=1))]
if len(recruitment_headers) != len(set(recruitment_headers)):
    raise SystemExit("Duplicate header in Recruitments sheet")
if len(post_headers) != len(set(post_headers)):
    raise SystemExit("Duplicate header in Posts sheet")

recruitment_records = list(recruitments.iter_rows(min_row=2, values_only=True))
post_records = list(posts.iter_rows(min_row=2, values_only=True))
if len(recruitment_records) != len(items):
    raise SystemExit(f"Recruitment row mismatch: workbook={len(recruitment_records)} payload={len(items)}")
if len(post_records) < len(items):
    raise SystemExit(f"Posts sheet should retain at least one review/candidate row per article; rows={len(post_records)} articles={len(items)}")

recruitment_key_idx = recruitment_headers.index("recruitment_key")
source_id_idx = recruitment_headers.index("source_external_id_internal")
run_id_idx = recruitment_headers.index("run_id")
body_columns = [i for i, name in enumerate(recruitment_headers) if str(name).startswith("source_body_text_part_")]
details_columns = [i for i, name in enumerate(recruitment_headers) if str(name).startswith("source_details_json_part_")]
post_parent_idx = post_headers.index("recruitment_key")

parents = set()
recruitment_by_external_id = {}
for row in recruitment_records:
    key = row[recruitment_key_idx]
    external_id = str(row[source_id_idx] or "")
    if not key:
        raise SystemExit("Recruitment row missing recruitment_key")
    parents.add(key)
    recruitment_by_external_id[external_id] = row
    if row[run_id_idx] != payload.get("runId"):
        raise SystemExit(f"Run ID mismatch for {external_id}")

for row in post_records:
    parent = row[post_parent_idx]
    if parent not in parents:
        raise SystemExit(f"Post row has missing recruitment parent: {parent}")

def joined_columns(row, indices):
    return "".join(str(row[index] or "") for index in indices)

for item in items:
    external_id = str(item.get("externalId") or "")
    row = recruitment_by_external_id.get(external_id)
    if row is None:
        raise SystemExit(f"Missing recruitment workbook row for source ID {external_id}")
    expected_body = str(item.get("rawText") or "")
    actual_body = joined_columns(row, body_columns)
    if actual_body != expected_body:
        raise SystemExit(f"Normalized body text was truncated or altered for source ID {external_id}")
    details = item.get("details") or {}
    expected_details = json.dumps(details, ensure_ascii=False, sort_keys=True, default=str)
    actual_details = joined_columns(row, details_columns)
    if actual_details != expected_details:
        raise SystemExit(f"Details JSON was truncated or altered for source ID {external_id}")
    capture = details.get("sourceCapture") or {}
    capture_rel_path = capture.get("artifactPath")
    expected_hash = capture.get("htmlSha256")
    if capture_rel_path and expected_hash:
        capture_path = base / capture_rel_path
        if not capture_path.exists():
            raise SystemExit(f"Missing original HTML capture for source ID {external_id}: {capture_path}")
        actual_hash = hashlib.sha256(capture_path.read_bytes()).hexdigest()
        if actual_hash != expected_hash:
            raise SystemExit(f"Original HTML hash mismatch for source ID {external_id}")
    elif item.get("detailStatus") != "FAILED":
        raise SystemExit(f"Successful article lacks immutable HTML capture metadata: {external_id}")

print(json.dumps({
    "status": "PASS",
    "runId": payload.get("runId"),
    "recruitmentRows": len(recruitment_records),
    "postCandidateRows": len(post_records),
    "sheets": wb.sheetnames,
    "rawTextAndDetailsPreserved": True,
    "htmlCapturesVerified": True
}, ensure_ascii=False))
