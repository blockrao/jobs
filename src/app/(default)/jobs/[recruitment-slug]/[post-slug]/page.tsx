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
import { isUnverifiedAggregatorSource } from "@/lib/source-verification";

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
  const unverifiedAggregator = isUnverifiedAggregatorSource(
    post.recruitmentSourceDiscoveryOrigin,
    post.recruitmentVerificationStatus,
    post.recruitmentMetadata,
  );
  const enrichment = unverifiedAggregator ? null : post.enrichment;
  const vacancies = unverifiedAggregator ? 0 : (resolvePostVacancy(post) ?? 0);
  const salaryMin = unverifiedAggregator ? null : (enrichment?.salaryMin ?? post.legacySalaryMin ?? null);
  const salaryMax = unverifiedAggregator ? null : (enrichment?.salaryMax ?? post.legacySalaryMax ?? null);
  const deadlineRaw = unverifiedAggregator ? null : (post.recruitmentApplicationEndDate ?? enrichment?.applicationClosingDate ?? null);
  const deadline = deadlineRaw ? new Date(deadlineRaw) : null;
  const closed = deadline ? Date.now() > deadline.getTime() : false;
  const qualification = unverifiedAggregator ? null : (post.fjaExtract?.qualificationRaw ?? null);

  const titleParts = [post.title];
  if (post.organizationName) titleParts.push(`– ${post.organizationName}${post.recruitmentName ? ` ${post.recruitmentName}` : ""}`);
  else if (post.recruitmentName) titleParts.push(`– ${post.recruitmentName}`);
  if (vacancies > 0) titleParts.push(`(${vacancies.toLocaleString("en-IN")} ${vacancies === 1 ? "Post" : "Posts"})`);
  if (deadline && !closed) titleParts.push(`– Apply by ${formatDate(deadline)}`);
  const title = titleParts.join(" ");

  const bits: string[] = [];
  if (post.organizationName) bits.push(`${post.organizationName} recruitment for ${post.title}`);
  else bits.push(`${post.title} recruitment`);
  if (vacancies > 0) bits.push(`${vacancies.toLocaleString("en-IN")} ${vacancies === 1 ? "vacancy" : "vacancies"}`);
  if (qualification && qualification.length <= 60) bits.push(`qualification ${qualification}`);
  if (salaryMin) bits.push(`pay ₹${formatCurrency(salaryMin)}${salaryMax && salaryMax !== salaryMin ? `–₹${formatCurrency(salaryMax)}` : ""} per month`);
  if (deadline) bits.push(closed ? `applications closed on ${formatDate(deadline)}` : `last date ${formatDate(deadline)}`);
  const storedDescription = !unverifiedAggregator && typeof post.description === "string" ? post.description.trim() : "";
  const fallbackDescription = unverifiedAggregator
    ? "Recruitment details are being checked against the issuing authority. Eligibility, fees and application details will be published after verification."
    : `${bits.join(", ")}. See the official notification for eligibility, age limit, fee, selection process and how to apply.`;
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

  const unverifiedAggregator = isUnverifiedAggregatorSource(
    post.recruitmentSourceDiscoveryOrigin,
    post.recruitmentVerificationStatus,
    post.recruitmentMetadata,
  );
  const { title, description } = composeLeafSeo(post);

  return {
    title,
    description,
    alternates: generateAlternates(post.recruitmentSlug, post.slug),
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
    ...pageSeo(`/jobs/${post.recruitmentSlug}/${post.slug}`, {
      index: !unverifiedAggregator && !isUnresolvedOrganization(post.organizationName) && !isUnresolvedOrganization(post.organizationSlug),
    }),
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

  const unverifiedAggregator = isUnverifiedAggregatorSource(
    post.recruitmentSourceDiscoveryOrigin,
    post.recruitmentVerificationStatus,
    post.recruitmentMetadata,
  );

  // Lifecycle and fact resolvers must not treat aggregator-derived dates or
  // statuses as authoritative while issuer-source verification is outstanding.
  const lifecycle = unverifiedAggregator ||
    (post.recruitmentSourceDiscoveryOrigin === "AGGREGATOR_DISCOVERED" && !post.recruitmentApplicationEndDate)
    ? undefined
    : deriveLifecycle(
        post.postingStatus,
        post.recruitmentApplicationEndDate ?? post.enrichment?.applicationClosingDate ?? null,
      );

  // Normalize only facts that are eligible for public display.
  const enrichment = unverifiedAggregator ? null : post.enrichment;
  const salaryMin = unverifiedAggregator ? null : (enrichment?.salaryMin ?? post.legacySalaryMin ?? null);
  const salaryMax = unverifiedAggregator ? null : (enrichment?.salaryMax ?? post.legacySalaryMax ?? null);
  const vacancies = unverifiedAggregator ? 0 : (resolvePostVacancy(post) ?? 0);

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
        description: unverifiedAggregator
          ? "Recruitment details are being checked against the issuing authority. Eligibility, fees and application details will be published after verification."
          : post.description,
        organizationName: post.organizationName,
        organizationType: post.organizationSector,
        organizationWebsite,
        locationCity: unverifiedAggregator ? null : post.locationCity,
        locationState: unverifiedAggregator ? null : post.locationState,
        recruitmentSlug: post.recruitmentSlug,
        recruitmentName: post.recruitmentName,
        slug: post.slug,
        postedAt: post.recruitmentSourceDiscoveryOrigin === "AGGREGATOR_DISCOVERED" ? null : post.postedAt,
        updatedAt: post.updatedAt,
        notificationPublicationDate: unverifiedAggregator ? null : post.notificationPublicationDate,
        officialSourceUrl: unverifiedAggregator ? null : post.officialSourceUrl,
        officialLinkSource: post.recruitmentOfficialLinkSource ?? null,
        applyUrl: unverifiedAggregator ? null : (post.applyPortalUrl || post.recruitmentOfficialApplicationUrl),
        employmentType: unverifiedAggregator ? null : (post.employmentType ?? null),
        qualificationText: unverifiedAggregator ? null : (
          post.fjaExtract?.qualificationRaw || post.fjaExtract?.eligibilityRaw
        ),
        experienceText: unverifiedAggregator ? null : post.fjaExtract?.experienceRaw,
        ageLimit: unverifiedAggregator ? null : post.fjaExtract?.ageLimitRaw,
        selectionProcess: unverifiedAggregator ? undefined : (post.recruitmentSelectionProcess || (Array.isArray(enrichment?.selectionProcess) ? enrichment.selectionProcess.map((s: any) => s.name).join("; ") : undefined)),
        howToApply: unverifiedAggregator ? undefined : post.applicationMethod,
        applicationFee: undefined,
        salary: unverifiedAggregator ? { min: null, max: null } : {
          min: salaryMin,
          max: salaryMax,
        },
        vacancies: unverifiedAggregator ? null : vacancies,
        applicationDeadline: unverifiedAggregator ? null : (enrichment?.applicationClosingDate || post.recruitmentApplicationEndDate),
        fjaExtract: unverifiedAggregator ? undefined : {
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
        educationRequirements: !unverifiedAggregator && Array.isArray(enrichment?.education) ? enrichment.education.map((e: any) => ({
          degree: e.degree,
          subject: e.subject,
          specialization: e.specialization,
          minimumPercentage: e.minimumPercentage,
          minimumMarks: e.minimumMarks,
          confidenceScore: e.confidenceScore,
        })) : [],
        experienceRequirements: !unverifiedAggregator && Array.isArray(enrichment?.experience) ? enrichment.experience.map((e: any) => ({
          totalYears: e.totalYears,
          minYears: e.minYears,
          type: e.experienceType,
          confidenceScore: e.confidenceScore,
        })) : [],
        selectionProcessStages: !unverifiedAggregator && Array.isArray(enrichment?.selectionProcessStages) ? enrichment.selectionProcessStages.map((s: any) => ({
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
        requiredDocuments: !unverifiedAggregator && Array.isArray(enrichment?.requiredDocuments) ? enrichment.requiredDocuments.map((d: any) => ({
          name: d.name,
          category: d.category ?? "",
          isRequired: d.required,
        })) : [],
        importantDates: !unverifiedAggregator && Array.isArray(enrichment?.importantDates) ? enrichment.importantDates
          .filter((d: any) => d.date || d.dateStr)
          .map((d: any) => ({
            type: d.label,
            date: d.date instanceof Date ? d.date.toISOString() : (d.dateStr || d.date),
          })) : [],
        ageRules: !unverifiedAggregator && Array.isArray(enrichment?.ageRules) ? enrichment.ageRules.map((a: any) => ({
          category: a.category,
          maxAge: a.max,
          relaxationYears: a.relaxationYears,
          ruleType: a.ruleType,
          note: a.note,
        })) : [],
        applicationFees: !unverifiedAggregator && Array.isArray(enrichment?.applicationFees) ? enrichment.applicationFees.map((f: any) => ({
          amount: f.amount || null,
          currency: f.currency || "INR",
          waivedFor: f.waivedFor,
          paymentMethods: f.paymentMethods,
          note: f.note,
          isExempted: f.isExempted,
          exemptionCategory: f.exemptionCategory,
        })) : [],
        officialLinks: !unverifiedAggregator && Array.isArray(enrichment?.officialLinks) ? enrichment.officialLinks.map((l: any) => ({
          type: l.type,
          url: l.url,
          title: l.title,
          source: l.source,
        })) : [],
      }}
      relatedByOrg={unverifiedAggregator ? [] : relatedPosts.byOrganization.map((p) => ({
        title: p.title,
        slug: p.slug,
        recruitment_slug: p.recruitment_slug,
      }))}
      relatedByLocation={unverifiedAggregator ? [] : relatedPosts.byLocation.map((p) => ({
        title: p.title,
        slug: p.slug,
        recruitment_slug: p.recruitment_slug,
      }))}
      relatedByRole={unverifiedAggregator ? [] : relatedPosts.byRole.map((p) => ({
        title: p.title,
        slug: p.slug,
        recruitment_slug: p.recruitment_slug,
      }))}
      pillarSlug={pillarSlug}
      canonicalUrl={canonicalUrl}
      pageTitle={seo.title}
      pageDescription={seo.description}
      lifecycle={lifecycle}
      indexable={!unverifiedAggregator && !isUnresolvedOrganization(post.organizationName) && !isUnresolvedOrganization(post.organizationSlug)}
    />
  );
}
