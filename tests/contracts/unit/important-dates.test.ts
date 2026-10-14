import { describe, expect, test } from "vitest";
import { isDisplayableRecruitmentDate } from "@/components/job-posting/sections/important-dates";
import { isDisplayableRecruitmentDate as sharedGuard, toPlausibleRecruitmentDate } from "@/lib/recruitment-dates";
import { resolveDeadline } from "@/lib/resolvers/fact-resolvers";
import type { JobPostingData } from "@/types/job-posting";

const NOW = new Date("2026-10-14T00:00:00Z");

describe("candidate-facing recruitment date guard", () => {
  test("the component re-exports the single shared guard", () => {
    expect(isDisplayableRecruitmentDate).toBe(sharedGuard);
  });

  test("rejects known far-future sentinel dates", () => {
    expect(isDisplayableRecruitmentDate("2099-12-31T00:00:00Z")).toBe(false);
    expect(isDisplayableRecruitmentDate("2099-12-31 00:00:00+00")).toBe(false);
    expect(isDisplayableRecruitmentDate(new Date("2099-12-31T00:00:00Z"))).toBe(false);
  });

  test("rejects invalid and non-date values", () => {
    expect(isDisplayableRecruitmentDate("not-a-date")).toBe(false);
    expect(isDisplayableRecruitmentDate("")).toBe(false);
    expect(isDisplayableRecruitmentDate(null)).toBe(false);
    expect(isDisplayableRecruitmentDate(undefined)).toBe(false);
    expect(isDisplayableRecruitmentDate(20991231)).toBe(false);
  });

  test("preserves plausible dates", () => {
    expect(isDisplayableRecruitmentDate("2026-10-14T00:00:00Z")).toBe(true);
    expect(isDisplayableRecruitmentDate("2028-03-31T00:00:00Z")).toBe(true);
    expect(toPlausibleRecruitmentDate("2028-03-31T00:00:00Z")?.toISOString()).toBe("2028-03-31T00:00:00.000Z");
    expect(toPlausibleRecruitmentDate("2099-12-31T00:00:00Z")).toBeNull();
  });
});

describe("resolveDeadline never turns a sentinel into an open deadline", () => {
  const base = { id: 1, slug: "x", title: "x" } as unknown as JobPostingData;

  test("sentinel enrichment deadline resolves to UNKNOWN, not OPEN", () => {
    const post = { ...base, enrichment: { applicationClosingDate: new Date("2099-12-31T00:00:00Z") } } as JobPostingData;
    expect(resolveDeadline(post, NOW)).toEqual({ date: null, state: "UNKNOWN" });
  });

  test("sentinel enrichment deadline falls through to a confirmed recruitment deadline", () => {
    const post = {
      ...base,
      enrichment: { applicationClosingDate: new Date("2099-12-31T00:00:00Z") },
      postDeadlineConfirmedForRecruitment: true,
      recruitmentApplicationEndDate: new Date("2026-10-30T00:00:00Z"),
    } as Parameters<typeof resolveDeadline>[0];
    expect(resolveDeadline(post, NOW)).toEqual({ date: new Date("2026-10-30T00:00:00Z"), state: "OPEN" });
  });

  test("sentinel recruitment deadline also resolves to UNKNOWN", () => {
    const post = {
      ...base,
      postDeadlineConfirmedForRecruitment: true,
      recruitmentApplicationEndDate: new Date("2099-12-31T00:00:00Z"),
    } as Parameters<typeof resolveDeadline>[0];
    expect(resolveDeadline(post, NOW)).toEqual({ date: null, state: "UNKNOWN" });
  });

  test("plausible past and future deadlines still resolve to CLOSED and OPEN", () => {
    const past = { ...base, enrichment: { applicationClosingDate: new Date("2026-10-01T00:00:00Z") } } as JobPostingData;
    const future = { ...base, enrichment: { applicationClosingDate: new Date("2026-11-01T00:00:00Z") } } as JobPostingData;
    expect(resolveDeadline(past, NOW).state).toBe("CLOSED");
    expect(resolveDeadline(future, NOW).state).toBe("OPEN");
  });
});
