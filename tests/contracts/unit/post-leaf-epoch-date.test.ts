import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import PostLeafStructuredData from "@/components/job-posting/structured-data/post-leaf-schema";

function renderGraph(notificationPublicationDate: Date | null) {
  const html = renderToStaticMarkup(createElement(PostLeafStructuredData, {
    post: {
      id: 123,
      title: "Sample Post",
      slug: "sample-post",
      recruitmentSlug: "sample-recruitment-2026",
      recruitmentName: "Sample Recruitment 2026",
      organizationName: "Sample Organization",
      description: "A sample job posting.",
      employmentType: null,
      locationCity: null,
      locationState: null,
      notificationPublicationDate,
      updatedAt: null,
    },
    resolvedVacancy: null,
    resolvedSalary: null,
    resolvedDeadline: { date: null, state: "UNKNOWN" },
  }));
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("JSON-LD script not rendered");
  return JSON.parse(match[1]) as { "@graph": Record<string, unknown>[] };
}

describe("Post Leaf structured date placeholders", () => {
  test("does not use postedAt as a fallback when notification date is a Unix epoch", () => {
    const graph = renderGraph(
      new Date("1970-01-01T00:00:00.000Z"),
    );
    const job = graph["@graph"].find((node) => node["@type"] === "JobPosting");
    expect(job).toBeDefined();
    expect(job).not.toHaveProperty("datePosted");
  });

  test("omits datePosted when only the Unix epoch sentinel exists", () => {
    const graph = renderGraph(new Date("1970-01-01T00:00:00.000Z"));
    const job = graph["@graph"].find((node) => node["@type"] === "JobPosting");
    expect(job).toBeDefined();
    expect(job).not.toHaveProperty("datePosted");
  });
});
