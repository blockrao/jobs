import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/queries", () => ({
  listPostings: vi.fn(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { generateMetadata, default as LocaleJobsListPage } from "@/app/[locale]/jobs/page";

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
  test("English listing navigation emits canonical unprefixed paths", async () => {
    const element = await LocaleJobsListPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);
    expect(markup).toContain('action="/jobs"');
    expect(markup).toContain('href="/jobs?kind=GOVERNMENT"');
    expect(markup).not.toContain('"/en/jobs');
  });

  test("Hindi listing navigation retains the Hindi locale prefix", async () => {
    const element = await LocaleJobsListPage({
      params: Promise.resolve({ locale: "hi" }),
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);
    expect(markup).toContain('action="/hi/jobs"');
    expect(markup).toContain('href="/hi/jobs?kind=GOVERNMENT"');
  });

});
