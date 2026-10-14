import { describe, expect, test } from "vitest";
import { isDisplayableRecruitmentDate } from "@/components/job-posting/sections/important-dates";

describe("candidate-facing recruitment date guard", () => {
  test("rejects known far-future sentinel dates", () => {
    expect(isDisplayableRecruitmentDate("2099-12-31T00:00:00Z")).toBe(false);
    expect(isDisplayableRecruitmentDate(new Date("2099-12-31T00:00:00Z"))).toBe(false);
  });

  test("rejects invalid and non-date values", () => {
    expect(isDisplayableRecruitmentDate("not-a-date")).toBe(false);
    expect(isDisplayableRecruitmentDate("")).toBe(false);
    expect(isDisplayableRecruitmentDate(null)).toBe(false);
    expect(isDisplayableRecruitmentDate(20991231)).toBe(false);
  });

  test("preserves plausible dates", () => {
    expect(isDisplayableRecruitmentDate("2026-10-14T00:00:00Z")).toBe(true);
    expect(isDisplayableRecruitmentDate("2028-03-31T00:00:00Z")).toBe(true);
  });
});
