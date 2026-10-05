/**
 * PQ-008 full dry run. Reads the list of FreeJobAlert-sourced postings with the
 * restricted read-only login (DATABASE_URL_READONLY), skips ids already done, fetches each
 * source page politely and writes extracted facts to JSON. Never writes to the database.
 * Usage: tsx src/scripts/enrich-full.ts out.json skipIdsCsv
 */
import { writeFileSync } from "node:fs";
import postgres from "postgres";
import { fetchHtml, sleep, CLAUDE_UA } from "@/ingest/adapters/util";
import { parseFreeJobAlertArticle } from "@/enrich/freejobalert-article";

async function main() {
  const [outFile, skipCsv = ""] = process.argv.slice(2);
  const url = process.env.DATABASE_URL_READONLY;
  if (!url) throw new Error("DATABASE_URL_READONLY missing");
  const sql = postgres(url, { max: 1, ssl: "require" });
  const skip = new Set(skipCsv.split(",").filter(Boolean).map(Number));
  const rows = await sql<{ id: number; source_url: string }[]>`
    select id, source_url from public.postings
    where review_status = 'APPROVED' and source = 'freejobalert' and source_url is not null order by id`;
  await sql.end();
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
