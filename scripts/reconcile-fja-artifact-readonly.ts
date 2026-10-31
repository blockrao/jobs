import postgres from "postgres";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { organizationCompatible, safeEntityMatch } from "./fja-match-policy";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL missing; refusing to run.");
const input = process.env.FJA_ARTIFACT_DIR ?? "artifacts/fja-artifact";
const output = process.env.FJA_RECONCILIATION_OUT ?? "artifacts/fja-reconciliation";
const runId = process.env.FJA_SOURCE_RUN_ID ?? "40513389060";
const db = postgres(dbUrl, { max: 3, connect_timeout: 15, prepare: false });
const norm = (v:unknown) => String(v??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/&/g," and ").replace(/\b(recruitment|recruitments|notification|online form|offline form|apply online|application form|20\d{2})\b/g," ")
  .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
const sim = (a:string,b:string) => { const x=new Set(norm(a).split(" ").filter(t=>t.length>1)), y=new Set(norm(b).split(" ").filter(t=>t.length>1)); if(!x.size||!y.size)return 0; let n=0; for(const t of x)if(y.has(t))n++; return 2*n/(x.size+y.size); };
const extId = (u:string) => { const m=u.match(/-(\d{4,})\/?(?:[?#].*)?$/); if(!m)throw Error("No FJA article ID: "+u); return m[1]; };
const vacancy = (v:unknown):number|null => /^\d+$/.test(String(v??"").trim()) ? Number(v) : null;
const isoDate = (v:unknown):string|null => {
 if(typeof v!=="string")return null; let m=v.trim().match(/^(\d{1,2})[ -](January|February|March|April|May|June|July|August|September|October|November|December)[ ,.-]+(20\d{2})$/i);
 if(m){const mo:Record<string,string>={january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",july:"07",august:"08",september:"09",october:"10",november:"11",december:"12"};return `${m[3]}-${mo[m[2].toLowerCase()]}-${m[1].padStart(2,"0")}`;}
 m=v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})$/); return m&&+m[1]<=31&&+m[2]<=12?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:null;
};
const cell=(v:unknown)=>'"'+String(v??"").replace(/"/g,'""')+'"';
const officialNotificationUrl=(d:any,f:any):string=>{
 const direct=[f?.official_notification_url,f?.notification_url,d?.official_notification_url,d?.notification_url,d?.enrichment_candidate?.core?.official_notification_url,d?.enrichment_candidate?.core?.notification_url];
 for(const v of direct){if(typeof v==="string"&&v.trim())return v.trim();}
 // The extraction stores labelled outbound links separately from normalized facts.
 // Prefer links explicitly labelled as official notification/advertisement, never the FJA source URL.
 const links=Array.isArray(d?.official_link_candidates)?d.official_link_candidates:[];
 const preferred=links.filter((x:any)=>/official\s*(notification|advertisement)|notification\s*(pdf|download)|advertisement\s*(pdf|download)|download\s*(official\s*)?(notification|advertisement)/i.test(String(x?.text??"")));
 for(const x of preferred){
  const value=String(x?.url??"").trim();
  try{const u=new URL(value);const host=u.hostname.toLowerCase().replace(/^www\./,"");if(/^https?:$/.test(u.protocol)&&host!=="freejobalert.com")return u.href;}catch{}
 }
 return "";
};


async function main(){
 const listings=JSON.parse(await readFile(path.join(input,"all-in-window-listings.json"),"utf8"));
 const details=JSON.parse(await readFile(path.join(input,"detail-records.json"),"utf8"));
 if(!Array.isArray(listings)||!listings.length)throw Error("Empty listing inventory; no writes attempted.");
 const byUrl=new Map(details.map((d:any)=>[d.listing_url,d]));
 const [recs,posts]=await Promise.all([
  db`select r.id,r.name,r.slug,r.advertisement_number,r.source_url,r.notification_url,r.official_notification_url,r.application_end_date::text as application_end_date,r.total_vacancies,o.name as org from public.recruitments r left join public.organizations o on o.id=r.organization_id`,
  db`select p.id,coalesce(p.name,p.title) as name,p.slug,p."officialSourceUrl" as source_url,p.original_recruitment_url as original_url,o.name as org,p.vacancy_total as total_vacancies from public.posts p left join public.recruitments r on r.id=p.recruitment_id left join public.organizations o on o.id=coalesce(p.employing_organization_id,p."organizationId",r.organization_id)`
 ]);
 const rows=listings.map((l:any)=>{
  const d:any=byUrl.get(l.listing_url), facts=d?.facts??{}, title=String(facts.post_name||d?.enrichment_candidate?.core?.job_title||l.title), org=String(facts.organization||d?.enrichment_candidate?.core?.organization||""), ad=String(facts.advertisement_number||"");
  const nonRecruitment=/\b(result|admit card|answer key|syllabus|cut.?off|merit list|exam date|exam city|hall ticket|score card|objection window)\b/i.test(l.title)&&! /\b(vacanc(?:y|ies)|apply online|application form|hiring|jobs?|apprentice|career)\b/i.test(l.title); const cs:any[]=[];
  const sourceId=extId(l.listing_url);
  const sameFjaSource=(u:any)=>{if(!u)return false;try{const a=new URL(String(u)),b=new URL(String(l.listing_url));const ah=a.hostname.toLowerCase().startsWith("www.")?a.hostname.toLowerCase().slice(4):a.hostname.toLowerCase();const bh=b.hostname.toLowerCase().startsWith("www.")?b.hostname.toLowerCase().slice(4):b.hostname.toLowerCase();return ah==="freejobalert.com"&&bh==="freejobalert.com"&&extId(a.href)===sourceId;}catch{return false;}};
  const exactSource=(u:any)=>{if(!u)return false;try{const a=new URL(String(u)),b=new URL(String(l.listing_url));const ah=a.hostname.toLowerCase().startsWith("www.")?a.hostname.toLowerCase().slice(4):a.hostname.toLowerCase();const bh=b.hostname.toLowerCase().startsWith("www.")?b.hostname.toLowerCase().slice(4):b.hostname.toLowerCase();const ap=a.pathname.endsWith("/")?a.pathname.slice(0,-1):a.pathname;const bp=b.pathname.endsWith("/")?b.pathname.slice(0,-1):b.pathname;return ah===bh&&ap===bp;}catch{return String(u)===String(l.listing_url);}};
  for(const r of recs){
   const urlHit=exactSource(r.source_url)||sameFjaSource(r.source_url);
   const ts=Math.max(sim(l.title,r.name),sim(title,r.name)), os=org?sim(org,r.org||""):0;
   const orgSafe=!!org&&organizationCompatible(org,r.org||"");
   const identity=safeEntityMatch({sourceOrganization:org,candidateOrganization:r.org,sourceTitle:title,candidateTitle:r.name,minimumRoleSimilarity:.58});
   const adHit=!!ad&&norm(ad)===norm(r.advertisement_number||"")&&identity.safe;
   // A URL identity is the only permitted bypass. Otherwise employer and role must independently agree.
   const score=urlHit?1:adHit?Math.min(.985,.92+.06*os):ts*(org?.65+.35*os:.8);
   if(urlHit||adHit||(orgSafe&&identity.safe))cs.push({entity:"recruitment",id:r.id,name:r.name,slug:r.slug,org:r.org,officialUrl:r.official_notification_url||r.notification_url||null,score,why:urlHit?"exact FJA source URL/article ID":adHit?"advertisement number + verified organization + role":identity.reason,r});
  }
  for(const p of posts){
   const ts=Math.max(sim(l.title,p.name||""),sim(title,p.name||"")),os=org?sim(org,p.org||""):0;
   const identity=safeEntityMatch({sourceOrganization:org,candidateOrganization:p.org,sourceTitle:title,candidateTitle:p.name,minimumRoleSimilarity:.65});
   if(identity.safe)cs.push({entity:"post",id:p.id,name:p.name,slug:p.slug,org:p.org,officialUrl:p.source_url||null,score:ts*(org?.65+.35*os:.8),why:identity.reason,r:p});
  }
  cs.sort((a,b)=>b.score-a.score);const top=cs[0],second=cs[1];let bucket="ambiguous";
  if(nonRecruitment)bucket="non_recruitment_update";
  else if(!top)bucket="missing_from_joboye";
  else if(top.score>=.94&&(!second||top.score-second.score>=.08)){const r=top.r;const dv=d&&facts.vacancies&&vacancy(facts.vacancies)!==null&&r.total_vacancies!==null&&r.total_vacancies!==undefined&&vacancy(facts.vacancies)!==Number(r.total_vacancies);const fd=isoDate(facts.application_end_date), rd=r.application_end_date?String(r.application_end_date).slice(0,10):null;bucket=dv||(fd&&rd&&fd!==rd)?"material_delta":"existing_match";}
  else if(top.score>=.72&&(!second||top.score-second.score>=.06))bucket="likely_duplicate_alias";
  return {listing:l,detail:d,bucket,candidates:cs.slice(0,5).map(c=>({entity:c.entity,id:c.id,name:c.name,slug:c.slug,organization:c.org,official_notification_url:c.officialUrl||null,score:+c.score.toFixed(3),reason:c.why})),facts,top};
 });
 const counts=rows.reduce((a:any,r:any)=>(a[r.bucket]=(a[r.bucket]||0)+1,a),{});
 await mkdir(output,{recursive:true});
 await writeFile(path.join(output,"fja-reconciliation.json"),JSON.stringify({run_id:runId,window:{start:"2026-10-01",end:"2026-10-27"},source_listing_count:listings.length,detail_count:details.length,canonical_recruitments:recs.length,canonical_posts:posts.length,counts,records:rows.map((x:any)=>{const d=x.detail??{},f=x.facts??{};const officialUrl=officialNotificationUrl(d,f);let officialUrlStatus="missing";if(officialUrl){try{const u=new URL(officialUrl);officialUrlStatus=!/^https?:$/.test(u.protocol)?"invalid_scheme":(["freejobalert.com","www.freejobalert.com"].includes(u.hostname.toLowerCase()))?"source_not_official":"candidate_needs_manual_verification";}catch{officialUrlStatus="invalid_url";}}return {update_date:x.listing.update_date,title:x.listing.title,listing_url:x.listing.listing_url,external_id:extId(x.listing.listing_url),detail_captured:!!x.detail,source_status:d.open_status??"NOT_CAPTURED",official_notification_url:officialUrl||null,official_notification_url_status:officialUrlStatus,facts:x.facts,bucket:x.bucket,candidates:x.candidates};})},null,2));
 const headers=["bucket","update_date","title","external_id","listing_url","detail_captured","source_status","official_notification_url","official_notification_url_status","candidate_entity","candidate_id","candidate_name","candidate_slug","candidate_organization","match_score","match_reason","alternatives_json"];
 await writeFile(path.join(output,"fja-reconciliation.csv"),[headers.join(","),...rows.map((x:any)=>{const c=x.candidates[0]??{},d=x.detail??{},f=x.facts??{};const officialUrl=officialNotificationUrl(d,f);let officialUrlStatus="missing";if(officialUrl){try{const u=new URL(officialUrl);officialUrlStatus=!/^https?:$/.test(u.protocol)?"invalid_scheme":(["freejobalert.com","www.freejobalert.com"].includes(u.hostname.toLowerCase()))?"source_not_official":"candidate_needs_manual_verification";}catch{officialUrlStatus="invalid_url";}}return [x.bucket,x.listing.update_date,x.listing.title,extId(x.listing.listing_url),x.listing.listing_url,!!x.detail,d.open_status??"NOT_CAPTURED",officialUrl,officialUrlStatus,c.entity,c.id,c.name,c.slug,c.organization,c.score,c.reason,JSON.stringify(x.candidates)].map(cell).join(",")})].join("\n")+"\n");
 const manifestRecords=rows.map((x:any)=>{
  const d=x.detail??{}, f=x.facts??{}, url=officialNotificationUrl(d,f);
  const sourceStatus=String(d.open_status??"NOT_CAPTURED");
  let officialUrlStatus="missing";
  if(url){try{const u=new URL(url);officialUrlStatus=!/^https?:$/.test(u.protocol)?"invalid_scheme":(["freejobalert.com","www.freejobalert.com"].includes(u.hostname.toLowerCase()))?"source_not_official":"candidate_needs_manual_verification";}catch{officialUrlStatus="invalid_url";}}
  let suggestedAction="manual_review", reason="No automatic mutation is permitted by this read-only manifest.";
  if(x.bucket==="non_recruitment_update"){suggestedAction="exclude_non_recruitment_update";reason="The listing appears to be a result/exam update rather than a recruitment notice.";}
  else if(x.bucket==="existing_match"){suggestedAction="verify_existing_record";reason="A likely existing entity was matched; do not create a duplicate.";}
  else if(x.bucket==="material_delta"){suggestedAction="review_possible_update";reason="A material field difference needs source-level verification before updating.";}
  else if(x.bucket==="missing_from_joboye"&&sourceStatus==="OPEN_AS_OF_CUTOFF"&&url&&officialUrlStatus==="candidate_needs_manual_verification"&&String(f.organization??d?.enrichment_candidate?.core?.organization??"").trim()&&String(f.post_name??d?.enrichment_candidate?.core?.job_title??x.listing.title).trim()){
   suggestedAction="verify_official_source_then_consider_import";reason="No safe canonical match was found, but employer/title and a non-FJA official-URL candidate exist; the destination still needs manual verification.";
  } else if(x.bucket==="likely_duplicate_alias"){suggestedAction="review_possible_alias";reason="A possible alias/duplicate is not safe to auto-merge.";} 
  return {external_id:extId(x.listing.listing_url),source_title:x.listing.title,source_listing_url:x.listing.listing_url,source_status:sourceStatus,organization:String(f.organization??d?.enrichment_candidate?.core?.organization??""),role_title:String(f.post_name??d?.enrichment_candidate?.core?.job_title??x.listing.title),official_notification_url:url||null,official_notification_url_status:officialUrlStatus,reconciliation_bucket:x.bucket,suggested_action:suggestedAction,reason,top_candidate:x.candidates[0]??null,import_ready:false,production_write_performed:false};
 });
 const manifest={mode:"read-only-review-manifest",source_run_id:runId,source_listing_count:manifestRecords.length,automatic_imports_enabled:false,import_ready_count:manifestRecords.filter((x:any)=>x.import_ready).length,new_records_needing_verification_count:manifestRecords.filter((x:any)=>x.suggested_action==="verify_official_source_then_consider_import").length,existing_count:manifestRecords.filter((x:any)=>x.suggested_action==="verify_existing_record").length,update_review_count:manifestRecords.filter((x:any)=>x.suggested_action==="review_possible_update").length,manual_review_count:manifestRecords.filter((x:any)=>x.suggested_action==="manual_review").length,possible_alias_count:manifestRecords.filter((x:any)=>x.suggested_action==="review_possible_alias").length,excluded_non_recruitment_count:manifestRecords.filter((x:any)=>x.suggested_action==="exclude_non_recruitment_update").length,action_counts:manifestRecords.reduce((acc:any,x:any)=>(acc[x.suggested_action]=(acc[x.suggested_action]||0)+1,acc),{}),records:manifestRecords};
 await writeFile(path.join(output,"fja-import-review-manifest.json"),JSON.stringify(manifest,null,2));
 // Read-only reconciliation ends here: canonical and inventory tables are never modified.
 console.log(JSON.stringify({mode:"read-only",run_id:runId,source_listings:listings.length,details:details.length,canonical_recruitments:recs.length,canonical_posts:posts.length,counts,output},null,2));
 await db.end();
}
main().catch(async e=>{console.error(e);await db.end({timeout:5});process.exit(1);});
