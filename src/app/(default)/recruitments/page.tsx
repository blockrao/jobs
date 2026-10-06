import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { recruitments, posts, vacancies } from "@/db/schema";
import { absoluteUrl } from "@/lib/site";
import { desc, eq, sql } from "drizzle-orm";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Recruitment Campaigns - Government Jobs Timeline",
  description: "Browse all government recruitment campaigns with notification dates, application windows, exam schedules, and vacancy details.",
  // SEO-001 D2: noindex, follow until Canonical Read Migration.
  ...pageSeo("/recruitments", { index: false }),
  openGraph: {
    title: "Recruitment Campaigns",
    description: "Explore government recruitment campaigns and apply for positions",
    url: absoluteUrl("/recruitments"),
    type: "website",
  },
};

async function getAllRecruitments() {
  const db = getDb();
  if (!db) return [];

  return db.query.recruitments.findMany({
    with: {
      organization: true,
    },
    orderBy: [desc(recruitments.year)],
  });
}

/** One grouped query for every recruitment (the per-recruitment loop was 2 queries each and made the build time out). */
async function getAllRecruitmentStats(): Promise<Map<number, { postCount: number; totalVacancies: number }>> {
  const db = getDb();
  const out = new Map<number, { postCount: number; totalVacancies: number }>();
  if (!db) return out;
  const rows = await db
    .select({
      recruitmentId: posts.recruitmentId,
      postCount: sql<number>`count(distinct ${posts.id})::int`,
      totalVacancies: sql<number>`coalesce(sum(${vacancies.count}), 0)::int`,
    })
    .from(posts)
    .leftJoin(vacancies, eq(vacancies.postId, posts.id))
    .groupBy(posts.recruitmentId);
  for (const r of rows) out.set(r.recruitmentId, { postCount: r.postCount, totalVacancies: r.totalVacancies });
  return out;
}

export default async function RecruitmentsPage() {
  let allRecruitments: Awaited<ReturnType<typeof getAllRecruitments>> = [];
  try {
    allRecruitments = await getAllRecruitments();
  } catch {
    allRecruitments = [];
  }

  let statsById = new Map<number, { postCount: number; totalVacancies: number }>();
  try {
    statsById = await getAllRecruitmentStats();
  } catch {
    statsById = new Map();
  }
  const recruitmentsWithStats: any[] = allRecruitments.map((rec) => ({
    ...rec,
    ...(statsById.get(rec.id) ?? { postCount: 0, totalVacancies: 0 }),
  }));

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
              href={`/jobs/${recruitment.slug}`}
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
