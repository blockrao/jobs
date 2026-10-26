import * as cheerio from "cheerio";

export type FjaResearchFacts = Record<string, string | null>;
export interface FjaResearchLink {
  text: string;
  url: string;
  host: string;
  source_class: "freejobalert" | "external_candidate";
}
export interface FjaResearchParse {
  page_title: string | null;
  detail_text: string;
  facts: FjaResearchFacts;
  date_candidates: Array<{ label: string; date: string; kind: "application_end" | "application_start" | "walk_in" | "notification" | "other" }>;
  official_links: FjaResearchLink[];
  open_status: "OPEN_AS_OF_CUTOFF" | "CLOSED_BY_CUTOFF" | "REVIEW_DATE_UNCLEAR" | "REVIEW_WALKIN_DATE_UNCLEAR";
  derived_close_date: string | null;
  review_reasons: string[];
}

const LABELS: Record<string, RegExp> = {
  organization: /^(?:recruiting body|recruiting organization|recruiting organisation|organization|organisation|company name|recruiting authority)$/i,
  post_name: /^(?:name of posts?|post names?|post name\(s\)|name of post\(s\))$/i,
  vacancies: /^(?:total vacancies|total vacancy|total posts|total no.? of posts|total no.? of vacancies|number of vacancies|number of posts|no.? of posts|no.? of vacancies|vacancies)$/i,
  qualification: /^(?:qualification|educational qualification|eligibility|education qualification|essential qualification)$/i,
  age_limit: /^(?:age limit|age criteria|age limit as on.*)$/i,
  salary_pay: /^(?:salary|pay scale|pay level|remuneration|pay matrix|pay)$/i,
  application_start_date: /^(?:starting date|application start date|online application start date|start date|starting date for online application)$/i,
  walk_in_date: /^(?:walk[- ]?in date|interview date|date of interview|reporting date|document verification date)$/i,
  application_end_date: /^(?:last date|last date to apply|last date to apply online|last date of application|last date of receiving application|last date of application submission|last date for submission|application end date|application last date|closing date|apply by)$/i,
  notification_date: /^(?:notification date|published date|post date|notification release date|advertisement release date)$/i,
  job_location: /^(?:job location|location|place of posting)$/i,
  advertisement_number: /^(?:advertisement no.?|advt.? no.?|notification no.?|reference no.?|advertisement number)$/i,
};

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const cleanLabel = (s: string) => collapse(s).replace(/\s*[:：]\s*$/, "").replace(/\s+/g, " ").trim();
const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
  sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

function validIsoDate(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (year < 2020 || year > 2100 || d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parses Indian day-first numeric dates and common written dates without guessing missing years. */
export function parseFjaDate(input: string): string | null {
  const text = collapse(input).replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  const numeric = [...text.matchAll(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/g)];
  for (const m of numeric) {
    const parsed = validIsoDate(Number(m[3]), Number(m[2]), Number(m[1]));
    if (parsed) return parsed;
  }
  const written = [
    ...text.matchAll(/\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?[,]?\s+(\d{4})\b/gi),
    ...text.matchAll(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi),
  ];
  for (const m of written) {
    if (/^\d/.test(m[1])) {
      const month = MONTHS[m[2].toLowerCase().replace(".", "")];
      const parsed = validIsoDate(Number(m[3]), month, Number(m[1]));
      if (parsed) return parsed;
    } else {
      const month = MONTHS[m[1].toLowerCase().replace(".", "")];
      const parsed = validIsoDate(Number(m[3]), month, Number(m[2]));
      if (parsed) return parsed;
    }
  }
  return null;
}

function dateKind(label: string): "application_end" | "application_start" | "walk_in" | "notification" | "other" {
  if (/walk[- ]?in|interview|reporting|document verification/i.test(label)) return "walk_in";
  if (/last date|closing date|application end|apply by|application last/i.test(label)) return "application_end";
  if (/start date|commencement|opening date/i.test(label)) return "application_start";
  if (/notification|published|advertisement release|post date/i.test(label)) return "notification";
  return "other";
}

function absoluteSourceLink(href: string, baseUrl: string): FjaResearchLink | null {
  try {
    const url = new URL(href, baseUrl);
    if (url.protocol !== "https:" || !url.hostname) return null;
    const host = url.hostname.toLowerCase();
    const isFja = host === "freejobalert.com" || host.endsWith(".freejobalert.com");
    return {
      text: "",
      url: url.toString(),
      host,
      source_class: isFja ? "freejobalert" : "external_candidate",
    };
  } catch {
    return null;
  }
}

/**
 * Conservative parser for research-only capture. Only exact, recognized labels
 * in key/value-like tables are mapped to facts. Post-wise tables and section
 * headers are intentionally not flattened into recruitment-level facts.
 */
export function parseFjaResearchDetail(html: string, url: string, asOfDate: string): FjaResearchParse {
  const $ = cheerio.load(html);
  const title = collapse($("h1").first().text() || $("meta[property='og:title']").attr("content") || $("title").text());
  const root = $("main").length ? $("main").first() : $("article").length ? $("article").first() : $("body");
  const detailText = collapse(root.text()).slice(0, 50000);
  const facts: FjaResearchFacts = {};
  const candidates: FjaResearchParse["date_candidates"] = [];

  root.find("table").each((_, table) => {
    const rows = $(table).find("tr").toArray().map((tr) =>
      $(tr).children("th,td").toArray().map((cell) => collapse($(cell).text())).filter(Boolean),
    ).filter((row) => row.length >= 2);
    if (!rows.length) return;
    const first = rows[0].map((v) => cleanLabel(v).toLowerCase());
    const headerLooksLikeBreakdown = first.some((v) => /^(?:post|post name|department|organization|organisation|category|subject|resource|link description|s.? no.?)$/.test(v))
      && first.some((v) => /vacanc|qualification|pay|scale|link|details|marks|total/.test(v));
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i];
      if (i === 0 && /^(?:particulars|event|key|field|label|resource|link description)$/i.test(cells[0])) continue;
      if (headerLooksLikeBreakdown && i === 0) continue;
      // Multi-column breakdown rows are not reliable key/value facts.
      if (cells.length !== 2) continue;
      const label = cleanLabel(cells[0]);
      const value = collapse(cells[1]);
      const headerLikeValue = /^(?:post(?: name)?|post name\(s\)|vacancies|qualification|educational qualification information|pay|details|organization|organisation|department)(?:\s*[|/]\s*(?:post(?: name)?|vacancies|qualification|details|total))?$/i.test(value);
      if (!label || !value || headerLikeValue) continue;
      for (const [field, re] of Object.entries(LABELS)) {
        if (re.test(label) && !facts[field]) {
          facts[field] = value;
          if (field.endsWith("_date") || field === "notification_date") {
            const date = parseFjaDate(value);
            if (date) candidates.push({ label, date, kind: dateKind(label) });
          }
          break;
        }
      }
    }
  });

  // Also find dates in the visible article text, but preserve their labels and
  // distinguish interview dates from application deadlines.
  const datePattern = /((?:last date(?: to apply| to apply online| of application| of receiving application| for submission)?|application last date|application start date|online application start date|closing date|apply by|walk[- ]?in(?: date)?|interview date|date of interview|reporting date|document verification date|notification date|notification release date)\s*[:\-–]?\s*[^.;]{0,90})/gi;
  for (const match of detailText.matchAll(datePattern)) {
    const labelText = collapse(match[1]);
    const date = parseFjaDate(labelText);
    if (!date) continue;
    const kind = dateKind(labelText);
    if (!candidates.some((c) => c.date === date && c.kind === kind)) candidates.push({ label: labelText.slice(0, 100), date, kind });
  }

  const links: FjaResearchLink[] = [];
  root.find("a[href]").each((_, a) => {
    const parsed = absoluteSourceLink($(a).attr("href") || "", url);
    if (!parsed) return;
    const text = collapse($(a).text());
    if (!text || /^(?:notifications|latest notifications|home|read more|click here|here)$/i.test(text)) return;
    // The captured page is FJA, so these are source-side candidate links only.
    // A link is not labelled official solely because its anchor says "official".
    if (/official|notification|advertisement|application form|apply online|download/i.test(text) && !/freejobalert\.com/i.test(parsed.url)) {
      links.push({ ...parsed, text, source_class: "external_candidate" });
    }
  });
  const uniqueLinks = [...new Map(links.map((link) => [link.url, link])).values()];
  const endDate = facts.application_end_date ? parseFjaDate(facts.application_end_date) : null;
  const endCandidate = candidates.find((candidate) => candidate.kind === "application_end");
  const closeDate = endDate || endCandidate?.date || null;
  const walkIn = candidates.find((candidate) => candidate.kind === "walk_in");
  const reviewReasons: string[] = [];
  let openStatus: FjaResearchParse["open_status"] = "REVIEW_DATE_UNCLEAR";
  if (closeDate) openStatus = closeDate >= asOfDate ? "OPEN_AS_OF_CUTOFF" : "CLOSED_BY_CUTOFF";
  else if (walkIn) {
    openStatus = "REVIEW_WALKIN_DATE_UNCLEAR";
    reviewReasons.push("Walk-in/interview dates are not equivalent to an application closing date.");
  } else {
    reviewReasons.push("No unambiguous application closing date was extracted.");
  }
  if (!facts.organization) reviewReasons.push("Recruiting organization was not extracted from a recognized key/value row.");
  if (!facts.post_name) reviewReasons.push("A recruitment-level post name was not extracted; inspect post-wise tables and official notice.");
  if (!facts.vacancies) reviewReasons.push("Total recruitment vacancies were not extracted from a recognized key/value row.");
  if (!uniqueLinks.length) reviewReasons.push("No candidate official-source links were identified; inspect the source page manually.");

  return {
    page_title: title || null,
    detail_text: detailText,
    facts,
    date_candidates: candidates,
    official_links: uniqueLinks,
    open_status: openStatus,
    derived_close_date: closeDate,
    review_reasons: reviewReasons,
  };
}
