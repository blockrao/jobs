import * as cheerio from "cheerio";
import type { RawPosting, SourceAdapter } from "../types";
import {
  BROWSER_UA,
  collapse,
  fetchHtml,
  inferOrg,
  logCrawlCap,
  mapPool,
  scoreConfidence,
  sleep,
} from "./util";
import { parseSarkariDetail, type DetailFields } from "./sarkari-detail";

const SOURCE = "sarkariresult";
const BASE = "https://www.sarkariresult.com";
const MAX_LISTING_PAGES = 2;
const MAX_DETAIL_PAGES = 50;

// Homepage carries the Latest Jobs / Result / Admit Card sections (200+ links).
const LISTING_URLS = [`${BASE}/`];

// First path segment values that are hubs/utility pages, not job posts.
const SKIP_SEG =
  /^(terms-and-conditions|privacy-policy|about|about-us|contact|contact-us|disclaimer|category|tag|page|author|feed|sitemap|advertise|latestjob|results?|admit-card|syllabus|answer-key|admission|jobs)$/i;

interface ListItem {
  url: string;
  title: string;
}

function isJobHref(u: URL): boolean {
  if (!/(^|\.)sarkariresult\.com$/i.test(u.hostname)) return false;
  const segs = u.pathname.split("/").filter(Boolean);
  if (segs.length < 2) return false; // job posts are /<cat>/<slug>/
  if (SKIP_SEG.test(segs[0])) return false;
  return segs[segs.length - 1].length >= 4;
}

function extractListing(html: string): ListItem[] {
  const $ = cheerio.load(html);
  const out = new Map<string, ListItem>();
  $("a[href]").each((_, a) => {
    const title = collapse($(a).text());
    const href = $(a).attr("href");
    if (!href || title.length < 12) return;
    let u: URL;
    try {
      u = new URL(href, BASE);
    } catch {
      return;
    }
    if (!isJobHref(u)) return;
    const key = u.pathname.replace(/\/$/, "");
    if (!out.has(key)) out.set(key, { url: u.toString(), title });
  });
  return [...out.values()];
}

function build(item: ListItem, detail: DetailFields): RawPosting {
  const title = detail.title || item.title;
  const org = inferOrg(title);
  const externalId =
    new URL(item.url).pathname.replace(/\/$/, "") || item.url;
  const p: RawPosting = {
    externalId,
    sourceUrl: item.url,
    title,
    kind: "GOVERNMENT",
    organizationName: org.organizationName,
    organizationSector: org.organizationSector,
    organizationState: org.organizationState,
    postNames: detail.postNames,
    description:
      detail.description || `${title}.`,
    eligibility: detail.eligibility,
    totalVacancies: detail.totalVacancies,
    applicationFeeGeneral: detail.applicationFeeGeneral,
    applicationFeeReserved: detail.applicationFeeReserved,
    salaryMin: detail.salaryMin,
    salaryMax: detail.salaryMax,
    locationRegion: org.organizationState,
    locationCountry: "India",
    officialNotificationUrl: detail.officialNotificationUrl,
    applyUrl: detail.applyUrl,
    stageHintText: title,
    datePosted: detail.datePosted,
    validThrough: detail.validThrough,
    examDate: detail.examDate,
  };
  p.confidence = scoreConfidence(p);
  return p;
}

async function fetchRaw(): Promise<RawPosting[]> {
  const listing: ListItem[] = [];
  let pages = 0;
  for (const url of LISTING_URLS.slice(0, MAX_LISTING_PAGES)) {
    try {
      // Aggressive retries with exponential backoff and rotating UAs
      const html = await fetchHtml(url, { ua: BROWSER_UA, retries: 4, retryDelayMs: 2000 });
      listing.push(...extractListing(html));
      pages++;
    } catch (err) {
      console.warn(`  [${SOURCE}] listing ${url} failed: ${(err as Error).message}`);
    }
    await sleep(1000); // increased delay between listing requests
  }
  logCrawlCap(SOURCE, pages, MAX_LISTING_PAGES);

  const unique = [...new Map(listing.map((l) => [l.url, l])).values()];
  const detailTargets = unique.slice(0, MAX_DETAIL_PAGES);
  logCrawlCap(`${SOURCE}:detail`, detailTargets.length, MAX_DETAIL_PAGES);

  const enriched = await mapPool(detailTargets, 4, async (item) => {
    try {
      // Aggressive retries with exponential backoff and rotating UAs
      const html = await fetchHtml(item.url, { ua: BROWSER_UA, retries: 3, retryDelayMs: 1500 });
      await sleep(300); // increased delay between detail requests
      return build(item, parseSarkariDetail(html, item.url));
    } catch (err) {
      console.warn(`  [${SOURCE}] detail ${item.url} failed: ${(err as Error).message}`);
      return build(item, {});
    }
  });

  // Keep listing items beyond the detail cap as title-only rows rather than
  // silently dropping them.
  const overflow = unique.slice(MAX_DETAIL_PAGES).map((item) => build(item, {}));
  if (overflow.length) {
    console.log(
      `  [${SOURCE}] ${overflow.length} listing items kept title-only (beyond detail cap)`,
    );
  }
  return [...enriched, ...overflow];
}

export const sarkariresultAdapter: SourceAdapter = {
  source: SOURCE,
  label: "Sarkari Result",
  fetchRaw,
};
