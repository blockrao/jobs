import * as cheerio from "cheerio";
import type { RawPosting } from "../types";
import {
  LabelBag,
  collapse,
  extractVacancies,
  parseIndianDate,
  parseSalary,
} from "./util";

// Fields we can enrich a listing item with from a "sarkariresult-style" detail
// page (a page built around Important Dates / Vacancy Details / fee tables).
export type DetailFields = Partial<
  Pick<
    RawPosting,
    | "title"
    | "description"
  | "eligibility"
  | "totalVacancies"
  | "datePosted"
  | "validThrough"
  | "examDate"
  | "salaryMin"
  | "salaryMax"
  | "applicationFeeGeneral"
  | "applicationFeeReserved"
  | "officialNotificationUrl"
    | "applyUrl"
  >
>;

/** Decode loose %XX URL-encoding (used inside indiasarkarinaukri's RSC stream). */
export function urlDecodeLoose(s: string): string {
  return s.replace(/(?:%[0-9A-Fa-f]{2})+/g, (m) => {
    try {
      return decodeURIComponent(m);
    } catch {
      return m;
    }
  });
}

/**
 * Harvest label:value pairs from an HTML fragment: every 2-column table row
 * becomes a pair, and any cell/heading region mentioning "Important Dates" is
 * additionally line-parsed (those sites cram all dates into one cell).
 */
function harvestBag($: cheerio.CheerioAPI): LabelBag {
  const bag = new LabelBag();
  $("tr").each((_, tr) => {
    const tds = $(tr).children("td,th");
    const cells = tds
      .map((__, c) => collapse($(c).text()))
      .get()
      .filter(Boolean);
    if (cells.length >= 2) bag.add(cells[0], cells.slice(1).join(" | "));
    // Cells like "Important Dates" / "Application Fee" pack several labelled
    // lines separated by <br>; .text() loses those breaks, so line-parse the
    // raw HTML (addFromText turns <br> back into newlines) for granular pairs.
    tds.each((__, c) => {
      const inner = $(c).html() || "";
      if (/<br|<li/i.test(inner)) bag.addFromText(inner);
    });
  });
  // Fallback: any element whose text starts with the Important Dates heading.
  const blobEl = $("td,div,p,section")
    .filter((_, el) => /important dates/i.test($(el).text().slice(0, 40)))
    .first();
  if (blobEl.length) bag.addFromText(blobEl.html() || blobEl.text());
  return bag;
}

function pickFields(
  $: cheerio.CheerioAPI,
  bag: LabelBag,
  baseUrl: string,
): DetailFields {
  const title =
    bag.find(/^name of post$/i, /^post name$/i) ||
    collapse($("h1").first().text()) ||
    undefined;

  const datePosted = parseIndianDate(
    bag.find(/post date/i, /update/i, /notification date/i),
  );
  const validThrough = parseIndianDate(
    bag.find(
      /last date.*(apply|online|application|submission)/i,
      /application end/i,
      /closing date/i,
      /^last date$/i,
    ),
  );
  const examDate = parseIndianDate(
    bag.find(/exam date/i, /date of exam/i, /written exam/i, /tier.?i.*date/i),
  );

  const totalVacancies = extractVacancies(
    bag.find(/total (post|vacan)/i, /no\.? of post/i, /number of post/i) ||
      collapse($("h1").first().text()),
  );

  const eligibility = bag.find(
    /eligib/i, /qualification/i, /educational/i,
  );

  const feeGeneral = intOrUndef(bag.find(/fee.*(general|gen|obc|ews|unreserved)/i));
  const feeReserved = intOrUndef(bag.find(/fee.*(sc|st|ph|pwd|reserved|female)/i));

  const salaryText = bag.find(/salary|pay scale|pay matrix|pay level|remuneration/i);
  const { salaryMin, salaryMax } = parseSalary(salaryText);

  const applyUrl = findLink($, /apply online|apply now|registration/i, baseUrl);
  const officialNotificationUrl = findLink(
    $,
    /notification|advertisement|download notice|official notice/i,
    baseUrl,
  );

  const shortInfo = bag.find(/short info/i, /^details$/i, /overview/i);

  return {
    title,
    description: shortInfo,
    eligibility,
    totalVacancies,
    datePosted,
    validThrough,
    examDate,
    salaryMin,
    salaryMax,
    applicationFeeGeneral: feeGeneral,
    applicationFeeReserved: feeReserved,
    applyUrl,
    officialNotificationUrl,
  };
}

function intOrUndef(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const m = v.replace(/,/g, "").match(/\d{1,6}/);
  return m ? parseInt(m[0], 10) : undefined;
}

function findLink(
  $: cheerio.CheerioAPI,
  labelRe: RegExp,
  baseUrl: string,
): string | undefined {
  let href: string | undefined;
  $("a").each((_, a) => {
    if (href) return;
    const text = collapse($(a).text());
    const h = $(a).attr("href");
    if (h && labelRe.test(text) && /^https?:|^\//.test(h)) {
      try {
        href = new URL(h, baseUrl).toString();
      } catch {
        /* ignore malformed href */
      }
    }
  });
  return href;
}

/** Parse a standard (table-based) sarkariresult-style detail page. */
export function parseSarkariDetail(html: string, sourceUrl: string): DetailFields {
  const $ = cheerio.load(html);
  return pickFields($, harvestBag($), sourceUrl);
}

/**
 * Generic label harvest for other portals (e.g. freejobalert's
 * Particulars/Details tables). Returns the loaded document plus the bag so the
 * caller can also read anchors/headings.
 */
export function buildTableBag(html: string): {
  $: cheerio.CheerioAPI;
  bag: LabelBag;
} {
  const $ = cheerio.load(html);
  return { $, bag: harvestBag($) };
}

/**
 * indiasarkarinaukri renders the same content model but URL-encoded inside a
 * Next.js RSC stream. Decode it first, then parse. We also keep the rendered
 * <h1> for a reliable title/vacancy fallback.
 */
export function parseRscSarkariDetail(html: string, sourceUrl: string): DetailFields {
  const rendered = cheerio.load(html);
  const h1 = collapse(rendered("h1").first().text());

  const decoded = urlDecodeLoose(html);
  const $ = cheerio.load(decoded);
  const bag = harvestBag($);
  // The decoded RSC often has the dates as "Label : value<br>" text rather
  // than table rows, and sits deep in a multi-MB stream. Line-parse a window
  // around the Important Dates heading (falling back to the head of the body).
  const idx = decoded.search(/important\W*dates/i);
  const region = idx >= 0 ? decoded.slice(idx, idx + 6000) : decoded.slice(0, 30000);
  bag.addFromText(region);

  const fields = pickFields($, bag, sourceUrl);
  if (h1) {
    fields.title = fields.title || h1;
    fields.totalVacancies = fields.totalVacancies ?? extractVacancies(h1);
  }
  return fields;
}
