import type { Metadata } from "next";
import { getDailyDigestStats, getDailyDigestJobs } from "@/lib/queries";
import { DashboardContent } from "@/components/dashboard-content";

export const revalidate = 86400; // Phase 1: daily revalidation

export const metadata: Metadata = {
  title: { absolute: "Govt Jobs Dashboard — Today's Vacancies | JobOye" },
  description:
    "Real-time government job vacancy dashboard. Today's openings broken down by category, organization, state. Updated from official notifications.",
};

export default async function DashboardPage() {
  const [digestStats, topJobs] = await Promise.all([
    getDailyDigestStats().catch(() => null),
    getDailyDigestJobs({ limit: 2000 }).catch(() => []),
  ]);

  return <DashboardContent digestStats={digestStats} topJobs={topJobs} />;
}
