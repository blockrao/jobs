/**
 * Recruitment Hub Page
 * Route: /jobs/[recruitment-slug]
 *
 * Displays recruitment details and lists all associated job postings.
 * For single-job recruitments, displays the job details directly.
 *
 * Handles redirects from old slugs to new semantic slugs with 301 status.
 */

import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import RecruitmentHub from "@/components/recruitment/recruitment-hub";
import RecruitmentHubStructuredData from "@/components/recruitment/structured-data/recruitment-hub-schema";
import { getRecruitmentWithPosts } from "@/db/operations/get-recruitments";
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
}): string {
  const { name, totalPosts, resolvedVacancies, applicationEndDate } = params;

  const vacancyPart = resolvedVacancies
    ? `${resolvedVacancies.toLocaleString("en-IN")} vacancies`
    : `${totalPosts} open position${totalPosts !== 1 ? "s" : ""}`;

  let deadlinePart = "";
  if (applicationEndDate) {
    try {
      const d = new Date(applicationEndDate);
      const ms = d.getTime() - Date.now();
      const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
      if (days > 0 && days <= 30) {
        deadlinePart = ` · Apply in ${days} day${days !== 1 ? "s" : ""}`;
      } else if (days > 0) {
        deadlinePart = ` · Apply by ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
      } else {
        deadlinePart = " · Applications closed";
      }
    } catch { /* skip */ }
  }

  return `${name} — ${vacancyPart}${deadlinePart}. Check eligibility, important dates, and official notification.`;
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

  // Check if this is an old slug that needs redirect
  try {
    const db = getDb();
    const redirectRecord = await db
      .select()
      .from(recruitment_slug_redirects)
      .where(eq(recruitment_slug_redirects.old_slug, slug))
      .limit(1);

    if (redirectRecord && redirectRecord.length > 0) {
      // Return empty metadata for redirects; the redirect will happen in the page component
      return {
        title: "Redirecting...",
        robots: { index: false },
      };
    }
  } catch {
    // Continue to normal flow on error
  }

  const recruitmentData = await getRecruitmentWithPosts(slug);

  if (!recruitmentData) {
    return {
      title: "Recruitment Not Found",
      description: "The requested recruitment could not be found",
    };
  }

  const { recruitment, totalPosts } = recruitmentData;

  // Resolve vacancy count for meta signals — same resolver used by page body.
  const metaVacancies = resolveRecruitmentVacancy({
    totalVacancies: recruitment.totalVacancies ?? null,
  });

  const description = buildMetaDescription({
    name: recruitment.name,
    totalPosts,
    resolvedVacancies: metaVacancies,
    applicationEndDate: recruitment.applicationEndDate,
  });

  const ogDescription = metaVacancies
    ? `${metaVacancies.toLocaleString("en-IN")} vacancies · ${recruitment.name} on JobOye`
    : `${recruitment.name} on JobOye`;

  return {
    title: recruitment.name,
    description,
    alternates: {
      canonical: `/jobs/${recruitment.slug}`,
    },
    openGraph: {
      title: recruitment.name,
      description: ogDescription,
      type: "website",
      url: `https://www.joboye.com/jobs/${recruitment.slug}`,
    },
  };
}

export default async function RecruitmentHubPage({
  params,
}: RecruitmentHubProps) {
  const resolvedParams = await params;
  const recruitmentSlug = resolvedParams["recruitment-slug"];

  // Fetch recruitment data with all posts
  const recruitmentData = await getRecruitmentWithPosts(recruitmentSlug);

  if (!recruitmentData) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { recruitment, posts, totalPosts, isSingleJobRecruitment } = recruitmentData!;

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
  const postsWithResolvedVacancies = posts.map((post: any) => ({
    ...post,
    resolvedVacancyCount: resolvePostVacancy({
      id: String(post.id),
      vacancyTotal: post.vacancyTotal ?? null,
      recruitmentVacancyTotal: recruitment.totalVacancies ?? null,
      // Hub ORM posts don't carry enrichment; enrichment is undefined here.
      // resolvePostVacancy will fall through to Branch 2 (vacancy_total with scope guard).
    } as any),
  }));

  return (
    <>
      <RecruitmentHubStructuredData
        recruitment={recruitment}
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
