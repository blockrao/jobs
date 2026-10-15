/**
 * Locale-aware Post Leaf route.
 * English is indexable; Hindi remains an English-content fallback until
 * verified Post translations are part of the canonical Post read contract.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 300;
import { entitySeo } from "@/lib/seo";
import { getPostBySlugCached } from "@/db/operations/get-posts";
import { getRecruitmentWithPosts } from "@/db/operations/get-recruitments";
import JobPostingPage from "@/components/job-posting/job-posting-page";
import PostLeafStructuredData from "@/components/job-posting/structured-data/post-leaf-schema";
import {
  resolvePostVacancy,
  resolveSalary,
  resolveDeadline,
  resolveRecruitmentOfficialSource,
  resolveRecruitmentApplicationUrl,
  resolveRecruitmentEmployer,
  resolveRecruitmentSelectionProcess,
} from "@/lib/resolvers/fact-resolvers";

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

  // Use the canonical relationship returned by the database, not the
  // potentially historical recruitment slug from the incoming URL.
  const canonicalSlug = post.recruitmentSlug + "/" + post.slug;
  const seo = entitySeo({
    base: "/jobs",
    slug: canonicalSlug,
    locale,
    hasHindi: false,
  });

  const title = post.title + (post.organizationName ? " - " + post.organizationName : "");
  const description = post.description?.substring(0, 160) ||
    ("Apply for " + post.title + (post.organizationName ? " at " + post.organizationName : ""));

  return {
    title,
    description,
    alternates: seo.alternates,
    // All posts are exposed to indexing. Frontend shows "reported" labels for data-confidence signaling.
    robots: seo.robots,
    openGraph: {
      title,
      description,
      type: "website",
      url: seo.url,
      locale: locale === "hi" ? "hi_IN" : "en_US",
    },
  };
}

export default async function LocaleJobPostingPage({ params }: Props) {
  const { locale, slug: recruitmentSlug, "post-slug": postSlug } = await params;
  const post = await getPostBySlugCached(recruitmentSlug, postSlug);

  if (!post) notFound();

  // All posts are exposed. Frontend shows "reported" labels for data-confidence signaling.

  const recruitmentData = await getRecruitmentWithPosts(post.recruitmentSlug);
  const now = new Date();
  const resolvedFacts = {
    vacancyCount: resolvePostVacancy(post),
    salary: resolveSalary(post),
    deadline: resolveDeadline(post, now),
  };
  const recruitmentResolvedFacts = recruitmentData?.recruitment
    ? {
        officialSource: resolveRecruitmentOfficialSource(recruitmentData.recruitment),
        applicationUrl: resolveRecruitmentApplicationUrl(recruitmentData.recruitment),
        employer: resolveRecruitmentEmployer(recruitmentData.recruitment),
        selectionProcess: resolveRecruitmentSelectionProcess(recruitmentData.recruitment),
      }
    : null;

  return (
    <>
      {/*
        SEO-001: the untranslated Hindi route is noindex, so it must not emit JobPosting JSON-LD.
        Inventory gate: when source verification is pending, suppress JobPosting schema — mirrors
        the (default) route's suppressJobPostingSchema contract. BreadcrumbList is always emitted.
      */}
      {locale !== "hi" && (
      <PostLeafStructuredData
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          description: post.description ?? null,
          organizationName: post.organizationName ?? null,
          recruitmentSlug: post.recruitmentSlug,
          recruitmentName: post.recruitmentName ?? recruitmentData?.recruitment?.name ?? null,
          employmentType: post.employmentType ?? null,
          locationCity: post.locationCity ?? null,
          locationState: post.locationState ?? null,
          notificationPublicationDate: post.notificationPublicationDate ?? null,
          postedAt: post.postedAt ?? null,
          updatedAt: post.updatedAt ?? null,
          // Official advertisement number — used as schema.org identifier; mirrors (default) route.
          vacancyNumber: post.fjaExtract?.advertisementNumber ?? null,
          officialSourceUrl: post.officialSourceUrl ?? null,
          // Phase 1 eligibility text from source inventory; mirrors (default) route.
          qualificationText:
            post.fjaExtract?.eligibilityRaw ??
            post.fjaExtract?.qualificationRaw ??
            null,
          experienceText: post.fjaExtract?.experienceRaw ?? null,
        }}
        resolvedVacancy={resolvedFacts.vacancyCount}
        resolvedSalary={resolvedFacts.salary}
        resolvedDeadline={resolvedFacts.deadline}
      />
      )}
      <JobPostingPage
        post={post}
        recruitment={recruitmentData}
        isSingleJobRecruitment={recruitmentData?.isSingleJobRecruitment}
        locale={locale}
        resolvedFacts={resolvedFacts}
        recruitmentResolvedFacts={recruitmentResolvedFacts}
      />
    </>
  );
}
