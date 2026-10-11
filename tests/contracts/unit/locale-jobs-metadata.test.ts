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
  });

  test("Hindi /hi/jobs mirror is noindex and canonicalizes to /jobs", async () => {
    const result = await metadata("hi");
    expect(result.alternates?.canonical).toBe("/jobs");
    expect(result.robots).toEqual({ index: false, follow: true });
  });

  test("filtered English listing is noindex and canonicalizes to /jobs", async () => {
    const result = await metadata("en", { filter: "open" });
    expect(result.alternates?.canonical).toBe("/jobs");
    expect(result.robots).toEqual({ index: false, follow: true });
  });
});
