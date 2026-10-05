/**
 * Usage: tsx src/scripts/triage-pending.ts <pending.json> <approved.json> <outDir> [YYYY-MM-DD]
 *
 * Reads snapshots of the non-approved and approved postings, writes
 * <outDir>/pending_triage.csv and <outDir>/approve_ready.sql, prints counts.
 * Touches no database. The optional date fixes "today" (default: now).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildApprovalSql, toCsv, triage, type ApprovedRow, type PendingRow } from "../lib/content-quality/triage";

function main(): void {
  const [pendingPath, approvedPath, outDir, day] = process.argv.slice(2);
  if (!pendingPath || !approvedPath || !outDir) {
    console.error("usage: triage-pending <pending.json> <approved.json> <outDir> [YYYY-MM-DD]");
    process.exit(2);
  }
  const now = day ? new Date(`${day}T12:00:00Z`) : new Date();
  const pending = JSON.parse(readFileSync(pendingPath, "utf8")) as PendingRow[];
  const approved = JSON.parse(readFileSync(approvedPath, "utf8")) as ApprovedRow[];
  const rows = triage(pending, approved, now);
  writeFileSync(join(outDir, "pending_triage.csv"), toCsv(rows));
  const status = new Map(pending.map((p) => [p.id, p.review_status]));
  const ready = rows.filter((r) => r.decision === "APPROVE_READY" && status.get(r.id) === "PENDING").map((r) => r.id);
  writeFileSync(join(outDir, "approve_ready.sql"), buildApprovalSql(ready, { generatedOn: now.toISOString().slice(0, 10) }));
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.decision] = (counts[r.decision] ?? 0) + 1;
  console.error(JSON.stringify(counts));
}

main();
