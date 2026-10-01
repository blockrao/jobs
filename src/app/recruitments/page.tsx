import type { Metadata } from "next";
import Link from "next/link";
import { getDbV2 } from "@/db";
import { recruitments, posts, vacancies } from "@/db/schema-v2";
import { absoluteUrl } from "@/lib/site";
import { desc, eq, inArray } from "drizzle-orm";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Recruitment Campaigns - Government Jobs Timeline",
  description: "Browse all government recruitment campaigns with notification dates, application windows, exam schedules, and vacancy details.",
  alternates: { canonical: "/recruitments" },
  openGraph: {
    title: "Recruitment Campaigns",
    description: "Explore government recruitment campaigns and apply for positions",
    url: absoluteUrl("/recruitments"),
    type: "website",
  },
};

async function getAllRecruitments() {
  const db = getDbV2();
  if (!db) return [];

  return db.query.recruitments.findMany({
    with: {
      organization: true,
    },
    orderBy: [desc(recruitments.year)],
  });
}

async function getRecruitmentStats(recruitmentId: number) {
  const db = getDbV2();
  if (!db) return { postCount: 0, totalVacancies: 0 };

  const postsList = await db.query.posts.findMany({
    where: eq(posts.recruitmentId, recruitmentId),
  });

  if (postsList.length === 0) {
    return { postCount: 0, totalVacancies: 0 };
  }

  const postIds = postsList.map((p) => p.id);
  const vacanciesList = await db.query.vacancies.findMany({
    where: inArray(vacancies.postId, postIds),
  });

  const totalVacancies = vacanciesList.reduce((sum, v) => sum + v.count, 0);

  return { postCount: postsList.length, totalVacancies };
}

export default async function RecruitmentsPage() {
  const allRecruitments = await getAllRecruitments();

  // Get stats for each recruitment
  const recruitmentsWithStats = await Promise.all(
    allRecruitments.map(async (rec) => {
      const stats = await getRecruitmentStats(rec.id);
      return { ...rec, ...stats };
    })
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Recruitment Campaigns</h1>
        <p className="text-lg text-gray-600">
          Browse all government recruitment campaigns with timelines, vacancies, and application details.
        </p>
      </div>

      {allRecruitments.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-600">No recruitment campaigns available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recruitmentsWithStats.map((recruitment) => (
            <Link
              key={recruitment.id}
              href={`/recruitments/${recruitment.slug}`}
              className="block"
            >
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-grow">
                    <h2 className="text-xl font-semibold text-blue-600 hover:underline mb-2">
                      {recruitment.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {(recruitment.organization as any)?.name || "Unknown Organization"}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${getStatusColor(recruitment.status)}`}>
                    {recruitment.status}
                  </span>
                </div>

                {recruitment.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {recruitment.description}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-600">Year</div>
                    <div className="font-semibold text-lg">{recruitment.year}</div>
                  </div>

                  {recruitment.postCount > 0 && (
                    <div>
                      <div className="text-xs text-gray-600">Positions</div>
                      <div className="font-semibold text-lg">{recruitment.postCount}</div>
                    </div>
                  )}

                  {recruitment.totalVacancies > 0 && (
                    <div>
                      <div className="text-xs text-gray-600">Vacancies</div>
                      <div className="font-semibold text-lg text-green-600">
                        {recruitment.totalVacancies}
                      </div>
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
