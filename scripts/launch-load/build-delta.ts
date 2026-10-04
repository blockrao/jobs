/**
 * Builds ONE deterministic SQL file for an INCREMENTAL launch load (rows added after the first load):
 *
 *   npx tsx scripts/launch-load/build-delta.ts --export <delta dir> --orig-before before_prod.json \
 *     --cur-max cur_max.json --old postgres://.../scratch_target --new postgres://.../scratch_p2 --out load-delta.sql
 *
 * Run once: psql "$LOAD_URL" -X -v ON_ERROR_STOP=1 -f load-delta.sql
 *
 * One transaction; any error or failed check rolls everything back. In order:
 *   1  guard: nothing above the current max ids (no earlier delta applied); exactly the expected
 *      link state on the observation rows that will be updated
 *   2  snapshot (hash) of every row loaded by the first load, and baseline check of the original rows
 *   3  insert-only chunks (new rows; parents resolved by natural key)
 *   4  manifest check of the new rows (count and fingerprint)
 *   5  exact-key UPDATE of the observation rows whose notice now has a posting (outcome, outcome_reason,
 *      posting_id, candidate_id only), each must change exactly one row
 *   6  full-table fingerprint of observations equals the rehearsal; snapshot of all earlier rows unchanged
 *      (observations excepted); baseline check again
 *   7  summary, COMMIT
 * No promotion, no urgency refresh.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { STATE_TABLES } from "./state-hash";
import { fingerprintExpr, keyArray } from "./export";
import { TABLES } from "./tables";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const dir = arg("export")!;
const origFile = arg("orig-before")!;
const curFile = arg("cur-max")!;
const oldUrl = arg("old")!;
const newUrl = arg("new")!;
const outFile = arg("out")!;
for (const u of [oldUrl, newUrl]) {
  const h = new URL(u).hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(h)) throw new Error(`comparison databases must be local (got ${h})`);
}

const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const orig: Record<string, [number, number, string]> = JSON.parse(readFileSync(origFile, "utf8"));
const cur: Record<string, number> = JSON.parse(readFileSync(curFile, "utf8"));
const NO_ID = new Set(["posting_categories"]);
const loadTables = TABLES.map((s) => s.name);
const SNAP_TABLES = loadTables.filter((t) => t !== "source_observations");

const baselineQuery = STATE_TABLES.map((t) =>
  NO_ID.has(t)
    ? `select '${t}' as tbl, count(*)::int as n, coalesce(md5(string_agg(md5(x::text), '' order by md5(x::text))), md5('')) as h from public.${t} x`
    : `select '${t}' as tbl, count(*)::int as n, coalesce(md5(string_agg(md5(x::text), '' order by x.id)), md5('')) as h from public.${t} x where x.id <= ${orig[t][0]}`,
).join("\nunion all\n");

const verifyQuery = TABLES.map((spec) => {
  const t = spec.name;
  return `select '${t}' as tbl, count(*)::int as n, coalesce(md5(string_agg(fp, '' order by k::text collate "C")), md5('')) as fp from (select ${keyArray(t)} as k, ${fingerprintExpr(spec, manifest.trimRaw)} as fp from public.${t} t where t.id > ${cur[t]}) x`;
}).join("\nunion all\n");

/** Hash of every row at or below the current max id, per table (rows from the first load included). */
const snapQuery = SNAP_TABLES.map(
  (t) => `select '${t}' as tbl, count(*)::int as n, coalesce(md5(string_agg(md5(x::text), '' order by x.id)), md5('')) as h from public.${t} x where x.id <= ${cur[t]}`,
).join("\nunion all\n");

const obsSpec = TABLES.find((s) => s.name === "source_observations")!;
const obsFull = `select count(*)::int as n, coalesce(md5(string_agg(fp, '' order by k::text collate "C")), md5('')) as fp from (select ${keyArray("source_observations")} as k, ${fingerprintExpr(obsSpec, manifest.trimRaw)} as fp from public.source_observations t) x`;

async function main() {
  const A = postgres(oldUrl, { max: 1, onnotice: () => {} });
  const B = postgres(newUrl, { max: 1, onnotice: () => {} });
  const q = `select o.source, o.external_id, o.content_hash, o.outcome, o.outcome_reason,
      (select jsonb_build_array(p.slug) from public.postings p where p.id = o.posting_id) as posting,
      (select jsonb_build_array(c.normalized_name, c.source) from public.organization_candidates c where c.id = o.candidate_id) as candidate
    from public.source_observations o order by 1, 2, 3`;
  const [oldRows, newRows] = await Promise.all([A.unsafe(q), B.unsafe(q)]);
  const key = (r: any) => JSON.stringify([r.source, r.external_id, r.content_hash]);
  const oldMap = new Map(oldRows.map((r: any) => [key(r), r]));
  const updates: any[] = [];
  for (const n of newRows as any[]) {
    const o: any = oldMap.get(key(n));
    if (!o) throw new Error(`observation ${key(n)} exists in the rehearsal but not in the baseline copy (an INSERT would be needed)`);
    const same = o.outcome === n.outcome && o.outcome_reason === n.outcome_reason && JSON.stringify(o.posting) === JSON.stringify(n.posting) && JSON.stringify(o.candidate) === JSON.stringify(n.candidate);
    if (!same) {
      updates.push({
        k: [n.source, n.external_id, n.content_hash],
        old: { outcome: o.outcome, outcome_reason: o.outcome_reason, posting: o.posting, candidate: o.candidate },
        new: { outcome: n.outcome, outcome_reason: n.outcome_reason, posting: n.posting, candidate: n.candidate },
      });
    }
  }
  if (newRows.length !== oldRows.length) throw new Error("observation counts differ between the two copies");
  const expectObs: any = (await B.unsafe(obsFull))[0];
  await A.end();
  await B.end();
  const upJson = JSON.stringify(updates);
  if (upJson.includes("$lj$")) throw new Error("payload contains the dollar-quote tag");

  const out: string[] = [];
  out.push(`-- launch-load delta: single transaction. Generated ${new Date().toISOString()}.`);
  out.push(`-- Any error stops psql (ON_ERROR_STOP) and rolls the whole transaction back.`);
  out.push(`\\set ON_ERROR_STOP on`);
  out.push(`\\set ON_ERROR_ROLLBACK off`);
  out.push(`\\timing off`);
  out.push(`begin;`);
  out.push(`set local timezone = 'UTC';`);
  out.push(`set local datestyle = 'ISO, MDY';`);
  out.push(`set local statement_timeout = 0;`);
  out.push(`set local lock_timeout = '60s';`);
  out.push(`create temp table _ll_base (tbl text primary key, n int, h text) on commit drop;`);
  out.push(`insert into _ll_base values ${STATE_TABLES.map((t) => `('${t}', ${orig[t][1]}, '${orig[t][2]}')`).join(", ")};`);
  out.push(`create temp table _ll_exp (tbl text primary key, n int, fp text) on commit drop;`);
  out.push(`insert into _ll_exp values ${TABLES.map((s) => `('${s.name}', ${manifest.expectedVerify[s.name].n}, '${manifest.expectedVerify[s.name].fp}')`).join(", ")};`);
  out.push(`create temp table _ll_up (j jsonb) on commit drop;`);
  out.push(`insert into _ll_up select jsonb_array_elements($lj$${upJson}$lj$::jsonb);`);

  out.push(`\\echo == 1. state guard`);
  out.push(`do $g$
declare v_cnt int; v_bad int;
begin
  select (${loadTables.map((t) => `(select count(*) from public.${t} where id > ${cur[t]})`).join(" + ")}) into v_cnt;
  if v_cnt <> 0 then raise exception 'unexpected state: % rows exist above the current max ids (a delta was already applied?); nothing was changed', v_cnt; end if;
  select count(*) into v_bad from _ll_up u where not exists (
    select 1 from public.source_observations o
    where o.source = u.j->'k'->>0 and o.external_id = u.j->'k'->>1 and o.content_hash = u.j->'k'->>2
      and o.outcome is not distinct from u.j->'old'->>'outcome' and o.outcome_reason is not distinct from u.j->'old'->>'outcome_reason'
      and (select jsonb_build_array(p.slug) from public.postings p where p.id = o.posting_id) is not distinct from nullif(u.j->'old'->'posting','null'::jsonb)
      and (select jsonb_build_array(c.normalized_name, c.source) from public.organization_candidates c where c.id = o.candidate_id) is not distinct from nullif(u.j->'old'->'candidate','null'::jsonb));
  if v_bad <> 0 then raise exception 'unexpected state: % of ${updates.length} observation rows are not in the expected before-state; nothing was changed', v_bad; end if;
  raise notice 'state: as expected (no rows above the max ids; ${updates.length} observation rows in the expected before-state)';
end $g$;`);

  const baselineCheck = (label: string) =>
    `do $b$
declare bad text;
begin
  select string_agg(v.tbl, ', ') into bad from (
${baselineQuery}
  ) v join _ll_base e using (tbl) where v.n is distinct from e.n or v.h is distinct from e.h;
  if bad is not null then raise exception '${label}: original rows differ from the recorded baseline in: %', bad; end if;
  raise notice '${label}: original rows identical to the recorded baseline (all ${STATE_TABLES.length} tables)';
end $b$;`;
  out.push(`\\echo == 2. snapshot and baseline check`);
  out.push(`create temp table _ll_snap on commit drop as ${snapQuery};`);
  out.push(baselineCheck("BEFORE"));

  out.push(`\\echo == 3. load`);
  let last = "";
  for (const c of manifest.chunks) {
    const body = readFileSync(join(dir, "chunks", c.file), "utf8");
    if (createHash("sha256").update(body).digest("hex") !== c.sha256) throw new Error(`chunk ${c.file} does not match its manifest hash`);
    if (c.table !== last) {
      if (last) out.push(`\\echo applied ${last}`);
      last = c.table;
    }
    out.push(body.trimEnd());
  }
  if (last) out.push(`\\echo applied ${last}`);

  out.push(`\\echo == 4. manifest check`);
  out.push(`do $m$
declare bad text;
begin
  select string_agg(v.tbl || ' (got ' || v.n || ' rows, expected ' || e.n || ')', '; ') into bad from (
${verifyQuery}
  ) v join _ll_exp e using (tbl) where v.n is distinct from e.n or v.fp is distinct from e.fp;
  if bad is not null then raise exception 'manifest check failed: %', bad; end if;
  raise notice 'manifest check: every new row matches the manifest (count and fingerprint)';
end $m$;`);

  out.push(`\\echo == 5. observation link updates`);
  out.push(`do $u$
declare r record; c int; total int := 0;
begin
  for r in select j from _ll_up loop
    update public.source_observations o set
      outcome = r.j->'new'->>'outcome',
      outcome_reason = r.j->'new'->>'outcome_reason',
      posting_id = (select p.id from public.postings p where jsonb_build_array(p.slug) = nullif(r.j->'new'->'posting','null'::jsonb)),
      candidate_id = (select cc.id from public.organization_candidates cc where jsonb_build_array(cc.normalized_name, cc.source) = nullif(r.j->'new'->'candidate','null'::jsonb))
    where o.source = r.j->'k'->>0 and o.external_id = r.j->'k'->>1 and o.content_hash = r.j->'k'->>2;
    get diagnostics c = row_count;
    if c <> 1 then raise exception 'observation update touched % rows for key %', c, r.j->'k'; end if;
    total := total + 1;
  end loop;
  if total <> ${updates.length} then raise exception 'expected ${updates.length} observation updates, applied %', total; end if;
  raise notice 'observation updates: % rows, one each', total;
end $u$;`);

  out.push(`\\echo == 6. final checks`);
  out.push(`do $f$
declare v_n int; v_fp text; bad text;
begin
  select v.n, v.fp into v_n, v_fp from (${obsFull}) v;
  if v_n <> ${expectObs.n} or v_fp <> '${expectObs.fp}' then raise exception 'observations do not equal the rehearsal (got % rows, fingerprint %)', v_n, v_fp; end if;
  select string_agg(v.tbl, ', ') into bad from (
${snapQuery}
  ) v join _ll_snap s using (tbl) where v.n is distinct from s.n or v.h is distinct from s.h;
  if bad is not null then raise exception 'rows loaded earlier changed in: %', bad; end if;
  raise notice 'final: observations equal the rehearsal; every row loaded earlier is unchanged (observations excepted)';
end $f$;`);
  out.push(baselineCheck("AFTER"));

  out.push(`\\echo == 7. summary`);
  out.push(`select tbl, rows_added from (values
${loadTables.map((t) => `  ('${t}', (select count(*) from public.${t} where id > ${cur[t]}))`).join(",\n")}
) s(tbl, rows_added);`);
  out.push(`select (select count(*) from organizations) organizations, (select count(*) from organization_aliases) aliases, (select count(*) from organization_candidates) candidates, (select count(*) from recruitments) recruitments, (select count(*) from posts) posts, (select count(*) from postings) postings, (select count(*) from postings where review_status = 'PENDING' and publishing_status = 'DRAFT' and id > ${cur.postings}) new_pending_draft_postings, (select count(*) from source_documents) source_documents, (select count(*) from source_observations) observations, (select count(*) from source_observations where posting_id is not null) observations_linked_to_posting;`);
  out.push(`commit;`);
  out.push(`\\echo COMMITTED`);
  writeFileSync(outFile, out.join("\n") + "\n");
  console.log(`wrote ${outFile}: ${manifest.chunks.length} chunks, ${updates.length} observation updates`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
