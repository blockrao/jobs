import { describe, expect, test } from "vitest";
import {
  checkCanonical,
  checkHreflang,
  checkIndexable,
  checkJsonLd,
  checkNoAggregators,
  checkPage,
  checkSitemap,
  checkStatus,
  formatTable,
} from "../../../src/scripts/verify-live-checks";
import { isAggregatorUrl, mentionsAggregator } from "../../../src/lib/aggregators";

const B = "https://www.joboye.com";
const E = { enUrl: `${B}/jobs/x`, hiUrl: `${B}/hi/jobs/x` };
const head = (self: string, extra = "") => `<html><head>
<link rel="canonical" href="${self}"/>
<link rel="alternate" hreflang="en" href="${E.enUrl}"/>
<link rel="alternate" hreflang="hi" href="${E.hiUrl}"/>
<link rel="alternate" hreflang="x-default" href="${E.enUrl}"/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList"}</script>
<script type="application/ld+json">{"@graph":[{"@type":"JobPosting"}]}</script>
${extra}</head><body><a href="https://upsc.gov.in/x">Official</a><p>Apply now</p></body></html>`;

describe("verify-live pure checks", () => {
  test("good page passes all checks", () => {
    const rs = checkPage({ label: "en", url: E.enUrl, status: 200, body: head(E.enUrl) }, E);
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(rs.length).toBe(6);
  });
  test("non-200 short-circuits", () => {
    expect(checkStatus(404)[0]).toBe(false);
    expect(checkPage({ label: "en", url: E.enUrl, status: 404, body: "" }, E)).toHaveLength(1);
  });
  test("noindex detected", () => {
    expect(checkIndexable(head(E.enUrl, '<meta name="robots" content="noindex, follow"/>'))[0]).toBe(false);
    expect(checkIndexable(head(E.enUrl, '<meta name="robots" content="index, follow"/>'))[0]).toBe(true);
  });
  test("canonical must be self", () => {
    expect(checkCanonical(head(E.hiUrl), E.enUrl)[0]).toBe(false);
    expect(checkCanonical("<html></html>", E.enUrl)[0]).toBe(false);
  });
  test("hreflang reciprocal set required", () => {
    expect(checkHreflang(head(E.enUrl), E)[0]).toBe(true);
    const missing = head(E.enUrl).replace(/<link rel="alternate" hreflang="x-default"[^>]*>/, "");
    const r = checkHreflang(missing, E);
    expect(r[0]).toBe(false);
    expect(r[1]).toContain("x-default");
  });
  test("JSON-LD parse errors and missing types fail", () => {
    expect(checkJsonLd(head(E.enUrl))[0]).toBe(true);
    expect(checkJsonLd(head(E.enUrl), ["JobPosting", "FAQPage"])[1]).toContain("FAQPage");
    expect(checkJsonLd('<script type="application/ld+json">{bad</script>')[0]).toBe(false);
  });
  test("aggregator links and names fail", () => {
    expect(checkNoAggregators(head(E.enUrl))[0]).toBe(true);
    expect(checkNoAggregators('<a href="https://www.freejobalert.com/x">s</a>')[0]).toBe(false);
    expect(checkNoAggregators('<a href="https://t.me/abc">s</a>')[0]).toBe(false);
    expect(checkNoAggregators("<p>Source: SarkariResult</p>")[0]).toBe(false);
    expect(checkNoAggregators('<script>var a="freejobalert"</script><p>ok</p>')[0]).toBe(true);
  });
  test("aggregator helpers", () => {
    for (const h of ["freejobalert.com", "sarkariresult.com", "sarkarinaukri.com", "t.me", "whatsapp.com", "arattai.in"]) {
      expect(isAggregatorUrl(`https://www.${h}/p`)).toBe(true);
    }
    expect(isAggregatorUrl("https://upsc.gov.in")).toBe(false);
    expect(mentionsAggregator("Arattai group")).toBe(true);
  });
  test("sitemap presence", () => {
    const xml = `<urlset><url><loc>${E.enUrl}</loc></url></urlset>`;
    const rs = checkSitemap(200, xml, [E.enUrl, E.hiUrl]);
    expect(rs.map((r) => r.ok)).toEqual([true, false]);
    expect(checkSitemap(500, "", [E.enUrl])[0].ok).toBe(false);
  });
  test("table renders pass/fail", () => {
    expect(formatTable([{ page: "en", check: "x", ok: false, detail: "d" }])).toContain("FAIL");
  });
});
