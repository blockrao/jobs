import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import * as schemaV2 from "./schema-v2";

function createDb() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  return drizzle(client, { schema });
}

function createDbV2() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  return drizzle(client, { schema: schemaV2 });
}

let _db: ReturnType<typeof createDb> | null = null;
let _dbV2: ReturnType<typeof createDbV2> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

export function getDbV2() {
  if (!_dbV2) _dbV2 = createDbV2();
  return _dbV2;
}
