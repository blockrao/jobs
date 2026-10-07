import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import { getRankedOrganizations } from "@/db/operations/get-organizations";
import { OrganizationsHubContent } from "@/components/organizations-hub-content";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Government Recruitment Organizations - SSC, UPSC, Railways & More",
  description:
    "Browse top government recruitment organizations including SSC, UPSC, Banking, Railways, State PSCs and other recruitment authorities.",
  ...pageSeo("/organizations"),
  openGraph: {
    title: "Government Recruitment Organizations",
    description:
      "Explore government recruitment organizations ranked by activity, and find their job openings, exams and recruitment history.",
    url: absoluteUrl("/organizations"),
    type: "website",
  },
};

export default async function OrganizationsPage() {
  // Returns only orgs with at least one recruitment, sorted by recruitment
  // count descending (most active recruiters first). Bucket orgs with zero
  // campaigns are excluded — they have no indexable content.
  let orgsWithStats: Awaited<ReturnType<typeof getRankedOrganizations>> = [];
  try {
    orgsWithStats = await getRankedOrganizations();
  } catch {
    orgsWithStats = [];
  }

  const mapped = orgsWithStats.map((org) => ({
    ...org,
    recruitmentCount: org.recruitmentCount ?? 0,
    examCount: 0, // exam count per org is available on the detail page; skip N+1 here
  }));

  return <OrganizationsHubContent orgsWithStats={mapped} />;
}
