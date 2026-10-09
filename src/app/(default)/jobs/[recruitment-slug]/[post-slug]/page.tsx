/**
 * Dynamic Job Posting Page Route
 * Renders individual job posting with enriched data and recruitment context
 * Route: /jobs/[recruitment-slug]/[post-slug]
 *
 * Architecture (locked 2026-10-09):
 *   One authoritative source → canonical entity graph → independent projections.
 *   Hub and Leaf both consume the entity graph directly. Leaf does NOT inherit
 *   from the Hub. Entity ownership governs resolver choice:
 *   - Post-owned facts: resolvePostVacancy, resolveSalary, resolveDeadline, etc.
 *   - Recruitment-owned facts: resolveRecruitmentOfficialSource, resolveRecruitmentApplicationUrl,
 *     resolveRecruitmentEmployer, resolveRecruitmentSelectionProcess.
 *   - Do NOT put Recruitment total into Post totalJobOpenings.
 */

import { notFound } from "next/navigation";
import { cache } from "react";
import { Metadata } from "next";
import JobPostingPage from "@/components/job-posting/job-posting-page";
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

  // Salary: only when resolved
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
  const metaVacancy = resolvePostVacancy(post as any);
  const metaSalary = resolveSalary(post as any);
  const metaDeadline = resolveDeadline(post as any, now);

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

  return {
    title: `${post.title} - ${post.organizationName}`,
    description,
    alternates: {
      canonical: `/jobs/${post.recruitmentSlug}/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: ogDescription,
      type: "website",
      url: `https://www.joboye.com/jobs/${post.recruitmentSlug}/${post.slug}`,
    },
  };
}

export default async function Page({ params }: JobPostingPageRouteProps) {
  const resolvedParams = await params;
  const recruitmentSlug = resolvedParams["recruitment-slug"];
  const postSlug = resolvedParams["post-slug"];

  // Fetch post with enrichment data
  const post = await getPostBySlugForRequest(recruitmentSlug, postSlug);

  if (!post) {
    notFound();
  }

  // Fetch recruitment data with all posts for context
  const recruitmentData = await getRecruitmentWithPosts(recruitmentSlug);

  // ── Post-owned resolver facts ────────────────────────────────────────────
  // Entity ownership: Post. These facts describe the specific Post.
  const now = new Date();
  const resolvedFacts = {
    vacancyCount: resolvePostVacancy(post as any),
    salary: resolveSalary(post as any),
    deadline: resolveDeadline(post as any, now),
  };

  // ── Recruitment-owned resolver facts ─────────────────────────────────────
  // Entity ownership: Recruitment. The Post Leaf shows these facts in context
  // (e.g. "Apply Online" CTA, Official Notification link) but the canonical
  // authority remains with the Recruitment entity, not the Post.
  // Source: recruitmentData.recruitment from getRecruitmentWithPosts (independent
  // query — Leaf does NOT inherit from Hub; both consume entity graph directly).
  const recruitmentResolvedFacts = recruitmentData?.recruitment
    ? {
        officialSource: resolveRecruitmentOfficialSource(recruitmentData.recruitment),
        applicationUrl: resolveRecruitmentApplicationUrl(recruitmentData.recruitment),
        employer: resolveRecruitmentEmployer(recruitmentData.recruitment),
        selectionProcess: resolveRecruitmentSelectionProcess(recruitmentData.recruitment),
      }
    : null;

  return (
    <JobPostingPage
      post={post}
      recruitment={recruitmentData}
      isSingleJobRecruitment={recruitmentData?.isSingleJobRecruitment}
      resolvedFacts={resolvedFacts}
      recruitmentResolvedFacts={recruitmentResolvedFacts}
    />
  );
}
