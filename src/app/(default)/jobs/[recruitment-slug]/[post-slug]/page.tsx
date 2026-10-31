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
import { pageSeo } from "@/lib/seo";
import { isUnresolvedOrganization } from "@/lib/organizations/unresolved";
import { generateAlternates } from "@/lib/hreflang";
import { getDuplicatePostRecruitmentSlug, getPostBySlugCached } from "@/db/operations/get-posts";
import { getRelatedPostsGrouped } from "@/db/operations/get-related-posts";
import JobDetailPageProduction from "@/components/job-posting/job-detail-page-production";
import { formatDate, formatCurrency } from "@/lib/formatting";
import { deriveLifecycle } from "@/lib/lifecycle";
import { resolvePostVacancy } from "@/lib/resolvers/fact-resolvers";

export const revalidate = 86400; // 1 day ISR

interface Props {
  params: Promise<{
    "recruitment-slug": string;
    "post-slug": string;
  }>;
}

/**
 * <title> and meta description composed from stored facts only, in the form
 * the audience searches: "{Post} – {Org} {Recruitment} ({N} Posts) – Apply by {date}".
 * The same strings are passed to the renderer so H1, <head> and JSON-LD agree.
 */
function composeLeafSeo(post: NonNullable<Awaited<ReturnType<typeof getPostBySlugCached>>>) {
  const enrichment = post.enrichment;
  const vacancies = resolvePostVacancy(post) ?? 0;
  const salaryMin = enrichment?.salaryMin ?? post.legacySalaryMin ?? null;
  const salaryMax = enrichment?.salaryMax ?? post.legacySalaryMax ?? null;
  const lifecycle = deriveLifecycle(post.postingStatus, post.recruitmentApplicationEndDate);
  const deadline = lifecycle.deadline;
  const applicationWindowEnded = lifecycle.state === "closed" || lifecycle.state === "results" || lifecycle.state === "archived";
  const qualification = post.fjaExtract?.qualificationRaw ?? null;

  const titleParts = [post.title];
  if (post.organizationName) titleParts.push(`– ${post.organizationName}${post.recruitmentName ? ` ${post.recruitmentName}` : ""}`);
  else if (post.recruitmentName) titleParts.push(`– ${post.recruitmentName}`);
  if (vacancies > 0) titleParts.push(`(${vacancies.toLocaleString("en-IN")} ${vacancies === 1 ? "Post" : "Posts"})`);
  if (deadline && !applicationWindowEnded) titleParts.push(`– Apply by ${formatDate(deadline)}`);
  const title = titleParts.join(" ");

  const bits: string[] = [];
  if (post.organizationName) bits.push(`${post.organizationName} recruitment for ${post.title}`);
  else bits.push(`${post.title} recruitment`);
  if (vacancies > 0) bits.push(`${vacancies.toLocaleString("en-IN")} ${vacancies === 1 ? "vacancy" : "vacancies"}`);
  if (qualification && qualification.length <= 60) bits.push(`qualification ${qualification}`);
  if (salaryMin) bits.push(`pay ₹${formatCurrency(salaryMin)}${salaryMax && salaryMax !== salaryMin ? `–₹${formatCurrency(salaryMax)}` : ""} per month`);
  if (deadline && lifecycle.state === "closed" && (lifecycle.daysLeft !== null && lifecycle.daysLeft <= 0)) bits.push(`applications closed on ${formatDate(deadline)}`);
  else if (deadline && !applicationWindowEnded) bits.push(`last date ${formatDate(deadline)}`);
  const storedDescription = typeof post.description === "string" ? post.description.trim() : "";
  const fallbackDescription = `${bits.join(", ")}. See the official notification for eligibility, age limit, fee, selection process and how to apply.`;
  const description = storedDescription || fallbackDescription;

  return { title, description };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "recruitment-slug": recruitmentSlug, "post-slug": postSlug } = await params;

  const post = await getPostBySlugCached(recruitmentSlug, postSlug);

  if (!post) {
    return {
      title: "Job Posting Not Found",
      ...pageSeo(`/jobs/${recruitmentSlug}/${postSlug}`, { index: false }),
    };
  }

  const { title, description } = composeLeafSeo(post);

  return {
    title,
    description,
    alternates: generateAlternates(post.recruitmentSlug, post.slug),
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
    ...pageSeo(`/jobs/${post.recruitmentSlug}/${post.slug}`, { index: !isUnresolvedOrganization(post.organizationName) && !isUnresolvedOrganization(post.organizationSlug) }),
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { "recruitment-slug": recruitmentSlug, "post-slug": postSlug } = await params;

  const post = await getPostBySlugCached(recruitmentSlug, postSlug);

  if (!post) {
    // Retired aggregate duplicates (for example, a legacy page combining
    // several distinct roles) must resolve to the recruitment hub, not 404
    // and not arbitrarily redirect to one of the individual role leaves.
    const duplicateHubSlug = await getDuplicatePostRecruitmentSlug(recruitmentSlug, postSlug);
    if (duplicateHubSlug) {
      permanentRedirect(`/jobs/${duplicateHubSlug}`);
    }
    notFound();
  }

  // Legacy recruitment and post slugs must 301 to the canonical leaf.
  // getPostCoreData only accepts exact, recruitment-scoped legacy post aliases.
  if (
    (post.recruitmentSlug && post.recruitmentSlug !== recruitmentSlug) ||
    post.slug !== postSlug
  ) {
    permanentRedirect(`/jobs/${post.recruitmentSlug}/${post.slug}`);
  }

  // Lifecycle from the canonical recruitment: status + verified deadline.
  const lifecycle = deriveLifecycle(
    post.postingStatus,
    post.recruitmentApplicationEndDate,
  );

  // Normalize salary data
  const enrichment = post.enrichment;
  const salaryMin = enrichment?.salaryMin ?? post.legacySalaryMin ?? null;
  const salaryMax = enrichment?.salaryMax ?? post.legacySalaryMax ?? null;
  const vacancies = resolvePostVacancy(post) ?? 0;

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
  const seo = composeLeafSeo(post);

  // Fetch pillar slug for organization (Phase 2)
  let pillarSlug: string | null = null;
  let organizationWebsite: string | null = null;
  if (post.organizationId) {
    try {
      const { getDb } = await import("@/db");
      const { eq } = await import("drizzle-orm");
      const { organizations } = await import("@/db/schema");
      const db = getDb();
      const org = await db
        .select({ pillarSlug: organizations.pillarSlug, websiteUrl: organizations.websiteUrl })
        .from(organizations)
        .where(eq(organizations.id, Number(post.organizationId)))
        .limit(1);
      pillarSlug = org.length > 0 ? org[0].pillarSlug : null;
      organizationWebsite = org.length > 0 ? org[0].websiteUrl ?? null : null;
    } catch (e) {
      // Silently fail if organisation details cannot be fetched
      pillarSlug = null;
    }
  }

  return (
    <JobDetailPageProduction
      post={{
        id: post.id,
        title: post.title,
        description: post.description,
        organizationName: post.organizationName,
        organizationType: post.organizationSector,
        organizationWebsite,
        locationCity: post.locationCity,
        locationState: post.locationState,
        recruitmentSlug: post.recruitmentSlug,
        recruitmentName: post.recruitmentName,
        slug: post.slug,
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
        applicationDeadline: lifecycle.deadline,
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
      pillarSlug={pillarSlug}
      canonicalUrl={canonicalUrl}
      pageTitle={seo.title}
      pageDescription={seo.description}
      lifecycle={lifecycle}
      indexable={!isUnresolvedOrganization(post.organizationName) && !isUnresolvedOrganization(post.organizationSlug)}
    />
  );
}
