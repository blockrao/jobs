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

    // Discover static first-segment routes from the real App Router tree.
    // Route groups add no URL segment, so inspect their immediate children.
    // Dynamic segments are excluded; locale roots are reserved explicitly.
    const appRoot = path.join(dirname, "../src/app");
    const reservedRootPaths = new Set(["en", "hi", "_next"]);
    function collectStaticRoutes(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith("[")) continue;
        if (entry.name.startsWith("(")) {
          collectStaticRoutes(path.join(directory, entry.name));
        } else {
          reservedRootPaths.add(entry.name);
        }
      }
    }
    collectStaticRoutes(appRoot);

    // Static routes are discovered from the real route tree above; validate
    // every database slug against those routes before emitting the manifest.
    if (slugs.length === 0) throw new Error("Empty exams table; refusing empty manifest");
    const seen = new Set();
    const validatedSlugs = slugs.map((slug) => {
      if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(`Invalid exam slug: ${String(slug)}`);
      }
      if (reservedRootPaths.has(slug)) throw new Error(`Exam slug collides with root route: ${slug}`);
      if (seen.has(slug)) throw new Error(`Duplicate exam slug: ${slug}`);
      seen.add(slug);
      return slug;
    });

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
