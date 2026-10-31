import * as cheerio from "cheerio";

export type FjaResearchFacts = Record<string, string | null>;
export interface FjaResearchLink {
  text: string;
  url: string;
  host: string;
  source_class: "freejobalert" | "external_candidate";
}
export interface FjaContentBlock {
  type: "paragraph" | "list" | "table" | "image" | "other";
  text: string;
  items?: string[];
  table_index?: number;
}
export interface FjaContentSection {
  heading: string;
  level: number;
  blocks: FjaContentBlock[];
}
export interface FjaSourceTable {
  table_index: number;
  caption: string | null;
  headers: string[];
  rows: string[][];
}
export interface FjaResearchParse {
  page_title: string | null;
  detail_text: string;
  content_sections: FjaContentSection[];
  source_tables: FjaSourceTable[];
  all_links: FjaResearchLink[];
  facts: FjaResearchFacts;
  date_candidates: Array<{ label: string; date: string; kind: "application_end" | "application_start" | "walk_in" | "notification" | "other" }>;
  official_link_candidates: FjaResearchLink[];
  post_table_candidates: Array<{ table_index: number; headers: string[]; rows: Array<{ row_index: number; values: Record<string, string> }> }>;
  open_status: "OPEN_AS_OF_CUTOFF" | "CLOSED_BY_CUTOFF" | "REVIEW_DATE_UNCLEAR" | "REVIEW_WALKIN_DATE_UNCLEAR";
  derived_close_date: string | null;
  vacancy_count_candidate: number | null;
  review_reasons: string[];
  capture_quality: {
    status: "STRUCTURE_CAPTURED" | "CAPTURED_NEEDS_REVIEW" | "CAPTURE_REVIEW";
    detail_text_chars: number;
    section_count: number;
    source_table_count: number;
    link_count: number;
    list_item_count: number;
    recognized_fact_count: number;
    missing_core_fields: string[];
  };
}

const LABELS: Record<string, RegExp> = {
  organization: /^(?:recruiting body|recruiting organization|recruiting organisation|organization|organisation|company name|recruiting authority)$/i,
  post_name: /^(?:name of posts?|post names?|post name\(s\)|name of post\(s\)|training categories)$/i,
  vacancies: /^(?:total vacancies|total vacancy|total posts|total no.? of posts|total no.? of vacancies|number of vacancies|number of posts|no.? of posts|no.? of vacancies|vacancies|total training slots|total no.? of training slots|training slots|total slots|number of slots|no.? of slots)$/i,
  qualification: /^(?:qualification|educational qualification|eligibility|education qualification|essential qualification)$/i,
  age_limit: /^(?:age limit|age criteria|age limit as on.*)$/i,
  salary_pay: /^(?:salary|pay scale|pay level|remuneration|pay matrix|pay)$/i,
  application_start_date: /^(?:starting date|application start date|online application start date|start date|starting date for online application)$/i,
  walk_in_date: /^(?:walk[- ]?in date|interview date|date of interview|reporting date|document verification date)$/i,
  application_end_date: /^(?:last date|last date to apply|last date to apply online|last date of application|last date of receiving application|last date of application submission|last date for submission|application end date|application last date|closing date)$/i,
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
  // A page can mention a separate correction/modification deadline after the
  // actual application deadline. Do not treat that later date as the closing date.
  if (/modification|correction|edit window|fee payment/i.test(label)) return "other";
  if (/last date|closing date|application end|apply by|application last/i.test(label)) return "application_end";
  if (/walk[- ]?in|interview|reporting|document verification/i.test(label)) return "walk_in";
  if (/start date|commencement|opening date/i.test(label)) return "application_start";
  if (/notification|published|advertisement release|post date/i.test(label)) return "notification";
  return "other";
}

function parseVacancyCountCandidate(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = collapse(value);
  if (/does not print a number|not stated|not specified|to be occurred|panel preparation|as per notification/i.test(normalized)) return null;
  // Accept a leading count only; never pull a number out of prose or a category
  // breakdown where the article explicitly says the total is unspecified.
  const match = normalized.match(/^\s*(\d[\d,]*)\b/);
  if (!match) return null;
  const count = Number(match[1].replace(/,/g, ""));
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
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
  // Keep a full normalized text transcript for search/review. Structured blocks
  // below preserve the article's headings, lists, and tables instead of flattening
  // them into prose that loses row/section relationships.
  const detailText = collapse(root.text());
  const sourceTables: FjaSourceTable[] = [];
  root.find("table").each((tableIndex, table) => {
    const rows = $(table).find("tr").toArray().map((tr) =>
      $(tr).children("th,td").toArray().map((cell) => collapse($(cell).text())),
    ).filter((row) => row.some(Boolean));
    if (!rows.length) return;
    const caption = collapse($(table).children("caption").text()) || null;
    sourceTables.push({ table_index: tableIndex, caption, headers: rows[0], rows: rows.slice(1) });
  });

  const contentSections: FjaContentSection[] = [];
  let currentSection: FjaContentSection = { heading: "Introduction", level: 0, blocks: [] };
  const flushSection = () => {
    if (currentSection.blocks.length || currentSection.heading !== "Introduction") contentSections.push(currentSection);
  };
  root.find("h2,h3,h4,h5,h6,p,ul,ol,table").each((_, element) => {
    const node = $(element);
    const tag = element.tagName?.toLowerCase() ?? "";
    if (/^h[2-6]$/.test(tag)) {
      flushSection();
      currentSection = { heading: collapse(node.text()), level: Number(tag.slice(1)), blocks: [] };
      return;
    }
    if (tag === "table") {
      const index = sourceTables.find((t) => t.table_index === root.find("table").toArray().indexOf(element))?.table_index;
      const tableText = node.find("tr").toArray().map((tr) =>
        $(tr).children("th,td").toArray().map((cell) => collapse($(cell).text())).filter(Boolean).join(" | "),
      ).filter(Boolean).join("\\n");
      currentSection.blocks.push({ type: "table", text: tableText, ...(index === undefined ? {} : { table_index: index }) });
    } else if (tag === "ul" || tag === "ol") {
      const items = node.children("li").toArray().map((li) => collapse($(li).text())).filter(Boolean);
      currentSection.blocks.push({ type: "list", text: items.join("\\n"), items });
    } else if (tag === "p") {
      const text = collapse(node.text());
      if (text) currentSection.blocks.push({ type: "paragraph", text });
    }
  });
  flushSection();

  const allLinks: FjaResearchLink[] = [];
  root.find("a[href]").each((_, a) => {
    const parsed = absoluteSourceLink($(a).attr("href") || "", url);
    if (!parsed) return;
    const text = collapse($(a).text());
    if (!text) return;
    allLinks.push({ ...parsed, text });
  });
  const uniqueAllLinks = [...new Map(allLinks.map((link) => [link.url, link])).values()];

  const facts: FjaResearchFacts = {};
  const candidates: FjaResearchParse["date_candidates"] = [];
  const postTableCandidates: FjaResearchParse["post_table_candidates"] = [];
  const unparsedDateValues: Array<{ label: string; value: string }> = [];
  const unparsedVacancyValues: Array<{ label: string; value: string }> = [];

  root.find("table").each((tableIndex, table) => {
    const rows = $(table).find("tr").toArray().map((tr) =>
      $(tr).children("th,td").toArray().map((cell) => collapse($(cell).text())),
    ).filter((row) => row.length >= 2 && row.some(Boolean));
    if (!rows.length) return;
    const first = rows[0].map((v) => cleanLabel(v).toLowerCase());
    const headerLooksLikeBreakdown = first.some((v) => /^(?:post|post name|department|organization|organisation|category|subject|resource|link description|s.? no.?)$/.test(v))
      && first.some((v) => /vacanc|qualification|pay|scale|link|details|marks|total/.test(v));
    const hasPostColumn = first.some((v) => /^(?:posts?|post name(?:s|\(s\))?|name of (?:the )?posts?(?:\(s\))?|post name \/ department|trade name|discipline|designation|position)$/i.test(v));
    const hasPostFacts = first.some((v) => /vacanc|slots?|no.? of posts|qualification|pay|salary|age limit|department|organization|organisation/i.test(v));
    if (hasPostColumn && hasPostFacts && !first.some((v) => /^(?:resource|link|link description)$/i.test(v))) {
      const candidateRows = rows.slice(1).flatMap((cells, rowOffset) => {
        if (cells.length < 2 || /^(?:total|grand total)\b/i.test(collapse(cells[0]))) return [];
        const values: Record<string, string> = {};
        first.forEach((header, colIndex) => {
          if (header && cells[colIndex]) values[header] = cells[colIndex];
        });
        return Object.keys(values).length ? [{ row_index: rowOffset + 1, values }] : [];
      });
      if (candidateRows.length) postTableCandidates.push({ table_index: tableIndex, headers: rows[0], rows: candidateRows });
    }
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
        if (!re.test(label) || facts[field]) continue;
        if (field === "vacancies" && (!/\d/.test(value) || /does not print a number|not stated|not specified|to be occurred|panel preparation/i.test(value))) {
          unparsedVacancyValues.push({ label, value });
          continue;
        }
        if (field.endsWith("_date") || field === "notification_date") {
          const date = parseFjaDate(value);
          if (!date) {
            unparsedDateValues.push({ label, value });
            continue;
          }
          facts[field] = value;
          candidates.push({ label, date, kind: dateKind(label) });
        } else {
          facts[field] = value;
        }
        break;
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
    if (/mobile app|follow us|whatsapp|telegram|facebook|instagram|share|copy link/i.test(text)) return;
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
  const vacancyCountCandidate = parseVacancyCountCandidate(facts.vacancies);
  if (!facts.vacancies) reviewReasons.push("Total recruitment vacancies were not extracted from a recognized key/value row.");
  else if (vacancyCountCandidate === null) reviewReasons.push("Vacancy text was captured, but no defensible numeric total can be derived; do not use it as a canonical vacancy count.");
  if (!uniqueLinks.length) reviewReasons.push("No candidate official-source links were identified; inspect the source page manually.");
  for (const item of unparsedDateValues) reviewReasons.push("Date field “" + item.label + "” had a non-date value and was not accepted: “" + item.value + "”.");
  for (const item of unparsedVacancyValues) reviewReasons.push("Vacancy field “" + item.label + "” had no numeric count and was not accepted: “" + item.value + "”.");
  if (!postTableCandidates.length && !facts.post_name) reviewReasons.push("No structured post-wise table or single-post name was detected; leaf-level post data requires manual/official-source review.");

  const missingCoreFields = ["organization", "post_name", "vacancies", "application_end_date"].filter((field) => !facts[field]);
  const listItemCount = contentSections.reduce((count, section) =>
    count + section.blocks.reduce((sectionCount, block) => sectionCount + (block.type === "list" ? (block.items?.length ?? 0) : 0), 0), 0);
  const hasStructuredContent = contentSections.some((section) => section.blocks.length > 0) || sourceTables.length > 0;
  const captureStatus: FjaResearchParse["capture_quality"]["status"] = detailText.length < 500 || !hasStructuredContent
    ? "CAPTURE_REVIEW"
    : missingCoreFields.length === 0
      ? "STRUCTURE_CAPTURED"
      : "CAPTURED_NEEDS_REVIEW";

  return {
    page_title: title || null,
    detail_text: detailText,
    content_sections: contentSections,
    source_tables: sourceTables,
    all_links: uniqueAllLinks,
    facts,
    date_candidates: candidates,
    official_link_candidates: uniqueLinks,
    post_table_candidates: postTableCandidates,
    open_status: openStatus,
    derived_close_date: closeDate,
    vacancy_count_candidate: vacancyCountCandidate,
    review_reasons: reviewReasons,
    capture_quality: {
      status: captureStatus,
      detail_text_chars: detailText.length,
      section_count: contentSections.length,
      source_table_count: sourceTables.length,
      link_count: uniqueAllLinks.length,
      list_item_count: listItemCount,
      recognized_fact_count: Object.keys(facts).length,
      missing_core_fields: missingCoreFields,
    },
  };
}
