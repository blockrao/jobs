import type { Metadata } from "next";
import Link from "next/link";
import { getDbV2 } from "@/db";
import { positions } from "@/db/schema-v2";
import { absoluteUrl } from "@/lib/site";
import { asc } from "drizzle-orm";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Browse All Government Job Positions - Evergreen Roles",
  description: "Explore evergreen government job positions by category: Administrative, Banking, Police, Defence, Railway, Teaching, and Engineering. Find salary ranges, age requirements, and qualification details.",
  alternates: { canonical: "/positions" },
  openGraph: {
    title: "Government Job Positions",
    description: "Browse evergreen government positions across multiple sectors",
    url: absoluteUrl("/positions"),
    type: "website",
  },
};

async function getAllPositions() {
  const db = getDbV2();
  if (!db) return [];

  return db.query.positions.findMany({
    orderBy: [asc(positions.category), asc(positions.name)],
  });
}

export default async function PositionsPage() {
  let positions_list: Awaited<ReturnType<typeof getAllPositions>> = [];
  try {
    positions_list = await getAllPositions();
  } catch {
    positions_list = [];
  }

  const groupedByCategory = positions_list.reduce(
    (acc, pos) => {
      if (!acc[pos.category]) {
        acc[pos.category] = [];
      }
      acc[pos.category].push(pos);
      return acc;
    },
    {} as Record<string, typeof positions_list>
  );

  const categoryLabels: Record<string, string> = {
    ADMINISTRATIVE: "Administrative & Clerical",
    BANKING: "Banking & Finance",
    POLICE: "Police & Law Enforcement",
    DEFENCE: "Defence & Armed Forces",
    RAILWAY: "Railway & Transport",
    TEACHING: "Teaching & Education",
    ENGINEERING: "Engineering & Technical",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2">Government Job Positions</h1>
        <p className="text-lg text-gray-600">
          Browse evergreen job positions across government sectors. Each position appears in multiple recruitment campaigns throughout the year.
        </p>
      </div>

      {Object.keys(groupedByCategory).length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-600">No positions available yet.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedByCategory).map(([category, categoryPositions]) => (
            <div key={category}>
              <h2 className="text-2xl font-bold text-blue-900 mb-6 pb-2 border-b-2 border-blue-200">
                {categoryLabels[category] || category}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryPositions.map((position) => (
                  <Link
                    key={position.id}
                    href={`/positions/${position.slug}`}
                    className="block"
                  >
                    <div className="p-5 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-400 transition-all">
                      <h3 className="text-lg font-semibold text-blue-600 hover:underline mb-3">
                        {position.name}
                      </h3>

                      {position.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {position.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
                        {position.typicalSalaryMin && (
                          <div>
                            <div className="text-gray-600 font-medium">Salary Range</div>
                            <div className="text-gray-800 font-semibold">
                              ₹{(position.typicalSalaryMin / 100000).toFixed(1)}L - ₹{(position.typicalSalaryMax! / 100000).toFixed(1)}L
                            </div>
                          </div>
                        )}

                        {position.typicalAgeMin && (
                          <div>
                            <div className="text-gray-600 font-medium">Age Limit</div>
                            <div className="text-gray-800 font-semibold">
                              {position.typicalAgeMin} - {position.typicalAgeMax} years
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
