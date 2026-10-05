/**
 * Usage: tsx src/scripts/state-backfill-sql.ts <rows.json> <summary.csv> [unresolved.txt] > backfill.sql
 *
 * Reads a JSON array of postings, prints ONE reviewed fill-only SQL script to
 * stdout, writes a CSV summary (id,title,slug,basis) and a list of unresolved
 * ids (default: <summary.csv>.unresolved.txt). Touches no database.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { buildBackfill, type BackfillRow } from "../lib/states/backfill-sql";

function main(): void {
  const [rowsPath, csvPath, unresolvedPath] = process.argv.slice(2);
  if (!rowsPath || !csvPath) {
    console.error("usage: state-backfill-sql <rows.json> <summary.csv> [unresolved.txt]");
    process.exit(2);
  }
  const rows = JSON.parse(readFileSync(rowsPath, "utf8")) as BackfillRow[];
  if (!Array.isArray(rows)) throw new Error("rows.json must be a JSON array");
  const result = buildBackfill(rows);
  writeFileSync(csvPath, result.csv);
  writeFileSync(unresolvedPath ?? `${csvPath}.unresolved.txt`, result.unresolvedIds.join("\n") + "\n");
  process.stdout.write(result.sql);
  console.error(
    `resolved ${result.resolvedCount}, unresolved ${result.unresolvedIds.length}, region fills ${result.regionFillCount}`,
  );
}

main();
