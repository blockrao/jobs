/**
 * Canonical / indexability contracts for the entity page types, asserted
 * against each page's real generateMetadata() with the data layer mocked.
 * No server, DB, or network.
 *
 * URL contract (locked 2026-10-20): no locale prefix. English is the only
 * served language for entity pages; /en/... and /hi/... 301 to the
 * unprefixed address in src/proxy.ts. The recruitment hub is always canonical
 * to itself; the post leaf is canonical to itself.
 *
 * Invariant IDs are defined in tests/contracts/README.md.
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Metadata } from "next";
import { SITE, canonicalOf, isNoindex, languagesOf, params } from "../helpers/metadata";
import { ORG_INDEX_MIN_RECRUITMENTS as ORG_MIN } from "../../../src/lib/organizations/stats";

const getArticleBySlug = vi.fn();
const getRecruitmentWithPostsCached = vi.fn();
const getPostBySlugCached = vi.fn();
const resolveOrganization = vi.fn();
const getOrganizationStats = vi.fn();

vi.mock("@/lib/queries", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getArticleBySlug: (...a: unknown[]) => getArticleBySlug(...a),
}));
vi.mock("@/db/operations/get-recruitments", () => ({
  getRecruitmentWithPostsCached: (...a: unknown[]) => getRecruitmentWithPostsCached(...a),
  getRecruitmentPostingLocations: async () => [],
  getRecruitmentCutoffMarks: async () => [],
}));
vi.mock("@/db/operations/get-posts", () => ({
  getPostBySlugCached: (...a: unknown[]) => getPostBySlugCached(...a),
}));
vi.mock("@/db/operations/get-related-posts", () => ({
  getRelatedPostsGrouped: async () => [],
}));
vi.mock("@/lib/organizations/resolve", () => ({
  resolveOrganization: (...a: unknown[]) => resolveOrganization(...a),
}));
vi.mock("@/lib/organizations/stats", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getOrganizationStats: (...a: unknown[]) => getOrganizationStats(...a),
}));

const now = new Date("2026-10-01T00:00:00Z");

const recruitment = {
  id: 1,
  slug: "sample-recruitment-2026",
  name: "Sample Recruitment 2026",
  status: "OPEN",
  notificationDate: now,
  createdAt: now,
  applicationEndDate: new Date("2027-01-01T00:00:00Z"),
  organizationName: "Sample Org",
  organizationSlug: "sample-org",
};

const org = {
  id: 7,
  slug: "sample-org",
  name: "Sample Organization",
  description: "An organization.",
  logoUrl: null,
  websiteUrl: "https://example.gov.in",
  sector: "GOVERNMENT_CENTRAL",
  mergedIntoId: null,
};

const stats = (recruitmentCount: number) => ({
  recruitments: Array.from({ length: recruitmentCount }, (_, i) => ({ id: i + 1, slug: `r-${i}` })),
  live: [],
  closed: [],
  liveVacancies: null,
  latestNotification: null,
  nextDeadline: null,
  roles: [],
  exams: [],
  indexable: recruitmentCount >= ORG_MIN,
});

/**
 * One row per entity type. `load` wires the mocked data layer to return an
 * indexable entity and calls the page's own generateMetadata.
 */
const ENTITY_TYPES: { name: string; path: string; load: () => Promise<Metadata> }[] = [
  {
    name: "recruitment hub",
    path: "/jobs/sample-recruitment-2026",
    load: async () => {
      getRecruitmentWithPostsCached.mockResolvedValue({
        recruitment,
        posts: [{ slug: "law-officer", vacancyTotal: 3 }],
        totalPosts: 1,
        resolutionMethod: "exact",
      });
      const mod = await import("@/app/(default)/jobs/[recruitment-slug]/page");
      return mod.generateMetadata(params({ "recruitment-slug": "sample-recruitment-2026" }));
    },
  },
  {
    name: "post leaf",
    path: "/jobs/sample-recruitment-2026/law-officer",
    load: async () => {
      getPostBySlugCached.mockResolvedValue({
        id: 11,
        title: "Law Officer",
        slug: "law-officer",
        recruitmentSlug: "sample-recruitment-2026",
        organizationName: "Sample Org",
        description: "A sample job posting.",
        locationState: "Delhi",
        enrichment: null,
      });
      const mod = await import("@/app/(default)/jobs/[recruitment-slug]/[post-slug]/page");
      return mod.generateMetadata(params({ "recruitment-slug": "sample-recruitment-2026", "post-slug": "law-officer" }));
    },
  },
  {
    name: "article",
    path: "/articles/sample",
    load: async () => {
      getArticleBySlug.mockResolvedValue({
        slug: "sample",
        title: "Sample Guide",
        titleHi: null,
        dek: "A guide.",
        body: "Body text.",
      });
      const mod = await import("@/app/(default)/articles/[slug]/page");
      return mod.generateMetadata(params({ slug: "sample" }));
    },
  },
  {
    name: "organization",
    path: "/organizations/sample-org",
    load: async () => {
      resolveOrganization.mockResolvedValue({ kind: "canonical", org });
      getOrganizationStats.mockResolvedValue(stats(5));
      const mod = await import("@/app/(default)/organizations/[slug]/page");
      return mod.generateMetadata(params({ slug: "sample-org" }));
    },
  },
];

beforeEach(() => vi.clearAllMocks());

describe.each(ENTITY_TYPES)("$name page metadata", ({ path, load }) => {
  const url = `${SITE}${path}`;

  test("CAN-01 canonical is absolute and carries no query string or fragment", async () => {
    const canonical = canonicalOf(await load());
    expect(canonical, "canonical missing").not.toBeNull();
    expect(canonical!.protocol).toBe("https:");
    expect(canonical!.search).toBe("");
    expect(canonical!.hash).toBe("");
  });

  test("CAN-02 canonical is self-referencing on the unprefixed address", async () => {
    expect(canonicalOf(await load())!.href).toBe(url);
  });

  test("CAN-03 no canonical or hreflang target uses a redirecting locale prefix", async () => {
    const meta = await load();
    const targets = [canonicalOf(meta)!.href, ...Object.values(languagesOf(meta) ?? {})];
    for (const t of targets) expect(new URL(t).pathname).not.toMatch(/^\/(en|hi)(\/|$)/);
  });

  test("IDX-03 the eligible entity page is indexable", async () => {
    expect(isNoindex(await load())).toBe(false);
  });
});

describe("recruitment hub canonical (URL contract 2026-10-20)", () => {
  test("CAN-06 a single-post recruitment hub is still canonical to itself, never to its leaf", async () => {
    getRecruitmentWithPostsCached.mockResolvedValue({
      recruitment,
      posts: [{ slug: "only-post", vacancyTotal: 1 }],
      totalPosts: 1,
      resolutionMethod: "exact",
    });
    const mod = await import("@/app/(default)/jobs/[recruitment-slug]/page");
    const meta = await mod.generateMetadata(params({ "recruitment-slug": recruitment.slug }));
    expect(canonicalOf(meta)!.pathname).toBe(`/jobs/${recruitment.slug}`);
    expect(isNoindex(meta)).toBe(false);
  });

  test("IDX-10 a Recruitment Hub without a valid canonical Post Leaf is noindex, follow", async () => {
    getRecruitmentWithPostsCached.mockResolvedValue({
      recruitment,
      posts: [],
      totalPosts: 0,
      resolutionMethod: "exact",
    });
    const mod = await import("@/app/(default)/jobs/[recruitment-slug]/page");
    const meta = await mod.generateMetadata(params({ "recruitment-slug": recruitment.slug }));
    expect(isNoindex(meta)).toBe(true);
    expect((meta.robots as { follow?: boolean }).follow).toBe(true);
    expect(canonicalOf(meta)!.pathname).toBe(`/jobs/${recruitment.slug}`);
  });

  test("IDX-07 a missing recruitment is noindex, follow", async () => {
    getRecruitmentWithPostsCached.mockResolvedValue(null);
    const mod = await import("@/app/(default)/jobs/[recruitment-slug]/page");
    const meta = await mod.generateMetadata(params({ "recruitment-slug": "nope" }));
    expect(isNoindex(meta)).toBe(true);
    expect((meta.robots as { follow?: boolean }).follow).toBe(true);
  });
});

describe("organization page indexability (ORG_INDEX_MIN_RECRUITMENTS)", () => {
  // With ORG_INDEX_MIN_RECRUITMENTS = 0 (owner policy: every organization is
  // indexable) no organization is below the threshold, so 08a has nothing to test.
  test.skipIf(ORG_MIN === 0)("IDX-08a an organization below the recruitment threshold is noindex, follow, still self-canonical", async () => {
    resolveOrganization.mockResolvedValue({ kind: "canonical", org });
    getOrganizationStats.mockResolvedValue(stats(Math.max(ORG_MIN - 1, 0)));
    const mod = await import("@/app/(default)/organizations/[slug]/page");
    const meta = await mod.generateMetadata(params({ slug: "sample-org" }));
    expect(isNoindex(meta)).toBe(true);
    expect((meta.robots as { follow?: boolean }).follow).toBe(true);
    expect(canonicalOf(meta)!.pathname).toBe("/organizations/sample-org");
  });

  test("IDX-08b the threshold used by the page is the shared constant", async () => {
    const { ORG_INDEX_MIN_RECRUITMENTS } = await import("@/lib/organizations/stats");
    resolveOrganization.mockResolvedValue({ kind: "canonical", org });
    getOrganizationStats.mockResolvedValue(stats(ORG_INDEX_MIN_RECRUITMENTS));
    const mod = await import("@/app/(default)/organizations/[slug]/page");
    expect(isNoindex(await mod.generateMetadata(params({ slug: "sample-org" })))).toBe(false);
  });

  test("IDX-08c an alias or merged slug emits nothing indexable (the page 301s)", async () => {
    resolveOrganization.mockResolvedValue({ kind: "redirect", slug: "sample-org" });
    const mod = await import("@/app/(default)/organizations/[slug]/page");
    const meta = await mod.generateMetadata(params({ slug: "upsc" }));
    expect(isNoindex(meta)).toBe(true);
    expect(meta.alternates?.canonical).toBeUndefined();
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
