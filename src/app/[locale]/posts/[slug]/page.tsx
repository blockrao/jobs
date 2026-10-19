/**
 * Role/Position Hub Page
 * Lists all live posts for a specific role
 * Links to individual post leaf pages
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = getDb();
    const position = await db.execute<{
      name: string;
    }>(sql`
      SELECT name FROM positions WHERE slug = ${slug} LIMIT 1
    `);

    if (!position.length) {
      return { title: "Role not found" };
    }

    return {
      title: `${position[0].name} Jobs - JobOye`,
      description: `Browse all available ${position[0].name} positions`,
    };
  } catch {
    return { title: "Role" };
  }
}

export default async function RoleHubPage({ params }: Props) {
  const { locale, slug } = await params;

  try {
    const db = getDb();

    // Get position
    const positionResult = await db.execute<{
      id: number;
      name: string;
    }>(sql`
      SELECT id, name FROM positions WHERE slug = ${slug} LIMIT 1
    `);

    if (!positionResult.length) {
      notFound();
    }

    const position = positionResult[0];

    // Get all live posts for this position
    const postsResult = await db.execute<{
      id: number;
      title: string;
      slug: string;
      recruitment_slug: string;
      organization_name: string;
      location_state: string;
      posted_at: Date | string;
    }>(sql`
      SELECT
        p.id,
        p.title,
        p.slug,
        r.slug as recruitment_slug,
        p.organization_name,
        p.location_state,
        p.posted_at
      FROM posts p
      INNER JOIN recruitments r ON p.recruitment_id = r.id
      WHERE p.position_id = ${position.id}
        AND p."isLive" = true
      ORDER BY p.posted_at DESC
    `);

    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-2">{position.name} Positions</h1>
          <p className="text-gray-600">
            {postsResult.length} active opportunity{postsResult.length !== 1 ? "ies" : ""}
          </p>
        </header>

        {/* Posts Grid */}
        {postsResult.length > 0 ? (
          <div className="grid gap-6">
            {postsResult.map((post) => (
              <Link
                key={post.id}
                href={`${locale === "hi" ? "/hi" : ""}/jobs/${post.recruitment_slug}/${post.slug}`}
                className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-blue-600 hover:underline">
                      {post.title}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {post.organization_name}
                      {post.location_state && ` • ${post.location_state}`}
                    </p>
                  </div>
                  <span className="text-gray-500 text-sm whitespace-nowrap ml-4">
                    {post.posted_at
                      ? new Date(post.posted_at).toLocaleDateString("en-IN")
                      : "—"}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">
                  View details and apply for this position →
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No active positions found for {position.name}</p>
            <Link href={`${locale === "hi" ? "/hi" : ""}/jobs`} className="text-blue-600 hover:underline">
              Browse all positions
            </Link>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-12 pt-8 border-t">
          <Link href={`${locale === "hi" ? "/hi" : ""}/jobs`} className="text-blue-600 hover:underline">
            ← Back to all positions
          </Link>
        </div>
      </div>
    );
  } catch (error) {
    console.error("[RoleHubPage] Error:", error);
    notFound();
  }
}
