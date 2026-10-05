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
const stmts: string[] = [];
let applied = 0, skippedReview = 0, nothing = 0;
const ids: number[] = [];

for (const f of inFiles) {
  for (const r of JSON.parse(readFileSync(f, "utf8")) as { id: number; url: string; ok: boolean; facts: ArticleFacts }[]) {
    if (!r.ok) continue;
    const x = r.facts;
    if (x.review.length) { skippedReview++; continue; }
    const set: string[] = [];
    const num = (col: string, v: number | undefined) => v != null && set.push(`${col} = coalesce(${col}, ${v})`);
    num("age_limit_min", x.ageLimitMin); num("age_limit_max", x.ageLimitMax);
    num("application_fee_general", x.applicationFeeGeneral); num("application_fee_reserved", x.applicationFeeReserved);
    num("salary_min", x.salaryMin); num("salary_max", x.salaryMax);
    if (x.applyUrl && !isAggregatorUrl(x.applyUrl)) set.push(`apply_url = coalesce(nullif(apply_url, ''), ${q(x.applyUrl)})`);
    if (x.officialNotificationUrl && !isAggregatorUrl(x.officialNotificationUrl))
      set.push(`official_notification_url = coalesce(nullif(official_notification_url, ''), ${q(x.officialNotificationUrl)})`);
    const tables = (x.extraContent?.tables ?? []).filter((t) => !mentionsAggregator(JSON.stringify(t)));
    if (tables.length) set.push(`extra_content = coalesce(extra_content, ${q(JSON.stringify({ tables }))}::jsonb)`);
    if (!set.length) { nothing++; continue; }
    set.push("updated_at = now()");
    stmts.push(`update postings set ${set.join(", ")} where id = ${r.id} and source_url = ${q(r.url)};`);
    ids.push(r.id);
    applied++;
  }
}
const header = `-- PQ-008 fill-only enrichment from public notification facts. Generated ${new Date().toISOString().slice(0, 10)}.
-- Fill-only: coalesce() never overwrites an existing value. Each row guarded by id AND source_url.
-- Backup first (included), then updates, then a verification query.
create table if not exists backup_20261005.postings_enrich_${process.argv[2].includes("b2") ? "b2" : "b1"} as
  select * from postings where id in (${ids.join(",")});
`;
const footer = `
select count(*) filter (where age_limit_max is not null) with_age, count(*) filter (where application_fee_general is not null) with_fee,
       count(*) filter (where salary_min > 0) with_pay, count(*) filter (where nullif(apply_url,'') is not null) with_apply
from postings where id in (${ids.join(",")});
`;
writeFileSync(outFile, header + stmts.join("\n") + "\n" + footer);
console.log(JSON.stringify({ applied, skippedReview, nothing }));
