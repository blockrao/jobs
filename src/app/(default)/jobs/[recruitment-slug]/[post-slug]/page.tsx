/**
 * Dynamic Job Posting Page Route
 * Renders individual job posting with enriched data and recruitment context
 * Route: /jobs/[recruitment-slug]/[post-slug]
 */

import { notFound } from "next/navigation";
import { Metadata } from "next";
import JobPostingPage from "@/components/job-posting/job-posting-page";
import { getPostBySlug } from "@/db/operations/get-posts";
import { getRecruitmentWithPosts } from "@/db/operations/get-recruitments";
import { absoluteUrl } from "@/lib/site";

interface JobPostingPageRouteProps {
  params: Promise<{
    "recruitment-slug": string;
    "post-slug": string;
  }>;
}

export async function generateMetadata({
  params,
}: JobPostingPageRouteProps): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getPostBySlug(
    resolvedParams["recruitment-slug"],
    resolvedParams["post-slug"]
  );

  if (!post) {
    return {
      title: "Job Posting Not Found",
      description: "The requested job posting could not be found",
    };
  }

  return {
    title: `${post.title} - ${post.organizationName} | JobOye`,
    description:
      post.description ||
      `${post.title} vacancy at ${post.organizationName}. Total vacancies: ${post.enrichment?.vacanciesTotal || "N/A"}. Apply now on JobOye.`,
    alternates: {
      canonical: absoluteUrl(`/jobs/${post.recruitmentSlug}/${post.slug}`),
    },
    openGraph: {
      title: post.title,
      description:
        post.description ||
        `${post.title} at ${post.organizationName}`,
      type: "website",
      url: absoluteUrl(`/jobs/${post.recruitmentSlug}/${post.slug}`),
    },
  };
}

export default async function Page({ params }: JobPostingPageRouteProps) {
  const resolvedParams = await params;
  const recruitmentSlug = resolvedParams["recruitment-slug"];
  const postSlug = resolvedParams["post-slug"];

  // Fetch post with enrichment data
  const post = await getPostBySlug(recruitmentSlug, postSlug);

  if (!post) {
    notFound();
  }

  // Fetch recruitment data with all posts for context
  const recruitmentData = await getRecruitmentWithPosts(recruitmentSlug);

  return (
    <JobPostingPage
      post={post}
      recruitment={recruitmentData}
      isSingleJobRecruitment={recruitmentData?.isSingleJobRecruitment}
    />
  );
}
