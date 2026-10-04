/**
 * Launch-load exporter (scratch -> chunked SQL, manifest, verify and rollback scripts).
 *
 *   npx tsx scripts/launch-load/export.ts --source postgres://...scratch --prod-keys prod_keys.json --out out/dir [--chunk-bytes 60000] [--trim-raw]
 *
 * READS the source database only. Writes files only. Never connects to production.
 * Inserts carry natural keys, never serial ids. Existing production keys (listed in
 * --prod-keys) are excluded and counted, never overwritten. No ON CONFLICT clause is
 * used: a conflict at apply time must stop the load, not be absorbed.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { GUARDED_UNEXPORTED, KEY_EXPR, TABLES, type TableSpec } from "./tables";
import { BOUNDED_TABLES, parametricSql } from "./state-hash";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (n: string) => process.argv.includes(`--${n}`);

const ident = (s: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error(`unsafe identifier ${s}`);
  return s;
};

/** Key expression list rebound from alias `t` to another alias. */
export function keyExprs(table: string, alias = "t"): string {
  const exprs = KEY_EXPR[table];
  if (!exprs) throw new Error(`no natural key defined for ${table}`);
  return exprs.map((e) => e.replace(/\bt\./g, `${alias}.`)).join(", ");
}
export const keyArray = (table: string, alias = "t") => `jsonb_build_array(${keyExprs(table, alias)})`;

/** Columns excluded from the row fingerprint: ids, foreign-id columns, null-forced columns. */
export function fingerprintExcluded(spec: TableSpec, trimRaw: boolean): string[] {
  const cols = ["id", ...spec.fks.map((f) => f.column), ...(spec.nullColumns ?? [])];
  if (trimRaw && spec.name === "source_observations") cols.push("raw");
  return cols;
}

/** Row fingerprint SQL over alias `t`: the row without ids/FKs plus each parent's natural key. */
export function fingerprintExpr(spec: TableSpec, trimRaw: boolean): string {
  const excl = fingerprintExcluded(spec, trimRaw)
    .map((c) => `- '${ident(c)}'`)
    .join(" ");
  const parents = spec.fks
    .map((f) => `coalesce((select ${keyArray(f.parent, "p")}::text from public.${ident(f.parent)} p where p.id = t.${ident(f.column)}), '')`)
    .join(", ");
  const parts = [`(to_jsonb(t) ${excl})::text`];
  if (parents) parts.push(parents);
  return `md5(concat_ws('|', ${parts.join(", ")}))`;
}

async function main() {
  const sourceUrl = arg("source");
  const prodKeysFile = arg("prod-keys");
  const outDir = arg("out");
  if (!sourceUrl || !prodKeysFile || !outDir) throw new Error("--source, --prod-keys and --out are required");
  const host = new URL(sourceUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) throw new Error(`export reads a local scratch database only (got host "${host}")`);
  const chunkBytes = Number(arg("chunk-bytes") ?? 60000);
  const trimRaw = flag("trim-raw");

  const prodKeys: Record<string, unknown[][]> = JSON.parse(readFileSync(prodKeysFile, "utf8"));
  const sql = postgres(sourceUrl, { max: 2, onnotice: () => {} });
  mkdirSync(join(outDir, "chunks"), { recursive: true });

  // Guard: tables this tool does not export must not hold anything the target would miss.
  const guarded: Record<string, number> = {};
  for (const t of GUARDED_UNEXPORTED) {
    const r = await sql.unsafe(`select count(*)::int n from public.${ident(t)}`).catch(() => [{ n: 0 }]);
    guarded[t] = r[0].n;
    if (r[0].n > 0) throw new Error(`source holds ${r[0].n} rows in ${t}, which this exporter does not carry; refusing to drop them silently`);
  }

  const manifest: any = {
    createdAt: new Date().toISOString(),
    trimRaw,
    tables: {} as Record<string, any>,
    chunks: [] as any[],
    skippedExisting: {} as Record<string, number>,
  };
  let seq = 0;

  for (const spec of TABLES) {
    const t = ident(spec.name);
    const cols: { column_name: string }[] = await sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${t} order by ordinal_position`;
    const fkCols = new Set(spec.fks.map((f) => f.column));
    const nullCols = new Set(spec.nullColumns ?? []);
    const plainCols = cols.map((c) => c.column_name).filter((c) => c !== "id" && !fkCols.has(c));

    const fkSelect = spec.fks
      .map((f) => `(select ${keyArray(f.parent, "p")} from public.${ident(f.parent)} p where p.id = t.${ident(f.column)}) as fk_${ident(f.column)}`)
      .join(", ");
    const rows = await sql.unsafe(
      `select to_jsonb(t) - 'id' as j, ${keyArray(t)} as k, ${fingerprintExpr(spec, trimRaw)} as fp${fkSelect ? ", " + fkSelect : ""}
       from public.${t} t order by ${keyExprs(t)}`,
    );

    const existing = new Set((prodKeys[t] ?? []).map((k) => JSON.stringify(k)));
    const keep = rows.filter((r: any) => !existing.has(JSON.stringify(r.k)));
    manifest.skippedExisting[t] = rows.length - keep.length;

    // Validate foreign keys: a non-nullable FK must resolve in the source.
    for (const r of keep as any[]) {
      for (const f of spec.fks) {
        if (!f.nullable && r[`fk_${f.column}`] == null) throw new Error(`${t}: row ${JSON.stringify(r.k)} has an unresolved required foreign key ${f.column}`);
      }
    }

    const objs = (keep as any[]).map((r) => {
      const j = { ...r.j } as Record<string, unknown>;
      for (const f of spec.fks) delete j[f.column];
      for (const c of nullCols) j[c] = null;
      if (trimRaw && t === "source_observations") j.raw = null;
      const fk: Record<string, unknown> = {};
      for (const f of spec.fks) fk[f.column] = r[`fk_${f.column}`] ?? null;
      return { ...j, _fk: fk };
    });

    manifest.tables[t] = { rows: keep.length, keys: keep.map((r: any) => r.k), columns: plainCols };

    // Chunk by byte budget.
    const colList = [...plainCols.filter((c) => !nullCols.has(c)), ...spec.fks.map((f) => f.column), ...[...nullCols]];
    let i = 0;
    while (i < objs.length) {
      const batch: any[] = [];
      let bytes = 0;
      while (i < objs.length && (batch.length === 0 || bytes + JSON.stringify(objs[i]).length < chunkBytes)) {
        batch.push(objs[i]);
        bytes += JSON.stringify(objs[i]).length;
        i++;
      }
      const json = JSON.stringify(batch);
      if (json.includes("$lj$")) throw new Error("payload contains the dollar-quote tag; choose another");
      const valueExprs = [
        ...plainCols.filter((c) => !nullCols.has(c)).map((c) => `r.${ident(c)}`),
        ...spec.fks.map((f) => `(select p.id from public.${ident(f.parent)} p where ${keyArray(f.parent, "p")} = e->'_fk'->'${ident(f.column)}')`),
        ...[...nullCols].map(() => "null"),
      ];
      seq++;
      const file = `${String(seq).padStart(4, "0")}_${t}.sql`;
      const body =
        `-- launch-load chunk ${seq}: ${t}, ${batch.length} rows\n` +
        `insert into public.${t} (${colList.map(ident).join(", ")})\n` +
        `select ${valueExprs.join(", ")}\n` +
        `from jsonb_array_elements($lj$${json}$lj$::jsonb) e, lateral jsonb_populate_record(null::public.${t}, e) r;\n`;
      writeFileSync(join(outDir, "chunks", file), body);
      manifest.chunks.push({ seq, file, table: t, rows: batch.length, bytes: body.length, sha256: createHash("sha256").update(body).digest("hex") });
    }
  }

  // Verify script: count and aggregate fingerprint of the manifest rows as they stand on a database.
  const verifyParts = TABLES.map((spec) => {
    const t = spec.name;
    const keys = JSON.stringify(manifest.tables[t].keys);
    return (
      `select '${t}' as tbl, count(*)::int as n, coalesce(md5(string_agg(fp, '' order by k::text)), md5('')) as fp from (\n` +
      `  select ${keyArray(t)} as k, ${fingerprintExpr(spec, trimRaw)} as fp from public.${t} t\n` +
      `  where ${keyArray(t)} in (select jsonb_array_elements($k$${keys}$k$::jsonb))\n) x`
    );
  });
  writeFileSync(join(outDir, "verify.sql"), verifyParts.join("\nunion all\n") + ";\n");

  // Rollback script: delete exactly the manifest rows, children first.
  const rollback = [...TABLES].reverse().map((spec) => {
    const t = spec.name;
    const keys = JSON.stringify(manifest.tables[t].keys);
    return `delete from public.${t} t where ${keyArray(t)} in (select jsonb_array_elements($k$${keys}$k$::jsonb));`;
  });
  writeFileSync(join(outDir, "rollback.sql"), `-- Removes exactly the rows listed in the manifest, children first. A foreign-key error means later data depends on them: stop and report.\n${rollback.join("\n")}\n`);

  // Manifest hashes: expected values for verify.sql, computed on the source with the same SQL.
  const expectedRows = await sql.unsafe(readFileSync(join(outDir, "verify.sql"), "utf8").replace(/;\s*$/, ""));
  manifest.expectedVerify = Object.fromEntries(expectedRows.map((r: any) => [r.tbl, { n: r.n, fp: r.fp }]));
  for (const spec of TABLES) {
    const exp = manifest.expectedVerify[spec.name];
    if (exp.n !== manifest.tables[spec.name].rows) {
      throw new Error(`${spec.name}: manifest has ${manifest.tables[spec.name].rows} rows but the source verify query matched ${exp.n} (duplicate natural keys?)`);
    }
  }
  manifest.guardedUnexportedCounts = guarded;
  // Files for the psql application: chunk list, and the state-hash SQL for BEFORE and AFTER.
  writeFileSync(join(outDir, "chunk_list.txt"), manifest.chunks.map((c: any) => `${c.seq}|${c.file}|${c.sha256}`).join("\n") + "\n");
  writeFileSync(join(outDir, "state.sql"), parametricSql());
  writeFileSync(join(outDir, "state_tables.txt"), BOUNDED_TABLES.join("\n") + "\n");
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1));
  await sql.end();

  const summary = Object.fromEntries(TABLES.map((s) => [s.name, { rows: manifest.tables[s.name].rows, skippedExisting: manifest.skippedExisting[s.name] }]));
  console.log(JSON.stringify({ chunks: manifest.chunks.length, bytes: manifest.chunks.reduce((a: number, c: any) => a + c.bytes, 0), summary }, null, 1));
}

if (process.argv[1]?.endsWith("export.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
