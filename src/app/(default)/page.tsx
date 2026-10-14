import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import { listArticles, listPostings, getHomepageStats } from "@/lib/queries";
import { HomeContent } from "@/components/home-content";

export const revalidate = 300;

// The home page is an English page at "/" (SEO-001 D3).
export const metadata: Metadata = { ...pageSeo("/") };

export default async function Home() {
  let govtJobs: Awaited<ReturnType<typeof listPostings>> = [];
  let privateJobs: Awaited<ReturnType<typeof listPostings>> = [];
  let articles: Awaited<ReturnType<typeof listArticles>> = [];
  let homepageStats: Awaited<ReturnType<typeof getHomepageStats>> = {
    stats: { totalVacancies: 0, activeRecruitments: 0, closingThisWeek: 0, orgsHiring: 0 },
    closingSoon: [],
  };

  try {
    const results = await Promise.all([
      listPostings({ kind: "GOVERNMENT", limit: 8 }).catch(() => []),
      listPostings({ kind: "PRIVATE", limit: 8 }).catch(() => []),
      listArticles({ limit: 6 }).catch(() => []),
      getHomepageStats().catch(() => ({
        stats: { totalVacancies: 0, activeRecruitments: 0, closingThisWeek: 0, orgsHiring: 0 },
        closingSoon: [],
      })),
    ]);
    govtJobs = results[0] as typeof govtJobs;
    privateJobs = results[1] as typeof privateJobs;
    articles = results[2] as typeof articles;
    homepageStats = results[3] as typeof homepageStats;
  } catch {
    // empty fallbacks already set above
  }

  return (
    <HomeContent
      govtJobs={govtJobs}
      privateJobs={privateJobs}
      articles={articles}
      homepageStats={homepageStats.stats}
      closingSoon={homepageStats.closingSoon}
    />
  );
}
