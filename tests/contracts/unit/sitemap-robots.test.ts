/**
 * Sitemap and robots.txt contracts, asserted against the real route
 * handlers with the database client mocked.
 *
 * src/app/sitemap.ts (2026-10-20) runs three raw SQL statements through
 * getDb().execute(): recruitment hubs, post leaves and indexable
 * organizations. The mock dispatches on the FROM clause of each statement.
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SITE } from "../helpers/metadata";

const rows = vi.hoisted(() => ({
  hubs: [] as unknown[],
  leaves: [] as unknown[],
  orgs: [] as unknown[],
  fail: false,
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    execute: async (query: unknown) => {
      if (rows.fail) throw new Error("connection refused");
      const text = JSON.stringify(query);
      if (/FROM organizations o/.test(text)) return rows.orgs;
      // The hub query contains a nested FROM posts p; match the top-level FROM first.
      if (/FROM recruitments r/.test(text)) return rows.hubs;
      if (/FROM posts p/.test(text)) return rows.leaves;
      if (/FROM exams/.test(text)) return [];
      throw new Error("unexpected sitemap query: " + text.slice(0, 120));
    },
  }),
}));

const now = new Date("2026-10-01T00:00:00Z");
const future = "2027-01-31";
const past = "2025-01-31";

beforeEach(() => {
  rows.fail = false;
  rows.hubs = [
    { slug: "live-recruitment", status: "OPEN", application_end_date: future, updated_at: now },
    { slug: "closed-recruitment", status: "CLOSED", application_end_date: past, updated_at: now },
  ];
  rows.leaves = [
    { slug: "live-recruitment", status: "OPEN", application_end_date: future, updated_at: now, post_slug: "clerk", post_updated_at: now },
    { slug: "live-recruitment", status: "OPEN", application_end_date: future, updated_at: now, post_slug: "officer", post_updated_at: null },
    { slug: "closed-recruitment", status: "CLOSED", application_end_date: past, updated_at: now, post_slug: "driver", post_updated_at: now },
  ];
  rows.orgs = [{ slug: "sample-org", updated_at: now, n: 5 }];
  vi.resetModules();
});

async function entries() {
  const mod = await import("@/app/sitemap");
  return mod.default();
}

describe("sitemap", () => {
  test("IDX-04a every URL is an absolute, unprefixed, query-free canonical URL on the site origin", async () => {
    const all = await entries();
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) {
      const url = new URL(e.url);
      expect(url.origin).toBe(SITE);
      expect(url.search, e.url).toBe("");
      expect(url.hash, e.url).toBe("");
      expect(url.pathname, e.url).not.toMatch(/^\/(en|hi)(\/|$)/);
    }
  });

  test("IDX-04b utility and non-indexable routes are never listed", async () => {
    const paths = (await entries()).map((e) => new URL(e.url).pathname);
    for (const p of paths) {
      expect(p).not.toMatch(/^\/(search|admin|api|recruitments|positions|posts|commissions|exams\/)(\/|$)/);
    }
  });

  test("IDX-04c no URL is listed twice", async () => {
    const urls = (await entries()).map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("IDX-04d the URL contract is covered: static pages, indexable organizations, recruitment hubs, post leaves", async () => {
    const paths = (await entries()).map((e) => new URL(e.url).pathname);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/",
        "/jobs",
        "/exams",
        "/organizations",
        "/organizations/sample-org",
        "/jobs/live-recruitment",
        "/jobs/closed-recruitment",
        "/jobs/live-recruitment/clerk",
        "/jobs/live-recruitment/officer",
        "/jobs/closed-recruitment/driver",
      ]),
    );
    // The static list also carries guide/hub pages; every DB-backed URL above is present.
  });

  test("IDX-04f closed recruitments stay listed as history but rank below live ones", async () => {
    const byPath = new Map((await entries()).map((e) => [new URL(e.url).pathname, e]));
    const live = byPath.get("/jobs/live-recruitment")!;
    const closed = byPath.get("/jobs/closed-recruitment")!;
    expect(live.priority!).toBeGreaterThan(closed.priority!);
    expect(live.changeFrequency).toBe("daily");
    expect(closed.changeFrequency).toBe("monthly");
    const liveLeaf = byPath.get("/jobs/live-recruitment/clerk")!;
    const closedLeaf = byPath.get("/jobs/closed-recruitment/driver")!;
    expect(liveLeaf.priority!).toBeGreaterThan(closedLeaf.priority!);
  });

  test("IDX-04h duplicate and malformed post leaves are excluded from the sitemap query", async () => {
    const src = (await import("../helpers/source")).readSource("src/app/sitemap.ts");
    expect(src).toMatch(/p\.posting_status IS DISTINCT FROM 'DUPLICATE'/);
    expect(src).toMatch(/p\.slug IS NOT NULL/);
    expect(src).toMatch(/btrim\(p\.slug\) <> ''/);
  });

  test("IDX-04i recruitment hubs require a valid non-duplicate canonical Post Leaf", async () => {
    const src = (await import("../helpers/source")).readSource("src/app/sitemap.ts");
    const start = src.indexOf("SELECT r.slug");
    const end = src.indexOf("ORDER BY r.updated_at", start);
    const hubQuery = src.slice(start, end);
    expect(hubQuery).toContain("AND EXISTS (");
    expect(hubQuery).toContain("WHERE p.recruitment_id = r.id");
    expect(hubQuery).toContain("p.posting_status IS DISTINCT FROM 'DUPLICATE'");
    expect(hubQuery).toContain("p.slug IS NOT NULL");
    expect(hubQuery).toContain("btrim(p.slug) <> ''");
  });

  test("IDX-04g the organization query applies the same exclusions as the entity page (merged, quarantined, threshold)", async () => {
    const src = (await import("../helpers/source")).readSource("src/app/sitemap.ts");
    expect(src).toMatch(/merged_into_id IS NULL/);
    expect(src).toContain("lower(btrim(ro.name)) <>");
    expect(src).toContain("UNRESOLVED_ORG_NAME.toLowerCase()");
    expect(src).toMatch(/verification_status IS DISTINCT FROM 'QUARANTINED'/);
    expect(src).toMatch(/HAVING count\(\*\) >= \$\{ORG_INDEX_MIN_RECRUITMENTS\}/);
    expect(src).not.toMatch(/\bpostings\b/);
  });

  test("LOC-05 no hreflang alternates are listed: there is one language per URL and no prefixed address", async () => {
    for (const e of await entries()) expect(e.alternates).toBeUndefined();
  });

  test("IDX-06 every indexable entity type in the URL contract has a sitemap source, and nothing else does", async () => {
    const src = (await import("../helpers/source")).readSource("src/app/sitemap.ts");
    expect(src).toContain("/jobs/${h.slug}");
    expect(src).toContain("/jobs/${l.slug}/${l.post_slug}");
    expect(src).toContain("/organizations/${o.slug}");
    for (const t of ["recruitments", "positions", "posts", "articles", "commissions", "categories"]) {
      expect(src, t).not.toContain(`/${t}/\${`);
    }
  });

  test("IDX-09 a database error throws instead of emitting a partial sitemap", async () => {
    rows.fail = true;
    const mod = await import("@/app/sitemap");
    await expect(mod.default()).rejects.toThrow();
  });
});

describe("robots.txt", () => {
  test("IDX-05 private technical paths are disallowed and nothing indexable is blocked", async () => {
    const mod = await import("@/app/robots");
    const robots = mod.default();
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    const disallow = ([] as string[]).concat(rule.disallow ?? []);
    expect(disallow).toEqual(expect.arrayContaining(["/admin", "/api/"]));
    for (const indexable of ["/jobs", "/organizations", "/exams", "/articles"]) {
      expect(disallow.some((d) => indexable.startsWith(d.replace(/\/$/, "")))).toBe(false);
    }
    expect(robots.sitemap).toBe(`${SITE}/sitemap.xml`);
  });
});
