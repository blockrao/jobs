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

const wrap = (h: string, body: string) => parseFreeJobAlertArticle(`<article><h2>X ${h}</h2>${body}</article>`);
describe("layout variants seen on real pages", () => {
  test("age: 'between 19 and 40 years'", () => {
    const f = wrap("Age Limit", "<p>Candidates must be between 19 and 40 years of age as on 01.01.2026.</p>");
    expect([f.ageLimitMin, f.ageLimitMax]).toEqual([19, 40]);
  });
  test("age: 'not less than 21 years and not more than 40 years'", () => {
    const f = wrap("Age Limit", "<p>Candidates should not be less than 21 years and not more than 40 years of age. Age relaxation of 5 years applies.</p>");
    expect([f.ageLimitMin, f.ageLimitMax]).toEqual([21, 40]);
  });
  test("age: min/max columns, relaxation column ignored", () => {
    const f = wrap("Age Limit", "<table><tr><th>Category</th><th>Minimum Age</th><th>Maximum Age</th><th>Relaxation in Upper Age Limit</th></tr><tr><td>UR</td><td>18 years</td><td>37 years</td><td>-</td></tr><tr><td>SC</td><td>18 years</td><td>37 years</td><td>5 years</td></tr></table>");
    expect([f.ageLimitMin, f.ageLimitMax]).toEqual([18, 37]);
  });
  test("age: not stated stays empty", () => {
    expect(wrap("Age Limit", "<p>Age limit is not specified in this brief notification.</p>").ageLimitMax).toBeUndefined();
  });
  test("fee: Total Fee column, General row preferred", () => {
    const f = wrap("Application Fee", "<table><tr><th>Category</th><th>Facilitation (₹)</th><th>Total Fee (₹)</th></tr><tr><td>SC/BC</td><td>550</td><td>710</td></tr><tr><td>General</td><td>1000</td><td>1,200</td></tr></table>");
    expect([f.applicationFeeGeneral, f.applicationFeeReserved]).toEqual([1200, 710]);
  });
  test("fee: prose sentence", () => {
    expect(wrap("Application Fee", "<p>The application fee is Rs. 100 payable online.</p>").applicationFeeGeneral).toBe(100);
  });
  test("salary: several posts give lowest and highest", () => {
    const f = wrap("Salary", "<table><tr><th>Post</th><th>Pay</th></tr><tr><td>A</td><td>₹19,900 – ₹63,200</td></tr><tr><td>B</td><td>₹35,400 – ₹1,12,400</td></tr></table>");
    expect([f.salaryMin, f.salaryMax]).toEqual([19900, 112400]);
  });
});

describe("sanity and parentheses", () => {
  test("cell 'Minimum 21 years, Maximum 40 years' with superannuation note in brackets", () => {
    const f = wrap("Age Limit", "<table><tr><th>Post</th><th>Age Limit (as on 01.07.2026)</th></tr><tr><td>Teacher Urban</td><td>Minimum 21 years, Maximum 40 years</td></tr><tr><td>Teacher Sambaddh</td><td>Minimum 21 years (superannuation age for this post is 62 years)</td></tr></table>");
    expect([f.ageLimitMin, f.ageLimitMax]).toEqual([21, 40]);
  });
  test("min above max is dropped and flagged", () => {
    const f = wrap("Age Limit", "<p>Candidates must be between 40 and 28 years of age.</p>");
    expect(f.ageLimitMin).toBeUndefined();
    expect(f.review).toContain("age-inconsistent");
  });
});

test("fee: reserved stored only when all other categories agree", () => {
  const f = wrap("Application Fee", "<table><tr><th>Category</th><th>Fee</th></tr><tr><td>General</td><td>₹1,000</td></tr><tr><td>SC/ST</td><td>₹500</td></tr><tr><td>PwBD</td><td>₹300</td></tr></table>");
  expect(f.applicationFeeGeneral).toBe(1000);
  expect(f.applicationFeeReserved).toBeUndefined();
});
