#!/usr/bin/env tsx
/**
 * Read-only FJA candidate audit.
 *
 * Mirrors the candidate anti-joins and official URL extraction in
 * scripts/promote-fja-to-canonical.ts, then emits row-level CSV/JSON reports.
 * This script does not call the canonical writer and never mutates DB rows.
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/db";
import { loadOrgIndex, resolveOrganization } from "../src/ingest/organization-resolution";
import { sql } from "drizzle-orm";

interface Row {
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
  details: unknown;
  official_notification_url: string | null;
  other_info_raw: unknown;
  duplicate_recruitment_source_url: boolean;
  duplicate_posting_source_url: boolean;
  duplicate_posting_external_id: boolean;
  canonical_recruitment_id: string | number | null;
}

const LIMIT = Math.max(0, Number.parseInt(process.env.FJA_AUDIT_LIMIT ?? "0", 10) || 0);
const OUT_DIR = process.env.FJA_AUDIT_OUT_DIR ?? "artifacts";

function parseJsonRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, any>;
    } catch { /* malformed source capture is treated as empty */ }
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

function isOfficialAuthorityHost(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/\.$/, "");
    return /(^|\.)(gov\.in|nic\.in|ac\.in|edu\.in|res\.in|mil\.in)$/.test(host)
      || /(^|\.)(hmtindia\.com|sbi\.co\.in|ibps\.in|ongcindia\.com|ntpc\.co\.in|iocl\.com|bharatpetroleum\.in|hindustanpetroleum\.com|gailonline\.com|bel-india\.in|bhel\.com|sail\.co\.in|coalindia\.in|powergrid\.in|ecil\.co\.in|rites\.com|ircon\.org|mazagondock\.in|grse\.in|nclcil\.in|nlcindia\.in)$/.test(host);
  } catch {
    return false;
  }
}

/** Keep scoring identical to the canonical promotion script. */
function extractOfficialNotificationUrl(links: Array<Record<string, unknown>>): string | undefined {
  const candidates = links
    .filter((link) => typeof link.url === "string" && isOfficialAuthorityHost(link.url as string))
    .map((link) => {
      const url = String(link.url);
      const label = String(link.text ?? link.label ?? "").toLowerCase();
      const isPdf = /\.pdf(?:[?#]|$)/i.test(url);
      const notificationLabel = /(notification|advertisement|advt|official notice|recruitment notice|detailed notice|notification pdf|download notice)/i.test(label);
      const careerPath = /(recruit|vacan|career|job|advt|notice|advertisement|notification)/i.test(url);
      const score = (notificationLabel ? 5 : 0) + (isPdf ? 3 : 0) + (careerPath ? 2 : 0);
      return { url, score, isPdf, notificationLabel };
    })
    .filter((item) => item.notificationLabel || item.isPdf)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.url;
}

function getOfficialUrl(row: Row): { url: string; method: string } | null {
  const wrapper = parseJsonRecord(row.details);
  const otherInfo = parseJsonRecord(row.other_info_raw);
  const detail = parseJsonRecord(wrapper.detail ?? wrapper);
  const facts = parseJsonRecord(detail.facts ?? otherInfo.facts);

  const stored = row.official_notification_url;
  if (stored && isOfficialAuthorityHost(stored)) {
    return { url: stored, method: "stored_official_notification_url" };
  }
  const captured = [
    facts.official_notification_url, facts.officialNotificationUrl,
    detail.official_notification_url, detail.officialNotificationUrl,
    wrapper.official_notification_url, wrapper.officialNotificationUrl,
    otherInfo.official_notification_url, otherInfo.officialNotificationUrl,
  ].find((value) => typeof value === "string" && isOfficialAuthorityHost(value)) as string | undefined;
  if (captured) return { url: captured, method: "captured_official_notification_field" };

  const rawLinks = [
    ...collectLinkObjects(wrapper),
    ...collectLinkObjects(otherInfo),
  ].filter((link, index, list) => list.findIndex((other) => other.url === link.url) === index);
  const allLinks = rawLinks.map((link) => ({
    url: typeof link.url === "string" ? link.url : typeof link.href === "string" ? link.href : undefined,
    label: typeof link.text === "string" ? link.text : typeof link.label === "string" ? link.label : typeof link.title === "string" ? link.title : undefined,
    text: typeof link.text === "string" ? link.text : typeof link.label === "string" ? link.label : typeof link.title === "string" ? link.title : undefined,
  })).filter((link, index, list) => link.url && list.findIndex((other) => other.url === link.url) === index);
  const extracted = extractOfficialNotificationUrl(allLinks as Array<Record<string, unknown>>);
  return extracted ? { url: extracted, method: "official_host_link_heuristic" } : null;
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

async function main() {
  const db = getDb();
  const tableCheck = await db.execute(sql.raw("SELECT to_regclass('public.fja_job_inventory') AS table_name"));
  const tableRows = Array.isArray(tableCheck)
    ? tableCheck as Array<{ table_name: string | null }>
    : (tableCheck as unknown as { rows?: Array<{ table_name: string | null }> }).rows ?? [];
  if (!tableRows[0]?.table_name) {
    throw new Error("public.fja_job_inventory is absent; audit stopped safely and no database writes were performed.");
  }

  // These anti-joins intentionally mirror the canonical promotion workflow.
  // The recruitment source_url is a live DB legacy column used by that writer;
  // it isn't declared in the current Drizzle schema, so SQL stays explicit here.
  const raw = await db.execute(sql.raw(`
    SELECT f.id, f.external_id, f.source_url, f.title, f.organization_name,
           f.listing_category, f.published_date, f.application_start_date,
           f.application_end_date, f.advertisement_number, f.details,
           f.official_notification_url, f.other_info_raw,
           EXISTS (
             SELECT 1 FROM recruitments r
             WHERE lower(regexp_replace(trim(r.source_url), '/+$', '')) =
                   lower(regexp_replace(trim(f.source_url), '/+$', ''))
           ) AS duplicate_recruitment_source_url,
           EXISTS (
             SELECT 1 FROM postings p
             WHERE lower(regexp_replace(trim(p.source_url), '/+$', '')) =
                   lower(regexp_replace(trim(f.source_url), '/+$', ''))
           ) AS duplicate_posting_source_url,
           EXISTS (
             SELECT 1 FROM postings p WHERE p.external_id = f.external_id
           ) AS duplicate_posting_external_id,
           f.other_info_raw->>'canonical_recruitment_id' AS canonical_recruitment_id
    FROM public.fja_job_inventory f
    WHERE f.source_slug = 'freejobalert'
      AND NOT EXISTS (
        SELECT 1 FROM recruitments r
        WHERE lower(regexp_replace(trim(r.source_url), '/+$', '')) =
              lower(regexp_replace(trim(f.source_url), '/+$', ''))
      )
      AND NOT EXISTS (
        SELECT 1 FROM postings p
        WHERE lower(regexp_replace(trim(p.source_url), '/+$', '')) =
              lower(regexp_replace(trim(f.source_url), '/+$', ''))
      )
      AND NOT EXISTS (
        SELECT 1 FROM postings p WHERE p.external_id = f.external_id
      )
    ORDER BY f.first_seen_at DESC
  `)) as unknown as Row[];
  const inventory = Array.isArray(raw) ? raw : (raw as unknown as { rows?: Row[] }).rows ?? [];
  const orgIndex = await loadOrgIndex(db);

  const rows = inventory.map((row) => {
    const official = getOfficialUrl(row);
    const duplicateChecks = {
      recruitment_source_url: Boolean(row.duplicate_recruitment_source_url),
      posting_source_url: Boolean(row.duplicate_posting_source_url),
      posting_external_id: Boolean(row.duplicate_posting_external_id),
    };
    const duplicateFound = Object.values(duplicateChecks).some(Boolean);
    const org = resolveOrganization(orgIndex, row.organization_name);
    const canonicalMapped = row.canonical_recruitment_id != null && row.canonical_recruitment_id !== "";
    return {
      inventory_id: row.id,
      external_id: row.external_id,
      fja_title: row.title,
      organization: row.organization_name,
      fja_url: row.source_url,
      listing_category: row.listing_category,
      official_notification_url: official?.url ?? "",
      official_url_extraction_method: official?.method ?? "not_found",
      official_url_host_recognized: official ? isOfficialAuthorityHost(official.url) : false,
      duplicate_status: duplicateFound ? "DUPLICATE_FOUND" : "NO_DUPLICATE_FOUND",
      duplicate_checks: duplicateChecks,
      already_canonical_mapped: canonicalMapped,
      canonical_recruitment_id: row.canonical_recruitment_id ?? "",
      organization_resolution: org.kind,
      organization_resolution_reason: org.kind === "CANDIDATE" ? org.reason
        : org.kind === "NONE" ? org.reason
        : org.kind === "ALIAS" ? "alias_match"
        : org.ambiguous ? "multiple_existing_matches" : "existing_name_match",
      published_date: row.published_date,
      application_start_date: row.application_start_date,
      application_end_date: row.application_end_date,
      advertisement_number: row.advertisement_number,
    };
  });

  const selected = (LIMIT > 0 ? rows.slice(0, LIMIT) : rows).map((row) => ({
    ...row,
    ingest_recommendation: row.already_canonical_mapped ? "HOLD_ALREADY_CANONICAL_MAPPED"
      : !row.official_notification_url ? "HOLD_MISSING_OFFICIAL_URL"
      : row.duplicate_status === "DUPLICATE_FOUND" ? "HOLD_DUPLICATE"
      : "REVIEW_OFFICIAL_URL_BEFORE_INGEST",
  }));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const csvPath = path.join(OUT_DIR, `fja-candidate-audit-${stamp}.csv`);
  const jsonPath = path.join(OUT_DIR, `fja-candidate-audit-${stamp}.json`);
  const counts = {
    promotion_candidate_rows: rows.length,
    rows_reported: selected.length,
    official_url_found: selected.filter((row) => row.official_notification_url).length,
    official_url_missing: selected.filter((row) => !row.official_notification_url).length,
    duplicate_found: selected.filter((row) => row.duplicate_status === "DUPLICATE_FOUND").length,
    already_canonical_mapped: selected.filter((row) => row.already_canonical_mapped).length,
  };
  fs.writeFileSync(jsonPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    mode: "READ_ONLY_AUDIT",
    writes_performed: 0,
    candidate_selection: "Same source URL and external ID anti-joins as canonical promotion; row-level duplicate flags included",
    counts,
    rows: selected,
  }, null, 2), "utf8");
  const columns = Object.keys(selected[0] ?? { inventory_id: "" }).filter((key) => key !== "duplicate_checks");
  const csv = [columns.join(","), ...selected.map((row) => columns.map((key) => csvCell((row as Record<string, unknown>)[key])).join(","))].join("\r\n");
  fs.writeFileSync(csvPath, csv + "\r\n", "utf8");
  console.log(JSON.stringify({
    mode: "READ_ONLY_AUDIT",
    writes_performed: 0,
    ...counts,
    csv_report: csvPath,
    json_report: jsonPath,
  }, null, 2));
}

main().catch((error) => {
  console.error("FJA audit failed safely:", error);
  process.exit(1);
});
