/**
 * Rendered-markup contracts: the real page component is rendered to HTML
 * with the data layer mocked, and the JSON-LD it emits is read back out of
 * the markup. This is the "what a crawler receives" check for structured
 * data, without a server or database.
 *
 * Since 2026-10-20 the only entity page besides the job hub/leaf is
 * /organizations/{slug} (exam pillar routes redirect there). It emits one
 * @graph holding the organization node and the breadcrumb, and nothing else:
 * no JobPosting, no FAQPage.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { params } from "../helpers/metadata";

const org = {
  id: 1,
  slug: "sample",
  name: "Sample Organization",
  description: "An organization.",
  logoUrl: null,
  websiteUrl: "https://example.gov.in",
  sector: "GOVERNMENT_CENTRAL",
  state: null,
  headquarters: null,
  mergedIntoId: null,
};

const stats = {
  recruitments: [],
  live: [],
  closed: [],
  liveVacancies: null,
  latestNotification: null,
  nextDeadline: null,
  roles: [],
  exams: [],
  indexable: true,
};

vi.mock("@/lib/organizations/resolve", () => ({
  resolveOrganization: async () => ({ kind: "canonical", org }),
}));
vi.mock("@/lib/organizations/stats", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getOrganizationStats: async () => stats,
}));

async function jsonLdOf(sector: string): Promise<unknown[]> {
  org.sector = sector;
  const mod = await import("@/app/(default)/organizations/[slug]/page");
  const tree = await mod.default(params({ slug: "sample" }));
  const html = renderToStaticMarkup(createElement(() => tree));
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

describe("organization page rendered JSON-LD", () => {
  test("SD-11 the page emits one graph holding the breadcrumb and the GovernmentOrganization node", async () => {
    const blocks = await jsonLdOf("GOVERNMENT_CENTRAL");
    expect(blocks).toHaveLength(1);
    const graph = (blocks[0] as { "@graph": Record<string, unknown>[] })["@graph"];
    expect(graph.map((n) => n["@type"]).sort()).toEqual(["BreadcrumbList", "GovernmentOrganization"]);
    const node = graph.find((n) => n["@type"] === "GovernmentOrganization")!;
    expect(node["@id"]).toBe("https://www.joboye.com/organizations/sample#org");
    expect(node.sameAs).toBe("https://example.gov.in");
    const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList") as { itemListElement: { item: string }[] };
    expect(crumbs.itemListElement.map((i) => i.item)).toEqual([
      "https://www.joboye.com/",
      "https://www.joboye.com/organizations",
      "https://www.joboye.com/organizations/sample",
    ]);
  });

  test("SD-11b a private-sector organization is a plain Organization node", async () => {
    const blocks = await jsonLdOf("PRIVATE");
    const graph = (blocks[0] as { "@graph": Record<string, unknown>[] })["@graph"];
    expect(graph.map((n) => n["@type"]).sort()).toEqual(["BreadcrumbList", "Organization"]);
  });

  test("SD-12 the organization page never emits JobPosting or FAQPage", async () => {
    const text = JSON.stringify(await jsonLdOf("GOVERNMENT_CENTRAL"));
    expect(text).not.toContain("JobPosting");
    expect(text).not.toContain("FAQPage");
  });
});
