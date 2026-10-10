import * as cheerio from "cheerio";
import { createHash } from "node:crypto";

/**
 * High-coverage FreeJobAlert article extraction.
 * Preserves source evidence and reports gaps; it does not infer missing values
 * or write to production tables. Call this from the ingestion pipeline before
 * mapping values into recruitment/post inventory rows.
 */
const norm = (s: string) => s.replace(/\\u00a0/g, " ").replace(/\\s+/g, " ").trim();
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const absolute = (href: string | undefined, base: string) => {
  if (!href) return null;
  try {
    const u = new URL(href, base);
    return ["http:", "https:"].includes(u.protocol) ? u.toString() : null;
  } catch { return null; }
};
const DATE_LABELS = /date|deadline|last date|interview|walk.?in|commencement|starting/i;
const LABELS: Record<string, RegExp> = {
  organization: /^(recruiting body|organization|organisation|university|department|company name)$/i,
  advertisement_number: /^(advertisement( no| number)?|advt( no| number)?|notification( no| number)?|reference no)\\.?$/i,
  project_title: /^(project title|title of project|name of project|project)$/i,
  sponsor: /^(funding agency|sponsor|sponsored by|funded by)$/i,
  post_name: /^(name of post|post name|designation|name of posts?)$/i,
  vacancies: /^(total vacancies|no\\.? of vacancies|number of vacancies|vacancies|no\\.? of posts|number of posts)$/i,
  qualification: /^(qualification|educational qualification|essential qualification|eligibility|education qualification)$/i,
  experience: /^(experience|essential experience|desirable experience|work experience)$/i,
  age_limit: /^(age limit|age criteria|maximum age|minimum age).*$/i,
  age_relaxation: /age relaxation|relaxation in age/i,
  salary: /^(salary|pay scale|pay level|remuneration|emoluments|consolidated pay|honorarium)$/i,
  tenure: /^(duration|tenure|project duration|period of engagement|contract period)$/i,
  location: /^(job location|location|place of posting|work location)$/i,
  application_fee: /^(application fee|fee details|exam fee)$/i,
  application_mode: /^(application mode|mode of application|how to apply)$/i,
  application_start_date: /^(starting date|application start date|start date|online application start date)$/i,
  application_end_date: /^(last date|last date to apply|closing date|application end date|last date for submission|last date to apply online)$/i,
  selection_process: /^(selection process|mode of selection|selection procedure)$/i,
};
function parseCellTables($: cheerio.CheerioAPI) {
  const tables: Array<{ index: number; caption: string | null; rows: Array<{ index: number; cells: string[] }> }> = [];
  const labelledFacts: Array<{ label: string; value: string; tableIndex: number; rowIndex: number }> = [];
  $("table").each((ti, table) => {
    const rows: Array<{ index: number; cells: string[] }> = [];
    $(table).find("tr").each((ri, tr) => {
      const cells = $(tr).find("th,td").toArray().map(c => norm($(c).text()));
      if (!cells.some(Boolean)) return;
      rows.push({ index: ri, cells });
      if (cells.length >= 2 && cells[0] && cells.slice(1).some(Boolean)) {
        labelledFacts.push({ label: cells[0].replace(/[:\\s]+$/, ""), value: cells.slice(1).filter(Boolean).join(" | "), tableIndex: ti, rowIndex: ri });
      }
    });
    tables.push({ index: ti, caption: norm($(table).find("caption").text()) || null, rows });
  });
  return { tables, labelledFacts };
}
export function extractFreeJobAlertCompleteness(html: string, sourceUrl: string) {
  const $ = cheerio.load(html);
  const title = norm($("h1").first().text() || $("meta[property='og:title']").attr("content") || $("title").text());
  const { tables, labelledFacts } = parseCellTables($);
  const factCandidates: Record<string, Array<{ value: string; label: string; tableIndex: number; rowIndex: number }>> = {};
  for (const fact of labelledFacts) {
    for (const [key, pattern] of Object.entries(LABELS)) {
      if (pattern.test(fact.label)) (factCandidates[key] ??= []).push(fact);
    }
  }
  const facts: Record<string, string | null> = {};
  for (const [key, values] of Object.entries(factCandidates)) facts[key] = values.map(v => v.value).join("\\n");
  const links = $("a[href]").toArray().map(a => ({
    text: norm($(a).text()), title: norm($(a).attr("title") || ""),
    href: absolute($(a).attr("href"), sourceUrl), rel: $(a).attr("rel") || null,
  })).filter(x => x.href);
  const officialLinkCandidates = links.filter(x =>
    /official|notification|advertisement|apply|registration|application|download|pdf|prescribed form/i.test(x.text + " " + x.title + " " + x.href)
  );
  const headings = $("h1,h2,h3,h4,h5,h6").toArray().map(h => ({
    level: Number((h as any).tagName?.slice(1)) || null, text: norm($(h).text()),
  })).filter(h => h.text);
  const lists = $("ul,ol").toArray().map(el => ({
    type: (el as any).tagName, items: $(el).children("li").toArray().map(li => norm($(li).text())).filter(Boolean),
  })).filter(l => l.items.length);
  const paragraphs = $("p").toArray().map(p => norm($(p).text())).filter(Boolean);
  const bodyText = norm($("main").text() || $("article").text() || $("body").text());
  const htmlHash = sha256(html);
  const expectedFields = Object.keys(LABELS);
  const coverage = expectedFields.map(field => ({
    field, extracted: Boolean(facts[field]), candidate_count: factCandidates[field]?.length ?? 0,
    status: facts[field] ? "FOUND" : "NOT_FOUND_IN_LABELLED_TABLES",
  }));
  const allTextBlocks = [...headings.map(h => h.text), ...paragraphs, ...lists.flatMap(l => l.items)];
  return {
    source: "freejobalert", source_url: sourceUrl, retrieved_at: new Date().toISOString(),
    page_title: title || null, page_sha256: htmlHash,
    facts, fact_candidates: factCandidates, tables, headings, lists, paragraphs,
    body_text: bodyText, links, official_link_candidates: officialLinkCandidates,
    text_blocks: allTextBlocks,
    coverage: {
      expected_fields: expectedFields.length,
      fields_found_in_labelled_tables: coverage.filter(x => x.extracted).length,
      fields_not_found_in_labelled_tables: coverage.filter(x => !x.extracted).map(x => x.field),
      field_audit: coverage,
      has_full_page_text: Boolean(bodyText),
      has_source_html_hash: true,
      needs_manual_review: coverage.some(x => !x.extracted) || officialLinkCandidates.length === 0,
    },
    extraction_note: "NOT_FOUND_IN_LABELLED_TABLES does not mean absent from the source. Check preserved body_text, paragraphs, headings, lists and raw HTML before classifying a field as unavailable. No facts are inferred or official-verified.",
  };
}
