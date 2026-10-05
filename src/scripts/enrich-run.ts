/**
 * PQ-008 dry run: fetch source pages and write extracted FACTS to a JSON file.
 * Touches no database. Input: [{id,url}]. Output: proposals with the fields
 * found and the sections that exist but yielded nothing.
 * Usage: tsx src/scripts/enrich-run.ts data/enrich/batch-001.json out.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fetchHtml, sleep, CLAUDE_UA } from "@/ingest/adapters/util";
import { parseFreeJobAlertArticle } from "@/enrich/freejobalert-article";

async function main() {
  const [inFile, outFile] = process.argv.slice(2);
  const items: { id: number; url: string }[] = JSON.parse(readFileSync(inFile, "utf8"));
  const out: unknown[] = [];
  for (const it of items) {
    try {
      const html = await fetchHtml(it.url, { ua: CLAUDE_UA, retries: 2, retryDelayMs: 2000 });
      const f = parseFreeJobAlertArticle(html);
      out.push({ id: it.id, ok: true, htmlBytes: html.length, facts: f });
    } catch (e) {
      out.push({ id: it.id, ok: false, error: String((e as Error).message).slice(0, 200) });
    }
    await sleep(2500);
  }
  writeFileSync(outFile, JSON.stringify(out, null, 1));
  console.log(`done ${out.length}`);
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
