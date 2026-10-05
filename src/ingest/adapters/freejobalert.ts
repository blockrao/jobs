import * as cheerio from "cheerio";
import type { RawPosting, SourceAdapter } from "../types";
import {
  CLAUDE_UA,
  collapse,
  extractVacancies,
  fetchHtml,
  inferOrg,
  logCrawlCap,
  mapPool,
  parseIndianDate,
  parseSalary,
  scoreConfidence,
  sleep,
} from "./util";
import { buildTableBag, findLink, splitPostNames } from "./sarkari-detail";

const SOURCE = "ext-1";
const BASE = "https://www.freejobalert.com";
const MAX_LISTING_PAGES = 3;
const MAX_DETAIL_PAGES = 50;

// robots.txt explicitly Allows ClaudeBot / anthropic-ai, so we self-identify.
const LISTING_URLS = [
  `${BASE}/`,
  `${BASE}/latest-notifications/`,
  `${BASE}/government-jobs/`,
];

// Posts are /articles/<slug>-<numericId>. The numeric id is the stable key.
const ARTICLE_RE = /\/articles\/[a-z0-9-]+-(\d{4,})\/?$/i;

interface ListItem {
  url: string;
  title: string;
  externalId: string;
}

function extractListing(html: string): ListItem[] {
  const $ = cheerio.load(html);
  const out = new Map<string, ListItem>();
  $('a[href*="/articles/"]').each((_, a) => {
    const href = $(a).attr("href");
    const title = collapse($(a).text());
    if (!href || title.length < 12) return;
    let u: URL;
    try {
      u = new URL(href, BASE);
    } catch {
      return;
    }
    const m = u.pathname.match(ARTICLE_RE);
    if (!m) return;
    if (!out.has(m[1])) {
      out.set(m[1], { url: u.toString(), title, externalId: m[1] });
    }
  });
  return [...out.values()];
}

function parseDetail(html: string, baseUrl: string): Partial<RawPosting> {
  const { $, bag } = buildTableBag(html);
  const recruiting = bag.find(/recruiting body/i, /organi[sz]ation/i, /department/i);
  const vacancies = extractVacancies(
    bag.find(/total vacan/i, /no\.? of (post|vacan)/i, /vacancies/i),
  );
  // Same "Name of Post" label these table-based portals all use — see
  // sarkari-detail.ts's splitPostNames for why only a genuine Name-of-Post
  // match (never the page headline) is safe to split into an array.
  const postNames = splitPostNames(
    bag.find(/^name of post$/i, /^post name$/i, /post name\(s\)/i),
  );
  const applyUrl = findLink($, /apply online|apply now|registration/i, baseUrl);
  const officialNotificationUrl = findLink(
    $,
    /notification|advertisement|download notice|official notice/i,
    baseUrl,
  );
  const datePosted = parseIndianDate(
    bag.find(/notification date/i, /application start/i, /start of online/i, /post date/i),
  );
  const validThrough = parseIndianDate(
    bag.find(
      /last date to (apply|submit)/i,
      /last date.*application/i,
      /closing date/i,
      /^last date$/i,
    ),
  );
  const examDate = parseIndianDate(bag.find(/exam date/i, /date of exam/i, /tier.?i.*date/i));
  const jobLocation = bag.find(/job location/i, /location/i, /place of posting/i);
  const eligibility = bag.find(/qualification/i, /eligib/i, /educational/i);
  const { salaryMin, salaryMax } = parseSalary(
    bag.find(/salary|pay scale|pay level|remuneration|pay matrix/i),
  );
  const description =
    collapse($('meta[name="description"]').attr("content") || "") ||
    collapse($("article p, .entry-content p").first().text());

  return {
    organizationName: recruiting,
    totalVacancies: vacancies,
    datePosted,
    validThrough,
    examDate,
    eligibility,
    locationRegion: jobLocation,
    salaryMin,
    salaryMax,
    description: description || undefined,
    postNames,
    applyUrl,
    officialNotificationUrl,
  };
}

function build(item: ListItem, detail: Partial<RawPosting>): RawPosting {
  const title = item.title;
  const inferred = inferOrg(title);
  const p: RawPosting = {
    externalId: item.externalId,
    sourceUrl: item.url,
    title,
    kind: "GOVERNMENT",
    // Prefer the explicit "Recruiting Body" from the detail table when present.
    organizationName: detail.organizationName || inferred.organizationName,
    organizationSector: inferred.organizationSector,
    organizationState: inferred.organizationState,
    description: detail.description || `${title}.`,
    eligibility: detail.eligibility,
    totalVacancies: detail.totalVacancies ?? extractVacancies(title),
    salaryMin: detail.salaryMin,
    salaryMax: detail.salaryMax,
    locationRegion: detail.locationRegion || inferred.organizationState,
    locationCountry: "India",
    stageHintText: title,
    datePosted: detail.datePosted,
    validThrough: detail.validThrough,
    examDate: detail.examDate,
    postNames: detail.postNames,
    applyUrl: detail.applyUrl,
    officialNotificationUrl: detail.officialNotificationUrl,
  };
  p.confidence = scoreConfidence(p);
  return p;
}

async function fetchRaw(): Promise<RawPosting[]> {
  const listing: ListItem[] = [];
  let pages = 0;
  for (const url of LISTING_URLS.slice(0, MAX_LISTING_PAGES)) {
    try {
      // FreeJobAlert explicitly allows ClaudeBot, but still use retries for resilience
      const html = await fetchHtml(url, { ua: CLAUDE_UA, retries: 3, retryDelayMs: 1500 });
      listing.push(...extractListing(html));
      pages++;
    } catch (err) {
      console.warn(`  [${SOURCE}] listing ${url} failed: ${(err as Error).message}`);
    }
    await sleep(600); // reasonable delay between listing requests
  }
  logCrawlCap(SOURCE, pages, MAX_LISTING_PAGES);

  const unique = [...new Map(listing.map((l) => [l.externalId, l])).values()];
  const detailTargets = unique.slice(0, MAX_DETAIL_PAGES);
  logCrawlCap(`${SOURCE}:detail`, detailTargets.length, MAX_DETAIL_PAGES);

  const enriched = await mapPool(detailTargets, 4, async (item) => {
    try {
      // Retries with exponential backoff (FreeJobAlert allows ClaudeBot, but doesn't hurt)
      const html = await fetchHtml(item.url, { ua: CLAUDE_UA, retries: 3, retryDelayMs: 1500 });
      await sleep(250); // increased delay between detail requests
      return build(item, parseDetail(html, item.url));
    } catch (err) {
      console.warn(`  [${SOURCE}] detail ${item.url} failed: ${(err as Error).message}`);
      return build(item, {});
    }
  });

  const overflow = unique.slice(MAX_DETAIL_PAGES).map((item) => build(item, {}));
  if (overflow.length) {
    console.log(
      `  [${SOURCE}] ${overflow.length} listing items kept title-only (beyond detail cap)`,
    );
  }
  return [...enriched, ...overflow];
}

export const freejobalertAdapter: SourceAdapter = {
  source: SOURCE,
  label: "FreeJobAlert",
  fetchRaw,
};
