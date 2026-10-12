/**
 * Recruitment Hub Page
 * Route: /jobs/[recruitment-slug]
 *
 * Displays recruitment details and lists all associated job postings.
 * For single-job recruitments, displays the job details directly.
 *
 * Handles redirects from old slugs to new semantic slugs with 301 status.
 */

import { notFound } from "next/navigation";
import { pageSeo, noindexRobots } from "@/lib/seo";
import { Metadata } from "next";
import RecruitmentHub from "@/components/recruitment/recruitment-hub";
import RecruitmentHubStructuredData from "@/components/recruitment/structured-data/recruitment-hub-schema";
import { getRecruitmentWithPostsCached } from "@/db/operations/get-recruitments";
import { getDb } from "@/db";
import { recruitment_slug_redirects } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  resolveRecruitmentVacancy,
  resolvePostVacancy,
  resolveRecruitmentOfficialSource,
  resolveRecruitmentApplicationUrl,
  resolveRecruitmentEmployer,
  resolveRecruitmentSelectionProcess,
} from "@/lib/resolvers/fact-resolvers";

// ---------------------------------------------------------------------------
// Meta description helpers (SEO/GEO signal enrichment)
// ---------------------------------------------------------------------------

function buildMetaDescription(params: {
  name: string;
  totalPosts: number;
  resolvedVacancies: number | null;
  applicationEndDate: Date | string | null | undefined;
  verificationStatus?: string | null;
  postTitles?: string[];
}): string {
  const { name, totalPosts, resolvedVacancies, applicationEndDate, verificationStatus, postTitles } = params;
  const verified = verificationStatus === "VERIFIED";

  const vacancyPart = resolvedVacancies
    ? `${resolvedVacancies.toLocaleString("en-IN")} ${verified ? "vacancies" : "reported vacancies"}`
    : `${totalPosts} listed position${totalPosts !== 1 ? "s" : ""}`;

  // Deadline: emit for both verified and unverified — unverified gets "(reported)" label
  let deadlinePart = "";
  if (applicationEndDate) {
    try {
      const d = new Date(applicationEndDate);
      const ms = d.getTime() - Date.now();
      const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
      const tag = verified ? "" : " (reported)";
      if (days > 0 && days <= 30) {
        deadlinePart = ` · Apply in ${days} day${days !== 1 ? "s" : ""}${tag}`;
      } else if (days > 0) {
        deadlinePart = ` · Apply by ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}${tag}`;
      } else {
        deadlinePart = " · Applications closed";
      }
    } catch { /* skip */ }
  }

  // Include post titles when there are multiple posts — makes description specific
  let postsPart = "";
  if (postTitles && postTitles.length > 1 && postTitles.length <= 4) {
    postsPart = ` Posts: ${postTitles.join(", ")}.`;
  }

  return `${name} — ${vacancyPart}${deadlinePart}.${postsPart} Check eligibility, important dates and official notification.`;
}

// Enable ISR with 300-second revalidation (5 minutes)
// Recruitment hub pages are moderately static (vacancy counts and deadlines change on hourly/daily basis)
// ISR dramatically improves performance vs force-dynamic, which hits the database on every request
// PERF-003: ISR replaces force-dynamic to leverage Next.js static generation cache
export const revalidate = 300;

interface RecruitmentHubProps {
  params: Promise<{
    "recruitment-slug": string;
  }>;
}

export async function generateMetadata({
  params,
}: RecruitmentHubProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams["recruitment-slug"];

  // Canonical semantic slugs cannot be legacy redirect sources. Skip the
  // redirect-table lookup for the common path; retain the fallback for old slugs.
  if (!/-\d{4}-\d{2}$/.test(slug)) {
    try {
      const db = getDb();
      const redirectRecord = await db
        .select()
        .from(recruitment_slug_redirects)
        .where(eq(recruitment_slug_redirects.old_slug, slug))
        .limit(1);

      if (redirectRecord && redirectRecord.length > 0) {
        // Return empty metadata for redirects; the proxy/page handles the redirect.
        return {
          title: "Redirecting...",
          robots: noindexRobots(),
        };
      }
    } catch {
      // Continue to normal flow on error
    }
  }

  const recruitmentData = await getRecruitmentWithPostsCached(slug);

  if (!recruitmentData) {
    return {
      title: "Recruitment Not Found",
      description: "The requested recruitment could not be found",
    };
  }

  const { recruitment, posts, totalPosts } = recruitmentData;

  // Resolve vacancy count for meta signals — same resolver used by page body.
  const metaVacancies = resolveRecruitmentVacancy({
    totalVacancies: recruitment.totalVacancies ?? null,
  });

  const metaPostTitles = posts
    .map((p) => p.title ?? p.name)
    .filter((t): t is string => Boolean(t))
    .slice(0, 4);

  const description = buildMetaDescription({
    name: recruitment.name,
    totalPosts,
    resolvedVacancies: metaVacancies,
    applicationEndDate: recruitment.applicationEndDate,
    verificationStatus: recruitment.sourceVerificationStatus ?? null,
    postTitles: metaPostTitles,
  });

  const factsVerified = recruitment.sourceVerificationStatus === "VERIFIED";
  const ogDescription = metaVacancies
    ? `${metaVacancies.toLocaleString("en-IN")} ${factsVerified ? "vacancies" : "reported vacancies"} · ${recruitment.name} on JobOye`
    : `${recruitment.name} on JobOye`;
  const roleSlugs = [...new Set(posts.map((post) => post.position?.slug).filter((slug): slug is string => Boolean(slug)))];
  // Single-role hub: canonical authority lives at the role hub (/posts/{slug}).
  // Hub is a near-duplicate; keep it non-indexable to avoid splitting signals.
  // Multi-role or no-role hub: this page IS the canonical unit. Index it.
  const isSingleRoleHub = roleSlugs.length === 1;
  const canonicalPath = isSingleRoleHub ? `/posts/${roleSlugs[0]}` : `/jobs/${recruitment.slug}`;
  const hubIndexable = !isSingleRoleHub;

  // article:published_time — notificationDate (verified) or sourceListingPublishedDate (unverified)
  const publishedTime = factsVerified
    ? (recruitment.notificationDate ? new Date(recruitment.notificationDate).toISOString() : undefined)
    : (recruitment.sourceListingPublishedDate ? new Date(recruitment.sourceListingPublishedDate).toISOString() : undefined);
  const modifiedTime = recruitment.updatedAt ? new Date(recruitment.updatedAt).toISOString() : undefined;

  // OG tags: distinct post names (role labels) — GEO/LLM signal
  const ogTags = [
    ...(recruitment.organizationName ? [recruitment.organizationName] : []),
    ...posts
      .map((p) => p.title ?? p.name)
      .filter((t): t is string => Boolean(t))
      .slice(0, 5),
  ].filter(Boolean);

  return {
    title: recruitment.name,
    description,
    ...pageSeo(canonicalPath, hubIndexable ? undefined : { index: false }),
    openGraph: {
      title: recruitment.name,
      description: ogDescription,
      type: "article",
      url: `https://www.joboye.com/jobs/${recruitment.slug}`,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      section: "Central Government Jobs",
      ...(ogTags.length > 0 ? { tags: ogTags } : {}),
    },
    robots: hubIndexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            "max-image-preview": "large" as const,
            "max-snippet": -1,
          },
        }
      : {
          index: false,
          follow: true,
          googleBot: {
            "max-image-preview": "large" as const,
            "max-snippet": -1,
          },
        },
  };
}

export default async function RecruitmentHubPage({
  params,
}: RecruitmentHubProps) {
  const resolvedParams = await params;
  const recruitmentSlug = resolvedParams["recruitment-slug"];

  // Fetch recruitment data with all posts
  const recruitmentData = await getRecruitmentWithPostsCached(recruitmentSlug);

  if (!recruitmentData) {
    notFound();
  }

  const { recruitment, posts, totalPosts } = recruitmentData!;

  // ── Gate 4D resolver contract ──────────────────────────────────────────────
  // All canonical facts must be resolved through the approved resolvers.
  // Do NOT read raw DB columns for Hub UI or structured data.

  // Recruitment-level vacancy count.
  const resolvedRecruitmentVacancies = resolveRecruitmentVacancy({
    totalVacancies: recruitment.totalVacancies ?? null,
  });

  // Recruitment-level facts — resolved through the canonical Recruitment resolver layer.
  // Do NOT add interpretation logic here; authority rules live in the resolvers.
  const resolvedOfficialSource = resolveRecruitmentOfficialSource(recruitment);
  const resolvedApplicationUrl = resolveRecruitmentApplicationUrl(recruitment);
  const resolvedEmployer = resolveRecruitmentEmployer(recruitment);
  const resolvedSelectionProcess = resolveRecruitmentSelectionProcess(recruitment);

  // Annotate each post with its resolved vacancy count so the Hub
  // does not independently select database columns.
  const postsWithResolvedVacancies = posts.map((post) => ({
    ...post,
    resolvedVacancyCount: resolvePostVacancy({
      enrichment: undefined,
      vacancyTotal: post.vacancyTotal ?? null,
      recruitmentVacancyTotal: recruitment.totalVacancies ?? null,
      // Hub ORM posts don't carry enrichment; the resolver evaluates only the
      // legacy Post vacancy fact and its Recruitment-scope guard.
    }),
  }));

  return (
    <>
      <RecruitmentHubStructuredData
        recruitment={recruitment}
        posts={postsWithResolvedVacancies}
        totalPosts={totalPosts}
        resolvedEmployer={resolvedEmployer}
        resolvedOfficialSource={resolvedOfficialSource}
        resolvedTotalVacancies={resolvedRecruitmentVacancies}
      />
      <RecruitmentHub
        recruitment={recruitment}
        posts={postsWithResolvedVacancies}
        resolvedTotalVacancies={resolvedRecruitmentVacancies}
        resolvedApplicationUrl={resolvedApplicationUrl}
        resolvedOfficialSource={resolvedOfficialSource}
        resolvedEmployer={resolvedEmployer}
        resolvedSelectionProcess={resolvedSelectionProcess}
        orgSlug={recruitment.organizationSlug ?? null}
      />
    </>
  );
}
