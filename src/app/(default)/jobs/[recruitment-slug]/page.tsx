/**
 * Recruitment Hub Page
 *
 * Route: /jobs/[recruitment-slug]
 *
 * URL contract (locked 2026-10-20):
 *   /jobs                                   → discovery listing
 *   /jobs/{recruitment-slug}                → recruitment hub (canonical to itself)
 *   /jobs/{recruitment-slug}/{post-slug}    → post leaf (canonical to itself)
 *
 * The recruitment hub renders the recruitment entity. It never redirects to a
 * position/role page (position hubs were removed; see commit 9700c2b) and never
 * canonicalises a single-post recruitment to its leaf. Legacy slugs that map to a
 * current recruitment via recruitment_slug_redirects are 301'd in src/proxy.ts;
 * the data loader also resolves them so a stale link still renders the right hub.
 */

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import RecruitmentHub from "@/components/recruitment/recruitment-hub";
import RecruitmentHubStructuredData from "@/components/recruitment/structured-data/recruitment-hub-schema";
import { getRecruitmentWithPostsCached } from "@/db/operations/get-recruitments";
import { safeQuery } from "@/lib/safe-query";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400; // 1 day ISR; revalidated on publish via /api/revalidate

type Props = { params: Promise<{ "recruitment-slug": string }> };

function hubDescription(name: string, totalPosts: number, totalVacancies: number | null): string {
  const parts = [`${name} recruitment`];
  if (totalVacancies && totalVacancies > 0) parts.push(`${totalVacancies.toLocaleString("en-IN")} vacancies`);
  parts.push(`${totalPosts} post${totalPosts === 1 ? "" : "s"}`);
  return `${parts.join(" · ")}. Eligibility, important dates, application fee, selection process and the official notification link.`;
}

function sumVacancies(posts: Array<{ vacancyTotal?: number | null }>): number | null {
  let total = 0;
  let any = false;
  for (const p of posts) {
    if (typeof p.vacancyTotal === "number" && p.vacancyTotal > 0) {
      total += p.vacancyTotal;
      any = true;
    }
  }
  return any ? total : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "recruitment-slug": slug } = await params;
  const data = await safeQuery(() => getRecruitmentWithPostsCached(slug), null);
  if (!data) {
    return { title: "Recruitment not found", robots: { index: false, follow: true } };
  }
  const { recruitment, posts, totalPosts } = data;
  const canonicalUrl = `${SITE_URL}/jobs/${recruitment.slug}`;
  const description = hubDescription(recruitment.name, totalPosts, sumVacancies(posts));
  const title = `${recruitment.name} — Recruitment ${new Date(recruitment.notificationDate ?? recruitment.createdAt ?? Date.now()).getFullYear()}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: { title, description, type: "website", url: canonicalUrl, siteName: "JobOye" },
    twitter: { card: "summary", title, description },
  };
}

export default async function RecruitmentHubPage({ params }: Props) {
  const { "recruitment-slug": slug } = await params;
  const data = await safeQuery(() => getRecruitmentWithPostsCached(slug), null);
  if (!data) notFound();

  // FIX (2026-10-20): Only redirect for legacy slugs, not smart slug resolution.
  //
  // The data loader tracks how it resolved the slug:
  //   - "exact" → direct match, no redirect
  //   - "legacy-redirect" → old slug found in recruitment_slug_redirects, should 301
  //   - "smart-resolution" → short org slug resolved to most recent recruitment, no redirect
  //
  // Smart slug resolution is a feature where /jobs/bihar-public-service-commission
  // automatically renders the most recent BPSC recruitment without a redirect.
  // Users and crawlers benefit: short slugs work directly, and the metadata has
  // alternates.canonical pointing to the full slug for SEO.
  if (data.resolutionMethod === "legacy-redirect") {
    permanentRedirect(`/jobs/${data.recruitment.slug}`);
  }

  const { recruitment, posts, totalPosts } = data;

  return (
    <>
      <RecruitmentHubStructuredData
        recruitment={recruitment}
        posts={posts}
        totalPosts={totalPosts}
        resolvedEmployer={recruitment.organizationName ?? null}
        resolvedOfficialSource={recruitment.officialNotificationUrl ?? recruitment.notificationUrl ?? null}
        resolvedTotalVacancies={sumVacancies(posts)}
      />
      <RecruitmentHub
        recruitment={recruitment}
        posts={posts}
        orgSlug={recruitment.organizationSlug ?? null}
        resolvedEmployer={recruitment.organizationName ?? null}
        resolvedOfficialSource={recruitment.officialNotificationUrl ?? recruitment.notificationUrl ?? null}
        resolvedTotalVacancies={sumVacancies(posts)}
      />
    </>
  );
}
