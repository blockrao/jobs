import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RawPosting, SourceAdapter } from "./types";
import { sarkariresultAdapter } from "./adapters/sarkariresult";
import { indiasarkarinaukriAdapter } from "./adapters/indiasarkarinaukri";
import { sarkarinaukriAdapter } from "./adapters/sarkarinaukri";
import { sahisarkarijobsAdapter } from "./adapters/sahisarkarijobs";
import { freejobalertAdapter } from "./adapters/freejobalert";
import { prepare, processRaw } from "./pipeline";

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
    // Stamp the neutral source code on every posting so the writer never falls back to "unknown".
    const postings = (await adapter.fetchRaw()).map((p) => (p.source ? p : { ...p, source: adapter.source }));
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

  // Steps 3-5: dedupe -> normalize -> write, through the shared pipeline
  // (src/ingest/pipeline.ts). Ingestion is not publication: every new row lands
  // PENDING; unresolved organizations are held as candidates (WP-001).
  console.log(`\n📊 Phase 2-4: dedupe, normalize, ${dryRun ? "simulate" : "write"}...`);
  if (dryRun) {
    const { deduped, normalized } = prepare(allRaw);
    const wouldSkip = deduped.filter((d) => (d.primary.confidence || 0) < 40).length;
    console.log(`
✅ Database write simulation (no database access):
   • Deduplicated to ${deduped.length} unique postings
   • Would process: ${deduped.length - wouldSkip}; skipped (low confidence): ${wouldSkip}
   • Exams detected: ${normalized.filter((p) => p.examSlug).length}
   ℹ️  Run with DRY_RUN=false to write. New rows are PENDING; they are not published by ingestion.
    `);
  } else {
    const { write } = await processRaw(allRaw, { runId: `ingest-${new Date().toISOString()}` });
    console.log(`
✅ Database write complete:
   • Inserted (PENDING): ${write.inserted}   Updated: ${write.updated}   Flagged: ${write.flagged}   Unchanged: ${write.unchanged}
   • Held as organization candidates: ${write.heldCandidates}   Rejected: ${write.rejected}   Skipped: ${write.skipped}
   • Total processed: ${write.total}
    `);
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
