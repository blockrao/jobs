#!/usr/bin/env node
/**
 * Generate the bounded allowlist used to redirect legacy root-level exam URLs.
 *
 * This runs before next build. Builds use the reviewed, committed manifest
 * snapshot by default and do not need production database connectivity.
 * To intentionally refresh the snapshot during a controlled build, set
 * BUILD_DATABASE_URL. Runtime DATABASE_URL is deliberately ignored here so a
 * configured application database cannot make deployments depend on build-time
 * network access.
 * The snapshot is reviewed in Git and must never be replaced with an empty list.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { validateLegacyExamSlugs } from "../src/lib/legacy-exam-routing";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(dirname, "../src/lib/legacy-exam-slugs.generated.json");

async function main() {
  const connectionString = process.env.BUILD_DATABASE_URL;
  // Build-time DB access is opt-in. Production builds should normally validate
  // and retain the committed snapshot without requiring database connectivity.
  if (!connectionString) {
    if (!fs.existsSync(output)) {
      throw new Error("BUILD_DATABASE_URL is unavailable and no committed legacy exam manifest exists");
    }
    const existing = JSON.parse(fs.readFileSync(output, "utf8"));
    const appRoot = path.join(dirname, "../src/app");
    const reservedRootPaths = new Set(["en", "hi", "_next"]);
    function collectStaticRoutes(directory: string): void {
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
    const validated = validateLegacyExamSlugs(existing, reservedRootPaths);
    process.stdout.write(`Validated committed legacy exam manifest: ${validated.length} unique slugs (BUILD_DATABASE_URL unavailable)\n`);
    return;
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
    const appRoot = path.join(dirname, "../src/app");
    const reservedRootPaths = new Set(["en", "hi", "_next"]);
    function collectStaticRoutes(directory: string): void {
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
