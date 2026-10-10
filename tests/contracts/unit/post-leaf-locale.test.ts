import { describe, expect, test, vi } from "vitest";
import { isNoindex } from "../helpers/metadata";

vi.mock("@/db/operations/get-posts", () => ({
  getPostBySlug: vi.fn(async () => ({
    id: 701,
    title: "Project Nurse III",
    description: "Apply for Project Nurse III.",
    organizationName: "Sample Institute",
    slug: "project-nurse-iii",
    recruitmentSlug: "sample-recruitment-2026-01",
  })),
}));

describe("localized Post Leaf route", () => {
  test("is noindex and canonical to the English leaf until genuine Hindi content exists", async () => {
    const mod = await import("@/app/[locale]/jobs/[recruitment-slug]/[post-slug]/page");
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({
        locale: "hi",
        "recruitment-slug": "sample-recruitment-2026-01",
        "post-slug": "project-nurse-iii",
      }),
    });

    expect(isNoindex(metadata)).toBe(true);
    expect(metadata.alternates?.canonical).toBe("/jobs/sample-recruitment-2026-01/project-nurse-iii");
    expect(metadata.alternates?.languages).toBeUndefined();
  });

  test("does not emit a second JobPosting JSON-LD block on the noindex locale route", async () => {
    const { readSource, stripComments } = await import("../helpers/source");
    const source = stripComments(readSource("src/app/[locale]/jobs/[recruitment-slug]/[post-slug]/page.tsx"));
    expect(source).not.toContain("JobPostingStructuredData");
  });
});
