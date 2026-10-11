import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/queries", () => ({
  listPostings: vi.fn(),
}));

import { generateMetadata } from "@/app/[locale]/jobs/page";

function metadata(locale: "en" | "hi", searchParams: Record<string, string> = {}) {
  return generateMetadata({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(searchParams),
  });
}

describe("localized jobs listing indexability", () => {
  test("canonical unfiltered English /jobs listing remains indexable", async () => {
    const result = await metadata("en");
    expect(result.alternates?.canonical).toBe("/jobs");
    expect(result.robots).toBeUndefined();
    expect(result.openGraph?.url).toBe("https://www.joboye.com/jobs");
    expect(result.openGraph?.title).toBe("All Jobs");
    expect(result.twitter?.title).toBe("All Jobs");
  });

  test("Hindi /hi/jobs mirror is noindex and canonicalizes to /jobs", async () => {
    const result = await metadata("hi");
    expect(result.alternates?.canonical).toBe("/jobs");
    expect(result.robots).toEqual({ index: false, follow: true });
    expect(result.openGraph?.url).toBe("https://www.joboye.com/jobs");
    expect(result.openGraph?.title).toBe("सभी नौकरियां");
    expect(result.twitter?.title).toBe("सभी नौकरियां");
  });

  test("filtered English listing is noindex and canonicalizes to /jobs", async () => {
    const result = await metadata("en", { filter: "open" });
    expect(result.alternates?.canonical).toBe("/jobs");
    expect(result.robots).toEqual({ index: false, follow: true });
  });

  test("English search results are noindex and canonicalize to /jobs", async () => {
    const result = await metadata("en", { q: "police" });
    expect(result.alternates?.canonical).toBe("/jobs");
    expect(result.robots).toEqual({ index: false, follow: true });
  });

  test("later English pagination is noindex and canonicalizes to /jobs", async () => {
    const result = await metadata("en", { page: "2" });
    expect(result.alternates?.canonical).toBe("/jobs");
    expect(result.robots).toEqual({ index: false, follow: true });
  });
});
