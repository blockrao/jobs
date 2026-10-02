import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// There used to be a second client (getDbV2) built against a separate
// schema-v2.ts — a hand-maintained, independent description of the same
// physical Postgres database that drifted from reality (wrong column
// names, FKs pointing at orphaned tables — see the comment block in
// schema.ts above the canonical-entity-layer tables). One client, one
// schema, one source of truth now.
function createDb() {
  const client = postgres(process.env.DATABASE_URL!, {
    prepare: false,
    // Without this, an unreachable/misrouted DB (wrong host, network
    // filtering a build environment doesn't surface as a DNS error, a
    // transient pooler hiccup) hangs the connection indefinitely instead
    // of failing — which stalls page builds and requests rather than
    // letting the existing try/catch fallbacks (empty state) kick in.
    // 10s is generous for Supabase's pooler but still bounded.
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

/** @deprecated Use getDb() — there is only one schema now. */
export function getDbV2() {
  return getDb();
}
