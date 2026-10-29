#!/usr/bin/env tsx
/**
 * Read-only FJA candidate audit.
 * Reads fja_job_inventory and writes CSV/JSON artifacts. It never invokes
 * canonical ingestion or mutates database records.
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/db";
import { loadOrgIndex, resolveOrganization } from "../src/ingest/organization-resolution";
import { sql } from "drizzle-orm";

interface Row {
  id: number; external_id: string; source_url: string; title: string;
  organization_name: string | null; listing_category: string | null;
  published_date: string | null; application_start_date: string | null; application_end_date: string | null;
  advertisement_number: string | null; details: unknown; official_notification_url: string | null;
  other_info_raw: unknown; detail_status: string; source_status: string;
  duplicate_posting_source_url: boolean; duplicate_posting_external_id: boolean;
  canonical_recruitment_id: string | null;
}
const LIMIT = Math.max(0, Number.parseInt(process.env.FJA_AUDIT_LIMIT ?? "0", 10) || 0);
const OUT_DIR = process.env.FJA_AUDIT_OUT_DIR ?? "artifacts";

function obj(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try { const parsed: unknown = JSON.parse(value); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>; } catch { /* malformed capture */ }
  }
  return {};
}
function collectLinks(value: unknown, result: Array<{url:string;label:string}> = [], depth = 0): Array<{url:string;label:string}> {
  if (depth > 10 || value == null || typeof value !== "object") return result;
  if (Array.isArray(value)) { for (const item of value) collectLinks(item, result, depth + 1); return result; }
  const row = value as Record<string, unknown>;
  const url = typeof row.url === "string" ? row.url : typeof row.href === "string" ? row.href : "";
  const label = typeof row.label === "string" ? row.label : typeof row.text === "string" ? row.text : typeof row.title === "string" ? row.title : "";
  if (url && !result.some((link) => link.url === url)) result.push({url,label});
  for (const [key,nested] of Object.entries(row)) if (!["raw_html","html","detail_text","normalized_text"].includes(key.toLowerCase())) collectLinks(nested,result,depth+1);
  return result;
}
function officialHost(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/\.$/,"");
    return /(^|\.)(gov\.in|nic\.in|ac\.in|edu\.in|res\.in|mil\.in)$/.test(host)
      || /(^|\.)(sbi\.co\.in|ibps\.in|ongcindia\.com|ntpc\.co\.in|iocl\.com|bharatpetroleum\.in|hindustanpetroleum\.com|gailonline\.com|bel-india\.in|bhel\.com|sail\.co\.in|coalindia\.in|powergrid\.in|ecil\.co\.in|rites\.com|ircon\.org|mazagondock\.in|grse\.in|nclcil\.in)$/.test(host);
  } catch { return false; }
}
function extractOfficialUrl(row: Row): {url:string;method:string;label:string}|null {
  const details = obj(row.details), other = obj(row.other_info_raw);
  const detail = obj(details.detail ?? details), facts = obj(detail.facts ?? other.facts);
  const stored = row.official_notification_url?.trim();
  if (stored && officialHost(stored)) return {url:stored,method:"stored_official_notification_url",label:""};
  const explicit = [
    facts.official_notification_url, facts.officialNotificationUrl,
    detail.official_notification_url, detail.officialNotificationUrl,
    details.official_notification_url, details.officialNotificationUrl,
    other.official_notification_url, other.officialNotificationUrl,
  ].find((value) => typeof value === "string" && officialHost(value));
  if (typeof explicit === "string") return {url:explicit,method:"captured_official_notification_field",label:""};
  const links = [...collectLinks(details), ...collectLinks(other)]
    .filter((link,index,all)=>all.findIndex(candidate=>candidate.url===link.url)===index);
  const notificationLabel = /(notification|advertisement|official notice|\badvt\b)/i;
  const otherDocument = /(corrigendum|addendum|extension|syllabus|result|admit card|answer key|application form|format)/i;
  const isPdf = (url:string) => /\.pdf(?:[?#]|$)/i.test(url);
  const fjaHost = (url:string) => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./,"").includes("freejobalert"); } catch { return true; } };
  const eligible = links.filter(link => officialHost(link.url) && !fjaHost(link.url) && !otherDocument.test(link.label) &&
    (notificationLabel.test(link.label) || isPdf(link.url)))
    .map(link=>({...link,score:
      (notificationLabel.test(link.label)?5:0)
      +(isPdf(link.url)?3:0)
      +(/(recruit|vacan|career|advt|notice|advertisement|notification)/i.test(link.url)?2:0)
    })).sort((a,b)=>b.score-a.score);
  return eligible[0] ? {url:eligible[0].url,method:"official_host_link_heuristic",label:eligible[0].label} : null;
}
function csvCell(value: unknown): string {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g,'""') + '"' : text;
}
async function main() {
  const db = getDb();
  const existence = await db.execute(sql.raw("SELECT to_regclass('public.fja_job_inventory') AS table_name"));
  const exists = Array.isArray(existence) ? existence as Array<{table_name:string|null}> : (existence as unknown as {rows?:Array<{table_name:string|null}>}).rows ?? [];
  if (!exists[0]?.table_name) throw new Error("public.fja_job_inventory is absent; no audit rows generated and no database writes performed.");
  const raw = await db.execute(sql.raw(`
    SELECT f.id,f.external_id,f.source_url,f.title,f.organization_name,f.listing_category,
      f.published_date,f.application_start_date,f.application_end_date,f.advertisement_number,
      f.details,f.official_notification_url,f.other_info_raw,f.detail_status,f.source_status,
      EXISTS(SELECT 1 FROM postings p
        WHERE lower(regexp_replace(trim(p.source_url), '/+$',''))=lower(regexp_replace(trim(f.source_url), '/+$',''))) AS duplicate_posting_source_url,
      EXISTS(SELECT 1 FROM postings p
        WHERE p.source='freejobalert' AND p.external_id=f.external_id) AS duplicate_posting_external_id,
      f.other_info_raw->>'canonical_recruitment_id' AS canonical_recruitment_id
    FROM public.fja_job_inventory f
    WHERE f.source_slug='freejobalert'
    ORDER BY f.first_seen_at DESC
  `)) as unknown as Row[];
  const inventory = Array.isArray(raw) ? raw : (raw as unknown as {rows?:Row[]}).rows ?? [];
  const orgIndex = await loadOrgIndex(db);
  const rows = inventory.map((row) => {
    const official = extractOfficialUrl(row);
    const flags = {
      posting_source_url: Boolean(row.duplicate_posting_source_url),
      posting_external_id: Boolean(row.duplicate_posting_external_id),
    };
    const duplicate = Object.values(flags).some(Boolean);
    const organization = resolveOrganization(orgIndex,row.organization_name);
    const mapped = row.canonical_recruitment_id != null;
    return {
      inventory_id: row.id, external_id: row.external_id, fja_title: row.title,
      organization: row.organization_name, fja_url: row.source_url, listing_category: row.listing_category,
      detail_status: row.detail_status, source_status: row.source_status,
      official_notification_url: official?.url ?? "",
      official_url_extraction_method: official?.method ?? "not_found",
      official_url_link_label: official?.label ?? "",
      official_url_host_recognized: official ? officialHost(official.url) : false,
      duplicate_status: duplicate ? "DUPLICATE_FOUND" : "NO_POSTING_SOURCE_KEY_DUPLICATE_FOUND",
      duplicate_checks: flags, already_canonical_mapped: mapped,
      canonical_recruitment_id: row.canonical_recruitment_id ?? "",
      organization_resolution: organization.kind,
      organization_resolution_reason: organization.kind === "CANDIDATE" ? organization.reason : organization.kind === "NONE" ? organization.reason : organization.kind === "ALIAS" ? "alias_match" : organization.ambiguous ? "multiple_existing_matches" : "existing_name_match",
      published_date: row.published_date, application_start_date: row.application_start_date,
      application_end_date: row.application_end_date, advertisement_number: row.advertisement_number,
    };
  });
  const selected = (LIMIT > 0 ? rows.slice(0,LIMIT) : rows).map((row) => ({
    ...row,
    ingest_recommendation: row.already_canonical_mapped ? "HOLD_ALREADY_CANONICAL_MAPPED"
      : row.detail_status !== "EXTRACTED" ? "HOLD_NOT_EXTRACTED"
      : row.source_status === "CLOSED" ? "HOLD_CLOSED_SOURCE"
      : !row.official_notification_url ? "HOLD_MISSING_OFFICIAL_URL"
      : row.duplicate_status === "DUPLICATE_FOUND" ? "HOLD_DUPLICATE"
      : "REVIEW_OFFICIAL_URL_BEFORE_INGEST",
  }));
  fs.mkdirSync(OUT_DIR,{recursive:true});
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  const csvPath = path.join(OUT_DIR,`fja-candidate-audit-${stamp}.csv`);
  const jsonPath = path.join(OUT_DIR,`fja-candidate-audit-${stamp}.json`);
  const counts = {
    inventory_rows_scanned: rows.length, rows_reported: selected.length,
    official_url_found: selected.filter((row)=>row.official_notification_url).length,
    official_url_missing: selected.filter((row)=>!row.official_notification_url).length,
    duplicate_found: selected.filter((row)=>row.duplicate_status==="DUPLICATE_FOUND").length,
    already_canonical_mapped: selected.filter((row)=>row.already_canonical_mapped).length,
    held_not_extracted: selected.filter((row)=>row.ingest_recommendation==="HOLD_NOT_EXTRACTED").length,
    held_closed: selected.filter((row)=>row.ingest_recommendation==="HOLD_CLOSED_SOURCE").length,
  };
  fs.writeFileSync(jsonPath,JSON.stringify({generated_at:new Date().toISOString(),mode:"READ_ONLY_AUDIT",writes_performed:0,counts,rows:selected},null,2),"utf8");
  const columns = Object.keys(selected[0] ?? {inventory_id:""}).filter((key)=>key!=="duplicate_checks");
  const csv = [columns.join(","),...selected.map((row)=>columns.map((key)=>csvCell((row as Record<string,unknown>)[key])).join(","))].join("\r\n");
  fs.writeFileSync(csvPath,csv+"\r\n","utf8");
  console.log(JSON.stringify({mode:"READ_ONLY_AUDIT",writes_performed:0,...counts,csv_report:csvPath,json_report:jsonPath},null,2));
}
main().catch((error)=>{console.error("FJA audit failed safely:",error);process.exit(1);});
