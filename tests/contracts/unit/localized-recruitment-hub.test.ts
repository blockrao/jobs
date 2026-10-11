import { beforeEach, describe, expect, test, vi } from "vitest";
import { canonicalOf, isNoindex } from "../helpers/metadata";
import type { Metadata } from "next";

const mocks = vi.hoisted(() => ({
  getRecruitmentWithPostsCached: vi.fn(),
  getPostingBySlugCached: vi.fn(),
}));

vi.mock("@/db/operations/get-recruitments", () => ({
  getRecruitmentWithPostsCached: mocks.getRecruitmentWithPostsCached,
}));

vi.mock("@/lib/queries", () => ({
  getPostingBySlug: vi.fn(),
  getPostingBySlugCached: mocks.getPostingBySlugCached,
  getPostsForRecruitment: vi.fn(),
}));

describe("localized Recruitment hub metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRecruitmentWithPostsCached.mockResolvedValue({
      recruitment: {
        id: 42,
        slug: "sample-recruitment-2026",
        name: "Sample Recruitment 2026",
      },
      posts: [],
      totalPosts: 0,
    });
  });

  test("English hub uses its canonical Recruitment URL and remains indexable", async () => {
    const { generateMetadata } = await import("@/app/[locale]/jobs/[slug]/page");
    const metadata: Metadata = await generateMetadata({
      params: Promise.resolve({ slug: "sample-recruitment-2026", locale: "en" }),
    });
    expect(canonicalOf(metadata)?.pathname).toBe("/jobs/sample-recruitment-2026");
    expect(isNoindex(metadata)).toBe(false);
    expect(mocks.getRecruitmentWithPostsCached).toHaveBeenCalledWith("sample-recruitment-2026");
  });

  test("untranslated Hindi hub uses the English canonical and noindex follow", async () => {
    const { generateMetadata } = await import("@/app/[locale]/jobs/[slug]/page");
    const metadata: Metadata = await generateMetadata({
      params: Promise.resolve({ slug: "sample-recruitment-2026", locale: "hi" }),
    });
    expect(canonicalOf(metadata)?.pathname).toBe("/jobs/sample-recruitment-2026");
    expect(isNoindex(metadata)).toBe(true);
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
    expect(mocks.getPostingBySlugCached).not.toHaveBeenCalled();
  });
});
