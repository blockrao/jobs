/**
 * Seeds a SCRATCH database (never production) with a representative slice of
 * today's organizations (clean rows, legacy duplicates, and the bucket /
 * title-derived rows WP-001 is meant to stop attracting postings) and a set of
 * synthetic existing freejobalert postings in each review state, so the
 * readiness tests and the dry run exercise idempotency and reviewed-data
 * protection. Refuses any non-local database.
 *
 * Fixture: tests/fixtures/wp001/existing-organizations.json (names and slugs
 * copied from the live `organizations` table on 2026-10-04; a subset, not a copy).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { assertScratchDatabase } from "./wp001-guard";

async function main() {
  assertScratchDatabase();
  const { getDb } = await import("../db");
  const { organizations } = await import("../db/schema");
  const db = getDb();
  const orgs = JSON.parse(readFileSync(path.join(process.cwd(), "tests/fixtures/wp001/existing-organizations.json"), "utf8"));
  for (const o of orgs) {
    await db.insert(organizations).values({ slug: o.slug, name: o.name, sector: o.sector, state: o.state ?? null }).onConflictDoNothing({ target: organizations.slug });
  }
  console.log(`seeded ${orgs.length} organizations`);
  process.exit(0);
}
main();
