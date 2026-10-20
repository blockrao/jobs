"use client";

/**
 * Pillar Page Production (Phase 2 Tier 1)
 *
 * Renders:
 * - Pillar page content (title, description, sections)
 * - Posts grid (top 12 posts, grouped by recruitment)
 * - BreadcrumbList schema
 */

import React from "react";
import Link from "next/link";
import PillarContentRenderer from "./pillar-content-renderer";

interface PostSample {
  id: number | string;
  title: string;
  slug: string;
  recruitmentSlug: string;
  recruitmentName: string;
  status?: string;
  applicationDeadline?: string | null;
  salary?: {
    min?: number | null;
    max?: number | null;
  };
}

interface PillarPageProductionProps {
  pillar: {
    slug: string;
    organization: {
      id: number;
      name: string;
      slug: string;
      sector?: string;
      description?: string;
      logoUrl?: string;
      websiteUrl?: string;
    };
    recruitmentCount: number;
    postCount: number;
    stats: {
      avgSalaryMin?: number;
      avgSalaryMax?: number;
      hasEnrichedData: number;
    };
  };
  posts: PostSample[];
  canonicalUrl: string;
  content?: string;
}

export default function PillarPageProduction({
  pillar,
  posts,
  canonicalUrl,
  content,
}: PillarPageProductionProps) {
  // BreadcrumbList schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://joboye.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Exams",
        item: "https://joboye.com/exams/",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: pillar.organization.name,
      },
    ],
  };

  // Group posts by recruitment
  const postsByRecruitment = posts.reduce(
    (acc, post) => {
      if (!acc[post.recruitmentSlug]) {
        acc[post.recruitmentSlug] = [];
      }
      acc[post.recruitmentSlug].push(post);
      return acc;
    },
    {} as Record<string, PostSample[]>
  );

  const recruitmentGroups = Object.entries(postsByRecruitment).slice(0, 4);

  return (
    <>
      {/* Breadcrumb Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Main Content */}
      <div className="min-h-screen bg-white dark:bg-gray-950">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-6">
              {pillar.organization.logoUrl && (
                <img
                  src={pillar.organization.logoUrl}
                  alt={pillar.organization.name}
                  className="h-16 w-16 object-contain"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                  {pillar.organization.name} Recruitment Guide
                </h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                  {pillar.postCount} positions • {pillar.recruitmentCount} ongoing recruitments
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Content Container */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Organization Description */}
          {pillar.organization.description && (
            <div className="prose prose-sm dark:prose-invert max-w-none mb-12">
              <h2>Overview</h2>
              <p>{pillar.organization.description}</p>
            </div>
          )}

          {/* Key Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
            <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pillar.postCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Open Positions</div>
            </div>
            <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{pillar.recruitmentCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Recruitments</div>
            </div>
            {pillar.stats.avgSalaryMin && (
              <div className="bg-purple-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  ₹{Math.round((pillar.stats.avgSalaryMin + (pillar.stats.avgSalaryMax || 0)) / 2 / 1000)}K
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Salary</div>
              </div>
            )}
          </div>

          {/* Pillar Content */}
          {content && (
            <article className="prose prose-sm dark:prose-invert max-w-none mb-12">
              <PillarContentRenderer content={content} />
            </article>
          )}

          {/* Posts Section */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Recent & Open Positions</h2>

            {recruitmentGroups.length > 0 ? (
              <div className="space-y-8">
                {recruitmentGroups.map(([recruitmentSlug, recruitmentPosts]) => (
                  <div key={recruitmentSlug}>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                      {recruitmentPosts[0]?.recruitmentName}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {recruitmentPosts.slice(0, 3).map((post) => (
                        <Link
                          key={post.id}
                          href={`/jobs/${post.recruitmentSlug}/${post.slug}`}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md dark:hover:bg-gray-800 transition"
                        >
                          <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                            {post.title}
                          </h4>
                          {post.applicationDeadline && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              Apply by:{" "}
                              {new Date(post.applicationDeadline).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          )}
                          {post.salary?.min && (
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                              ₹{Math.round(post.salary.min / 1000)}K–₹{Math.round((post.salary.max || post.salary.min) / 1000)}K
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No open positions currently. Check back soon.</p>
            )}

            {pillar.postCount > 12 && (
              <div className="mt-8 text-center">
                <Link
                  href={`/?organization=${pillar.organization.slug}`}
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  View all {pillar.postCount} positions →
                </Link>
              </div>
            )}
          </section>

          {/* Related Pillars */}
          <section className="border-t border-gray-200 dark:border-gray-700 pt-12">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Related Exam Guides</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Explore guides for other government exams and organizations.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
