import axios from "axios";
import * as cheerio from "cheerio";
import postgres from "postgres";
import { parseFreeJobAlertArticle } from "@/enrich/freejobalert-article";
import { normalizeAge, normalizeSalary } from "./fja-normalize";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://www.freejobalert.com";
const ARTICLE_RE = /\/articles\/[a-z0-9-]+-(\d{4,})\/?$/i;
const RUN_ID = `fja-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT = process.env.FJA_OUT_DIR ?? "artifacts/fja";
const MAX_PAGES = Number(process.env.FJA_MAX_PAGES ?? 1200);
const CONCURRENCY = Number(process.env.FJA_CONCURRENCY ?? 4);
const RUN_MODE = process.env.FJA_RUN_MODE ?? "pilot";
const PILOT_URLS = (process.env.FJA_PILOT_URLS ?? "").split(",").map((url) => url.trim()).filter(Boolean);
const PILOT_URLS_FILE = (process.env.FJA_PILOT_URLS_FILE ?? "").trim();
const QUEUE_FILE = (process.env.FJA_QUEUE_FILE ?? "").trim();
const QUEUE_OFFSET = Math.max(0, Number(process.env.FJA_QUEUE_OFFSET ?? 0));
const QUEUE_LIMIT = Math.max(1, Math.min(30, Number(process.env.FJA_QUEUE_LIMIT ?? 20)));
// window mode: every recruitment the source listed or updated on/after FJA_START_DATE that is still open.
const START_DATE = (process.env.FJA_START_DATE ?? "").trim();
const MAX_LIST_PAGES = Number(process.env.FJA_MAX_LIST_PAGES ?? 150);
// Dry run: fetch, parse and write the artifacts, but open no database connection and write no rows.
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.FJA_DRY_RUN ?? "");
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
  /** Best official notification/PDF URL found during extraction. Null when none found. */
  officialNotificationUrl?: string | null;
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
const DATE_RE = /\b(\d{1,2})[\s./-]+([A-Za-z]{3,9}|\d{1,2})[\s,./-]+(20\d{2})\b/g;
const MONTHS: Record<string,string> = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
/** Every date written in the text, in reading order, as ISO yyyy-mm-dd. */
function parseDates(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(DATE_RE)) {
    const month = /^\d+$/.test(m[2]) ? m[2].padStart(2,"0") : MONTHS[m[2].slice(0,3).toLowerCase()];
    if (!month || Number(month)<1 || Number(month)>12 || Number(m[1])<1 || Number(m[1])>31) continue;
    out.push(`${m[3]}-${month}-${m[1].padStart(2,"0")}`);
  }
  return out;
}
function parseDate(text: string): string | undefined {
  return parseDates(text)[0];
}
/**
 * Closing date of an application window. The source writes these cells as a single date, as a
 * range ("01.10.2026 to 17.10.2026") or as an extension ("24.09.2026 16.10.2026 (Extended)").
 * A single date is taken as written; for a range or an extension the latest date is the closing date.
 */
function parseEndDate(text: string): string | undefined {
  const dates = parseDates(text);
  if (dates.length <= 1) return dates[0];
  return /\bto\b|\bextend|[–—]/i.test(text) ? [...dates].sort().at(-1) : dates[0];
}
/** Opening date of an application window: the earliest date of a range, otherwise the date as written. */
function parseStartDate(text: string): string | undefined {
  const dates = parseDates(text);
  if (dates.length <= 1) return dates[0];
  return /\bto\b|[–—]/i.test(text) ? [...dates].sort()[0] : dates[0];
}
/** Placeholder cell text that states the absence of a fact; never stored as the fact itself. */
const isNonFact = (value: string) => /^(?:not (?:mentioned|specified|stated|available|applicable|notified|disclosed)\b.*|n\.?\/?a\.?|[-–—]+)$/i.test(value.trim());

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

type RawTableRow = {rowIndex:number; cells:string[]};
type RawTable = {tableIndex:number; caption:string; heading:string|null; rows:RawTableRow[]};
type RawList = {listType:string; heading:string|null; items:string[]};

/**
 * Column header that names the post in a post-wise table ("Post", "Post Name", "Name & Number of Post",
 * "Vacancy Position / Name of Post", "Post / Department"). Anchored on purpose: "Post Code", "Total Posts",
 * "Position Categories" and "Posts" (a count column) are not post-title columns.
 */
const POST_TITLE_HEADER_RE = /^(?:post|position|designation|job title|post title|post names?|names? of (?:the )?posts?|name (?:&|and) (?:number|no\.?) of (?:the )?posts?|vacancy position ?\/ ?name of (?:the )?posts?|post ?\/ ?[a-z ]{2,30})$/i;
/** Row labels of a key/value overview table. A "post name" that reads like one of these means the table is not post-wise. */
const KEY_VALUE_LABEL_RE = /^(?:total (?:vacanc\w*|posts?)|vacanc(?:y|ies)|no\.? of (?:posts?|vacanc\w*)|number of [a-z ]+|salary|pay(?: scale)?|stipend|qualification|age limit|last date.*|apply mode|application mode|application (?:start|last|end) date|application dates?|application fee|job location|job type|official websites?|notification date|selection (?:process|basis)|organi[sz]ation|company name|advertisement (?:no\.?|number)|engagement basis)$/i;
const normalizeHeader = (value: string) => collapse(value.replace(/\(s\)/gi, "").replace(/[:*]+$/g, "")).toLowerCase();

/**
 * Layout of a post-wise table, or null when the table is something else (key/value overview, dates,
 * fees, state-wise seats...). The header must be the first row that has two or more cells: a row label
 * such as "Post Name(s)" further down a Particulars/Details table is a label, not a column header.
 */
function postTableLayout(rows: RawTableRow[]): {headerPosition:number; headers:string[]; titleIndex:number} | null {
  const headerPosition = rows.findIndex((row) => row.cells.filter(Boolean).length >= 2);
  if (headerPosition < 0) return null;
  const headers = rows[headerPosition].cells.map((cell) => cell.trim());
  const titleIndex = headers.findIndex((header) => POST_TITLE_HEADER_RE.test(normalizeHeader(header)));
  if (titleIndex < 0) return null;
  const names = rows.slice(headerPosition + 1).map((row) => (row.cells[titleIndex] ?? "").trim()).filter(Boolean);
  if (!names.length || names.some((name) => KEY_VALUE_LABEL_RE.test(normalizeHeader(name)))) return null;
  return {headerPosition, headers, titleIndex};
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

/** Name comparison key: case, punctuation and a trailing "(05)" seat count do not distinguish two posts. */
const postMatchKey = (name: string) => name.toLowerCase().replace(/\(\s*\d{1,5}\s*\)\s*$/, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const isTokenPrefix = (shorter: string, longer: string) => shorter.length > 0 && shorter !== longer && longer.startsWith(shorter + " ");
const slugify = (value: string) => value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96).replace(/-+$/g, "");

export function extractPostCandidates(item: Listing): FjaPostCandidate[] {
  const details = item.details ?? {};
  const tableFields = (details.tableFields ?? {}) as Record<string, string>;
  const tables = Array.isArray(details.tables) ? details.tables as RawTable[] : [];
  const lists = Array.isArray(details.lists) ? details.lists as RawList[] : [];
  type SourceRow = {tableIndex:number; rowIndex:number; headers:string[]; cells:string[]; matchedBy?:string};
  type Candidate = {name:string; key:string; fields:Record<string,string>; source:SourceRow | null; mergedRows:SourceRow[]};

  // Pass 1 — post-wise tables. The first one in reading order defines the posts; later post-wise tables
  // (qualification, pay, age...) add columns to a post only when the row name identifies exactly one post.
  const candidates: Candidate[] = [];
  const unmatchedRows: SourceRow[] = [];
  let primaryTableIndex: number | null = null;
  for (const table of tables) {
    const tableRows = Array.isArray(table.rows) ? table.rows : [];
    const layout = postTableLayout(tableRows);
    if (!layout) continue;
    const {headerPosition, headers, titleIndex} = layout;
    const titleHeaderCarriesCount = /number|no\.?\s*of/i.test(headers[titleIndex]);
    const isPrimary = primaryTableIndex === null;
    if (isPrimary) primaryTableIndex = table.tableIndex;
    for (const row of tableRows.slice(headerPosition + 1)) {
      const cells = row.cells.map((cell) => String(cell ?? "").trim());
      let name = cells[titleIndex] ?? "";
      if (!name || !/[a-z]/i.test(name) || /^(?:total|grand total|sub[- ]?total|note|important)$/i.test(name)) continue;
      const fields: Record<string,string> = {};
      headers.forEach((header, index) => { if (index !== titleIndex && header && cells[index] && !isNonFact(cells[index])) fields[header] = cells[index]; });
      // "Name & Number of Post" cells are written "Research Assistant (01)": the header says the bracket is the count.
      const counted = titleHeaderCarriesCount ? name.match(/^(.*\S)\s*\(\s*(\d{1,5})\s*\)$/) : null;
      if (counted) { name = counted[1]; fields["No. of Posts (from post-name column)"] = counted[2]; }
      const key = postMatchKey(name);
      const source: SourceRow = {tableIndex:table.tableIndex, rowIndex:row.rowIndex, headers, cells};
      const mergeInto = (target: Candidate, matchedBy: string) => {
        for (const [header, value] of Object.entries(fields)) {
          if (!(header in target.fields)) target.fields[header] = value;
          else if (target.fields[header] !== value) target.fields[`${header} [table ${table.tableIndex}]`] = value;
        }
        target.mergedRows.push({...source, matchedBy});
      };
      const exact = candidates.filter((candidate) => candidate.key === key);
      if (isPrimary) {
        if (exact.length) mergeInto(exact[0], "repeated-name-in-primary-table");
        else candidates.push({name, key, fields, source, mergedRows:[]});
        continue;
      }
      if (exact.length === 1) { mergeInto(exact[0], "exact-name"); continue; }
      // A later table may use the short form of a post name ("Wealth Executive" for "Wealth Executive (JMG/S-I) – ...").
      // Joined only when that short form begins exactly one post's name; never the other way round.
      const byShortForm = candidates.filter((candidate) => isTokenPrefix(key, candidate.key));
      if (byShortForm.length === 1) { mergeInto(byShortForm[0], "unique-short-form"); continue; }
      // One row written for several posts by name ("Supervisor (Nesting) & Supervisor (Mechanical)").
      const parts = name.split(/\s*(?:&|,|\band\b)\s*(?![^(]*\))/i).map((part) => postMatchKey(part)).filter(Boolean);
      const named = parts.map((part) => candidates.filter((candidate) => candidate.key === part));
      if (parts.length > 1 && new Set(parts).size === parts.length && named.every((hits) => hits.length === 1)) {
        for (const hits of named) mergeInto(hits[0], "row-names-several-posts");
      } else unmatchedRows.push(source);
    }
  }

  // Pass 2 — no post-wise table: fall back to the article's "Post Name(s)" field.
  const rawPostNames = typeof details.postNames === "string" ? details.postNames : "";
  let namesFieldIsUnsplitList = false;
  if (!candidates.length && rawPostNames.trim()) {
    const names = rawPostNames.split(/\r?\n|\s*\|\s*|\s*;\s*/).map((name)=>name.trim().replace(/^[-•\s]+|[-•\s]+$/g,"")).filter(Boolean);
    for (const name of names) candidates.push({name, key:postMatchKey(name), fields:{}, source:null, mergedRows:[]});
    // "Manager and Assistant Manager" / "A, B, C" is several posts in one cell. It is not split by guesswork
    // (commas also occur inside one post name), so it stays one undecomposed row.
    const outsideBrackets = names.length === 1 ? names[0].replace(/\([^)]*\)/g, "") : "";
    namesFieldIsUnsplitList = /,|\s(?:and|&)\s/i.test(outsideBrackets);
  }

  type GetOptions = {avoid?: RegExp; strict?: boolean};
  const get = (fields: Record<string,string>, patterns: RegExp[], options: GetOptions = {}) => {
    const hits = Object.entries(fields).filter(([key,value]) => value?.trim() && patterns.some((pattern)=>pattern.test(key)));
    const preferred = options.avoid ? hits.filter(([key]) => !options.avoid!.test(key)) : hits;
    const chosen = preferred[0] ?? (options.strict ? undefined : hits[0]);
    return chosen ? chosen[1].trim() : "";
  };
  const SALARY_KEYS = [/salary/i,/pay scale/i,/pay level/i,/remuneration/i,/emolument/i,/^pay\b/i,/stipend/i,/\bctc\b/i,/^scale$/i];
  const QUALIFICATION_KEYS = [/qualification/i,/^eligibility(?: criteria)?$/i,/educational/i];
  const AGE_KEYS = [/age limit/i,/age criteria/i,/^(?:minimum|maximum|upper|lower|min\.?|max\.?) age\b/i];
  const EXPERIENCE_KEYS = [/experience/i];
  const getAge = (fields: Record<string,string>) => {
    const hits = Object.entries(fields).filter(([key,value]) => value?.trim() && AGE_KEYS.some((pattern)=>pattern.test(key)) && !/relax/i.test(key));
    if (hits.length <= 1) return hits[0]?.[1].trim() ?? "";
    return hits.map(([key,value]) => `${key}: ${value.trim()}`).join("; ");
  };

  // Pass 3 — list items written as "<post name>: <fact>" under a heading that says what the fact is
  // ("... Salary", "... Qualification"). Only fills a field no table supplied; the text is kept verbatim.
  const listSection = (heading: string | null): {field:string; keys:RegExp[]} | null => {
    const h = heading ?? "";
    if (/\b(?:salary|pay scale|pay|remuneration|stipend|emoluments?)\b/i.test(h)) return {field:"Salary", keys:SALARY_KEYS};
    if (/qualification/i.test(h)) return {field:"Qualification", keys:QUALIFICATION_KEYS};
    if (/age limit/i.test(h)) return {field:"Age Limit", keys:AGE_KEYS};
    if (/experience/i.test(h)) return {field:"Experience", keys:EXPERIENCE_KEYS};
    if (/eligibility/i.test(h)) return {field:"Eligibility Criteria", keys:[/eligibility criteria/i]};
    return null;
  };
  for (const candidate of candidates) {
    if (!candidate.name || namesFieldIsUnsplitList) continue;
    const escaped = candidate.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const labelled = new RegExp(`^${escaped}\\s*(?:\\(\\s*\\d{1,5}\\s*\\))?\\s*[:–—-]\\s*(\\S.*)$`, "i");
    for (const list of lists) {
      for (const listItem of list.items ?? []) {
        const fact = listItem.match(labelled)?.[1]?.trim();
        if (!fact) continue;
        const section = listSection(list.heading) ?? (/^(?:₹|rs\.?|inr)\s*\d/i.test(fact) ? {field:"Salary", keys:SALARY_KEYS} : null);
        if (!section || get(candidate.fields, section.keys, {avoid:/experience|date/i, strict:section.field === "Qualification"})) continue;
        candidate.fields[`${section.field} (from list${list.heading ? `: ${list.heading}` : ""})`] = fact;
      }
    }
    // The mirror layout: a list headed by the post name ("Technical Expert Eligibility & Requirements")
    // whose items are labelled facts ("Educational Qualification: ...", "Age Limit: ...").
    for (const list of lists) {
      const headingKey = postMatchKey(list.heading ?? "");
      const headedByThisPost = candidates.filter((other) => other.key && (headingKey === other.key || headingKey.startsWith(other.key + " ")));
      if (headedByThisPost.length !== 1 || headedByThisPost[0] !== candidate) continue;
      for (const listItem of list.items ?? []) {
        const labelledFact = listItem.match(/^([A-Za-z][A-Za-z &\/.-]{2,40}):\s*(\S.*)$/);
        if (!labelledFact || isNonFact(labelledFact[2])) continue;
        const fieldKey = `${labelledFact[1].trim()} (from list: ${list.heading})`;
        if (!(fieldKey in candidate.fields)) candidate.fields[fieldKey] = labelledFact[2].trim();
      }
    }
  }

  if (!candidates.length) candidates.push({name:"", key:"", fields:{}, source:null, mergedRows:[]});
  const multiCandidate = candidates.filter((candidate)=>candidate.name).length > 1;
  const parseCount = (value: string) => {
    const match = value.trim().match(/^(\d{1,3}(?:,\d{2,3})+|\d+)(?=$|\s|\()/);
    return match ? Number(match[1].replace(/,/g, "")) : null;
  };
  const usedKeys = new Set<string>();
  return candidates.map((candidate,index) => {
    const explicit = Boolean(candidate.source);
    const decomposed = Boolean(candidate.name) && !namesFieldIsUnsplitList;
    const canUseArticleFields = !multiCandidate && decomposed && !explicit;
    const fields = candidate.fields;
    const qualification = get(fields,QUALIFICATION_KEYS,{avoid:/experience|date|cut-?off/i,strict:true}) || (canUseArticleFields ? String(item.qualification ?? "") : "");
    const experience = get(fields,EXPERIENCE_KEYS) || (canUseArticleFields ? get(tableFields,EXPERIENCE_KEYS) : "");
    const age = getAge(fields) || (canUseArticleFields ? String(details.ageLimit ?? "") : "");
    const salary = get(fields,SALARY_KEYS,{avoid:/tenure|duration/i}) || (canUseArticleFields ? String(details.salary ?? "") : "");
    const location = get(fields,[/location/i,/place of posting/i]) || (canUseArticleFields ? String(details.location ?? "") : "");
    const vacancyRaw = get(fields,[/vacanc/i,/no\.?\s*of posts?/i,/number of posts?/i,/number of positions?/i,/^posts$/i,/^total(?: posts?)?$/i]) || (canUseArticleFields ? get(tableFields,[/vacanc/i,/no\.?\s*of post/i]) : "");
    const milestonesRaw = Object.entries(fields).filter(([key])=>/date|deadline|exam|interview|correction/i.test(key)).map(([field,value])=>({field,value}));
    const applicationSelectionRaw = Object.entries(fields).filter(([key])=>/fee|apply|application|selection|document|instruction/i.test(key)).map(([field,value])=>({field,value}));
    const otherInfoRaw: Record<string,unknown> = {
      articlePostNamesRaw: rawPostNames || null, articleTableFields: tableFields, explicitPostRow: candidate.source,
      postTableFields: explicit ? fields : {},
      mergedPostTableRows: candidate.mergedRows,
      // Rows of other post-wise tables whose name did not identify exactly one post. Kept as evidence, assigned to no post.
      unassignedPostTableRows: explicit ? unmatchedRows : [],
      genericArticleFieldsNotAssignedToPost: (multiCandidate && !explicit) || namesFieldIsUnsplitList ? {
        qualification:item.qualification ?? null, ageLimit:details.ageLimit ?? null,
        salary:details.salary ?? null, location:details.location ?? null
      } : {},
      scopeNote: explicit ? "Facts captured from source table rows with an explicit post-title column; rows of later tables are joined only on an exact or uniquely-prefixed post name; still unverified."
        : namesFieldIsUnsplitList ? "The post-name field lists several posts in one cell and no post-wise table was found; not split, and article-level fields are not assigned to a post."
        : multiCandidate ? "Post candidate inferred from a title list; generic article fields intentionally not copied across posts."
        : candidate.name ? "Single post candidate; article-level fields are candidates only and still require official verification."
        : "No post decomposition detected; preserve the parent article and review manually."
    };
    // Key by post name, not by position: a re-crawl of an edited or re-ordered article must land on the same row.
    let sourcePostKey = decomposed ? slugify(candidate.name) : "";
    if (!sourcePostKey) sourcePostKey = decomposed ? item.externalId + "-P" + String(index+1).padStart(2,"0") : "unresolved";
    for (let n = 2; usedKeys.has(sourcePostKey); n++) sourcePostKey = `${sourcePostKey.replace(/-\d+$/, "")}-${n}`;
    usedKeys.add(sourcePostKey);
    const core = {
      sourcePostKey,
      postNameRaw:candidate.name || null,
      sourcePostCodeRaw:get(fields,[/post code/i,/serial no/i,/sl\.?\s*no/i,/post id/i]) || (canUseArticleFields ? get(tableFields,[/post code/i,/serial no/i,/sl\.?\s*no/i,/post id/i]) : "") || null,
      vacancyCountRaw:vacancyRaw || null, vacancyCountCandidate:parseCount(vacancyRaw),
      qualificationRaw:qualification || null, experienceRaw:experience || null, ageLimitRaw:age || null,
      ageReferenceDateRaw:get(fields,[/age as on/i,/age reckoning date/i]) || (canUseArticleFields ? get(tableFields,[/age as on/i,/age reckoning date/i]) : "") || null,
      ageRelaxationRulesRaw:get(fields,[/age relaxation/i,/relaxation/i]) || (canUseArticleFields ? get(tableFields,[/age relaxation/i,/relaxation/i]) : "") || null,
      salaryRaw:salary || null, payLevelRaw:get(fields,[/pay level/i,/pay scale/i,/grade pay/i]) || null,
      employmentTypeRaw:get(fields,[/employment type/i,/nature of appointment/i,/job type/i]) || (canUseArticleFields ? get(tableFields,[/employment type/i,/nature of appointment/i,/job type/i]) : "") || null,
      tenureRaw:get(fields,[/duration/i,/tenure/i,/contract period/i]) || (canUseArticleFields ? get(tableFields,[/duration/i,/tenure/i,/contract period/i]) : "") || null,
      locationRaw:location || null,
      dutiesResponsibilitiesRaw:get(fields,[/job profile/i,/roles and responsibilities/i,/duties/i,/responsibilities/i]) || (canUseArticleFields ? get(tableFields,[/job profile/i,/roles and responsibilities/i,/duties/i,/responsibilities/i]) : "") || null,
      eligibilityConditionsRaw:get(fields,[/eligibility criteria/i,/other conditions/i,/minimum requirements/i]) || (canUseArticleFields ? get(tableFields,[/eligibility criteria/i,/other conditions/i,/minimum requirements/i]) : "") || null,
      milestonesRaw, applicationSelectionRaw, otherInfoRaw, sourceTableRowRaw:candidate.source ?? null,
      extractionStatus:(decomposed ? "CANDIDATE_NEEDS_REVIEW" : "POST_DECOMPOSITION_NOT_EXTRACTED") as FjaPostCandidate["extractionStatus"]
    };
    return {...core,contentHash:sha(JSON.stringify(core))};
  });
}

type SourceLink = {label:string; url:string; context?:string; rel?:string; title?:string};

/**
 * Best official notification URL among the article's own links. Only links that the page itself labels
 * as the notification/advertisement are eligible, plus (last resort) an official-domain PDF.
 *   1. .gov.in / .nic.in PDF labelled notification/advertisement
 *   2. any PDF labelled notification/advertisement
 *   3. .gov.in / .nic.in PDF that is not labelled as some other document (corrigendum, syllabus, form...)
 *   4. non-PDF link labelled notification/advertisement (official domain first)
 * Never the aggregator's own links (including its hosted PDF copies), and never an "Apply Online" or
 * "Official Website" link just because it sits on an official domain.
 */
function pickOfficialNotificationUrl(links: SourceLink[]): string | undefined {
  const text = (link: SourceLink) => `${link.label} ${link.context ?? ""}`;
  const isGovDomain = (url: string) => {
    try { const h = new URL(url).hostname.toLowerCase(); return h.endsWith(".gov.in") || h.endsWith(".nic.in"); } catch { return false; }
  };
  const isPdf = (url: string) => /\.pdf(\?|#|$)/i.test(url);
  const isNotification = (link: SourceLink) => /notification|advertisement|official notice|\badvt\b/i.test(text(link));
  const isOtherDocument = (link: SourceLink) => /corrigendum|addendum|extend|extension|modification|syllabus|result|admit card|answer key|application form|\bformat\b/i.test(text(link));
  const isFjaLink = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, "").includes("freejobalert"); } catch { return false; } };
  const candidates = links.filter((link) => !isFjaLink(link.url));
  return (
    candidates.find((link) => isNotification(link) && isPdf(link.url) && isGovDomain(link.url)) ??
    candidates.find((link) => isNotification(link) && isPdf(link.url)) ??
    candidates.find((link) => isGovDomain(link.url) && isPdf(link.url) && !isOtherDocument(link)) ??
    candidates.find((link) => isNotification(link) && isGovDomain(link.url)) ??
    candidates.find((link) => isNotification(link))
  )?.url;
}

function detailFields(html: string, listing: {url:string; title:string; externalId:string}): Listing {
  const $ = cheerio.load(html);
  // Everything below reads the article body only. The page chrome (menus, "latest jobs" sidebars, related
  // articles) carries other recruitments' names, links and numbers and must never be attributed to this one.
  const scoped = [["article .entry-content", $("article .entry-content").first()], ["article", $("article").first()]] as const;
  const [contentScope, $root] = scoped.find(([, node]) => node.length) ?? (["body", $("body")] as const);

  const rows: Record<string,string> = {};
  const tables: RawTable[] = [];
  const lists: RawList[] = [];
  const headings: Array<{level:number|null; text:string}> = [];
  let currentHeading: string | null = null;
  $root.find("h1,h2,h3,h4,h5,h6,table,ul,ol").each((_, el) => {
    const tag = (el.tagName || "").toLowerCase();
    if (/^h\d$/.test(tag)) {
      const text = collapse($(el).text());
      if (text) { headings.push({level:Number(tag.slice(1)) || null, text}); currentHeading = text; }
      return;
    }
    if (tag === "table") {
      const tableRows: RawTableRow[] = [];
      $(el).find("tr").each((rowIndex, row) => {
        const cells = $(row).find("th,td").map((__, cell) => collapse($(cell).text())).get();
        if (cells.some(Boolean)) tableRows.push({rowIndex, cells});
      });
      // Only label/value tables feed the article-level field map. Post-wise and other multi-column
      // tables are matrices: their first column is not a field label.
      const isLabelValueTable = tableRows.every((row) => row.cells.length <= 2) && !postTableLayout(tableRows);
      if (isLabelValueTable) {
        for (const {cells} of tableRows) {
          if (cells.length < 2 || !cells[0]) continue;
          const label = cells[0].replace(/[:\s]+$/,"").toLowerCase();
          rows[label] = [rows[label], cells.slice(1).filter(Boolean).join(" | ")].filter(Boolean).join("\n");
        }
      }
      tables.push({tableIndex:tables.length, caption:collapse($(el).find("caption").first().text()), heading:currentHeading, rows:tableRows});
      return;
    }
    const items = $(el).children("li").map((__, li) => collapse($(li).text())).get().filter(Boolean);
    if (items.length) lists.push({listType:tag, heading:currentHeading, items});
  });
  const text = collapse($("body").text());
  const contentText = collapse($root.text());
  const findEntry = (patterns: RegExp[], avoid?: RegExp) => {
    for (const [key,value] of Object.entries(rows)) {
      if (!value || isNonFact(value) || (avoid && avoid.test(key))) continue;
      if (patterns.some((pattern) => pattern.test(key))) return value;
    }
    return undefined;
  };
  const find = (...patterns: RegExp[]) => findEntry(patterns);
  const title = collapse($("h1").first().text()) || listing.title;
  const listingCategory = classifyListing(title, contentText, rows);
  const organizationName = find(/recruiting body|recruiting organi[sz]ation|^organi[sz]ation|^company name$|^name of (?:the )?(?:organi[sz]ation|department)|^department$/i);
  const publishedRaw = find(/notification date|post date|published|updated date/i);
  const startRaw = find(/application start|start date|starting date/i);
  const endRaw = find(/last date|closing date|application end|last date to apply/i);
  const vacancyRaw = find(/total vacanc|total posts?$|^total posts?\b|number of vacanc|no\.? of (?:posts?|vacanc)|^vacanc(?:y|ies)$/i);
  const vacancyMatch = vacancyRaw?.replace(/,/g,"").match(/\d{1,6}/);
  const qualification = findEntry([/qualification/i,/^eligibility(?: criteria)?$/i,/^educational/i], /date|cut-?off|experience/i);
  const allLinks: SourceLink[] = [];
  const seenLinks = new Set<string>();
  $root.find("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    if (!href) return;
    try {
      const url = new URL(href, listing.url);
      if (!["http:","https:"].includes(url.protocol)) return;
      const normalizedUrl = url.toString();
      const label = collapse($(a).text());
      // "Click here" links are identified by where they sit: the label cell of their table row,
      // or a short list item such as "Official Notification PDF: Click here".
      const row = $(a).closest("tr");
      const listItem = row.length ? "" : collapse($(a).closest("li").text());
      let context = row.length ? collapse(row.find("th,td").first().text()) : (listItem.length <= 140 ? listItem : "");
      if (context === label) context = "";
      const key = normalizedUrl + "\n" + label + "\n" + context;
      if (seenLinks.has(key)) return;
      seenLinks.add(key);
      allLinks.push({label, url:normalizedUrl, ...(context ? {context} : {}), rel:$(a).attr("rel"), title:$(a).attr("title")});
    } catch {}
  });
  const postNames = find(/^name of (?:the )?posts?$|^post names?$|post name\(s\)|^posts$|^post names? \(/i);
  const ageLimit = find(/age limit|age criteria/i);
  const applicationFee = find(/application fee|exam fee/i);
  const selectionProcess = find(/selection process|selection procedure/i);
  const salary = find(/salary|pay scale|pay level|remuneration|emolument|^pay$|stipend/i);
  const location = find(/job location|place of posting|location/i);
  const officialLinks = allLinks.filter((link) => /official|notification|advertisement|\badvt\b|apply|registration|application|download|pdf/i.test(`${link.label} ${link.context ?? ""}`));
  // Promote the best official notification URL to a top-level field (see pickOfficialNotificationUrl).
  const officialNotificationUrl = pickOfficialNotificationUrl(officialLinks);

  const mappedFieldPattern = /recruiting body|organi[sz]ation|department|advertisement|notification|published|updated|application start|start date|starting date|last date|closing date|application end|total vacan|total post|number of vacan|no\.? of post|qualification|eligibility|educational|application fee|exam fee|selection process|selection procedure|salary|pay scale|pay level|remuneration|job location|place of posting|location|name of post|post name|age limit|age criteria|experience|how to apply|application mode|employment type|tenure|duration/i;
  const otherInfoRaw = {
    unmappedTableFields: Object.fromEntries(Object.entries(rows).filter(([label]) => !mappedFieldPattern.test(label))),
    additionalHeadings: headings,
    listContent: lists,
    preservationNote: "Unmapped source fields and page structure are retained as raw evidence; no AI rewrite or official verification is performed during extraction.",
  };
  const articleFacts = parseFreeJobAlertArticle(html);
  // Keep section-based extraction alongside table/link evidence; this is still aggregator evidence.
  const articleFactsStored = {
    ageLimitMin: articleFacts.ageLimitMin ?? null,
    ageLimitMax: articleFacts.ageLimitMax ?? null,
    ageRelaxationNotes: articleFacts.ageRelaxationNotes ?? null,
    applicationFeeGeneral: articleFacts.applicationFeeGeneral ?? null,
    applicationFeeReserved: articleFacts.applicationFeeReserved ?? null,
    salaryMin: articleFacts.salaryMin ?? null,
    salaryMax: articleFacts.salaryMax ?? null,
    validThrough: articleFacts.validThrough?.toISOString() ?? null,
    examDate: articleFacts.examDate?.toISOString() ?? null,
    applyUrl: articleFacts.applyUrl ?? null,
    officialNotificationUrl: articleFacts.officialNotificationUrl ?? null,
    officialWebsiteUrl: articleFacts.officialWebsiteUrl ?? null,
    extraContent: articleFacts.extraContent ?? null,
    unparsed: articleFacts.unparsed,
    review: articleFacts.review,
  };
  const fieldCoverage = {
    labeledTableFields: Object.keys(rows),
    sectionExtractor: {
      age: articleFacts.ageLimitMin != null || articleFacts.ageLimitMax != null,
      fee: articleFacts.applicationFeeGeneral != null || articleFacts.applicationFeeReserved != null,
      salary: articleFacts.salaryMin != null || articleFacts.salaryMax != null,
      deadline: articleFacts.validThrough != null,
      examDate: articleFacts.examDate != null,
      applyUrl: articleFacts.applyUrl != null,
      notificationUrl: articleFacts.officialNotificationUrl != null,
      officialWebsiteUrl: articleFacts.officialWebsiteUrl != null,
    },
    unparsedSections: articleFacts.unparsed,
    reviewFlags: articleFacts.review,
    note: "Coverage reports what extraction found; absence does not prove the source omitted a fact.",
  };
  const details: Record<string, unknown> = {
    contentScope,
    tableFields: rows, tables, headings, lists, allLinks, officialLinks,
    // Top-level promoted field — best official notification/PDF URL found on this page.
    // This is what the DB write uses for fja_job_inventory.official_notification_url.
    official_notification_url: officialNotificationUrl ?? articleFacts.officialNotificationUrl ?? null,
    postNames, ageLimit, applicationFee, selectionProcess, salary, location, otherInfoRaw,
    articleFacts: articleFactsStored, fieldCoverage,
  };
  const parsedEndDate = (endRaw ? parseEndDate(endRaw) : undefined) ?? articleFacts.validThrough?.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  // A dated closing date decides the status. Free text is only consulted when there is no date, and only
  // inside the article body with a bounded match ("last date ... over" used to match the word "Overview").
  const explicitClosed = /applications? (?:is |are |has |have )?(?:been )?closed|last date[^.]{0,40}\bis over\b|no longer accepting/i.test(contentText);
  const status = parsedEndDate
    ? (parsedEndDate < today ? "CLOSED" : /apply online|application form/i.test(contentText) ? "OPEN" : "UNKNOWN")
    : explicitClosed ? "CLOSED" : "UNKNOWN";
  const importantFields = [organizationName, vacancyRaw, endRaw, qualification];
  const populated = importantFields.filter(Boolean).length;
  const htmlSha256 = sha(html);
  const hashInput = JSON.stringify({htmlSha256,title,rows,tables,headings,lists,allLinks,details,rawText:text});
  return {
    externalId:listing.externalId, sourceUrl:listing.url, title,
    organizationName,
    listingCategory,
    publishedDate:publishedRaw ? parseDate(publishedRaw) : undefined,
    applicationStartDate:startRaw ? parseStartDate(startRaw) : undefined,
    applicationEndDate:parsedEndDate,
    advertisementNumber:find(/advertisement number|notification number|advertisement no|notification no/i),
    qualification,
    vacancyCount:vacancyMatch ? Number(vacancyMatch[0]) : undefined,
    officialNotificationUrl: officialNotificationUrl ?? articleFacts.officialNotificationUrl ?? null,
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
type DiscoveredArticle = {url:string; title:string; externalId:string; updatedOn?:string};
/** Listing titles that announce something other than a recruitment; these articles are not fetched in window mode. */
const NON_RECRUITMENT_UPDATE_RE = /\b(?:results?|admit cards?|answer keys?|syllabus|cut.?off|merit list|exam dates?|exam city|hall tickets?|call letters?|score ?cards?|interview (?:schedule|list|date)|dv schedule|counsell?ing|allotment|marks)\b/i;
const RECRUITMENT_UPDATE_RE = /\b(?:recruitment|vacanc(?:y|ies)|online form|offline form|walk.?in|apply online|application form|rally)\b/i;

/** The source's dated update list: one row per article with the date it was listed or last updated. */
function parseUpdatesListing(html: string, pageUrl: string): Required<DiscoveredArticle>[] {
  const $ = cheerio.load(html);
  const found: Required<DiscoveredArticle>[] = [];
  $("tr").each((_, tr) => {
    const cells = $(tr).find("td,th").map((__, cell) => collapse($(cell).text())).get();
    if (cells.length < 2) return;
    const updatedOn = parseDate(cells[0]);
    if (!updatedOn) return;
    for (const a of $(tr).find("a[href]").toArray()) {
      const url = normalizeUrl($(a).attr("href") ?? "", pageUrl);
      const externalId = url?.pathname.match(ARTICLE_RE)?.[1];
      if (!url || !externalId) continue;
      found.push({url:url.toString(), title:cells[1] || collapse($(a).text()), externalId, updatedOn});
      break;
    }
  });
  return found;
}
/** Stops rather than crawl a path the source's robots.txt disallows for all agents. */
async function assertCrawlAllowed(paths: string[]) {
  const body = await getHtml(`${BASE}/robots.txt`);
  const disallowed: string[] = [];
  let agents: string[] = []; let inRules = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    const at = line.indexOf(":"); if (at < 0) continue;
    const key = line.slice(0, at).trim().toLowerCase(); const value = line.slice(at + 1).trim();
    if (key === "user-agent") { if (inRules) { agents = []; inRules = false; } agents.push(value.toLowerCase()); }
    else { inRules = true; if (key === "disallow" && value && agents.includes("*")) disallowed.push(value); }
  }
  for (const candidate of paths) {
    const rule = disallowed.find((entry) => !entry.includes("*") && candidate.startsWith(entry));
    if (rule) throw new Error(`robots.txt disallows ${candidate} (rule ${rule}); stopping.`);
  }
}
/**
 * Walks the dated update list from newest to oldest until it passes startDate. The list is ordered by date,
 * so the first older row ends the walk. Refuses to return a window it could not walk to its start.
 */
async function discoverWindow(startDate: string): Promise<{articles:Required<DiscoveredArticle>[]; pagesFetched:number; rowsSeen:number}> {
  await assertCrawlAllowed(["/new-updates/", "/articles/"]);
  const byId = new Map<string, Required<DiscoveredArticle>>();
  let rowsSeen = 0; let pagesFetched = 0; let reachedStart = false;
  for (let page = 0; page < MAX_LIST_PAGES && !reachedStart; page++) {
    const url = page === 0 ? `${BASE}/new-updates/` : `${BASE}/new-updates/page/${page}/`;
    const rows = parseUpdatesListing(await getHtml(url), url);
    pagesFetched++;
    if (!rows.length) throw new Error(`No dated rows on ${url}; the update list layout may have changed. Stopping.`);
    for (const row of rows) {
      rowsSeen++;
      if (row.updatedOn < startDate) { reachedStart = true; continue; }
      // newest first: the first time an article is seen carries its latest update date
      if (!byId.has(row.externalId)) byId.set(row.externalId, row);
    }
    await sleep(600);
  }
  if (!reachedStart) throw new Error(`Update list did not reach ${startDate} within ${MAX_LIST_PAGES} pages; refusing to report a partial window as complete.`);
  return {articles:[...byId.values()], pagesFetched, rowsSeen};
}
async function main() {
  if (!DRY_RUN && !process.env.DATABASE_URL) throw new Error("DATABASE_URL secret is required; refusing to run without database destination.");
  if (RUN_MODE === "pilot" && PILOT_URLS.length === 0 && !PILOT_URLS_FILE) throw new Error("Pilot mode requires FJA_PILOT_URLS or FJA_PILOT_URLS_FILE; refusing to fall back to broad crawl.");
  if (RUN_MODE === "queue" && !QUEUE_FILE) throw new Error("Queue mode requires FJA_QUEUE_FILE; refusing to fall back to broad crawl.");
  if (RUN_MODE !== "pilot" && RUN_MODE !== "queue" && RUN_MODE !== "full" && RUN_MODE !== "window") throw new Error(`Unsupported FJA_RUN_MODE: ${RUN_MODE}`);
  if (RUN_MODE === "window" && !/^20\d{2}-\d{2}-\d{2}$/.test(START_DATE)) throw new Error("Window mode requires FJA_START_DATE as YYYY-MM-DD.");
  // prepare:false — DATABASE_URL is the pooled (transaction-mode) connection, which does not keep
  // prepared statements between queries. Same setting as src/db/index.ts.
  const db = DRY_RUN ? null : postgres(process.env.DATABASE_URL!,{max:4,ssl:"require",connect_timeout:20,prepare:false});
  const startedAt = new Date().toISOString();
  const listingPages = [`${BASE}/`,`${BASE}/latest-notifications/`,`${BASE}/government-jobs/`];
  const listings = new Map<string,DiscoveredArticle>();
  // window mode: articles left out, each with the reason, so the run can be audited
  const windowSkipped: Array<{url:string; title:string; updatedOn?:string; reason:string; closingDate?:string}> = [];
  let windowDiscovery: {startDate:string; pagesFetched:number; rowsSeen:number; articlesInWindow:number} | null = null;
  const pageQueue = [...listingPages]; const visitedPages = new Set<string>();
  let sitemapUrls: string[] = [];
  if (RUN_MODE === "window") {
    const discovered = await discoverWindow(START_DATE);
    windowDiscovery = {startDate:START_DATE, pagesFetched:discovered.pagesFetched, rowsSeen:discovered.rowsSeen, articlesInWindow:discovered.articles.length};
    for (const article of discovered.articles) {
      if (NON_RECRUITMENT_UPDATE_RE.test(article.title) && !RECRUITMENT_UPDATE_RE.test(article.title)) {
        windowSkipped.push({url:article.url, title:article.title, updatedOn:article.updatedOn, reason:"listing title is not a recruitment (result, admit card, answer key, ...)"});
      } else listings.set(article.externalId, article);
    }
  } else if (RUN_MODE === "queue" || PILOT_URLS.length > 0 || PILOT_URLS_FILE) {
    // Pilot and queue modes bypass broad discovery. Queue mode is bounded per dispatch.
    const selectedFile = RUN_MODE === "queue" ? QUEUE_FILE : PILOT_URLS_FILE;
    const fileUrls = selectedFile
      ? (await readFile(selectedFile, "utf8")).split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"))
      : [];
    const allSuppliedUrls = [...PILOT_URLS, ...fileUrls];
    const suppliedUrls = RUN_MODE === "queue" ? allSuppliedUrls.slice(QUEUE_OFFSET, QUEUE_OFFSET + QUEUE_LIMIT) : allSuppliedUrls;
    if (RUN_MODE === "queue" && QUEUE_OFFSET >= allSuppliedUrls.length) throw new Error("Queue offset " + QUEUE_OFFSET + " is beyond the " + allSuppliedUrls.length + "-URL queue.");
    if (suppliedUrls.length === 0) throw new Error("The supplied FJA URL list is empty.");
    for (const suppliedUrl of suppliedUrls) {
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
  console.log(JSON.stringify({runId:RUN_ID,mode:RUN_MODE,dryRun:DRY_RUN,windowDiscovery,listingPagesVisited:visitedPages.size,listingPageQueueRemaining:pageQueue.length,sitemapArticleUrls:sitemapUrls.length,uniqueArticles:allItems.length}));
  if(allItems.length===0) throw new Error("No FJA article URLs found; refusing to report an empty successful inventory.");
  const failedDetailUrls: string[] = [];
  let nonRecruitmentPagesSkipped = 0;
  let liveMappedPostRowsPreserved = 0;
  const postCandidateRows: Array<Record<string, unknown>> = [];
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
      if (!parsed.listingCategory) {
        nonRecruitmentPagesSkipped++;
        if (RUN_MODE === "window") windowSkipped.push({url:item.url, title:parsed.title, updatedOn:item.updatedOn, reason:"article is not a recruitment"});
        return null;
      }
      if (item.updatedOn) parsed.details.sourceListing = {updatedOn:item.updatedOn, title:item.title};
      if (RUN_MODE === "window") {
        // "Still open" is decided by the closing date the article states. An article with no closing date
        // cannot be shown to be open, so it is listed for review instead of being saved as open.
        if (parsed.sourceStatus === "CLOSED") {
          windowSkipped.push({url:item.url, title:parsed.title, updatedOn:item.updatedOn, reason:"closed", closingDate:parsed.applicationEndDate});
          return null;
        }
        if (!parsed.applicationEndDate) {
          windowSkipped.push({url:item.url, title:parsed.title, updatedOn:item.updatedOn, reason:"no closing date found on the article"});
          return null;
        }
      }
      // Top-level details keys this crawl is writing; the upsert below records which of them the crawler owns.
      parsed.details.crawlerKeys = Object.keys(parsed.details).filter((key) => parsed.details[key] != null).sort();
      const postCandidates = extractPostCandidates(parsed);
      for (const candidate of postCandidates) {
        const {otherInfoRaw, ...facts} = candidate;
        postCandidateRows.push({externalId:parsed.externalId, articleTitle:parsed.title, ...facts, scopeNote:otherInfoRaw.scopeNote});
      }
      if (!db) return parsed;
      const [inventoryRow] = await db`
        INSERT INTO public.fja_job_inventory AS inv
          (source_slug,external_id,source_url,title,organization_name,listing_category,published_date,application_start_date,application_end_date,advertisement_number,qualification,vacancy_count,official_notification_url,detail_status,source_status,details,other_info_raw,raw_text,content_hash,last_crawl_run_id,first_seen_at,last_seen_at,updated_at)
        VALUES
          ('freejobalert',${parsed.externalId},${parsed.sourceUrl},${parsed.title},${parsed.organizationName ?? null},${parsed.listingCategory ?? null},${parsed.publishedDate ?? null},${parsed.applicationStartDate ?? null},${parsed.applicationEndDate ?? null},${parsed.advertisementNumber ?? null},${parsed.qualification ?? null},${parsed.vacancyCount ?? null},${parsed.officialNotificationUrl ?? null},${parsed.detailStatus},${parsed.sourceStatus},${db.json(parsed.details as never)},${db.json((parsed.details.otherInfoRaw ?? {}) as never)},${parsed.rawText ?? null},${parsed.contentHash},${RUN_ID},now(),now(),now())
        ON CONFLICT (source_slug,external_id) DO UPDATE SET
          -- An existing row can hold facts and keys this crawler did not write: seeded rows carry the canonical
          -- mapping (other_info_raw.canonical_recruitment_id) and the details keys that live recruitment pages
          -- read. A crawl therefore refreshes what it found and erases nothing:
          --   scalar columns   a value found now wins; a value not found now keeps what was stored
          --   other_info_raw   merged key by key
          --   details          merged key by key, and the crawler only overwrites keys it wrote itself
          --                    (tracked in details.crawlerKeys); a key someone else wrote is left alone
          source_url=excluded.source_url,title=excluded.title,
          organization_name=COALESCE(excluded.organization_name, inv.organization_name),
          listing_category=COALESCE(excluded.listing_category, inv.listing_category),
          published_date=COALESCE(excluded.published_date, inv.published_date),
          application_start_date=COALESCE(excluded.application_start_date, inv.application_start_date),
          application_end_date=COALESCE(excluded.application_end_date, inv.application_end_date),
          advertisement_number=COALESCE(excluded.advertisement_number, inv.advertisement_number),
          qualification=COALESCE(excluded.qualification, inv.qualification),
          vacancy_count=COALESCE(excluded.vacancy_count, inv.vacancy_count),
          detail_status=excluded.detail_status,
          source_status=CASE WHEN excluded.source_status = 'UNKNOWN' THEN inv.source_status ELSE excluded.source_status END,
          official_notification_url=COALESCE(excluded.official_notification_url, inv.official_notification_url),
          details=(COALESCE(inv.details, '{}'::jsonb) - 'extractionError')
            || ((jsonb_strip_nulls(excluded.details) - 'crawlerKeys') - ARRAY(
                 SELECT k FROM jsonb_object_keys(COALESCE(inv.details, '{}'::jsonb)) AS k
                 WHERE inv.details->k <> 'null'::jsonb
                   AND NOT (COALESCE(inv.details->'crawlerKeys', '[]'::jsonb) ? k)))
            || jsonb_build_object('crawlerKeys', (
                 SELECT COALESCE(jsonb_agg(DISTINCT owned.k), '[]'::jsonb) FROM (
                   SELECT jsonb_array_elements_text(COALESCE(inv.details->'crawlerKeys', '[]'::jsonb)) AS k
                   UNION ALL
                   SELECT k FROM jsonb_array_elements_text(COALESCE(excluded.details->'crawlerKeys', '[]'::jsonb)) AS k
                   WHERE inv.details->k IS NULL OR inv.details->k = 'null'::jsonb
                      OR COALESCE(inv.details->'crawlerKeys', '[]'::jsonb) ? k
                 ) AS owned)),
          other_info_raw=COALESCE(inv.other_info_raw, '{}'::jsonb) || excluded.other_info_raw,
          raw_text=excluded.raw_text,content_hash=excluded.content_hash,
          last_crawl_run_id=excluded.last_crawl_run_id,last_seen_at=now(),updated_at=now()
        RETURNING id, official_notification_url
      `;
      // NEEDS_REVIEW = an official notification URL is on record to verify the post against; PENDING = none yet.
      const postVerificationStatus = inventoryRow.official_notification_url ? "NEEDS_REVIEW" : "PENDING";
      await db`
        INSERT INTO public.fja_source_captures
          (recruitment_inventory_id,source_slug,external_id,source_url,html_sha256,normalized_text_sha256,raw_html,run_id,captured_at)
        VALUES
          (${inventoryRow.id},'freejobalert',${parsed.externalId},${parsed.sourceUrl},${htmlSha256},
           ${sha(parsed.rawText ?? "")},${rawHtmlContent},${RUN_ID},now())
        ON CONFLICT (source_slug,external_id,html_sha256) DO NOTHING
      `;
      for (const candidate of postCandidates) {
        const salaryCandidate = normalizeSalary(candidate.salaryRaw);
        const ageCandidate = normalizeAge(candidate.ageLimitRaw, candidate.ageReferenceDateRaw);
        // A row that is mapped to a published canonical post (other_info_raw.canonical_post_id) is read by the
        // live post page. A crawl is unreviewed aggregator evidence, so it never rewrites such a row: the WHERE
        // on the upsert skips it, and the capture is attached to it as other_info_raw.crawl_candidate for review.
        const written = await db`
          INSERT INTO public.fja_post_inventory
            (recruitment_inventory_id,source_slug,external_id,source_post_key,post_name_raw,post_name_normalized_candidate,
             source_post_code_raw,vacancy_count_raw,vacancy_count_candidate,qualification_raw,experience_raw,age_limit_raw,
             age_reference_date_raw,age_relaxation_rules_raw,salary_raw,salary_min_candidate,salary_max_candidate,
             salary_currency_candidate,salary_period_candidate,salary_type_candidate,salary_normalization_status,
             min_age_years_candidate,max_age_years_candidate,age_reference_date_candidate,age_normalization_status,
             pay_level_raw,employment_type_raw,tenure_raw,location_raw,duties_responsibilities_raw,eligibility_conditions_raw,
             milestones_raw,application_selection_raw,other_info_raw,source_table_row_raw,extraction_status,
             official_verification_status,content_hash,last_crawl_run_id,first_seen_at,last_seen_at,updated_at)
          VALUES
            (${inventoryRow.id},'freejobalert',${parsed.externalId},${candidate.sourcePostKey},${candidate.postNameRaw},
             NULL,${candidate.sourcePostCodeRaw},${candidate.vacancyCountRaw},${candidate.vacancyCountCandidate},
             ${candidate.qualificationRaw},${candidate.experienceRaw},${candidate.ageLimitRaw},${candidate.ageReferenceDateRaw},
             ${candidate.ageRelaxationRulesRaw},${candidate.salaryRaw},${salaryCandidate.min},${salaryCandidate.max},
             ${salaryCandidate.currency},${salaryCandidate.period},${salaryCandidate.type},${salaryCandidate.status},
             ${ageCandidate.min},${ageCandidate.max},${ageCandidate.referenceDate},${ageCandidate.status},
             ${candidate.payLevelRaw},${candidate.employmentTypeRaw},${candidate.tenureRaw},${candidate.locationRaw},
             ${candidate.dutiesResponsibilitiesRaw},${candidate.eligibilityConditionsRaw},
             ${db.json(candidate.milestonesRaw as never)},${db.json(candidate.applicationSelectionRaw as never)},${db.json(candidate.otherInfoRaw as never)},
             ${candidate.sourceTableRowRaw ? db.json(candidate.sourceTableRowRaw as never) : null},${candidate.extractionStatus},
             ${postVerificationStatus},${candidate.contentHash},${RUN_ID},now(),now(),now())
          ON CONFLICT (source_slug,external_id,source_post_key) DO UPDATE SET
            recruitment_inventory_id=excluded.recruitment_inventory_id,
            post_name_raw=excluded.post_name_raw,source_post_code_raw=excluded.source_post_code_raw,
            vacancy_count_raw=excluded.vacancy_count_raw,vacancy_count_candidate=excluded.vacancy_count_candidate,
            qualification_raw=excluded.qualification_raw,experience_raw=excluded.experience_raw,age_limit_raw=excluded.age_limit_raw,
            age_reference_date_raw=excluded.age_reference_date_raw,age_relaxation_rules_raw=excluded.age_relaxation_rules_raw,
            salary_raw=excluded.salary_raw,
            salary_min_candidate=CASE WHEN public.fja_post_inventory.content_hash IS NOT DISTINCT FROM excluded.content_hash AND public.fja_post_inventory.salary_normalization_status='MANUALLY_REVIEWED' THEN public.fja_post_inventory.salary_min_candidate ELSE excluded.salary_min_candidate END,
            salary_max_candidate=CASE WHEN public.fja_post_inventory.content_hash IS NOT DISTINCT FROM excluded.content_hash AND public.fja_post_inventory.salary_normalization_status='MANUALLY_REVIEWED' THEN public.fja_post_inventory.salary_max_candidate ELSE excluded.salary_max_candidate END,
            salary_currency_candidate=CASE WHEN public.fja_post_inventory.content_hash IS NOT DISTINCT FROM excluded.content_hash AND public.fja_post_inventory.salary_normalization_status='MANUALLY_REVIEWED' THEN public.fja_post_inventory.salary_currency_candidate ELSE excluded.salary_currency_candidate END,
            salary_period_candidate=CASE WHEN public.fja_post_inventory.content_hash IS NOT DISTINCT FROM excluded.content_hash AND public.fja_post_inventory.salary_normalization_status='MANUALLY_REVIEWED' THEN public.fja_post_inventory.salary_period_candidate ELSE excluded.salary_period_candidate END,
            salary_type_candidate=CASE WHEN public.fja_post_inventory.content_hash IS NOT DISTINCT FROM excluded.content_hash AND public.fja_post_inventory.salary_normalization_status='MANUALLY_REVIEWED' THEN public.fja_post_inventory.salary_type_candidate ELSE excluded.salary_type_candidate END,
            salary_normalization_status=CASE WHEN public.fja_post_inventory.content_hash IS NOT DISTINCT FROM excluded.content_hash AND public.fja_post_inventory.salary_normalization_status='MANUALLY_REVIEWED' THEN public.fja_post_inventory.salary_normalization_status ELSE excluded.salary_normalization_status END,
            min_age_years_candidate=CASE WHEN public.fja_post_inventory.content_hash IS NOT DISTINCT FROM excluded.content_hash AND public.fja_post_inventory.age_normalization_status='MANUALLY_REVIEWED' THEN public.fja_post_inventory.min_age_years_candidate ELSE excluded.min_age_years_candidate END,
            max_age_years_candidate=CASE WHEN public.fja_post_inventory.content_hash IS NOT DISTINCT FROM excluded.content_hash AND public.fja_post_inventory.age_normalization_status='MANUALLY_REVIEWED' THEN public.fja_post_inventory.max_age_years_candidate ELSE excluded.max_age_years_candidate END,
            age_reference_date_candidate=CASE WHEN public.fja_post_inventory.content_hash IS NOT DISTINCT FROM excluded.content_hash AND public.fja_post_inventory.age_normalization_status='MANUALLY_REVIEWED' THEN public.fja_post_inventory.age_reference_date_candidate ELSE excluded.age_reference_date_candidate END,
            age_normalization_status=CASE WHEN public.fja_post_inventory.content_hash IS NOT DISTINCT FROM excluded.content_hash AND public.fja_post_inventory.age_normalization_status='MANUALLY_REVIEWED' THEN public.fja_post_inventory.age_normalization_status ELSE excluded.age_normalization_status END,
            official_source_page=CASE WHEN public.fja_post_inventory.content_hash IS DISTINCT FROM excluded.content_hash OR public.fja_post_inventory.verified_official_source_url IS DISTINCT FROM ${inventoryRow.official_notification_url} THEN NULL ELSE public.fja_post_inventory.official_source_page END,
            verified_official_source_url=CASE WHEN public.fja_post_inventory.content_hash IS DISTINCT FROM excluded.content_hash OR public.fja_post_inventory.verified_official_source_url IS DISTINCT FROM ${inventoryRow.official_notification_url} THEN NULL ELSE public.fja_post_inventory.verified_official_source_url END,
            verification_notes=CASE WHEN public.fja_post_inventory.content_hash IS DISTINCT FROM excluded.content_hash OR public.fja_post_inventory.verified_official_source_url IS DISTINCT FROM ${inventoryRow.official_notification_url} THEN NULL ELSE public.fja_post_inventory.verification_notes END,
            verified_at=CASE WHEN public.fja_post_inventory.content_hash IS DISTINCT FROM excluded.content_hash OR public.fja_post_inventory.verified_official_source_url IS DISTINCT FROM ${inventoryRow.official_notification_url} THEN NULL ELSE public.fja_post_inventory.verified_at END,
            pay_level_raw=excluded.pay_level_raw,employment_type_raw=excluded.employment_type_raw,
            tenure_raw=excluded.tenure_raw,location_raw=excluded.location_raw,duties_responsibilities_raw=excluded.duties_responsibilities_raw,
            eligibility_conditions_raw=excluded.eligibility_conditions_raw,milestones_raw=excluded.milestones_raw,
            application_selection_raw=excluded.application_selection_raw,
            -- merged, so keys a reviewer added to the row survive the next crawl
            other_info_raw=COALESCE(public.fja_post_inventory.other_info_raw, '{}'::jsonb) || excluded.other_info_raw,
            source_table_row_raw=excluded.source_table_row_raw,extraction_status=excluded.extraction_status,
            -- Changed source facts, or a row still waiting for an official URL, take the status computed for
            -- this crawl; an unchanged row keeps the status a reviewer gave it (VERIFIED, CONFLICT, ...).
            official_verification_status=CASE
              WHEN public.fja_post_inventory.content_hash IS DISTINCT FROM excluded.content_hash
                OR public.fja_post_inventory.verified_official_source_url IS DISTINCT FROM ${inventoryRow.official_notification_url}
                OR public.fja_post_inventory.official_verification_status = 'PENDING'
              THEN excluded.official_verification_status
              ELSE public.fja_post_inventory.official_verification_status END,
            content_hash=excluded.content_hash,last_crawl_run_id=excluded.last_crawl_run_id,last_seen_at=now(),updated_at=now()
          WHERE NOT (COALESCE(public.fja_post_inventory.other_info_raw, '{}'::jsonb) ? 'canonical_post_id')
          RETURNING id
        `;
        if (written.length === 0) {
          const {otherInfoRaw, ...facts} = candidate;
          const crawlCandidate = {
            ...facts, crawlRunId:RUN_ID, capturedAt:new Date().toISOString(),
            evidence:{postTableFields:otherInfoRaw.postTableFields, mergedPostTableRows:otherInfoRaw.mergedPostTableRows, unassignedPostTableRows:otherInfoRaw.unassignedPostTableRows, scopeNote:otherInfoRaw.scopeNote},
          };
          // Published facts and last_seen_at stay exactly as they are; only the review material and the
          // "has an official URL to check against" status move.
          await db`
            UPDATE public.fja_post_inventory SET
              other_info_raw = other_info_raw || ${db.json({crawl_candidate:crawlCandidate} as never)}::jsonb,
              official_verification_status = CASE WHEN official_verification_status = 'PENDING' THEN ${postVerificationStatus} ELSE official_verification_status END,
              last_crawl_run_id = ${RUN_ID}, updated_at = now()
            WHERE source_slug = 'freejobalert' AND external_id = ${parsed.externalId} AND source_post_key = ${candidate.sourcePostKey}
          `;
          liveMappedPostRowsPreserved++;
        }
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
      if (!db) return null;
      const failed:Listing={externalId:item.externalId,sourceUrl:item.url,title:item.title || `FJA article ${item.externalId}`,detailStatus:"FAILED",sourceStatus:"UNKNOWN",details:{extractionError:(error as Error).message},contentHash:sha(item.url+RUN_ID)};
      await db`
        INSERT INTO public.fja_job_inventory (source_slug,external_id,source_url,title,detail_status,source_status,details,content_hash,last_crawl_run_id)
        VALUES ('freejobalert',${failed.externalId},${failed.sourceUrl},${failed.title},'FAILED','UNKNOWN',${db.json(failed.details as never)},${failed.contentHash},${RUN_ID})
        ON CONFLICT (source_slug,external_id) DO UPDATE SET detail_status='FAILED',details=COALESCE(public.fja_job_inventory.details, '{}'::jsonb) || jsonb_build_object('extractionError', excluded.details->'extractionError'),last_crawl_run_id=excluded.last_crawl_run_id,last_seen_at=now(),updated_at=now()
      `;
      return failed;
    }
  });
  const results = resultsWithNulls.filter((item): item is Listing => item !== null);
  await mkdir(OUT,{recursive:true});
  await writeFile(path.join(OUT,"fja-inventory.json"),JSON.stringify({runId:RUN_ID,startedAt,finishedAt:new Date().toISOString(),listingPagesVisited:visitedPages.size,listingPageQueueRemaining:pageQueue.length,sitemapArticleUrls:sitemapUrls.length,discoveredArticleUrls:allItems.length,nonRecruitmentPagesSkipped,failedDetailUrls,results},null,2));
  await writeFile(path.join(OUT,"fja-post-candidates.json"),JSON.stringify({runId:RUN_ID,postCandidates:postCandidateRows},null,2));
  if (RUN_MODE === "window") await writeFile(path.join(OUT,"fja-window-skipped.json"),JSON.stringify({runId:RUN_ID,windowDiscovery,skipped:windowSkipped},null,2));
  const skippedByReason = windowSkipped.reduce<Record<string,number>>((counts, row) => { counts[row.reason] = (counts[row.reason] ?? 0) + 1; return counts; }, {});
  if (!db) {
    console.log(JSON.stringify({runId:RUN_ID,dryRun:true,processed:results.length,postCandidates:postCandidateRows.length,failed:failedDetailUrls.length,skippedByReason,out:OUT}));
    return;
  }
  const summary=await db`select count(*)::int as total, count(*) filter (where detail_status='EXTRACTED')::int as extracted, count(*) filter (where detail_status='PARTIAL')::int as partial, count(*) filter (where detail_status='FAILED')::int as failed from public.fja_job_inventory where source_slug='freejobalert'`;
  console.log(JSON.stringify({runId:RUN_ID,processed:results.length,postCandidates:postCandidateRows.length,failed:failedDetailUrls.length,liveMappedPostRowsPreserved,skippedByReason,summary:summary[0],out:OUT}));
  await db.end();
}
if (process.env.NODE_ENV !== "test") main().catch(error=>{console.error(error);process.exit(1);});
