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
import { promotePending } from "../src/ingest/promotion";

const DRY_RUN = process.env.FJA_PROMOTE_DRY_RUN === "1";
const PILOT_IDS = process.env.FJA_PROMOTE_EXTERNAL_IDS
  ? process.env.FJA_PROMOTE_EXTERNAL_IDS.split(",").map((s) => s.trim()).filter(Boolean)
  : null;
const DEFAULT_LIMIT = DRY_RUN ? 50 : 0; // 0 = no limit
const LIMIT = process.env.FJA_PROMOTE_LIMIT ? parseInt(process.env.FJA_PROMOTE_LIMIT, 10) : DEFAULT_LIMIT;
const PUBLISH_AFTER_INGEST = process.env.FJA_PROMOTE_PUBLISH_AFTER_INGEST === "1";
const JOBOYE_BASE_URL = (process.env.JOBOYE_BASE_URL ?? "https://www.joboye.com").replace(/\/+$/, "");

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
  detail_status: "EXTRACTED" | "PARTIAL" | "FAILED" | "PENDING";
  source_status: "OPEN" | "CLOSED" | "UNKNOWN" | "REMOVED";
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

// Parse source dates from known captured formats without guessing ambiguous dates.
function parseSourceDate(raw: string): Date | undefined {
  const value = raw.trim();
  let m = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})$/);
  if (m && Number(m[1]) <= 31 && Number(m[2]) <= 12) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  m = value.match(/^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(20\d{2})$/i);
  if (m) {
    const d = new Date(`${m[1]} ${m[2]} ${m[3]} UTC`);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
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

function isOfficialAuthorityHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
    // Government/education/research domains plus known public-sector recruiting domains.
    return /(^|\.)(gov\.in|nic\.in|ac\.in|edu\.in|res\.in|mil\.in)$/.test(host)
      || /(^|\.)(hmtindia\.com|sbi\.co\.in|ibps\.in|ongcindia\.com|ntpc\.co\.in|iocl\.com|bharatpetroleum\.in|hindustanpetroleum\.com|gailonline\.com|bel-india\.in|bhel\.com|sail\.co\.in|coalindia\.in|powergrid\.in|ecil\.co\.in|rites\.com|ircon\.org|mazagondock\.in|grse\.in|nclcil\.in|nlcindia\.in)$/.test(host);
  } catch {
    return false;
  }
}

function extractOfficialNotificationUrl(links: Array<Record<string, unknown>>): string | undefined {
  const candidates = links
    .filter((link) => typeof link.url === "string" && isOfficialAuthorityHost(link.url as string))
    .map((link) => {
      const url = String(link.url);
      const label = String(link.text ?? link.label ?? "").toLowerCase();
      const isPdf = /\.pdf(?:[?#]|$)/i.test(url);
      const notificationLabel = /(notification|advertisement|advt|official notice|recruitment notice|detailed notice|notification pdf|download notice)/i.test(label);
      const careerPath = /(recruit|vacan|career|job|advt|notice|advertisement|notification)/i.test(url);
      // Prefer explicitly labelled notices; a bare PDF is a candidate only when its path is recruitment-related.
      const score = (notificationLabel ? 5 : 0) + (isPdf ? 3 : 0) + (careerPath ? 2 : 0);
      return { url, score, isPdf, notificationLabel, careerPath };
    })
    .filter((item) => item.notificationLabel || item.isPdf)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.url;
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
function parseJsonRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, any>;
    } catch { /* keep empty record; malformed source capture must not crash ingestion */ }
  }
  return {};
}

function collectLinkObjects(value: unknown, output: Array<Record<string, unknown>> = [], depth = 0): Array<Record<string, unknown>> {
  if (depth > 10 || value == null) return output;
  if (Array.isArray(value)) {
    for (const item of value) collectLinkObjects(item, output, depth + 1);
    return output;
  }
  if (typeof value !== "object") return output;
  const record = value as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : typeof record.href === "string" ? record.href : undefined;
  const label = typeof record.text === "string" ? record.text : typeof record.label === "string" ? record.label : typeof record.title === "string" ? record.title : undefined;
  if (url && label) output.push({ url, text: label, label });
  for (const [key, nested] of Object.entries(record)) {
    if (["raw_html", "html", "detail_text", "normalized_text"].includes(key.toLowerCase())) continue;
    collectLinkObjects(nested, output, depth + 1);
  }
  return output;
}

function toNormalized(row: FjaJobRow): NormalizedPosting {
  // JSONB can arrive as an object or as serialized JSON depending on the query path.
  // Parse defensively, then collect links from all captured nesting variants.
  const wrapper = parseJsonRecord(row.details);
  const otherInfo = parseJsonRecord(row.other_info_raw);
  const detail = parseJsonRecord(wrapper.detail ?? wrapper);
  const facts = parseJsonRecord(detail.facts ?? otherInfo.facts);
  // The inventory has several historical capture shapes. Merge them instead of
  // choosing the first present key: an empty all_links array must not mask links
  // captured under links/href or the wrapper/listing object.
  const rawLinks = [
    ...collectLinkObjects(wrapper),
    ...collectLinkObjects(otherInfo),
  ].filter((link, index, list) =>
    list.findIndex((other) => other.url === link.url) === index
  );
  const allLinks = rawLinks.map((link) => ({
    url: typeof link.url === "string" ? link.url : typeof link.href === "string" ? link.href : undefined,
    label: typeof link.text === "string" ? link.text : typeof link.label === "string" ? link.label : typeof link.title === "string" ? link.title : undefined,
  })).filter((link, index, list) => link.url && list.findIndex((other) => other.url === link.url) === index);
  const applyUrl = extractApplyUrl(allLinks);
  // A stored value is eligible only if it points to a recognized authority host.
  const storedOfficialNotificationUrl = row.official_notification_url
    && isOfficialAuthorityHost(row.official_notification_url)
    ? row.official_notification_url
    : undefined;
  const capturedOfficialUrl = [
    facts.official_notification_url, facts.officialNotificationUrl,
    detail.official_notification_url, detail.officialNotificationUrl,
    wrapper.official_notification_url, wrapper.officialNotificationUrl,
    otherInfo.official_notification_url, otherInfo.officialNotificationUrl,
  ].find((value) => typeof value === "string" && isOfficialAuthorityHost(value)) as string | undefined;
  const officialNotificationUrl = storedOfficialNotificationUrl ?? capturedOfficialUrl ?? extractOfficialNotificationUrl(allLinks as Array<Record<string, unknown>>);
  const salaryRaw = (facts.salary_pay ?? facts.salary ?? detail.salary) as string | undefined;
  const { min: salaryMin, max: salaryMax } = parseSalary(salaryRaw);
  const locationText = (facts.location ?? detail.location) as string | undefined;
  const tables = (detail.tables ?? facts.tables) as Array<{
    heading?: string;
    rows: Array<{ cells: string[]; rowIndex: number }>;
  }> | undefined;
  const postTable = extractPostTable(tables);
  // post_name is an extracted fact, not the article headline.
  const rawPostNames = facts.post_names ?? facts.postNames ?? facts.post_name ?? detail.postNames;
  const postNames: string[] | undefined = rawPostNames
    ? (Array.isArray(rawPostNames) ? rawPostNames.map(String) : [String(rawPostNames)])
    : undefined;

  // --- Stage: category hint first, then date logic ---
  // Fix: APPLICATION_OPEN no longer requires start_date to be non-null.
  // A future end_date is sufficient to conclude applications are open.
  const cat = (row.listing_category ?? "").toLowerCase();
  const now = new Date();
  const endDate = row.application_end_date ? new Date(row.application_end_date) : facts.application_end_date ? parseSourceDate(String(facts.application_end_date)) ?? null : null;
  const startDate = row.application_start_date ? new Date(row.application_start_date) : facts.application_start_date ? parseSourceDate(String(facts.application_start_date)) ?? null : null;
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
  const tableFields = (facts.table_fields ?? facts.tableFields ?? detail.tableFields) as Record<string, string> | undefined;
  const eligibility = row.qualification
    ?? (facts.qualification as string | undefined)
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
    totalVacancies: row.vacancy_count ?? (facts.vacancies ? parseInt(String(facts.vacancies).replace(/,/g, ""), 10) || undefined : undefined),
    officialNotificationUrl,
    applyUrl,
    advertisementNumber: row.advertisement_number ?? undefined,
    datePosted: row.published_date ? new Date(row.published_date) : facts.notification_date ? parseSourceDate(String(facts.notification_date)) : undefined,
    applicationStartDate: row.application_start_date ? new Date(row.application_start_date) : facts.application_start_date ? parseSourceDate(String(facts.application_start_date)) : undefined,
    validThrough: row.application_end_date ? new Date(row.application_end_date) : facts.application_end_date ? parseSourceDate(String(facts.application_end_date)) : undefined,
    postTable,
    // Always create at least one post leaf; use the source title when no role line was extracted.
    postNames: postNames?.length ? postNames : [row.title],
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
    observationFacts: wrapper as Record<string, unknown>,
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
  // A live write must always be explicitly scoped to reviewed external IDs.
  // Broad inventory writes stay disabled even when confirm_live_write is set.
  if (!DRY_RUN && (!PILOT_IDS || PILOT_IDS.length === 0)) {
    throw new Error("Refusing unscoped live promotion. Set FJA_PROMOTE_EXTERNAL_IDS to an explicit comma-separated pilot allowlist.");
  }
  if (PUBLISH_AFTER_INGEST && DRY_RUN) {
    throw new Error("FJA_PROMOTE_PUBLISH_AFTER_INGEST=1 is invalid during dry-run.");
  }
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

  // Build query: only new, fully extracted FJA rows with an open application window.
  // Compare normalized source URLs against both canonical entity tables to prevent re-imports.
  let whereClause = `source_slug = 'freejobalert'
    AND detail_status = 'EXTRACTED'
    AND source_status = 'OPEN'
    -- Deadline may be stored in application_end_date or only in captured detail facts.
    -- Apply the normalized-date eligibility filter after reading both fields in TypeScript.
    AND NOT EXISTS (
      SELECT 1 FROM recruitments r
      WHERE lower(regexp_replace(trim(r.source_url), '/+$', '')) =
            lower(regexp_replace(trim(fja_job_inventory.source_url), '/+$', ''))
    )
    AND NOT EXISTS (
      SELECT 1 FROM postings p
      WHERE lower(regexp_replace(trim(p.source_url), '/+$', '')) =
            lower(regexp_replace(trim(fja_job_inventory.source_url), '/+$', ''))
    )
    -- FJA article IDs are stable source identities; URL-only checks miss rows
    -- whose source_url is NULL or normalized differently.
    AND NOT EXISTS (
      SELECT 1 FROM postings p
      WHERE p.external_id = fja_job_inventory.external_id
    )`;
  if (PILOT_IDS && PILOT_IDS.length > 0) {
    const idList = PILOT_IDS.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    whereClause += ` AND external_id = ANY(ARRAY[${idList}])`;
  }
  // Do not LIMIT in SQL: records with a date only in nested captured facts must
  // remain eligible, and expired/missing-deadline rows must not consume the batch limit.
  const rawRows = await db.execute(
    sql.raw(`
      SELECT id, external_id, source_url, title, organization_name,
             listing_category, published_date, application_start_date,
             application_end_date, advertisement_number, qualification,
             vacancy_count, details, official_notification_url, other_info_raw,
             detail_status, source_status
      FROM fja_job_inventory
      WHERE ${whereClause}
      ORDER BY first_seen_at DESC
    `)
  );
  // drizzle returns the array directly (not { rows: [...] })
  const inventory = (Array.isArray(rawRows) ? rawRows : (rawRows as { rows?: unknown[] }).rows ?? []) as FjaJobRow[];
  if (PILOT_IDS) {
    const returned = new Set(inventory.map((row) => row.external_id));
    const rejectedPilotIds = PILOT_IDS.filter((id) => !returned.has(id));
    if (rejectedPilotIds.length > 0) {
      throw new Error(`Pilot allowlist failed preflight eligibility/dedup checks: ${rejectedPilotIds.join(", ")}. No writes were performed.`);
    }
  }
  console.log(`Fetched ${inventory.length} FJA inventory rows passing detail_status=EXTRACTED, source_status=OPEN, and canonical dedup checks`);

  if (inventory.length === 0) {
    console.log("Nothing to promote. Exiting.");
    return;
  }

  // Preserve stable source records that were already mapped by an earlier workflow.
  const liveMapped = inventory.filter(
    (r) => r.other_info_raw && (r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );
  const unmapped = inventory.filter(
    (r) => !r.other_info_raw || !(r.other_info_raw as Record<string, unknown>)["canonical_recruitment_id"]
  );

  // Deadline is optional metadata, not an ingestion eligibility gate.
  let missingDeadline = 0;
  const dateEligible = unmapped.filter((row) => {
    const normalized = toNormalized(row);
    if (!normalized.validThrough || Number.isNaN(normalized.validThrough.getTime())) missingDeadline++;
    return true;
  });

  if (liveMapped.length > 0) {
    console.log(`Already live-mapped (skipped): ${liveMapped.length}`);
  }
  console.log(`Deadline missing/unparseable (does not block ingestion): ${missingDeadline}`);
  console.log("Deadline status does not block ingestion.");
  console.log(`Eligible after dedup checks: ${dateEligible.length}`);

  const toProcess = LIMIT > 0 ? dateEligible.slice(0, LIMIT) : dateEligible;
  console.log(`\nWill process: ${toProcess.length} rows (limit=${LIMIT || "all"})\n`);

  // Pre-resolve orgs for the dry-run report
  const orgIndex = await loadOrgIndex(db);
  const orgStats: Record<string, number> = { ALIAS: 0, EXISTING: 0, CANDIDATE: 0, NONE: 0 };
  const candidateOrgs: Array<{ externalId: string; orgName: string; reason: string }> = [];

  let officialUrlCount = 0;
  let missingOfficialUrlCount = 0;
  for (const row of toProcess) {
    const normalized = toNormalized(row);
    if (normalized.officialNotificationUrl) officialUrlCount++;
    else missingOfficialUrlCount++;
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
  console.log(`Official notification URL recognized: ${officialUrlCount}`);
  console.log(`Missing recognized official notification URL: ${missingOfficialUrlCount}`);
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
  let heldMissingOfficialLink = 0;
  let failed = 0;
  const errors: Array<{ externalId: string; error: string }> = [];
  const insertedPostingIds: number[] = [];

  for (const row of toProcess) {
    const normalized = toNormalized(row);
    // Defense in depth: never ingest partial, closed, or unknown source records.
    if (row.detail_status !== "EXTRACTED" || row.source_status !== "OPEN") {
      held++;
      console.log(`  HELD     ${row.external_id} — detail/source status ${row.detail_status}/${row.source_status} is not eligible`);
      continue;
    }
    // Do not promote a record unless an official notification destination was identified.
    if (!normalized.officialNotificationUrl) {
      heldMissingOfficialLink++;
      console.log(`  HELD     ${row.external_id} — missing official notification URL; remains in FJA review inventory`);
      continue;
    }
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
        if (action === "inserted" && typeof rec?.postingId === "number") insertedPostingIds.push(rec.postingId);
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
  console.log(`  Held (missing official notification URL) : ${heldMissingOfficialLink}`);
  console.log(`  Failed    : ${failed}`);
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach((e) => console.log(`  ${e.externalId}: ${e.error}`));
  }

  if (PUBLISH_AFTER_INGEST) {
    if (insertedPostingIds.length === 0) {
      throw new Error("No newly inserted posting IDs were returned; refusing to run a publication pass.");
    }
    if (insertedPostingIds.length !== toProcess.length) {
      throw new Error(`Only ${insertedPostingIds.length} of ${toProcess.length} selected rows were newly inserted. Publication pass refused; review the ingestion results first.`);
    }

    // Promote only the rows inserted in this exact pilot. This cannot publish
    // unrelated pending/draft rows elsewhere in production.
    const publication = await promotePending(db, { apply: true, postingIds: insertedPostingIds });
    console.log("\n=== Scoped publication result ===");
    console.log(JSON.stringify(publication, null, 2));
    if (publication.promoted !== insertedPostingIds.length) {
      throw new Error(`Publication gate passed for ${publication.promoted}/${insertedPostingIds.length} pilot rows. Any ineligible rows remain PENDING/DRAFT; public URL verification stopped.`);
    }

    const idList = insertedPostingIds.join(",");
    const rawPublicRows = await db.execute(sql.raw(`
      SELECT p.id AS posting_id, p.external_id, p.review_status::text AS review_status,
             p.publishing_status, p.index_tier,
             r.slug AS recruitment_slug, po.slug AS post_slug
      FROM public.postings p
      LEFT JOIN public.recruitments r ON r.id = p.inferred_recruitment_id
      LEFT JOIN public.posts po ON po.id = p.inferred_post_id
      WHERE p.id = ANY(ARRAY[${idList}]::int[])
      ORDER BY p.id
    `));
    const publicRows = (Array.isArray(rawPublicRows)
      ? rawPublicRows
      : (rawPublicRows as { rows?: unknown[] }).rows ?? []) as Array<{
        posting_id: number; external_id: string; review_status: string;
        publishing_status: string | null; index_tier: string; recruitment_slug: string | null; post_slug: string | null;
      }>;

    const publicChecks: Array<Record<string, unknown>> = [];
    for (const row of publicRows) {
      if (!row.recruitment_slug || !row.post_slug) {
        publicChecks.push({ external_id: row.external_id, ok: false, reason: "MISSING_CANONICAL_SLUG", row });
        continue;
      }
      const urls = [
        { entity: "recruitment_hub", url: `${JOBOYE_BASE_URL}/jobs/${encodeURIComponent(row.recruitment_slug)}` },
        { entity: "post_leaf", url: `${JOBOYE_BASE_URL}/jobs/${encodeURIComponent(row.recruitment_slug)}/${encodeURIComponent(row.post_slug)}` },
      ];
      for (const target of urls) {
        try {
          const response = await fetch(target.url, {
            redirect: "follow",
            headers: {
              "user-agent": "JobOye-FJA-Canonical-Pilot/1.0",
              "cache-control": "no-cache",
            },
          });
          publicChecks.push({
            external_id: row.external_id,
            entity: target.entity,
            requested_url: target.url,
            final_url: response.url,
            http_status: response.status,
            ok: response.status === 200,
            review_status: row.review_status,
            publishing_status: row.publishing_status,
            index_tier: row.index_tier,
          });
        } catch (error) {
          publicChecks.push({
            external_id: row.external_id,
            entity: target.entity,
            requested_url: target.url,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    console.log("Public URL verification:");
    console.log(JSON.stringify(publicChecks, null, 2));
    const failedChecks = publicChecks.filter((check) => check.ok !== true);
    if (failedChecks.length > 0) {
      throw new Error(`Public URL verification failed for ${failedChecks.length} of ${publicChecks.length} route checks. See the logged requested/final URLs and HTTP statuses.`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
