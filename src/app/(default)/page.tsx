import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import {
  getHomeStats,
  listClosingSoon,
  countClosingSoon,
  listBiggestOpen,
  listTopHiringOrgs,
  countLivePostsBySector,
} from "@/lib/queries";
import { safeQuery } from "@/lib/safe-query";
import { HomeContent } from "@/components/home-content";

export const revalidate = 86400; // Phase 1: daily revalidation

// The home page is an English page at "/" (SEO-001 D3).
export const metadata: Metadata = {
  title: "Latest Government Jobs in India | JobOye",
  description:
    "Discover government job opportunities ranked by vacancy information and available deadlines. Review each listing and confirm vacancies, eligibility, fees, dates and the application process in the recruiting body's latest official notification.",
  ...pageSeo("/"),
};

const BIGGEST = 5;
const OPEN = 8;

export default async function Home() {
  const [stats, closingSoon, closingMonthCount, ranked, orgs, sectorCounts] = await Promise.all([
    safeQuery(() => getHomeStats(), { closing7dPosts: 0, totalVacancies: 0, liveRecruitments: 0 }),
    safeQuery(() => listClosingSoon({ days: 14, limit: 7 }), []),
    safeQuery(() => countClosingSoon(30), 0),
    // One ranked query feeds both "biggest" (head) and "open notifications" (next slice).
    safeQuery(() => listBiggestOpen({ limit: BIGGEST + OPEN }), []),
    safeQuery(() => listTopHiringOrgs(12), []),
    safeQuery(() => countLivePostsBySector(), {}),
  ]);

  return (
    <HomeContent
      stats={stats}
      closingSoon={closingSoon}
      closingMonthCount={closingMonthCount}
      biggest={ranked.slice(0, BIGGEST)}
      open={ranked.slice(BIGGEST)}
      orgs={orgs}
      sectorCounts={sectorCounts}
    />
  );
}
