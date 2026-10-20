import { describe, expect, test } from "vitest";
import {
  checkCanonical,
  checkNoHreflang,
  checkRedirect,
  checkIndexable,
  checkJsonLd,
  checkNoAggregators,
  checkPage,
  checkSitemap,
  checkStatus,
  formatTable,
} from "../../../src/scripts/verify-live-checks";
import { isAggregatorUrl, mentionsAggregator, publicLink, stripAggregatorTag } from "../../../src/lib/aggregators";

const B = "https://www.joboye.com";
const HUB = `${B}/jobs/x`;
const LEAF = `${B}/jobs/x/y`;
const E = { canonicalUrl: HUB };
const head = (self: string, extra = "") => `<html><head>
<link rel="canonical" href="${self}"/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList"}</script>
<script type="application/ld+json">{"@graph":[{"@type":"JobPosting"}]}</script>
${extra}</head><body><a href="https://upsc.gov.in/x">Official</a><p>Apply now</p></body></html>`;

describe("verify-live pure checks", () => {
  test("good page passes all checks", () => {
    const rs = checkPage({ label: "hub", url: HUB, status: 200, body: head(HUB) }, E);
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(rs.length).toBe(6);
  });
  test("non-200 short-circuits", () => {
    expect(checkStatus(404)[0]).toBe(false);
    expect(checkPage({ label: "hub", url: HUB, status: 404, body: "" }, E)).toHaveLength(1);
  });
  test("noindex detected", () => {
    expect(checkIndexable(head(HUB, '<meta name="robots" content="noindex, follow"/>'))[0]).toBe(false);
    expect(checkIndexable(head(HUB, '<meta name="robots" content="index, follow"/>'))[0]).toBe(true);
  });
  test("canonical must be self", () => {
    expect(checkCanonical(head(LEAF), HUB)[0]).toBe(false);
    expect(checkCanonical(head(HUB), HUB)[0]).toBe(true);
    expect(checkCanonical("<html></html>", HUB)[0]).toBe(false);
  });
  test("hreflang alternates are a regression under the one-URL contract", () => {
    expect(checkNoHreflang(head(HUB))[0]).toBe(true);
    const r = checkNoHreflang(head(HUB, `<link rel="alternate" hreflang="hi" href="${B}/hi/jobs/x"/>`));
    expect(r[0]).toBe(false);
    expect(r[1]).toContain("hi");
  });
  test("legacy URLs must 301 straight to the hub", () => {
    expect(checkRedirect(301, HUB, HUB)[0]).toBe(true);
    expect(checkRedirect(308, HUB, HUB)[0]).toBe(true);
    expect(checkRedirect(301, `${B}/jobs/category-other`, HUB)[0]).toBe(false);
    expect(checkRedirect(404, null, HUB)[0]).toBe(false);
    expect(checkRedirect(307, HUB, HUB)[0]).toBe(false);
  });
  test("JSON-LD parse errors and missing types fail", () => {
    expect(checkJsonLd(head(HUB))[0]).toBe(true);
    expect(checkJsonLd(head(HUB), ["JobPosting", "FAQPage"])[1]).toContain("FAQPage");
    expect(checkJsonLd('<script type="application/ld+json">{bad</script>')[0]).toBe(false);
  });
  test("aggregator links and names fail", () => {
    expect(checkNoAggregators(head(HUB))[0]).toBe(true);
    expect(checkNoAggregators('<a href="https://www.freejobalert.com/x">s</a>')[0]).toBe(false);
    expect(checkNoAggregators('<a href="https://t.me/abc">s</a>')[0]).toBe(false);
    expect(checkNoAggregators('<a href="https://wa.me/?text=share">Share</a>')[0]).toBe(true);
    expect(checkNoAggregators('<a href="/jobs">rel</a>')[0]).toBe(true);
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
    const xml = `<urlset><url><loc>${HUB}</loc></url></urlset>`;
    const rs = checkSitemap(200, xml, [HUB, LEAF]);
    expect(rs.map((r) => r.ok)).toEqual([true, false]);
    expect(checkSitemap(500, "", [HUB])[0].ok).toBe(false);
  });
  test("table renders pass/fail", () => {
    expect(formatTable([{ page: "en", check: "x", ok: false, detail: "d" }])).toContain("FAIL");
  });
});

describe("aggregator hygiene helpers", () => {
  test("hosts", () => {
    expect(isAggregatorUrl("https://www.sarkari-naukri.in/gate2027-iitm-ac-in/")).toBe(true);
    expect(isAggregatorUrl("https://www.freejobalert.com/articles/x")).toBe(true);
    expect(isAggregatorUrl("https://www.sarkariresult.com/2026/x/")).toBe(true);
    expect(isAggregatorUrl("https://bpsc.bihar.gov.in/notice.pdf")).toBe(false);
  });
  test("names and tags", () => {
    expect(mentionsAggregator("listed on Sahi Sarkari Jobs")).toBe(true);
    expect(mentionsAggregator("Sarkari-Naukri.in")).toBe(true);
    expect(mentionsAggregator("Sarkari Vidyalaya Daman")).toBe(false);
    expect(stripAggregatorTag("Notification released (via freejobalert)")).toBe("Notification released");
  });
  test("publicLink", () => {
    expect(publicLink("https://www.freejobalert.com/a")).toBeNull();
    expect(publicLink("https://ssc.nic.in/x")).toBe("https://ssc.nic.in/x");
    expect(publicLink(null)).toBeNull();
  });
});
