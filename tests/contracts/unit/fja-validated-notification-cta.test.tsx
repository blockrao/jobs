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

describe("validated notification destination", () => {
  test("shows a current checked destination without implying that page facts were independently verified", () => {
    const html = renderToStaticMarkup(createElement(JobDetailPageProduction, {
      post: {
        id: 1,
        title: "Research Associate",
        recruitmentSlug: "sample-recruitment",
        recruitmentName: "Sample Recruitment",
        slug: "research-associate",
        notificationLinkUrl: "https://issuer.example/notice.pdf",
        notificationLinkValidated: true,
        officialSourceVerified: false,
        officialSourceUrl: null,
        officialApplicationVerified: false,
      },
      lifecycle: {
        state: "open",
        isOpen: true,
        isLive: true,
        deadline: new Date("2026-12-01T00:00:00.000Z"),
      },
    }));

    expect(html).toContain('href="https://issuer.example/notice.pdf"');
    expect(html).toContain(">Official notification</a>");
    expect(html).not.toContain("From official notification");
    expect(html).not.toContain("Facts on this page are read from the registered official notification");
    expect(schemaProps).toHaveBeenLastCalledWith(expect.objectContaining({
      post: expect.objectContaining({ officialSourceUrl: null }),
    }));
  });
});
