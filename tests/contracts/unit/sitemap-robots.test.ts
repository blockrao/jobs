/**
 * Sitemap and robots.txt contracts, asserted against the real route
 * handlers with the data layer mocked.
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SITE } from "../helpers/metadata";

const rows = {
  postings: [] as unknown[],
  articles: [] as unknown[],
  categories: [] as unknown[],
  organizations: [] as unknown[],
  exams: [] as unknown[],
  postLeaves: [] as unknown[],
};

vi.mock("@/lib/queries", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPostingSlugsPageForSitemap: async () => rows.postings,
  getAllArticleSlugsForSitemap: async () => rows.articles,
  getAllCategorySlugsForSitemap: async () => rows.categories,
  getAllOrganizationSlugsForSitemap: async () => rows.organizations,
  getAllExamSlugsForSitemap: async () => rows.exams,
  getPostSlugsForSitemap: async () => rows.postLeaves,
  listCommissionsWithExams: async () => [],
}));

const now = new Date("2026-10-01T00:00:00Z");

beforeEach(() => {
  rows.postings = [
    { slug: "job-translated", updatedAt: now, titleHi: "हिंदी" },
    { slug: "job-english-only", updatedAt: now, titleHi: null },
  ];
  rows.articles = [{ slug: "guide", updatedAt: now, titleHi: null }];
  rows.categories = [{ slug: "banking" }];
  rows.organizations = [
    { slug: "org-translated", nameHi: "संगठन" },
    { slug: "org-english-only", nameHi: null },
  ];
  rows.exams = [
    { slug: "exam-translated", labelHi: "परीक्षा" },
    { slug: "exam-english-only", labelHi: null },
  ];
  rows.postLeaves = [
    { recruitmentSlug: "sample-recruitment-2026-01", postSlug: "project-nurse-iii", lastModified: now, isLive: true },
  ];
});

async function entries() {
  const mod = await import("@/app/sitemap");
  return mod.default();
}

const hiAlternate = (e: { alternates?: { languages?: { hi?: string } } }) => e.alternates?.languages?.hi;

describe("sitemap", () => {
  test("IDX-04a every URL is an absolute, unprefixed, query-free canonical URL on the site origin", async () => {
    for (const e of await entries()) {
      const url = new URL(e.url);
      expect(url.origin).toBe(SITE);
      expect(url.search, e.url).toBe("");
      expect(url.pathname, e.url).not.toMatch(/^\/(en|hi)(\/|$)/);
    }
  });

  test("IDX-04b utility and non-indexable routes are never listed", async () => {
    const paths = (await entries()).map((e) => new URL(e.url).pathname);
    for (const p of paths) expect(p).not.toMatch(/^\/(search|admin|api)(\/|$)/);
  });

  test("IDX-04c no URL is listed twice", async () => {
    const urls = (await entries()).map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("IDX-04d canonical job postings and Post Leaves are included; legacy recruitment hubs are not", async () => {
    const paths = (await entries()).map((e) => new URL(e.url).pathname);
    expect(paths).toContain("/jobs/job-translated");
    expect(paths).toContain("/jobs/job-english-only");
    expect(paths).toContain("/jobs/sample-recruitment-2026-01/project-nurse-iii");
    expect(paths).not.toContain("/jobs/sample-recruitment-2026-01");
    expect(paths.some((p) => p.startsWith("/recruitments/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("/positions/"))).toBe(false);
  });


  test("LOC-05 a Hindi alternate is listed only for rows with genuine Hindi content", async () => {
    const byPath = new Map((await entries()).map((e) => [new URL(e.url).pathname, e]));
    const expectations: [string, boolean][] = [
      ["/jobs/job-translated", true],
      ["/jobs/job-english-only", false],
      ["/organizations/org-translated", true],
      ["/organizations/org-english-only", false],
      ["/exams/exam-translated", true],
      ["/exams/exam-english-only", false],
    ];
    const actual = expectations.map(([p]) => [p, Boolean(hiAlternate(byPath.get(p)!))]);
    expect(actual).toEqual(expectations);
  });

  test("LOC-05b listed hreflang alternates never use the redirecting /en/ prefix", async () => {
    for (const e of await entries()) {
      for (const target of Object.values(e.alternates?.languages ?? {})) {
        expect(new URL(target as string).pathname).not.toMatch(/^\/en(\/|$)/);
      }
    }
  });

  // Sitemap policy follows the canonical URL contract: individual job pages,
  // Post role hubs, organizations, exams and articles may be indexed. Legacy
  // recruitment/position entity URLs are not sitemap destinations.
  test("IDX-06 sitemap covers canonical indexable entities and excludes legacy entity hubs", async () => {
    const src = (await import("../helpers/source")).readSource("src/app/sitemap.ts");
    for (const route of ["/jobs/", "/posts/", "/organizations/", "/exams/", "/articles/"]) {
      expect(src, `missing sitemap source for ${route}`).toContain(route);
    }
    expect(src).not.toContain("getRecruitmentSlugsForSitemap");
    expect(src).not.toContain("recruitmentEntries");
    expect(src).not.toContain("getPositionSlugsForSitemap");
  });
});

describe("robots.txt", () => {
  test("IDX-05 private technical paths are disallowed and nothing indexable is blocked", async () => {
    const mod = await import("@/app/robots");
    const robots = mod.default();
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    const disallow = ([] as string[]).concat(rule.disallow ?? []);
    expect(disallow).toEqual(expect.arrayContaining(["/admin", "/api/"]));
    for (const indexable of ["/jobs", "/organizations", "/exams", "/positions", "/recruitments", "/articles", "/hi"]) {
      expect(disallow.some((d) => indexable.startsWith(d.replace(/\/$/, "")))).toBe(false);
    }
    expect(robots.sitemap).toBe(`${SITE}/sitemap.xml`);
  });
});
