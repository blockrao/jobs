/**
 * FJA enrichment SQL generator — Phase 1 P0 (#4 factual richness).
 *
 * Reads fja-enrich-run.ts output JSON and generates fill-only SQL that
 * populates posts.enrichment JSONB + direct scalar columns.
 *
 * Fill-only: every assignment uses coalesce() so existing values are never
 * overwritten. Rows with blocking review flags are skipped.
 *
 * Usage:
 *   tsx src/scripts/fja-enrich-sql.ts output.sql results.json [results2.json ...]
 *
 * Env:
 *   REFRESH=1  — rebuild enrichment even if it already exists
 *   CHUNK=500  — split into multiple SQL files of N updates each
 */

import { readFileSync, writeFileSync } from "node:fs";
import { isAggregatorUrl, mentionsAggregator } from "@/lib/aggregators";
import type { ArticleFacts } from "@/enrich/freejobalert-article";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const REFRESH = process.env.REFRESH === "1";
const CHUNK = Number(process.env.CHUNK ?? 0);

const [outFile, ...inFiles] = process.argv.slice(2);
if (!outFile || inFiles.length === 0) {
  console.error("Usage: fja-enrich-sql.ts <output.sql> <results.json> [...]");
  process.exit(1);
}

interface ResultRow {
  id: number;
  url: string;
  name?: string;
  recruitmentSlug?: string;
  ok: boolean;
  facts?: ArticleFacts;
  error?: string;
}

const stmts: string[] = [];
const ids: number[] = [];
let applied = 0, skippedReview = 0, nothing = 0, failed = 0;

for (const f of inFiles) {
  const rows: ResultRow[] = JSON.parse(readFileSync(f, "utf8"));
  for (const r of rows) {
    if (!r.ok || !r.facts) { failed++; continue; }
    const x = r.facts;

    // Skip rows with blocking review flags (fee/salary anomalies, age inconsistency)
    const blocking = x.review.filter(
      (v) => v !== "vacancy-table-partial-dropped" && v !== "age-over-60"
    );
    if (blocking.length) { skippedReview++; continue; }

    const holdAge = x.review.includes("age-over-60");
    const holdPay =
      (x.salaryMin != null && x.salaryMin < 3000) ||
      (x.salaryMax != null && x.salaryMax > 500000);

    // ── Build enrichment JSONB ─────────────────────────────────────────────
    const enrichment: Record<string, unknown> = {};

    if (!holdPay && (x.salaryMin != null || x.salaryMax != null)) {
      const payLevel: Record<string, unknown> = {};
      if (x.salaryMin != null) payLevel.min = x.salaryMin;
      if (x.salaryMax != null) payLevel.max = x.salaryMax;
      if (x.salaryMin != null && x.salaryMax != null) {
        payLevel.monthly = `₹${x.salaryMin.toLocaleString("en-IN")}–₹${x.salaryMax.toLocaleString("en-IN")}`;
      }
      enrichment.payLevel = payLevel;
    }

    if (!holdAge && (x.ageLimitMin != null || x.ageLimitMax != null)) {
      const age: Record<string, unknown> = {};
      if (x.ageLimitMin != null) age.min = x.ageLimitMin;
      if (x.ageLimitMax != null) age.max = x.ageLimitMax;
      if (x.ageRelaxationNotes) age.relaxationNotes = x.ageRelaxationNotes;
      enrichment.ageLimit = age;
    }

    if (x.applicationFeeGeneral != null || x.applicationFeeReserved != null) {
      const fee: Record<string, unknown> = {};
      if (x.applicationFeeGeneral != null) fee.general = x.applicationFeeGeneral;
      if (x.applicationFeeReserved != null) fee.reserved = x.applicationFeeReserved;
      enrichment.applicationFee = fee;
    }

    if (x.extraContent?.tables?.length) {
      const safeTables = x.extraContent.tables.filter(
        (t) => !mentionsAggregator(JSON.stringify(t))
      );
      if (safeTables.length) enrichment.tables = safeTables;
    }

    if (x.validThrough) enrichment.applicationClosingDate = new Date(x.validThrough).toISOString();
    if (x.examDate) enrichment.examDate = new Date(x.examDate).toISOString();

    // Official links — only non-aggregator URLs
    const links: Record<string, string> = {};
    if (x.officialNotificationUrl && !isAggregatorUrl(x.officialNotificationUrl))
      links.notification = x.officialNotificationUrl;
    if (x.officialWebsiteUrl && !isAggregatorUrl(x.officialWebsiteUrl))
      links.website = x.officialWebsiteUrl;
    if (x.applyUrl && !isAggregatorUrl(x.applyUrl))
      links.apply = x.applyUrl;
    if (Object.keys(links).length) enrichment.officialLinks = links;

    enrichment.fja_extraction_metadata = {
      extraction_timestamp: new Date().toISOString(),
      data_types_extracted: Object.keys(enrichment).filter(
        (k) => k !== "fja_extraction_metadata"
      ).length,
    };

    // ── Build scalar column assignments ────────────────────────────────────
    const set: string[] = [];

    // enrichment JSONB — fill-only unless REFRESH
    const enrichJson = JSON.stringify(enrichment);
    if (REFRESH) {
      set.push(`enrichment = ${q(enrichJson)}::jsonb`);
    } else {
      set.push(`enrichment = coalesce(enrichment, ${q(enrichJson)}::jsonb)`);
    }

    // Scalar columns — always fill-only
    if (!holdPay) {
      if (x.salaryMin != null) set.push(`salary_min = coalesce(salary_min, ${x.salaryMin})`);
      if (x.salaryMax != null) set.push(`salary_max = coalesce(salary_max, ${x.salaryMax})`);
    }

    if (x.validThrough) {
      set.push(
        `key_dates = coalesce(key_dates, '{}' ::jsonb) || jsonb_build_object('applicationCloseDate', ${q(new Date(x.validThrough).toISOString().slice(0, 10))})`
      );
    }

    if (x.applyUrl && !isAggregatorUrl(x.applyUrl)) {
      set.push(`application_url = coalesce(nullif(application_url, ''), ${q(x.applyUrl)})`);
      set.push(`"applyPortalUrl" = coalesce(nullif("applyPortalUrl", ''), ${q(x.applyUrl)})`);
    }

    // Replace FJA officialSourceUrl with real notification URL when available
    if (x.officialNotificationUrl && !isAggregatorUrl(x.officialNotificationUrl)) {
      set.push(`"officialNotificationUrl" = coalesce(nullif("officialNotificationUrl", ''), ${q(x.officialNotificationUrl)})`);
      // Preserve the FJA URL as the discovery source reference
      set.push(`"originalRecruitmentUrl" = coalesce("originalRecruitmentUrl", "officialSourceUrl")`);
      set.push(`"officialSourceUrl" = ${q(x.officialNotificationUrl)}`);
    }

    if (!set.length) { nothing++; continue; }

    set.push(`"updatedAt" = now()`);
    stmts.push(
      `update posts set ${set.join(", ")} where id = ${r.id};`
    );
    ids.push(r.id);
    applied++;
  }
}

// ── Write SQL file(s) ────────────────────────────────────────────────────────

const groups: { stmts: string[]; ids: number[] }[] = [];
if (CHUNK > 0) {
  for (let i = 0; i < stmts.length; i += CHUNK)
    groups.push({ stmts: stmts.slice(i, i + CHUNK), ids: ids.slice(i, i + CHUNK) });
} else {
  groups.push({ stmts, ids });
}

groups.forEach((g, n) => {
  const file =
    CHUNK > 0
      ? outFile.replace(/\.sql$/, `_${String(n + 1).padStart(2, "0")}.sql`)
      : outFile;

  const header = `-- FJA enrichment fill-only SQL. Generated ${new Date().toISOString().slice(0, 10)}.
-- Part ${n + 1} of ${groups.length}. Fill-only: coalesce() never overwrites existing values.
-- Run in Supabase SQL editor. No transactions or temp tables required.
-- ${g.ids.length} posts updated in this part.

`;

  const footer = `

-- Verification: check enrichment counts after running
select
  count(*) filter (where enrichment is not null)       as with_enrichment,
  count(*) filter (where salary_min > 0)               as with_salary,
  count(*) filter (where application_url is not null)  as with_apply_url,
  count(*) filter (where "officialNotificationUrl" is not null
    and "officialNotificationUrl" not ilike '%freejobalert%') as with_real_official
from posts where id in (${g.ids.join(",")});
`;

  writeFileSync(file, header + g.stmts.join("\n") + footer);
  console.log(`Wrote ${g.stmts.length} statements → ${file}`);
});

console.log(
  JSON.stringify({ applied, skippedReview, nothing, failed, files: groups.length })
);
