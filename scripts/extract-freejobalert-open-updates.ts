#!/usr/bin/env node
/**
 * Full FreeJobAlert New Updates extraction for a fixed review window.
 * Research only: no database writes. Saves raw HTML, all in-window listings,
 * extracted detail facts, errors, and an open-listings CSV.
 */
import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://www.freejobalert.com";
const START_DATE = process.env.START_DATE || "2026-10-02";
const AS_OF_DATE = process.env.AS_OF_DATE || "2026-10-09";
const DELAY_MS = Number(process.env.DELAY_MS || 1000);
const MAX_LIST_PAGES = Number(process.env.MAX_LIST_PAGES || 20);
const OUT = process.env.OUT_DIR || "artifacts/freejobalert-full-extraction";
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
function extractDetail(html:string, url:string) {
  const $=cheerio.load(html);
  const title=norm($("h1").first().text()||$("meta[property='og:title']").attr("content")||$("title").text());
  const text=norm($("main").text()||$("article").text()||$("body").text()).slice(0,50000);
  const facts:Record<string,string|null>={};
  const patterns:Record<string,RegExp>={
    organization:/^(recruiting body|organization|organisation|department|company name)$/i,
    post_name:/^(name of post|post name|name of posts?)$/i,
    vacancies:/^(total vacancies|no\.? of vacancies|number of vacancies|vacancies)$/i,
    qualification:/^(qualification|educational qualification|eligibility|education qualification)$/i,
    age_limit:/^(age limit|age criteria|age limit as on.*)$/i,
    salary_pay:/^(salary|pay scale|pay level|remuneration|pay matrix)$/i,
    application_start_date:/^(starting date|application start date|start date|online application start date)$/i,
    application_end_date:/^(last date|last date to apply|closing date|application end date|last date for submission|last date to apply online)$/i,
    notification_date:/^(notification date|published date|post date)$/i,
    job_location:/^(job location|location|place of posting)$/i,
    advertisement_number:/^(advertisement no\.?|advt\.? no\.?|notification no\.?|reference no\.?|advertisement number)$/i
  };
  $("table tr").each((_,tr)=>{
    const cells=$(tr).find("th,td").toArray().map(el=>norm($(el).text()));
    if(cells.length<2) return;
    for(const [key,re] of Object.entries(patterns)) if(re.test(cells[0])&&!facts[key]) facts[key]=cells.slice(1).join(" | ");
  });
  const links=$("a[href]").toArray().map(a=>({text:norm($(a).text()),url:abs($(a).attr("href"),url)})).filter(x=>x.url);
  const official_links=links.filter(x=>/official website|official notification|notification|advertisement|apply online|apply now|download.*pdf/i.test(x.text));
  const dateStrings=[...text.matchAll(/(?:last date(?: to apply| for submission)?|closing date|walk[- ]?in(?: interview)? date|date of interview)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/ig)].map(m=>({label:m[0].split(/[:\-]/)[0].trim(),date:isoDate(m[1])})).filter(x=>x.date);
  const appDate=facts.application_end_date ? isoDate(facts.application_end_date) : null;
  const walkinDate=dateStrings.find(x=>/walk/i.test(x.label))?.date || null;
  let open_status="REVIEW_DATE_UNCLEAR", close_date=appDate||walkinDate;
  if(close_date) open_status=close_date>=AS_OF_DATE ? "OPEN_AS_OF_CUTOFF" : "CLOSED_BY_CUTOFF";
  else if(/walk[- ]?in/i.test(title+" "+text)) open_status="REVIEW_WALKIN_DATE_UNCLEAR";
  return {page_title:title||null,page_sha256:sha(html),detail_text:text,facts,official_links,date_candidates:dateStrings,derived_close_date:close_date,open_status};
}
async function main(){
  await mkdir(path.join(OUT,"raw"),{recursive:true});
  await robotsCheck();
  const listings:Listing[]=[]; const errors:any[]=[]; const pageHashes:any[]=[];
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
  const unique=[...new Map(listings.map(x=>[x.listing_url,x])).values()];
  const records:any[]=[];
  for(let i=0;i<unique.length;i++){
    const l=unique[i];
    try{
      const {body,url:finalUrl}=await get(l.listing_url);
      const d=extractDetail(body,finalUrl);
      const rawName=`${String(i+1).padStart(4,"0")}-${sha(finalUrl).slice(0,14)}.html`;
      await writeFile(path.join(OUT,"raw",rawName),body);
      records.push({...l,detail_url:finalUrl,retrieved_at:new Date().toISOString(),raw_html_file:`raw/${rawName}`,...d});
    }catch(e){errors.push({listing_url:l.listing_url,title:l.title,stage:"detail_fetch",error:String(e)});records.push({...l,extraction_status:"ERROR",error:String(e),open_status:"REVIEW_FETCH_ERROR"});}
    if((i+1)%20===0) console.log(`Detail pages ${i+1}/${unique.length}`);
    await sleep(DELAY_MS);
  }
  const eligible=records.filter(r=>r.open_status==="OPEN_AS_OF_CUTOFF");
  const fields=["update_date","title","listing_url","detail_url","open_status","derived_close_date","organization","post_name","vacancies","qualification","age_limit","salary_pay","application_start_date","application_end_date","job_location","advertisement_number","raw_html_file"];
  const csvCell=(v:any)=>{const s=Array.isArray(v)?JSON.stringify(v):String(v??"");return '"'+s.replace(/"/g,'""')+'"';};
  const csvValue=(r:any,f:string)=>f==="organization"?r.facts?.organization:f==="post_name"?r.facts?.post_name:f==="vacancies"?r.facts?.vacancies:f==="qualification"?r.facts?.qualification:f==="age_limit"?r.facts?.age_limit:f==="salary_pay"?r.facts?.salary_pay:f==="application_start_date"?r.facts?.application_start_date:f==="application_end_date"?r.facts?.application_end_date:f==="job_location"?r.facts?.job_location:f==="advertisement_number"?r.facts?.advertisement_number:r[f];
  const csv=[fields.join(","),...eligible.map(r=>fields.map(f=>csvCell(csvValue(r,f))).join(","))].join("\n");
  await writeFile(path.join(OUT,"all-in-window-listings.json"),JSON.stringify(records,null,2));
  await writeFile(path.join(OUT,"open-as-of-cutoff.csv"),csv+"\n");
  await writeFile(path.join(OUT,"crawl-errors.json"),JSON.stringify(errors,null,2));
  await writeFile(path.join(OUT,"listing-page-evidence.json"),JSON.stringify(pageHashes,null,2));
  await writeFile(path.join(OUT,"summary.json"),JSON.stringify({source:BASE,start_date:START_DATE,as_of_date:AS_OF_DATE,listing_pages_fetched:pageHashes.length,in_window_unique_listings:unique.length,detail_records:records.length,open_as_of_cutoff:eligible.length,closed_by_cutoff:records.filter(r=>r.open_status==="CLOSED_BY_CUTOFF").length,review_date_unclear:records.filter(r=>String(r.open_status).startsWith("REVIEW")).length,fetch_or_parse_errors:errors.length,important_note:"FreeJobAlert facts are secondary discovery data. Verify facts and closing dates against official notifications before JobOye use. No production writes."},null,2));
  console.log(`DONE: ${unique.length} in-window listings; ${eligible.length} open; ${errors.length} errors`);
}
main().catch(e=>{console.error(e);process.exit(1)});
