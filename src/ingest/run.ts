import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RawPosting, SourceAdapter } from "./types";
import { sarkariresultAdapter } from "./adapters/sarkariresult";
import { indiasarkarinaukriAdapter } from "./adapters/indiasarkarinaukri";
import { sarkarinaukriAdapter } from "./adapters/sarkarinaukri";
import { sahisarkarijobsAdapter } from "./adapters/sahisarkarijobs";
import { freejobalertAdapter } from "./adapters/freejobalert";
import { deduplicate } from "./deduplicate";
import { normalize } from "./normalize";
import { writePostingsToDB } from "../db/operations/write-postings";

const adapters: SourceAdapter[] = [
  sarkariresultAdapter,
  indiasarkarinaukriAdapter,
  sarkarinaukriAdapter,
  sahisarkarijobsAdapter,
  freejobalertAdapter,
];

const DUMP_PATH =
  process.env.INGEST_OUT ?? path.join(tmpdir(), "rojgarsetu-raw-postings.json");

interface PortalResult {
  source: string;
  label: string;
  count: number;
  error?: string;
  postings: RawPosting[];
}

async function runAdapter(adapter: SourceAdapter): Promise<PortalResult> {
  const started = Date.now();
  console.log(`\nFetching from ${adapter.source} (${adapter.label})...`);
  try {
    const postings = await adapter.fetchRaw();
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`  → ${postings.length} jobs fetched in ${secs}s`);
    return { source: adapter.source, label: adapter.label, count: postings.length, postings };
  } catch (err) {
    const message = (err as Error).message;
    console.error(`  ✗ ${adapter.source} failed: ${message}`);
    return { source: adapter.source, label: adapter.label, count: 0, error: message, postings: [] };
  }
}

export async function main() {
  // Validate DATABASE_URL is set (required for writing to Supabase)
  if (!process.env.DATABASE_URL) {
    console.error(
      "\n❌ DATABASE_URL not set. This is required to write results to Supabase.\n" +
      "Set it before running:\n" +
      "  export DATABASE_URL='postgresql://postgres:PASSWORD@PROJECT.supabase.co:5432/postgres'\n" +
      "Or copy .env.local.example → .env.local and fill in your Supabase connection string.\n" +
      "See SCRAPER_LOCAL.md for details.\n"
    );
    process.exit(1);
  }

  console.log("🚀 SarkariJobs multi-portal ingestion pipeline");
  console.log("=".repeat(60));
  console.log("📍 Running locally via Claude Code (bypasses cloud proxy)\n");

  // Step 1: Crawl all portals in parallel
  console.log("\n📡 Phase 1: Crawling 5 government job portals...");
  const results = await Promise.all(adapters.map(runAdapter));

  const allRaw = results.flatMap((r) =>
    r.postings.map((p) => ({ ...p, source: r.source }))
  );
  console.log(`\n✅ Crawled ${allRaw.length} raw postings`);

  // Step 2: Per-portal summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("Per-portal summary");
  console.log("-".repeat(60));
  let total = 0;
  for (const r of results) {
    total += r.count;
    const status = r.error ? `ERROR: ${r.error}` : `${r.count} jobs`;
    console.log(`  ${r.label.padEnd(22)} ${status}`);
  }
  const withFields = allRaw.filter((p) => p.validThrough || p.totalVacancies).length;
  console.log("-".repeat(60));
  console.log(`  TOTAL raw postings: ${total}  (${withFields} with deadline/vacancy detail)`);

  // Step 3: Deduplicate
  console.log(`\n📊 Phase 2: Deduplicating (earliest deadline strategy)...`);
  const dedupedPostings = deduplicate(allRaw);
  console.log(`✅ Deduplicated to ${dedupedPostings.length} unique postings`);

  // Step 4: Normalize
  console.log(`\n🔧 Phase 3: Normalizing (exam codes, stages, slugs)...`);
  const normalizedPostings = normalize(dedupedPostings);
  console.log(`✅ Normalized ${normalizedPostings.length} postings`);

  // Step 5: Write to database
  console.log(`\n💾 Phase 4: Writing to database...`);
  try {
    const dbResult = await writePostingsToDB(dedupedPostings, normalizedPostings);
    console.log(`
✅ Database write complete:
   • Inserted: ${dbResult.inserted} new postings
   • Updated: ${dbResult.updated} existing postings
   • Skipped: ${dbResult.skipped} (low confidence < 0.4)
   • Total processed: ${dbResult.total}
    `);
  } catch (dbErr) {
    console.error("❌ Database write failed:", dbErr);
    throw dbErr;
  }

  // Step 6: Dump raw postings for audit
  const dump = {
    generatedAt: new Date().toISOString(),
    portals: Object.fromEntries(results.map((r) => [r.source, r.count])),
    errors: results.filter((r) => r.error).map((r) => ({ source: r.source, error: r.error })),
    postings: results.flatMap((r) => r.postings.map((p) => ({ source: r.source, ...p }))),
  };
  writeFileSync(DUMP_PATH, JSON.stringify(dump, null, 2));
  console.log(`\n📄 Raw postings audit dump: ${DUMP_PATH}`);

  console.log(`\n${"=".repeat(60)}`);
  console.log("✨ Ingestion pipeline complete");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
