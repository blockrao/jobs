/**
 * Structured-data contracts asserted against the real builders in
 * src/lib/structured-data.ts. These protect behaviour that is already
 * correct today (Phase 1 audit, section I) from regressing during the
 * canonical migration.
 */
import { describe, expect, test } from "vitest";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildJobPostingSchema,
  buildOrganizationSchema,
  jsonLdGraph,
} from "@/lib/structured-data";
import { SITE } from "../helpers/metadata";

const DAY = 86_400_000;

const org = {
  id: 7,
  slug: "sample-org",
  name: "Sample Org",
  websiteUrl: null,
  logoUrl: null,
  description: null,
} as never;

const posting = (over: Record<string, unknown> = {}) =>
  ({
    id: 42,
    slug: "sample-job",
    title: "Sample Org Recruitment 2026 – Apply Online for 3 Posts",
    postNames: ["Law Officer"],
    description: "Description.",
    currentStage: "APPLICATION_OPEN",
    validThrough: new Date(Date.now() + 10 * DAY),
    datePosted: new Date(Date.now() - DAY),
    employmentType: "FULL_TIME",
    workplaceType: "ONSITE",
    locationCity: "Delhi",
    locationRegion: "Delhi",
    locationCountry: "IN",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: "INR",
    salaryPeriod: "MONTH",
    totalVacancies: 3,
    applyUrl: null,
    ...over,
  }) as never;

describe("JobPosting lifecycle", () => {
  test("SD-02a an open job with an extracted post title emits JobPosting", () => {
    const schema = buildJobPostingSchema(posting(), org);
    expect(schema?.["@type"]).toBe("JobPosting");
    expect(schema?.title).toBe("Law Officer");
  });

  test("SD-02b no JobPosting once the application deadline has passed, even if the stage lags", () => {
    expect(buildJobPostingSchema(posting({ validThrough: new Date(Date.now() - DAY) }), org)).toBeNull();
  });

  test.each(["APPLICATION_CLOSED", "ADMIT_CARD_RELEASED", "EXAM_SCHEDULED", "RESULT_OUT", "FINAL_RESULT_OUT", "CLOSED"])(
    "SD-02c no JobPosting at stage %s",
    (stage) => {
      expect(buildJobPostingSchema(posting({ currentStage: stage }), org)).toBeNull();
    },
  );

  test("SD-02d no JobPosting when only the scraped headline is available as a title", () => {
    expect(buildJobPostingSchema(posting({ postNames: [] }), org)).toBeNull();
    expect(buildJobPostingSchema(posting({ postNames: null }), org)).toBeNull();
  });
});

describe("JobPosting identity", () => {
  test("SD-05a @id and url sit on the canonical unprefixed job URL", () => {
    const schema = buildJobPostingSchema(posting(), org)!;
    expect(schema.url).toBe(`${SITE}/jobs/sample-job`);
    expect(schema["@id"]).toBe(`${SITE}/jobs/sample-job#jobposting`);
  });

  test("SD-05b hiringOrganization is the same node the Organization builder emits", () => {
    const schema = buildJobPostingSchema(posting(), org)!;
    expect(schema.hiringOrganization).toEqual(buildOrganizationSchema(org));
  });

  test("SD-05c Article.about references the JobPosting @id exactly", () => {
    const job = buildJobPostingSchema(posting(), org)!;
    const article = buildArticleSchema(
      { slug: "guide", title: "Guide", dek: null, coverImageUrl: null, authorName: null, publishedAt: null, updatedAt: new Date() } as never,
      [`${SITE}/jobs/sample-job`],
    );
    expect(article.about[0]["@id"]).toBe(job["@id"]);
  });
});

describe("shared builders", () => {
  test("SD-07 breadcrumb items are absolute URLs in order", () => {
    const crumbs = buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Jobs", path: "/jobs" },
    ]);
    expect(crumbs.itemListElement.map((i) => [i.position, i.item])).toEqual([
      [1, `${SITE}/`],
      [2, `${SITE}/jobs`],
    ]);
  });

  test("SD-08 jsonLdGraph drops absent nodes so a closed job leaves no empty JobPosting", () => {
    const graph = jsonLdGraph(buildJobPostingSchema(posting({ currentStage: "CLOSED" }), org), buildOrganizationSchema(org));
    expect(graph["@graph"]).toHaveLength(1);
    expect(JSON.stringify(graph)).not.toContain("JobPosting");
  });
});

// SEO-001 step 1: the organization and exam page nodes moved into the shared
// library. These pin the markup the pages emitted before the move, plus the
// one intended addition (Organization @id, shared with job pages).
describe("entity page nodes (SEO-001 step 1)", () => {
  const org = { slug: "upsc", name: "UPSC", nameHi: "संघ लोक सेवा आयोग", description: null, descriptionHi: null, logoUrl: null, websiteUrl: "https://upsc.gov.in" };

  test("SD-09a organization page node keeps its pre-move fields in English", async () => {
    const { buildOrganizationPageSchema } = await import("@/lib/structured-data");
    const node = buildOrganizationPageSchema(org, "en") as Record<string, unknown>;
    const { ["@id"]: id, ...rest } = node;
    expect(rest).toEqual({
      "@type": "Organization",
      name: "UPSC",
      description: "Government recruitment organization: UPSC",
      url: expect.stringMatching(/\/organizations\/upsc$/),
      sameAs: "https://upsc.gov.in",
      inLanguage: "en-IN",
    });
    expect(id).toMatch(/\/organizations\/upsc#org$/);
  });

  test("SD-09b the Hindi organization node is the same entity (@id) at the /hi address", async () => {
    const { buildOrganizationPageSchema, buildOrganizationSchema } = await import("@/lib/structured-data");
    const hi = buildOrganizationPageSchema(org, "hi") as Record<string, unknown>;
    expect(hi.name).toBe("संघ लोक सेवा आयोग");
    expect(hi.url).toMatch(/\/hi\/organizations\/upsc$/);
    expect(hi["@id"]).toBe((buildOrganizationPageSchema(org, "en") as Record<string, unknown>)["@id"]);
    expect(hi["@id"]).toBe(buildOrganizationSchema(org as never)["@id"]);
  });

  test("SD-10 exam page node keeps its pre-move fields", async () => {
    const { buildExamSchema } = await import("@/lib/structured-data");
    const node = buildExamSchema({ slug: "cgl", label: "SSC CGL", description: null }, { slug: "ssc", name: "SSC" }, "en");
    expect(node).toEqual({
      "@type": "EducationalOccupationalCredential",
      name: "SSC CGL",
      description: "SSC CGL government exam",
      url: expect.stringMatching(/\/exams\/cgl$/),
      provider: { "@type": "Organization", name: "SSC", url: expect.stringMatching(/\/commissions\/ssc$/) },
      inLanguage: "en-IN",
    });
  });
});
