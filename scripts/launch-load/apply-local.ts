/**
 * Applies an export directory to a LOCAL scratch database, with the same stop rules the
 * production application must follow: each chunk file is checked against its manifest
 * hash, applied in order, and each table is verified (count and fingerprint of the
 * manifest rows) as soon as its last chunk is in. The first mismatch stops the run.
 * No silent reconciliation: nothing is retried, repaired or skipped.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { fingerprintExpr, keyArray } from "./export";
import { TABLES } from "./tables";

export async function verifyTable(sql: postgres.Sql, manifest: any, table: string) {
  const spec = TABLES.find((t) => t.name === table)!;
  const keys = JSON.stringify(manifest.tables[table].keys);
  const r = await sql.unsafe(
    `select count(*)::int as n, coalesce(md5(string_agg(fp, '' order by k::text)), md5('')) as fp from (
       select ${keyArray(table)} as k, ${fingerprintExpr(spec, manifest.trimRaw)} as fp from public.${table} t
       where ${keyArray(table)} in (select jsonb_array_elements($k$${keys}$k$::jsonb))
     ) x`,
  );
  return r[0] as unknown as { n: number; fp: string };
}

export async function applyDir(targetUrl: string, dir: string, opts: { stopAfterChunk?: number } = {}) {
  const host = new URL(targetUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) throw new Error(`apply-local refuses non-local host "${host}"`);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const sql = postgres(targetUrl, { max: 1, onnotice: () => {} });
  const log: string[] = [];
  try {
    const remaining: Record<string, number> = {};
    for (const c of manifest.chunks) remaining[c.table] = (remaining[c.table] ?? 0) + 1;
    for (const c of manifest.chunks) {
      const body = readFileSync(join(dir, "chunks", c.file), "utf8");
      const sha = createHash("sha256").update(body).digest("hex");
      if (sha !== c.sha256) throw new Error(`STOP: chunk ${c.file} does not match its manifest hash`);
      if (opts.stopAfterChunk && c.seq > opts.stopAfterChunk) break;
      await sql.unsafe(body);
      log.push(`applied ${c.file} (${c.rows} rows)`);
      remaining[c.table]--;
      if (remaining[c.table] === 0) {
        const got = await verifyTable(sql, manifest, c.table);
        const exp = manifest.expectedVerify[c.table];
        if (got.n !== exp.n || got.fp !== exp.fp) throw new Error(`STOP: ${c.table} verification mismatch (expected ${exp.n}/${exp.fp}, got ${got.n}/${got.fp})`);
        log.push(`verified ${c.table}: ${got.n} rows, fingerprint equal`);
      }
    }
  } finally {
    await sql.end();
  }
  return log;
}

export async function rollbackDir(targetUrl: string, dir: string) {
  const host = new URL(targetUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) throw new Error(`rollback-local refuses non-local host "${host}"`);
  const sql = postgres(targetUrl, { max: 1, onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, "rollback.sql"), "utf8"));
    });
  } finally {
    await sql.end();
  }
}
