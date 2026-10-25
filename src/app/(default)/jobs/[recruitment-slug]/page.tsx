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
 *
 * Metadata (v2, 2026-10-21): title and description are composed from stored
 * facts by src/lib/seo/recruitment-title.ts through the same buildHubData the
 * page renders from, so <title>, H1, description and JSON-LD never disagree.
 */

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { pageSeo } from "@/lib/seo";
import { generateAlternates } from "@/lib/hreflang";
import RecruitmentHub, { buildHubData, toPlainJSON } from "@/components/recruitment/recruitment-hub";
import RecruitmentHubStructuredData from "@/components/recruitment/structured-data/recruitment-hub-schema";
import { getRecruitmentWithPostsCached, getRecruitmentPostingLocations, getRecruitmentCutoffMarks } from "@/db/operations/get-recruitments";

// ISR: each recruitment page is rendered on its first visit, served from cache,
// and regenerated at most once an hour (or on demand via /api/revalidate).
// A database error throws (500, never cached) instead of rendering a cached 404.
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ "recruitment-slug": string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "recruitment-slug": slug } = await params;
  const data = await getRecruitmentWithPostsCached(slug);
  if (!data) {
    return { title: "Recruitment not found", ...pageSeo(`/jobs/${slug}`, { index: false }) };
  }
  const { recruitment, posts } = data;
  const [postingLocations, cutoffMarks] = await Promise.all([
    getRecruitmentPostingLocations(recruitment.id),
    getRecruitmentCutoffMarks(recruitment.id),
  ]);
  const hub = buildHubData(recruitment, posts, undefined, postingLocations, cutoffMarks);
  const { title, description } = hub;

  return {
    title,
    description,
    // Recruitments whose issuing organisation is not identified yet stay out of the index.
    ...pageSeo(`/jobs/${recruitment.slug}`, { index: true }),
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function RecruitmentHubPage({ params }: Props) {
  const { "recruitment-slug": slug } = await params;
  const data = await getRecruitmentWithPostsCached(slug);
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

  const { recruitment, posts } = data;
  const [postingLocations, cutoffMarks] = await Promise.all([
    getRecruitmentPostingLocations(recruitment.id),
    getRecruitmentCutoffMarks(recruitment.id),
  ]);
  const hub = buildHubData(recruitment, posts, undefined, postingLocations, cutoffMarks);
  const sanitizedHub = toPlainJSON(hub) as typeof hub;

  return (
    <>
      <RecruitmentHubStructuredData data={sanitizedHub} />
      <RecruitmentHub data={sanitizedHub} enrichment={recruitment.enrichmentData} />
    </>
  );
}
