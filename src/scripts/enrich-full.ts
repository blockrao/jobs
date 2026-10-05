/**
 * PQ-008 full dry run. Reads the list of FreeJobAlert-sourced postings with the
 * restricted read-only login (DATABASE_URL_READONLY), skips ids already done, fetches each
 * source page politely and writes extracted facts to JSON. Never writes to the database.
 * Usage: tsx src/scripts/enrich-full.ts out.json skipIdsCsv list.tsv (id<TAB>url, exported with the read-only login)
 */
import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { fetchHtml, sleep, CLAUDE_UA } from "@/ingest/adapters/util";
import { parseFreeJobAlertArticle } from "@/enrich/freejobalert-article";

async function main() {
  const [outFile, skipCsv = "", listFile] = process.argv.slice(2);
  const skip = new Set(skipCsv.split(",").filter(Boolean).map(Number));
  const rows = readFileSync(listFile, "utf8").split("\n").filter(Boolean).map((l) => {
    const [id, source_url] = l.split("\t");
    return { id: Number(id), source_url };
  });
  const todo = rows.filter((r) => !skip.has(r.id));
  console.log(`to fetch: ${todo.length}`);
  const out: unknown[] = [];
  for (const it of todo) {
    try {
      const html = await fetchHtml(it.source_url, { ua: CLAUDE_UA, retries: 2, retryDelayMs: 2000 });
      const facts = parseFreeJobAlertArticle(html);
      delete facts.debug;
      out.push({ id: it.id, url: it.source_url, ok: true, htmlBytes: html.length, facts });
    } catch (e) {
      out.push({ id: it.id, url: it.source_url, ok: false, error: String((e as Error).message).slice(0, 200) });
    }
    if (out.length % 50 === 0) console.log(`progress ${out.length}/${todo.length}`);
    await sleep(2000);
  }
  writeFileSync(outFile, JSON.stringify(out));
  console.log(`done ${out.length}`);
}
main().then(() => process.exit(0), (e) => { console.error(String(e.message ?? e)); process.exit(1); });
