import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { organizations, recruitments } from "@/db/schema";
import { absoluteUrl } from "@/lib/site";
import { asc, eq } from "drizzle-orm";
import { OrganizationsHubContent } from "@/components/organizations-hub-content";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Government Organizations - Recruitment Agencies",
  description: "Browse all government recruitment organizations including SSC, UPSC, Banking, Railways, State, and other recruitment authorities.",
  ...pageSeo("/organizations"),
  openGraph: {
    title: "Government Organizations",
    description: "Explore government recruitment organizations and their job openings",
    url: absoluteUrl("/organizations"),
    type: "website",
  },
};

async function getAllOrganizations() {
  const db = getDb();
  if (!db) return [];

  return db.query.organizations.findMany({
    orderBy: [asc(organizations.name)],
  });
}

async function getOrganizationStats(organizationId: number) {
  const db = getDb();
  if (!db) return { recruitmentCount: 0, examCount: 0 };

  // An exam doesn't belong to one organization (it belongs to the commission
  // that conducts it, e.g. SSC, UPSC) — organizations only connect to exams
  // indirectly, through the recruitments that use them. So "exam count" here
  // is the number of distinct exams this org has recruited through, not
  // exams the org owns.
  const recruitmentsList = await db.query.recruitments.findMany({
    where: eq(recruitments.organizationId, organizationId),
  });

  const examCount = new Set(
    recruitmentsList.map((r) => r.examId).filter((id): id is number => id != null),
  ).size;

  return { recruitmentCount: recruitmentsList.length, examCount };
}

export default async function OrganizationsPage() {
  let allOrganizations: Awaited<ReturnType<typeof getAllOrganizations>> = [];
  try {
    allOrganizations = await getAllOrganizations();
  } catch {
    allOrganizations = [];
  }

  // Get stats for each organization
  let orgsWithStats: any[] = [];
  try {
    orgsWithStats = await Promise.all(
      allOrganizations.map(async (org) => {
        const stats = await getOrganizationStats(org.id);
        return { ...org, ...stats };
      })
    );
  } catch {
    orgsWithStats = allOrganizations.map((org) => ({
      ...org,
      recruitmentCount: 0,
      examCount: 0,
    }));
  }

  // OrganizationsHubContent (client) decides how to render based on the
  // visitor's saved language cookie — same reasoning as home-content.tsx —
  // keeping this page a plain static/ISR server component.
  return <OrganizationsHubContent orgsWithStats={orgsWithStats} />;
}
