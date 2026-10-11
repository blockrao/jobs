#!/usr/bin/env node
/**
 * Generate the bounded allowlist used to redirect legacy root-level exam URLs.
 *
 * This runs before next build. It must fail closed: a missing DATABASE_URL,
 * failed query, empty exam table, or invalid slug prevents a release build
 * rather than silently publishing a manifest that loses legacy redirects.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { validateLegacyExamSlugs } from "../src/lib/legacy-exam-routing";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(dirname, "../src/lib/legacy-exam-slugs.generated.json");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to generate the legacy exam slug manifest");
  }

  const sql = postgres(connectionString, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 1,
    prepare: false,
  });

  try {
    const rows = await sql`SELECT slug FROM exams ORDER BY slug`;
    const slugs = rows.map((row) => row.slug);

    // Static routes are discovered from the real route tree above; validate
    // every database slug against those routes before emitting the manifest.
    const validatedSlugs = validateLegacyExamSlugs(slugs, reservedRootPaths);

    fs.writeFileSync(output, `${JSON.stringify(validatedSlugs, null, 2)}\n`, "utf8");
    process.stdout.write(`Generated legacy exam slug manifest: ${validatedSlugs.length} unique slugs\n`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  process.stderr.write(`Failed to generate legacy exam slug manifest: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
