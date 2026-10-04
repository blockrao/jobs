/**
 * SCRATCH ONLY. Simulates "a reviewed organization seed list exists": creates a
 * canonical organization plus alias for every labelled organization name in the
 * captured dataset that passes the validators. Used only to measure listing,
 * lifecycle and sitemap behaviour at ~900 loaded notices. It is NOT part of the
 * pilot's organization result and never runs against a non-local database.
 *
 *   DATABASE_URL=postgres://...@localhost:.../scratch npx tsx src/scripts/wp001-simulate-resolved.ts fja_listings.jsonl
 */
import { assertScratchDatabase } from "./wp001-guard";

async function main() {
  assertScratchDatabase();
  const file = process.argv[2];
  if (!file) throw new Error("usage: wp001-simulate-resolved.ts <fja_listings.jsonl>");
  const { getDb } = await import("../db");
  const { organizations } = await import("../db/schema");
  const { loadFjaFile } = await import("../ingest/adapters/freejobalert-file");
  const { addAlias, normalizeOrgName, orgNameVerdict } = await import("../ingest/organization-resolution");
  const db = getDb();
  const { postings } = loadFjaFile(file);
  const seen = new Set<string>();
  let n = 0;
  for (const p of postings) {
    if (!p.organizationName || !orgNameVerdict(p.organizationName).ok) continue;
    const norm = normalizeOrgName(p.organizationName);
    if (seen.has(norm)) continue;
    seen.add(norm);
    const slug = `${norm.replace(/ /g, "-").slice(0, 150)}-sim`;
    await db.insert(organizations).values({ slug, name: p.organizationName.slice(0, 200), sector: "GOVERNMENT_CENTRAL" }).onConflictDoNothing({ target: organizations.slug });
    const row = await db.query.organizations.findFirst({ where: (o, { eq }) => eq(o.slug, slug) });
    if (row) {
      await addAlias(db, row.id, p.organizationName, "simulation");
      n++;
    }
  }
  console.log(`simulated ${n} resolved organizations`);
  process.exit(0);
}
main();
