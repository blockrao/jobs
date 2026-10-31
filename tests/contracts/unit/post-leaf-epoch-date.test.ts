import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import PostLeafStructuredData from "@/components/job-posting/structured-data/post-leaf-schema";

function renderGraph(notificationPublicationDate: Date | null, emitJobPosting = true) {
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
    emitJobPosting,
  }));
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("JSON-LD script not rendered");
  return JSON.parse(match[1]) as { "@graph": Record<string, unknown>[] };
}

describe("Post Leaf publication-date provenance", () => {
  test("emits datePosted only from a plausible, past source notification date", () => {
    const graph = renderGraph(new Date("2026-10-08T12:00:00.000Z"));
    const job = graph["@graph"].find((node) => node["@type"] === "JobPosting");
    const page = graph["@graph"].find((node) => node["@type"] === "WebPage");
    expect(job).toMatchObject({ datePosted: "2026-10-08T12:00:00.000Z" });
    expect(page).not.toHaveProperty("datePublished");
  });

  test("does not substitute the Unix epoch or an ingestion timestamp when source date is absent", () => {
    const graph = renderGraph(new Date("1970-01-01T00:00:00.000Z"));
    const job = graph["@graph"].find((node) => node["@type"] === "JobPosting");
    const page = graph["@graph"].find((node) => node["@type"] === "WebPage");
    expect(job).toBeUndefined();
    expect(page).not.toHaveProperty("datePublished");
    expect(page).not.toHaveProperty("mainEntity");
  });

  test("does not emit JobPosting or datePublished for a future notification date", () => {
    const graph = renderGraph(new Date("2027-10-08T12:00:00.000Z"));
    const job = graph["@graph"].find((node) => node["@type"] === "JobPosting");
    const page = graph["@graph"].find((node) => node["@type"] === "WebPage");
    expect(job).toBeUndefined();
    expect(page).not.toHaveProperty("datePublished");
    expect(page).not.toHaveProperty("mainEntity");
  });

  test("does not emit JobPosting when the notification date is invalid", () => {
    const graph = renderGraph(new Date(Number.NaN));
    expect(graph["@graph"].find((node) => node["@type"] === "JobPosting")).toBeUndefined();
  });

  test("respects an explicit caller decision not to emit JobPosting", () => {
    const graph = renderGraph(new Date("2026-10-08T12:00:00.000Z"), false);
    expect(graph["@graph"].find((node) => node["@type"] === "JobPosting")).toBeUndefined();
  });
});
