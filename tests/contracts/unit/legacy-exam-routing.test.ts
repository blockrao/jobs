import { describe, expect, test } from "vitest";
import { getLegacyExamRedirect, validateLegacyExamSlugs } from "@/lib/legacy-exam-routing";

const known = new Set(["ssc-cgl-2026", "upsc-civil-services"]);

describe("legacy root exam routing", () => {
  test("known legacy exam slugs redirect directly to the canonical exam route", () => {
    expect(getLegacyExamRedirect("/ssc-cgl-2026", known)).toBe("/exams/ssc-cgl-2026");
    expect(getLegacyExamRedirect("/upsc-civil-services/", known)).toBe("/exams/upsc-civil-services");
  });

  test("unknown root paths do not redirect or require a lookup", () => {
    expect(getLegacyExamRedirect("/made-up-path", known)).toBeNull();
  });

  test("locale roots, nested routes, and technical paths are not treated as exam slugs", () => {
    for (const path of ["/", "/en", "/hi", "/xx", "/hi/exams/ssc-cgl-2026", "/robots.txt", "/jobs/a/b"]) {
      expect(getLegacyExamRedirect(path, known), path).toBeNull();
    }
  });
});


describe("legacy exam manifest validation", () => {
  const reserved = new Set(["about", "jobs", "en", "hi"]);

  test("accepts unique valid slugs that do not shadow static routes", () => {
    expect(validateLegacyExamSlugs(["ssc-cgl-2026", "upsc-civil-services"], reserved)).toEqual([
      "ssc-cgl-2026",
      "upsc-civil-services",
    ]);
  });

  test("rejects empty, invalid, duplicate, and route-colliding manifests", () => {
    expect(() => validateLegacyExamSlugs([], reserved)).toThrow();
    expect(() => validateLegacyExamSlugs(["UPSC"], reserved)).toThrow();
    expect(() => validateLegacyExamSlugs(["ssc-cgl", "ssc-cgl"], reserved)).toThrow();
    expect(() => validateLegacyExamSlugs(["about"], reserved)).toThrow();
  });
});
