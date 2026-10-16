/**
 * Locale-aware Post Leaf route with Enterprise SEO/GEO/AEO Schema
 *
 * Renders 7 structured data schemas for maximum search engine visibility:
 * 1. Meta Tags (OG, Twitter, hreflang, geo)
 * 2. FAQ Page (AEO optimization)
 * 3. Organization (employer branding)
 * 4. Local Business (geo-targeting)
 * 5. Web Page (freshness signals)
 * 6. Event (application timeline)
 * 7. Aggregate Offer (salary indexing)
 *
 * English is indexable; Hindi remains an English-content fallback until
 * verified Post translations are part of the canonical Post read contract.
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { checkSlugRedirect } from "@/lib/slug-redirects";

export const revalidate = 300;
import { entitySeo } from "@/lib/seo";
import { getPostBySlugCached } from "@/db/operations/get-posts";
import { getRecruitmentWithPosts } from "@/db/operations/get-recruitments";
import JobPostingPage from "@/components/job-posting/job-posting-page";
import JobPostingPageClient from "@/components/job-posting/job-posting-page-client";
import PostLeafStructuredData from "@/components/job-posting/structured-data/post-leaf-schema";

// ===== NEW: Enterprise schema components =====
import { generateMetaTags } from "@/components/job-posting/structured-data/meta-tags-generator";
import FAQPageSchema from "@/components/job-posting/structured-data/faq-page-schema";
import OrganizationSchema from "@/components/job-posting/structured-data/organization-schema";
import LocalBusinessSchema from "@/components/job-posting/structured-data/local-business-schema";
import WebPageSchema from "@/components/job-posting/structured-data/web-page-schema";
import EventSchema from "@/components/job-posting/structured-data/event-schema";
import AggregateOfferSchema from "@/components/job-posting/structured-data/aggregate-offer-schema";

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

  // Check for slug redirects and redirect if needed
  const newRecruitmentSlug = await checkSlugRedirect(recruitmentSlug, "recruitment");
  const newPostSlug = await checkSlugRedirect(postSlug, "post");

  if (newRecruitmentSlug || newPostSlug) {
    const redirectUrl = `/jobs/${newRecruitmentSlug || recruitmentSlug}/${newPostSlug || postSlug}`;
    // Note: can't actually redirect in generateMetadata, but the page function will handle it
  }

  const post = await getPostBySlugCached(recruitmentSlug, postSlug);

  if (!post) {
    return {
      title: "Job Posting Not Found",
      robots: { index: false, follow: true },
    };
  }

  // ===== NEW: Use enterprise meta-tags-generator for full SEO/GEO/AEO compliance =====
  const enterpriseMetadata = generateMetaTags({ post, locale });

  // Merge with existing alternates from entitySeo (maintains backward compatibility)
  const canonicalSlug = post.recruitmentSlug + "/" + post.slug;
  const seo = entitySeo({
    base: "/jobs",
    slug: canonicalSlug,
    locale,
    hasHindi: false,
  });

  return {
    ...enterpriseMetadata,
    // Merge alternates: use enterprise version but preserve seo.robots if different
    alternates: {
      ...enterpriseMetadata.alternates,
      canonical: enterpriseMetadata.alternates?.canonical,
    },
    robots: seo.robots,
  };
}

export default async function LocaleJobPostingPage({ params }: Props) {
  const { locale, slug: recruitmentSlug, "post-slug": postSlug } = await params;

  // Check for slug redirects (malformed slugs that have been cleaned)
  const newRecruitmentSlug = await checkSlugRedirect(recruitmentSlug, "recruitment");
  const newPostSlug = await checkSlugRedirect(postSlug, "post");

  if (newRecruitmentSlug || newPostSlug) {
    const localePrefix = locale === "hi" ? "/hi" : "";
    const redirectUrl = `${localePrefix}/jobs/${newRecruitmentSlug || recruitmentSlug}/${newPostSlug || postSlug}`;
    redirect(redirectUrl);
  }

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

        NEW: Enterprise schema components (FAQPage, Organization, LocalBusiness, WebPage, Event, AggregateOffer)
        are emitted for all locales to maximize search engine visibility.
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

      {/* ===== NEW: Enterprise schema stack (7 components) ===== */}
      {locale !== "hi" && (
        <>
          {/* 1. FAQ Page Schema (AEO - Answer Engine Optimization) */}
          <FAQPageSchema post={post} />

          {/* 2. Organization Schema (Employer branding) */}
          <OrganizationSchema post={post} />

          {/* 3. Local Business Schema (Geo-targeting) */}
          <LocalBusinessSchema post={post} />

          {/* 4. Web Page Schema (Freshness signals) */}
          <WebPageSchema post={post} />

          {/* 5. Event Schema (Application timeline) */}
          <EventSchema post={post} />

          {/* 6. Aggregate Offer Schema (Salary indexing) */}
          <AggregateOfferSchema post={post} />
        </>
      )}

      <JobPostingPageClient
        applyUrl={recruitmentResolvedFacts?.applicationUrl}
        postTitle={post.title}
      >
        <JobPostingPage
          post={post}
          recruitment={recruitmentData}
          isSingleJobRecruitment={recruitmentData?.isSingleJobRecruitment}
          locale={locale}
          resolvedFacts={resolvedFacts}
          recruitmentResolvedFacts={recruitmentResolvedFacts}
        />
      </JobPostingPageClient>
    </>
  );
}
