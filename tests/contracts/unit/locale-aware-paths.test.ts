import { describe, expect, test } from "vitest";
import { isLocaleAwarePath } from "@/i18n/locale-aware-paths";

describe("locale-aware route classification", () => {
  test.each([
    "/jobs/law-officer-jobs",
    "/hi/jobs/law-officer-jobs",
    "/jobs/land-and-building-2026-01/law-officer-jobs",
    "/hi/jobs/land-and-building-2026-01/law-officer-jobs",
    "/articles/eligibility-guide",
    "/hi/organizations/upsc",
    "/hi/jobs",
  ])("routes supported locale path %s through next-intl", (path) => {
    expect(isLocaleAwarePath(path)).toBe(true);
  });

  test.each([
    "/jobs",
    "/jobs/one/two/three",
    "/news",
    "/hi/news",
    "/hi/search",
    "/jobs/jkssb-advertisement-08-of-2026",
  ])("does not claim unsupported or intentionally excluded path %s", (path) => {
    expect(isLocaleAwarePath(path)).toBe(false);
  });
});
