import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import PostLeafStructuredData from "@/components/job-posting/structured-data/post-leaf-schema";

function renderSchema(emitJobPosting: boolean) {
  const html = renderToStaticMarkup(createElement(PostLeafStructuredData, {
    post: {
      id: 1,
      title: "Clerk",
      slug: "clerk",
      recruitmentSlug: "sample-recruitment",
      organizationName: "Sample Department",
      locationState: "Rajasthan",
    },
    pageTitle: "Clerk recruitment",
    pageDescription: "Sample recruitment details",
    intro: "Sample recruitment details",
    facts: [],
    faqs: [],
    resolvedVacancy: null,
    resolvedSalary: null,
    resolvedDeadline: { date: null, state: "UNKNOWN" },
    emitJobPosting,
  }));
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Expected JSON-LD script");
  return JSON.parse(match[1]) as { "@graph": Record<string, unknown>[] };
}

describe("post leaf structured data indexability", () => {
  test("suppresses JobPosting and its mainEntity reference for a noindex leaf", () => {
    const graph = renderSchema(false)["@graph"];
    expect(graph.some((node) => node["@type"] === "JobPosting")).toBe(false);
    const page = graph.find((node) => node["@type"] === "WebPage");
    expect(page).toBeDefined();
    expect(page).not.toHaveProperty("mainEntity");
    expect(graph.some((node) => node["@type"] === "BreadcrumbList")).toBe(true);
  });

  test("keeps JobPosting for an eligible leaf", () => {
    const graph = renderSchema(true)["@graph"];
    expect(graph.some((node) => node["@type"] === "JobPosting")).toBe(true);
    const page = graph.find((node) => node["@type"] === "WebPage");
    expect(page).toHaveProperty("mainEntity");
  });
});
