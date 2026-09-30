import type { RawPosting, SourceAdapter } from "../types";
import {
  BROWSER_UA,
  WafBlockError,
  collapse,
  fetchHtml,
  inferOrg,
  logCrawlCap,
  mapPool,
  scoreConfidence,
  sleep,
} from "./util";
import { parseRscSarkariDetail, type DetailFields } from "./sarkari-detail";

const SOURCE = "indiasarkarinaukri";
const BASE = "https://www.indiasarkarinaukri.com";
// This portal WAF-blocks non-browser agents and occasionally blocks even a
// browser UA, so detail fetches retry once after 2s. Detail cap is lower to
// keep the WAF cost down.
const MAX_LISTING_PAGES = 2;
const MAX_DETAIL_PAGES = 30;

// The /vacancy/ sitemap is the reliable structured listing (homepage is a
// Next.js RSC stream). Fall back to the sitemap index if this one moves.
const LISTING_SITEMAPS = [
  `${BASE}/govt-job-sitemap.xml`,
  `${BASE}/page-sitemap.xml`,
];

interface ListItem {
  url: string;
  title: string;
}

function slugToTitle(u: URL): string {
  const slug = u.pathname.split("/").filter(Boolean).pop() ?? "";
  return collapse(
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );
}

function extractVacancyUrls(xml: string): ListItem[] {
  const out = new Map<string, ListItem>();
  for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    let u: URL;
    try {
      u = new URL(m[1]);
    } catch {
      continue;
    }
    if (!/\/vacancy\//i.test(u.pathname)) continue;
    const key = u.pathname.replace(/\/$/, "");
    if (!out.has(key)) out.set(key, { url: u.toString(), title: slugToTitle(u) });
  }
  return [...out.values()];
}

function build(item: ListItem, detail: DetailFields): RawPosting {
  const title = detail.title || item.title;
  const org = inferOrg(title);
  const externalId = new URL(item.url).pathname.replace(/\/$/, "") || item.url;
  const p: RawPosting = {
    externalId,
    sourceUrl: item.url,
    title,
    kind: "GOVERNMENT",
    organizationName: org.organizationName,
    organizationSector: org.organizationSector,
    organizationState: org.organizationState,
    description:
      detail.description ||
      `${title} — recruitment notification via India Sarkari Naukri.`,
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
  const wafBlocks: string[] = [];

  for (const url of LISTING_SITEMAPS.slice(0, MAX_LISTING_PAGES)) {
    try {
      // Aggressive retries with exponential backoff and rotating UAs
      const xml = await fetchHtml(url, { ua: BROWSER_UA, retries: 4, retryDelayMs: 2000 });
      listing.push(...extractVacancyUrls(xml));
      pages++;
    } catch (err) {
      if (err instanceof WafBlockError) {
        wafBlocks.push(url);
        console.warn(`  [${SOURCE}] WAF BLOCK on listing ${url} — flagged for manual review`);
      } else {
        console.warn(`  [${SOURCE}] listing ${url} failed: ${(err as Error).message}`);
      }
    }
    await sleep(1000); // increased delay between listing requests
  }
  logCrawlCap(SOURCE, pages, MAX_LISTING_PAGES);

  const unique = [...new Map(listing.map((l) => [l.url, l])).values()];
  const detailTargets = unique.slice(0, MAX_DETAIL_PAGES);
  logCrawlCap(`${SOURCE}:detail`, detailTargets.length, MAX_DETAIL_PAGES);

  const enriched = await mapPool(detailTargets, 3, async (item) => {
    try {
      // Aggressive retries with exponential backoff and rotating UAs
      const html = await fetchHtml(item.url, {
        ua: BROWSER_UA,
        retries: 4,
        retryDelayMs: 1500,
      });
      await sleep(400); // increased delay between detail requests
      return build(item, parseRscSarkariDetail(html, item.url));
    } catch (err) {
      if (err instanceof WafBlockError) {
        wafBlocks.push(item.url);
        console.warn(`  [${SOURCE}] WAF BLOCK on ${item.url} — kept title-only`);
      } else {
        console.warn(`  [${SOURCE}] detail ${item.url} failed: ${(err as Error).message}`);
      }
      return build(item, {});
    }
  });

  const overflow = unique.slice(MAX_DETAIL_PAGES).map((item) => build(item, {}));
  if (overflow.length) {
    console.log(
      `  [${SOURCE}] ${overflow.length} listing items kept title-only (beyond detail cap)`,
    );
  }
  if (wafBlocks.length) {
    console.warn(`  [${SOURCE}] ${wafBlocks.length} WAF blocks total (manual review):`);
    for (const u of wafBlocks.slice(0, 10)) console.warn(`      - ${u}`);
  }
  return [...enriched, ...overflow];
}

export const indiasarkarinaukriAdapter: SourceAdapter = {
  source: SOURCE,
  label: "India Sarkari Naukri",
  fetchRaw,
};
