import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { RawPosting, SourceAdapter } from "../types";
import {
  BROWSER_UA,
  collapse,
  extractVacancies,
  fetchHtml,
  inferOrg,
  logCrawlCap,
  parseIndianDate,
  scoreConfidence,
  sleep,
} from "./util";

const SOURCE = "sahisarkarijobs";
const BASE = "https://www.sahisarkarijobs.in";
const MAX_LISTING_PAGES = 2;

// robots.txt disallows the dated archive paths (/2024/, /2025/, /2026/). The
// actual posts live at /job/<slug>, but per project policy this adapter stays
// listing-only and NEVER fetches a detail page — everything is parsed from the
// homepage/category card markup.
const LISTING_URLS = [`${BASE}/`];
const DISALLOWED = /\/20(2[4-9]|[3-9]\d)\//; // safety guard, never fetched anyway

interface Card {
  url: string;
  title: string;
  cardText: string;
}

// The whole card is wrapped in the anchor, so its text() bundles the title
// with badges/date/view-count metadata (e.g. "🔥 Hot … 👁 12,122 views Ends
// 31 May Apply ›"). Prefer an inner heading; otherwise cut at the first badge
// emoji or trailing metadata keyword.
function cleanTitle($: cheerio.CheerioAPI, a: Element): string {
  const heading = collapse($(a).find("h1,h2,h3,h4,.title,.job-title").first().text());
  if (heading.length >= 15) return heading;
  let t = collapse($(a).text());
  t = t.split(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u)[0]; // stop at first emoji
  t = t.split(/\s+(?:Ends\b|Views\b|·|»|›)/i)[0];
  return collapse(t);
}

function extractCards(html: string): Card[] {
  const $ = cheerio.load(html);
  const out = new Map<string, Card>();
  $('a[href*="/job/"]').each((_, a) => {
    const href = $(a).attr("href");
    if (!href) return;
    let u: URL;
    try {
      u = new URL(href, BASE);
    } catch {
      return;
    }
    if (!/\/job\//.test(u.pathname) || DISALLOWED.test(u.pathname)) return;
    const title = cleanTitle($, a);
    if (title.length < 15) return;
    // Full card text retained for inline date/deadline parsing.
    const cardText = collapse($(a).closest("article, li, .card, .ssj-card, div").text()).slice(0, 500);
    const key = u.pathname.replace(/\/$/, "");
    if (!out.has(key)) out.set(key, { url: u.toString(), title, cardText });
  });
  return [...out.values()];
}

function build(card: Card): RawPosting {
  const org = inferOrg(card.title);
  const externalId = new URL(card.url).pathname.replace(/\/$/, "");
  // Parse whatever the listing card exposes (title + surrounding text only).
  const lastDate =
    card.cardText.match(
      /last date[:\s]+([0-9]{1,2}[\s/-][A-Za-z0-9]+[\s/-][0-9]{2,4})/i,
    ) ||
    // "Ends 31 May 2026" — only trust it when a 4-digit year is present.
    card.cardText.match(/\bEnds\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
  const p: RawPosting = {
    externalId,
    sourceUrl: card.url,
    title: card.title,
    kind: "GOVERNMENT",
    organizationName: org.organizationName,
    organizationSector: org.organizationSector,
    organizationState: org.organizationState,
    description: `${card.title}.`,
    totalVacancies: extractVacancies(card.title),
    locationRegion: org.organizationState,
    locationCountry: "India",
    stageHintText: card.title,
    validThrough: parseIndianDate(lastDate?.[1]),
  };
  p.confidence = scoreConfidence(p);
  return p;
}

async function fetchRaw(): Promise<RawPosting[]> {
  const cards: Card[] = [];
  let pages = 0;
  for (const url of LISTING_URLS.slice(0, MAX_LISTING_PAGES)) {
    try {
      // Aggressive retries with exponential backoff and rotating UAs
      const html = await fetchHtml(url, { ua: BROWSER_UA, retries: 4, retryDelayMs: 2000 });
      cards.push(...extractCards(html));
      pages++;
    } catch (err) {
      console.warn(`  [${SOURCE}] listing ${url} failed: ${(err as Error).message}`);
    }
    await sleep(1000); // increased delay between listing requests
  }
  logCrawlCap(SOURCE, pages, MAX_LISTING_PAGES);
  console.log(`  [${SOURCE}] listing-only mode: 0 detail pages fetched (robots policy)`);

  const unique = [...new Map(cards.map((c) => [c.url, c])).values()];
  return unique.map(build);
}

export const sahisarkarijobsAdapter: SourceAdapter = {
  source: SOURCE,
  label: "Sahi Sarkari Jobs",
  fetchRaw,
};
