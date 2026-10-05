/**
 * PQ-008: turn dry-run results into a FILL-ONLY SQL file (never overwrites a value).
 * Each update is guarded by id AND source_url. Results with review flags are skipped.
 * Usage: tsx src/scripts/enrich-sql.ts out.sql result1.json [result2.json ...]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { isAggregatorUrl, mentionsAggregator } from "@/lib/aggregators";
import type { ArticleFacts } from "@/enrich/freejobalert-article";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const [outFile, ...inFiles] = process.argv.slice(2);
const REFRESH = process.env.REFRESH === "1";
const stmts: string[] = [];
let applied = 0, skippedReview = 0, nothing = 0;
const ids: number[] = [];

for (const f of inFiles) {
  for (const r of JSON.parse(readFileSync(f, "utf8")) as { id: number; url: string; ok: boolean; facts: ArticleFacts }[]) {
    if (!r.ok) continue;
    const x = r.facts;
    const blocking = x.review.filter((v) => v !== "vacancy-table-partial-dropped" && v !== "age-over-60");
    if (blocking.length) { skippedReview++; continue; }
    const holdAge = x.review.includes("age-over-60");
    const holdPay = (x.salaryMin != null && x.salaryMin < 5000) || (x.salaryMax != null && x.salaryMax > 500000);
    const set: string[] = [];
    const num = (col: string, v: number | undefined) => v != null && set.push(`${col} = coalesce(${col}, ${v})`);
    if (!holdAge) { num("age_limit_min", x.ageLimitMin); num("age_limit_max", x.ageLimitMax); }
    num("application_fee_general", x.applicationFeeGeneral); num("application_fee_reserved", x.applicationFeeReserved);
    if (!holdPay) { num("salary_min", x.salaryMin); num("salary_max", x.salaryMax); }
    const dt = (col: string, v: unknown) => {
      if (v) set.push(`${col} = coalesce(${col}, ${q(new Date(v as string).toISOString())}::timestamptz)`);
    };
    dt("valid_through", x.validThrough); dt("exam_date", x.examDate);
    if (x.applyUrl && !isAggregatorUrl(x.applyUrl)) set.push(`apply_url = coalesce(nullif(apply_url, ''), ${q(x.applyUrl)})`);
    if (x.officialNotificationUrl && !isAggregatorUrl(x.officialNotificationUrl))
      set.push(`official_notification_url = coalesce(nullif(official_notification_url, ''), ${q(x.officialNotificationUrl)})`);
    const tables = (x.extraContent?.tables ?? []).filter((t) => !mentionsAggregator(JSON.stringify(t)));
    if (tables.length) set.push(REFRESH ? `extra_content = ${q(JSON.stringify({ tables }))}::jsonb` : `extra_content = coalesce(extra_content, ${q(JSON.stringify({ tables }))}::jsonb)`);
    if (!set.length) { nothing++; continue; }
    set.push("updated_at = now()");
    stmts.push(`update public.postings set ${set.join(", ")} where id = ${r.id} and source_url = ${q(r.url)};`);
    ids.push(r.id);
    applied++;
  }
}
const CHUNK = Number(process.env.CHUNK ?? 0);
const base = process.argv[2];
const groups: { stmts: string[]; ids: number[] }[] = [];
if (CHUNK > 0) {
  for (let i = 0; i < stmts.length; i += CHUNK) groups.push({ stmts: stmts.slice(i, i + CHUNK), ids: ids.slice(i, i + CHUNK) });
} else groups.push({ stmts, ids });
groups.forEach((g, n) => {
  const tag = CHUNK > 0 ? `full_${String(n + 1).padStart(2, "0")}` : (base.includes("b2") ? "b2" : "b1");
  const file = CHUNK > 0 ? base.replace(/\.sql$/, `_${String(n + 1).padStart(2, "0")}.sql`) : base;
  const header = `-- PQ-008 fill-only enrichment from public notification facts. Generated ${new Date().toISOString().slice(0, 10)}. Part ${n + 1} of ${groups.length}.
-- Fill-only: coalesce() never overwrites an existing value${REFRESH ? " (exception: extra_content, rebuilt from the corrected tables when it came from this enrichment)" : ""}. Each row guarded by id AND source_url.
create table if not exists backup_20261005.postings_enrich_${tag} as
  select * from public.postings where id in (${g.ids.join(",")});
`;
  const footer = `
select count(*) filter (where age_limit_max is not null) with_age, count(*) filter (where application_fee_general is not null) with_fee,
       count(*) filter (where salary_min > 0) with_pay, count(*) filter (where nullif(apply_url,'') is not null) with_apply,
       count(*) filter (where valid_through is not null) with_deadline
from public.postings where id in (${g.ids.join(",")});
`;
  writeFileSync(file, header + g.stmts.join("\n") + "\n" + footer);
});
console.log(JSON.stringify({ applied, skippedReview, nothing, files: groups.length }));
