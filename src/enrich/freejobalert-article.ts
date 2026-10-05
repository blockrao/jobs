/**
 * PQ-008: section-based fact extractor for FreeJobAlert article pages.
 *
 * Pages are organised as <h2> sections ("<Post> Age Limit", "... Application
 * Fee", "... Salary", "... Selection Process", "... Important Links") holding
 * tables and short paragraphs. This reads FACTS (numbers, categories, links)
 * into structured fields. It never copies an article's prose: free text is
 * kept only for short, factual lines, and every value is returned only when it
 * was found; nothing is guessed. Source is discovery-grade (A-064).
 */
import * as cheerio from "cheerio";
import type { ExtraContent } from "@/db/schema";
import { collapse, parseSalary } from "@/ingest/adapters/util";
import { isAggregatorUrl } from "@/lib/aggregators";

export interface ArticleFacts {
  ageLimitMin?: number;
  ageLimitMax?: number;
  ageRelaxationNotes?: string;
  applicationFeeGeneral?: number;
  applicationFeeReserved?: number;
  salaryMin?: number;
  salaryMax?: number;
  applyUrl?: string;
  officialNotificationUrl?: string;
  officialWebsiteUrl?: string;
  extraContent?: ExtraContent;
  /** Sections that exist on the page but yielded nothing (for the dry-run report). */
  unparsed: string[];
}

interface Section {
  heading: string;
  tables: string[][][];
  paras: string[];
  links: { label: string; href: string }[];
}

const SECTION_KEYS: Array<[string, RegExp]> = [
  ["age", /age limit/i],
  ["fee", /application fee|exam fee|fee details/i],
  ["salary", /salary|pay scale|remuneration|stipend/i],
  ["selection", /selection process/i],
  ["pattern", /exam pattern|scheme of exam/i],
  ["links", /important links/i],
  ["dates", /important dates/i],
  ["vacancy", /vacancy details|vacancies|post[- ]wise/i],
];

function numbers(text: string): number[] {
  return [...collapse(text).replace(/,/g, "").matchAll(/\b(\d{1,3})\s*(?:years?|yrs?)\b/gi)].map((m) => +m[1]);
}

function rupees(text: string): number | undefined {
  const m = collapse(text).replace(/,/g, "").match(/(?:₹|rs\.?|inr)\s*(\d{1,6})/i);
  return m ? +m[1] : undefined;
}

function readSections(html: string): Section[] {
  const $ = cheerio.load(html);
  const root = $("article").length ? $("article").first() : $("body");
  const sections: Section[] = [];
  let cur: Section | null = null;
  root.find("h2, table, p, li").each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase();
    if (tag === "h2") {
      cur = { heading: collapse($(el).text()), tables: [], paras: [], links: [] };
      sections.push(cur);
      return;
    }
    if (!cur) return;
    if (tag === "table") {
      const rows: string[][] = [];
      $(el).find("tr").each((__, tr) => {
        rows.push($(tr).find("th,td").map((___, c) => collapse($(c).text())).get());
      });
      if (rows.length) cur.tables.push(rows);
    } else if ($(el).closest("table").length === 0) {
      const t = collapse($(el).text());
      if (t) cur.paras.push(t);
      $(el).find("a[href]").each((__, a) => {
        const href = $(a).attr("href") ?? "";
        if (/^https?:/i.test(href)) cur!.links.push({ label: collapse($(el).text()), href });
      });
    }
  });
  return sections;
}

export function parseFreeJobAlertArticle(html: string): ArticleFacts {
  const sections = readSections(html);
  const out: ArticleFacts = { unparsed: [] };
  const tables: NonNullable<ExtraContent["tables"]> = [];
  const by = (key: string) => {
    const re = SECTION_KEYS.find(([k]) => k === key)![1];
    return sections.filter((s) => re.test(s.heading) && !/faq|^q\d/i.test(s.heading));
  };

  // ---- Age ----
  for (const s of by("age")) {
    const text = [...s.paras, ...s.tables.flat().map((r) => r.join(" "))].join(" ");
    const nums = numbers(text).filter((n) => n >= 14 && n <= 70);
    if (nums.length) {
      out.ageLimitMin = Math.min(...nums.filter((n) => n <= 30).length ? nums.filter((n) => n <= 30) : [Math.min(...nums)]);
      out.ageLimitMax = Math.max(...nums);
    }
    const t = s.tables.find((r) => r.length > 1);
    if (t) tables.push({ title: "Age limit", headers: t[0], rows: t.slice(1) });
    break;
  }

  // ---- Fee ----
  for (const s of by("fee")) {
    const t = s.tables.find((r) => r.length > 1);
    if (t) {
      const amounts = t.slice(1).map((r) => rupees(r.slice(1).join(" ") || r.join(" "))).filter((n): n is number => n != null);
      if (amounts.length) {
        out.applicationFeeGeneral = amounts[0];
        out.applicationFeeReserved = amounts.length > 1 ? Math.min(...amounts) : amounts[0];
      }
      tables.push({ title: "Application fee", headers: t[0], rows: t.slice(1) });
    } else {
      const n = rupees(s.paras.join(" "));
      if (n != null) out.applicationFeeGeneral = n;
    }
    if (/\bno (application )?fee\b|\bfee[- ]free\b|exempt/i.test(s.paras.join(" ")) && out.applicationFeeGeneral == null) {
      out.applicationFeeGeneral = 0;
    }
    break;
  }

  // ---- Salary ----
  for (const s of by("salary")) {
    const text = [...s.paras, ...s.tables.flat().map((r) => r.join(" "))].join(" ");
    const sal = parseSalary(text);
    if (sal.salaryMin) {
      out.salaryMin = sal.salaryMin;
      out.salaryMax = sal.salaryMax;
    }
    break;
  }

  // ---- Selection / exam pattern tables (facts only) ----
  for (const key of ["selection", "pattern", "vacancy"] as const) {
    for (const s of by(key)) {
      const t = s.tables.find((r) => r.length > 1);
      if (t) {
        const title = key === "selection" ? "Selection process" : key === "pattern" ? "Exam pattern" : "Vacancies by category";
        tables.push({ title, headers: t[0], rows: t.slice(1) });
      }
      break;
    }
  }
  if (tables.length) out.extraContent = { tables };

  // ---- Links (labelled list; link text is usually "Click here") ----
  for (const s of by("links")) {
    for (const l of s.links) {
      if (isAggregatorUrl(l.href)) continue;
      if (/apply online|online application|registration/i.test(l.label) && !out.applyUrl) out.applyUrl = l.href;
      else if (/notification|advertisement|notice/i.test(l.label) && !out.officialNotificationUrl) out.officialNotificationUrl = l.href;
      else if (/official website/i.test(l.label) && !out.officialWebsiteUrl) out.officialWebsiteUrl = l.href;
    }
  }

  // ---- Report sections present but not parsed ----
  if (out.ageLimitMax == null && by("age").length) out.unparsed.push("age");
  if (out.applicationFeeGeneral == null && by("fee").length) out.unparsed.push("fee");
  if (out.salaryMin == null && by("salary").length) out.unparsed.push("salary");
  if (!out.applyUrl && by("links").length) out.unparsed.push("applyUrl");
  return out;
}
