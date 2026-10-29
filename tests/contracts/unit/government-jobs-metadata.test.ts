import { describe, expect, test } from "vitest";
import { SITE_URL } from "@/lib/site";
import { generateMetadata } from "@/app/(default)/government-jobs/page";

describe("all government jobs hub metadata", () => {
  test("SEO title relies on the shared title template and does not duplicate the brand", async () => {
    const metadata = await generateMetadata({ searchParams: Promise.resolve({}) });

    expect(metadata.title).toBe("All Government Jobs 2026 — Latest Vacancies & Deadlines");
    expect(metadata.description).toContain("official application links");
    expect(metadata.alternates?.canonical).toBe("/government-jobs");
  });

  test("Open Graph and Twitter metadata describe this page, not the homepage", async () => {
    const metadata = await generateMetadata({ searchParams: Promise.resolve({}) });
    const openGraph = metadata.openGraph as { title?: string; description?: string; url?: string };
    const twitter = metadata.twitter as { title?: string; description?: string };

    expect(openGraph.title).toContain("All Government Jobs");
    expect(openGraph.description).toContain("official application links");
    expect(openGraph.url).toBe(`${SITE_URL}/government-jobs`);
    expect(twitter.title).toContain("All Government Jobs");
    expect(twitter.description).toContain("official application links");
  });

  test("paginated views retain page-specific titles and URLs", async () => {
    const metadata = await generateMetadata({ searchParams: Promise.resolve({ page: "2" }) });
    const openGraph = metadata.openGraph as { title?: string; url?: string };

    expect(metadata.title).toContain("Page 2");
    expect(metadata.alternates?.canonical).toBe("/government-jobs?page=2");
    expect(openGraph.url).toBe(`${SITE_URL}/government-jobs?page=2`);
  });
});
