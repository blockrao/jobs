/**
 * Runs the live-database invariants. Opt-in: set CONTRACT_DATABASE_URL to a
 * Postgres connection string (read-only role is sufficient). Without it the
 * whole suite is skipped — it never falls back to DATABASE_URL, so running
 * `npm test` can't touch production by accident.
 */
import { afterAll, describe, expect, test } from "vitest";
import postgres from "postgres";
import { readSource } from "../helpers/source";
import { DB_INVARIANTS, LIVE_COLUMNS_SQL } from "./invariants";

const url = process.env.CONTRACT_DATABASE_URL;
const sql = url ? postgres(url, { max: 1, connect_timeout: 10, idle_timeout: 5 }) : null;

afterAll(async () => {
  await sql?.end();
});

describe.skipIf(!sql)("live database invariants", () => {
  test.each(DB_INVARIANTS)("$id $title", async ({ sql: query }) => {
    const [row] = await sql!.unsafe(query);
    expect(Number(row.violations)).toBe(0);
  });

  // Actual DB schema = application schema (protocol §11). Fails until W2.
  test("SCH-01 every live column is declared in src/db/schema.ts and vice versa", async () => {
    const live = new Map<string, Set<string>>();
    for (const r of await sql!.unsafe(LIVE_COLUMNS_SQL)) {
      if (!live.has(r.table_name)) live.set(r.table_name, new Set());
      live.get(r.table_name)!.add(r.column_name);
    }

    const src = readSource("src/db/schema.ts");
    const orm = new Map<string, Set<string>>();
    const re = /pgTable\(\s*"([a-z_]+)"\s*,\s*\{/g;
    for (let m = re.exec(src); m; m = re.exec(src)) {
      let i = re.lastIndex;
      for (let depth = 1; depth > 0 && i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") depth--;
      }
      const cols = [...src.slice(re.lastIndex, i).matchAll(/^\s*\w+:\s*\w+\(\s*"([a-z_0-9]+)"/gm)].map((x) => x[1]);
      orm.set(m[1], new Set(cols));
    }

    const drift: string[] = [];
    for (const table of new Set([...live.keys(), ...orm.keys()])) {
      const l = live.get(table);
      const o = orm.get(table);
      if (!l) drift.push(`${table}: declared in schema.ts, missing live`);
      else if (!o) drift.push(`${table}: live, not declared in schema.ts`);
      else {
        for (const c of l) if (!o.has(c)) drift.push(`${table}.${c}: live only`);
        for (const c of o) if (!l.has(c)) drift.push(`${table}.${c}: schema.ts only`);
      }
    }
    expect(drift).toEqual([]);
  });
});
