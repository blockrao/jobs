/**
 * Locale-aware Job Posting Page
 * Supports /jobs/... (English) and /hi/jobs/... (Hindi)
 * Routes through the same data layer as (default) route but with locale context
 */

import { Metadata } from "next";
import { getPostBySlug } from "@/db/operations/get-posts";
import JobPostingPage from "@/components/job-posting/job-posting-page";
import JobPostingStructuredData from "@/components/job-posting/structured-data/job-posting-schema";

interface Props {
  params: Promise<{
    locale: string;
    "recruitment-slug": string;
    "post-slug": string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, "recruitment-slug": recruitmentSlug, "post-slug": postSlug } = await params;

  const post = await getPostBySlug(recruitmentSlug, postSlug);

  if (!post) {
    return {
      title: "Job Posting Not Found",
    };
  }

  const title = post.title;
  const description =
    post.description?.substring(0, 160) ||
    `Apply for ${post.title} at ${post.organizationName}`;

  return {
    title: `${title} - JobOye`,
    description,
    openGraph: {
      title: `${title} | ${post.organizationName}`,
      description,
      type: "website",
      locale: locale === "hi" ? "hi_IN" : "en_US",
    },
    alternates: {
      languages: {
        en: `/jobs/${recruitmentSlug}/${postSlug}`,
        hi: `/hi/jobs/${recruitmentSlug}/${postSlug}`,
      },
    },
  };
}

export default async function LocaleJobPostingPage({ params }: Props) {
  const { locale, "recruitment-slug": recruitmentSlug, "post-slug": postSlug } = await params;

  const post = await getPostBySlug(recruitmentSlug, postSlug);

  if (!post) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <h1>{locale === "hi" ? "नौकरी नहीं मिली" : "Job Not Found"}</h1>
        <p>
          {locale === "hi"
            ? "क्षमा करें, यह नौकरी पोस्टिंग खोजी नहीं जा सकी।"
            : "Sorry, this job posting could not be found."}
        </p>
      </div>
    );
  }

  return (
    <>
      <JobPostingStructuredData post={post} />
      <JobPostingPage post={post} locale={locale} />
    </>
  );
}
