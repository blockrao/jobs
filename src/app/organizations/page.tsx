import type { Metadata } from "next";
import Link from "next/link";
import { getDbV2 } from "@/db";
import { organizations, recruitments, exams } from "@/db/schema-v2";
import { absoluteUrl } from "@/lib/site";
import { asc, eq } from "drizzle-orm";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Government Organizations - Recruitment Agencies",
  description: "Browse all government recruitment organizations including SSC, UPSC, Banking, Railways, State, and other recruitment authorities.",
  alternates: { canonical: "/organizations" },
  openGraph: {
    title: "Government Organizations",
    description: "Explore government recruitment organizations and their job openings",
    url: absoluteUrl("/organizations"),
    type: "website",
  },
};

async function getAllOrganizations() {
  const db = getDbV2();
  if (!db) return [];

  return db.query.organizations.findMany({
    orderBy: [asc(organizations.name)],
  });
}

async function getOrganizationStats(organizationId: number) {
  const db = getDbV2();
  if (!db) return { recruitmentCount: 0, examCount: 0 };

  const recruitmentsList = await db.query.recruitments.findMany({
    where: eq(recruitments.organizationId, organizationId),
  });

  const examsList = await db.query.exams.findMany({
    where: eq(exams.organizationId, organizationId),
  });

  return { recruitmentCount: recruitmentsList.length, examCount: examsList.length };
}

const ROLE_LABELS: Record<string, string> = {
  EXAM_AUTHORITY: "Exam Authority",
  RECRUITING_BODY: "Recruiting Body",
  COMMISSION: "Commission",
};

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Government Organizations</h1>
        <p className="text-lg text-gray-600">
          Explore recruitment organizations, commissions, and authorities that conduct government job exams and recruitment drives.
        </p>
      </div>

      {allOrganizations.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-600">No organizations available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orgsWithStats.map((org) => (
            <Link
              key={org.id}
              href={`/organizations/${org.slug}`}
              className="block"
            >
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  {org.logoUrl && (
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-grow">
                    <h2 className="text-xl font-semibold text-blue-600 hover:underline">
                      {org.name}
                    </h2>
                  </div>
                </div>

                {org.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
                    {org.description}
                  </p>
                )}

                {(org as any).roles && (org as any).roles.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(org as any).roles.map((role: string) => (
                      <span
                        key={role}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                      >
                        {ROLE_LABELS[role] || role.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 flex justify-between">
                  {org.recruitmentCount > 0 && (
                    <div className="text-sm">
                      <div className="text-gray-600 text-xs">Campaigns</div>
                      <div className="font-semibold">{org.recruitmentCount}</div>
                    </div>
                  )}
                  {org.examCount > 0 && (
                    <div className="text-sm">
                      <div className="text-gray-600 text-xs">Exams</div>
                      <div className="font-semibold">{org.examCount}</div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
