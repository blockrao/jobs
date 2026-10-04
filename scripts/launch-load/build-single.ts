/**
 * Builds ONE deterministic SQL file from a validated launch-load export:
 *
 *   npx tsx scripts/launch-load/build-single.ts --export <dir> --before before.json --out load-all.sql
 *
 * Run it with a single command (production connection string held locally):
 *
 *   psql "$LOAD_URL" -X -v ON_ERROR_STOP=1 -f load-all.sql
 *
 * The file is one transaction. Any error (or any failed check) stops psql and the
 * transaction rolls back: nothing is committed. Contents, in order:
 *   0  session settings (UTC, ISO dates) so hashes are comparable
 *   1  state guard: either the exact baseline or the exact known partial load; anything else aborts.
 *      In the partial case only the rows above the baseline ids are removed (children first).
 *   2  baseline check: hashes of every existing row equal the recorded BEFORE hashes
 *   3  the export chunks, byte for byte, in manifest order (INSERT only, no ON CONFLICT)
 *   4  manifest check: count + fingerprint of the loaded rows per table equal the manifest
 *   5  baseline check again: existing rows unchanged
 *   6  summary, then COMMIT
 * No promotion, no urgency refresh, no update of any existing row.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STATE_TABLES } from "./state-hash";
import { fingerprintExpr, keyArray } from "./export";
import { TABLES } from "./tables";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const dir = arg("export")!;
const beforeFile = arg("before")!;
const outFile = arg("out")!;
/** Known partial state to clean up (counts above baseline per table), if present. */
const partial: Record<string, number> | null = arg("partial") ? JSON.parse(arg("partial")!) : null;

const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const before: Record<string, [number, number, string]> = JSON.parse(readFileSync(beforeFile, "utf8"));
const NO_ID = new Set(["posting_categories"]);

const baselineQuery = STATE_TABLES.map((t) =>
  NO_ID.has(t)
    ? `select '${t}' as tbl, count(*)::int as n, coalesce(md5(string_agg(md5(x::text), '' order by md5(x::text))), md5('')) as h from public.${t} x`
    : `select '${t}' as tbl, count(*)::int as n, coalesce(md5(string_agg(md5(x::text), '' order by x.id)), md5('')) as h from public.${t} x where x.id <= ${before[t][0]}`,
).join("\nunion all\n");

const verifyQuery = TABLES.map((spec) => {
  const t = spec.name;
  return `select '${t}' as tbl, count(*)::int as n, coalesce(md5(string_agg(fp, '' order by k::text collate "C")), md5('')) as fp from (select ${keyArray(t)} as k, ${fingerprintExpr(spec, manifest.trimRaw)} as fp from public.${t} t where t.id > ${before[t][0]}) x`;
}).join("\nunion all\n");

const out: string[] = [];
out.push(`-- launch-load: single transaction, insert-only. Generated ${new Date().toISOString()}.`);
out.push(`-- Any error stops psql (ON_ERROR_STOP) and rolls the whole transaction back.`);
out.push(`\\set ON_ERROR_STOP on`);
out.push(`\\set ON_ERROR_ROLLBACK off`);
out.push(`\\timing off`);
out.push(`begin;`);
out.push(`set local timezone = 'UTC';`);
out.push(`set local datestyle = 'ISO, MDY';`);
out.push(`set local statement_timeout = 0;`);
out.push(`set local lock_timeout = '60s';`);
out.push(`set local idle_in_transaction_session_timeout = 0;`);

// expected values
out.push(`create temp table _ll_base (tbl text primary key, n int, h text) on commit drop;`);
out.push(`insert into _ll_base values ${STATE_TABLES.map((t) => `('${t}', ${before[t][1]}, '${before[t][2]}')`).join(", ")};`);
out.push(`create temp table _ll_exp (tbl text primary key, n int, fp text) on commit drop;`);
out.push(`insert into _ll_exp values ${TABLES.map((s) => `('${s.name}', ${manifest.expectedVerify[s.name].n}, '${manifest.expectedVerify[s.name].fp}')`).join(", ")};`);

// 1. state guard + cleanup of the known partial load
const extraCount = (t: string) => `(select count(*) from public.${t} where id > ${before[t][0]})`;
const loadTables = TABLES.map((s) => s.name);
out.push(`\\echo == 1. state guard`);
out.push(`do $g$
declare clean boolean;
declare known boolean;
begin
  clean := ${loadTables.map((t) => `${extraCount(t)} = 0`).join(" and ")};
  known := ${partial ? loadTables.map((t) => `${extraCount(t)} = ${partial[t] ?? 0}`).join(" and ") : "false"};
  if clean then
    raise notice 'state: baseline (no rows above the baseline ids)';
  elsif known then
    raise notice 'state: known partial load; removing exactly the rows above the baseline ids';
    delete from public.source_observations where id > ${before.source_observations[0]};
    delete from public.postings where id > ${before.postings[0]};
    delete from public.posts where id > ${before.posts[0]};
    delete from public.source_documents where id > ${before.source_documents[0]};
    delete from public.recruitments where id > ${before.recruitments[0]};
    delete from public.positions where id > ${before.positions[0]};
    delete from public.organization_candidates where id > ${before.organization_candidates[0]};
    delete from public.organization_aliases where id > ${before.organization_aliases[0]};
    delete from public.organizations where id > ${before.organizations[0]};
  else
    raise exception 'unexpected state: neither the baseline nor the known partial load; nothing was changed';
  end if;
end $g$;`);

// 2. baseline check
const baselineCheck = (label: string) =>
  `do $b$
declare bad text;
begin
  select string_agg(v.tbl, ', ') into bad from (
${baselineQuery}
  ) v join _ll_base e using (tbl) where v.n is distinct from e.n or v.h is distinct from e.h;
  if bad is not null then raise exception '${label}: existing rows differ from the recorded baseline in: %', bad; end if;
  raise notice '${label}: existing rows identical to the recorded baseline (all ${STATE_TABLES.length} tables)';
end $b$;`;
out.push(`\\echo == 2. baseline check`);
out.push(baselineCheck("BEFORE"));

// 3. chunks, byte for byte, hash-checked at build time
out.push(`\\echo == 3. load`);
let lastTable = "";
for (const c of manifest.chunks) {
  const body = readFileSync(join(dir, "chunks", c.file), "utf8");
  if (createHash("sha256").update(body).digest("hex") !== c.sha256) throw new Error(`chunk ${c.file} does not match its manifest hash`);
  if (c.table !== lastTable) {
    if (lastTable) out.push(`\\echo applied ${lastTable}`);
    lastTable = c.table;
  }
  out.push(body.trimEnd());
}
out.push(`\\echo applied ${lastTable}`);

// 4. manifest check
out.push(`\\echo == 4. manifest check`);
out.push(`do $m$
declare bad text;
begin
  select string_agg(v.tbl || ' (got ' || v.n || ' rows, expected ' || e.n || ')', '; ') into bad from (
${verifyQuery}
  ) v join _ll_exp e using (tbl) where v.n is distinct from e.n or v.fp is distinct from e.fp;
  if bad is not null then raise exception 'manifest check failed: %', bad; end if;
  raise notice 'manifest check: every loaded table matches the manifest (count and fingerprint)';
end $m$;`);

// 5. baseline again
out.push(`\\echo == 5. existing rows after load`);
out.push(baselineCheck("AFTER"));

// 6. summary
out.push(`\\echo == 6. summary`);
out.push(`select tbl, rows_added from (values
${TABLES.map((s) => `  ('${s.name}', (select count(*) from public.${s.name} where id > ${before[s.name][0]}))`).join(",\n")}
) s(tbl, rows_added);`);
out.push(`select (select count(*) from organizations) organizations, (select count(*) from organization_aliases) aliases, (select count(*) from organization_candidates) candidates, (select count(*) from recruitments) recruitments, (select count(*) from posts) posts, (select count(*) from postings) postings, (select count(*) from postings where review_status = 'PENDING' and publishing_status = 'DRAFT' and id > ${before.postings[0]}) new_pending_draft_postings, (select count(*) from source_documents) source_documents, (select count(*) from source_observations) observations;`);
out.push(`commit;`);
out.push(`\\echo COMMITTED`);

writeFileSync(outFile, out.join("\n") + "\n");
console.log(`wrote ${outFile}: ${manifest.chunks.length} chunks`);
