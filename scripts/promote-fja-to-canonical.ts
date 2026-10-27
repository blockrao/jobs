#!/usr/bin/env tsx
/**
 * promote-fja-to-canonical.ts
 *
 * Reads FJA inventory rows with detail_status = 'EXTRACTED', converts each to
 * a NormalizedPosting and feeds it through writePostingsToDB().
 *
 * Safety flags:
 *   FJA_PROMOTE_DRY_RUN=1          — resolves orgs and prints report; writes nothing
 *   FJA_PROMOTE_EXTERNAL_IDS=a,b,c — process only these external_ids (pilot mode)
 *   FJA_PROMOTE_LIMIT=N            — cap rows processed (default 50 in dry-run, unlimited otherwise)
 *
 * Usage:
 *   FJA_PROMOTE_DRY_RUN=1 npx tsx scripts/promote-fja-to-canonical.ts
 *   FJA_PROMOTE_DRY_RUN=1 FJA_PROMOTE_EXTERNAL_IDS=3070757 npx tsx scripts/promote-fja-to-canonical.ts
 *   FJA_PROMOTE_EXTERNAL_IDS=3070757 npx tsx scripts/promote-fja-to-canonical.ts
 */

import { getDb } from "../src/db";
import { loadOrgIndex, resolveOrganization } from "../src/ingest/organization-resolution";
import { writePostingsToDB } from "../src/db/operations/write-postings-v2";
import type { DedupedPosting } from "../src/ingest/deduplicate";
import type { NormalizedPosting } from "../src/ingest/normalize";
import { deterministicSlug, slugify } from "../src/ingest/normalize";
import { sql } from "drizzle-orm";

const DRY_RUN = process.env.FJA_PROMOTE_DRY_RUN === "1";
const PILOT_IDS = process.env.FJA_PROMOTE_EXTERNAL_IDS
  ? process.env.FJA_PROMOTE_EXTERNAL_IDS.split(",").map((s) => s.trim()).filter(Boolean)
  : null;
const DEFAULT_LIMIT = DRY_RUN ? 50 : 0; // 0 = no limit
const LIMIT = process.env.FJA_PROMOTE_LIMIT ? parseInt(process.env.FJA_PROMOTE_LIMIT, 10) : DEFAULT_LIMIT;

// ---------------------------------------------------------------------------
// FJA inventory row shape (only the columns we use)
// ---------------------------------------------------------------------------
interface FjaJobRow {
  id: number;
  external_id: string;
  source_url: string;
  title: string;
  organization_name: string | null;
  listing_category: string | null;
  published_date: string | null;
  application_start_date: string | null;
  application_end_date: string | null;
  advertisement_number: string | null;
  qualification: string | null;
  vacancy_count: number | null;
  details: Record<string, unknown> | null;
  official_notification_url: string | null;
  other_info_raw: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Parse a salary string from FJA into { min, max } in whole rupees.
// Handles "Rs. 1,50,000/- per month", "Rs. 37,640 - Rs. 1,15,500", etc.
// Returns undefined values when the string cannot be parsed.
// ---------------------------------------------------------------------------
function parseSalary(raw: string | undefined): { min?: number; max?: number } {
  if (!raw) return {};
  // Strip currency labels, slashes, hyphens used as decorators, and commas
  // Example inputs:
  //   "Rs. 1,50,000/- per month"  → 150000
  //   "Rs. 37,640 - Rs. 1,15,500" → { min: 37640, max: 115500 }
  const cleaned = raw.replace(/Rs\.?\s*/gi, "").replace(/\/-/g, "").replace(/per\s+\w+/gi, "").trim();
  // Find all sequences of digits (with embedded commas)
  const numStrings = cleaned.match(/[\d,]+/g) ?? [];
  const nums = numStrings
    .map((s) => parseInt(s.replace(/,/g, ""), 10))
    .filter((n) => !isNaN(n) && n > 0);
  if (nums.length === 0) return {};
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

// ---------------------------------------------------------------------------
// Parse an age string from FJA tableFields into an integer (years).
// Handles "18 Years\n18 Years", "18 years", "18", etc. — takes the first number.
// ---------------------------------------------------------------------------
function parseYears(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const match = raw.match(/\d+/);
  if (!match) return undefined;
  const n = parseInt(match[0], 10);
  return isNaN(n) ? undefined : n;
}

// ---------------------------------------------------------------------------
// Parse a fee string from FJA tableFields into an integer (rupees).
// Handles "Rs. 250\nRs. 250", "Rs. 80 (Exemptions Applicable)\nRs. 80", etc.
// Takes the first clean integer after stripping Rs. prefix and annotations.
// ---------------------------------------------------------------------------
function parseRupees(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  // Take only the first line (ignore repeated duplicate lines)
  const firstLine = raw.split("\n")[0].trim();
  // Strip currency label, commas, parenthetical notes, slash decorators
  const cleaned = firstLine
    .replace(/Rs\.?\s*/gi, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\/-/g, "")
    .replace(/,/g, "")
    .trim();
  const match = cleaned.match(/\d+/);
  if (!match) return undefined;
  const n = parseInt(match[0], 10);
  return isNaN(n) ? undefined : n;
}

// ---------------------------------------------------------------------------
// Extract apply URL from details.allLinks: first link whose label (case-insensitive)
// contains "apply online" or "apply here" and whose URL is not an email/CDN-CGI path.
// ---------------------------------------------------------------------------
function extractApplyUrl(allLinks: Array<{ url?: string; label?: string }> | undefined): string | undefined {
  if (!allLinks || !Array.isArray(allLinks)) return undefined;
  const applyLabels = /apply\s*(online|here|now|link)/i;
  for (const link of allLinks) {
    if (!link.url || !link.label) continue;
    if (link.url.includes("cdn-cgi") || link.url.includes("t.me") || link.url.includes("freejobalert.com/register")) continue;
    if (applyLabels.test(link.label)) return link.url;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Build a postTable from details.tables: find the table whose heading contains
// "vacanc" or whose rows have name + vacancy columns. Returns undefined if none found.
// Only objective facts — name of post and number of vacancies.
// ---------------------------------------------------------------------------
function extractPostTable(
  tables: Array<{
    heading?: string;
    rows: Array<{ cells: string[]; rowIndex: number }>;
  }> | undefined
): Array<{ name: string; vacancies?: number }> | undefined {
  if (!tables || !Array.isArray(tables)) return undefined;

  // Find a table whose heading mentions "vacanc" or "post"
  const vacancyTable = tables.find((t) =>
    /vacanc|post.?wise|department.?wise/i.test(t.heading ?? "")
  );
  if (!vacancyTable) return undefined;

  // Header row tells us which column is name and which is count
  const headerRow = vacancyTable.rows.find((r) => r.rowIndex === 0);
  if (!headerRow) return undefined;

  const headers = headerRow.cells.map((c) => c.toLowerCase().trim());
  // Look for a column that holds the post/role name
  const nameCol = headers.findIndex((h) => /name|post|position|role|department|area/i.test(h));
  // Look for a column that holds the number of vacancies
  const countCol = headers.findIndex((h) => /vacanc|position|no\.|num|count/i.test(h));

  if (nameCol === -1) return undefined;

  const result: Array<{ name: string; vacancies?: number }> = [];
  for (const row of vacancyTable.rows) {
    if (row.rowIndex === 0) continue; // skip header
    const name = row.cells[nameCol]?.trim();
    if (!name || /^total$/i.test(name)) continue;
    const countStr = countCol !== -1 ? row.cells[countCol]?.trim() : undefined;
    const vacancies = countStr ? parseInt(countStr.replace(/,/g, ""), 10) : undefined;
    result.push({ name, vacancies: vacancies && !isNaN(vacancies) ? vacancies : undefined });
  }
  return result.length > 0 ? result : undefined;
}

// ---------------------------------------------------------------------------
// Map one FJA inventory row to NormalizedPosting
// ---------------------------------------------------------------------------
function toNormalized(row: FjaJobRow): NormalizedPosting {
  const details = row.details ?? {};

  // --- Apply URL: scan allLinks for an "Apply Online"-type label ---
  const allLinks = details.allLinks as Array<{ url?: string; label?: string }> | undefined;
  const applyUrl = extractApplyUrl(allLinks);

  // --- Salary: parse the raw salary text string ---
  const salaryRaw = (details.salary as string | undefined) ?? undefined;
  const { min: salaryMin, max: salaryMax } = parseSalary(salaryRaw);

  // --- Location: stored as details.location ---
  const locationText = (details.location as string | undefined) ?? undefined;

  // --- Post table: extract from details.tables ---
  const tables = details.tables as Array<{
    heading?: string;
    rows: Array<{ cells: string[]; rowIndex: number }>;
  }> | undefined;
  const postTable = extractPostTable(tables);

  // --- Post names: stored as details.postNames (string or array) ---
  const rawPostNames = details.postNames;
  const postNames: string[] | undefined = rawPostNames
    ? (Array.isArray(rawPostNames) ? rawPostNames : [String(rawPostNames)])
    : undefined;

  // --- Stage: category hint first, then date logic ---
  // Fix: APPLICATION_OPEN no longer requires start_date to be non-null.
  // A future end_date is sufficient to conclude applications are open.
  const cat = (row.listing_category ?? "").toLowerCase();
  const now = new Date();
  const endDate = row.application_end_date ? new Date(row.application_end_date) : null;
  const startDate = row.application_start_date ? new Date(row.application_start_date) : null;
  const stage =
    cat.includes("result") ? "RESULT_OUT" :
    cat.includes("admit") ? "ADMIT_CARD_RELEASED" :
    cat.includes("answer") ? "ANSWER_KEY_OUT" :
    endDate && endDate < now ? "APPLICATION_CLOSED" :
    endDate && endDate >= now ? "APPLICATION_OPEN" :
    startDate && startDate <= now ? "APPLICATION_OPEN" :
    "NOTIFICATION_OUT";

  // --- Eligibility: row.qualification is the primary source; fall back to
  // details.tableFields["qualification"] which FJA sometimes stores separately.
  const tableFields = details.tableFields as Record<string, string> | undefined;
  const eligibility = row.qualification
    ?? tableFields?.["qualification"]
    ?? undefined;

  // --- Age limits: extracted from tableFields["minimum age"] / ["maximum age"] ---
  const ageLimitMin = parseYears(tableFields?.["minimum age"]);
  const ageLimitMax = parseYears(tableFields?.["maximum age"]);

  // --- Application fees: general = "application processing fee"; reserved = "examination fee" ---
  // Only include fees that appear in objective tableFields (never in editorial "How to Apply" lists).
  const applicationFeeGeneral = parseRupees(tableFields?.["application processing fee"]);
  const applicationFeeReserved = parseRupees(tableFields?.["examination fee"]);

  return {
    source: "fja",
    externalId: row.external_id,
    sourceUrl: row.source_url,
    title: row.title,
    kind: "GOVERNMENT",
    organizationName: row.organization_name ?? "Unknown",
    organizationFromLabel: true,
    description: row.title,          // title only — qualification goes to eligibility
    eligibility,                     // objective fact from source
    totalVacancies: row.vacancy_count ?? undefined,
    officialNotificationUrl: row.official_notification_url ?? undefined,
    applyUrl,
    advertisementNumber: row.advertisement_number ?? undefined,
    datePosted: row.published_date ? new Date(row.published_date) : undefined,
    applicationStartDate: row.application_start_date ? new Date(row.application_start_date) : undefined,
    validThrough: row.application_end_date ? new Date(row.application_end_date) : undefined,
    postTable,
    postNames,
    salaryMin,
    salaryMax,
    salaryCurrency: salaryMin !== undefined ? "INR" : undefined,
    salaryPeriod: salaryMin !== undefined ? "MONTH" : undefined,
    ageLimitMin,
    ageLimitMax,
    applicationFeeGeneral,
    applicationFeeReserved,
    stage: stage as NormalizedPosting["stage"],
    locationRegion: locationText,
    observationFacts: details as Record<string, unknown>,
    // FJA Extractor has parsed the full article page — confidence is high enough to pass the write gate (>= 40).
    confidence: 80,
    // Deterministic slug: same fja + externalId always yields the same URL.
    slug: deterministicSlug("fja", row.external_id, row.title),
    organizationSlug: slugify(row.organization_name ?? "unknown"),
    timeline: [],
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const db = getDb();
  console.log(`\n=== FJA → canonical promotion ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  if (PILOT_IDS) console.log(`Pilot external_ids: ${PILOT_IDS.join(", ")}`);
  if (LIMIT) console.log(`Limit: ${LIMIT} rows`);
  console.log();

  // Check for live-mapped rows (must never overwrite)
  const liveMappedWarning = PILOT_IDS
    ? `AND external_id = ANY(ARRAY[${PILOT_IDS.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")}])`
    : "";

  // Build query
  // Only ingest newly discovered, currently open FJA records with a future deadline.\n  // Exact source-URL anti-joins prevent re-importing URLs already represented canonically.\n  let whereClause = `source_slug = 'freejobalert'\n    AND detail_status = 'EXTRACTED'\n    AND source_status = 'OPEN'\n    AND application_end_date >= CURRENT_DATE\n    AND NOT EXISTS (SELECT 1 FROM recruitments r WHERE lower(regexp_replace(trim(r.source_url), '/+
  if (PILOT_IDS && PILOT_IDS.length > 0) {
    const idList = PILOT_IDS.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    whereClause += ` AND external_id = ANY(ARRAY[${idList}])`;
  }
  const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : "";

  const rawRows = await db.execute(
    sql.raw(`
      SELECT id, external_id, source_url, title, organization_name,
             listing_category, published_date, application_start_date,
             application_end_date, advertisement_number, qualification,
             vacancy_count, details, official_notification_url, other_info_raw
      FROM fja_job_inventory
      WHERE ${whereClause}
      ORDER BY first_seen_at DESC
      ${limitClause}
    `)
  );
  // drizzle returns the array directly (not { rows: [...] })
  const inventory = (Array.isArray(rawRows) ? rawRows : (rawRows as { rows?: unknown[] }).rows ?? []) as FjaJobRow[];
  console.log(`Fetched ${inventory.length} FJA inventory rows`);

  if (inventory.length === 0) {
    console.log("Nothing to promote. Exiting.");
    return;
  }

  // Flag rows that are already live-mapped (other_info_raw has canonical_recruitment_id)
  const liveMapped = inventory.filter(
    (r) => r.other_info_raw && (r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  if (liveMapped.length > 0) {
    console.log(`\n⚠️  ${liveMapped.length} rows already live-mapped — skipping:`);
    liveMapped.forEach((r) => console.log(`   ${r.external_id} — ${r.title}`));
  }
  const toProcess = inventory.filter(
    (r) => !r.other_info_raw || !(r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  console.log(`\nWill process: ${toProcess.length} rows\n`);

  // Pre-resolve orgs for the dry-run report
  const orgIndex = await loadOrgIndex(db);
  const orgStats: Record<string, number> = { ALIAS: 0, EXISTING: 0, CANDIDATE: 0, NONE: 0 };
  const candidateOrgs: Array<{ externalId: string; orgName: string; reason: string }> = [];

  for (const row of toProcess) {
    const resolution = resolveOrganization(orgIndex, row.organization_name);
    orgStats[resolution.kind]++;
    if (resolution.kind === "CANDIDATE" || resolution.kind === "NONE") {
      candidateOrgs.push({
        externalId: row.external_id,
        orgName: row.organization_name ?? "(none)",
        reason: resolution.kind === "CANDIDATE" ? resolution.reason : "NO_ORG_NAME",
      });
    }
  }

  console.log(`Org resolution preview:`);
  console.log(`  ALIAS    : ${orgStats.ALIAS}`);
  console.log(`  EXISTING : ${orgStats.EXISTING}`);
  console.log(`  CANDIDATE: ${orgStats.CANDIDATE}  ← held, not published`);
  console.log(`  NONE     : ${orgStats.NONE}        ← skipped`);
  console.log();

  if (candidateOrgs.length > 0) {
    console.log(`Unresolved orgs (will become candidates):`);
    // Show unique org names
    const seen = new Set<string>();
    for (const c of candidateOrgs) {
      if (!seen.has(c.orgName)) {
        seen.add(c.orgName);
        console.log(`   [${c.reason}] ${c.orgName}`);
      }
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no rows written. Set FJA_PROMOTE_DRY_RUN=0 to write.");
    return;
  }

  // Live run: feed each row through writePostingsToDB
  let succeeded = 0;
  let held = 0;
  let failed = 0;
  const errors: Array<{ externalId: string; error: string }> = [];

  for (const row of toProcess) {
    const normalized = toNormalized(row);
    try {
      const deduped: DedupedPosting = {
        title: normalized.title,
        organizationName: normalized.organizationName,
        locationCity: normalized.locationRegion ?? "",
        deadline: normalized.validThrough ?? null,
        primary: normalized,
        sources: [{ portal: "fja", externalId: normalized.externalId, score: 1 }],
      };
      const writeResult = await writePostingsToDB([deduped], [normalized]);
      const rec = writeResult.results[0];
      const action = rec?.action ?? "unknown";
      if (action === "inserted" || action === "updated" || action === "unchanged" || action === "flagged") {
        succeeded++;
        console.log(`  OK(${action.padEnd(9)}) ${row.external_id} — ${row.title.slice(0, 60)}`);
      } else if (action === "held_candidate") {
        held++;
        console.log(`  HELD     ${row.external_id} — ${row.organization_name} (reason: ${rec?.reason ?? "unknown"})`);
      } else {
        // skipped / rejected / unknown — count as failed so caller sees the truth
        failed++;
        errors.push({ externalId: row.external_id, error: `action=${action} reason=${rec?.reason ?? "none"}` });
        console.error(`  SKIP/REJ ${row.external_id} — action=${action} reason=${rec?.reason ?? "none"}`);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ externalId: row.external_id, error: msg });
      console.error(`  ERROR    ${row.external_id} — ${msg}`);
    }
  }

  console.log(`\n=== Result ===`);
  console.log(`  Succeeded : ${succeeded}`);
  console.log(`  Held (org candidate) : ${held}`);
  console.log(`  Failed    : ${failed}`);
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach((e) => console.log(`  ${e.externalId}: ${e.error}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
, '')) = lower(regexp_replace(trim(fja_job_inventory.source_url), '/+
  if (PILOT_IDS && PILOT_IDS.length > 0) {
    const idList = PILOT_IDS.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    whereClause += ` AND external_id = ANY(ARRAY[${idList}])`;
  }
  const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : "";

  const rawRows = await db.execute(
    sql.raw(`
      SELECT id, external_id, source_url, title, organization_name,
             listing_category, published_date, application_start_date,
             application_end_date, advertisement_number, qualification,
             vacancy_count, details, official_notification_url, other_info_raw
      FROM fja_job_inventory
      WHERE ${whereClause}
      ORDER BY first_seen_at DESC
      ${limitClause}
    `)
  );
  // drizzle returns the array directly (not { rows: [...] })
  const inventory = (Array.isArray(rawRows) ? rawRows : (rawRows as { rows?: unknown[] }).rows ?? []) as FjaJobRow[];
  console.log(`Fetched ${inventory.length} FJA inventory rows`);

  if (inventory.length === 0) {
    console.log("Nothing to promote. Exiting.");
    return;
  }

  // Flag rows that are already live-mapped (other_info_raw has canonical_recruitment_id)
  const liveMapped = inventory.filter(
    (r) => r.other_info_raw && (r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  if (liveMapped.length > 0) {
    console.log(`\n⚠️  ${liveMapped.length} rows already live-mapped — skipping:`);
    liveMapped.forEach((r) => console.log(`   ${r.external_id} — ${r.title}`));
  }
  const toProcess = inventory.filter(
    (r) => !r.other_info_raw || !(r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  console.log(`\nWill process: ${toProcess.length} rows\n`);

  // Pre-resolve orgs for the dry-run report
  const orgIndex = await loadOrgIndex(db);
  const orgStats: Record<string, number> = { ALIAS: 0, EXISTING: 0, CANDIDATE: 0, NONE: 0 };
  const candidateOrgs: Array<{ externalId: string; orgName: string; reason: string }> = [];

  for (const row of toProcess) {
    const resolution = resolveOrganization(orgIndex, row.organization_name);
    orgStats[resolution.kind]++;
    if (resolution.kind === "CANDIDATE" || resolution.kind === "NONE") {
      candidateOrgs.push({
        externalId: row.external_id,
        orgName: row.organization_name ?? "(none)",
        reason: resolution.kind === "CANDIDATE" ? resolution.reason : "NO_ORG_NAME",
      });
    }
  }

  console.log(`Org resolution preview:`);
  console.log(`  ALIAS    : ${orgStats.ALIAS}`);
  console.log(`  EXISTING : ${orgStats.EXISTING}`);
  console.log(`  CANDIDATE: ${orgStats.CANDIDATE}  ← held, not published`);
  console.log(`  NONE     : ${orgStats.NONE}        ← skipped`);
  console.log();

  if (candidateOrgs.length > 0) {
    console.log(`Unresolved orgs (will become candidates):`);
    // Show unique org names
    const seen = new Set<string>();
    for (const c of candidateOrgs) {
      if (!seen.has(c.orgName)) {
        seen.add(c.orgName);
        console.log(`   [${c.reason}] ${c.orgName}`);
      }
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no rows written. Set FJA_PROMOTE_DRY_RUN=0 to write.");
    return;
  }

  // Live run: feed each row through writePostingsToDB
  let succeeded = 0;
  let held = 0;
  let failed = 0;
  const errors: Array<{ externalId: string; error: string }> = [];

  for (const row of toProcess) {
    const normalized = toNormalized(row);
    try {
      const deduped: DedupedPosting = {
        title: normalized.title,
        organizationName: normalized.organizationName,
        locationCity: normalized.locationRegion ?? "",
        deadline: normalized.validThrough ?? null,
        primary: normalized,
        sources: [{ portal: "fja", externalId: normalized.externalId, score: 1 }],
      };
      const writeResult = await writePostingsToDB([deduped], [normalized]);
      const rec = writeResult.results[0];
      const action = rec?.action ?? "unknown";
      if (action === "inserted" || action === "updated" || action === "unchanged" || action === "flagged") {
        succeeded++;
        console.log(`  OK(${action.padEnd(9)}) ${row.external_id} — ${row.title.slice(0, 60)}`);
      } else if (action === "held_candidate") {
        held++;
        console.log(`  HELD     ${row.external_id} — ${row.organization_name} (reason: ${rec?.reason ?? "unknown"})`);
      } else {
        // skipped / rejected / unknown — count as failed so caller sees the truth
        failed++;
        errors.push({ externalId: row.external_id, error: `action=${action} reason=${rec?.reason ?? "none"}` });
        console.error(`  SKIP/REJ ${row.external_id} — action=${action} reason=${rec?.reason ?? "none"}`);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ externalId: row.external_id, error: msg });
      console.error(`  ERROR    ${row.external_id} — ${msg}`);
    }
  }

  console.log(`\n=== Result ===`);
  console.log(`  Succeeded : ${succeeded}`);
  console.log(`  Held (org candidate) : ${held}`);
  console.log(`  Failed    : ${failed}`);
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach((e) => console.log(`  ${e.externalId}: ${e.error}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
, '')))\n    AND NOT EXISTS (SELECT 1 FROM postings p WHERE lower(regexp_replace(trim(p.source_url), '/+
  if (PILOT_IDS && PILOT_IDS.length > 0) {
    const idList = PILOT_IDS.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    whereClause += ` AND external_id = ANY(ARRAY[${idList}])`;
  }
  const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : "";

  const rawRows = await db.execute(
    sql.raw(`
      SELECT id, external_id, source_url, title, organization_name,
             listing_category, published_date, application_start_date,
             application_end_date, advertisement_number, qualification,
             vacancy_count, details, official_notification_url, other_info_raw
      FROM fja_job_inventory
      WHERE ${whereClause}
      ORDER BY first_seen_at DESC
      ${limitClause}
    `)
  );
  // drizzle returns the array directly (not { rows: [...] })
  const inventory = (Array.isArray(rawRows) ? rawRows : (rawRows as { rows?: unknown[] }).rows ?? []) as FjaJobRow[];
  console.log(`Fetched ${inventory.length} FJA inventory rows`);

  if (inventory.length === 0) {
    console.log("Nothing to promote. Exiting.");
    return;
  }

  // Flag rows that are already live-mapped (other_info_raw has canonical_recruitment_id)
  const liveMapped = inventory.filter(
    (r) => r.other_info_raw && (r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  if (liveMapped.length > 0) {
    console.log(`\n⚠️  ${liveMapped.length} rows already live-mapped — skipping:`);
    liveMapped.forEach((r) => console.log(`   ${r.external_id} — ${r.title}`));
  }
  const toProcess = inventory.filter(
    (r) => !r.other_info_raw || !(r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  console.log(`\nWill process: ${toProcess.length} rows\n`);

  // Pre-resolve orgs for the dry-run report
  const orgIndex = await loadOrgIndex(db);
  const orgStats: Record<string, number> = { ALIAS: 0, EXISTING: 0, CANDIDATE: 0, NONE: 0 };
  const candidateOrgs: Array<{ externalId: string; orgName: string; reason: string }> = [];

  for (const row of toProcess) {
    const resolution = resolveOrganization(orgIndex, row.organization_name);
    orgStats[resolution.kind]++;
    if (resolution.kind === "CANDIDATE" || resolution.kind === "NONE") {
      candidateOrgs.push({
        externalId: row.external_id,
        orgName: row.organization_name ?? "(none)",
        reason: resolution.kind === "CANDIDATE" ? resolution.reason : "NO_ORG_NAME",
      });
    }
  }

  console.log(`Org resolution preview:`);
  console.log(`  ALIAS    : ${orgStats.ALIAS}`);
  console.log(`  EXISTING : ${orgStats.EXISTING}`);
  console.log(`  CANDIDATE: ${orgStats.CANDIDATE}  ← held, not published`);
  console.log(`  NONE     : ${orgStats.NONE}        ← skipped`);
  console.log();

  if (candidateOrgs.length > 0) {
    console.log(`Unresolved orgs (will become candidates):`);
    // Show unique org names
    const seen = new Set<string>();
    for (const c of candidateOrgs) {
      if (!seen.has(c.orgName)) {
        seen.add(c.orgName);
        console.log(`   [${c.reason}] ${c.orgName}`);
      }
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no rows written. Set FJA_PROMOTE_DRY_RUN=0 to write.");
    return;
  }

  // Live run: feed each row through writePostingsToDB
  let succeeded = 0;
  let held = 0;
  let failed = 0;
  const errors: Array<{ externalId: string; error: string }> = [];

  for (const row of toProcess) {
    const normalized = toNormalized(row);
    try {
      const deduped: DedupedPosting = {
        title: normalized.title,
        organizationName: normalized.organizationName,
        locationCity: normalized.locationRegion ?? "",
        deadline: normalized.validThrough ?? null,
        primary: normalized,
        sources: [{ portal: "fja", externalId: normalized.externalId, score: 1 }],
      };
      const writeResult = await writePostingsToDB([deduped], [normalized]);
      const rec = writeResult.results[0];
      const action = rec?.action ?? "unknown";
      if (action === "inserted" || action === "updated" || action === "unchanged" || action === "flagged") {
        succeeded++;
        console.log(`  OK(${action.padEnd(9)}) ${row.external_id} — ${row.title.slice(0, 60)}`);
      } else if (action === "held_candidate") {
        held++;
        console.log(`  HELD     ${row.external_id} — ${row.organization_name} (reason: ${rec?.reason ?? "unknown"})`);
      } else {
        // skipped / rejected / unknown — count as failed so caller sees the truth
        failed++;
        errors.push({ externalId: row.external_id, error: `action=${action} reason=${rec?.reason ?? "none"}` });
        console.error(`  SKIP/REJ ${row.external_id} — action=${action} reason=${rec?.reason ?? "none"}`);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ externalId: row.external_id, error: msg });
      console.error(`  ERROR    ${row.external_id} — ${msg}`);
    }
  }

  console.log(`\n=== Result ===`);
  console.log(`  Succeeded : ${succeeded}`);
  console.log(`  Held (org candidate) : ${held}`);
  console.log(`  Failed    : ${failed}`);
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach((e) => console.log(`  ${e.externalId}: ${e.error}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
, '')) = lower(regexp_replace(trim(fja_job_inventory.source_url), '/+
  if (PILOT_IDS && PILOT_IDS.length > 0) {
    const idList = PILOT_IDS.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    whereClause += ` AND external_id = ANY(ARRAY[${idList}])`;
  }
  const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : "";

  const rawRows = await db.execute(
    sql.raw(`
      SELECT id, external_id, source_url, title, organization_name,
             listing_category, published_date, application_start_date,
             application_end_date, advertisement_number, qualification,
             vacancy_count, details, official_notification_url, other_info_raw
      FROM fja_job_inventory
      WHERE ${whereClause}
      ORDER BY first_seen_at DESC
      ${limitClause}
    `)
  );
  // drizzle returns the array directly (not { rows: [...] })
  const inventory = (Array.isArray(rawRows) ? rawRows : (rawRows as { rows?: unknown[] }).rows ?? []) as FjaJobRow[];
  console.log(`Fetched ${inventory.length} FJA inventory rows`);

  if (inventory.length === 0) {
    console.log("Nothing to promote. Exiting.");
    return;
  }

  // Flag rows that are already live-mapped (other_info_raw has canonical_recruitment_id)
  const liveMapped = inventory.filter(
    (r) => r.other_info_raw && (r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  if (liveMapped.length > 0) {
    console.log(`\n⚠️  ${liveMapped.length} rows already live-mapped — skipping:`);
    liveMapped.forEach((r) => console.log(`   ${r.external_id} — ${r.title}`));
  }
  const toProcess = inventory.filter(
    (r) => !r.other_info_raw || !(r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  console.log(`\nWill process: ${toProcess.length} rows\n`);

  // Pre-resolve orgs for the dry-run report
  const orgIndex = await loadOrgIndex(db);
  const orgStats: Record<string, number> = { ALIAS: 0, EXISTING: 0, CANDIDATE: 0, NONE: 0 };
  const candidateOrgs: Array<{ externalId: string; orgName: string; reason: string }> = [];

  for (const row of toProcess) {
    const resolution = resolveOrganization(orgIndex, row.organization_name);
    orgStats[resolution.kind]++;
    if (resolution.kind === "CANDIDATE" || resolution.kind === "NONE") {
      candidateOrgs.push({
        externalId: row.external_id,
        orgName: row.organization_name ?? "(none)",
        reason: resolution.kind === "CANDIDATE" ? resolution.reason : "NO_ORG_NAME",
      });
    }
  }

  console.log(`Org resolution preview:`);
  console.log(`  ALIAS    : ${orgStats.ALIAS}`);
  console.log(`  EXISTING : ${orgStats.EXISTING}`);
  console.log(`  CANDIDATE: ${orgStats.CANDIDATE}  ← held, not published`);
  console.log(`  NONE     : ${orgStats.NONE}        ← skipped`);
  console.log();

  if (candidateOrgs.length > 0) {
    console.log(`Unresolved orgs (will become candidates):`);
    // Show unique org names
    const seen = new Set<string>();
    for (const c of candidateOrgs) {
      if (!seen.has(c.orgName)) {
        seen.add(c.orgName);
        console.log(`   [${c.reason}] ${c.orgName}`);
      }
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no rows written. Set FJA_PROMOTE_DRY_RUN=0 to write.");
    return;
  }

  // Live run: feed each row through writePostingsToDB
  let succeeded = 0;
  let held = 0;
  let failed = 0;
  const errors: Array<{ externalId: string; error: string }> = [];

  for (const row of toProcess) {
    const normalized = toNormalized(row);
    try {
      const deduped: DedupedPosting = {
        title: normalized.title,
        organizationName: normalized.organizationName,
        locationCity: normalized.locationRegion ?? "",
        deadline: normalized.validThrough ?? null,
        primary: normalized,
        sources: [{ portal: "fja", externalId: normalized.externalId, score: 1 }],
      };
      const writeResult = await writePostingsToDB([deduped], [normalized]);
      const rec = writeResult.results[0];
      const action = rec?.action ?? "unknown";
      if (action === "inserted" || action === "updated" || action === "unchanged" || action === "flagged") {
        succeeded++;
        console.log(`  OK(${action.padEnd(9)}) ${row.external_id} — ${row.title.slice(0, 60)}`);
      } else if (action === "held_candidate") {
        held++;
        console.log(`  HELD     ${row.external_id} — ${row.organization_name} (reason: ${rec?.reason ?? "unknown"})`);
      } else {
        // skipped / rejected / unknown — count as failed so caller sees the truth
        failed++;
        errors.push({ externalId: row.external_id, error: `action=${action} reason=${rec?.reason ?? "none"}` });
        console.error(`  SKIP/REJ ${row.external_id} — action=${action} reason=${rec?.reason ?? "none"}`);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ externalId: row.external_id, error: msg });
      console.error(`  ERROR    ${row.external_id} — ${msg}`);
    }
  }

  console.log(`\n=== Result ===`);
  console.log(`  Succeeded : ${succeeded}`);
  console.log(`  Held (org candidate) : ${held}`);
  console.log(`  Failed    : ${failed}`);
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach((e) => console.log(`  ${e.externalId}: ${e.error}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
, '')))`;
  if (PILOT_IDS && PILOT_IDS.length > 0) {
    const idList = PILOT_IDS.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    whereClause += ` AND external_id = ANY(ARRAY[${idList}])`;
  }
  const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : "";

  const rawRows = await db.execute(
    sql.raw(`
      SELECT id, external_id, source_url, title, organization_name,
             listing_category, published_date, application_start_date,
             application_end_date, advertisement_number, qualification,
             vacancy_count, details, official_notification_url, other_info_raw
      FROM fja_job_inventory
      WHERE ${whereClause}
      ORDER BY first_seen_at DESC
      ${limitClause}
    `)
  );
  // drizzle returns the array directly (not { rows: [...] })
  const inventory = (Array.isArray(rawRows) ? rawRows : (rawRows as { rows?: unknown[] }).rows ?? []) as FjaJobRow[];
  console.log(`Fetched ${inventory.length} FJA inventory rows`);

  if (inventory.length === 0) {
    console.log("Nothing to promote. Exiting.");
    return;
  }

  // Flag rows that are already live-mapped (other_info_raw has canonical_recruitment_id)
  const liveMapped = inventory.filter(
    (r) => r.other_info_raw && (r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  if (liveMapped.length > 0) {
    console.log(`\n⚠️  ${liveMapped.length} rows already live-mapped — skipping:`);
    liveMapped.forEach((r) => console.log(`   ${r.external_id} — ${r.title}`));
  }
  const toProcess = inventory.filter(
    (r) => !r.other_info_raw || !(r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  console.log(`\nWill process: ${toProcess.length} rows\n`);

  // Pre-resolve orgs for the dry-run report
  const orgIndex = await loadOrgIndex(db);
  const orgStats: Record<string, number> = { ALIAS: 0, EXISTING: 0, CANDIDATE: 0, NONE: 0 };
  const candidateOrgs: Array<{ externalId: string; orgName: string; reason: string }> = [];

  for (const row of toProcess) {
    const resolution = resolveOrganization(orgIndex, row.organization_name);
    orgStats[resolution.kind]++;
    if (resolution.kind === "CANDIDATE" || resolution.kind === "NONE") {
      candidateOrgs.push({
        externalId: row.external_id,
        orgName: row.organization_name ?? "(none)",
        reason: resolution.kind === "CANDIDATE" ? resolution.reason : "NO_ORG_NAME",
      });
    }
  }

  console.log(`Org resolution preview:`);
  console.log(`  ALIAS    : ${orgStats.ALIAS}`);
  console.log(`  EXISTING : ${orgStats.EXISTING}`);
  console.log(`  CANDIDATE: ${orgStats.CANDIDATE}  ← held, not published`);
  console.log(`  NONE     : ${orgStats.NONE}        ← skipped`);
  console.log();

  if (candidateOrgs.length > 0) {
    console.log(`Unresolved orgs (will become candidates):`);
    // Show unique org names
    const seen = new Set<string>();
    for (const c of candidateOrgs) {
      if (!seen.has(c.orgName)) {
        seen.add(c.orgName);
        console.log(`   [${c.reason}] ${c.orgName}`);
      }
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log("DRY RUN — no rows written. Set FJA_PROMOTE_DRY_RUN=0 to write.");
    return;
  }

  // Live run: feed each row through writePostingsToDB
  let succeeded = 0;
  let held = 0;
  let failed = 0;
  const errors: Array<{ externalId: string; error: string }> = [];

  for (const row of toProcess) {
    const normalized = toNormalized(row);
    try {
      const deduped: DedupedPosting = {
        title: normalized.title,
        organizationName: normalized.organizationName,
        locationCity: normalized.locationRegion ?? "",
        deadline: normalized.validThrough ?? null,
        primary: normalized,
        sources: [{ portal: "fja", externalId: normalized.externalId, score: 1 }],
      };
      const writeResult = await writePostingsToDB([deduped], [normalized]);
      const rec = writeResult.results[0];
      const action = rec?.action ?? "unknown";
      if (action === "inserted" || action === "updated" || action === "unchanged" || action === "flagged") {
        succeeded++;
        console.log(`  OK(${action.padEnd(9)}) ${row.external_id} — ${row.title.slice(0, 60)}`);
      } else if (action === "held_candidate") {
        held++;
        console.log(`  HELD     ${row.external_id} — ${row.organization_name} (reason: ${rec?.reason ?? "unknown"})`);
      } else {
        // skipped / rejected / unknown — count as failed so caller sees the truth
        failed++;
        errors.push({ externalId: row.external_id, error: `action=${action} reason=${rec?.reason ?? "none"}` });
        console.error(`  SKIP/REJ ${row.external_id} — action=${action} reason=${rec?.reason ?? "none"}`);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ externalId: row.external_id, error: msg });
      console.error(`  ERROR    ${row.external_id} — ${msg}`);
    }
  }

  console.log(`\n=== Result ===`);
  console.log(`  Succeeded : ${succeeded}`);
  console.log(`  Held (org candidate) : ${held}`);
  console.log(`  Failed    : ${failed}`);
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach((e) => console.log(`  ${e.externalId}: ${e.error}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
