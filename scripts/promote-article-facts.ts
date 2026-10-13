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
 *   ARTICLE_URL=https://www.freejobalert.com/... POST_ID=1584 npx tsx scripts/promote-article-facts.ts
 *   POST_ID=1584 npx tsx scripts/promote-article-facts.ts --dry-run
 *
 *   # Apply (after reviewing the dry-run report):
 *   POST_ID=1584 ARTICLE_URL=https://... npx tsx scripts/promote-article-facts.ts --apply
 *
 * Environment variables:
 *   POST_ID          — required; the canonical post_id to update
 *   ARTICLE_URL      — optional; overrides the URL looked up from fja_post_inventory
 *   DRY_RUN          — "1" forces dry-run regardless of --apply flag
 */

import { getDb } from "../src/db";
import { parseFreeJobAlertArticle } from "../src/enrich/freejobalert-article";
import { mergeArticleFacts } from "../src/ingest/enrich-facts";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// CLI + environment
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const APPLY_FLAG = args.includes("--apply");
const DRY_RUN_FLAG = args.includes("--dry-run") || process.env.DRY_RUN === "1";

// Dry-run unless --apply is explicitly passed and DRY_RUN env is not set
const IS_DRY_RUN = DRY_RUN_FLAG || !APPLY_FLAG;

const POST_ID_RAW = process.env.POST_ID;
const ARTICLE_URL_OVERRIDE = process.env.ARTICLE_URL ?? null;

if (!POST_ID_RAW) {
  console.error("Error: POST_ID environment variable is required.");
  console.error("  POST_ID=1584 npx tsx scripts/promote-article-facts.ts --dry-run");
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
// Each entry: { column, source, protection }
// ---------------------------------------------------------------------------
interface FieldMapping {
  column: string;          // post_enrichments column name
  getValue: (f: NormalizedFacts) => unknown;
  description: string;
  requiresNonNull?: boolean;
}

// Intermediate shape after merging ArticleFacts into normalized values
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
  dataGapsFromUnparsed:    string[];       // unparsed[] → appended to dataGaps
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
    getValue: () => null,   // Not directly in ArticleFacts scalar fields; handled via extraContent
    description: "Education/qualification — not directly mappable from ArticleFacts scalars",
  },
  // applyUrl, officialNotificationUrl go to postings via mergeArticleFacts, not post_enrichments
  // salaryNote, feeNote, ageNote — not in ArticleFacts; held for manual enrichment
];

// Columns that CAN receive extraContent (the combined table store)
const EXTRA_CONTENT_COLUMN = "extraContent"; // not in post_enrichments — goes to postings

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

async function fetchEnrichmentRow(db: ReturnType<typeof getDb>, postId: number): Promise<EnrichmentRow | null> {
  const rows = await db.execute<Record<string, unknown>>(sql.raw(`
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
  `));
  const arr = Array.isArray(rows) ? rows : (rows as any).rows ?? [];
  return arr.length > 0 ? (arr[0] as unknown as EnrichmentRow) : null;
}

// ---------------------------------------------------------------------------
// Look up the FJA article URL from fja_post_inventory if not overridden
// ---------------------------------------------------------------------------
async function lookupArticleUrl(db: ReturnType<typeof getDb>, postId: number): Promise<string | null> {
  const rows = await db.execute<{ source_url: string }>(sql.raw(`
    SELECT fi.source_url
    FROM fja_post_inventory fi
    WHERE fi.post_id = ${postId}
    LIMIT 1
  `));
  const arr = Array.isArray(rows) ? rows : (rows as any).rows ?? [];
  return arr.length > 0 ? arr[0].source_url : null;
}

// Also check fja_job_inventory for the linked posting's source URL
async function lookupFjaInventoryUrl(db: ReturnType<typeof getDb>, postId: number): Promise<string | null> {
  const rows = await db.execute<{ source_url: string }>(sql.raw(`
    SELECT fi.source_url
    FROM fja_job_inventory fi
    JOIN postings p ON p.id = (
      SELECT posting_id FROM posts WHERE id = ${postId} LIMIT 1
    )
    WHERE fi.external_id = p."externalId"
    LIMIT 1
  `));
  const arr = Array.isArray(rows) ? rows : (rows as any).rows ?? [];
  return arr.length > 0 ? arr[0].source_url : null;
}

// ---------------------------------------------------------------------------
// Normalize ArticleFacts → typed intermediate shape
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
    dataGapsFromUnparsed:    facts.unparsed,
  };
}

// ---------------------------------------------------------------------------
// Field-level protection logic
// A field is protected if:
//   (a) the current value is non-null, AND
//   (b) the current sourceVerificationStatus is 'VERIFIED'
// A field is skippable (fill-only) if:
//   the current value is non-null regardless of status (fill-only policy)
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
    // Fill-only: existing value takes precedence over new PENDING data
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

  // -- salaryMin --
  fields["salaryMin"] = evaluateField(
    "salaryMin",
    current?.salaryMin ?? null,
    normalized.salaryMin,
    isVerified,
  );

  // -- salaryMax --
  fields["salaryMax"] = evaluateField(
    "salaryMax",
    current?.salaryMax ?? null,
    normalized.salaryMax,
    isVerified,
  );

  // -- applicationClosingDate --
  fields["applicationClosingDate"] = evaluateField(
    "applicationClosingDate",
    current?.applicationClosingDate ?? null,
    normalized.validThrough,
    isVerified,
  );

  // -- examDate --
  fields["examDate"] = evaluateField(
    "examDate",
    current?.examDate ?? null,
    normalized.examDate,
    isVerified,
  );

  // -- Postings-path fields (reported as informational, NOT written to post_enrichments) --
  // These go through mergeArticleFacts → postings table; we note them but don't write here
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

  // -- dataGaps to append --
  // New gaps from this extraction, deduped against existing
  const existingGaps = new Set(current?.dataGaps ?? []);
  const newGaps = normalized.dataGapsFromUnparsed.filter((g) => !existingGaps.has(g));
  // Always record schema gaps as data gaps
  const gapKeys = Object.keys(SCHEMA_GAPS).filter((k) => !existingGaps.has(`schema-gap:${k}`));
  // Only add schema gap entries if the extractor found the relevant table
  const relevantSchemaGaps: string[] = [];
  if (facts.extraContent?.tables?.some((t) => /exam pattern/i.test(t.title))) {
    if (!existingGaps.has("schema-gap:examPattern")) relevantSchemaGaps.push("schema-gap:examPattern");
  }
  if (facts.extraContent?.tables?.some((t) => /vacanc/i.test(t.title))) {
    if (!existingGaps.has("schema-gap:vacanciesByZone")) relevantSchemaGaps.push("schema-gap:vacanciesByZone");
  }

  const dataGapsToAppend = [...newGaps, ...relevantSchemaGaps];

  // -- Review flags from extractor --
  const reviewFlags = facts.review;

  // -- Will any field be written? --
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
    console.log(`UNPARSED SECTIONS (present on page, but extractor yielded no structured data)`);
    console.log(divider);
    for (const u of facts.unparsed) {
      console.log(`    · ${u}`);
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
    console.log(`\nTo apply: POST_ID=${plan.postId} ARTICLE_URL="${plan.articleUrl}" npx tsx scripts/promote-article-facts.ts --apply`);
  }
  console.log(`${"═".repeat(72)}\n`);
}

// ---------------------------------------------------------------------------
// Apply the promotion plan (writes to post_enrichments)
// ---------------------------------------------------------------------------
async function applyPromotion(
  db: ReturnType<typeof getDb>,
  plan: PromotionPlan,
): Promise<void> {
  const setFields: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  // Only write fields where action === "write"
  for (const [col, outcome] of Object.entries(plan.fields)) {
    if (outcome.action !== "write") continue;
    if (outcome.proposedValue === null || outcome.proposedValue === undefined) continue;
    setFields.push(`"${col}" = $${paramIdx}`);
    params.push(outcome.proposedValue);
    paramIdx++;
  }

  // Always set extractionConfidence and sourceVerificationStatus on upsert
  // (but only if not already VERIFIED)
  if (!plan.isVerified) {
    setFields.push(`"extractionConfidence" = $${paramIdx}`);
    params.push(80);
    paramIdx++;
    // Only set to PENDING if currently null or PENDING — never downgrade from VERIFIED
    setFields.push(`"sourceVerificationStatus" = COALESCE("sourceVerificationStatus", $${paramIdx})`);
    params.push("PENDING");
    paramIdx++;
  }

  // Append new data gaps (deduplicated, non-destructive)
  if (plan.dataGapsToAppend.length > 0) {
    const gapLiterals = plan.dataGapsToAppend.map((g) => `'${g.replace(/'/g, "''")}'`).join(", ");
    setFields.push(`"dataGaps" = (
      SELECT array_agg(DISTINCT g)
      FROM unnest(
        COALESCE("dataGaps", ARRAY[]::text[]) ||
        ARRAY[${gapLiterals}]
      ) AS g
    )`);
  }

  if (setFields.length === 0) {
    console.log("No changes to apply.");
    return;
  }

  // Build the upsert query
  // post_enrichments has a post_id primary key (or unique constraint)
  const placeholders = params.map((_, i) => `$${i + 1}`);

  // Use INSERT ... ON CONFLICT ... DO UPDATE pattern
  const upsertSql = `
    INSERT INTO post_enrichments (post_id, "extractionConfidence", "sourceVerificationStatus", "dataGaps")
    VALUES (
      ${plan.postId},
      80,
      'PENDING',
      ARRAY[${plan.dataGapsToAppend.map((g) => `'${g.replace(/'/g, "''")}'`).join(", ")}]::text[]
    )
    ON CONFLICT (post_id) DO UPDATE SET
      ${setFields.join(",\n      ")}
    WHERE
      -- Never downgrade a VERIFIED row's individual fields (double protection)
      post_enrichments."sourceVerificationStatus" IS DISTINCT FROM 'VERIFIED'
      OR (
        post_enrichments."sourceVerificationStatus" = 'VERIFIED'
        AND FALSE  -- no field writes permitted; only dataGaps accumulation
      )
  `;

  // For VERIFIED rows, only append data gaps — no field writes
  if (plan.isVerified && plan.dataGapsToAppend.length > 0) {
    const verifiedUpdateSql = `
      UPDATE post_enrichments SET
        "dataGaps" = (
          SELECT array_agg(DISTINCT g)
          FROM unnest(
            COALESCE("dataGaps", ARRAY[]::text[]) ||
            ARRAY[${plan.dataGapsToAppend.map((g) => `'${g.replace(/'/g, "''")}'`).join(", ")}]
          ) AS g
        )
      WHERE post_id = ${plan.postId}
    `;
    await db.execute(sql.raw(verifiedUpdateSql));
    console.log(`✓ Appended ${plan.dataGapsToAppend.length} data gap(s) to VERIFIED row (no field writes).`);
    return;
  }

  if (plan.isVerified) {
    console.log("Row is VERIFIED — no changes applied.");
    return;
  }

  // Build a clean upsert for PENDING rows
  // Only include fields where we have a "write" action
  const writeFields: Record<string, unknown> = {};
  for (const [col, outcome] of Object.entries(plan.fields)) {
    if (outcome.action === "write" && outcome.proposedValue !== null && outcome.proposedValue !== undefined) {
      writeFields[col] = outcome.proposedValue;
    }
  }

  if (Object.keys(writeFields).length === 0 && plan.dataGapsToAppend.length === 0) {
    console.log("No changes to apply (all fields already populated).");
    return;
  }

  // Build idempotent upsert — only writes to empty fields
  const updateClauses: string[] = [];
  for (const [col, val] of Object.entries(writeFields)) {
    // COALESCE ensures we never overwrite an existing value (idempotent)
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

  // Insert columns for new rows
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

  const finalSql = `
    INSERT INTO post_enrichments (${insertColNames.join(", ")})
    VALUES (${insertColVals.join(", ")})
    ON CONFLICT (post_id) DO UPDATE SET
      ${updateClauses.join(",\n      ")}
  `;

  await db.execute(sql.raw(finalSql));

  const writeFieldNames = Object.keys(writeFields);
  if (writeFieldNames.length > 0) {
    console.log(`✓ Wrote ${writeFieldNames.length} field(s): ${writeFieldNames.join(", ")}`);
  }
  if (plan.dataGapsToAppend.length > 0) {
    console.log(`✓ Appended ${plan.dataGapsToAppend.length} data gap(s): ${plan.dataGapsToAppend.join(", ")}`);
  }
  console.log(`✓ post_enrichments updated for post_id=${plan.postId} (PENDING; extractionConfidence=80)`);
  console.log(`  sourceVerificationStatus remains PENDING until verified against official notification.`);
  console.log(`  Resolvers will NOT surface these values until status is promoted to VERIFIED.`);
}

// ---------------------------------------------------------------------------
// Post metadata (for context in the report)
// ---------------------------------------------------------------------------
async function fetchPostContext(db: ReturnType<typeof getDb>, postId: number): Promise<{
  name: string | null;
  slug: string | null;
  recruitmentTitle: string | null;
}> {
  const rows = await db.execute<{ name: string; slug: string; recruitment_title: string }>(sql.raw(`
    SELECT
      p.name,
      p.slug,
      r.name AS recruitment_title
    FROM posts p
    LEFT JOIN recruitments r ON r.id = p.recruitment_id
    WHERE p.id = ${postId}
    LIMIT 1
  `));
  const arr = Array.isArray(rows) ? rows : (rows as any).rows ?? [];
  if (arr.length === 0) return { name: null, slug: null, recruitmentTitle: null };
  return {
    name: arr[0].name ?? null,
    slug: arr[0].slug ?? null,
    recruitmentTitle: arr[0].recruitment_title ?? null,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log(`\n=== Article Facts Promotion ===`);
  console.log(`Post ID : ${POST_ID}`);
  console.log(`Mode    : ${IS_DRY_RUN ? "DRY RUN (no DB writes)" : "APPLY"}`);
  console.log();

  const db = getDb();

  // 1. Resolve article URL
  let articleUrl = ARTICLE_URL_OVERRIDE;
  if (!articleUrl) {
    console.log("Looking up article URL from fja_post_inventory...");
    articleUrl = await lookupArticleUrl(db, POST_ID);
  }
  if (!articleUrl) {
    console.log("Not found in fja_post_inventory, trying fja_job_inventory via posting link...");
    articleUrl = await lookupFjaInventoryUrl(db, POST_ID);
  }
  if (!articleUrl) {
    console.error(`Error: No article URL found for post_id=${POST_ID}. Supply one with ARTICLE_URL=<url>.`);
    process.exit(1);
  }
  console.log(`Article URL: ${articleUrl}\n`);

  // 2. Fetch post context
  const postContext = await fetchPostContext(db, POST_ID);
  if (postContext.name) {
    console.log(`Post    : ${postContext.name}`);
    if (postContext.recruitmentTitle) console.log(`Recruitment: ${postContext.recruitmentTitle}`);
    console.log();
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

  // 4. Fetch current enrichment row
  console.log("Fetching current post_enrichments row...");
  const current = await fetchEnrichmentRow(db, POST_ID);
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

  // 5. Build promotion plan
  const plan = buildPromotionPlan(POST_ID, articleUrl, facts, current);

  // 6. Render report (always, even on apply)
  renderReport(plan, facts);

  // 7. Apply or stop
  if (IS_DRY_RUN) {
    console.log("DRY RUN complete. No database writes were performed.");
    console.log("Review the report above, then run with --apply to execute.\n");
    return;
  }

  // Apply
  console.log("Applying promotion...");
  await applyPromotion(db, plan);
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
