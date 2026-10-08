/**
 * Recruitment Hub Page
 * Route: /jobs/[recruitment-slug]
 *
 * Displays recruitment details and lists all associated job postings.
 * For single-job recruitments, displays the job details directly.
 */

import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { getRecruitmentWithPosts } from "@/db/operations/get-recruitments";

interface RecruitmentHubProps {
  params: Promise<{
    "recruitment-slug": string;
  }>;
}

export async function generateMetadata({
  params,
}: RecruitmentHubProps): Promise<Metadata> {
  const resolvedParams = await params;
  const recruitmentData = await getRecruitmentWithPosts(resolvedParams["recruitment-slug"]);

  if (!recruitmentData) {
    return {
      title: "Recruitment Not Found",
      description: "The requested recruitment could not be found",
    };
  }

  const { recruitment, totalPosts } = recruitmentData;

  return {
    title: `${recruitment.name} - JobOye`,
    description: `${recruitment.name} recruitment with ${totalPosts} open position${totalPosts !== 1 ? 's' : ''}. View eligibility criteria and application details.`,
    openGraph: {
      title: recruitment.name,
      description: `${recruitment.name} recruitment on JobOye`,
      type: "website",
      url: `https://www.joboye.com/jobs/${recruitment.slug}`,
    },
  };
}

export default async function RecruitmentHubPage({
  params,
}: RecruitmentHubProps) {
  const resolvedParams = await params;
  const recruitmentSlug = resolvedParams["recruitment-slug"];

  // Fetch recruitment data with all posts
  const recruitmentData = await getRecruitmentWithPosts(recruitmentSlug);

  if (!recruitmentData) {
    notFound();
  }

  const { recruitment, posts, isSingleJobRecruitment } = recruitmentData;

  // For single-job recruitments, redirect to the individual post page
  if (isSingleJobRecruitment && posts.length === 1) {
    const post = posts[0];
    redirect(`/jobs/${recruitmentSlug}/${post.slug}`);
  }

  // For multi-post recruitments, display the recruitment hub
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/jobs" className="text-blue-600 hover:underline">
            Jobs
          </Link>
          <span>›</span>
          <span>{recruitment.name}</span>
        </div>
      </nav>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {recruitment.name}
        </h1>
        <p className="text-lg text-gray-600">
          {posts.length} open position{posts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Recruitment Details */}
      {recruitment && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-blue-600">
            Recruitment Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {recruitment.year && (
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase mb-2">
                  Year
                </p>
                <p className="text-gray-900">{recruitment.year}</p>
              </div>
            )}

            {recruitment.totalVacancies && (
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase mb-2">
                  Total Vacancies
                </p>
                <p className="text-gray-900">{recruitment.totalVacancies}</p>
              </div>
            )}

            {recruitment.status && (
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase mb-2">
                  Status
                </p>
                <p className="text-gray-900 capitalize">{recruitment.status.replace(/_/g, ' ')}</p>
              </div>
            )}

            {recruitment.notificationDate && (
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase mb-2">
                  Notification Date
                </p>
                <p className="text-gray-900">
                  {new Date(recruitment.notificationDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {recruitment.applicationStartDate && (
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase mb-2">
                  Application Start Date
                </p>
                <p className="text-gray-900">
                  {new Date(recruitment.applicationStartDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {recruitment.applicationEndDate && (
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase mb-2">
                  Application End Date
                </p>
                <p className="text-gray-900 font-semibold text-orange-600">
                  {new Date(recruitment.applicationEndDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {recruitment.description && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-600 uppercase mb-4">
                Description
              </p>
              <p className="text-gray-700 leading-relaxed">{recruitment.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Open Positions */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Open Positions ({posts.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {posts.map((post) => (
            <div key={post.id} className="p-8 hover:bg-blue-50 transition-colors">
              <Link
                href={`/jobs/${recruitmentSlug}/${post.slug}`}
                className="block"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-blue-600 hover:text-blue-700 mb-2">
                      {post.title}
                    </h3>
                    {post.position && (
                      <p className="text-gray-600 mb-4">
                        Position: {post.position.name}
                      </p>
                    )}
                    {post.eligibilities && post.eligibilities.length > 0 && (
                      <p className="text-sm text-gray-500">
                        {post.eligibilities.length} eligibility criteria
                      </p>
                    )}
                  </div>
                  {post.vacancies && post.vacancies.length > 0 && (
                    <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold whitespace-nowrap">
                      {post.vacancies.reduce((sum, v) => sum + (v.count || 0), 0)} vacancy{post.vacancies.reduce((sum, v) => sum + (v.count || 0), 0) !== 1 ? 'ies' : ''}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6 text-sm text-gray-600 border border-gray-200">
        <p>
          <strong>About This Recruitment:</strong> This recruitment hub shows all
          open positions for the current cycle. For detailed information about
          each position, including eligibility criteria, salary, application
          process, and important dates, click on the position title above.
        </p>
      </div>
    </div>
  );
}
