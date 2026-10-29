#!/usr/bin/env tsx
/**
 * Read-only FJA candidate audit report.
 *
 * Reads the existing FJA inventory table directly and creates CSV/JSON
 * reports. It intentionally does not call the canonical writer. If the
 * legacy source table was removed, the script fails safely and reports that
 * condition rather than making changes elsewhere.
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/db";
import { loadOrgIndex, resolveOrganization } from "../src/ingest/organization-resolution";
import { sql } from "drizzle-orm";

interface Row {
  id:number; external_id:string; source_url:string|null; title:string;
  organization_name:string|null; listing_category:string|null;
  published_date:string|null; application_start_date:string|null; application_end_date:string|null;
  advertisement_number:string|null; details:unknown; official_notification_url:string|null;
  other_info_raw:unknown; detail_status?:string|null; source_slug?:string|null;
  duplicate_posting_source_url:boolean; duplicate_posting_external_id:boolean;
}
const LIMIT=Math.max(0,Number.parseInt(process.env.FJA_AUDIT_LIMIT??"0",10)||0);
const OUT_DIR=process.env.FJA_AUDIT_OUT_DIR??"artifacts";

function record(v:unknown):Record<string,unknown>{
 if(v&&typeof v==="object"&&!Array.isArray(v))return v as Record<string,unknown>;
 if(typeof v==="string")try{const p:unknown=JSON.parse(v);if(p&&typeof p==="object"&&!Array.isArray(p))return p as Record<string,unknown>;}catch{/* malformed capture */}
 return {};
}
function collectLinks(v:unknown,out:Array<{url:string;label:string}>=[],depth=0):typeof out{
 if(depth>10||v==null||typeof v!=="object")return out;
 if(Array.isArray(v)){for(const x of v)collectLinks(x,out,depth+1);return out;}
 const o=v as Record<string,unknown>,url=typeof o.url==="string"?o.url:typeof o.href==="string"?o.href:"";
 const label=typeof o.text==="string"?o.text:typeof o.label==="string"?o.label:typeof o.title==="string"?o.title:"";
 if(url&&!out.some(x=>x.url===url))out.push({url,label});
 for(const[k,x]of Object.entries(o))if(!["raw_html","html","detail_text","normalized_text"].includes(k.toLowerCase()))collectLinks(x,out,depth+1);
 return out;
}
function officialHost(url:string):boolean{
 try{const h=new URL(url).hostname.toLowerCase().replace(/\.$/,"");
 return /(^|\.)(gov\.in|nic\.in|ac\.in|edu\.in|res\.in|mil\.in)$/.test(h)||/(^|\.)(hmtindia\.com|sbi\.co\.in|ibps\.in|ongcindia\.com|ntpc\.co\.in|iocl\.com|bharatpetroleum\.in|hindustanpetroleum\.com|gailonline\.com|bel-india\.in|bhel\.com|sail\.co\.in|coalindia\.in|powergrid\.in|ecil\.co\.in|rites\.com|ircon\.org|mazagondock\.in|grse\.in|nclcil\.in|nlcindia\.in)$/.test(h);
 }catch{return false;}
}
function extractOfficialUrl(r:Row):{url:string;method:string;label:string}|null{
 const d=record(r.details),o=record(r.other_info_raw),detail=record(d.detail??d),facts=record(detail.facts??o.facts);
 const stored=r.official_notification_url?.trim();
 if(stored&&officialHost(stored))return{url:stored,method:"stored_official_notification_url",label:""};
 const nested=[facts.official_notification_url,facts.officialNotificationUrl,detail.official_notification_url,detail.officialNotificationUrl,d.official_notification_url,d.officialNotificationUrl,o.official_notification_url,o.officialNotificationUrl].find(v=>typeof v==="string"&&officialHost(v));
 if(typeof nested==="string")return{url:nested,method:"captured_official_notification_field",label:""};
 const links=[...collectLinks(d),...collectLinks(o)].filter((x,i,a)=>a.findIndex(y=>y.url===x.url)===i);
 const candidates=links.filter(x=>officialHost(x.url)&&(/(notification|advertisement|advt|official notice|recruitment notice|detailed notice|notification pdf|download notice)/i.test(x.label)||/\.pdf(?:[?#]|$)/i.test(x.url)))
  .map(x=>({...x,score:(/(notification|advertisement|advt|official notice|recruitment notice|detailed notice|notification pdf|download notice)/i.test(x.label)?5:0)+(/\.pdf(?:[?#]|$)/i.test(x.url)?3:0)+(/(recruit|vacan|career|job|advt|notice|advertisement|notification)/i.test(x.url)?2:0)})).sort((a,b)=>b.score-a.score);
 return candidates[0]?{url:candidates[0].url,method:"official_host_link_heuristic",label:candidates[0].label}:null;
}
function cell(v:unknown):string{const s=v==null?"":typeof v==="string"?v:JSON.stringify(v);return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}

async function main(){
 const db=getDb();
 // The current FJA source inventory is private and distinct from canonical tables.
 // Read only the extracted rows, with the exact promotion filters and status scope.
 const tableCheck=await db.execute(sql.raw("SELECT to_regclass('public.fja_job_inventory') AS table_name"));
 const tableRows=Array.isArray(tableCheck)?tableCheck as Array<{table_name:string|null}>:(tableCheck as unknown as {rows?:Array<{table_name:string|null}>}).rows??[];
 if(!tableRows[0]?.table_name) throw new Error("fja_job_inventory is absent; no audit rows could be generated. Do not run live promotion until the source inventory is restored or migrated.");
 const raw=await db.execute(sql.raw(`
  SELECT f.id,f.external_id,f.source_url,f.title,f.organization_name,f.listing_category,
   f.published_date,f.application_start_date,f.application_end_date,f.advertisement_number,
   f.details,f.official_notification_url,f.other_info_raw,
   EXISTS(SELECT 1 FROM postings p WHERE lower(regexp_replace(trim(p.source_url), '/+$',''))=lower(regexp_replace(trim(f.source_url), '/+$',''))) AS duplicate_posting_source_url,
   EXISTS(SELECT 1 FROM postings p WHERE p.source='fja' AND p.external_id=f.external_id) AS duplicate_posting_external_id,
   f.other_info_raw->>'canonical_recruitment_id' AS canonical_recruitment_id
  FROM public.fja_job_inventory f
  WHERE f.source_slug='freejobalert'
    AND f.detail_status='EXTRACTED'
    AND lower(coalesce(f.listing_category,'')) NOT LIKE '%expired%'
    AND NOT EXISTS(SELECT 1 FROM postings p WHERE lower(regexp_replace(trim(p.source_url), '/+$',''))=lower(regexp_replace(trim(f.source_url), '/+$','')))
    AND NOT EXISTS(SELECT 1 FROM postings p WHERE p.source='fja' AND p.external_id=f.external_id)
  ORDER BY f.first_seen_at DESC
 `)) as unknown as Row[];
 const inventory=Array.isArray(raw)?raw:(raw as unknown as {rows?:Row[]}).rows??[];
 const orgIndex=await loadOrgIndex(db);
 const rows=inventory.map(r=>{
  const official=extractOfficialUrl(r),flags={posting_source_url:Boolean(r.duplicate_posting_source_url),posting_external_id:Boolean(r.duplicate_posting_external_id)};
  const org=resolveOrganization(orgIndex,r.organization_name),mapped=(r as any).canonical_recruitment_id!=null,duplicate=Object.values(flags).some(Boolean);
  return {inventory_id:r.id,external_id:r.external_id,fja_title:r.title,organization:r.organization_name,fja_url:r.source_url,
   listing_category:r.listing_category,official_notification_url:official?.url??"",official_url_extraction_method:official?.method??"not_found",official_url_link_label:official?.label??"",
   official_url_host_recognized:official?officialHost(official.url):false,duplicate_status:duplicate?"DUPLICATE_FOUND":"NO_POSTING_SOURCE_KEY_DUPLICATE_FOUND",
   duplicate_checks:flags,already_canonical_mapped:mapped,canonical_recruitment_id:(r as any).canonical_recruitment_id??"",
   organization_resolution:org.kind,organization_resolution_reason:org.kind==="CANDIDATE"?org.reason:org.kind==="NONE"?org.reason:org.kind==="ALIAS"?"alias_match":org.ambiguous?"multiple_existing_matches":"existing_name_match",
   published_date:r.published_date,application_start_date:r.application_start_date,application_end_date:r.application_end_date,advertisement_number:r.advertisement_number};
 });
 const selected=(LIMIT>0?rows.slice(0,LIMIT):rows).map(r=>({...r,ingest_recommendation:r.already_canonical_mapped?"HOLD_ALREADY_CANONICAL_MAPPED":!r.official_notification_url?"HOLD_MISSING_OFFICIAL_URL":r.duplicate_status==="DUPLICATE_FOUND"?"HOLD_DUPLICATE":"REVIEW_OFFICIAL_URL_BEFORE_INGEST"}));
 fs.mkdirSync(OUT_DIR,{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,"-");
 const jp=path.join(OUT_DIR,`fja-candidate-audit-${stamp}.json`),cp=path.join(OUT_DIR,`fja-candidate-audit-${stamp}.csv`);
 const counts={official_url_found:selected.filter(r=>r.official_notification_url).length,official_url_missing:selected.filter(r=>!r.official_notification_url).length,duplicate_found:selected.filter(r=>r.duplicate_status==="DUPLICATE_FOUND").length,no_posting_source_key_duplicate_found:selected.filter(r=>r.duplicate_status==="NO_POSTING_SOURCE_KEY_DUPLICATE_FOUND").length,already_canonical_mapped:selected.filter(r=>r.already_canonical_mapped).length};
 fs.writeFileSync(jp,JSON.stringify({generated_at:new Date().toISOString(),read_only:true,selection:"FJA source rows passing postings source-URL/external-ID anti-joins; recruitment URL parity not verifiable because recruitments has no source_url column in the canonical schema",inventory_rows_scanned:rows.length,rows_reported:selected.length,counts,rows:selected},null,2),"utf8");
 const cols=Object.keys(selected[0]??{inventory_id:""}).filter(k=>k!=="duplicate_checks");
 fs.writeFileSync(cp,[cols.join(","),...selected.map(r=>cols.map(k=>cell((r as Record<string,unknown>)[k])).join(","))].join("\r\n")+"\r\n","utf8");
 console.log(JSON.stringify({mode:"READ_ONLY_AUDIT",writes_performed:0,inventory_rows_scanned:rows.length,rows_reported:selected.length,counts,csv_report:cp,json_report:jp},null,2));
}
main().catch(e=>{console.error("FJA audit failed safely:",e);process.exit(1);});
