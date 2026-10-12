import { beforeEach, describe, expect, test, vi } from "vitest";

const getPositionBySlug = vi.fn();
const getPositionStats = vi.fn();

vi.mock("@/db/operations/get-positions", () => ({
  getPositionBySlug: (...args: unknown[]) => getPositionBySlug(...args),
  getPostsForPosition: vi.fn(),
  getPositionStats: (...args: unknown[]) => getPositionStats(...args),
}));

vi.mock("@/db/operations/get-roles", () => ({
  getPostsForRole: vi.fn(),
  getRoleStats: vi.fn(),
}));

vi.mock("@/lib/roles", () => ({
  getRoleBySlug: vi.fn(() => null),
}));

import { generateMetadata } from "@/app/(default)/posts/[slug]/page";

describe("role discovery page social metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPositionBySlug.mockResolvedValue({
      id: 42,
      slug: "junior-research-fellow-jobs",
      name: "Junior Research Fellow",
      description: "Research fellowship opportunities.",
    });
    getPositionStats.mockResolvedValue({
      totalVacancies: 25,
      activeRecruitments: 3,
      totalRecruitments: 5,
    });
  });

  test("Twitter card uses the same role-specific title and description as Open Graph", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "junior-research-fellow-jobs" }),
    });
    const openGraph = metadata.openGraph as { title?: string; description?: string };
    const twitter = metadata.twitter as {
      card?: string;
      title?: string;
      description?: string;
    };

    expect(twitter.card).toBe("summary_large_image");
    expect(twitter.title).toBe(openGraph.title);
    expect(twitter.description).toBe(openGraph.description);
    expect(twitter.title).toContain("Junior Research Fellow");
  });
});
