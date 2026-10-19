/**
 * Dynamic Job Posting Page Route — DEPRECATED
 *
 * FIX-004: Redirects old route to new locale-based route
 *
 * Old route: /jobs/[recruitment-slug]/[post-slug]
 * New route: /[locale]/jobs/[slug]/[post-slug]
 *
 * This file now redirects 301 (permanent) to preserve SEO value and prevent 404s.
 * Old bookmarks, indexed URLs, and external links will automatically redirect to the new locale routes.
 */

import { notFound, redirect } from "next/navigation";
import { pageSeo } from "@/lib/seo";
import { cache } from "react";
import { Metadata } from "next";

// Revalidate every 5 minutes so DB writes (decomposition, enrichment) appear
// without requiring a full deployment.
export const revalidate = 86400; // Phase 1: daily revalidation
import JobPostingPage from "@/components/job-posting/job-posting-page";
import PostLeafStructuredData from "@/components/job-posting/structured-data/post-leaf-schema";
import { getPostBySlug } from "@/db/operations/get-posts";
import { getRecruitmentWithPosts } from "@/db/operations/get-recruitments";
import {
  resolvePostVacancy,
  resolveSalary,
  resolveDeadline,
  resolveRecruitmentOfficialSource,
  resolveRecruitmentApplicationUrl,
  resolveRecruitmentEmployer,
  resolveRecruitmentSelectionProcess,
} from "@/lib/resolvers/fact-resolvers";

// ---------------------------------------------------------------------------
// Post Leaf meta description builder
//
// Rule: build from authoritative Post facts only. Never emit N/A, never invent
// a vacancy, salary, or deadline that wasn't resolved. Omit unknown facts rather
// than filling with filler text. The description should still be useful when only
// the title and org are known.
// ---------------------------------------------------------------------------
function buildPostMetaDescription(params: {
  title: string;
  organizationName: string | null | undefined;
  resolvedVacancy: number | null;
  resolvedDeadline: { date: Date | null; state: "OPEN" | "CLOSED" | "UNKNOWN" };
  resolvedSalary: { min: number; max: number; currency: string; period: string } | null;
}): string {
  const { title, organizationName, resolvedVacancy, resolvedDeadline, resolvedSalary } = params;

  const parts: string[] = [];

  // Core identity: always present
  const org = organizationName ? ` at ${organizationName}` : "";
  parts.push(`${title}${org}`);

  // Vacancy: only when resolved
  if (resolvedVacancy != null) {
    parts.push(`${resolvedVacancy.toLocaleString("en-IN")} vacancies`);
  }

  // Salary information
  if (resolvedSalary) {
    const salaryStr = `₹${resolvedSalary.min.toLocaleString("en-IN")}–₹${resolvedSalary.max.toLocaleString("en-IN")} / ${resolvedSalary.period}`;
    parts.push(salaryStr);
  }

  // Deadline: only when state is known
  if (resolvedDeadline.state === "OPEN" && resolvedDeadline.date) {
    try {
      const ms = resolvedDeadline.date.getTime() - Date.now();
      const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
      if (days > 0 && days <= 30) {
        parts.push(`Apply in ${days} day${days !== 1 ? "s" : ""}`);
      } else if (days > 0) {
        parts.push(`Apply by ${resolvedDeadline.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`);
      }
    } catch { /* skip */ }
  } else if (resolvedDeadline.state === "CLOSED") {
    parts.push("Applications closed");
  }

  // Tail CTA
  parts.push("Check eligibility and apply on JobOye.");

  // Join: first part is the sentence opener, rest are fragments joined with " · "
  const [head, ...rest] = parts;
  return rest.length > 0 ? `${head} — ${rest.join(" · ")}` : head;
}

// React request memoization shares the Post lookup between generateMetadata and Page.
// This is request-scoped, not persistent caching, so deadlines and eligibility stay fresh.
const getPostBySlugForRequest = cache(async (recruitmentSlug: string, postSlug: string) =>
  getPostBySlug(recruitmentSlug, postSlug)
);

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
  const post = await getPostBySlugForRequest(
    resolvedParams["recruitment-slug"],
    resolvedParams["post-slug"]
  );

  if (!post) {
    return {
      title: "Job Posting Not Found",
      description: "The requested job posting could not be found",
    };
  }

  // Resolve Post-scoped facts for meta signals.
  const now = new Date();
  const metaVacancy = resolvePostVacancy(post);
  const metaSalary = resolveSalary(post);
  const metaDeadline = resolveDeadline(post, now);

  const description = buildPostMetaDescription({
    title: post.title,
    organizationName: post.organizationName,
    resolvedVacancy: metaVacancy,
    resolvedDeadline: metaDeadline,
    resolvedSalary: metaSalary,
  });

  // OG description: concise — vacancy + title
  const ogDescription = metaVacancy
    ? `${metaVacancy.toLocaleString("en-IN")} vacancies · ${post.title}${post.organizationName ? ` at ${post.organizationName}` : ""}`
    : `${post.title}${post.organizationName ? ` at ${post.organizationName}` : ""} on JobOye`;

  // Page title pattern (discoverability-framework Task #30):
  //   "[Post Title] – [Org] [Year]: Apply by [Date]"   (50–65 chars target)
  //   "[Post Title] – [Org] [Year]"                    (no deadline)
  //   "[Post Title] – [Org] [Year]: Applications closed"  (closed)
  // Year extracted from recruitmentName first, then fallback to deadline year.
  const yearMatch = (post.recruitmentName ?? "").match(/\b(20\d{2})\b/);
  const titleYear =
    yearMatch?.[1] ??
    (metaDeadline.date ? String(metaDeadline.date.getFullYear()) : null);
  const titleOrg = post.organizationName ? ` – ${post.organizationName}` : "";
  const titleYearPart = titleYear ? ` ${titleYear}` : "";
  let titleSuffix = "";
  if (metaDeadline.state === "OPEN" && metaDeadline.date) {
    const d = metaDeadline.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    titleSuffix = `: Apply by ${d}`;
  } else if (metaDeadline.state === "CLOSED") {
    titleSuffix = ": Applications closed";
  }
  const pageTitle = `${post.title}${titleOrg}${titleYearPart}${titleSuffix}`;

  // Indexing gate: a post is indexable when it has a canonical title and an official
  // source URL. All posts are visible; consumer protection is via frontend "reported" labels.
  const isIndexable = Boolean(post.title && post.officialSourceUrl);

  // article:published_time / article:modified_time for OG + SERP enrichment
  const publishedTime = post.notificationPublicationDate
    ? new Date(post.notificationPublicationDate).toISOString()
    : post.postedAt
    ? new Date(post.postedAt).toISOString()
    : undefined;
  const modifiedTime = post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined;

  // OG tags: org + employment type + location as discoverable signals
  const ogTags = [
    post.organizationName,
    post.locationState,
    post.employmentType,
  ].filter((t): t is string => Boolean(t));

  return {
    title: pageTitle,
    description,
    ...pageSeo(`/jobs/${post.recruitmentSlug}/${post.slug}`, { index: isIndexable }),
    openGraph: {
      title: post.title,
      description: ogDescription,
      type: "article",
      url: `https://www.joboye.com/jobs/${post.recruitmentSlug}/${post.slug}`,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      section: "Central Government Jobs",
      ...(ogTags.length > 0 ? { tags: ogTags } : {}),
    },
    robots: {
      index: isIndexable,
      follow: true,
      googleBot: {
        "max-image-preview": "large" as const,
        "max-snippet": -1,
      },
    },
  };
}

// FIX-004: Redirect old route to new locale-based route
export default async function Page({ params }: JobPostingPageRouteProps) {
  const resolvedParams = await params;
  const recruitmentSlug = resolvedParams["recruitment-slug"];
  const postSlug = resolvedParams["post-slug"];

  // Redirect to new locale-based route with English as default
  // This is a 301 permanent redirect, which preserves SEO value
  redirect(`/en/jobs/${recruitmentSlug}/${postSlug}`);
}
