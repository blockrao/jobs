import { describe, expect, test } from "vitest";
import { getLegacyExamRedirect } from "@/lib/legacy-exam-routing";

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
