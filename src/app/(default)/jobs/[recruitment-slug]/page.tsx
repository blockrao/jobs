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
import { isUnresolvedOrganization } from "@/lib/organizations/unresolved";
import { isUnverifiedAggregatorSource } from "@/lib/source-verification";

// Recruitment hubs need request-time rendering while resolving database-backed
// canonical entities. Calling noStore() conditionally for individual slugs inside
// an ISR route triggers DYNAMIC_SERVER_USAGE during production rendering.
// Keep this route dynamic until per-path cache invalidation is implemented safely.
export const dynamic = "force-dynamic";
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ "recruitment-slug": string }> };

/**
 * Until the issuing-authority source is reviewed, keep aggregator-discovered
 * recruitment records out of indexable hub content and suppress their
 * extracted facts/links. The canonical entity and URL remain intact.
 */
function publicHubInput(recruitment: any, posts: any[]) {
  const aggregatorDiscovered = recruitment.officialLinkSource === "AGGREGATOR_DISCOVERED";
  const unverifiedAggregator = isUnverifiedAggregatorSource(
    recruitment.officialLinkSource,
    recruitment.verificationStatus,
    recruitment.metadata,
  );
  if (!aggregatorDiscovered) return { recruitment, posts, unverifiedAggregator };

  const provenance = recruitment.metadata?.source_provenance ?? {};
  const reviewedFields = Array.isArray(provenance.fact_review?.reviewed_fields)
    ? new Set<string>(provenance.fact_review.reviewed_fields)
    : new Set<string>();
  const hasHubReview = (field: string) => reviewedFields.has(`hub:${field}`);
  const hasPostReview = (name: string, field: string) =>
    reviewedFields.has(`post:${name}:${field}`);

  if (unverifiedAggregator) {
    return {
      unverifiedAggregator,
      posts: [],
      recruitment: {
        ...recruitment,
        metadata: {
          ...(recruitment.metadata ?? {}),
          verification_state: "preliminary_unverified",
        },
        sourceVerificationStatus: "UNVERIFIABLE",
        sourceListingPublishedDate: null,
        sourceExtract: {},
        enrichmentData: null,
        notificationDate: null,
        applicationStartDate: null,
        applicationEndDate: null,
        totalVacancies: null,
        description: null,
        notificationUrl: null,
        officialNotificationUrl: null,
        officialApplicationUrl: null,
        applyUrl: null,
        officialNotificationNumber: null,
        advertisementNumber: null,
        employmentType: null,
        locationStateCode: null,
        feeGeneral: null,
        feeReserved: null,
        feeNote: null,
        selectionProcess: null,
        ageNote: null,
        salaryNote: null,
        salaryBreakdown: null,
      },
    };
  }

  const authorityVerified = provenance.authority_review?.status === "VERIFIED";
  const reviewedRecruitment = {
    ...recruitment,
    metadata: {
      ...(recruitment.metadata ?? {}),
      verification_state: "verified",
    },
    sourceVerificationStatus: "VERIFIED",
    sourceListingPublishedDate: null,
    sourceExtract: null,
    enrichmentData: null,
    name: hasHubReview("org_short")
      ? recruitment.name
      : `${recruitment.organizationName ?? "Recruitment"} Recruitment`,
    year: hasHubReview("year") ? recruitment.year : null,
    description: hasHubReview("description") ? recruitment.description : null,
    notificationDate: hasHubReview("notification_date") ? recruitment.notificationDate : null,
    applicationStartDate: hasHubReview("application_start_date") ? recruitment.applicationStartDate : null,
    applicationEndDate: hasHubReview("application_end_date") || hasHubReview("end_date_note")
      ? recruitment.applicationEndDate
      : null,
    totalVacancies: hasHubReview("total_vacancies") ? recruitment.totalVacancies : null,
    notificationUrl: authorityVerified ? recruitment.officialNotificationUrl : null,
    officialNotificationUrl: authorityVerified ? recruitment.officialNotificationUrl : null,
    officialApplicationUrl: hasHubReview("apply_url") ? recruitment.officialApplicationUrl : null,
    applyUrl: hasHubReview("apply_url") ? recruitment.applyUrl : null,
    officialNotificationNumber: hasHubReview("official_notification_number") ? recruitment.officialNotificationNumber : null,
    advertisementNumber: hasHubReview("advertisement_number") ? recruitment.advertisementNumber : null,
    employmentType: hasHubReview("employment_type") ? recruitment.employmentType : null,
    locationStateCode: hasHubReview("state_code") ? recruitment.locationStateCode : null,
    feeGeneral: hasHubReview("fee_general") ? recruitment.feeGeneral : null,
    feeReserved: hasHubReview("fee_reserved") ? recruitment.feeReserved : null,
    feeNote: hasHubReview("fee_note") ? recruitment.feeNote : null,
    selectionProcess: hasHubReview("selection_process") ? recruitment.selectionProcess : null,
    ageNote: hasHubReview("age_note") ? recruitment.ageNote : null,
    salaryNote: hasHubReview("salary_note") ? recruitment.salaryNote : null,
    salaryBreakdown: hasHubReview("salary_breakdown") ? recruitment.salaryBreakdown : null,
  };

  const reviewedPosts = posts.map((post) => {
    const name = String(post.name ?? post.title ?? "").trim();
    return {
      ...post,
      enrichment: null,
      description: hasPostReview(name, "description") ? post.description : null,
      salaryMin: hasPostReview(name, "salary_min") || hasPostReview(name, "salary") ? post.salaryMin : null,
      salaryMax: hasPostReview(name, "salary_max") || hasPostReview(name, "salary") ? post.salaryMax : null,
      payLevel: hasPostReview(name, "pay_scale_text") || hasPostReview(name, "salary") ? post.payLevel : null,
      vacancyTotal: hasPostReview(name, "vacancy_total") || hasPostReview(name, "vacancies") ? post.vacancyTotal : null,
      vacancyDetails: hasPostReview(name, "vacancy_details") || hasPostReview(name, "vacancies") ? post.vacancyDetails : null,
      resolvedVacancyCount: hasPostReview(name, "vacancy_total") || hasPostReview(name, "vacancies") ? post.resolvedVacancyCount : null,
      employmentType: hasPostReview(name, "employment_type") ? post.employmentType : null,
      eligibilities: hasPostReview(name, "eligibility") &&
        hasPostReview(name, "education") &&
        hasPostReview(name, "experience") ? post.eligibilities : [],
      vacancies: hasPostReview(name, "vacancies") || hasPostReview(name, "vacancy_details")
        ? post.vacancies
        : [],
      ageRules: hasPostReview(name, "age_rules") ? post.ageRules : [],
      fjaExtract: null,
    };
  });

  return {
    unverifiedAggregator: false,
    recruitment: reviewedRecruitment,
    posts: reviewedPosts,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "recruitment-slug": slug } = await params;
  const data = await getRecruitmentWithPostsCached(slug);
  if (!data) {
    return { title: "Recruitment not found", ...pageSeo(`/jobs/${slug}`, { index: false }) };
  }
  const { recruitment, posts } = data;
  const safeInput = publicHubInput(recruitment, posts);
  const [postingLocations, cutoffMarks] = safeInput.unverifiedAggregator
    ? [[], []]
    : await Promise.all([
        getRecruitmentPostingLocations(recruitment.id),
        getRecruitmentCutoffMarks(recruitment.id),
      ]);
  const hub = buildHubData(safeInput.recruitment, safeInput.posts, undefined, postingLocations, cutoffMarks);
  const { title, description } = hub;

  return {
    title,
    description,
    // Recruitments whose issuing organisation is not identified yet stay out of the index.
    ...pageSeo(`/jobs/${recruitment.slug}`, {
      index: !safeInput.unverifiedAggregator && !isUnresolvedOrganization(recruitment.organizationSlug),
    }),
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
  const safeInput = publicHubInput(recruitment, posts);
  const [postingLocations, cutoffMarks] = safeInput.unverifiedAggregator
    ? [[], []]
    : await Promise.all([
        getRecruitmentPostingLocations(recruitment.id),
        getRecruitmentCutoffMarks(recruitment.id),
      ]);
  const hub = buildHubData(safeInput.recruitment, safeInput.posts, undefined, postingLocations, cutoffMarks);
  const sanitizedHub = toPlainJSON(hub) as typeof hub;

  return (
    <>
      <RecruitmentHubStructuredData data={sanitizedHub} />
      <RecruitmentHub data={sanitizedHub} enrichment={safeInput.recruitment.enrichmentData} />
    </>
  );
}
