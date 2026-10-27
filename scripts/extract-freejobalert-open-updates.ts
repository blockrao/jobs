#!/usr/bin/env node
/**
 * FreeJobAlert New Updates inventory and bounded detail extraction.
 * Research only: no database writes. Preserves the complete discovered listing inventory
 * separately from the capped detail sample, plus raw HTML, hashes, facts, and errors.
 */
import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseFjaResearchDetail } from "./lib/fja-research-parser";
import { buildFjaEnrichmentCandidate } from "./lib/fja-enrichment-mapper";

const BASE = "https://www.freejobalert.com";
const START_DATE = process.env.START_DATE || "2026-10-02";
const AS_OF_DATE = process.env.AS_OF_DATE || "2026-10-09";
const DELAY_MS = Number(process.env.DELAY_MS || 1000);
const MAX_LIST_PAGES = Number(process.env.MAX_LIST_PAGES || 20);
const MAX_RECORDS = Math.max(1, Number.parseInt(process.env.MAX_RECORDS || "10", 10) || 10);
const OUT = process.env.OUT_DIR || `artifacts/freejobalert-${START_DATE}-to-${AS_OF_DATE}`;
const UA = "JobOyeResearchSnapshot/1.0 (public listing comparison; contact: research; no production writes)";
const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));
const sha = (s:string) => createHash("sha256").update(s).digest("hex");
const norm = (s:string) => s.replace(/\s+/g, " ").trim();
function isoDate(s:string): string | null {
  const m = s.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
}
async function get(url:string) {
  const res = await fetch(url, {headers:{ "user-agent":UA, accept:"text/html,application/xhtml+xml" }, redirect:"follow", signal:AbortSignal.timeout(25000)});
  const body = await res.text();
  if ([401,403,429].includes(res.status)) throw new Error(`Access denied/rate limited HTTP ${res.status}: ${url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return {body,url:res.url || url,status:res.status};
}
function abs(href:string|undefined, base:string):string|null {
  if (!href) return null;
  try { const u = new URL(href,base); return u.hostname.endsWith("freejobalert.com") && u.protocol==="https:" ? u.toString() : null; } catch { return null; }
}
async function robotsCheck() {
  const {body} = await get(`${BASE}/robots.txt`);
  // The target is the public /new-updates/ listing and linked article pages.
  const lines = body.split(/\r?\n/).map(x=>x.split("#")[0].trim()).filter(Boolean);
  let star=false, groupAgents:string[]=[]; const rules:string[]=[];
  for (const line of lines) {
    const i=line.indexOf(":"); if(i<0) continue;
    const k=line.slice(0,i).trim().toLowerCase(), v=line.slice(i+1).trim();
    if(k==="user-agent") { if(groupAgents.length) { if(groupAgents.includes("*")) star=true; groupAgents=[]; } groupAgents.push(v.toLowerCase()); }
    else if(k==="disallow" && (star || groupAgents.includes("*")) && v) rules.push(v);
  }
  for (const p of ["/new-updates/","/articles/research-check-1234/"]) {
    if(rules.some(rule=>rule!=="/" && p.startsWith(rule))) throw new Error(`robots.txt disallows ${p}; stopping`);
    if(rules.includes("/")) throw new Error("robots.txt disallows all crawling; stopping");
  }
}
type FjaRecord = Record<string,unknown> & {facts?: Record<string,string|null>; capture_quality?: {status:string; detail_text_chars:number; section_count:number; source_table_count:number; link_count:number; list_item_count:number; recognized_fact_count:number; missing_core_fields:string[]}};
type Listing = {update_date:string; title:string; listing_url:string; update_page:string; listing_row_text:string};
function parseListing(html:string, pageUrl:string): Listing[] {
  const $=cheerio.load(html); const found:Listing[]=[];
  $("tr").each((_,tr)=>{
    const cells=$(tr).find("td,th").toArray().map(el=>norm($(el).text()));
    if(cells.length<2) return;
    const date=isoDate(cells[0]); if(!date) return;
    const row=$(tr); const anchors=row.find("a[href]").toArray();
    const chosen=anchors.map(a=>({text:norm($(a).text()),url:abs($(a).attr("href"),pageUrl)}))
      .find(a=>a.url && /get details|view details|more information/i.test(a.text))
      || anchors.map(a=>({text:norm($(a).text()),url:abs($(a).attr("href"),pageUrl)})).find(a=>a.url && a.text);
    if(!chosen?.url) return;
    found.push({update_date:date,title:cells[1]||chosen.text,listing_url:chosen.url,update_page:pageUrl,listing_row_text:cells.join(" | ")});
  });
  return found;
}
async function main(){
  await mkdir(path.join(OUT,"raw"),{recursive:true});
  await robotsCheck();
  const listings:Listing[]=[]; const errors:Record<string,unknown>[]=[]; const pageHashes:{url:string;sha256:string}[]=[];
  let reachedCutoff=false;
  for(let p=0;p<MAX_LIST_PAGES;p++){
    const url=p===0?`${BASE}/new-updates/`:`${BASE}/new-updates/page/${p}/`;
    try{
      const {body, url:finalUrl}=await get(url); pageHashes.push({url:finalUrl,sha256:sha(body)});
      await writeFile(path.join(OUT,"raw",`listing-page-${String(p).padStart(2,"0")}.html`),body);
      const rows=parseListing(body,finalUrl);
      if(!rows.length){errors.push({url,stage:"listing_parse",error:"No dated listing rows detected"}); break;}
      for(const row of rows){if(row.update_date<START_DATE){reachedCutoff=true;continue;} if(row.update_date<=AS_OF_DATE) listings.push(row);}
      console.log(`Listing page ${p+1}: ${rows.length} rows; in-window total ${listings.length}`);
      if(reachedCutoff) break;
    }catch(e){errors.push({url,stage:"listing_fetch",error:String(e)});break;}
    await sleep(DELAY_MS);
  }
  const discoveredUnique=[...new Map(listings.map(x=>[x.listing_url,x])).values()];
  // A bounded sample by default; increase MAX_RECORDS explicitly for a larger run.
  const unique=discoveredUnique.slice(0, MAX_RECORDS);
  const uncapturedListings=discoveredUnique.slice(MAX_RECORDS);
  const records:FjaRecord[]=[];
  for(let i=0;i<unique.length;i++){
    const l=unique[i];
    try{
      const {body,url:finalUrl}=await get(l.listing_url);
      const d=parseFjaResearchDetail(body,finalUrl,AS_OF_DATE);
      const retrievedAt=new Date().toISOString();
      const pageSha=sha(body);
      const rawName=`${String(i+1).padStart(4,"0")}-${sha(finalUrl).slice(0,14)}.html`;
      await writeFile(path.join(OUT,"raw",rawName),body);
      const enrichmentCandidate=buildFjaEnrichmentCandidate(d,finalUrl,retrievedAt,pageSha);
      records.push({...l,detail_url:finalUrl,retrieved_at:retrievedAt,page_sha256:pageSha,raw_html_file:`raw/${rawName}`,...d,enrichment_candidate:enrichmentCandidate});
    }catch(e){errors.push({listing_url:l.listing_url,title:l.title,stage:"detail_fetch",error:String(e)});records.push({...l,extraction_status:"ERROR",error:String(e),open_status:"REVIEW_FETCH_ERROR"});}
    if((i+1)%20===0) console.log(`Detail pages ${i+1}/${unique.length}`);
    await sleep(DELAY_MS);
  }
  const eligible=records.filter(r=>r.open_status==="OPEN_AS_OF_CUTOFF");
  const fields=["update_date","title","listing_url","detail_url","open_status","derived_close_date","organization","post_name","vacancies","qualification","age_limit","salary_pay","application_start_date","application_end_date","job_location","advertisement_number","raw_html_file"];
  const csvCell=(v:unknown)=>{const s=Array.isArray(v)?JSON.stringify(v):String(v??"");return '"'+s.replace(/"/g,'""')+'"';};
  const csvValue=(r:FjaRecord,f:string)=>f==="organization"?r.facts?.organization:f==="post_name"?r.facts?.post_name:f==="vacancies"?r.facts?.vacancies:f==="qualification"?r.facts?.qualification:f==="age_limit"?r.facts?.age_limit:f==="salary_pay"?r.facts?.salary_pay:f==="application_start_date"?r.facts?.application_start_date:f==="application_end_date"?r.facts?.application_end_date:f==="job_location"?r.facts?.job_location:f==="advertisement_number"?r.facts?.advertisement_number:r[f];
  const csv=[fields.join(","),...eligible.map(r=>fields.map(f=>csvCell(csvValue(r,f))).join(","))].join("\n");
  // Keep the full listing inventory even when detail extraction is capped.
  await writeFile(path.join(OUT,"all-in-window-listings.json"),JSON.stringify(discoveredUnique,null,2));
  await writeFile(path.join(OUT,"detail-records.json"),JSON.stringify(records,null,2));
  await writeFile(path.join(OUT,"uncaptured-listings.json"),JSON.stringify(uncapturedListings,null,2));
  await writeFile(path.join(OUT,"open-as-of-cutoff.csv"),csv+"\n");
  await writeFile(path.join(OUT,"crawl-errors.json"),JSON.stringify(errors,null,2));
  await writeFile(path.join(OUT,"listing-page-evidence.json"),JSON.stringify(pageHashes,null,2));
  const reviewRecords=records.filter(r=>Array.isArray(r.review_reasons)&&r.review_reasons.length>0);
  const summary={
    source:BASE,start_date:START_DATE,as_of_date:AS_OF_DATE,
    listing_pages_fetched:pageHashes.length,
    in_window_listings_observed:listings.length,
    in_window_unique_listings_discovered:discoveredUnique.length,
    detail_record_cap:MAX_RECORDS,
    detail_records_processed:records.length,
    listings_without_detail_capture:uncapturedListings.length,
    detail_cap_reached:discoveredUnique.length>MAX_RECORDS,
    inventory_complete_to_date_cutoff:reachedCutoff,
    listing_inventory_file:"all-in-window-listings.json",
    detail_records_file:"detail-records.json",
    uncaptured_listings_file:"uncaptured-listings.json",
    open_as_of_cutoff:eligible.length,closed_by_cutoff:records.filter(r=>r.open_status==="CLOSED_BY_CUTOFF").length,
    review_date_unclear:records.filter(r=>String(r.open_status).startsWith("REVIEW")).length,
    records_with_organization:records.filter(r=>Boolean(r.facts?.organization)).length,
    records_with_numeric_vacancy_fact:records.filter(r=>Boolean(r.facts?.vacancies)&&/\d/.test(String(r.facts?.vacancies))).length,
    records_with_post_table_candidates:records.filter(r=>Array.isArray(r.post_table_candidates)&&r.post_table_candidates.length>0).length,
    records_with_official_link_candidates:records.filter(r=>Array.isArray(r.official_link_candidates)&&r.official_link_candidates.length>0).length,
    records_with_page_hash:records.filter(r=>typeof r.page_sha256==="string"&&r.page_sha256.length===64).length,
    records_with_structured_capture:records.filter(r=>Boolean(r.capture_quality) && Number(r.capture_quality?.detail_text_chars ?? 0) >= 500).length,
    records_with_capture_review:records.filter(r=>r.capture_quality?.status==="CAPTURE_REVIEW").length,
    records_with_enrichment_candidate:records.filter(r=>Boolean(r.enrichment_candidate)).length,
    records_blocked_from_publication:records.filter(r=>(r.enrichment_candidate as {publication_gate?:{status?:string}}|undefined)?.publication_gate?.status==="REVIEW_REQUIRED").length,
    records_with_vacancy_breakdown_candidates:records.filter(r=>Array.isArray((r.enrichment_candidate as {vacancies_breakdown?:unknown[]}|undefined)?.vacancies_breakdown) && ((r.enrichment_candidate as {vacancies_breakdown?:unknown[]}).vacancies_breakdown?.length ?? 0)>0).length,
    records_with_core_fields_complete:records.filter(r=>r.capture_quality?.status==="STRUCTURE_CAPTURED").length,
    total_source_tables_captured:records.reduce((n,r)=>n+Number(r.capture_quality?.source_table_count ?? 0),0),
    total_content_sections_captured:records.reduce((n,r)=>n+Number(r.capture_quality?.section_count ?? 0),0),
    total_list_items_captured:records.reduce((n,r)=>n+Number(r.capture_quality?.list_item_count ?? 0),0),
    missing_core_field_counts:records.reduce((counts,r)=>{
      for(const field of r.capture_quality?.missing_core_fields ?? []) counts[field]=(counts[field] ?? 0)+1;
      return counts;
    },{} as Record<string,number>),
    records_with_review_reasons:reviewRecords.length,
    review_reason_count:reviewRecords.reduce((n,r)=>n+(r.review_reasons as unknown[]).length,0),
    fetch_or_parse_errors:errors.length,
    important_note:"FreeJobAlert facts are secondary discovery data. Verify facts and closing dates against official notifications before JobOye use. No production writes."
  };
  await writeFile(path.join(OUT,"summary.json"),JSON.stringify(summary,null,2));
  console.log(`DONE: ${discoveredUnique.length} unique listings discovered; ${records.length} details processed; ${uncapturedListings.length} listings left uncaptured; ${eligible.length} open; ${errors.length} errors`);
}
main().catch(e=>{console.error(e);process.exit(1)});
