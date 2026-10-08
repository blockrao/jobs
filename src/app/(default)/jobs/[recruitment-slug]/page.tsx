/**
 * Recruitment Hub Page
 * Route: /jobs/[recruitment-slug]
 *
 * Displays recruitment details and lists all associated job postings.
 * For single-job recruitments, displays the job details directly.
 */

import { notFound } from "next/navigation";
import { Metadata } from "next";
import RecruitmentHub from "@/components/recruitment/recruitment-hub";
import RecruitmentHubStructuredData from "@/components/recruitment/structured-data/recruitment-hub-schema";
import { getRecruitmentWithPosts } from "@/db/operations/get-recruitments";
import { resolveRecruitmentVacancy, resolvePostVacancy } from "@/lib/resolvers/fact-resolvers";

export const dynamic = "force-dynamic";

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
    title: recruitment.name,
    description: `${recruitment.name} recruitment with ${totalPosts} open position${totalPosts !== 1 ? 's' : ''}. View eligibility criteria and application details.`,
    alternates: {
      canonical: `/jobs/${recruitment.slug}`,
    },
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

  const { recruitment, posts, totalPosts, isSingleJobRecruitment } = recruitmentData;

  // Resolve canonical vacancy counts via the single resolver layer (Gate 4D).
  // The Hub must not read old relational vacancies table (always empty for most posts).
  const resolvedRecruitmentVacancies = resolveRecruitmentVacancy({
    totalVacancies: recruitment.totalVacancies ?? null,
  });

  // Annotate each post with its resolved vacancy count so the Hub
  // does not independently select database columns.
  const postsWithResolvedVacancies = posts.map((post: any) => ({
    ...post,
    resolvedVacancyCount: resolvePostVacancy({
      id: String(post.id),
      vacancyTotal: post.vacancyTotal ?? null,
      recruitmentVacancyTotal: recruitment.totalVacancies ?? null,
      // Hub ORM posts don't carry enrichment; enrichment is undefined here.
      // resolvePostVacancy will fall through to the reconciled legacy path.
    } as any),
  }));

  // Display the modern recruitment hub for all recruitments
  // This provides a comprehensive interface for both single and multi-post recruitments
  return (
    <>
      <RecruitmentHubStructuredData
        recruitment={recruitment}
        totalPosts={totalPosts}
      />
      <RecruitmentHub
        recruitment={recruitment}
        posts={postsWithResolvedVacancies}
        resolvedTotalVacancies={resolvedRecruitmentVacancies}
      />
    </>
  );
}
