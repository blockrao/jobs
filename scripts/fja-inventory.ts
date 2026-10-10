import axios from "axios";
import * as cheerio from "cheerio";
import postgres from "postgres";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://www.freejobalert.com";
const ARTICLE_RE = /\/articles\/[a-z0-9-]+-(\d{4,})\/?$/i;
const RUN_ID = `fja-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT = process.env.FJA_OUT_DIR ?? "artifacts/fja";
const MAX_PAGES = Number(process.env.FJA_MAX_PAGES ?? 1200);
const CONCURRENCY = Number(process.env.FJA_CONCURRENCY ?? 4);
const PILOT_URLS = (process.env.FJA_PILOT_URLS ?? "").split(",").map((url) => url.trim()).filter(Boolean);
const USER_AGENT = "JobOye-FJA-Inventory/1.0 (+https://joboye.com; inventory contact)";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const collapse = (value: string) => value.replace(/\s+/g, " ").trim();
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

type Listing = {
  externalId: string; sourceUrl: string; title: string; organizationName?: string;
  listingCategory?: string; publishedDate?: string; applicationStartDate?: string;
  applicationEndDate?: string; advertisementNumber?: string; qualification?: string;
  vacancyCount?: number; detailStatus: "EXTRACTED" | "PARTIAL" | "FAILED";
  sourceStatus: "OPEN" | "CLOSED" | "UNKNOWN"; details: Record<string, unknown>;
  rawText?: string; contentHash: string; firstSeenAt?: string; lastSeenAt?: string;
};

async function getHtml(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    timeout: 30000, maxRedirects: 5, responseType: "text",
    headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-IN,en;q=0.9" },
    validateStatus: (status) => status >= 200 && status < 400,
  });
  if (/captcha|access denied|your request was blocked|attention required/i.test(response.data.slice(0, 5000))) {
    throw new Error("Source returned a block/challenge page");
  }
  return response.data;
}
function normalizeUrl(href: string, base: string): URL | undefined {
  try {
    const url = new URL(href, base);
    if (url.hostname.replace(/^www\./, "") !== "freejobalert.com") return;
    url.hash = ""; url.search = "";
    if (!ARTICLE_RE.test(url.pathname)) return;
    url.pathname = url.pathname.replace(/\/$/, "");
    return url;
  } catch { return; }
}
function articleLinks(html: string, base: string): Array<{url:string; title:string; externalId:string}> {
  const $ = cheerio.load(html);
  const links = new Map<string, {url:string; title:string; externalId:string}>();
  $("a[href*='/articles/']").each((_, el) => {
    const href = $(el).attr("href");
    const title = collapse($(el).text());
    if (!href || title.length < 8) return;
    const url = normalizeUrl(href, base);
    const match = url?.pathname.match(ARTICLE_RE);
    if (!url || !match) return;
    if (!links.has(match[1])) links.set(match[1], {url:url.toString(), title, externalId:match[1]});
  });
  return [...links.values()];
}
function parseDate(text: string): string | undefined {
  const m = text.match(/\b(\d{1,2})[\s./-]+([A-Za-z]{3,9}|\d{1,2})[\s,./-]+(20\d{2})\b/);
  if (!m) return;
  const months: Record<string,string> = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
  const month = /^\d+$/.test(m[2]) ? m[2].padStart(2,"0") : months[m[2].slice(0,3).toLowerCase()];
  if (!month || Number(month)<1 || Number(month)>12) return;
  return `${m[3]}-${month}-${m[1].padStart(2,"0")}`;
}
function classifyListing(title: string, text: string, rows: Record<string,string>): string | undefined {
  const t = title.toLowerCase();
  if (/\b(result|admit card|answer key|syllabus|cut.?off|merit list|exam date|exam city|hall ticket)\b/i.test(t) &&
      !/\b(recruitment|vacancy|apply online|application form)\b/i.test(t)) return;
  const rowLabels = Object.keys(rows).join(" ").toLowerCase();
  const structuredRecruitmentEvidence = /recruiting body|total vacan|no\.? of post|application start|last date|educational qualification|eligibility criteria/.test(rowLabels);
  const titleRecruitmentEvidence = /\b(recruitment|vacanc(?:y|ies)|jobs?|notification|apprentice|hiring|walk.?in|engagement|apply online|career|officer|assistant|engineer|teacher|constable|clerk|driver|nurse|technician|professor|manager|fellow|staff|worker|operator|accountant|stenographer|inspector|group [abc])\b/i.test(title);
  const bodyRecruitmentEvidence = /recruiting body|total vacancies|number of posts|application start date|educational qualification/i.test(text.slice(0, 18000));
  if (structuredRecruitmentEvidence || titleRecruitmentEvidence || bodyRecruitmentEvidence) return "Recruitment";
  return;
}
function detailFields(html: string, listing: {url:string; title:string; externalId:string}): Listing {
  const $ = cheerio.load(html);
  const rows: Record<string,string> = {};
  $("tr").each((_, row) => {
    const cells = $(row).find("th,td").map((__, cell) => collapse($(cell).text())).get().filter(Boolean);
    if (cells.length >= 2) rows[cells[0].replace(/[:\s]+$/,"").toLowerCase()] = cells.slice(1).join(" | ");
  });
  const text = collapse($("body").text());
  const find = (...patterns: RegExp[]) => {
    for (const [key,value] of Object.entries(rows)) if (patterns.some((pattern) => pattern.test(key)) && value) return value;
    return undefined;
  };
  const title = collapse($("h1").first().text()) || listing.title;
  const listingCategory = classifyListing(title, text, rows);
  const publishedRaw = find(/notification date|post date|published|updated date/i);
  const startRaw = find(/application start|start date|starting date/i);
  const endRaw = find(/last date|closing date|application end|last date to apply/i);
  const vacancyRaw = find(/total vacancy|total post|number of vacancy|no\.? of post/i);
  const vacancyMatch = vacancyRaw?.replace(/,/g,"").match(/\d{1,6}/);
  const bodyLinks: Array<{label:string;url:string}> = [];
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    if (!href) return;
    try {
      const url = new URL(href, listing.url);
      if (url.protocol === "https:" && !/freejobalert\.com$/i.test(url.hostname)) bodyLinks.push({label:collapse($(a).text()),url:url.toString()});
    } catch {}
  });
  const details = {
    tableFields: rows,
    postNames: find(/^name of post$|^post name$|post name\(s\)/i),
    ageLimit: find(/age limit|age criteria/i),
    applicationFee: find(/application fee|exam fee/i),
    selectionProcess: find(/selection process|selection procedure/i),
    salary: find(/salary|pay scale|pay level|remuneration/i),
    location: find(/job location|place of posting|location/i),
    officialLinks: bodyLinks.filter((link) => /official|notification|advertisement|apply|registration/i.test(link.label)).slice(0,30),
  };
  const parsedEndDate = endRaw ? parseDate(endRaw) : undefined;
  const today = new Date().toISOString().slice(0, 10);
  const explicitClosed = /application closed|last date.*over|no longer accepting/i.test(text);
  const status = explicitClosed || (parsedEndDate && parsedEndDate < today)
    ? "CLOSED"
    : parsedEndDate && parsedEndDate >= today && /apply online|application form/i.test(text)
      ? "OPEN"
      : "UNKNOWN";
  const importantFields = [find(/recruiting body|organization|department/i), vacancyRaw, endRaw, find(/qualification|eligibility|educational/i)];
  const populated = importantFields.filter(Boolean).length;
  const hashInput = JSON.stringify({title,rows,details,rawText:text});
  return {
    externalId:listing.externalId, sourceUrl:listing.url, title,
    organizationName:find(/recruiting body|organization|department/i),
    listingCategory,
    publishedDate:publishedRaw ? parseDate(publishedRaw) : undefined,
    applicationStartDate:startRaw ? parseDate(startRaw) : undefined,
    applicationEndDate:endRaw ? parseDate(endRaw) : undefined,
    advertisementNumber:find(/advertisement number|notification number|advertisement no|notification no/i),
    qualification:find(/qualification|eligibility|educational qualification/i),
    vacancyCount:vacancyMatch ? Number(vacancyMatch[0]) : undefined,
    detailStatus:populated >= 3 ? "EXTRACTED" : populated > 0 ? "PARTIAL" : "FAILED",
    sourceStatus:status, details, rawText:text, contentHash:sha(hashInput),
  };
}
async function pool<T,R>(items:T[], limit:number, fn:(item:T)=>Promise<R>):Promise<R[]> {
  const output = new Array<R>(items.length); let cursor=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)}, async()=>{
    while(true){const i=cursor++; if(i>=items.length)return; output[i]=await fn(items[i]);}
  }));
  return output;
}
async function crawlSitemaps(): Promise<string[]> {
  const queue = [`${BASE}/sitemap.xml`, `${BASE}/sitemap_index.xml`];
  const seenSitemaps = new Set<string>(); const articleUrls = new Set<string>();
  while(queue.length && seenSitemaps.size < 100) {
    const sitemap = queue.shift()!;
    if(seenSitemaps.has(sitemap)) continue; seenSitemaps.add(sitemap);
    try {
      const response = await axios.get<string>(sitemap,{timeout:20000,headers:{"User-Agent":USER_AGENT}});
      const $ = cheerio.load(response.data,{xmlMode:true});
      const locs = $("loc").map((_,el)=>collapse($(el).text())).get();
      for(const loc of locs) {
        if(/\.xml(?:\.gz)?(?:\?|$)/i.test(loc) && !seenSitemaps.has(loc)) queue.push(loc);
        else {
          const normalized = normalizeUrl(loc, BASE);
          if(normalized) articleUrls.add(normalized.toString());
        }
      }
    } catch(error) { console.warn(`Sitemap unavailable: ${sitemap}: ${(error as Error).message}`); }
    await sleep(300);
  }
  return [...articleUrls];
}
async function main() {
  if(!process.env.DATABASE_URL) throw new Error("DATABASE_URL secret is required; refusing to run without database destination.");
  const db = postgres(process.env.DATABASE_URL,{max:4,ssl:"require",connect_timeout:20});
  const startedAt = new Date().toISOString();
  const listingPages = [`${BASE}/`,`${BASE}/latest-notifications/`,`${BASE}/government-jobs/`];
  const listings = new Map<string,{url:string;title:string;externalId:string}>();
  const pageQueue = [...listingPages]; const visitedPages = new Set<string>();
  let sitemapUrls: string[] = [];
  if (PILOT_URLS.length > 0) {
    // Pilot mode deliberately bypasses broad discovery and processes only the supplied article URLs.
    for (const suppliedUrl of PILOT_URLS) {
      const normalized = normalizeUrl(suppliedUrl, BASE);
      const id = normalized?.pathname.match(ARTICLE_RE)?.[1];
      if (!normalized || !id) throw new Error(`Invalid FJA pilot article URL: ${suppliedUrl}`);
      listings.set(id, { url: normalized.toString(), title: "", externalId: id });
    }
  } else {
    while(pageQueue.length && visitedPages.size < MAX_PAGES) {
      const url = pageQueue.shift()!;
      if(visitedPages.has(url)) continue; visitedPages.add(url);
      try {
        const html = await getHtml(url);
        for(const item of articleLinks(html,url)) if(!listings.has(item.externalId)) listings.set(item.externalId,item);
        const $ = cheerio.load(html);
        $("a[href]").each((_,a)=>{
          const href=$(a).attr("href"); if(!href)return;
          try {
            const next=new URL(href,url);
            if(next.hostname.replace(/^www\./,"")!=="freejobalert.com")return;
            if(/\/articles\//i.test(next.pathname))return;
            const isPagination=/page|older|next|load-more|latest-notifications|government-jobs|category|jobs/i.test((collapse($(a).text())+" "+next.pathname));
            if(isPagination && (next.pathname!=="/" || next.search) && !visitedPages.has(next.toString()) && pageQueue.length<MAX_PAGES) pageQueue.push(next.toString());
          } catch {}
        });
      } catch(error) { console.error(`Listing page failed: ${url}: ${(error as Error).message}`); }
      await sleep(350);
    }
    // Sitemap is a discovery supplement, not a replacement for live listing pages.
    sitemapUrls = await crawlSitemaps();
    for(const url of sitemapUrls) {
      const id=url.match(ARTICLE_RE)?.[1];
      if(id && !listings.has(id)) listings.set(id,{url,title:"",externalId:id});
    }
  }
  const allItems=[...listings.values()];
  console.log(JSON.stringify({runId:RUN_ID,listingPagesVisited:visitedPages.size,listingPageQueueRemaining:pageQueue.length,sitemapArticleUrls:sitemapUrls.length,uniqueArticles:allItems.length}));
  if(allItems.length===0) throw new Error("No FJA article URLs found; refusing to report an empty successful inventory.");
  const failedDetailUrls: string[] = [];
  let nonRecruitmentPagesSkipped = 0;
  const resultsWithNulls = await pool(allItems,CONCURRENCY,async(item):Promise<Listing | null>=>{
    try {
      const html=await getHtml(item.url);
      const parsed=detailFields(html,item);
      await sleep(300);
      if (!parsed.listingCategory) { nonRecruitmentPagesSkipped++; return null; }
      await db`
        INSERT INTO public.fja_job_inventory
          (source_slug,external_id,source_url,title,organization_name,listing_category,published_date,application_start_date,application_end_date,advertisement_number,qualification,vacancy_count,detail_status,source_status,details,raw_text,content_hash,last_crawl_run_id,first_seen_at,last_seen_at,updated_at)
        VALUES
          ('freejobalert',${parsed.externalId},${parsed.sourceUrl},${parsed.title},${parsed.organizationName ?? null},${parsed.listingCategory ?? null},${parsed.publishedDate ?? null},${parsed.applicationStartDate ?? null},${parsed.applicationEndDate ?? null},${parsed.advertisementNumber ?? null},${parsed.qualification ?? null},${parsed.vacancyCount ?? null},${parsed.detailStatus},${parsed.sourceStatus},${db.json(parsed.details)},${parsed.rawText ?? null},${parsed.contentHash},${RUN_ID},now(),now(),now())
        ON CONFLICT (source_slug,external_id) DO UPDATE SET
          source_url=excluded.source_url,title=excluded.title,organization_name=excluded.organization_name,
          listing_category=excluded.listing_category,published_date=excluded.published_date,
          application_start_date=excluded.application_start_date,application_end_date=excluded.application_end_date,
          advertisement_number=excluded.advertisement_number,qualification=excluded.qualification,
          vacancy_count=excluded.vacancy_count,detail_status=excluded.detail_status,source_status=excluded.source_status,
          details=excluded.details,raw_text=excluded.raw_text,content_hash=excluded.content_hash,
          last_crawl_run_id=excluded.last_crawl_run_id,last_seen_at=now(),updated_at=now()
      `;
      await db`
        INSERT INTO public.source_observations
          (source, external_id, source_url, observed_at, content_hash, facts, links, raw, run_id, outcome, outcome_reason)
        VALUES
          ('freejobalert', ${parsed.externalId}, ${parsed.sourceUrl}, now(), ${parsed.contentHash},
           ${db.json({title:parsed.title, organizationName:parsed.organizationName, publishedDate:parsed.publishedDate, applicationStartDate:parsed.applicationStartDate, applicationEndDate:parsed.applicationEndDate, advertisementNumber:parsed.advertisementNumber, qualification:parsed.qualification, vacancyCount:parsed.vacancyCount, detailStatus:parsed.detailStatus, sourceStatus:parsed.sourceStatus})},
           ${db.json(parsed.details.officialLinks ?? [])}, ${db.json({details:parsed.details, rawText:parsed.rawText})},
           ${RUN_ID}, ${parsed.detailStatus === "EXTRACTED" ? "RECEIVED" : "SKIPPED"}, ${parsed.detailStatus === "EXTRACTED" ? null : "Detail extraction incomplete"})
        ON CONFLICT (source, external_id, content_hash) DO NOTHING
      `;
      return parsed;
    } catch(error) {
      console.error(`Detail failed: ${item.url}: ${(error as Error).message}`);
      failedDetailUrls.push(item.url);
      if (!classifyListing(item.title, "", {})) { nonRecruitmentPagesSkipped++; return null; }
      const failed:Listing={externalId:item.externalId,sourceUrl:item.url,title:item.title || `FJA article ${item.externalId}`,detailStatus:"FAILED",sourceStatus:"UNKNOWN",details:{extractionError:(error as Error).message},contentHash:sha(item.url+RUN_ID)};
      await db`
        INSERT INTO public.fja_job_inventory (source_slug,external_id,source_url,title,detail_status,source_status,details,content_hash,last_crawl_run_id)
        VALUES ('freejobalert',${failed.externalId},${failed.sourceUrl},${failed.title},'FAILED','UNKNOWN',${db.json(failed.details)},${failed.contentHash},${RUN_ID})
        ON CONFLICT (source_slug,external_id) DO UPDATE SET detail_status='FAILED',details=excluded.details,last_crawl_run_id=excluded.last_crawl_run_id,last_seen_at=now(),updated_at=now()
      `;
      return failed;
    }
  });
  const results = resultsWithNulls.filter((item): item is Listing => item !== null);
  await mkdir(OUT,{recursive:true});
  await writeFile(path.join(OUT,"fja-inventory.json"),JSON.stringify({runId:RUN_ID,startedAt,finishedAt:new Date().toISOString(),listingPagesVisited:visitedPages.size,listingPageQueueRemaining:pageQueue.length,sitemapArticleUrls:sitemapUrls.length,discoveredArticleUrls:allItems.length,nonRecruitmentPagesSkipped,failedDetailUrls,results},null,2));
  const summary=await db`select count(*)::int as total, count(*) filter (where detail_status='EXTRACTED')::int as extracted, count(*) filter (where detail_status='PARTIAL')::int as partial, count(*) filter (where detail_status='FAILED')::int as failed from public.fja_job_inventory where source_slug='freejobalert'`;
  console.log(JSON.stringify({runId:RUN_ID,processed:results.length,summary:summary[0],out:OUT}));
  await db.end();
}
main().catch(error=>{console.error(error);process.exit(1);});
