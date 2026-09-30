import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RawPosting, SourceAdapter } from "./types";
import { sarkariresultAdapter } from "./adapters/sarkariresult";
import { indiasarkarinaukriAdapter } from "./adapters/indiasarkarinaukri";
import { sarkarinaukriAdapter } from "./adapters/sarkarinaukri";
import { sahisarkarijobsAdapter } from "./adapters/sahisarkarijobs";
import { freejobalertAdapter } from "./adapters/freejobalert";

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

async function main() {
  console.log("RojgarSetu raw ingestion — 5 government job portals");
  console.log("=".repeat(60));

  // Crawl all portals in parallel; one portal failing must not abort the rest.
  const results = await Promise.all(adapters.map(runAdapter));

  console.log(`\n${"=".repeat(60)}`);
  console.log("Per-portal summary");
  console.log("-".repeat(60));
  let total = 0;
  for (const r of results) {
    total += r.count;
    const status = r.error ? `ERROR: ${r.error}` : `${r.count} jobs`;
    console.log(`  ${r.label.padEnd(22)} ${status}`);
  }
  const withFields = results
    .flatMap((r) => r.postings)
    .filter((p) => p.validThrough || p.totalVacancies).length;
  console.log("-".repeat(60));
  console.log(`  TOTAL raw postings: ${total}  (${withFields} with deadline/vacancy detail)`);

  // Dump for the dedup/normalize step to consume.
  const dump = {
    generatedAt: new Date().toISOString(),
    portals: Object.fromEntries(results.map((r) => [r.source, r.count])),
    errors: results.filter((r) => r.error).map((r) => ({ source: r.source, error: r.error })),
    postings: results.flatMap((r) => r.postings.map((p) => ({ source: r.source, ...p }))),
  };
  writeFileSync(DUMP_PATH, JSON.stringify(dump, null, 2));
  console.log(`\nRaw RawPosting[] dumped to: ${DUMP_PATH}`);

  // One sample per portal to verify field extraction.
  console.log(`\n${"=".repeat(60)}`);
  console.log("Sample RawPosting (one per portal)");
  console.log("-".repeat(60));
  for (const r of results) {
    const sample = r.postings[0];
    if (!sample) {
      console.log(`\n[${r.source}] (no postings)`);
      continue;
    }
    console.log(`\n[${r.source}]`);
    console.log(
      JSON.stringify(
        {
          externalId: sample.externalId,
          title: sample.title,
          organizationName: sample.organizationName,
          organizationSector: sample.organizationSector,
          totalVacancies: sample.totalVacancies,
          datePosted: sample.datePosted,
          validThrough: sample.validThrough,
          examDate: sample.examDate,
          eligibility: sample.eligibility?.slice(0, 80),
          locationRegion: sample.locationRegion,
          confidence: sample.confidence,
          sourceUrl: sample.sourceUrl,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
