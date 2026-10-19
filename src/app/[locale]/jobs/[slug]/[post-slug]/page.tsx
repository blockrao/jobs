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
 *
 * ISR Cache: Cleared 2026-10-20 01:42 to regenerate with enrichment data fix
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

  // SEO-friendly title: Include organization + year for better ranking
  const yearMatch = post.recruitmentName?.match(/\b(202[0-9]|20[0-9]{2})\b/);
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
  const seoTitle = post.organizationName
    ? `${post.title} - ${post.organizationName} ${year} | Apply Online`
    : `${post.title} Recruitment ${year} | JobOye`;

  const title = seoTitle;
  const description =
    post.description ||
    `Apply for ${post.title} at ${post.organizationName || "JobOye"}. ` +
    `Check eligibility, salary, age limit, deadline and official notification.`;

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
        selectionProcess: post.recruitmentSelectionProcess || (Array.isArray(enrichment?.selectionProcess) ? enrichment.selectionProcess.map((s: any) => s.name).join("; ") : undefined),
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
        // Phase 1 P0: Detail enrichment data
        vacanciesByCategory: Array.isArray(enrichment?.vacancies) ? enrichment.vacancies.map((v: any) => ({
          category: v.category,
          total: v.count || v.total_vacancies,
          location: v.location,
        })) : [],
        educationRequirements: Array.isArray(enrichment?.education) ? enrichment.education.map((e: any) => ({
          degree: e.degree,
          subject: e.subject,
          specialization: e.specialization,
          minimumPercentage: e.minimumPercentage,
          minimumMarks: e.minimumMarks,
          confidenceScore: e.confidenceScore,
        })) : [],
        experienceRequirements: Array.isArray(enrichment?.experience) ? enrichment.experience.map((e: any) => ({
          totalYears: e.totalYears,
          minYears: e.minYears,
          type: e.experienceType,
          confidenceScore: e.confidenceScore,
        })) : [],
        selectionProcessStages: Array.isArray(enrichment?.selectionProcessStages) ? enrichment.selectionProcessStages.map((s: any) => ({
          order: s.step,
          name: s.name,
          scheduledDate: s.scheduledDate,
          durationMinutes: s.durationMinutes,
          totalMarks: s.totalMarks,
          minimumMarks: s.minimumMarks,
        })) : (Array.isArray(enrichment?.selectionProcess) ? enrichment.selectionProcess.map((s: any) => ({
          order: s.step,
          name: s.name,
          scheduledDate: undefined,
          durationMinutes: undefined,
          totalMarks: s.totalMarks,
          minimumMarks: s.minQualifyingMarks,
        })) : []),
        requiredDocuments: Array.isArray(enrichment?.requiredDocuments) ? enrichment.requiredDocuments.map((d: any) => ({
          name: d.name,
          category: d.category,
          isRequired: d.required,
        })) : [],
        importantDates: Array.isArray(enrichment?.importantDates) ? enrichment.importantDates.map((d: any) => ({
          type: d.label,
          date: d.date || d.dateStr,
        })) : [],
        ageRules: Array.isArray(enrichment?.ageRules) ? enrichment.ageRules.map((a: any) => ({
          category: a.category,
          maxAge: a.max,
          relaxationYears: a.relaxationYears,
          ruleType: a.ruleType,
          note: a.note,
        })) : [],
        applicationFees: Array.isArray(enrichment?.applicationFees) ? enrichment.applicationFees.map((f: any) => ({
          amount: f.fee_amount || f.amount || null,
          currency: f.fee_currency || f.currency || "INR",
          waivedFor: f.fee_waived_for || f.waivedFor,
          paymentMethods: f.payment_methods || f.paymentMethods,
        })) : [],
        officialLinks: Array.isArray(enrichment?.officialLinks) ? enrichment.officialLinks.map((l: any) => ({
          type: l.link_type || l.type,
          url: l.link_url || l.url,
          title: l.link_title || l.title,
          source: l.source,
        })) : [],
      }}
      locale={locale}
      canonicalUrl={canonicalUrl}
    />
  );
}
