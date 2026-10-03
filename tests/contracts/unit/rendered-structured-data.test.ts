/**
 * Rendered-markup contracts: the real page component is rendered to HTML
 * with the data layer mocked, and the JSON-LD it emits is read back out of
 * the markup. This is the "what a crawler receives" check for structured
 * data, without a server or database.
 *
 * Set V3_DUMP=<file> to also write the extracted JSON-LD to disk (used for
 * before/after evidence in result reports).
 */
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { params } from "../helpers/metadata";

vi.mock("@/db/operations/get-organizations", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getOrganizationBySlug: async () => ({
    id: 1,
    slug: "sample",
    name: "Sample Organization",
    nameHi: "नमूना संगठन",
    description: "An organization.",
    descriptionHi: "एक संगठन।",
    logoUrl: null,
    websiteUrl: "https://example.gov.in",
    sector: "GOVERNMENT_CENTRAL",
  }),
  getOrganizationRecruitments: async () => [],
  getOrganizationExams: async () => [],
  getOrganizationStats: async () => ({ recruitmentCount: 0, examCount: 0, positionCount: 0 }),
}));
vi.mock("@/db/operations/get-exams", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getExamBySlug: async () => ({
    exam: { id: 1, slug: "sample", label: "Sample Exam", labelHi: "नमूना परीक्षा", description: "An exam.", descriptionHi: "एक परीक्षा।" },
    commission: { id: 1, slug: "sample-commission", name: "Sample Commission", nameHi: "नमूना आयोग" },
  }),
  getExamRelatedPositions: async () => [],
  getExamRecruitmentDetails: async () => [],
}));

async function jsonLdOf(modPath: string, locale: "en" | "hi"): Promise<unknown[]> {
  const mod = await import(/* @vite-ignore */ modPath);
  const tree = await mod.default(params({ slug: "sample", locale }));
  const html = renderToStaticMarkup(createElement(() => tree));
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

const PAGES = [
  { name: "organization", mod: "@/app/[locale]/organizations/[slug]/page", type: "Organization" },
  { name: "exam", mod: "@/app/[locale]/exams/[slug]/page", type: "EducationalOccupationalCredential" },
];

const dump: Record<string, unknown> = {};

describe.each(PAGES)("$name page rendered JSON-LD", ({ name, mod, type }) => {
  test.each(["en", "hi"] as const)("SD-11 %s page emits one graph holding the breadcrumb and the entity node", async (locale) => {
    const blocks = await jsonLdOf(mod, locale);
    dump[`${name}:${locale}`] = blocks;
    if (process.env.V3_DUMP) writeFileSync(process.env.V3_DUMP, JSON.stringify(dump, null, 2));
    expect(blocks).toHaveLength(1);
    const graph = (blocks[0] as { "@graph": { "@type": string }[] })["@graph"];
    expect(graph.map((n) => n["@type"]).sort()).toEqual(["BreadcrumbList", type].sort());
  });
});
