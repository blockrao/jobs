import { describe, expect, test } from "vitest";
import { isLocaleAwarePath } from "@/i18n/locale-aware-paths";
import { readSource, stripComments } from "../helpers/source";

describe("localized Post Leaf route contract", () => {
  test("the shared locale classifier recognizes canonical Post Leaf paths and locale-prefixed equivalents", () => {
    expect(isLocaleAwarePath("/jobs/land-and-building-department-govt-nct-delhi-2026-01/law-officer-jobs")).toBe(true);
    expect(isLocaleAwarePath("/hi/jobs/land-and-building-department-govt-nct-delhi-2026-01/law-officer-jobs")).toBe(true);
    expect(isLocaleAwarePath("/en/jobs/land-and-building-department-govt-nct-delhi-2026-01/law-officer-jobs/")).toBe(true);
  });

  test("the shared locale classifier preserves one-segment compatibility routes without treating deeper paths as localized", () => {
    expect(isLocaleAwarePath("/jobs/land-and-building-department-govt-nct-delhi-2026-01")).toBe(true);
    expect(isLocaleAwarePath("/jobs/recruitment/post/extra")).toBe(false);
    expect(isLocaleAwarePath("/jobs/")).toBe(true);
    expect(isLocaleAwarePath("/jobs/jkssb-advertisement-08-of-2026")).toBe(false);
  });

  test("explicitly prefixed Post Leaf URLs reach next-intl before locale fallback redirects", () => {
    const proxy = stripComments(readSource("src/proxy.ts"));
    expect(proxy).toContain("if (/^\\/(en|hi)\\/jobs\\/[^/]+\\/[^/]+\\/?$/.test(pathname)) {");
    expect(proxy.indexOf("return intlMiddleware(request);")).toBeLessThan(
      proxy.indexOf("const localePrefixMatch = pathname.match"),
    );
  });

  test("leaf metadata derives its canonical path from the resolved Post relationship", () => {
    const route = stripComments(readSource("src/app/[locale]/jobs/[slug]/[post-slug]/page.tsx"));
    expect(route).toContain('const canonicalSlug = post.recruitmentSlug + "/" + post.slug;');
    expect(route).toContain("slug: canonicalSlug");
    expect(route).toContain("hasHindi: false");
  });
});
