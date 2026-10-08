/**
 * Recruitment Hub Page
 * Route: /jobs/[recruitment-slug]
 *
 * Displays recruitment details and lists all associated job postings.
 * For single-job recruitments, displays the job details directly.
 */

import { notFound } from "next/navigation";
import { Metadata } from "next";
import RecruitmentHub from "@/components/recruitment/recruitment-hub";
import RecruitmentHubStructuredData from "@/components/recruitment/structured-data/recruitment-hub-schema";
import { getRecruitmentWithPosts } from "@/db/operations/get-recruitments";
import {
  resolveRecruitmentVacancy,
  resolvePostVacancy,
  resolveRecruitmentOfficialSource,
  resolveRecruitmentApplicationUrl,
  resolveRecruitmentEmployer,
  resolveRecruitmentSelectionProcess,
} from "@/lib/resolvers/fact-resolvers";

export const dynamic = "force-dynamic";

interface RecruitmentHubProps {
  params: Promise<{
    "recruitment-slug": string;
  }>;
}

export async function generateMetadata({
  params,
}: RecruitmentHubProps): Promise<Metadata> {
  const resolvedParams = await params;
  const recruitmentData = await getRecruitmentWithPosts(resolvedParams["recruitment-slug"]);

  if (!recruitmentData) {
    return {
      title: "Recruitment Not Found",
      description: "The requested recruitment could not be found",
    };
  }

  const { recruitment, totalPosts } = recruitmentData;

  return {
    title: recruitment.name,
    description: `${recruitment.name} recruitment with ${totalPosts} open position${totalPosts !== 1 ? 's' : ''}. View eligibility criteria and application details.`,
    alternates: {
      canonical: `/jobs/${recruitment.slug}`,
    },
    openGraph: {
      title: recruitment.name,
      description: `${recruitment.name} recruitment on JobOye`,
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
      // resolvePostVacancy will fall through to the reconciled legacy path.
    } as any),
  }));

  return (
    <>
      <RecruitmentHubStructuredData
        recruitment={recruitment}
        totalPosts={totalPosts}
        resolvedEmployer={resolvedEmployer}
      />
      <RecruitmentHub
        recruitment={recruitment}
        posts={postsWithResolvedVacancies}
        resolvedTotalVacancies={resolvedRecruitmentVacancies}
        resolvedApplicationUrl={resolvedApplicationUrl}
        resolvedOfficialSource={resolvedOfficialSource}
        resolvedEmployer={resolvedEmployer}
        resolvedSelectionProcess={resolvedSelectionProcess}
      />
    </>
  );
}
