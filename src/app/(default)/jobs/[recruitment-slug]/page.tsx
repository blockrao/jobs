/**
 * Recruitment Hub Page
 * Route: /jobs/[recruitment-slug]
 *
 * Displays recruitment details and lists all associated job postings.
 * For single-job recruitments, displays the job details directly.
 */

import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import RecruitmentHub from "@/components/recruitment/recruitment-hub";
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

  // For multi-post recruitments, display the modern recruitment hub
  return <RecruitmentHub recruitment={recruitment} posts={posts} />;
}
