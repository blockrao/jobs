/** PQ-004: page defects fixed across all job pages. Pure functions, no DB. */
import { describe, expect, test } from "vitest";
import { formatAgeRange, formatDate, formatFee, vacanciesPhrase } from "@/lib/labels";
import { composeJobMetaDescription, composeJobMetaTitle, cutAtWord, fitTitle } from "@/lib/seo/meta-title";
import { isOnSiteUrl } from "@/lib/structured-data";

describe("PQ-004 display helpers", () => {
  test("D-1a: age never prints a placeholder dash", () => {
    expect(formatAgeRange(null, 38)).toBe("Up to 38 yrs");
    expect(formatAgeRange(18, 38)).toBe("18–38 yrs");
    expect(formatAgeRange(21, null)).toBe("From 21 yrs");
    expect(formatAgeRange(null, null)).toBeNull();
    expect(formatAgeRange(null, 38)).not.toContain("—");
  });
  test("D-1b: fee shows both stored fees, including an exempt 0", () => {
    expect(formatFee(25, 0)).toBe("₹25 (General) · ₹0 (Reserved)");
    expect(formatFee(100, null)).toBe("₹100 (General)");
    expect(formatFee(null, null)).toBeNull();
  });
  test("D-1c: vacancy grammar", () => {
    expect(vacanciesPhrase(1)).toBe("1 vacancy");
    expect(vacanciesPhrase(3)).toBe("3 vacancies");
  });
  test("D-1d: dates render in IST (IST midnight is not the previous day)", () => {
    expect(formatDate(new Date("2026-09-25T18:30:00Z"), "en-IN")).toContain("26");
    expect(formatDate(new Date("2026-10-16T12:30:00Z"), "en-IN")).toContain("16");
  });
});

describe("PQ-004 title and description", () => {
  const long = "UPSC Junior Technical Officer (Sugar Technology) Recruitment 2026 — National Sugar Institute, Kanpur";
  test("D-2a: an over-long title drops the trailing organization", () => {
    expect(fitTitle(long)).toBe("UPSC Junior Technical Officer (Sugar Technology) Recruitment 2026");
    expect(composeJobMetaTitle(long, ["National Sugar Institute, Kanpur"])).toBe("UPSC Junior Technical Officer (Sugar Technology) Recruitment 2026");
  });
  test("D-2b: a short title keeps the organization and is never cut mid-word", () => {
    expect(composeJobMetaTitle("Clerk Recruitment 2026", ["Punjab Court"])).toBe("Clerk Recruitment 2026 — Punjab Court");
    expect(fitTitle("A very long title without any dash segment that goes past the limit of seventy characters")).toContain("limit of seventy characters");
  });
  test("D-2c: cutAtWord cuts at a word boundary with an ellipsis, only when cut", () => {
    expect(cutAtWord("short text", 50)).toBe("short text");
    const c = cutAtWord("The Union Public Service Commission invites online applications for the post at the National Sugar Institute", 60);
    expect(c.endsWith("…")).toBe(true);
    expect(c.length).toBeLessThanOrEqual(60);
    expect(c.slice(0, -1).split(" ").every((w) => "The Union Public Service Commission invites online applications for the post at the National Sugar Institute".split(" ").includes(w))).toBe(true);
  });
  test("D-2d: meta description leads with facts, fits, and omits what is not stored", () => {
    const d = composeJobMetaDescription({ postName: "Junior Technical Officer (Sugar Technology)", orgName: "National Sugar Institute, Kanpur", vacancies: 1, lastDate: "16 Oct 2026" })!;
    expect(d).toContain("1 vacancy");
    expect(d).toContain("Last date 16 Oct 2026");
    expect(d.length).toBeLessThanOrEqual(155);
    const n = composeJobMetaDescription({ postName: "Clerk", orgName: "X Court", vacancies: null, lastDate: null })!;
    expect(n).not.toMatch(/vacanc|Last date/);
    expect(composeJobMetaDescription({ postName: null, orgName: "X", vacancies: 1, lastDate: null })).toBeNull();
  });
});

describe("PQ-004 structured data", () => {
  test("D-3a: directApply only for links on this site", () => {
    expect(isOnSiteUrl("https://upsconline.nic.in")).toBe(false);
    expect(isOnSiteUrl("https://www.joboye.com/apply/x")).toBe(true);
    expect(isOnSiteUrl("/apply/x")).toBe(true);
    expect(isOnSiteUrl(null)).toBe(false);
  });
});
