/**
 * Canonical / locale / indexability contracts for the four localized entity
 * page types, asserted against each page's real generateMetadata() with the
 * data layer mocked. No server, DB, or network.
 *
 * Invariant IDs are defined in tests/contracts/README.md.
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Metadata } from "next";
import { SITE, canonicalOf, isNoindex, languagesOf, params } from "../helpers/metadata";

const getPostingBySlug = vi.fn();
const getRecruitmentWithPostsCached = vi.fn();
const getArticleBySlug = vi.fn();
const getOrganizationBySlug = vi.fn();
const getExamBySlug = vi.fn();

vi.mock("@/lib/queries", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPostingBySlug: (...a: unknown[]) => getPostingBySlug(...a),
  getPostingBySlugCached: (...a: unknown[]) => getPostingBySlug(...a),
  getArticleBySlug: (...a: unknown[]) => getArticleBySlug(...a),
}));
vi.mock("@/db/operations/get-recruitments", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getRecruitmentWithPostsCached: (...a: unknown[]) => getRecruitmentWithPostsCached(...a),
}));
vi.mock("@/db/operations/get-organizations", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getOrganizationBySlug: (...a: unknown[]) => getOrganizationBySlug(...a),
}));
vi.mock("@/db/operations/get-exams", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getExamBySlug: (...a: unknown[]) => getExamBySlug(...a),
}));

type Variant = "translated" | "untranslated";

/**
 * One row per localized entity type. `load` wires the mocked query to return
 * an entity that either has, or lacks, genuine Hindi content, then calls the
 * page's own generateMetadata for the requested locale.
 */
const ENTITY_TYPES: {
  name: string;
  basePath: string;
  load: (variant: Variant, locale: "en" | "hi") => Promise<Metadata>;
}[] = [
  {
    name: "job",
    basePath: "/jobs",
    load: async (variant, locale) => {
      getPostingBySlug.mockResolvedValue({
        id: 1,
        slug: "sample",
        title: "Sample Recruitment 2026",
        titleHi: variant === "translated" ? "नमूना भर्ती 2026" : null,
        description: "English description of the job.",
        descriptionHi: variant === "translated" ? "नौकरी का विवरण।" : null,
        indexTier: "A",
        organization: { name: "Sample Org" },
      });
      const mod = await import("@/app/[locale]/jobs/[slug]/page");
      return mod.generateMetadata(params({ slug: "sample", locale }));
    },
  },
  {
    name: "article",
    basePath: "/articles",
    load: async (variant, locale) => {
      getArticleBySlug.mockResolvedValue({
        slug: "sample",
        title: "Sample Guide",
        titleHi: variant === "translated" ? "नमूना गाइड" : null,
        dek: "A guide.",
        dekHi: variant === "translated" ? "एक गाइड।" : null,
        body: "Body text.",
        bodyHi: variant === "translated" ? "मुख्य पाठ।" : null,
      });
      const mod = await import("@/app/[locale]/articles/[slug]/page");
      return mod.generateMetadata(params({ slug: "sample", locale }));
    },
  },
  {
    name: "organization",
    basePath: "/organizations",
    load: async (variant, locale) => {
      getOrganizationBySlug.mockResolvedValue({
        slug: "sample",
        name: "Sample Organization",
        nameHi: variant === "translated" ? "नमूना संगठन" : null,
        description: "An organization.",
        descriptionHi: variant === "translated" ? "एक संगठन।" : null,
      });
      const mod = await import("@/app/[locale]/organizations/[slug]/page");
      return mod.generateMetadata(params({ slug: "sample", locale }));
    },
  },
  {
    name: "exam",
    basePath: "/exams",
    load: async (variant, locale) => {
      getExamBySlug.mockResolvedValue({
        exam: {
          slug: "sample",
          label: "Sample Exam",
          labelHi: variant === "translated" ? "नमूना परीक्षा" : null,
          description: "An exam.",
          descriptionHi: variant === "translated" ? "एक परीक्षा।" : null,
        },
      });
      const mod = await import("@/app/[locale]/exams/[slug]/page");
      return mod.generateMetadata(params({ slug: "sample", locale }));
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  getRecruitmentWithPostsCached.mockResolvedValue(null);
});

describe.each(ENTITY_TYPES)("$name page metadata", ({ basePath, load }) => {
  const enUrl = `${SITE}${basePath}/sample`;
  const hiUrl = `${SITE}/hi${basePath}/sample`;

  test("CAN-01 canonical is absolute and carries no query string or fragment", async () => {
    for (const locale of ["en", "hi"] as const) {
      const canonical = canonicalOf(await load("translated", locale));
      expect(canonical, `${locale}: canonical missing`).not.toBeNull();
      expect(canonical!.protocol).toBe("https:");
      expect(canonical!.search).toBe("");
      expect(canonical!.hash).toBe("");
    }
  });

  test("CAN-02 canonical is self-referencing for each language", async () => {
    expect(canonicalOf(await load("translated", "en"))!.href).toBe(enUrl);
    expect(canonicalOf(await load("translated", "hi"))!.href).toBe(hiUrl);
  });

  test("CAN-03 no canonical or hreflang target uses the redirecting /en/ prefix", async () => {
    for (const locale of ["en", "hi"] as const) {
      const meta = await load("translated", locale);
      const targets = [canonicalOf(meta)!.href, ...Object.values(languagesOf(meta) ?? {})];
      for (const t of targets) expect(new URL(t).pathname).not.toMatch(/^\/en(\/|$)/);
    }
  });

  test("CAN-04 English and Hindi URLs address the same entity (same slug, /hi prefix only)", async () => {
    const en = canonicalOf(await load("translated", "en"))!;
    const hi = canonicalOf(await load("translated", "hi"))!;
    expect(hi.pathname).toBe(`/hi${en.pathname}`);
  });

  test("LOC-02 untranslated Hindi page is noindex", async () => {
    expect(isNoindex(await load("untranslated", "hi"))).toBe(true);
  });

  test("LOC-03a hreflang is emitted only when the Hindi version genuinely exists", async () => {
    expect(languagesOf(await load("untranslated", "en"))).toBeNull();
    expect(languagesOf(await load("untranslated", "hi"))).toBeNull();
  });

  test("LOC-03b hreflang is reciprocal and complete when both versions exist", async () => {
    const fromEn = languagesOf(await load("translated", "en"));
    const fromHi = languagesOf(await load("translated", "hi"));
    expect(fromEn).toEqual({ en: enUrl, hi: hiUrl, "x-default": enUrl });
    expect(fromHi).toEqual(fromEn);
  });

  test("LOC-04 a translated Hindi page stays indexable", async () => {
    expect(isNoindex(await load("translated", "hi"))).toBe(false);
  });

  test("IDX-03 the eligible English entity page is indexable", async () => {
    expect(isNoindex(await load("untranslated", "en"))).toBe(false);
  });
});

describe("job page quality gate", () => {
  test("IDX-03b a Tier B job is indexable in English (Tier B pages are now indexed)", async () => {
    getPostingBySlug.mockResolvedValue({
      id: 2,
      slug: "thin",
      title: "Thin posting",
      titleHi: "पतली पोस्टिंग",
      description: "x",
      descriptionHi: "x",
      indexTier: "B",
      organization: { name: "Sample Org" },
    });
    const mod = await import("@/app/[locale]/jobs/[slug]/page");
    // Tier B English pages are now indexed (eligible = indexTier !== 'C')
    expect(isNoindex(await mod.generateMetadata(params({ slug: "thin", locale: "en" })))).toBe(false);
    // Hindi is still noindex when no Hindi content exists (hasHindi=false)
    expect(isNoindex(await mod.generateMetadata(params({ slug: "thin", locale: "hi" })))).toBe(true);
  });
  test("IDX-03c a Tier C job is noindex in both languages", async () => {
    getPostingBySlug.mockResolvedValue({
      id: 3,
      slug: "nonjob",
      title: "Admit Card 2026",
      titleHi: null,
      description: "x",
      descriptionHi: null,
      indexTier: "C",
      organization: { name: "Sample Org" },
    });
    const mod = await import("@/app/[locale]/jobs/[slug]/page");
    expect(isNoindex(await mod.generateMetadata(params({ slug: "nonjob", locale: "en" })))).toBe(true);
    expect(isNoindex(await mod.generateMetadata(params({ slug: "nonjob", locale: "hi" })))).toBe(true);
  });
});

describe("utility pages", () => {
  test("IDX-01 /search is noindex", async () => {
    const mod = await import("@/app/(default)/search/page");
    expect(isNoindex(mod.metadata)).toBe(true);
  });

  test("IDX-02a /jobs filter views (?kind=) are noindex", async () => {
    const mod = await import("@/app/(default)/jobs/page");
    const meta = await mod.generateMetadata({ searchParams: Promise.resolve({ kind: "GOVERNMENT" }) });
    expect(isNoindex(meta)).toBe(true);
  });

  test("IDX-02b /jobs search views (?q=) are noindex", async () => {
    const mod = await import("@/app/(default)/jobs/page");
    const meta = await mod.generateMetadata({ searchParams: Promise.resolve({ q: "clerk" }) });
    expect(isNoindex(meta)).toBe(true);
  });

  test("CAN-01 /jobs canonical never carries a query string, filtered or not", async () => {
    const mod = await import("@/app/(default)/jobs/page");
    for (const sp of [{}, { kind: "GOVERNMENT" }, { kind: "PRIVATE" }, { q: "clerk" }]) {
      const meta = await mod.generateMetadata({ searchParams: Promise.resolve(sp) });
      expect(canonicalOf(meta)!.search, JSON.stringify(sp)).toBe("");
    }
  });

  test("IDX-03c the unfiltered /jobs listing is indexable", async () => {
    const mod = await import("@/app/(default)/jobs/page");
    expect(isNoindex(await mod.generateMetadata({ searchParams: Promise.resolve({}) }))).toBe(false);
  });
});
