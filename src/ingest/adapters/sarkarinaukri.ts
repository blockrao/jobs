import * as cheerio from "cheerio";
import type { RawPosting, SourceAdapter } from "../types";
import {
  BROWSER_UA,
  LabelBag,
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

const SOURCE = "sarkarinaukri";
const BASE = "https://www.sarkari-naukri.in";
const SITEMAP_INDEX = `${BASE}/sitemap_index.xml`;
const MAX_LISTING_PAGES = 3; // post-sitemap*.xml files
const MAX_DETAIL_PAGES = 50;

// Sitemap URLs that are hubs/utility pages rather than job posts.
const SKIP_PATH =
  /^\/(admit-card|results?|answer-key|syllabus|category|tag|page|author|about|contact|privacy|disclaimer|sitemap)/i;

interface ListItem {
  url: string;
}

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1]);
}

function isJobUrl(u: URL): boolean {
  if (!/sarkari-naukri\.in$/i.test(u.hostname.replace(/^www\./, ""))) return false;
  const segs = u.pathname.split("/").filter(Boolean);
  if (segs.length !== 1) return false; // posts are /<org-slug>/
  if (SKIP_PATH.test(u.pathname)) return false;
  return segs[0].length >= 3;
}

// Detail pages are prose (no field tables); the Yoast meta description carries
// the structured summary: "<...> Last Date <date> (<City>, <State>), For <qual>".
function parseDetail(html: string): Partial<RawPosting> {
  const $ = cheerio.load(html);
  const metaDesc =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  const title =
    collapse($("h1").first().text()) ||
    $('meta[property="og:title"]').attr("content") ||
    collapse($("title").text());

  const bodyText = collapse($("article, main, .entry-content, body").first().text()).slice(0, 6000);
  const bag = new LabelBag();
  bag.addFromText(metaDesc);
  bag.addFromText(bodyText);

  const lastDate = metaDesc.match(/last date[:\s]+([0-9]{1,2}[\s/-][A-Za-z0-9]+[\s/-][0-9]{2,4})/i);
  const loc = metaDesc.match(/\(([^,)]+),\s*([^)]+)\)/);
  const qual = metaDesc.match(/\bfor\s+([A-Za-z0-9 ./&,+-]{3,60}?)(?:,|\.|$)/i);

  const out: Partial<RawPosting> = {
    title: title || undefined,
    description: collapse(metaDesc) || undefined,
    validThrough:
      parseIndianDate(lastDate?.[1]) ||
      parseIndianDate(bag.find(/last date/i, /closing date/i, /application end/i)),
    examDate: parseIndianDate(bag.find(/exam date/i, /date of exam/i)),
    datePosted: parseIndianDate(bag.find(/post date/i, /published/i, /notification date/i)),
    totalVacancies: extractVacancies(bag.find(/vacan/i, /total post/i) || title),
    eligibility: qual ? collapse(qual[1]) : bag.find(/qualification/i, /eligib/i),
    locationCity: loc ? collapse(loc[1]) : undefined,
    locationRegion: loc ? collapse(loc[2]) : undefined,
  };
  const { salaryMin, salaryMax } = parseSalary(bag.find(/salary|pay scale|pay/i));
  out.salaryMin = salaryMin;
  out.salaryMax = salaryMax;
  return out;
}

function build(item: ListItem, detail: Partial<RawPosting>): RawPosting {
  const title =
    detail.title ||
    collapse(
      new URL(item.url).pathname
        .replace(/\//g, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    );
  const org = inferOrg(title);
  const externalId = new URL(item.url).pathname.replace(/\/$/, "") || item.url;
  const p: RawPosting = {
    externalId,
    sourceUrl: item.url,
    title,
    kind: "GOVERNMENT",
    organizationName: org.organizationName,
    organizationSector: org.organizationSector,
    organizationState: detail.locationRegion || org.organizationState,
    description: detail.description || `${title} — recruitment via Sarkari Naukri.`,
    eligibility: detail.eligibility,
    totalVacancies: detail.totalVacancies,
    salaryMin: detail.salaryMin,
    salaryMax: detail.salaryMax,
    locationCity: detail.locationCity,
    locationRegion: detail.locationRegion || org.organizationState,
    locationCountry: "India",
    stageHintText: title,
    datePosted: detail.datePosted,
    validThrough: detail.validThrough,
    examDate: detail.examDate,
  };
  p.confidence = scoreConfidence(p);
  return p;
}

async function fetchRaw(): Promise<RawPosting[]> {
  // Resolve the post-sitemap*.xml files from the sitemap index (newest first).
  // Use aggressive retries with exponential backoff and rotating UAs to bypass WAF.
  let postSitemaps: string[] = [];
  try {
    const idx = await fetchHtml(SITEMAP_INDEX, { ua: BROWSER_UA, retries: 4, retryDelayMs: 2000 });
    postSitemaps = locs(idx)
      .filter((u) => /post-sitemap\d*\.xml$/i.test(u))
      .reverse(); // highest-numbered (most recent) first
  } catch (err) {
    console.warn(`  [${SOURCE}] sitemap index failed: ${(err as Error).message}`);
  }

  const listing: ListItem[] = [];
  let pages = 0;
  for (const sm of postSitemaps.slice(0, MAX_LISTING_PAGES)) {
    try {
      const xml = await fetchHtml(sm, { ua: BROWSER_UA, retries: 3, retryDelayMs: 2000 });
      for (const raw of locs(xml)) {
        try {
          const u = new URL(raw);
          if (isJobUrl(u)) listing.push({ url: u.toString() });
        } catch {
          /* skip malformed */
        }
      }
      pages++;
    } catch (err) {
      console.warn(`  [${SOURCE}] sitemap ${sm} failed: ${(err as Error).message}`);
    }
    await sleep(800); // increased delay between sitemap requests
  }
  logCrawlCap(SOURCE, pages, MAX_LISTING_PAGES);

  const unique = [...new Map(listing.map((l) => [l.url, l])).values()];
  const detailTargets = unique.slice(0, MAX_DETAIL_PAGES);
  logCrawlCap(`${SOURCE}:detail`, detailTargets.length, MAX_DETAIL_PAGES);

  const enriched = await mapPool(detailTargets, 4, async (item) => {
    try {
      const html = await fetchHtml(item.url, { ua: BROWSER_UA, retries: 3, retryDelayMs: 1500 });
      await sleep(300); // increased delay between detail requests
      return build(item, parseDetail(html));
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

export const sarkarinaukriAdapter: SourceAdapter = {
  source: SOURCE,
  label: "Sarkari Naukri",
  fetchRaw,
};
