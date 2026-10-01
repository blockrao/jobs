import type { Metadata } from "next";
import Link from "next/link";
import { getDbV2 } from "@/db";
import { positions, posts } from "@/db/schema-v2";
import { asc, eq } from "drizzle-orm";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Government Positions - Career Paths & Salary Ranges",
  description: "Browse all government job positions with detailed career progression, salary ranges, age requirements, and related exam information.",
  alternates: { canonical: "/positions" },
  openGraph: {
    title: "Government Positions",
    description: "Explore government job positions with career paths and salary information",
    url: absoluteUrl("/positions"),
    type: "website",
  },
};

async function getAllPositions() {
  const db = getDbV2();
  if (!db) return [];

  return db.query.positions.findMany({
    orderBy: [asc(positions.name)],
  });
}

async function getPositionStats(positionId: number) {
  const db = getDbV2();
  if (!db) return { recruitmentCount: 0 };

  const recruitmentPosts = await db.query.posts.findMany({
    where: eq(posts.positionId, positionId),
  });

  const recruitmentCount = new Set(
    recruitmentPosts.map((p) => p.recruitmentId)
  ).size;

  return { recruitmentCount };
}

export default async function PositionsPage() {
  const allPositions = await getAllPositions();

  // Get stats for each position
  const positionsWithStats = await Promise.all(
    allPositions.map(async (pos) => {
      const stats = await getPositionStats(pos.id);
      return { ...pos, ...stats };
    })
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Government Positions</h1>
        <p className="text-lg text-gray-600">
          Explore career paths, salary ranges, and recruitment opportunities across government positions.
        </p>
      </div>

      {allPositions.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-600">No positions available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {positionsWithStats.map((position) => (
            <Link
              key={position.id}
              href={`/positions/${position.slug}`}
              className="block"
            >
              <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
                <h2 className="text-xl font-semibold text-blue-600 hover:underline mb-2">
                  {position.name}
                </h2>

                {position.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {position.description}
                  </p>
                )}

                <div className="space-y-2 mb-4 flex-grow">
                  {position.typicalAgeMin && position.typicalAgeMax && (
                    <div className="text-sm">
                      <span className="text-gray-600">Age: </span>
                      <span className="font-medium">
                        {position.typicalAgeMin} - {position.typicalAgeMax} years
                      </span>
                    </div>
                  )}

                  {position.typicalSalaryMin && position.typicalSalaryMax && (
                    <div className="text-sm">
                      <span className="text-gray-600">Salary: </span>
                      <span className="font-medium">
                        ₹{(position.typicalSalaryMin / 1000).toFixed(0)}K - ₹{(position.typicalSalaryMax / 1000).toFixed(0)}K
                      </span>
                    </div>
                  )}

                  {position.category && (
                    <div className="text-sm">
                      <span className="text-gray-600">Category: </span>
                      <span className="font-medium">
                        {position.category.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                </div>

                {position.recruitmentCount > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-sm text-green-600 font-medium">
                      {position.recruitmentCount} recruitment{position.recruitmentCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
