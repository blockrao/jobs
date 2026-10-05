/** PQ-008: extractor contracts, fixture reproduces the real section structure of a FreeJobAlert page (GSRTC Helper, 2026-10-05). */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parseFreeJobAlertArticle } from "@/enrich/freejobalert-article";

const html = readFileSync("tests/fixtures/freejobalert-gsrtc.html", "utf8");

describe("parseFreeJobAlertArticle", () => {
  const f = parseFreeJobAlertArticle(html);
  test("age min and max", () => { expect(f.ageLimitMin).toBe(18); expect(f.ageLimitMax).toBe(45); });
  test("fee general and reserved", () => { expect(f.applicationFeeGeneral).toBe(300); expect(f.applicationFeeReserved).toBe(200); });
  test("salary from prose", () => { expect(f.salaryMin).toBe(21100); });
  test("links by label, ignoring social links", () => {
    expect(f.applyUrl).toContain("ojas.gujarat.gov.in/AdvtDetails");
    expect(f.officialNotificationUrl).toContain("a.pdf");
    expect(f.officialWebsiteUrl).toBe("https://gsrtc.in/");
  });
  test("tables kept as facts", () => {
    expect(f.extraContent?.tables?.map((t) => t.title)).toEqual(["Age limit", "Application fee", "Selection process"]);
  });
  test("nothing invented on an empty page", () => {
    const e = parseFreeJobAlertArticle("<html><body><article><h2>X Age Limit</h2><p>See notice.</p></article></body></html>");
    expect(e.ageLimitMax).toBeUndefined();
    expect(e.unparsed).toContain("age");
  });
});

import { isAggregatorUrl, mentionsAggregator } from "@/lib/aggregators";
describe("aggregator hygiene", () => {
  test("aggregator and social links are rejected, official links kept", () => {
    expect(isAggregatorUrl("https://www.freejobalert.com/articles/x")).toBe(true);
    expect(isAggregatorUrl("https://t.me/FreeJobAlertOfficially")).toBe(true);
    expect(isAggregatorUrl("https://ojas.gujarat.gov.in/a.pdf")).toBe(false);
  });
  test("aggregator names are detected", () => {
    expect(mentionsAggregator("notification via FreeJobAlert.")).toBe(true);
    expect(mentionsAggregator("Source: sarkariresult")).toBe(true);
    expect(mentionsAggregator("BPSC notification")).toBe(false);
  });
  test("extractor never returns an aggregator link as apply or official", () => {
    const f = parseFreeJobAlertArticle('<article><h2>X Important Links</h2><ul><li>Apply Online: <a href="https://www.freejobalert.com/x">Click</a></li><li>Official Notification: <a href="https://t.me/x">Click</a></li></ul></article>');
    expect(f.applyUrl).toBeUndefined();
    expect(f.officialNotificationUrl).toBeUndefined();
  });
});
