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
const RUN_MODE = process.env.FJA_RUN_MODE ?? "pilot";
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
  rawText?: string; rawHtml?: string; htmlSha256?: string; contentHash: string; firstSeenAt?: string; lastSeenAt?: string;
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
type FjaPostCandidate = {
  sourcePostKey: string; postNameRaw: string | null; sourcePostCodeRaw: string | null;
  vacancyCountRaw: string | null; vacancyCountCandidate: number | null;
  qualificationRaw: string | null; experienceRaw: string | null; ageLimitRaw: string | null;
  ageReferenceDateRaw: string | null; ageRelaxationRulesRaw: string | null; salaryRaw: string | null;
  payLevelRaw: string | null; employmentTypeRaw: string | null; tenureRaw: string | null;
  locationRaw: string | null; dutiesResponsibilitiesRaw: string | null; eligibilityConditionsRaw: string | null;
  milestonesRaw: Array<Record<string, unknown>>; applicationSelectionRaw: Array<Record<string, unknown>>;
  otherInfoRaw: Record<string, unknown>; sourceTableRowRaw: Record<string, unknown> | null;
  extractionStatus: "CANDIDATE_NEEDS_REVIEW" | "POST_DECOMPOSITION_NOT_EXTRACTED"; contentHash: string;
};

function extractPostCandidates(item: Listing): FjaPostCandidate[] {
  const details = item.details ?? {};
  const tableFields = (details.tableFields ?? {}) as Record<string, string>;
  const tables = Array.isArray(details.tables) ? details.tables as Array<Record<string, unknown>> : [];
  const explicitRows: Array<{name:string; fields:Record<string,string>; source:Record<string,unknown>}> = [];
  const titleHeader = /post name|name of post|post title|job title|designation|position/i;
  for (const table of tables) {
    const tableRows = Array.isArray(table.rows) ? table.rows as Array<Record<string,unknown>> : [];
    let headerIndex = -1;
    let headers: string[] = [];
    for (let i=0;i<tableRows.length;i++) {
      const rawCells = tableRows[i].cells;
      const cells: string[] = Array.isArray(rawCells) ? rawCells.map((v: unknown)=>String(v ?? "").trim()) : [];
      if (cells.some((cell)=>titleHeader.test(cell))) { headerIndex=i; headers=cells; break; }
    }
    if (headerIndex < 0) continue;
    for (const row of tableRows.slice(headerIndex+1)) {
      const rawCells = row.cells;
      const cells: string[] = Array.isArray(rawCells) ? rawCells.map((v: unknown)=>String(v ?? "").trim()) : [];
      const fields: Record<string,string> = {};
      headers.forEach((header,index)=>{ if(header && cells[index]) fields[header]=cells[index]; });
      const name = Object.entries(fields).find(([key,value])=>titleHeader.test(key) && value.trim())?.[1]?.trim();
      if (name && !/^(total|grand total|note|important)$/i.test(name)) {
        explicitRows.push({name,fields,source:{tableIndex:table.tableIndex,rowIndex:row.rowIndex,headers,cells}});
      }
    }
  }
  const get = (fields: Record<string,string>, patterns: RegExp[]) => {
    for (const [key,value] of Object.entries(fields)) {
      if (value?.trim() && patterns.some((pattern)=>pattern.test(key))) return value.trim();
    }
    return "";
  };
  const parseCount = (value: string) => {
    const match=value.replace(/,/g,"").trim().match(/^(\d+)$/);
    return match ? Number(match[1]) : null;
  };
  const rawPostNames = typeof details.postNames === "string" ? details.postNames : "";
  const uniqueExplicitRows = explicitRows.filter((row,index)=>explicitRows.findIndex((other)=>other.name===row.name)===index);
  let candidates = uniqueExplicitRows.map((row)=>({name:row.name,fields:row.fields,source:row.source}));
  if (!candidates.length && rawPostNames.trim()) {
    const names = rawPostNames.split(/\r?\n|\s*\|\s*|\s*;\s*/).map((name)=>name.trim().replace(/^[-•\s]+|[-•\s]+$/g,"")).filter(Boolean);
    candidates = names.map((name)=>({name,fields:{},source:null as unknown as Record<string,unknown>}));
  }
  if (!candidates.length) candidates = [{name:"",fields:{},source:null as unknown as Record<string,unknown>}];
  const multiCandidate = candidates.filter((candidate)=>candidate.name).length > 1;
  return candidates.map((candidate,index) => {
    const explicit = Boolean(candidate.source);
    const canUseArticleFields = !multiCandidate && Boolean(candidate.name) && !explicit;
    const fields = candidate.fields;
    const qualification = get(fields,[/qualification/i,/eligibility/i,/educational/i]) || (canUseArticleFields ? String(item.qualification ?? "") : "");
    const experience = get(fields,[/experience/i]);
    const age = get(fields,[/age limit/i,/age criteria/i]) || (canUseArticleFields ? String(details.ageLimit ?? "") : "");
    const salary = get(fields,[/salary/i,/pay scale/i,/pay level/i,/remuneration/i,/emolument/i]) || (canUseArticleFields ? String(details.salary ?? "") : "");
    const location = get(fields,[/location/i,/place of posting/i]) || (canUseArticleFields ? String(details.location ?? "") : "");
    const vacancyRaw = get(fields,[/vacanc/i,/no\.?\s*of post/i,/number of post/i,/number of position/i]) || (canUseArticleFields ? get(tableFields,[/vacanc/i,/no\.?\s*of post/i]) : "");
    const milestonesRaw = Object.entries(fields).filter(([key])=>/date|deadline|exam|interview|correction/i.test(key)).map(([field,value])=>({field,value}));
    const applicationSelectionRaw = Object.entries(fields).filter(([key])=>/fee|apply|application|selection|document|instruction/i.test(key)).map(([field,value])=>({field,value}));
    const otherInfoRaw: Record<string,unknown> = {
      articlePostNamesRaw: rawPostNames || null, articleTableFields: tableFields, explicitPostRow: candidate.source,
      genericArticleFieldsNotAssignedToPost: multiCandidate && !explicit ? {
        qualification:item.qualification ?? null, ageLimit:details.ageLimit ?? null,
        salary:details.salary ?? null, location:details.location ?? null
      } : {},
      scopeNote: explicit ? "Facts captured from a source table row with an explicit post-title column; still unverified."
        : multiCandidate ? "Post candidate inferred from a title list; generic article fields intentionally not copied across posts."
        : candidate.name ? "Single post candidate; article-level fields are candidates only and still require official verification."
        : "No post decomposition detected; preserve the parent article and review manually."
    };
    const core = {
      sourcePostKey:item.externalId + "-P" + String(index+1).padStart(2,"0"),
      postNameRaw:candidate.name || null,
      sourcePostCodeRaw:get(fields,[/post code/i,/serial no/i,/sl\.?\s*no/i,/post id/i]) || null,
      vacancyCountRaw:vacancyRaw || null, vacancyCountCandidate:parseCount(vacancyRaw),
      qualificationRaw:qualification || null, experienceRaw:experience || null, ageLimitRaw:age || null,
      ageReferenceDateRaw:get(fields,[/age as on/i,/age reckoning date/i]) || null,
      ageRelaxationRulesRaw:get(fields,[/age relaxation/i,/relaxation/i]) || null,
      salaryRaw:salary || null, payLevelRaw:get(fields,[/pay level/i,/pay scale/i,/grade pay/i]) || null,
      employmentTypeRaw:get(fields,[/employment type/i,/nature of appointment/i,/job type/i]) || null,
      tenureRaw:get(fields,[/duration/i,/tenure/i,/contract period/i]) || null,
      locationRaw:location || null,
      dutiesResponsibilitiesRaw:get(fields,[/job profile/i,/roles and responsibilities/i,/duties/i,/responsibilities/i]) || null,
      eligibilityConditionsRaw:get(fields,[/eligibility criteria/i,/other conditions/i,/minimum requirements/i]) || null,
      milestonesRaw, applicationSelectionRaw, otherInfoRaw, sourceTableRowRaw:candidate.source ?? null,
      extractionStatus:(candidate.name ? "CANDIDATE_NEEDS_REVIEW" : "POST_DECOMPOSITION_NOT_EXTRACTED") as FjaPostCandidate["extractionStatus"]
    };
    return {...core,contentHash:sha(JSON.stringify(core))};
  });
}

function detailFields(html: string, listing: {url:string; title:string; externalId:string}): Listing {
  const $ = cheerio.load(html);
  const rows: Record<string,string> = {};
  const tables: Array<{tableIndex:number; caption:string; rows:Array<{rowIndex:number; cells:string[]}>}> = [];
  $("table").each((tableIndex, table) => {
    const tableRows: Array<{rowIndex:number; cells:string[]}> = [];
    $(table).find("tr").each((rowIndex, row) => {
      const cells = $(row).find("th,td").map((__, cell) => collapse($(cell).text())).get();
      if (cells.some(Boolean)) tableRows.push({rowIndex, cells});
      if (cells.length >= 2 && cells[0]) {
        const label = cells[0].replace(/[:\s]+$/,"").toLowerCase();
        rows[label] = [rows[label], cells.slice(1).filter(Boolean).join(" | ")].filter(Boolean).join("\n");
      }
    });
    tables.push({tableIndex, caption:collapse($(table).find("caption").first().text()), rows:tableRows});
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
  const allLinks: Array<{label:string;url:string;rel?:string;title?:string}> = [];
  const seenLinks = new Set<string>();
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    if (!href) return;
    try {
      const url = new URL(href, listing.url);
      if (!["http:","https:"].includes(url.protocol)) return;
      const normalizedUrl = url.toString();
      const label = collapse($(a).text());
      const key = normalizedUrl + "\n" + label;
      if (seenLinks.has(key)) return;
      seenLinks.add(key);
      allLinks.push({label, url:normalizedUrl, rel:$(a).attr("rel"), title:$(a).attr("title")});
    } catch {}
  });
  const headings = $("h1,h2,h3,h4,h5,h6").map((_, el) => ({
    level: Number((el.tagName || "").slice(1)) || null,
    text: collapse($(el).text())
  })).get().filter((item) => item.text);
  const lists: Array<{listType:string;items:string[]}> = [];
  $("ul,ol").each((_, list) => {
    const items = $(list).children("li").map((__, li) => collapse($(li).text())).get().filter(Boolean);
    if (items.length) lists.push({listType:(list.tagName || "").toLowerCase(),items});
  });
  const postNames = find(/^name of post$|^post name$|post name\(s\)/i);
  const ageLimit = find(/age limit|age criteria/i);
  const applicationFee = find(/application fee|exam fee/i);
  const selectionProcess = find(/selection process|selection procedure/i);
  const salary = find(/salary|pay scale|pay level|remuneration|emolument/i);
  const location = find(/job location|place of posting|location/i);
  const officialLinks = allLinks.filter((link) => /official|notification|advertisement|apply|registration|application|download|pdf/i.test(link.label));
  const mappedFieldPattern = /recruiting body|organization|department|advertisement|notification|published|updated|application start|start date|starting date|last date|closing date|application end|total vacan|total post|number of vacan|no\.? of post|qualification|eligibility|educational|application fee|exam fee|selection process|selection procedure|salary|pay scale|pay level|remuneration|job location|place of posting|location|name of post|post name|age limit|age criteria|experience|how to apply|application mode|employment type|tenure|duration/i;
  const otherInfoRaw = {
    unmappedTableFields: Object.fromEntries(Object.entries(rows).filter(([label]) => !mappedFieldPattern.test(label))),
    additionalHeadings: headings,
    listContent: lists,
    preservationNote: "Unmapped source fields and page structure are retained as raw evidence; no AI rewrite or official verification is performed during extraction.",
  };
  const details: Record<string, unknown> = {
    tableFields: rows, tables, headings, lists, allLinks, officialLinks,
    postNames, ageLimit, applicationFee, selectionProcess, salary, location, otherInfoRaw,
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
  const htmlSha256 = sha(html);
  const hashInput = JSON.stringify({htmlSha256,title,rows,tables,headings,lists,allLinks,details,rawText:text});
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
    sourceStatus:status, details, rawText:text, rawHtml:html, htmlSha256, contentHash:sha(hashInput),
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
  if (RUN_MODE === "pilot" && PILOT_URLS.length === 0) throw new Error("Pilot mode requires FJA_PILOT_URLS; refusing to fall back to broad crawl.");
  if (RUN_MODE !== "pilot" && RUN_MODE !== "full") throw new Error(`Unsupported FJA_RUN_MODE: ${RUN_MODE}`);
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
      const htmlSha256 = parsed.htmlSha256 ?? sha(html);
      const rawHtmlContent = parsed.rawHtml ?? html;
      const rawCaptureRelativePath = path.posix.join("raw-html", parsed.externalId, htmlSha256 + ".html");
      const rawCapturePath = path.join(OUT, "raw-html", parsed.externalId, htmlSha256 + ".html");
      await mkdir(path.dirname(rawCapturePath), {recursive:true});
      await writeFile(rawCapturePath, rawHtmlContent, "utf8");
      parsed.details.sourceCapture = {
        artifactPath: rawCaptureRelativePath,
        htmlSha256,
        byteLength: Buffer.byteLength(rawHtmlContent, "utf8"),
        capturedAt: new Date().toISOString(),
        normalizedTextSha256: sha(parsed.rawText ?? ""),
      };
      delete parsed.rawHtml;
      await sleep(300);
      if (!parsed.listingCategory) { nonRecruitmentPagesSkipped++; return null; }
      const [inventoryRow] = await db`
        INSERT INTO public.fja_job_inventory
          (source_slug,external_id,source_url,title,organization_name,listing_category,published_date,application_start_date,application_end_date,advertisement_number,qualification,vacancy_count,detail_status,source_status,details,other_info_raw,raw_text,content_hash,last_crawl_run_id,first_seen_at,last_seen_at,updated_at)
        VALUES
          ('freejobalert',${parsed.externalId},${parsed.sourceUrl},${parsed.title},${parsed.organizationName ?? null},${parsed.listingCategory ?? null},${parsed.publishedDate ?? null},${parsed.applicationStartDate ?? null},${parsed.applicationEndDate ?? null},${parsed.advertisementNumber ?? null},${parsed.qualification ?? null},${parsed.vacancyCount ?? null},${parsed.detailStatus},${parsed.sourceStatus},${db.json(parsed.details as never)},${db.json((parsed.details.otherInfoRaw ?? {}) as never)},${parsed.rawText ?? null},${parsed.contentHash},${RUN_ID},now(),now(),now())
        ON CONFLICT (source_slug,external_id) DO UPDATE SET
          source_url=excluded.source_url,title=excluded.title,organization_name=excluded.organization_name,
          listing_category=excluded.listing_category,published_date=excluded.published_date,
          application_start_date=excluded.application_start_date,application_end_date=excluded.application_end_date,
          advertisement_number=excluded.advertisement_number,qualification=excluded.qualification,
          vacancy_count=excluded.vacancy_count,detail_status=excluded.detail_status,source_status=excluded.source_status,
          details=excluded.details,other_info_raw=excluded.other_info_raw,raw_text=excluded.raw_text,content_hash=excluded.content_hash,
          last_crawl_run_id=excluded.last_crawl_run_id,last_seen_at=now(),updated_at=now()
        RETURNING id
      `;
      await db`
        INSERT INTO public.fja_source_captures
          (recruitment_inventory_id,source_slug,external_id,source_url,html_sha256,normalized_text_sha256,raw_html,run_id,captured_at)
        VALUES
          (${inventoryRow.id},'freejobalert',${parsed.externalId},${parsed.sourceUrl},${htmlSha256},
           ${sha(parsed.rawText ?? "")},${rawHtmlContent},${RUN_ID},now())
        ON CONFLICT (source_slug,external_id,html_sha256) DO NOTHING
      `;
      const postCandidates = extractPostCandidates(parsed);
      for (const candidate of postCandidates) {
        await db`
          INSERT INTO public.fja_post_inventory
            (recruitment_inventory_id,source_slug,external_id,source_post_key,post_name_raw,post_name_normalized_candidate,
             source_post_code_raw,vacancy_count_raw,vacancy_count_candidate,qualification_raw,experience_raw,age_limit_raw,
             age_reference_date_raw,age_relaxation_rules_raw,salary_raw,pay_level_raw,employment_type_raw,tenure_raw,
             location_raw,duties_responsibilities_raw,eligibility_conditions_raw,milestones_raw,application_selection_raw,
             other_info_raw,source_table_row_raw,extraction_status,official_verification_status,content_hash,last_crawl_run_id,
             first_seen_at,last_seen_at,updated_at)
          VALUES
            (${inventoryRow.id},'freejobalert',${parsed.externalId},${candidate.sourcePostKey},${candidate.postNameRaw},
             NULL,${candidate.sourcePostCodeRaw},${candidate.vacancyCountRaw},${candidate.vacancyCountCandidate},
             ${candidate.qualificationRaw},${candidate.experienceRaw},${candidate.ageLimitRaw},${candidate.ageReferenceDateRaw},
             ${candidate.ageRelaxationRulesRaw},${candidate.salaryRaw},${candidate.payLevelRaw},${candidate.employmentTypeRaw},
             ${candidate.tenureRaw},${candidate.locationRaw},${candidate.dutiesResponsibilitiesRaw},${candidate.eligibilityConditionsRaw},
             ${db.json(candidate.milestonesRaw as never)},${db.json(candidate.applicationSelectionRaw as never)},${db.json(candidate.otherInfoRaw as never)},
             ${candidate.sourceTableRowRaw ? db.json(candidate.sourceTableRowRaw as never) : null},${candidate.extractionStatus},'PENDING',
             ${candidate.contentHash},${RUN_ID},now(),now(),now())
          ON CONFLICT (source_slug,external_id,source_post_key) DO UPDATE SET
            recruitment_inventory_id=excluded.recruitment_inventory_id,
            post_name_raw=excluded.post_name_raw,source_post_code_raw=excluded.source_post_code_raw,
            vacancy_count_raw=excluded.vacancy_count_raw,vacancy_count_candidate=excluded.vacancy_count_candidate,
            qualification_raw=excluded.qualification_raw,experience_raw=excluded.experience_raw,age_limit_raw=excluded.age_limit_raw,
            age_reference_date_raw=excluded.age_reference_date_raw,age_relaxation_rules_raw=excluded.age_relaxation_rules_raw,
            salary_raw=excluded.salary_raw,pay_level_raw=excluded.pay_level_raw,employment_type_raw=excluded.employment_type_raw,
            tenure_raw=excluded.tenure_raw,location_raw=excluded.location_raw,duties_responsibilities_raw=excluded.duties_responsibilities_raw,
            eligibility_conditions_raw=excluded.eligibility_conditions_raw,milestones_raw=excluded.milestones_raw,
            application_selection_raw=excluded.application_selection_raw,other_info_raw=excluded.other_info_raw,
            source_table_row_raw=excluded.source_table_row_raw,extraction_status=excluded.extraction_status,
            official_verification_status=CASE WHEN public.fja_post_inventory.content_hash IS DISTINCT FROM excluded.content_hash
              THEN 'NEEDS_REVIEW' ELSE public.fja_post_inventory.official_verification_status END,
            content_hash=excluded.content_hash,last_crawl_run_id=excluded.last_crawl_run_id,last_seen_at=now(),updated_at=now()
        `;
      }
      await db`
        INSERT INTO public.source_observations
          (source, external_id, source_url, observed_at, content_hash, facts, links, raw, run_id, outcome, outcome_reason)
        VALUES
          ('freejobalert', ${parsed.externalId}, ${parsed.sourceUrl}, now(), ${parsed.contentHash},
           ${db.json({title:parsed.title, organizationName:parsed.organizationName, publishedDate:parsed.publishedDate, applicationStartDate:parsed.applicationStartDate, applicationEndDate:parsed.applicationEndDate, advertisementNumber:parsed.advertisementNumber, qualification:parsed.qualification, vacancyCount:parsed.vacancyCount, detailStatus:parsed.detailStatus, sourceStatus:parsed.sourceStatus})},
           ${db.json((parsed.details.officialLinks ?? []) as never)}, ${db.json({details:parsed.details, rawText:parsed.rawText} as never)},
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
        VALUES ('freejobalert',${failed.externalId},${failed.sourceUrl},${failed.title},'FAILED','UNKNOWN',${db.json(failed.details as never)},${failed.contentHash},${RUN_ID})
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
