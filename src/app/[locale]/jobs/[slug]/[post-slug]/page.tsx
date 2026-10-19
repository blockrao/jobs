/**
 * Post Detail Page - Minimalist Architecture
 *
 * Single query, simple rendering, strong SEO.
 * - Metadata: OG tags, canonical, geo tags
 * - Schema: JobPosting + BreadcrumbList only
 * - Rendering: Post data + enrichment fields, no client components
 * - ISR: 1 day (posts stable)
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { checkSlugRedirect } from "@/lib/slug-redirects";

export const revalidate = 86400; // 1 day - posts are stable

import { entitySeo } from "@/lib/seo";
import { getPostBySlugCached } from "@/db/operations/get-posts";
import PostLeafStructuredData from "@/components/job-posting/structured-data/post-leaf-schema";

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
    "post-slug": string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug: recruitmentSlug, "post-slug": postSlug } = await params;

  const post = await getPostBySlugCached(recruitmentSlug, postSlug);

  if (!post) {
    return {
      title: "Job Posting Not Found",
      robots: { index: false, follow: true },
    };
  }

  const title = `${post.title} - JobOye`;
  const description = post.description || `Apply for ${post.title} at JobOye`;
  const canonicalUrl = `/jobs/${post.recruitmentSlug}/${post.slug}`;

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

export default async function LocaleJobPostingPage({ params }: Props) {
  const { locale, slug: recruitmentSlug, "post-slug": postSlug } = await params;

  const post = await getPostBySlugCached(recruitmentSlug, postSlug);

  if (!post) {
    notFound();
  }

  // Minimal HTML render - no client components, no complex logic
  const enrichment = post.enrichment;
  const salaryMin = enrichment?.salaryMin ?? post.legacySalaryMin;
  const salaryMax = enrichment?.salaryMax ?? post.legacySalaryMax;
  const applicationDeadline = enrichment?.applicationClosingDate;
  const vacancies = enrichment?.vacanciesTotal ?? post.vacancyTotal ?? 0;

  const deadline = applicationDeadline ? {
    date: applicationDeadline,
    state: new Date() > new Date(applicationDeadline) ? ("CLOSED" as const) : ("OPEN" as const),
  } : {
    date: null,
    state: "UNKNOWN" as const,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* JobPosting Schema */}
      {locale !== "hi" && (
        <PostLeafStructuredData
          post={{
            id: post.id,
            title: post.title,
            slug: post.slug,
            description: post.description ?? null,
            organizationName: post.organizationName ?? null,
            recruitmentSlug: post.recruitmentSlug,
            recruitmentName: post.recruitmentName ?? null,
            employmentType: post.employmentType ?? null,
            locationCity: post.locationCity ?? null,
            locationState: post.locationState ?? null,
            notificationPublicationDate: post.notificationPublicationDate ?? null,
            postedAt: post.postedAt ?? null,
            updatedAt: post.updatedAt ?? null,
            vacancyNumber: post.fjaExtract?.advertisementNumber ?? null,
            officialSourceUrl: post.officialSourceUrl ?? null,
            qualificationText:
              post.fjaExtract?.eligibilityRaw ??
              post.fjaExtract?.qualificationRaw ??
              null,
            experienceText: post.fjaExtract?.experienceRaw ?? null,
          }}
          resolvedVacancy={vacancies}
          resolvedSalary={salaryMin ? { min: salaryMin, max: salaryMax ?? salaryMin, currency: "INR", period: "yearly" } : null}
          resolvedDeadline={deadline}
        />
      )}

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{post.title}</h1>
        <p className="text-gray-600">
          {post.organizationName && `${post.organizationName} • `}
          {post.locationState && `${post.locationState}`}
        </p>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          {post.description && (
            <section>
              <h2 className="text-2xl font-bold mb-4">About This Position</h2>
              <div className="prose prose-sm max-w-none">
                {post.description}
              </div>
            </section>
          )}

          {/* Qualification */}
          {post.fjaExtract?.qualificationRaw && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Qualifications</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {post.fjaExtract.qualificationRaw}
              </p>
            </section>
          )}

          {/* Experience */}
          {post.fjaExtract?.experienceRaw && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Experience Required</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {post.fjaExtract.experienceRaw}
              </p>
            </section>
          )}
        </div>

        {/* Right Column - Quick Facts */}
        <aside className="bg-gray-50 p-6 rounded-lg h-fit">
          <h3 className="text-lg font-bold mb-4">Quick Facts</h3>
          <dl className="space-y-4 text-sm">
            {vacancies > 0 && (
              <div>
                <dt className="font-semibold text-gray-700">Vacancies</dt>
                <dd className="text-gray-900">{vacancies}</dd>
              </div>
            )}
            {post.locationState && (
              <div>
                <dt className="font-semibold text-gray-700">Location</dt>
                <dd className="text-gray-900">{post.locationState}</dd>
              </div>
            )}
            {salaryMin && (
              <div>
                <dt className="font-semibold text-gray-700">Salary</dt>
                <dd className="text-gray-900">
                  ₹{salaryMin.toLocaleString()} - ₹{(salaryMax ?? salaryMin).toLocaleString()}
                </dd>
              </div>
            )}
            {applicationDeadline && (
              <div>
                <dt className="font-semibold text-gray-700">Apply By</dt>
                <dd className="text-gray-900">
                  {new Date(applicationDeadline).toLocaleDateString("en-IN")}
                </dd>
              </div>
            )}
            {post.officialSourceUrl && (
              <div className="pt-4">
                <a
                  href={post.officialSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
                >
                  Apply Now
                </a>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
}
