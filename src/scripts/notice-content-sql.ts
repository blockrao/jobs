/**
 * Notice content: FAQs (postings.extra_content.faqs) and timeline rows (posting_updates)
 * from stored facts. Fill-only: every statement is guarded so it never overwrites.
 * Usage: tsx src/scripts/notice-content-sql.ts <approved_facts.json> <outdir>
 * Writes notice_content_01.sql ... (<=60 statements each) and notice_content_preview.md.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildNoticeFaqs, buildNoticeTimeline, type NoticeFacts } from "@/lib/content/notice-faqs";

const [inFile, outDir] = process.argv.slice(2);
if (!inFile || !outDir) throw new Error("usage: notice-content-sql.ts <approved_facts.json> <outdir>");
const PER_FILE = 60;
const facts = JSON.parse(readFileSync(inFile, "utf8")) as NoticeFacts[];

const stmts: string[] = [];
const faqIds: number[] = [];
let timelinePostings = 0;
let timelineRows = 0;
const samples: { f: NoticeFacts; faqs: ReturnType<typeof buildNoticeFaqs>; tl: ReturnType<typeof buildNoticeTimeline> }[] = [];

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

for (const f of facts) {
  const faqs = buildNoticeFaqs(f);
  const tl = buildNoticeTimeline(f);
  if (faqs.length) {
    const json = JSON.stringify(faqs);
    if (json.includes("$nf$")) throw new Error(`dollar-quote tag clash in posting ${f.id}`);
    faqIds.push(f.id);
    stmts.push(
      `UPDATE public.postings SET extra_content = jsonb_set(coalesce(extra_content,'{}'::jsonb), '{faqs}', $nf$${json}$nf$::jsonb) WHERE id=${f.id} AND (extra_content->'faqs') IS NULL;`,
    );
  }
  if (tl.length) {
    timelinePostings++;
    timelineRows += tl.length;
    const values = tl.map((r) => `(${lit(r.stage)}, ${lit(r.title)}, ${lit(r.eventDate)})`).join(", ");
    stmts.push(
      `INSERT INTO public.posting_updates (posting_id, stage, title, event_date) SELECT ${f.id}, v.stage::public.posting_stage, v.title, v.event_date::timestamptz FROM (VALUES ${values}) AS v(stage, title, event_date) WHERE NOT EXISTS (SELECT 1 FROM public.posting_updates WHERE posting_id=${f.id});`,
    );
  }
  if (faqs.length || tl.length) samples.push({ f, faqs, tl });
}

mkdirSync(outDir, { recursive: true });
const files = Math.max(1, Math.ceil(stmts.length / PER_FILE));
for (let n = 0; n < files; n++) {
  const chunk = stmts.slice(n * PER_FILE, (n + 1) * PER_FILE);
  let head = `-- Notice content (FAQs + timeline). Fill-only, guarded. Part ${n + 1} of ${files}.\n`;
  if (n === 0 && faqIds.length) {
    head += `CREATE SCHEMA IF NOT EXISTS backup_20261005;\nCREATE TABLE IF NOT EXISTS backup_20261005.notice_content_backup AS SELECT id, extra_content FROM public.postings WHERE id IN (${faqIds.join(",")});\n`;
  }
  writeFileSync(join(outDir, `notice_content_${String(n + 1).padStart(2, "0")}.sql`), head + chunk.join("\n") + "\n");
}

// Preview: 5 postings spread across the output.
const withFaqs = samples.filter((s) => s.faqs.length);
const pick = [0, 1, 2, 3, 4].map((i) => withFaqs[Math.floor((i * withFaqs.length) / 5)]).filter(Boolean);
let md = `# Notice content preview\n\nPostings with FAQs: ${faqIds.length}. Postings with timeline rows: ${timelinePostings} (${timelineRows} rows). SQL files: ${files}.\n`;
for (const { f, faqs, tl } of pick) {
  md += `\n## Posting ${f.id}: ${f.title}\n\nOrg: ${f.org ?? "-"}\n\n### FAQs\n`;
  md += faqs.length ? faqs.map((x) => `- **${x.q}**\n  ${x.a}`).join("\n") + "\n" : "_none_\n";
  md += `\n### Timeline\n`;
  md += tl.length ? tl.map((r) => `- ${r.eventDate} | ${r.stage} | ${r.title}`).join("\n") + "\n" : "_none_\n";
}
writeFileSync(join(outDir, "notice_content_preview.md"), md);
console.log(JSON.stringify({ faqPostings: faqIds.length, timelinePostings, timelineRows, statements: stmts.length, files }));
