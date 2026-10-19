/**
 * FJA enrichment scraper — Phase 1 P0 (#4 factual richness).
 *
 * Reads posts where officialSourceUrl is a FJA article URL, fetches the page,
 * extracts structured facts using parseFreeJobAlertArticle, and writes a JSON
 * results file for fja-enrich-sql.ts to turn into SQL.
 *
 * Usage:
 *   # Fetch a batch-list JSON file (array of {id, url}):
 *   tsx src/scripts/fja-enrich-run.ts batch.json results.json
 *
 *   # Or generate the batch from the DB and run immediately:
 *   tsx src/scripts/fja-enrich-run.ts --from-db [--limit 50] results.json
 *
 * The script is idempotent: re-running with the same URLs updates the results
 * file. It never touches the database.
 *
 * Rate limiting: 2.5 s between requests (FJA allows ClaudeBot per robots.txt).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fetchHtml, sleep, CLAUDE_UA } from "@/ingest/adapters/util";
import { parseFreeJobAlertArticle } from "@/enrich/freejobalert-article";
import { createClient } from "@supabase/supabase-js";

const DELAY_MS = 2500;

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const fromDb = args.includes("--from-db");
const limitIdx = args.indexOf("--limit");
const dbLimit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 200;
const positional = args.filter((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--limit");

let batchFile = "";
let outFile = "";

if (fromDb) {
  outFile = positional[0] ?? "fja-enrich-results.json";
} else {
  [batchFile, outFile] = positional;
  if (!batchFile || !outFile) {
    console.error("Usage: fja-enrich-run.ts <batch.json> <results.json>");
    console.error("       fja-enrich-run.ts --from-db [--limit N] <results.json>");
    process.exit(1);
  }
}

// ── Load or build batch ───────────────────────────────────────────────────────

interface BatchItem {
  id: number;
  url: string;
  name?: string;
  recruitmentSlug?: string;
}

async function buildBatchFromDb(limit: number): Promise<BatchItem[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
            ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY) env vars");
  }
  const sb = createClient(url, key);
  const { data, error } = await sb
    .from("posts")
    .select('id, name, "recruitmentSlug", "officialSourceUrl"')
    .ilike("officialSourceUrl", "%freejobalert%")
    .eq("isLive", true)
    .is("enrichment", null)
    .order("id")
    .limit(limit);
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    url: r.officialSourceUrl as string,
    name: r.name as string,
    recruitmentSlug: r.recruitmentSlug as string,
  }));
}

async function main() {
  let batch: BatchItem[];
  if (fromDb) {
    console.log(`Querying DB for up to ${dbLimit} un-enriched FJA posts…`);
    batch = await buildBatchFromDb(dbLimit);
    console.log(`Found ${batch.length} posts to enrich`);
    if (batch.length === 0) { console.log("Nothing to do."); return; }
  } else {
    batch = JSON.parse(readFileSync(batchFile, "utf8")) as BatchItem[];
  }

  // Resume from a partial results file if it exists
  const existing: Map<number, unknown> = new Map();
  if (existsSync(outFile)) {
    const prev = JSON.parse(readFileSync(outFile, "utf8")) as { id: number }[];
    for (const r of prev) existing.set(r.id, r);
    console.log(`Resuming — ${existing.size} already done`);
  }

  const results: unknown[] = [...existing.values()];
  let fetched = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of batch) {
    if (existing.has(item.id)) { skipped++; continue; }

    const logPrefix = `[${item.id}] ${(item.name ?? "").slice(0, 40)}`;

    try {
      const html = await fetchHtml(item.url, { ua: CLAUDE_UA, retries: 2, retryDelayMs: 3000 });
      const facts = parseFreeJobAlertArticle(html);

      const result = {
        id: item.id,
        url: item.url,
        name: item.name,
        recruitmentSlug: item.recruitmentSlug,
        ok: true,
        htmlBytes: html.length,
        facts,
        fetchedAt: new Date().toISOString(),
      };
      results.push(result);
      fetched++;

      // Live log for monitoring long runs
      const fieldCount = Object.keys(facts).filter(
        (k) => !["unparsed", "review", "debug"].includes(k) && (facts as unknown as Record<string, unknown>)[k] != null
      ).length;
      console.log(`✓ ${logPrefix} — ${fieldCount} fields, review: [${facts.review.join(",")}]`);

    } catch (e) {
      const err = { id: item.id, url: item.url, name: item.name, ok: false,
        error: String((e as Error).message).slice(0, 300), fetchedAt: new Date().toISOString() };
      results.push(err);
      errors++;
      console.error(`✗ ${logPrefix} — ${err.error}`);
    }

    writeFileSync(outFile, JSON.stringify(results, null, 1));
    await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${fetched} fetched, ${skipped} skipped, ${errors} errors → ${outFile}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
