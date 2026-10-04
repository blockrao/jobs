/**
 * Full rehearsal on LOCAL scratch databases (never production):
 *   baseline -> copy to a "target" database -> seed + ingest on the source ->
 *   export -> apply with stop rules -> verify -> before/after hashes of existing rows ->
 *   rollback -> state equals baseline -> negative tests (tampered chunk, key conflict).
 *
 *   npx tsx scripts/launch-load/rehearse.ts --file fja_listings.jsonl --work /path/to/workdir
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { afterSql, beforeSql } from "./state-hash";
import { applyDir, rollbackDir } from "./apply-local";
import { keyArray } from "./export";
import { TABLES } from "./tables";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const file = arg("file")!;
const work = arg("work")!;
const base = "postgres://postgres:pw@localhost:54329";
const SRC = `${base}/scratch`;
const TGT = `${base}/scratch_target`;
mkdirSync(work, { recursive: true });
const results: Record<string, unknown> = {};
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

async function main() {
  const admin = postgres(`${base}/postgres`, { max: 1, onnotice: () => {} });
  const src = postgres(SRC, { max: 2, onnotice: () => {} });
  const RESET =
    "truncate public.source_observations, public.organization_candidates, public.organization_aliases, public.posting_updates, public.posting_categories, public.postings, public.posts, public.recruitments, public.source_documents, public.sources, public.organizations, public.positions restart identity cascade";
  await src.unsafe(RESET);

  // 1. Baseline = what production already holds (orgs and a few postings).
  const orgs = readFileSync("/tmp/claude-0/-home-claude-jobs/ebe34ecd-a993-5fa5-8f05-b9e2a051509b/scratchpad/prodcopy/orgs.txt", "utf8").trim().split("\n").map((l) => l.split("|"));
  for (const [id, name] of orgs) await src`insert into public.organizations (id, slug, name, sector) values (${Number(id)}, ${slugify(name) + "-" + id}, ${name}, 'GOVERNMENT_CENTRAL')`;
  await src`select setval('organizations_id_seq', (select max(id) from organizations))`;
  for (let i = 1; i <= 5; i++)
    await src`insert into public.postings (slug, title, organization_id, review_status, publishing_status, description, kind) values (${"baseline-posting-" + i}, ${"Baseline posting " + i}, ${Number(orgs[0][0])}, 'APPROVED', 'PUBLISHED', 'existing', 'GOVERNMENT')`;
  await src.end();

  // 2. Target = copy of the baseline (stands in for production).
  await admin.unsafe(`select pg_terminate_backend(pid) from pg_stat_activity where datname in ('scratch','scratch_target') and pid <> pg_backend_pid()`);
  await admin.unsafe(`drop database if exists scratch_target`);
  await admin.unsafe(`create database scratch_target template scratch`);

  // 3. Simulated seed (every distinct source organization name becomes an organization + alias) and ingestion on the source.
  const { normalizeOrgName } = await import("../../src/ingest/organization-resolution");
  // Organization names as the source labels them (parsed listing file with an `org` field per notice).
  const parsed = JSON.parse(readFileSync(arg("parsed")!, "utf8"));
  const names = [...new Set(parsed.map((r: any) => r.org).filter(Boolean))] as string[];
  const src2 = postgres(SRC, { max: 2, onnotice: () => {} });
  const have = new Set((await src2`select alias_normalized from public.organization_aliases`).map((r: any) => r.alias_normalized));
  let seeded = 0;
  for (const n of names) {
    const norm = normalizeOrgName(n);
    if (!norm || have.has(norm)) continue;
    const o = await src2`insert into public.organizations (slug, name, sector) values (${slugify(n) + "-s" + seeded}, ${n}, 'GOVERNMENT_CENTRAL') returning id`;
    await src2`insert into public.organization_aliases (organization_id, alias_normalized, alias_raw, source) values (${o[0].id}, ${norm}, ${n}, 'rehearsal')`;
    have.add(norm);
    seeded++;
  }
  await src2.end();
  results.seededOrganizations = seeded;
  execSync(`npx tsx src/ingest/load-file.ts --file ${file} --out ${join(work, "load_report.json")}`, {
    env: { ...process.env, DATABASE_URL: SRC, WP001_SCRATCH_DATABASE_URL: SRC },
    stdio: "ignore",
    timeout: 900000,
  });

  // 4. Production keys (what the target already holds).
  const tgt = postgres(TGT, { max: 2, onnotice: () => {} });
  const prodKeys: Record<string, unknown[]> = {};
  for (const spec of [...TABLES, { name: "exams" } as any]) {
    if (spec.name === "exams") continue;
    prodKeys[spec.name] = (await tgt.unsafe(`select ${keyArray(spec.name)} as k from public.${spec.name} t`)).map((r: any) => r.k);
  }
  writeFileSync(join(work, "prod_keys.json"), JSON.stringify(prodKeys));

  // 5. Export.
  execSync(`npx tsx scripts/launch-load/export.ts --source ${SRC} --prod-keys ${join(work, "prod_keys.json")} --out ${join(work, "out")}`, { stdio: "inherit", timeout: 900000 });
  const manifest = JSON.parse(readFileSync(join(work, "out", "manifest.json"), "utf8"));

  // 6. Before hashes, apply, after hashes.
  const before = await tgt.unsafe(beforeSql());
  const beforeCounts = Object.fromEntries(before.map((r: any) => [r.tbl, r.n]));
  const log = await applyDir(TGT, join(work, "out"));
  results.applyLogTail = log.slice(-4);
  const after = await tgt.unsafe(afterSql(before as any));
  const same = before.every((b: any, i: number) => b.n === after[i].n && b.h === after[i].h);
  results.existingRowsUnchanged = same;
  if (!same) throw new Error("existing rows changed during the load");

  // 7. Rollback returns the target to the baseline.
  await rollbackDir(TGT, join(work, "out"));
  const afterRb = await tgt.unsafe(beforeSql());
  const rbSame = before.every((b: any, i: number) => b.n === afterRb[i].n && b.h === afterRb[i].h);
  results.rollbackRestoresBaseline = rbSame;
  if (!rbSame) throw new Error("rollback did not restore the baseline");

  // 8. Negative tests.
  const out = join(work, "out");
  const firstChunk = manifest.chunks[0];
  appendFileSync(join(out, "chunks", firstChunk.file), "-- tampered\n");
  let tamperStopped = false;
  try { await applyDir(TGT, out); } catch (e: any) { tamperStopped = /manifest hash/.test(e.message); }
  results.tamperedChunkStops = tamperStopped;
  // restore the chunk file by regenerating the export
  execSync(`npx tsx scripts/launch-load/export.ts --source ${SRC} --prod-keys ${join(work, "prod_keys.json")} --out ${out}`, { stdio: "ignore", timeout: 900000 });
  const posting = manifest.tables.postings.keys[0][0];
  const orgsKeys = manifest.tables.organizations.rows;
  await applyDir(TGT, out, { stopAfterChunk: manifest.chunks.findIndex((c: any) => c.table === "postings") });
  // a posting with the same slug appears on the target before the postings chunk is applied: the chunk must fail, not absorb it
  const o = await tgt`select id from public.organizations limit 1`;
  await tgt`insert into public.postings (slug, title, organization_id, review_status, publishing_status, description, kind) values (${posting}, 'racing row', ${o[0].id}, 'PENDING', 'DRAFT', 'x', 'GOVERNMENT')`;
  let conflictStopped = false;
  try { await applyDir(TGT, out); } catch (e: any) { conflictStopped = true; }
  results.keyConflictStops = conflictStopped;
  await tgt`delete from public.postings where slug = ${posting} and title = 'racing row'`;
  await tgt.end();
  await admin.end();

  results.manifestTotals = Object.fromEntries(TABLES.map((s) => [s.name, manifest.tables[s.name].rows]));
  results.baselineCounts = beforeCounts;
  results.chunks = manifest.chunks.length;
  results.bytes = manifest.chunks.reduce((a: number, c: any) => a + c.bytes, 0);
  results.orgsInManifest = orgsKeys;
  writeFileSync(join(work, "rehearsal_result.json"), JSON.stringify(results, null, 1));
  console.log(JSON.stringify(results, null, 1));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
