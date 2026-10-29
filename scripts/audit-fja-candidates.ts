#!/usr/bin/env tsx
/**
 * Read-only FJA candidate audit report.
 * Generates CSV/JSON rows for the same source-URL/external-ID anti-join scope
 * as the promotion script. Never invokes the canonical writer or mutates DB.
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/db";
import { loadOrgIndex, resolveOrganization } from "../src/ingest/organization-resolution";
import { sql } from "drizzle-orm";

interface Row {
  id: number; external_id: string; source_url: string | null; title: string;
  organization_name: string | null; listing_category: string | null;
  published_date: string | null; application_start_date: string | null;
  application_end_date: string | null; advertisement_number: string | null;
  details: unknown; official_notification_url: string | null; other_info_raw: unknown;
  duplicate_recruitment_source_url: boolean; duplicate_posting_source_url: boolean;
  duplicate_posting_external_id: boolean; canonical_recruitment_id: string | number | null;
}
const LIMIT = Math.max(0, Number.parseInt(process.env.FJA_AUDIT_LIMIT ?? "0", 10) || 0);
const OUT_DIR = process.env.FJA_AUDIT_OUT_DIR ?? "artifacts";

function record(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch { /* malformed source capture */ }
  return {};
}
function collectLinks(value: unknown, out: Array<{url:string;label:string}> = [], depth = 0): typeof out {
  if (depth > 10 || value == null || typeof value !== "object") return out;
  if (Array.isArray(value)) { for (const item of value) collectLinks(item, out, depth + 1); return out; }
  const obj = value as Record<string, unknown>;
  const url = typeof obj.url === "string" ? obj.url : typeof obj.href === "string" ? obj.href : "";
  const label = typeof obj.text === "string" ? obj.text : typeof obj.label === "string" ? obj.label : typeof obj.title === "string" ? obj.title : "";
  if (url && !out.some(x => x.url === url)) out.push({url,label});
  for (const [key,nested] of Object.entries(obj)) if (!["raw_html","html","detail_text","normalized_text"].includes(key.toLowerCase())) collectLinks(nested,out,depth+1);
  return out;
}
function officialHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/\.$/,"");
    return /(^|\.)(gov\.in|nic\.in|ac\.in|edu\.in|res\.in|mil\.in)$/.test(host)
      || /(^|\.)(hmtindia\.com|sbi\.co\.in|ibps\.in|ongcindia\.com|ntpc\.co\.in|iocl\.com|bharatpetroleum\.in|hindustanpetroleum\.com|gailonline\.com|bel-india\.in|bhel\.com|sail\.co\.in|coalindia\.in|powergrid\.in|ecil\.co\.in|rites\.com|ircon\.org|mazagondock\.in|grse\.in|nclcil\.in|nlcindia\.in)$/.test(host);
  } catch { return false; }
}
function extractOfficialUrl(row: Row): {url:string;method:string;label:string}|null {
  const details=record(row.details), other=record(row.other_info_raw);
  const detail=record(details.detail ?? details), facts=record(detail.facts ?? other.facts);
  const stored=row.official_notification_url?.trim();
  if (stored && officialHost(stored)) return {url:stored,method:"stored_official_notification_url",label:""};
  const nested=[facts.official_notification_url,facts.officialNotificationUrl,detail.official_notification_url,detail.officialNotificationUrl,details.official_notification_url,details.officialNotificationUrl,other.official_notification_url,other.officialNotificationUrl].find(v=>typeof v==="string"&&officialHost(v));
  if (typeof nested==="string") return {url:nested,method:"captured_official_notification_field",label:""};
  const links=[...collectLinks(details),...collectLinks(other)].filter((x,i,a)=>a.findIndex(y=>y.url===x.url)===i);
  const candidates=links.filter(x=>officialHost(x.url)&&(/(notification|advertisement|advt|official notice|recruitment notice|detailed notice|notification pdf|download notice)/i.test(x.label)||/\.pdf(?:[?#]|$)/i.test(x.url)))
    .map(x=>({...x,score:(/(notification|advertisement|advt|official notice|recruitment notice|detailed notice|notification pdf|download notice)/i.test(x.label)?5:0)+(/\.pdf(?:[?#]|$)/i.test(x.url)?3:0)+(/(recruit|vacan|career|job|advt|notice|advertisement|notification)/i.test(x.url)?2:0)}))
    .sort((a,b)=>b.score-a.score);
  return candidates[0]?{url:candidates[0].url,method:"official_host_link_heuristic",label:candidates[0].label}:null;
}
function csvCell(value: unknown): string {
  const s=value==null?"":typeof value==="string"?value:JSON.stringify(value);
  return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
async function main() {
  const db=getDb();
  const result=await db.execute(sql.raw(`
    SELECT f.id, f.external_id, f.source_url, f.title, f.organization_name,
           f.listing_category, f.published_date, f.application_start_date,
           f.application_end_date, f.advertisement_number, f.details,
           f.official_notification_url, f.other_info_raw,
           EXISTS (SELECT 1 FROM recruitments r
             WHERE lower(regexp_replace(trim(r.source_url), '/+$', '')) =
                   lower(regexp_replace(trim(f.source_url), '/+$', ''))) AS duplicate_recruitment_source_url,
           EXISTS (SELECT 1 FROM postings p
             WHERE lower(regexp_replace(trim(p.source_url), '/+$', '')) =
                   lower(regexp_replace(trim(f.source_url), '/+$', ''))) AS duplicate_posting_source_url,
           EXISTS (SELECT 1 FROM postings p WHERE p.external_id = f.external_id) AS duplicate_posting_external_id,
           f.other_info_raw->>'canonical_recruitment_id' AS canonical_recruitment_id
    FROM fja_job_inventory f
    WHERE f.source_slug = 'freejobalert'
      AND NOT EXISTS (SELECT 1 FROM recruitments r
        WHERE lower(regexp_replace(trim(r.source_url), '/+$', '')) = lower(regexp_replace(trim(f.source_url), '/+$', '')))
      AND NOT EXISTS (SELECT 1 FROM postings p
        WHERE lower(regexp_replace(trim(p.source_url), '/+$', '')) = lower(regexp_replace(trim(f.source_url), '/+$', '')))
      AND NOT EXISTS (SELECT 1 FROM postings p WHERE p.external_id = f.external_id)
    ORDER BY f.first_seen_at DESC
  `)) as unknown as Row[];
  const inventory=Array.isArray(result)?result:(result as unknown as {rows?:Row[]}).rows??[];
  const orgIndex=await loadOrgIndex(db);
  const rows=inventory.map(r=>{
    const official=extractOfficialUrl(r);
    const duplicateFlags={recruitment_source_url:Boolean(r.duplicate_recruitment_source_url),posting_source_url:Boolean(r.duplicate_posting_source_url),posting_external_id:Boolean(r.duplicate_posting_external_id)};
    const org=resolveOrganization(orgIndex,r.organization_name);
    const mapped=r.canonical_recruitment_id!=null;
    const duplicate=Object.values(duplicateFlags).some(Boolean);
    return {
      inventory_id:r.id,external_id:r.external_id,fja_title:r.title,organization:r.organization_name,fja_url:r.source_url,
      listing_category:r.listing_category,official_notification_url:official?.url??"",
      official_url_extraction_method:official?.method??"not_found",official_url_link_label:official?.label??"",
      official_url_host_recognized:official?officialHost(official.url):false,
      duplicate_status:duplicate?"DUPLICATE_FOUND":"NO_SOURCE_KEY_DUPLICATE_FOUND",duplicate_checks:duplicateFlags,
      already_canonical_mapped:mapped,canonical_recruitment_id:r.canonical_recruitment_id??"",
      organization_resolution:org.kind,
      organization_resolution_reason:org.kind==="CANDIDATE"?org.reason:org.kind==="NONE"?org.reason:org.kind==="ALIAS"?"alias_match":org.ambiguous?"multiple_existing_matches":"existing_name_match",
      published_date:r.published_date,application_start_date:r.application_start_date,application_end_date:r.application_end_date,advertisement_number:r.advertisement_number
    };
  });
  const selected=(LIMIT>0?rows.slice(0,LIMIT):rows).map(r=>({...r,ingest_recommendation:r.already_canonical_mapped?"HOLD_ALREADY_CANONICAL_MAPPED":!r.official_notification_url?"HOLD_MISSING_OFFICIAL_URL":r.duplicate_status==="DUPLICATE_FOUND"?"HOLD_DUPLICATE":"REVIEW_OFFICIAL_URL_BEFORE_INGEST"}));
  fs.mkdirSync(OUT_DIR,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  const jsonPath=path.join(OUT_DIR,`fja-candidate-audit-${stamp}.json`);
  const csvPath=path.join(OUT_DIR,`fja-candidate-audit-${stamp}.csv`);
  const counts={official_url_found:selected.filter(r=>r.official_notification_url).length,official_url_missing:selected.filter(r=>!r.official_notification_url).length,duplicate_found:selected.filter(r=>r.duplicate_status==="DUPLICATE_FOUND").length,no_source_key_duplicate_found:selected.filter(r=>r.duplicate_status==="NO_SOURCE_KEY_DUPLICATE_FOUND").length,already_canonical_mapped:selected.filter(r=>r.already_canonical_mapped).length};
  fs.writeFileSync(jsonPath,JSON.stringify({generated_at:new Date().toISOString(),read_only:true,selection:"freejobalert source rows passing the canonical promotion source-URL/external-ID anti-joins; prior canonical map separately flagged",inventory_rows_scanned:rows.length,rows_reported:selected.length,counts,rows:selected},null,2),"utf8");
  const columns=Object.keys(selected[0]??{inventory_id:""}).filter(k=>k!=="duplicate_checks");
  const csv=[columns.join(","),...selected.map(row=>columns.map(k=>csvCell((row as Record<string,unknown>)[k])).join(","))].join("\r\n");
  fs.writeFileSync(csvPath,csv+"\r\n","utf8");
  console.log(JSON.stringify({mode:"READ_ONLY_AUDIT",writes_performed:0,inventory_rows_scanned:rows.length,rows_reported:selected.length,counts,csv_report:csvPath,json_report:jsonPath},null,2));
}
main().catch(err=>{console.error(err);process.exit(1);});
