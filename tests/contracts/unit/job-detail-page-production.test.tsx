import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

const { schemaProps } = vi.hoisted(() => ({ schemaProps: vi.fn() }));

vi.mock("@/components/job-posting/structured-data/post-leaf-schema", () => ({
  default: (props: { emitJobPosting?: boolean }) => {
    schemaProps(props);
    return null;
  },
}));

import JobDetailPageProduction from "@/components/job-posting/job-detail-page-production";

function renderLeaf(
  state: "upcoming" | "open",
  officialSourceVerified = false,
  officialApplicationVerified = false,
) {
  schemaProps.mockClear();
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
        notificationPublicationDate: new Date("2026-10-20T00:00:00.000Z"),
        officialSourceUrl: "https://ssc.gov.in/notice.pdf",
        officialSourceVerified,
        applyUrl: "https://ssc.gov.in/apply",
        officialApplicationVerified,
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

describe("job leaf source authority and application lifecycle", () => {
  test("upcoming recruitment does not offer an application action", () => {
    const html = renderLeaf("upcoming", true, true);
    expect(html).toContain("Applications not open yet");
    expect(html).not.toContain(">Apply online</a>");
  });

  test("open recruitment retains Apply only when the application host is verified", () => {
    const html = renderLeaf("open", true, true);
    expect(html).toContain(">Apply online</a>");
    expect(html).toContain("Applications close on");
    expect(schemaProps).toHaveBeenLastCalledWith(expect.objectContaining({ emitJobPosting: true }));
  });

  test("unverified notification and application destinations are not presented as official", () => {
    const html = renderLeaf("open", false, false);
    expect(html).not.toContain(">Apply online</a>");
    expect(html).not.toContain(">Official notification</a>");
    expect(html).not.toContain("From official notification");
    expect(html).toContain("Unverified notification or application links are hidden");
    expect(html).toContain("Reported notification date");
    expect(schemaProps).toHaveBeenLastCalledWith(expect.objectContaining({ emitJobPosting: false }));
  });

  test("an unverified application URL stays hidden even when the notification source is verified", () => {
    const html = renderLeaf("open", true, false);
    expect(html).not.toContain(">Apply online</a>");
    expect(html).toContain(">Official notification</a>");
    expect(html).toContain("Unverified notification or application links are hidden");
  });
});
