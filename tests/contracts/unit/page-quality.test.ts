/**
 * PQ-002 completeness standard and PQ-003 live page rules.
 * Pure functions with fixtures: no DB, no network.
 */
import { describe, expect, test } from "vitest";
import {
  COMPLETENESS_CHECKS,
  MIN_DESCRIPTION_CHARS,
  MIN_NOTICE_FAQS,
  completenessReportSql,
  evaluateCompleteness,
  type CompletenessInput,
} from "@/lib/content-quality/completeness";
import { analyzePage, sitemapLocs, type PageFacts } from "@/lib/verify-live";

const EMPTY: CompletenessInput = {
  totalVacancies: null, salaryMin: null, salaryMax: null, ageLimitMin: null, ageLimitMax: null,
  applicationFeeGeneral: null, applicationFeeReserved: null, eligibility: null, requirements: null,
  locationRegion: null, locationCity: null, validThrough: null, officialNotificationUrl: null, applyUrl: null,
  lastVerifiedAt: null, description: null, extraContent: null, titleHi: null, descriptionHi: null, eligibilityHi: null,
};

const FULL: CompletenessInput = {
  totalVacancies: 10, salaryMin: 25000, salaryMax: 80000, ageLimitMin: 18, ageLimitMax: 35,
  applicationFeeGeneral: 100, applicationFeeReserved: 0, eligibility: "Graduate", requirements: "Typing",
  locationRegion: "Bihar", locationCity: null, validThrough: new Date("2026-12-01"),
  officialNotificationUrl: "https://example.gov.in/n.pdf", applyUrl: "https://example.gov.in/apply",
  lastVerifiedAt: new Date("2026-10-05"), description: "x".repeat(MIN_DESCRIPTION_CHARS),
  extraContent: { faqs: Array.from({ length: MIN_NOTICE_FAQS }, () => ({ q: "q", a: "a" })) },
  titleHi: "शीर्षक", descriptionHi: "विवरण", eligibilityHi: "स्नातक",
};

describe("PQ-002 completeness standard", () => {
  test("C-1a: an empty posting passes nothing and lists every check as missing", () => {
    const r = evaluateCompleteness(EMPTY);
    expect(r.passed).toBe(0);
    expect(r.score).toBe(0);
    expect(r.missing).toHaveLength(COMPLETENESS_CHECKS.length);
  });

  test("C-1b: a complete posting passes everything", () => {
    const r = evaluateCompleteness(FULL);
    expect(r.passed).toBe(r.total);
    expect(r.score).toBe(100);
    expect(r.missing).toEqual([]);
  });

  test("C-1c: check keys are unique and each has SQL", () => {
    const keys = COMPLETENESS_CHECKS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of COMPLETENESS_CHECKS) expect(c.sql.length).toBeGreaterThan(5);
  });

  test("C-1d: a fee of 0 (exempt) counts as a stated fee; whitespace-only text does not count", () => {
    expect(evaluateCompleteness({ ...EMPTY, applicationFeeGeneral: 0 }).missing).not.toContain("fee");
    expect(evaluateCompleteness({ ...EMPTY, eligibility: "   " }).missing).toContain("qualification");
  });

  test("C-1e: depth thresholds are exact", () => {
    expect(evaluateCompleteness({ ...FULL, description: "x".repeat(MIN_DESCRIPTION_CHARS - 1) }).missing).toContain("description_depth");
    expect(evaluateCompleteness({ ...FULL, description: `<p>${"x".repeat(MIN_DESCRIPTION_CHARS)}</p>` }).missing).not.toContain("description_depth");
    expect(evaluateCompleteness({ ...FULL, extraContent: { faqs: [{}, {}] } }).missing).toContain("notice_faqs");
  });

  test("C-1f: groups add up", () => {
    const r = evaluateCompleteness({ ...FULL, titleHi: null, descriptionHi: null, eligibilityHi: null });
    expect(r.byGroup.hindi).toEqual({ passed: 0, total: 3 });
    expect(r.byGroup.facts.passed).toBe(r.byGroup.facts.total);
  });

  test("C-1g: the report SQL is generated from the same list and is read-only", () => {
    const q = completenessReportSql();
    for (const c of COMPLETENESS_CHECKS) expect(q).toContain(`'${c.key}' as key`);
    expect(q.match(/union all/g)).toHaveLength(COMPLETENESS_CHECKS.length - 1);
    expect(q).not.toMatch(/\b(insert|update|delete|drop|alter|truncate)\b/i);
  });
});

const BASE = "https://www.joboye.com";
const ENP = "/jobs/clerk-2026";
const GOOD_HTML = (over: { lang?: string; canonical?: string; robots?: string; title?: string; hreflang?: boolean; ld?: string } = {}) => `<!doctype html><html lang="${over.lang ?? "en"}"><head>
<title>${over.title ?? "Clerk Recruitment 2026 — Punjab Court | JobOye"}</title>
<meta name="description" content="Plain description."/>
<link rel="canonical" href="${over.canonical ?? `${BASE}${ENP}`}"/>
${over.robots ? `<meta name="robots" content="${over.robots}"/>` : ""}
${over.hreflang === false ? "" : `<link rel="alternate" hreflang="en" href="${BASE}${ENP}"/><link rel="alternate" hreflang="hi" href="${BASE}/hi${ENP}"/><link rel="alternate" hreflang="x-default" href="${BASE}${ENP}"/>`}
<script type="application/ld+json">${over.ld ?? '{"@graph":[{"@type":"JobPosting"},{"@type":"FAQPage"}]}'}</script>
</head><body><h1>Clerk</h1></body></html>`;

const facts = (html: string, extra: Partial<PageFacts> = {}): PageFacts => ({
  base: BASE, enPath: ENP, locale: "en", status: 200, html,
  sitemapUrls: new Set([`${BASE}${ENP}`]), ...extra,
});
const verdicts = (r: ReturnType<typeof analyzePage>) => Object.fromEntries(r.map((x) => [x.check, x.verdict]));

describe("PQ-003 live page rules", () => {
  test("V-1a: a healthy indexable English page passes every check", () => {
    const v = verdicts(analyzePage(facts(GOOD_HTML())));
    expect(Object.values(v).filter((x) => x === "FAIL")).toEqual([]);
    expect(v.sitemap).toBe("PASS");
    expect(v.hreflang).toBe("PASS");
  });

  test("V-1b: a non-200 stops with one failure", () => {
    const r = analyzePage(facts("", { status: 404 }));
    expect(r).toEqual([{ check: "status", verdict: "FAIL", detail: "HTTP 404" }]);
  });

  test("V-1c: a repeated title segment fails (the live defect fixed by SEARCH-001)", () => {
    const html = GOOD_HTML({ title: "Clerk 2026 — Punjab Court — Punjab Court | JobOye" });
    expect(verdicts(analyzePage(facts(html))).title).toBe("FAIL");
  });

  test("V-1d: an indexable page missing from the sitemap fails; a noindex page in it fails", () => {
    expect(verdicts(analyzePage(facts(GOOD_HTML(), { sitemapUrls: new Set() }))).sitemap).toBe("FAIL");
    expect(verdicts(analyzePage(facts(GOOD_HTML({ robots: "noindex, follow" })))).sitemap).toBe("FAIL");
    expect(verdicts(analyzePage(facts(GOOD_HTML({ robots: "noindex, follow" }), { sitemapUrls: new Set() }))).sitemap).toBe("PASS");
  });

  test("V-1e: wrong hreflang targets fail; none is informational", () => {
    const bad = GOOD_HTML().replace(`${BASE}/hi${ENP}`, `${BASE}/hi/jobs/other`);
    expect(verdicts(analyzePage(facts(bad))).hreflang).toBe("FAIL");
    expect(verdicts(analyzePage(facts(GOOD_HTML({ hreflang: false })))).hreflang).toBe("INFO");
  });

  test("V-1f: invalid JSON-LD fails; JobPosting on a noindex page fails", () => {
    expect(verdicts(analyzePage(facts(GOOD_HTML({ ld: "{not json" })))).json_ld).toBe("FAIL");
    expect(verdicts(analyzePage(facts(GOOD_HTML({ robots: "noindex, follow" }), { sitemapUrls: new Set() }))).json_ld_noindex).toBe("FAIL");
  });

  test("V-1g: a Hindi page that canonicalises to English must be noindex", () => {
    const html = GOOD_HTML({ lang: "hi", canonical: `${BASE}${ENP}`, hreflang: false });
    expect(verdicts(analyzePage(facts(html, { locale: "hi" }))).hi_canonical_to_en).toBe("FAIL");
    const ok = GOOD_HTML({ lang: "hi", canonical: `${BASE}${ENP}`, hreflang: false, robots: "noindex, follow", ld: '{"@type":"WebSite"}' });
    expect(verdicts(analyzePage(facts(ok, { locale: "hi" }))).hi_canonical_to_en).toBeUndefined();
  });

  test("V-1h: language attribute must match the locale", () => {
    expect(verdicts(analyzePage(facts(GOOD_HTML({ lang: "hi" })))).html_lang).toBe("FAIL");
  });

  test("V-1i: sitemap parsing", () => {
    expect(sitemapLocs("<urlset><url><loc>https://a/x</loc></url><url><loc> https://a/y </loc></url></urlset>")).toEqual(
      new Set(["https://a/x", "https://a/y"])
    );
  });
});
