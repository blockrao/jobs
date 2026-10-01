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
import { writePostingsToDB as writePostingsToDBLegacy } from "../db/operations/write-postings";
import { writePostingsToDB } from "../db/operations/write-postings-v2";

const adapters: SourceAdapter[] = [
  sarkariresultAdapter,
  indiasarkarinaukriAdapter,
  sarkarinaukriAdapter,
  sahisarkarijobsAdapter,
  freejobalertAdapter,
];

const DUMP_PATH =
  process.env.INGEST_OUT ?? path.join(tmpdir(), "joboye-raw-postings.json");

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

export async function main(opts?: { dryRun?: boolean }) {
  const dryRun = opts?.dryRun !== false ? true : false; // Default: dry-run enabled

  // Validate DATABASE_URL is set (required for writing to Supabase)
  if (!process.env.DATABASE_URL) {
    console.error(
      "\n❌ DATABASE_URL not set. This is required to write results to Supabase.\n" +
      "Set it before running:\n" +
      "  export DATABASE_URL='postgresql://postgres:PASSWORD@PROJECT.supabase.co:5432/postgres'\n" +
      "Or copy .env.example → .env.local and fill in your Supabase connection string.\n" +
      "See QUICKSTART_LOCAL.md for setup.\n"
    );
    process.exit(1);
  }

  console.log("🚀 JobOye multi-portal ingestion pipeline");
  console.log("=".repeat(60));
  console.log("📍 Running locally via Claude Code (bypasses cloud proxy)");
  if (dryRun) {
    console.log("📋 DRY-RUN MODE: Database writes disabled (preview only)\n");
  } else {
    console.log("💾 LIVE MODE: Database writes enabled\n");
  }

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
  const withExamDetection = normalizedPostings.filter((p) => p.examSlug).length;
  console.log(`✅ Normalized ${normalizedPostings.length} postings (${withExamDetection} linked to exams)`);

  // Step 5: Write to database (or simulate in dry-run)
  console.log(`\n💾 Phase 4: ${dryRun ? "Simulating" : "Writing to"} database...`);
  let dbResult: { inserted: number; updated: number; skipped: number; inferred: number; orphaned: number; total: number };

  if (dryRun) {
    // Count what would be inserted/skipped
    let wouldInsert = 0, wouldSkip = 0;
    for (let i = 0; i < dedupedPostings.length; i++) {
      const deduped = dedupedPostings[i];
      if ((deduped.primary.confidence || 0) < 40) {
        wouldSkip++;
      } else {
        wouldInsert++;
      }
    }
    dbResult = { inserted: wouldInsert, updated: 0, skipped: wouldSkip, inferred: 0, orphaned: 0, total: dedupedPostings.length };
    console.log(`
✅ Database write simulation:
   • Would insert: ${dbResult.inserted} new postings
   • Skipped (low confidence < 0.4): ${dbResult.skipped}
   • Total processed: ${dbResult.total}
   • Exams detected: ${withExamDetection} postings will auto-link to exam pages

   ℹ️  Run with DRY_RUN=false to actually write to Supabase
    `);
  } else {
    try {
      dbResult = await writePostingsToDB(dedupedPostings, normalizedPostings);
      const inferencedPct = dbResult.total > 0
        ? ((dbResult.inferred / (dbResult.inserted + dbResult.updated)) * 100).toFixed(1)
        : "0";
      console.log(`
✅ Database write complete:
   • Inserted: ${dbResult.inserted} new postings
   • Updated: ${dbResult.updated} existing postings
   • Successfully inferred: ${dbResult.inferred} postings (${inferencedPct}%)
   • Orphaned (no match): ${dbResult.orphaned} postings
   • Skipped (low confidence < 0.4): ${dbResult.skipped}
   • Total processed: ${dbResult.total}
   • Exams linked: ${withExamDetection} postings automatically linked to exam pages

Graph Model Inference Stats:
   • Postings linked to Recruitment: ${dbResult.inferred}
   • Postings linked to Post (Position): ${dbResult.inferred}
   • Confidence-boosted by inference: +15 points (max 100)
      `);
    } catch (dbErr) {
      console.error("❌ Database write failed:", dbErr);
      throw dbErr;
    }
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

// Allow DRY_RUN env var to disable dry-run mode (default: dry-run enabled)
const dryRunEnv = process.env.DRY_RUN;
const liveModeRequested = dryRunEnv === 'false' || dryRunEnv === '0' || dryRunEnv === 'no';

main({ dryRun: !liveModeRequested }).catch((err) => {
  console.error(err);
  process.exit(1);
});
