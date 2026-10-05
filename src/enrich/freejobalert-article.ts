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
  /** Dry-run diagnostics only (never stored). */
  debug?: { headings: string[]; linkLabels: string[]; sample: Record<string, string> };
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
      $(el).find("tr").each((__, tr) => {
        const label = collapse($(tr).find("th,td").first().text());
        $(tr).find("a[href]").each((___, a) => {
          const href = $(a).attr("href") ?? "";
          if (/^https?:/i.test(href)) cur!.links.push({ label, href });
        });
      });
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
  // Only explicit statements are used: "minimum age ... N", a range "N to M years",
  // or a table column headed "max". Relaxation figures are never read as limits.
  for (const s of by("age")) {
    const para = s.paras.join(" ");
    const range = collapse(para).match(/\b(\d{2})\s*(?:to|-|–)\s*(\d{2})\s*(?:years?|yrs?)/i);
    const minM = collapse(para).match(/minimum age[^0-9]{0,60}(\d{2})\b/i);
    const maxM = collapse(para).match(/maximum age[^0-9]{0,80}(\d{2})\b/i);
    const maxTable = s.tables.find((r) => r.length > 1 && /max|upper/i.test(r[0].join(" ")) && !/^\s*relax/i.test(r[0][1] ?? ""));
    let maxCells: number[] = [];
    if (maxTable) {
      const cols = maxTable[0].map((h, i) => (/max|upper/i.test(h) ? i : -1)).filter((i) => i >= 0);
      maxCells = maxTable.slice(1).flatMap((r) => cols.flatMap((i) => numbers(r[i] ?? "")));
    }
    const plausible = (n: number) => n >= 14 && n <= 70;
    if (minM && plausible(+minM[1])) out.ageLimitMin = +minM[1];
    else if (range && plausible(+range[1])) out.ageLimitMin = +range[1];
    const maxCandidates = [
      ...maxCells.filter(plausible),
      ...(range && plausible(+range[2]) ? [+range[2]] : []),
      ...(maxM && plausible(+maxM[1]) ? [+maxM[1]] : []),
    ];
    if (maxCandidates.length) out.ageLimitMax = Math.max(...maxCandidates);
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
      if (/apply (online|link)|online application|application link|registration/i.test(l.label) && !out.applyUrl) out.applyUrl = l.href;
      else if (/notification|advertisement|notice/i.test(l.label) && !out.officialNotificationUrl) out.officialNotificationUrl = l.href;
      else if (/official website/i.test(l.label) && !out.officialWebsiteUrl) out.officialWebsiteUrl = l.href;
    }
  }

  // ---- Report sections present but not parsed ----
  if (out.ageLimitMax == null && by("age").length) out.unparsed.push("age");
  if (out.applicationFeeGeneral == null && by("fee").length) out.unparsed.push("fee");
  if (out.salaryMin == null && by("salary").length) out.unparsed.push("salary");
  if (!out.applyUrl && by("links").length) out.unparsed.push("applyUrl");
  const sample: Record<string, string> = {};
  for (const k of ["age", "fee", "salary"]) {
    const sec = by(k)[0];
    if (sec) sample[k] = (sec.paras.slice(0, 2).join(" // ") + " ## " + sec.tables.slice(0, 1).map((t) => t.slice(0, 3).map((r) => r.join("|")).join(" / ")).join("")).slice(0, 420);
  }
  out.debug = {
    sample,
    headings: sections.map((x) => x.heading.slice(0, 60)),
    linkLabels: sections.filter((x) => /link/i.test(x.heading)).flatMap((x) => x.links.map((l) => l.label.slice(0, 50) + " => " + (() => { try { return new URL(l.href).hostname; } catch { return "?"; } })())),
  };
  return out;
}
