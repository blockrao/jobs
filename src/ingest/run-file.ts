/**
 * File-based ingestion runner.
 *
 * Reads a JSONL file produced by `scrape_to_jsonl.py` and feeds the records
 * through the same pipeline as the live adapters — dedupe, normalize, write.
 *
 * Usage:
 *   INGEST_SOURCE_FILE=./sr.jsonl DATABASE_URL=... DRY_RUN=false npx tsx src/ingest/run-file.ts
 *
 * Environment variables:
 *   INGEST_SOURCE_FILE  — (required) path to JSONL file
 *   DATABASE_URL        — (required for live writes) Supabase connection string
 *   DRY_RUN             — set to "false" to write; default is dry-run
 *   INGEST_OUT          — optional path to dump raw postings JSON
 */

import { writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadMultiSourceFile } from "./adapters/multi-source-file";
import { processRaw } from "./pipeline";

const DUMP_PATH =
  process.env.INGEST_OUT ?? path.join(tmpdir(), "joboye-file-postings.json");

async function main() {
  const filePath = process.env.INGEST_SOURCE_FILE;
  if (!filePath) {
    console.error(
      "\n❌ INGEST_SOURCE_FILE not set.\n" +
        "Usage: INGEST_SOURCE_FILE=./sr.jsonl DRY_RUN=false npx tsx src/ingest/run-file.ts\n",
    );
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`\n❌ File not found: ${filePath}\n`);
    process.exit(1);
  }

  const dryRun = process.env.DRY_RUN !== "false";

  if (!dryRun && !process.env.DATABASE_URL) {
    console.error(
      "\n❌ DATABASE_URL not set. Required for live writes.\n" +
        "Either set DATABASE_URL or add DRY_RUN=true to skip writing.\n",
    );
    process.exit(1);
  }

  console.log(`\n📂 Loading file: ${filePath}`);
  const { postings, stats } = loadMultiSourceFile(filePath);

  console.log("\n📊 File load stats:");
  console.log(`   Total lines:   ${stats.records}`);
  console.log(`   Recruitments:  ${stats.recruitments}`);
  console.log(`   Skipped:       ${stats.notRecruitment}`);
  console.log("   By site:");
  for (const [site, count] of Object.entries(stats.bySite)) {
    console.log(`     ${site}: ${count}`);
  }

  if (postings.length === 0) {
    console.log("\n⚠️  No recruitments found in file. Exiting.");
    return;
  }

  console.log(`\n${dryRun ? "🔍 DRY RUN" : "💾 LIVE WRITE"} — ${postings.length} postings`);

  // Dump raw postings for inspection
  writeFileSync(DUMP_PATH, JSON.stringify(postings, null, 2));
  console.log(`   Raw dump: ${DUMP_PATH}`);

  if (dryRun) {
    console.log("\n[DRY RUN] Pipeline would process the above postings.");
    console.log("Set DRY_RUN=false to write to the database.\n");

    // Show a sample
    const sample = postings.slice(0, 3);
    for (const p of sample) {
      console.log(`\n  ${p.title}`);
      console.log(`    source:       ${p.source}`);
      console.log(`    externalId:   ${p.externalId}`);
      console.log(`    organization: ${p.organizationName || "(none)"}`);
      console.log(`    vacancies:    ${p.totalVacancies ?? "(none)"}`);
      console.log(`    deadline:     ${p.validThrough?.toISOString().slice(0, 10) ?? "(none)"}`);
      console.log(`    confidence:   ${p.confidence ?? "(none)"}`);
    }
    if (postings.length > 3) {
      console.log(`  ... and ${postings.length - 3} more`);
    }
    return;
  }

  // Live run — feed the real pipeline
  const runId = `file-${Date.now()}`;
  console.log(`\n⚙️  Running pipeline (runId: ${runId})...`);

  const result = await processRaw(postings, { runId });

  console.log("\n✅ Pipeline complete:");
  console.log(`   Deduped:   ${result.deduped.length}`);
  console.log(`   Normalized: ${result.normalized.length}`);
  if (result.write) {
    const w = result.write;
    console.log(`   Inserted:  ${w.inserted}`);
    console.log(`   Updated:   ${w.updated}`);
    console.log(`   Unchanged: ${w.unchanged}`);
    console.log(`   Flagged:   ${w.flagged}`);
    console.log(`   Skipped:   ${w.skipped}`);
    console.log(`   Rejected:  ${w.rejected}`);
    console.log(`   Total:     ${w.total}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
