#!/usr/bin/env node
/**
 * Generate the bounded allowlist used to redirect legacy root-level exam URLs.
 *
 * This runs before next build. It must fail closed: a missing DATABASE_URL,
 * failed query, empty exam table, or invalid slug prevents a release build
 * rather than silently publishing a manifest that loses legacy redirects.
 */
const fs = require("node:fs");
const path = require("node:path");
const postgres = require("postgres");

const output = path.join(__dirname, "../src/lib/legacy-exam-slugs.generated.json");

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

    if (slugs.length === 0) {
      throw new Error("The exams table returned zero rows; refusing to publish an empty legacy redirect manifest");
    }

    const seen = new Set();
    for (const slug of slugs) {
      if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(`Invalid exam slug in manifest: ${String(slug)}`);
      }
      if (seen.has(slug)) {
        throw new Error(`Duplicate exam slug in manifest: ${slug}`);
      }
      seen.add(slug);
    }

    fs.writeFileSync(output, `${JSON.stringify(slugs, null, 2)}\n`, "utf8");
    process.stdout.write(`Generated legacy exam slug manifest: ${slugs.length} unique slugs\n`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  process.stderr.write(`Failed to generate legacy exam slug manifest: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
