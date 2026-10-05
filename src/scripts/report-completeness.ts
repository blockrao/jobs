/**
 * PQ-002 weekly gap report: completeness of every live approved posting.
 * Run: npm run report:completeness   (read-only)
 */
import { getDb } from "@/db";
import { postings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { evaluateCompleteness, COMPLETENESS_CHECKS } from "@/lib/content-quality/completeness";

async function main() {
  const db = getDb();
  if (!db) throw new Error("Database connection failed");
  const rows = await db.select().from(postings).where(eq(postings.reviewStatus, "APPROVED"));
  const bands = { complete: 0, partial: 0, thin: 0 };
  const missing: Record<string, number> = Object.fromEntries(COMPLETENESS_CHECKS.map((c) => [c, 0]));
  const byTier: Record<string, number> = {};
  for (const p of rows) {
    const r = evaluateCompleteness(p as never);
    bands[r.band]++;
    r.missing.forEach((m) => missing[m]++);
    byTier[`${p.indexTier}:${r.band}`] = (byTier[`${p.indexTier}:${r.band}`] ?? 0) + 1;
  }
  console.log(`Postings scored: ${rows.length}`);
  console.log("Bands:", bands);
  console.log("By tier:band:", byTier);
  console.log("Missing by check:");
  for (const [k, v] of Object.entries(missing)) console.log(`  ${k.padEnd(18)} ${v}`);
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
