/**
 * The central public-representation policy (src/lib/seo), asserted directly.
 * Page-level contracts in metadata.test.ts prove pages use it; these prove
 * the rules themselves. Rule numbers refer to the SEO-001 policy.
 */
import { describe, expect, test } from "vitest";
import { entitySeo, listingSeo, pageSeo, sitemapAlternates } from "@/lib/seo";
import { SITE } from "../helpers/metadata";

const NOINDEX = { index: false, follow: true };

describe("entity pages", () => {
  test("POL-01 untranslated Hindi page: noindex, follow; canonical to the English address; no hreflang", () => {
    const seo = entitySeo({ base: "/organizations", slug: "x", locale: "hi", hasHindi: false });
    expect(seo.robots).toEqual(NOINDEX);
    expect(seo.alternates).toEqual({ canonical: "/organizations/x" });
    expect(seo.indexable).toBe(false);
  });

  test("POL-02 translated pair: each self-canonical, same complete hreflang set", () => {
    const en = entitySeo({ base: "/exams", slug: "x", locale: "en", hasHindi: true });
    const hi = entitySeo({ base: "/exams", slug: "x", locale: "hi", hasHindi: true });
    expect(en.alternates?.canonical).toBe("/exams/x");
    expect(hi.alternates?.canonical).toBe("/hi/exams/x");
    const languages = { en: `${SITE}/exams/x`, hi: `${SITE}/hi/exams/x`, "x-default": `${SITE}/exams/x` };
    expect(en.alternates?.languages).toEqual(languages);
    expect(hi.alternates?.languages).toEqual(languages);
    expect(en.robots).toBeUndefined();
    expect(hi.robots).toBeUndefined();
  });

  test("POL-03 an ineligible entity is noindex in both languages and carries no hreflang", () => {
    for (const locale of ["en", "hi"]) {
      const seo = entitySeo({ base: "/jobs", slug: "x", locale, hasHindi: true, eligible: false });
      expect(seo.robots).toEqual(NOINDEX);
      expect(seo.alternates?.languages).toBeUndefined();
    }
  });

  test("POL-04 English-only eligible entity: indexable, self-canonical, no hreflang", () => {
    const seo = entitySeo({ base: "/articles", slug: "x", locale: "en", hasHindi: false });
    expect(seo.robots).toBeUndefined();
    expect(seo.alternates).toEqual({ canonical: "/articles/x" });
  });
});

describe("listings and fixed pages", () => {
  test("POL-05 a listing is indexable only unfiltered, and always canonical to the unfiltered path", () => {
    expect(listingSeo("/jobs", { kind: undefined, q: undefined })).toEqual({ alternates: { canonical: "/jobs" }, robots: undefined });
    for (const params of [{ kind: "GOVERNMENT" }, { q: "clerk" }, { kind: "PRIVATE", q: "x" }]) {
      expect(listingSeo("/jobs", params)).toEqual({ alternates: { canonical: "/jobs" }, robots: NOINDEX });
    }
  });

  test("POL-06 noindex is always follow", () => {
    expect(pageSeo("/search", { index: false }).robots).toEqual(NOINDEX);
  });

  test("POL-07 recruitment and position pages are noindex until they are canonical public projections (D2)", async () => {
    const { readSource, stripComments } = await import("../helpers/source");
    for (const f of [
      "src/app/(default)/recruitments/page.tsx",
      "src/app/(default)/positions/page.tsx",
      "src/app/(default)/positions/[slug]/page.tsx",
    ]) {
      expect(stripComments(readSource(f)), f).toMatch(/pageSeo\([^)]*\{ index: false \}\)/);
    }

    // This legacy endpoint is a redirect, not a rendered entity page; its
    // indexability is determined by the /jobs/[slug] destination.
    const redirectRoute = stripComments(readSource("src/app/(default)/recruitments/[slug]/page.tsx"));
    expect(redirectRoute).toContain("redirect");
    expect(redirectRoute).toContain("/jobs/${slug}");
  });
});

describe("sitemap", () => {
  test("POL-08 a Hindi alternate is listed only when the Hindi version exists", () => {
    expect(sitemapAlternates("/exams", "x", false)).toEqual({});
    expect(sitemapAlternates("/exams", "x", true).alternates?.languages?.hi).toBe(`${SITE}/hi/exams/x`);
  });

  test("POL-09 the sitemap refreshes without a deployment, within the 24-hour requirement (D1)", async () => {
    const mod = await import("@/app/sitemap");
    expect(mod.revalidate).toBeGreaterThan(0);
    expect(mod.revalidate).toBeLessThanOrEqual(86400);
  });
});
