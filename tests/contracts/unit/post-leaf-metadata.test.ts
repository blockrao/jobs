import { beforeEach, describe, expect, test, vi } from "vitest";

const getPostBySlug = vi.fn();

vi.mock("@/db/operations/get-posts", () => ({
  getPostBySlug: (...args: unknown[]) => getPostBySlug(...args),
}));

import { generateMetadata } from "@/app/[locale]/jobs/[slug]/[post-slug]/page";

const recruitmentSlug = "sample-recruitment";
const postSlug = "sample-post";
const englishPath = `/jobs/${recruitmentSlug}/${postSlug}`;
const hindiPath = `/hi/jobs/${recruitmentSlug}/${postSlug}`;

function routeParams(locale: "en" | "hi") {
  return {
    params: Promise.resolve({
      locale,
      slug: recruitmentSlug,
      "post-slug": postSlug,
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getPostBySlug.mockResolvedValue({
    title: "Sample Post",
    organizationName: "Sample Organization",
    description: "A sample job posting.",
  });
});

describe("localized post-leaf metadata", () => {
  test("English leaf uses its own canonical and Open Graph URL", async () => {
    const metadata = await generateMetadata(routeParams("en"));
    const openGraph = metadata.openGraph as { url?: string; locale?: string };

    expect(metadata.alternates?.canonical).toBe(englishPath);
    expect(metadata.alternates?.languages).toEqual({
      en: englishPath,
      hi: hindiPath,
    });
    expect(openGraph.url).toBe(`https://www.joboye.com${englishPath}`);
    expect(openGraph.locale).toBe("en_US");
  });

  test("Hindi leaf uses its own canonical and Open Graph URL", async () => {
    const metadata = await generateMetadata(routeParams("hi"));
    const openGraph = metadata.openGraph as { url?: string; locale?: string };

    expect(metadata.alternates?.canonical).toBe(hindiPath);
    expect(metadata.alternates?.languages).toEqual({
      en: englishPath,
      hi: hindiPath,
    });
    expect(openGraph.url).toBe(`https://www.joboye.com${hindiPath}`);
    expect(openGraph.locale).toBe("hi_IN");
  });
});
