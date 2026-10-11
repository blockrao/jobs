import { beforeEach, describe, expect, test, vi } from "vitest";

const getPostBySlug = vi.fn();

vi.mock("@/db/operations/get-posts", () => ({
  getPostBySlug: (...args: unknown[]) => getPostBySlug(...args),
}));

import { generateMetadata } from "@/app/[locale]/jobs/[slug]/[post-slug]/page";

const recruitmentSlug = "sample-recruitment";
const postSlug = "sample-post";
const englishPath = `/jobs/${recruitmentSlug}/${postSlug}`;

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

describe("post-leaf metadata follows centralized SEO policy", () => {
  test("English leaf uses the canonical English URL", async () => {
    const metadata = await generateMetadata(routeParams("en"));
    const openGraph = metadata.openGraph as { url?: string; locale?: string };

    expect(metadata.alternates?.canonical).toBe(englishPath);
    expect(metadata.alternates?.languages).toBeUndefined();
    expect(metadata.robots).toBeUndefined();
    expect(openGraph.url).toBe(`http://localhost:3000${englishPath}`);
    expect(openGraph.locale).toBe("en_US");
  });

  test("untranslated Hindi leaf canonicalizes to English and is noindex", async () => {
    const metadata = await generateMetadata(routeParams("hi"));
    const openGraph = metadata.openGraph as { url?: string; locale?: string };

    expect(metadata.alternates?.canonical).toBe(englishPath);
    expect(metadata.alternates?.languages).toBeUndefined();
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(openGraph.url).toBe(`http://localhost:3000${englishPath}`);
    expect(openGraph.locale).toBe("hi_IN");
  });
});
