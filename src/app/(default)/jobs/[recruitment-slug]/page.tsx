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
import FAQPageSchema from "@/components/structured-data/faqpage-schema";
import RecruitmentHubStructuredData from "@/components/recruitment/structured-data/recruitment-hub-schema";
import { getRecruitmentWithPostsCached, getRecruitmentPostingLocations, getRecruitmentCutoffMarks } from "@/db/operations/get-recruitments";
import { safeQuery } from "@/lib/safe-query";

export const revalidate = 86400; // 1 day ISR; revalidated on publish via /api/revalidate

type Props = { params: Promise<{ "recruitment-slug": string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "recruitment-slug": slug } = await params;
  const data = await safeQuery(() => getRecruitmentWithPostsCached(slug), null);
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
    ...pageSeo(`/jobs/${recruitment.slug}`, { index: true }),
    openGraph: { title, description, type: "website" },
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
      <FAQPageSchema faqs={[
        {
          question: `How to apply for ${recruitment.name}?`,
          answer: "Visit the official government recruitment website and follow the application process. Ensure you meet all eligibility requirements including age, educational qualifications, and experience before applying."
        },
        {
          question: `What is the application deadline for ${recruitment.name}?`,
          answer: recruitment.application_end_date ? `Applications must be submitted by ${new Date(recruitment.application_end_date).toLocaleDateString('en-IN')}. Late applications will not be accepted.` : "Check the official notification for the application deadline."
        },
        {
          question: "How can I track my application status?",
          answer: "Visit the official recruitment portal and log in with your registration details to check your application status. You will also receive updates via email."
        }
      ]} />
      <RecruitmentHub data={sanitizedHub} />
    </>
  );
}
