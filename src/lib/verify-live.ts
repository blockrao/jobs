/**
 * Live page verification rules (PQ-003).
 *
 * "Done" means the page as served, not the database row. These rules read a
 * served HTML page (and the sitemap) and report PASS / FAIL / INFO per check.
 * The network part lives in src/scripts/verify-live.ts so these stay pure and
 * testable with fixtures.
 */
import * as cheerio from "cheerio";

export type Verdict = "PASS" | "FAIL" | "INFO";
export interface CheckResult {
  check: string;
  verdict: Verdict;
  detail: string;
}

export interface PageFacts {
  /** Absolute site origin, no trailing slash (https://www.joboye.com). */
  base: string;
  /** Entity path without locale, for example /jobs/some-slug. */
  enPath: string;
  locale: "en" | "hi";
  status: number;
  html: string;
  /** Absolute URLs listed in the sitemap, or null when it could not be read. */
  sitemapUrls: ReadonlySet<string> | null;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Segments of a <title> split on em dash or pipe, normalised. */
function titleSegments(title: string): string[] {
  return title
    .split(/\s+[—|–]\s+/)
    .map(norm)
    .filter((s) => s.length >= 3);
}

export function analyzePage(f: PageFacts): CheckResult[] {
  const out: CheckResult[] = [];
  const add = (check: string, verdict: Verdict, detail: string) => out.push({ check, verdict, detail });

  const selfUrl = f.locale === "hi" ? `${f.base}/hi${f.enPath}` : `${f.base}${f.enPath}`;
  const enUrl = `${f.base}${f.enPath}`;
  const hiUrl = `${f.base}/hi${f.enPath}`;

  add("status", f.status === 200 ? "PASS" : "FAIL", `HTTP ${f.status}`);
  if (f.status !== 200) return out;

  const $ = cheerio.load(f.html);

  // Language
  const lang = ($("html").attr("lang") ?? "").toLowerCase();
  add("html_lang", lang.startsWith(f.locale) ? "PASS" : "FAIL", `lang="${lang}" on the ${f.locale} page`);

  // Canonical
  const canonical = $('link[rel="canonical"]').attr("href") ?? "";
  const canonOk = canonical === selfUrl || canonical === enUrl;
  add("canonical", canonOk ? "PASS" : "FAIL", canonical ? `canonical ${canonical}` : "no canonical link");

  // Robots
  const robots = ($('meta[name="robots"]').attr("content") ?? "").toLowerCase();
  const noindex = robots.includes("noindex");
  add("robots", "INFO", noindex ? `noindex (${robots})` : "indexable");

  // A Hindi page that canonicalises to English must not be indexable.
  if (f.locale === "hi" && canonical === enUrl && !noindex) {
    add("hi_canonical_to_en", "FAIL", "Hindi page points its canonical at English but is indexable");
  }

  // Sitemap consistency (English URL decides)
  if (f.locale === "en") {
    if (!f.sitemapUrls) {
      add("sitemap", "INFO", "sitemap could not be read");
    } else {
      const inMap = f.sitemapUrls.has(enUrl);
      if (!noindex && !inMap) add("sitemap", "FAIL", "indexable page is missing from the sitemap");
      else if (noindex && inMap) add("sitemap", "FAIL", "noindex page is listed in the sitemap");
      else add("sitemap", "PASS", noindex ? "noindex and not in sitemap" : "indexable and in sitemap");
    }
  }

  // hreflang
  const alts = new Map<string, string>();
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    alts.set(($(el).attr("hreflang") ?? "").toLowerCase(), $(el).attr("href") ?? "");
  });
  if (alts.size === 0) {
    add("hreflang", "INFO", "none (single-language page)");
  } else {
    const ok = alts.get("en") === enUrl && alts.get("hi") === hiUrl && alts.get("x-default") === enUrl && alts.size === 3;
    add("hreflang", ok ? "PASS" : "FAIL", ok ? "en, hi, x-default are reciprocal" : `found ${[...alts.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }

  // JSON-LD
  const types: string[] = [];
  let invalid = 0;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).text());
      const nodes: unknown[] = Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j];
      for (const n of nodes) {
        const t = (n as { "@type"?: string | string[] })["@type"];
        if (t) types.push(...(Array.isArray(t) ? t : [t]));
      }
    } catch {
      invalid++;
    }
  });
  add("json_ld", invalid === 0 ? "PASS" : "FAIL", invalid === 0 ? `parses; types: ${types.join(", ") || "none"}` : `${invalid} block(s) do not parse`);
  if (noindex && types.includes("JobPosting")) {
    add("json_ld_noindex", "FAIL", "JobPosting markup on a noindex page");
  }

  // Title: no repeated segment, no leaked markup
  const title = ($("title").first().text() || "").trim();
  const segs = titleSegments(title);
  const dup = segs.find((s, i) => segs.indexOf(s) !== i);
  add("title", dup ? "FAIL" : title ? "PASS" : "FAIL", dup ? `repeated segment "${dup}"` : title ? title : "no <title>");

  // Meta description
  const desc = $('meta[name="description"]').attr("content") ?? "";
  add("meta_description", !desc ? "FAIL" : /<[a-z/][^>]*>/i.test(desc) ? "FAIL" : "PASS", !desc ? "missing" : /<[a-z/][^>]*>/i.test(desc) ? "contains markup" : `${desc.length} characters`);

  // Exactly one h1
  const h1s = $("h1").length;
  add("h1", h1s === 1 ? "PASS" : "FAIL", `${h1s} h1 element(s)`);

  return out;
}

/** Extract absolute <loc> URLs from a sitemap XML string. */
export function sitemapLocs(xml: string): Set<string> {
  return new Set([...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]));
}
