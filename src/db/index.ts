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
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  console.log(`[createDb] Initializing database connection to ${dbUrl.replace(/:[^@]+@/, ':***@')}`);
  try {
    const client = postgres(dbUrl, {
      prepare: false,
      // Without this, an unreachable/misrouted DB (wrong host, network
      // filtering a build environment doesn't surface as a DNS error, a
      // transient pooler hiccup) hangs the connection indefinitely instead
      // of failing — which stalls page builds and requests rather than
      // letting the existing try/catch fallbacks (empty state) kick in.
      // 10s is generous for Supabase's pooler but still bounded.
      connect_timeout: 10,
    });
    const db = drizzle(client, { schema });
    console.log("[createDb] Database connection initialized successfully");
    return db;
  } catch (err) {
    console.error("[createDb] Failed to initialize database:", err instanceof Error ? err.message : String(err));
    throw err;
  }
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
