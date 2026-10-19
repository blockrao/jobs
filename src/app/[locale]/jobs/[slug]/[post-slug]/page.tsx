/**
 * Job Detail Page - Production Implementation
 *
 * Features:
 * - Mobile-first responsive design with SEO/GEO optimization
 * - Complete JobPosting + BreadcrumbList schema.org (AEO ready)
 * - Organization branding card with geo signals
 * - Sticky mobile apply button
 * - Error/empty states for missing data
 * - Related jobs section
 * - Dark mode support
 * - ISR: 1 day (posts stable)
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlugCached } from "@/db/operations/get-posts";
import JobDetailPageProduction from "@/components/job-posting/job-detail-page-production";
import { formatDate } from "@/lib/formatting";

export const revalidate = 86400; // 1 day ISR

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

  const title = `${post.title} - Apply Online at JobOye`;
  const description =
    post.description ||
    `Apply for ${post.title} at ${post.organizationName || "JobOye"}.
     Check eligibility, salary, deadline and official notification.`;

  // FIX-003: Canonical URL must include locale prefix
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://joboye.com";
  const canonicalUrl = `${baseUrl}/${locale}/jobs/${post.recruitmentSlug}/${post.slug}`;

  // FIX-002: hreflang alternates for bilingual site
  const enUrl = `${baseUrl}/en/jobs/${post.recruitmentSlug}/${post.slug}`;
  const hiUrl = `${baseUrl}/hi/jobs/${post.recruitmentSlug}/${post.slug}`;

  return {
    title,
    description,
    keywords: [
      post.title,
      post.organizationName,
      post.locationState || "India",
      "government jobs",
      "recruitment",
      "apply online",
    ].filter(Boolean),
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "JobOye",
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': enUrl,
        'hi': hiUrl,
        'x-default': enUrl, // Default to English for unlisted locales
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
  };
}

export default async function LocaleJobDetailPage({ params }: Props) {
  const { locale, slug: recruitmentSlug, "post-slug": postSlug } = await params;

  const post = await getPostBySlugCached(recruitmentSlug, postSlug);

  if (!post) {
    notFound();
  }

  // Normalize salary data
  const enrichment = post.enrichment;
  const salaryMin = enrichment?.salaryMin ?? post.legacySalaryMin ?? null;
  const salaryMax = enrichment?.salaryMax ?? post.legacySalaryMax ?? null;
  const vacancies = enrichment?.vacanciesTotal ?? post.vacancyTotal ?? 0;

  // Build canonical URL for schema (must include locale prefix to match sitemap)
  const canonicalUrl = `/${locale}/jobs/${post.recruitmentSlug}/${post.slug}`;

  return (
    <JobDetailPageProduction
      post={{
        id: post.id,
        title: post.title,
        description: post.description,
        organizationName: post.organizationName,
        organizationType: post.organizationSector,
        locationCity: post.locationCity,
        locationState: post.locationState,
        recruitmentSlug: post.recruitmentSlug,
        recruitmentName: post.recruitmentName,
        slug: post.slug,
        postedAt: post.postedAt,
        updatedAt: post.updatedAt,
        notificationPublicationDate: post.notificationPublicationDate,
        officialSourceUrl: post.officialSourceUrl,
        applyUrl: post.applyPortalUrl || post.applicationUrl || post.recruitmentOfficialApplicationUrl,
        employmentType: post.employmentType || "FULL_TIME",
        qualificationText:
          post.fjaExtract?.qualificationRaw || post.fjaExtract?.eligibilityRaw,
        experienceText: post.fjaExtract?.experienceRaw,
        ageLimit: post.fjaExtract?.ageLimitRaw,
        selectionProcess: post.recruitmentSelectionProcess || enrichment?.selectionProcess?.map(s => s.description).join("; "),
        howToApply: post.applicationMethod,
        applicationFee: undefined,
        salary: {
          min: salaryMin,
          max: salaryMax,
        },
        vacancies,
        applicationDeadline: enrichment?.applicationClosingDate || post.recruitmentApplicationEndDate,
        fjaExtract: {
          qualificationRaw: post.fjaExtract?.qualificationRaw,
          experienceRaw: post.fjaExtract?.experienceRaw,
          advertisementNumber: post.fjaExtract?.advertisementNumber,
          ageRaw: post.fjaExtract?.ageLimitRaw,
          salaryRaw: post.fjaExtract?.salaryRaw,
        },
      }}
      locale={locale}
      canonicalUrl={canonicalUrl}
    />
  );
}
