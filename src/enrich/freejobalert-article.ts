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

function rupees(text: string, bareOk = false): number | undefined {
  if (bareOk && /^\s*\d[\d,]*(\/-)?\s*$/.test(text)) return +text.replace(/[^0-9]/g, "");
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
  // Only explicit statements are used. Sentences about relaxation, calculators
  // or service years are ignored, and a table "relaxation" column is never read.
  const plausible = (n: number) => n >= 14 && n <= 70;
  const sentences = (paras: string[]) =>
    paras.flatMap((p) => collapse(p).replace(/\brs\.\s*/gi, "Rs ").split(/(?<=[.;])\s+/)).filter((x) => !/relax|calculator|calculate|service|experience/i.test(x));
  for (const s of by("age")) {
    const mins: number[] = [];
    const maxs: number[] = [];
    for (const sent of sentences(s.paras)) {
      let m: RegExpMatchArray | null;
      if ((m = sent.match(/between\s+(\d{2})\s*(?:years?)?\s*(?:and|to|-|–)\s*(\d{2})/i))) { mins.push(+m[1]); maxs.push(+m[2]); }
      if ((m = sent.match(/\b(\d{2})\s*(?:years?|yrs?)?\s*(?:to|-|–)\s*(\d{2})\s*(?:years?|yrs?)/i))) { mins.push(+m[1]); maxs.push(+m[2]); }
      if ((m = sent.match(/(?:minimum age|not less than|at least|should not be less than)[^0-9]{0,40}(\d{2})\b/i))) mins.push(+m[1]);
      if ((m = sent.match(/(?:maximum age|upper age limit|not more than|not exceed|should not be more than)[^0-9]{0,60}(\d{2})\b/i))) maxs.push(+m[1]);
    }
    for (const t of s.tables) {
      const hdr = t[0];
      const minC = hdr.findIndex((h) => /min/i.test(h) && !/relax/i.test(h));
      const maxC = hdr.findIndex((h) => /max|upper age|age limit/i.test(h) && !/relax/i.test(h));
      for (const r of t.slice(1)) {
        if (minC >= 0) mins.push(...numbers(r[minC] ?? ""));
        if (maxC >= 0) maxs.push(...numbers(r[maxC] ?? ""));
        if (minC < 0 && maxC < 0 && !/relax/i.test(hdr.join(" "))) {
          const m = (r.slice(1).join(" ")).match(/\b(\d{2})\s*(?:years?)?\s*(?:to|-|–)\s*(\d{2})\s*(?:years?|yrs?)/i);
          if (m) { mins.push(+m[1]); maxs.push(+m[2]); }
        }
      }
    }
    const mn = mins.filter(plausible), mx = maxs.filter(plausible);
    if (mn.length) out.ageLimitMin = Math.min(...mn);
    if (mx.length) out.ageLimitMax = Math.max(...mx);
    const t = s.tables.find((r) => r.length > 1);
    if (t) tables.push({ title: "Age limit", headers: t[0], rows: t.slice(1) });
    break;
  }

  // ---- Fee ----
  for (const s of by("fee")) {
    const t = s.tables.find((r) => r.length > 1 && r[0].some((h) => /fee|charge/i.test(h)));
    if (t) {
      const hdr = t[0];
      let col = hdr.findIndex((h) => /total/i.test(h));
      if (col < 0) col = hdr.findIndex((h, i) => i > 0 && /fee|charge/i.test(h));
      if (col < 0) col = hdr.length - 1;
      const rows = t.slice(1).map((r) => ({ cat: r[0] ?? "", amt: rupees(r[col] ?? "", true) })).filter((r): r is { cat: string; amt: number } => r.amt != null);
      if (rows.length) {
        const gen = rows.find((r) => /general|unreserved|\bUR\b|open/i.test(r.cat));
        out.applicationFeeGeneral = (gen ?? rows.reduce((a, b) => (b.amt > a.amt ? b : a))).amt;
        out.applicationFeeReserved = Math.min(...rows.map((r) => r.amt));
      }
      tables.push({ title: "Application fee", headers: t[0], rows: t.slice(1) });
    } else {
      const sent = s.paras.flatMap((p) => collapse(p).replace(/\brs\.\s*/gi, "Rs ").split(/(?<=[.;])\s+/)).find((x) => /\bfee\b/i.test(x) && rupees(x) != null);
      const n = sent ? rupees(sent) : undefined;
      if (n != null) { out.applicationFeeGeneral = n; out.applicationFeeReserved = n; }
    }
    if (out.applicationFeeGeneral == null && /\bno (application )?fee\b|\bfee[- ]free\b|not charged|exempt/i.test(s.paras.join(" "))) {
      out.applicationFeeGeneral = 0;
    }
    break;
  }

  // ---- Salary ----
  for (const s of by("salary")) {
    const text = collapse([...s.paras, ...s.tables.flat().map((r) => r.join(" "))].join(" ")).replace(/,/g, "");
    const mins: number[] = [], maxs: number[] = [];
    for (const m of text.matchAll(/(?:₹|rs\.?|inr)?\s*(\d{4,7})\s*(?:-|–|to)\s*(?:₹|rs\.?|inr)?\s*(\d{4,7})/gi)) {
      const lo = +m[1], hi = +m[2];
      if (lo >= 1000 && hi >= lo) { mins.push(lo); maxs.push(hi); }
    }
    if (mins.length) { out.salaryMin = Math.min(...mins); out.salaryMax = Math.max(...maxs); }
    else {
      const single = parseSalary(text);
      if (single.salaryMin) out.salaryMin = single.salaryMin;
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
