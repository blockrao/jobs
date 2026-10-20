/**
 * Recruitment Hub Page
 * 
 * Route: /jobs/[recruitment-slug]
 * 
 * Canonical URL for a recruitment campaign. Shows all posts (roles/positions)
 * associated with this recruitment, with verified details, deadlines, and links
 * to individual post pages.
 * 
 * No redirects. This is the primary destination for recruitment-level navigation.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/db";
import { recruitments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";

export const revalidate = 86400; // 1 day ISR

type Props = { params: Promise<{ "recruitment-slug": string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "recruitment-slug": recruitmentSlug } = await params;
  const db = getDb();
  if (!db) return { title: "Recruitment - JobOye" };

  const recruitment = await db.query.recruitments.findFirst({
    where: eq(recruitments.slug, recruitmentSlug),
  });

  if (!recruitment) {
    return { title: "Recruitment Not Found - JobOye", robots: { index: false } };
  }

  const title = `${recruitment.name} - Government Jobs at JobOye`;
  const description = recruitment.description || `Apply for ${recruitment.name} recruitment. Check eligibility, vacancies, salary and official notification at JobOye.`;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://joboye.com";
  const canonicalUrl = `${baseUrl}/jobs/${recruitment.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RecruitmentHubPage({ params }: Props) {
  const { "recruitment-slug": recruitmentSlug } = await params;

  const db = getDb();
  if (!db) notFound();

  // Query recruitment with all posts
  const recruitment = await db.query.recruitments.findFirst({
    where: eq(recruitments.slug, recruitmentSlug),
    with: {
      posts: {
        with: {
          position: true,
        },
        orderBy: (p, { desc }) => [desc(p.vacancyTotal)],
      },
      organization: true,
    },
  });

  if (!recruitment) {
    notFound();
  }

  if (!recruitment.posts || recruitment.posts.length === 0) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{recruitment.name}</h1>
        {recruitment.organization && (
          <p className="text-lg text-gray-600 mb-2">{recruitment.organization.name}</p>
        )}
        {recruitment.description && (
          <p className="text-gray-700 mb-4">{recruitment.description}</p>
        )}

        {/* Key Details */}
        <div className="flex flex-wrap gap-4 text-sm">
          {recruitment.applicationEndDate && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Application Deadline:</span>
              <span className="font-semibold">
                {new Date(recruitment.applicationEndDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {recruitment.posts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Total Posts:</span>
              <span className="font-semibold">{recruitment.posts.length}</span>
            </div>
          )}
          {recruitment.totalVacancies && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Total Vacancies:</span>
              <span className="font-semibold">{recruitment.totalVacancies}</span>
            </div>
          )}
          {recruitment.status && (
            <Badge tone={recruitment.status === "ACTIVE" ? "success" : "neutral"}>
              {recruitment.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">
          {recruitment.posts.length} Position{recruitment.posts.length !== 1 ? "s" : ""}
        </h2>

        {recruitment.posts.map((post) => (
          <Link
            key={post.id}
            href={`/jobs/${recruitment.slug}/${post.slug}`}
            className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                  {post.name}
                </h3>
                {post.position && (
                  <p className="text-sm text-gray-600 mt-1">
                    {post.position.name}
                  </p>
                )}
              </div>
              {post.vacancyTotal && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {post.vacancyTotal}
                  </div>
                  <div className="text-xs text-gray-600">Vacancies</div>
                </div>
              )}
            </div>

            {post.description && (
              <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                {post.description}
              </p>
            )}

            <div className="flex gap-4 text-sm text-gray-600">
              {post.salaryMin && post.salaryMax && (
                <div>
                  Salary: ₹{(post.salaryMin / 100000).toFixed(1)}L - ₹{(post.salaryMax / 100000).toFixed(1)}L
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Official Links */}
      {recruitment.officialNotificationUrl || recruitment.officialApplicationUrl ? (
        <div className="mt-12 pt-8 border-t">
          <h3 className="text-lg font-semibold mb-4">Official Resources</h3>
          <div className="space-y-2">
            {recruitment.officialNotificationUrl && (
              <div>
                <a
                  href={recruitment.officialNotificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Official Notification →
                </a>
              </div>
            )}
            {recruitment.officialApplicationUrl && (
              <div>
                <a
                  href={recruitment.officialApplicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Apply Online →
                </a>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
