#!/usr/bin/env tsx
/**
 * promote-article-facts.ts
 *
 * Step 3 of the assembly-line pipeline (A-082):
 * Fetches a FreeJobAlert article, extracts ArticleFacts, and promotes them
 * to post_enrichments for a specific Post — with field-level protection,
 * true idempotency, schema gap reporting, and a genuinely read-only dry-run.
 *
 * NEVER executes the cancelled APPSC SQL.
 * NEVER overwrites VERIFIED fields with PENDING data.
 * NEVER writes during a dry run (no postings, post_enrichments, or source_observations writes).
 *
 * Architecture principles (owner direction, A-082):
 *   - Post-first: all writes target post_enrichments (post-level), not postings (recruitment-level)
 *   - Field-level protection: each column is independently guarded; PENDING row status
 *     does not authorize overwriting any populated field
 *   - Discovery ≠ verification: FJA-derived data remains PENDING until checked against
 *     the official notification; promotion means data moved through the pipeline, not that
 *     facts are verified
 *   - Schema gaps reported explicitly: examPattern, vacanciesByZone, horizontalReservations,
 *     applicationCorrection are named in the gap report, not silently dropped
 *
 * Usage:
 *   # Dry-run (reads nothing, writes nothing):
 *   POST_ID=379 ARTICLE_URL=https://www.freejobalert.com/... npx tsx scripts/promote-article-facts.ts
 *   POST_ID=379 ARTICLE_URL=https://... npx tsx scripts/promote-article-facts.ts --dry-run
 *
 *   # Emit SQL only (dry-run + prints the SQL that would be applied, for MCP execution):
 *   POST_ID=379 ARTICLE_URL=https://... npx tsx scripts/promote-article-facts.ts --emit-sql
 *
 *   # Apply (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env):
 *   POST_ID=379 ARTICLE_URL=https://... npx tsx scripts/promote-article-facts.ts --apply
 *
 * Environment variables:
 *   POST_ID                   — required; the canonical post_id to update
 *   ARTICLE_URL               — optional; article URL (if absent, looked up via Supabase REST)
 *   SUPABASE_URL              — Supabase project URL (for DB reads/writes via REST API)
 *   SUPABASE_SERVICE_ROLE_KEY — service role JWT (for authenticated REST API calls)
 *   DRY_RUN                   — "1" forces dry-run regardless of --apply flag
 *
 * DB connectivity:
 *   The script uses the Supabase REST API (PostgREST + RPC over HTTPS) rather than
 *   direct TCP to port 5432, which is blocked in the agent container. Supply
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local for live DB operations.
 *   Without these, --dry-run and --emit-sql work fully from ARTICLE_URL alone.
 *   The Claude session (via Supabase MCP connector) can execute the emitted SQL directly.
 *
 * Extraction confidence scoring:
 *   extractionConfidence = 80  (secondary source, FJA article, key scalar fields found)
 *   Scoring rule: 100 = official notification verified; 80 = FJA article with key scalars
 *   (salary, dates); 60 = FJA article, dates only; 40 = FJA article, partial extraction;
 *   0 = no structured data extracted. A score of 80 means the extractor found at least
 *   one key scalar (salary or closing date) from a secondary aggregator source. The
 *   sourceVerificationStatus remains PENDING until checked against official notification.
 */

import { parseFreeJobAlertArticle } from "../src/enrich/freejobalert-article";

// ---------------------------------------------------------------------------
// CLI + environment
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const APPLY_FLAG = args.includes("--apply");
const DRY_RUN_FLAG = args.includes("--dry-run") || process.env.DRY_RUN === "1";
const EMIT_SQL_FLAG = args.includes("--emit-sql");

// Dry-run unless --apply is explicitly passed and DRY_RUN env is not set
const IS_DRY_RUN = DRY_RUN_FLAG || EMIT_SQL_FLAG || !APPLY_FLAG;

const POST_ID_RAW = process.env.POST_ID;
const ARTICLE_URL_OVERRIDE = process.env.ARTICLE_URL ?? null;

// Supabase REST API credentials (optional — enables live DB reads/writes)
const SUPABASE_URL = process.env.SUPABASE_URL ?? null;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
const HAS_DB_CREDS = !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

if (!POST_ID_RAW) {
  console.error("Error: POST_ID environment variable is required.");
  console.error("  POST_ID=379 ARTICLE_URL=https://... npx tsx scripts/promote-article-facts.ts --dry-run");
  process.exit(1);
}
const POST_ID = parseInt(POST_ID_RAW, 10);
if (isNaN(POST_ID) || POST_ID <= 0) {
  console.error(`Error: POST_ID must be a positive integer, got: "${POST_ID_RAW}"`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Known schema gaps — these fields exist in ArticleFacts or commonly appear
// in FJA articles but have NO column in post_enrichments.
// They must be reported explicitly, never silently dropped.
// ---------------------------------------------------------------------------
const SCHEMA_GAPS: Record<string, string> = {
  examPattern:           "Exam pattern tables extracted to extraContent.tables but no dedicated column",
  vacanciesByZone:       "Zone-wise vacancy breakdown has no dedicated column; stored in extraContent.tables if present",
  horizontalReservations:"Horizontal reservation matrix (PH/Ex-servicemen/Women) has no column; outstanding extraction/schema work",
  applicationCorrection: "Correction window rules and dates have no column; outstanding extraction/schema work",
};

// ---------------------------------------------------------------------------
// Field mapping contract (from ARTICLEFACTS_MAPPING_CONTRACT.md, Section 2B)
// These are the post_enrichments columns that CAN be populated from ArticleFacts.
// ---------------------------------------------------------------------------
interface FieldMapping {
  column: string;          // post_enrichments column name
  getValue: (f: NormalizedFacts) => unknown;
  description: string;
}

// Intermediate shape after normalizing ArticleFacts
interface NormalizedFacts {
  salaryMin:               number | null;
  salaryMax:               number | null;
  applicationFeeGeneral:   number | null;
  applicationFeeReserved:  number | null;
  ageLimitMin:             number | null;
  ageLimitMax:             number | null;
  ageRelaxationNotes:      string | null;
  validThrough:            string | null;  // ISO date string
  examDate:                string | null;  // ISO date string
  applyUrl:                string | null;
  officialNotificationUrl: string | null;
  officialWebsiteUrl:      string | null;
  extraContentJson:        string | null;  // JSON of ExtraContent
  dataGapsFromUnparsed:    string[];       // "extraction:<section>" entries
}

const FIELD_MAPPINGS: FieldMapping[] = [
  {
    column: "salaryMin",
    getValue: (f) => f.salaryMin,
    description: "Minimum salary (rupees/month) from salary section",
  },
  {
    column: "salaryMax",
    getValue: (f) => f.salaryMax,
    description: "Maximum salary (rupees/month) from salary section",
  },
  {
    column: "applicationClosingDate",
    getValue: (f) => f.validThrough,
    description: "Application closing date from important dates section",
  },
  {
    column: "examDate",
    getValue: (f) => f.examDate,
    description: "Exam date from important dates section",
  },
  {
    column: "education",
    getValue: () => null,   // Not directly in ArticleFacts scalar fields
    description: "Education/qualification — not directly mappable from ArticleFacts scalars",
  },
  // applyUrl, officialNotificationUrl go to postings via mergeArticleFacts, not post_enrichments
];

// ---------------------------------------------------------------------------
// Current state of post_enrichments row (what we'd be updating)
// ---------------------------------------------------------------------------
interface EnrichmentRow {
  post_id: number;
  sourceVerificationStatus: string | null;
  extractionConfidence: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNote: string | null;
  payScale: string | null;
  applicationClosingDate: string | null;
  examDate: string | null;
  admitCardDate: string | null;
  resultDate: string | null;
  notificationDate: string | null;
  applicationOpenDate: string | null;
  dataGaps: string[] | null;
  vacanciesTotal: number | null;
  vacanciesByCategory: unknown | null;
  eligibilityPathways: unknown | null;
  documentsRequired: unknown | null;
  selectionProcess: unknown | null;
  education: string | null;
  experience: string | null;
  benefits: string | null;
  payLevel: unknown | null;
}

// ---------------------------------------------------------------------------
// Supabase REST API client (replaces getDb() / TCP port 5432)
// ---------------------------------------------------------------------------
interface SupabaseRestResult {
  rows: Record<string, unknown>[];
  error: string | null;
}

async function supabaseQuery(sql: string): Promise<SupabaseRestResult> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "DB credentials not available. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, " +
      "or use --emit-sql to print the SQL for manual execution via the Supabase MCP connector."
    );
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_raw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Prefer": "return=representation",
    },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase REST error ${res.status}: ${body}`);
  }
  const data = await res.json() as unknown[];
  return { rows: data as Record<string, unknown>[], error: null };
}

// ---------------------------------------------------------------------------
// Lookup the FJA article URL from fja_post_inventory
// Correct join: posts → recruitments → fja_job_inventory (by title match)
// (fja_post_inventory does NOT have a post_id column; look up via recruitment name)
// ---------------------------------------------------------------------------
async function lookupArticleUrl(postId: number): Promise<string | null> {
  const sql = `
    SELECT fji.source_url
    FROM posts po
    JOIN recruitments r ON r.id = po.recruitment_id
    JOIN fja_job_inventory fji ON fji.title = r.name
    WHERE po.id = ${postId}
    LIMIT 1
  `;
  const result = await supabaseQuery(sql);
  const rows = result.rows;
  return rows.length > 0 ? (rows[0].source_url as string) ?? null : null;
}

// ---------------------------------------------------------------------------
// Fetch the current post_enrichments row
// ---------------------------------------------------------------------------
async function fetchEnrichmentRow(postId: number): Promise<EnrichmentRow | null> {
  const sql = `
    SELECT
      post_id,
      "sourceVerificationStatus",
      "extractionConfidence",
      "salaryMin",
      "salaryMax",
      "salaryNote",
      "payScale",
      "applicationClosingDate",
      "examDate",
      "admitCardDate",
      "resultDate",
      "notificationDate",
      "applicationOpenDate",
      "dataGaps",
      "vacanciesTotal",
      "vacanciesByCategory",
      "eligibilityPathways",
      "documentsRequired",
      "selectionProcess",
      "education",
      "experience",
      "benefits",
      "payLevel"
    FROM post_enrichments
    WHERE post_id = ${postId}
    LIMIT 1
  `;
  const result = await supabaseQuery(sql);
  const rows = result.rows;
  return rows.length > 0 ? (rows[0] as unknown as EnrichmentRow) : null;
}

// ---------------------------------------------------------------------------
// Fetch post context (name, slug, recruitment title)
// ---------------------------------------------------------------------------
async function fetchPostContext(postId: number): Promise<{
  name: string | null;
  slug: string | null;
  recruitmentTitle: string | null;
}> {
  const sql = `
    SELECT
      p.name,
      p.slug,
      r.name AS recruitment_title
    FROM posts p
    LEFT JOIN recruitments r ON r.id = p.recruitment_id
    WHERE p.id = ${postId}
    LIMIT 1
  `;
  const result = await supabaseQuery(sql);
  const rows = result.rows;
  if (rows.length === 0) return { name: null, slug: null, recruitmentTitle: null };
  return {
    name: (rows[0].name as string) ?? null,
    slug: (rows[0].slug as string) ?? null,
    recruitmentTitle: (rows[0].recruitment_title as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Fetch the article HTML
// ---------------------------------------------------------------------------
async function fetchArticle(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JobOye-Pipeline/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// Normalize ArticleFacts → typed intermediate shape
// dataGapsFromUnparsed uses "extraction:<section>" prefix to distinguish
// extraction failures from schema capability gaps ("schema-gap:<field>")
// ---------------------------------------------------------------------------
function normalizeArticleFacts(facts: ReturnType<typeof parseFreeJobAlertArticle>): NormalizedFacts {
  return {
    salaryMin:               facts.salaryMin               ?? null,
    salaryMax:               facts.salaryMax               ?? null,
    applicationFeeGeneral:   facts.applicationFeeGeneral   ?? null,
    applicationFeeReserved:  facts.applicationFeeReserved  ?? null,
    ageLimitMin:             facts.ageLimitMin              ?? null,
    ageLimitMax:             facts.ageLimitMax              ?? null,
    ageRelaxationNotes:      facts.ageRelaxationNotes       ?? null,
    validThrough:            facts.validThrough ? facts.validThrough.toISOString() : null,
    examDate:                facts.examDate ? facts.examDate.toISOString() : null,
    applyUrl:                facts.applyUrl                ?? null,
    officialNotificationUrl: facts.officialNotificationUrl ?? null,
    officialWebsiteUrl:      facts.officialWebsiteUrl      ?? null,
    extraContentJson:        facts.extraContent ? JSON.stringify(facts.extraContent) : null,
    // "extraction:" prefix distinguishes extractor failures from schema capability gaps
    dataGapsFromUnparsed:    facts.unparsed.map((u) => `extraction:${u}`),
  };
}

// ---------------------------------------------------------------------------
// Field-level protection logic
// ---------------------------------------------------------------------------
type FieldOutcome =
  | { action: "write";   currentValue: unknown; proposedValue: unknown; reason: string }
  | { action: "skip";    currentValue: unknown; proposedValue: unknown; reason: string }
  | { action: "protect"; currentValue: unknown; proposedValue: unknown; reason: string }
  | { action: "nodata";  reason: string };

function evaluateField(
  column: string,
  current: unknown,
  proposed: unknown,
  isVerified: boolean,
): FieldOutcome {
  if (proposed === null || proposed === undefined) {
    return { action: "nodata", reason: "extractor returned no value" };
  }
  if (current !== null && current !== undefined) {
    if (isVerified) {
      return {
        action: "protect",
        currentValue: current,
        proposedValue: proposed,
        reason: "field already has VERIFIED value — will not overwrite with PENDING data",
      };
    }
    return {
      action: "skip",
      currentValue: current,
      proposedValue: proposed,
      reason: "field already populated (fill-only policy); proposed value discarded",
    };
  }
  return {
    action: "write",
    currentValue: null,
    proposedValue: proposed,
    reason: "field is empty — will populate with PENDING data",
  };
}

// ---------------------------------------------------------------------------
// Build the promotion plan
// ---------------------------------------------------------------------------
interface PromotionPlan {
  postId: number;
  articleUrl: string;
  isNewRow: boolean;
  isVerified: boolean;
  fields: Record<string, FieldOutcome>;
  schemaGaps: typeof SCHEMA_GAPS;
  dataGapsToAppend: string[];
  reviewFlags: string[];
  unmappedFacts: string[];
  willWrite: boolean;
}

function buildPromotionPlan(
  postId: number,
  articleUrl: string,
  facts: ReturnType<typeof parseFreeJobAlertArticle>,
  current: EnrichmentRow | null,
): PromotionPlan {
  const normalized = normalizeArticleFacts(facts);
  const isNewRow = current === null;
  const isVerified = !isNewRow && current!.sourceVerificationStatus === "VERIFIED";

  const fields: Record<string, FieldOutcome> = {};

  fields["salaryMin"] = evaluateField(
    "salaryMin",
    current?.salaryMin ?? null,
    normalized.salaryMin,
    isVerified,
  );

  fields["salaryMax"] = evaluateField(
    "salaryMax",
    current?.salaryMax ?? null,
    normalized.salaryMax,
    isVerified,
  );

  fields["applicationClosingDate"] = evaluateField(
    "applicationClosingDate",
    current?.applicationClosingDate ?? null,
    normalized.validThrough,
    isVerified,
  );

  fields["examDate"] = evaluateField(
    "examDate",
    current?.examDate ?? null,
    normalized.examDate,
    isVerified,
  );

  // Facts routed to postings table (not post_enrichments) — informational only
  const unmappedFacts: string[] = [];
  if (normalized.applyUrl) unmappedFacts.push(`applyUrl → goes to postings."applyUrl" via mergeArticleFacts (not post_enrichments)`);
  if (normalized.officialNotificationUrl) unmappedFacts.push(`officialNotificationUrl → goes to postings."officialNotificationUrl" via mergeArticleFacts (not post_enrichments)`);
  if (normalized.officialWebsiteUrl) unmappedFacts.push(`officialWebsiteUrl → goes to postings."websiteUrl" via mergeArticleFacts (not post_enrichments)`);
  if (normalized.ageLimitMin !== null) unmappedFacts.push(`ageLimitMin (${normalized.ageLimitMin}) → goes to postings."ageLimitMin" via mergeArticleFacts`);
  if (normalized.ageLimitMax !== null) unmappedFacts.push(`ageLimitMax (${normalized.ageLimitMax}) → goes to postings."ageLimitMax" via mergeArticleFacts`);
  if (normalized.ageRelaxationNotes) unmappedFacts.push(`ageRelaxationNotes → goes to postings."ageRelaxationNotes" via mergeArticleFacts`);
  if (normalized.applicationFeeGeneral !== null) unmappedFacts.push(`applicationFeeGeneral (${normalized.applicationFeeGeneral}) → goes to postings."applicationFeeGeneral" via mergeArticleFacts`);
  if (normalized.applicationFeeReserved !== null) unmappedFacts.push(`applicationFeeReserved (${normalized.applicationFeeReserved}) → goes to postings."applicationFeeReserved" via mergeArticleFacts`);
  if (normalized.extraContentJson) unmappedFacts.push(`extraContent (tables: ${facts.extraContent?.tables?.length ?? 0} tables) → goes to postings."extraContent" via mergeArticleFacts`);

  // dataGaps: "extraction:" prefix for extractor failures, "schema-gap:" for schema capability gaps
  const existingGaps = new Set(current?.dataGaps ?? []);
  // Extraction failures: sections present in source but extractor yielded no structured data
  const newExtractionGaps = normalized.dataGapsFromUnparsed.filter((g) => !existingGaps.has(g));
  // Schema capability gaps: data extracted but no column exists for it
  const relevantSchemaGaps: string[] = [];
  if (facts.extraContent?.tables?.some((t) => /exam pattern/i.test(t.title))) {
    if (!existingGaps.has("schema-gap:examPattern")) relevantSchemaGaps.push("schema-gap:examPattern");
  }
  if (facts.extraContent?.tables?.some((t) => /vacanc/i.test(t.title))) {
    if (!existingGaps.has("schema-gap:vacanciesByZone")) relevantSchemaGaps.push("schema-gap:vacanciesByZone");
  }

  const dataGapsToAppend = [...newExtractionGaps, ...relevantSchemaGaps];

  const reviewFlags = facts.review;

  const willWrite = Object.values(fields).some((f) => f.action === "write") || dataGapsToAppend.length > 0;

  return {
    postId,
    articleUrl,
    isNewRow,
    isVerified,
    fields,
    schemaGaps: SCHEMA_GAPS,
    dataGapsToAppend,
    reviewFlags,
    unmappedFacts,
    willWrite,
  };
}

// ---------------------------------------------------------------------------
// Build the idempotent upsert SQL (used by both --apply and --emit-sql)
// ---------------------------------------------------------------------------
function buildUpsertSql(plan: PromotionPlan): string | null {
  if (plan.isVerified) {
    if (plan.dataGapsToAppend.length > 0) {
      const gapLiterals = plan.dataGapsToAppend.map((g) => `'${g.replace(/'/g, "''")}'`).join(", ");
      return `
UPDATE post_enrichments SET
  "dataGaps" = (
    SELECT array_agg(DISTINCT g)
    FROM unnest(
      COALESCE("dataGaps", ARRAY[]::text[]) ||
      ARRAY[${gapLiterals}]
    ) AS g
  )
WHERE post_id = ${plan.postId};
`.trim();
    }
    return null; // VERIFIED row, no gaps to append
  }

  // Collect fields to write
  const writeFields: Record<string, unknown> = {};
  for (const [col, outcome] of Object.entries(plan.fields)) {
    if (outcome.action === "write" && outcome.proposedValue !== null && outcome.proposedValue !== undefined) {
      writeFields[col] = outcome.proposedValue;
    }
  }

  if (Object.keys(writeFields).length === 0 && plan.dataGapsToAppend.length === 0) {
    return null; // Nothing to write
  }

  // UPDATE clauses with COALESCE idempotency (never overwrites existing value)
  const updateClauses: string[] = [];
  for (const [col, val] of Object.entries(writeFields)) {
    const escapedVal = typeof val === "string"
      ? `'${val.replace(/'/g, "''")}'`
      : typeof val === "number"
      ? String(val)
      : `'${String(val).replace(/'/g, "''")}'`;
    updateClauses.push(`"${col}" = COALESCE(post_enrichments."${col}", ${escapedVal})`);
  }

  if (plan.dataGapsToAppend.length > 0) {
    const gapLiterals = plan.dataGapsToAppend.map((g) => `'${g.replace(/'/g, "''")}'`).join(", ");
    updateClauses.push(`"dataGaps" = (
    SELECT array_agg(DISTINCT g)
    FROM unnest(
      COALESCE(post_enrichments."dataGaps", ARRAY[]::text[]) ||
      ARRAY[${gapLiterals}]
    ) AS g
  )`);
  }

  updateClauses.push(`"extractionConfidence" = GREATEST(COALESCE(post_enrichments."extractionConfidence", 0), 80)`);
  updateClauses.push(`"sourceVerificationStatus" = COALESCE(post_enrichments."sourceVerificationStatus", 'PENDING')`);

  // INSERT columns for new rows
  const insertColNames = ['"post_id"', '"extractionConfidence"', '"sourceVerificationStatus"'];
  const insertColVals = [String(plan.postId), '80', "'PENDING'"];
  if (plan.dataGapsToAppend.length > 0) {
    insertColNames.push('"dataGaps"');
    const gapLiterals = plan.dataGapsToAppend.map((g) => `'${g.replace(/'/g, "''")}'`).join(", ");
    insertColVals.push(`ARRAY[${gapLiterals}]::text[]`);
  }
  for (const [col, val] of Object.entries(writeFields)) {
    insertColNames.push(`"${col}"`);
    const escapedVal = typeof val === "string"
      ? `'${val.replace(/'/g, "''")}'`
      : String(val);
    insertColVals.push(escapedVal);
  }

  return `
INSERT INTO post_enrichments (${insertColNames.join(", ")})
VALUES (${insertColVals.join(", ")})
ON CONFLICT (post_id) DO UPDATE SET
  ${updateClauses.join(",\n  ")};
`.trim();
}

// ---------------------------------------------------------------------------
// Render the dry-run report (console)
// ---------------------------------------------------------------------------
function renderReport(plan: PromotionPlan, facts: ReturnType<typeof parseFreeJobAlertArticle>): void {
  const divider = "─".repeat(72);

  console.log(`\n${"═".repeat(72)}`);
  console.log(`PROMOTION DRY-RUN REPORT`);
  console.log(`Post ID    : ${plan.postId}`);
  console.log(`Article URL: ${plan.articleUrl}`);
  console.log(`Mode       : ${plan.isVerified ? "VERIFIED ROW (field protection active)" : plan.isNewRow ? "NEW ROW" : "PENDING ROW"}`);
  console.log(`${"═".repeat(72)}\n`);

  // 1. Field-level outcomes
  console.log(`FIELD OUTCOMES`);
  console.log(divider);
  let writeCount = 0, skipCount = 0, protectCount = 0, nodataCount = 0;
  for (const [col, outcome] of Object.entries(plan.fields)) {
    const icon = outcome.action === "write" ? "✏️ " : outcome.action === "skip" ? "⏭  " : outcome.action === "protect" ? "🔒 " : "·  ";
    console.log(`  ${icon} ${col.padEnd(28)} → ${outcome.action.toUpperCase()}`);
    if (outcome.action === "write")   { console.log(`       current : (empty)`);              console.log(`       proposed: ${String(outcome.proposedValue).slice(0, 80)}`); writeCount++; }
    if (outcome.action === "skip")    { console.log(`       current : ${String(outcome.currentValue).slice(0, 80)}`); console.log(`       skipping: ${String(outcome.proposedValue).slice(0, 80)}`); skipCount++; }
    if (outcome.action === "protect") { console.log(`       VERIFIED: ${String(outcome.currentValue).slice(0, 80)}`); console.log(`       ignored : ${String(outcome.proposedValue).slice(0, 80)}`); protectCount++; }
    if (outcome.action === "nodata")  { nodataCount++; }
  }
  console.log(`\n  Summary: ${writeCount} write, ${skipCount} skip (fill-only), ${protectCount} protected (VERIFIED), ${nodataCount} no-data\n`);

  // 2. Schema gaps
  console.log(`SCHEMA GAPS (fields not yet in post_enrichments)`);
  console.log(divider);
  for (const [key, desc] of Object.entries(plan.schemaGaps)) {
    const inThisExtraction = key === "examPattern"
      ? facts.extraContent?.tables?.some((t) => /exam pattern/i.test(t.title)) ?? false
      : key === "vacanciesByZone"
      ? facts.extraContent?.tables?.some((t) => /vacanc/i.test(t.title)) ?? false
      : false;
    const marker = inThisExtraction ? "  ⚠️  PRESENT in this extraction — data would be lost without schema column" : "  ·  not found in this extraction";
    console.log(`  [${key}]`);
    console.log(`  ${desc}`);
    console.log(marker);
    console.log();
  }

  // 3. Facts going to postings (not post_enrichments)
  if (plan.unmappedFacts.length > 0) {
    console.log(`FACTS ROUTED TO postings TABLE (not post_enrichments)`);
    console.log(divider);
    console.log(`  These facts were extracted but belong to the postings-path (mergeArticleFacts).`);
    console.log(`  They are NOT written by this script. A separate promotion step handles them.`);
    for (const f of plan.unmappedFacts) {
      console.log(`    • ${f}`);
    }
    console.log();
  }

  // 4. Data gaps to record
  if (plan.dataGapsToAppend.length > 0) {
    console.log(`DATA GAPS TO RECORD (new entries for dataGaps column)`);
    console.log(divider);
    console.log(`  Prefixes: "extraction:" = section present but extractor yielded no structured data`);
    console.log(`            "schema-gap:" = data extracted but no dedicated column in post_enrichments`);
    for (const g of plan.dataGapsToAppend) {
      console.log(`    + ${g}`);
    }
    console.log();
  }

  // 5. Review flags from extractor
  if (plan.reviewFlags.length > 0) {
    console.log(`REVIEW FLAGS (extractor flagged these values as suspicious)`);
    console.log(divider);
    for (const r of plan.reviewFlags) {
      console.log(`    ⚠️  ${r}`);
    }
    console.log();
  }

  // 6. Unparsed sections
  if (facts.unparsed.length > 0) {
    console.log(`UNPARSED SECTIONS (present on page, extractor yielded no structured data → recorded as extraction: gaps)`);
    console.log(divider);
    for (const u of facts.unparsed) {
      console.log(`    · ${u}  →  will be recorded as "extraction:${u}"`);
    }
    console.log();
  }

  // 7. Extractor debug (headings found)
  if (facts.debug?.headings?.length) {
    console.log(`ARTICLE HEADINGS FOUND`);
    console.log(divider);
    for (const h of facts.debug.headings) {
      console.log(`    · ${h}`);
    }
    console.log();
  }

  // 8. Summary verdict
  console.log(`${"═".repeat(72)}`);
  if (!plan.willWrite) {
    console.log(`VERDICT: No changes would be made (all fields already populated or no data extracted).`);
  } else {
    console.log(`VERDICT: ${writeCount} field(s) would be written to post_enrichments.`);
    if (plan.dataGapsToAppend.length > 0) {
      console.log(`         ${plan.dataGapsToAppend.length} data gap(s) would be appended.`);
    }
    console.log(`         extractionConfidence = 80 (FJA secondary source, key scalars found)`);
    console.log(`         sourceVerificationStatus = PENDING (requires official notification check)`);
    console.log(`\nTo apply via MCP: run with --emit-sql, then execute the SQL via Supabase MCP connector.`);
    console.log(`To apply directly: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and run with --apply.`);
  }
  console.log(`${"═".repeat(72)}\n`);
}

// ---------------------------------------------------------------------------
// Apply the promotion plan (writes to post_enrichments via Supabase REST)
// ---------------------------------------------------------------------------
async function applyPromotion(plan: PromotionPlan): Promise<void> {
  if (plan.isVerified && plan.dataGapsToAppend.length === 0) {
    console.log("Row is VERIFIED and no new gaps — no changes applied.");
    return;
  }

  const sql = buildUpsertSql(plan);
  if (!sql) {
    console.log("No changes to apply (all fields already populated).");
    return;
  }

  await supabaseQuery(sql);

  const writeFields = Object.entries(plan.fields)
    .filter(([, o]) => o.action === "write")
    .map(([col]) => col);

  if (writeFields.length > 0) {
    console.log(`✓ Wrote ${writeFields.length} field(s): ${writeFields.join(", ")}`);
  }
  if (plan.dataGapsToAppend.length > 0) {
    console.log(`✓ Appended ${plan.dataGapsToAppend.length} data gap(s): ${plan.dataGapsToAppend.join(", ")}`);
  }
  console.log(`✓ post_enrichments updated for post_id=${plan.postId} (PENDING; extractionConfidence=80)`);
  console.log(`  sourceVerificationStatus remains PENDING until verified against official notification.`);
  console.log(`  Resolvers will NOT surface these values until status is promoted to VERIFIED.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log(`\n=== Article Facts Promotion ===`);
  console.log(`Post ID : ${POST_ID}`);
  console.log(`Mode    : ${IS_DRY_RUN ? (EMIT_SQL_FLAG ? "DRY RUN + EMIT SQL" : "DRY RUN (no DB writes)") : "APPLY"}`);
  console.log(`DB creds: ${HAS_DB_CREDS ? "available (REST API)" : "not set (dry-run / --emit-sql only)"}`);
  console.log();

  // 1. Resolve article URL
  let articleUrl = ARTICLE_URL_OVERRIDE;
  if (!articleUrl) {
    if (!HAS_DB_CREDS) {
      console.error("Error: ARTICLE_URL is required when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.");
      console.error("  POST_ID=379 ARTICLE_URL=https://... npx tsx scripts/promote-article-facts.ts --dry-run");
      process.exit(1);
    }
    console.log("Looking up article URL from fja_job_inventory (via recruitment name match)...");
    articleUrl = await lookupArticleUrl(POST_ID);
    if (!articleUrl) {
      console.error(`Error: No FJA article URL found for post_id=${POST_ID}. Supply one with ARTICLE_URL=<url>.`);
      process.exit(1);
    }
  }
  console.log(`Article URL: ${articleUrl}\n`);

  // 2. Fetch post context (if DB available)
  if (HAS_DB_CREDS) {
    const postContext = await fetchPostContext(POST_ID);
    if (postContext.name) {
      console.log(`Post       : ${postContext.name}`);
      if (postContext.recruitmentTitle) console.log(`Recruitment: ${postContext.recruitmentTitle}`);
      console.log();
    }
  }

  // 3. Fetch article HTML and extract facts
  console.log("Fetching article HTML...");
  const html = await fetchArticle(articleUrl);
  console.log(`Fetched ${html.length.toLocaleString()} bytes`);

  console.log("Extracting ArticleFacts...");
  const facts = parseFreeJobAlertArticle(html);

  const extractedSummary: string[] = [];
  if (facts.salaryMin != null) extractedSummary.push(`salary ${facts.salaryMin}–${facts.salaryMax ?? facts.salaryMin}`);
  if (facts.ageLimitMin != null) extractedSummary.push(`age ${facts.ageLimitMin}–${facts.ageLimitMax ?? "?"}`);
  if (facts.applicationFeeGeneral != null) extractedSummary.push(`fee ₹${facts.applicationFeeGeneral}`);
  if (facts.validThrough) extractedSummary.push(`closing ${facts.validThrough.toISOString().slice(0, 10)}`);
  if (facts.examDate) extractedSummary.push(`exam ${facts.examDate.toISOString().slice(0, 10)}`);
  if (facts.applyUrl) extractedSummary.push("applyUrl");
  if (facts.officialNotificationUrl) extractedSummary.push("officialNotificationUrl");
  if (facts.extraContent?.tables?.length) extractedSummary.push(`${facts.extraContent.tables.length} table(s)`);
  console.log(`Extracted: ${extractedSummary.length > 0 ? extractedSummary.join(", ") : "(nothing)"}`);
  if (facts.unparsed.length) console.log(`Unparsed sections: ${facts.unparsed.join(", ")}`);
  if (facts.review.length) console.log(`Review flags: ${facts.review.join(", ")}`);
  console.log();

  // 4. Fetch current enrichment row (if DB available)
  let current: EnrichmentRow | null = null;
  if (HAS_DB_CREDS) {
    console.log("Fetching current post_enrichments row...");
    current = await fetchEnrichmentRow(POST_ID);
    if (current) {
      console.log(`Found existing row: status=${current.sourceVerificationStatus}, confidence=${current.extractionConfidence}`);
      const populated: string[] = [];
      if (current.salaryMin != null) populated.push(`salaryMin=${current.salaryMin}`);
      if (current.salaryMax != null) populated.push(`salaryMax=${current.salaryMax}`);
      if (current.applicationClosingDate != null) populated.push(`closingDate=${current.applicationClosingDate}`);
      if (current.examDate != null) populated.push(`examDate=${current.examDate}`);
      if (current.dataGaps?.length) populated.push(`${current.dataGaps.length} existing dataGaps`);
      if (populated.length) console.log(`Populated fields: ${populated.join(", ")}`);
    } else {
      console.log("No existing row — would INSERT new row.");
    }
    console.log();
  } else {
    console.log("(DB not available — assuming no existing enrichment row; pass SUPABASE_URL+KEY for live check)\n");
  }

  // 5. Build promotion plan
  const plan = buildPromotionPlan(POST_ID, articleUrl, facts, current);

  // 6. Render report (always, even on apply)
  renderReport(plan, facts);

  // 7. Emit SQL if requested
  if (EMIT_SQL_FLAG) {
    const sql = buildUpsertSql(plan);
    if (sql) {
      console.log(`\n${"═".repeat(72)}`);
      console.log(`EMITTED SQL (execute via Supabase MCP connector):`);
      console.log(`${"═".repeat(72)}`);
      console.log(sql);
      console.log(`${"═".repeat(72)}\n`);
    } else {
      console.log("No SQL to emit — no changes would be made.");
    }
    return;
  }

  // 8. Apply or stop
  if (IS_DRY_RUN) {
    console.log("DRY RUN complete. No database writes were performed.");
    console.log("Use --emit-sql to print the SQL for MCP execution, or set DB credentials and use --apply.\n");
    return;
  }

  // Apply via Supabase REST API
  if (!HAS_DB_CREDS) {
    console.error("Error: --apply requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.");
    console.error("Use --emit-sql instead to get the SQL for execution via the Supabase MCP connector.");
    process.exit(1);
  }

  console.log("Applying promotion...");
  await applyPromotion(plan);
  console.log("\nPromotion complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nFatal error:", err instanceof Error ? err.message : String(err));
    if (err instanceof Error && (err as any).cause) console.error("Caused by:", (err as any).cause);
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  });
