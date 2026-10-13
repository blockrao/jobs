import type { Metadata } from "next";
import { getDailyDigestStats, getDailyDigestJobs } from "@/lib/queries";
import { DashboardContent } from "@/components/dashboard-content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Govt Jobs Dashboard — Today's Vacancies | JobOye" },
  description:
    "Real-time government job vacancy dashboard. Today's openings broken down by category, organization, state. 1.5 lakh+ vacancies tracked daily.",
};

export default async function DashboardPage() {
  const [digestStats, topJobs] = await Promise.all([
    getDailyDigestStats().catch(() => null),
    getDailyDigestJobs({ limit: 30 }).catch(() => []),
  ]);

  return <DashboardContent digestStats={digestStats} topJobs={topJobs} />;
}
