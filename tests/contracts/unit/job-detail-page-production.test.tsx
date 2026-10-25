import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/components/job-posting/structured-data/post-leaf-schema", () => ({
  default: () => null,
}));

import JobDetailPageProduction from "@/components/job-posting/job-detail-page-production";

function renderLeaf(state: "upcoming" | "open") {
  const deadline = new Date("2026-12-01T00:00:00.000Z");
  return renderToStaticMarkup(
    createElement(JobDetailPageProduction, {
      post: {
        id: 1,
        title: "Clerk",
        recruitmentSlug: "clerk-recruitment",
        recruitmentName: "Clerk Recruitment",
        slug: "clerk",
        applicationDeadline: deadline,
        applyUrl: "https://example.gov.in/apply",
      },
      lifecycle: {
        state,
        isOpen: state === "open",
        isLive: true,
        deadline,
      },
    }),
  );
}

describe("job leaf application lifecycle", () => {
  test("upcoming recruitment is visible but does not offer an application action", () => {
    const html = renderLeaf("upcoming");
    expect(html).toContain("Applications not open yet");
    expect(html).not.toContain(">Apply online</a>");
  });

  test("open recruitment retains the Apply action", () => {
    const html = renderLeaf("open");
    expect(html).toContain(">Apply online</a>");
    expect(html).toContain("Applications close on");
  });
});
