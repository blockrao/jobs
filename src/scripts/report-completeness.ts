/**
 * Completeness report (PQ-002): `npm run report:completeness`
 *
 * Read-only. Prints, for the live approved pages, how many pass each completeness
 * check (all pages and Tier A). Same SQL as `completenessReportSql()`, which is
 * generated from the check list in src/lib/content-quality/completeness.ts.
 */
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { completenessReportSql } from "@/lib/content-quality/completeness";

type Row = { key: string; grp: string; pass_all: number; total_all: number; pass_tier_a: number; total_tier_a: number };

const pct = (a: number, b: number) => (b === 0 ? "  n/a" : `${String(Math.round((a / b) * 100)).padStart(3)}%`);

async function main() {
  const rows = (await getDb().execute(sql.raw(completenessReportSql()))) as unknown as Row[];
  const first = rows[0];
  if (!first) {
    console.log("No live pages.");
    return;
  }
  console.log(`Live pages: ${first.total_all}; Tier A: ${first.total_tier_a}\n`);
  console.log("check               group    all pages          tier A");
  let passAll = 0;
  let passA = 0;
  for (const r of rows) {
    passAll += r.pass_all;
    passA += r.pass_tier_a;
    console.log(
      `${r.key.padEnd(19)} ${r.grp.padEnd(8)} ${String(r.pass_all).padStart(5)}/${String(r.total_all).padEnd(5)} ${pct(r.pass_all, r.total_all)}   ${String(r.pass_tier_a).padStart(4)}/${String(r.total_tier_a).padEnd(4)} ${pct(r.pass_tier_a, r.total_tier_a)}`
    );
  }
  const n = rows.length;
  console.log(`\nAverage completeness: all pages ${pct(passAll, n * first.total_all)}, Tier A ${pct(passA, n * first.total_tier_a)}`);
}

main().then(() => process.exit(0));
