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
 * PHASE 2: Removed locale prefix. Canonical URL structure: /jobs/{recruitment-slug}/{post-slug}
 */

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPostBySlugCached } from "@/db/operations/get-posts";
import { getRelatedPostsGrouped } from "@/db/operations/get-related-posts";
import JobDetailPageProduction from "@/components/job-posting/job-detail-page-production";
import { formatDate, formatCurrency } from "@/lib/formatting";
import { deriveLifecycle } from "@/lib/lifecycle";

export const revalidate = 86400; // 1 day ISR

interface Props {
  params: Promise<{
    "recruitment-slug": string;
    "post-slug": string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "recruitment-slug": recruitmentSlug, "post-slug": postSlug } = await params;

  const post = await getPostBySlugCached(recruitmentSlug, postSlug);

  if (!post) {
    return {
      title: "Job Posting Not Found",
      robots: { index: false, follow: true },
    };
  }

  // SEO-optimized title: include location and salary for SERP visibility
  const location = post.locationState || post.locationCity || "India";
  const salaryMin = post.enrichment?.salaryMin ?? post.legacySalaryMin;
  const salaryMax = post.enrichment?.salaryMax ?? post.legacySalaryMax;
  const salaryInfo = salaryMin
    ? `: ₹${formatCurrency(salaryMin)}${salaryMax ? `–₹${formatCurrency(salaryMax)}` : ""}`
    : "";
  const title = `${post.title} (${location})${salaryInfo}`;

  // SEO-optimized description: use vacancy, deadline, and salary when available
  let description = post.description;
  if (!description) {
    const vacancies = post.enrichment?.vacanciesTotal ?? post.vacancyTotal ?? 0;
    const vacancyText = vacancies > 0 ? `${vacancies} positions` : "multiple positions";

    const applicationDeadline = post.recruitmentApplicationEndDate ?? post.enrichment?.applicationClosingDate;
    let daysText = "apply now";
    if (applicationDeadline) {
      const daysLeft = Math.ceil(
        (new Date(applicationDeadline).getTime() - new Date().getTime()) / 86_400_000
      );
      if (daysLeft > 0) {
        daysText = `apply in ${daysLeft} days`;
      } else if (daysLeft === 0) {
        daysText = "apply today";
      } else {
        daysText = "applications closed";
      }
    }

    const salaryText = salaryMin
      ? `Salary ₹${formatCurrency(salaryMin)}${salaryMax ? `–₹${formatCurrency(salaryMax)}` : ""}`
      : "Check salary details";

    description = `${post.title}: ${vacancyText}, ${daysText}. ${salaryText}.`;
  }

  // PHASE 2: Canonical URL without locale prefix
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://joboye.com";
  const canonicalUrl = `${baseUrl}/jobs/${post.recruitmentSlug}/${post.slug}`;

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

export default async function JobDetailPage({ params }: Props) {
  const { "recruitment-slug": recruitmentSlug, "post-slug": postSlug } = await params;

  const post = await getPostBySlugCached(recruitmentSlug, postSlug);

  if (!post) {
    notFound();
  }

  // A legacy recruitment slug resolves (via recruitment_slug_redirects) but is
  // not canonical: 301 to the canonical leaf instead of serving a duplicate.
  if (post.recruitmentSlug && post.recruitmentSlug !== recruitmentSlug) {
    permanentRedirect(`/jobs/${post.recruitmentSlug}/${post.slug}`);
  }

  // Lifecycle from the canonical recruitment: status + verified deadline.
  const lifecycle = deriveLifecycle(
    post.postingStatus,
    post.recruitmentApplicationEndDate ?? post.enrichment?.applicationClosingDate ?? null,
  );

  // Normalize salary data
  const enrichment = post.enrichment;
  const salaryMin = enrichment?.salaryMin ?? post.legacySalaryMin ?? null;
  const salaryMax = enrichment?.salaryMax ?? post.legacySalaryMax ?? null;
  const vacancies = enrichment?.vacanciesTotal ?? post.vacancyTotal ?? 0;

  // Fetch related posts (semantically grouped)
  const relatedPosts = await getRelatedPostsGrouped(
    String(post.recruitmentId),
    post.slug,
    post.title,
    post.organizationId ? String(post.organizationId) : undefined,
    post.locationState ?? undefined,
    3
  );

  // Build canonical URL for schema
  const canonicalUrl = `/jobs/${post.recruitmentSlug}/${post.slug}`;

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
        employmentType: post.employmentType ?? null,
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
          total: v.count,
          location: v.location,
          locationCount: v.locationCount,
          categoryCount: v.categoryCount,
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
          amount: f.amount || null,
          currency: f.currency || "INR",
          waivedFor: f.waivedFor,
          paymentMethods: f.paymentMethods,
          note: f.note,
          isExempted: f.isExempted,
          exemptionCategory: f.exemptionCategory,
        })) : [],
        officialLinks: Array.isArray(enrichment?.officialLinks) ? enrichment.officialLinks.map((l: any) => ({
          type: l.type,
          url: l.url,
          title: l.title,
          source: l.source,
        })) : [],
      }}
      relatedByOrg={relatedPosts.byOrganization.map((p) => ({
        title: p.title,
        slug: p.slug,
        recruitment_slug: p.recruitment_slug,
      }))}
      relatedByLocation={relatedPosts.byLocation.map((p) => ({
        title: p.title,
        slug: p.slug,
        recruitment_slug: p.recruitment_slug,
      }))}
      relatedByRole={relatedPosts.byRole.map((p) => ({
        title: p.title,
        slug: p.slug,
        recruitment_slug: p.recruitment_slug,
      }))}
      canonicalUrl={canonicalUrl}
      lifecycle={lifecycle}
    />
  );
}
