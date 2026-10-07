import { buildNoticeFaqs, buildNoticeTimeline, type NoticeFacts } from "@/lib/content/notice-faqs";
import { buildCoreFaqs } from "@/lib/content/faq-gate";
import { publicLink, stripAggregatorTag } from "@/lib/aggregators";
import { getStateBySlug } from "@/lib/states/states";
import { entitySeo } from "@/lib/seo";
import { cutAtWord, composeJobMetaDescription, composeJobMetaTitle } from "@/lib/seo/meta-title";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostingBySlug, getPostsForRecruitment } from "@/lib/queries";
import { safeQuery } from "@/lib/safe-query";
import {
  buildBreadcrumbSchema,
  buildExamEventSchema,
  buildFAQSchema,
  buildJobPostingSchema,
  isHiringOpen,
  jsonLdGraph,
} from "@/lib/structured-data";
import {
  EMPLOYMENT_TYPE_LABELS,
  KIND_LABELS,
  KIND_LABELS_HI,
  STAGE_LABELS,
  STAGE_LABELS_HI,
  WORKPLACE_TYPE_LABELS,
  formatAgeRange,
  formatCurrencyRange,
  formatDate,
  formatFee,
  vacanciesPhrase,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { InfoCard } from "@/components/ui/info-card";
import { CanonicalPostCard, LegacyPostCard } from "@/components/ui/post-card";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string; locale: string }> };

// Scraped descriptions are stored as HTML (often literally opening with
// "<p>{the same title again}</p>"), which is unusable as a meta description
// — it leaks markup into search snippets and just repeats the <title> tag.
function plainTextSnippet(html: string, repeatOf: string, maxLen = 155): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const deduped = text.toLowerCase().startsWith(repeatOf.toLowerCase())
    ? text.slice(repeatOf.length).replace(/^[\s.:–-]+/, "")
    : text;
  return cutAtWord(deduped, maxLen);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const posting = await safeQuery(() => getPostingBySlug(slug), null);
  if (!posting) return {};

  const isHi = locale === "hi";
  const titleHi = (posting as any).titleHi as string | null;
  const descriptionHi = (posting as any).descriptionHi as string | null;
  const hasHindi = Boolean(titleHi);
  const displayTitle = isHi && titleHi ? titleHi : posting.title;
  const displayDescriptionSource = isHi && descriptionHi ? descriptionHi : posting.description;

  const orgNameHi = (posting.organization as any).nameHi as string | null;
  const title = composeJobMetaTitle(
    displayTitle,
    isHi && orgNameHi ? [orgNameHi, posting.organization.name] : [posting.organization.name]
  );
  const factsDescription = isHi
    ? null
    : composeJobMetaDescription({
        postName: posting.postNames?.[0]?.trim() || null,
        orgName: posting.organization.name,
        vacancies: posting.totalVacancies,
        lastDate: posting.validThrough ? formatDate(posting.validThrough, "en-IN") : null,
      });
  const description = factsDescription ?? plainTextSnippet(displayDescriptionSource, displayTitle);
  const ogImages = [{ url: "/og-default.png", width: 1200, height: 630, alt: "JobOye government jobs" }];

  // All approved postings (Tier A and B) are indexable; Tier C (non-job,
  // duplicate, or expired) are excluded from indexing. The quality gate
  // (src/lib/content-quality/gate.ts) still classifies completeness but
  // indexability is no longer gated on reaching Tier A.
  const seo = entitySeo({
    base: "/jobs",
    slug: posting.slug,
    locale,
    hasHindi,
    eligible: posting.indexTier !== "C",
  });

  return {
    title,
    description,
    alternates: seo.alternates,
    robots: seo.robots,
    openGraph: {
      title,
      description,
      url: seo.url,
      type: "article",
      images: ogImages,
    },
    twitter: { card: "summary_large_image", title, description, images: ogImages.map((i) => i.url) },
  };
}

function buildFaqs(
  posting: NonNullable<Awaited<ReturnType<typeof getPostingBySlug>>>,
  isHi: boolean,
  displayTitle: string,
  displayOrgName: string,
  displayEligibility: string | null,
) {
  // SEM-001: every FAQ is built from a validated field, or it is not built (see faq-gate.ts).
  const extra = ((posting as any).extraContent ?? null) as import("@/db/schema").ExtraContent | null;
  return buildCoreFaqs({
    isHi,
    displayTitle,
    displayOrgName,
    displayEligibility,
    postNames: (posting.postNames as string[] | null) ?? null,
    totalVacancies: posting.totalVacancies ?? null,
    validThrough: posting.validThrough ?? null,
    datePosted: posting.datePosted ?? null,
    currentStage: posting.currentStage ?? null,
    applicationFeeGeneral: posting.applicationFeeGeneral ?? null,
    applicationFeeReserved: posting.applicationFeeReserved ?? null,
    extraFaqs: extra?.faqs ?? null,
  });
}

export default async function LocaleJobPage({ params }: Props) {
  const { slug, locale } = await params;
  const posting = await safeQuery(() => getPostingBySlug(slug), null);
  if (!posting) notFound();

  const canonicalRecruitmentId = (posting as any).canonicalRecruitment?.id ?? null;
  const siblingPosts = canonicalRecruitmentId
    ? await safeQuery(() => getPostsForRecruitment(canonicalRecruitmentId), [])
    : [];

  const isHi = locale === "hi";
  const dateLocale = isHi ? "hi-IN" : "en-IN";
  const titleHi = (posting as any).titleHi as string | null;
  const descriptionHi = (posting as any).descriptionHi as string | null;
  const eligibilityHi = (posting as any).eligibilityHi as string | null;
  const requirementsHi = (posting as any).requirementsHi as string | null;
  const responsibilitiesHi = (posting as any).responsibilitiesHi as string | null;
  const locationCityHi = (posting as any).locationCityHi as string | null;

  // Per-field fallback: show the Hindi text where it exists, English
  // otherwise — a posting can have a translated title but no translated
  // eligibility text yet.
  const displayTitle = isHi && titleHi ? titleHi : posting.title;
  const displayDescription = isHi && descriptionHi ? descriptionHi : posting.description;
  const displayEligibility = isHi && eligibilityHi ? eligibilityHi : posting.eligibility;
  const extraContent = ((posting as any).extraContent ?? null) as import("@/db/schema").ExtraContent | null;
  const displayRequirements = isHi && requirementsHi ? requirementsHi : posting.requirements;
  const displayResponsibilities =
    isHi && responsibilitiesHi ? responsibilitiesHi : posting.responsibilities;
  const displayLocationCity = isHi && locationCityHi ? locationCityHi : posting.locationCity;

  const org = posting.organization;
  const orgNameHi = (org as any).nameHi as string | null;
  const displayOrgName = isHi && orgNameHi ? orgNameHi : org.name;
  // Only link into the Hindi org page when it actually has Hindi content.
  const orgHref = isHi && orgNameHi ? `/hi/organizations/${org.slug}` : `/organizations/${org.slug}`;
  const stateHub = getStateBySlug((posting as any).stateSlug ?? "");
  const hiringOpen = isHiringOpen(posting.currentStage, posting.validThrough);
  const faqs = buildFaqs(posting, isHi, displayTitle, displayOrgName, displayEligibility);
  // Notice-specific FAQs and a minimal timeline are derived from the stored facts at render time
  // (fact-only, English; never stored, so they always match the current data).
  const noticeFacts: NoticeFacts = {
    id: posting.id,
    title: posting.title,
    org: org.name,
    vac: posting.totalVacancies ?? null,
    pay_min: posting.salaryMin ?? null,
    pay_max: posting.salaryMax ?? null,
    age_min: posting.ageLimitMin ?? null,
    age_max: posting.ageLimitMax ?? null,
    date_posted: posting.datePosted ? new Date(posting.datePosted).toISOString() : null,
    valid_through: posting.validThrough ? new Date(posting.validThrough).toISOString() : null,
    application_start: posting.canonicalRecruitment?.applicationStartDate
      ? new Date(posting.canonicalRecruitment.applicationStartDate).toISOString()
      : null,
    exam_date: posting.examDate ? new Date(posting.examDate).toISOString() : null,
    has_apply: Boolean(publicLink(posting.applyUrl)),
    post_names: ((posting.postNames as string[] | null) ?? []).filter((n) => typeof n === "string"),
    extra_tables: (extraContent?.tables ?? []).map((t: any) => t.title as string),
    existing_faqs: extraContent?.faqs?.length ?? 0,
    n_updates: (posting.updates ?? []).length,
  };
  if (noticeFacts.existing_faqs === 0 && !isHi) {
    for (const f of buildNoticeFaqs(noticeFacts)) {
      if (!faqs.some((x) => x.question === f.q)) faqs.push({ question: f.q, answer: f.a });
    }
  }
  const derivedTimeline = !isHi
    ? buildNoticeTimeline(noticeFacts).map((r, i) => ({
        id: `derived-${i}`,
        stage: r.stage,
        title: r.title,
        titleHi: null,
        description: null,
        descriptionHi: null,
        linkUrl: null,
        eventDate: new Date(r.eventDate),
      }))
    : [];
  const timeline = [...(posting.updates ?? []), ...derivedTimeline].sort(
    (a: any, b: any) => a.eventDate.getTime() - b.eventDate.getTime(),
  );
  const relatedArticles = (posting.postingArticles ?? []).map((pa: any) => pa.article);
  const kindPath = posting.kind === "GOVERNMENT" ? "GOVERNMENT" : "PRIVATE";
  const stageLabels = isHi ? STAGE_LABELS_HI : STAGE_LABELS;
  const kindLabels = isHi ? KIND_LABELS_HI : KIND_LABELS;

  const schema = jsonLdGraph(
    buildJobPostingSchema(posting as any, org as any),
    buildExamEventSchema(posting as any),
    buildBreadcrumbSchema([
      // No localized homepage exists — point at "/" directly rather than a
      // /${locale} URL that just redirects there.
      { name: isHi ? "होम" : "Home", path: "/" },
      { name: displayOrgName, path: orgHref },
      { name: displayTitle, path: isHi ? `/hi/jobs/${posting.slug}` : `/jobs/${posting.slug}` },
    ]),
    buildFAQSchema(faqs),
  );

  const salaryText = formatCurrencyRange(
    posting.salaryMin,
    posting.salaryMax,
    posting.salaryCurrency ?? "INR",
    posting.salaryPeriod ?? "MONTH",
    posting.kind === "GOVERNMENT",
  );

  const L = {
    vacancies: isHi ? "रिक्तियां" : "Vacancies",
    posts: isHi ? "पद" : "Post(s)",
    employmentType: isHi ? "रोजगार प्रकार" : "Employment Type",
    workMode: isHi ? "कार्य प्रकार" : "Work Mode",
    payScale: isHi ? "वेतनमान" : posting.kind === "GOVERNMENT" ? "Pay Scale" : "Salary",
    ageLimit: isHi ? "आयु सीमा" : "Age Limit",
    applicationFee: isHi ? "आवेदन शुल्क" : "Application Fee",
    postedOn: isHi ? "प्रकाशित तिथि" : "Posted On",
    lastDate: isHi ? "अंतिम तिथि" : "Last Date to Apply",
    notAvailable: isHi ? "उपलब्ध नहीं" : "Not available",
    notSpecified: isHi ? "निर्दिष्ट नहीं" : "Not specified",
    sourceDerived: isHi
      ? "यह जानकारी स्रोत से ली गई है और अधूरी हो सकती है। आवेदन से पहले आधिकारिक अधिसूचना देखें।"
      : "This information is derived from a published source and may be incomplete. Check the official notification before applying.",
    examDate: isHi ? "परीक्षा तिथि" : "Exam Date",
    lastVerified: isHi ? "अंतिम सत्यापन" : "Last Verified",
    applyNow: isHi ? "अभी आवेदन करें" : "Apply Now",
    officialNotification: isHi ? "आधिकारिक अधिसूचना (PDF)" : "Official Notification (PDF)",
    overview: isHi ? "विवरण" : "Overview",
    eligibility: isHi ? "पात्रता" : "Eligibility",
    responsibilities: isHi ? "जिम्मेदारियां" : "Responsibilities",
    requirements: isHi ? "आवश्यकताएं" : "Requirements",
    ageDetails: isHi ? "आयु सीमा एवं छूट" : "Age Limit and Relaxation",
    home: isHi ? "होम" : "Home",
    timeline: isHi ? "समयरेखा" : "Timeline",
    faq: isHi ? "अक्सर पूछे जाने वाले प्रश्न" : "Frequently Asked Questions",
    relatedGuides: isHi ? "संबंधित मार्गदर्शिकाएं" : "Related Guides",
    relatedInfo: isHi ? "संबंधित जानकारी" : "Related Information",
    viewAllForOrg: isHi ? "सभी अभियान और परीक्षाएं देखें" : "View all campaigns and exams",
    viewPositionHub: isHi ? "इस पद के सभी अभियान देखें" : "View all recruitment campaigns for this position",
    viewRecruitmentHub: isHi ? "पूरी समयरेखा एवं सभी पद देखें" : "View recruitment timeline and all posts",
    viewExamHub: isHi ? "परीक्षा विवरण एवं अन्य अभियान देखें" : "View exam details and other campaigns",
    notice: !hiringOpen
      ? isHi
        ? `यह भर्ती आवेदन चरण से आगे बढ़ चुकी है (${stageLabels[posting.currentStage] ?? posting.currentStage})। नीचे दिया गया विवरण संदर्भ हेतु रखा गया है।`
        : `This recruitment has moved past the application stage (${
            stageLabels[posting.currentStage] ?? posting.currentStage
          }). Details below are kept for reference — see the timeline for the latest update.`
      : null,
    notTranslatedNotice:
      isHi && !titleHi
        ? "इस भर्ती का पूरा हिंदी अनुवाद जल्द ही उपलब्ध होगा। नीचे अंग्रेज़ी में विवरण दिया गया है।"
        : null,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">
          {L.home}
        </Link>{" "}
        /{" "}
        {posting.canonicalPosition && (
          <>
            <Link href={`/positions/${posting.canonicalPosition.slug}`} className="hover:underline">
              {posting.canonicalPosition.name}
            </Link>
            {" / "}
          </>
        )}
        {posting.canonicalRecruitment && (
          <>
            <Link href={`/jobs/${posting.canonicalRecruitment.slug}`} className="hover:underline">
              {posting.canonicalRecruitment.name}
            </Link>
            {" / "}
          </>
        )}
        <Link href={isHi ? `/hi/jobs?kind=${kindPath}` : `/jobs?kind=${kindPath}`} className="hover:underline">
          {kindLabels[posting.kind]}
        </Link>{" "}
        / <Link href={orgHref} className="hover:underline">{displayOrgName}</Link>
        {stateHub && (
          <>
            {" / "}
            <Link href={`/states/${stateHub.slug}`} className="hover:underline">{isHi ? stateHub.nameHi : stateHub.name}</Link>
          </>
        )}
      </nav>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{kindLabels[posting.kind]}</Badge>
        <Badge tone="neutral">{stageLabels[posting.currentStage] ?? posting.currentStage}</Badge>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{displayTitle}</h1>
      <p className="mt-1 text-neutral-600">
        <Link href={orgHref} className="hover:underline">
          {displayOrgName}
        </Link>
        {displayLocationCity ? ` · ${displayLocationCity}` : ""}
        {posting.locationRegion && !stateHub ? `, ${posting.locationRegion}` : ""}
        {stateHub && (
          <>
            {", "}
            <Link href={`/states/${stateHub.slug}`} className="hover:underline">{isHi ? stateHub.nameHi : stateHub.name}</Link>
          </>
        )}
      </p>

      {L.notice && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {L.notice}
        </div>
      )}
      {(!posting.validThrough || !posting.officialNotificationUrl || posting.totalVacancies == null) && (
        <div className="mt-4 rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
          {L.sourceDerived}
        </div>
      )}
      {L.notTranslatedNotice && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {L.notTranslatedNotice}
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-black/10 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-neutral-500">{L.vacancies}</dt>
          <dd className="font-medium">{posting.totalVacancies != null ? posting.totalVacancies : L.notSpecified}</dd>
        </div>
        {posting.postNames && posting.postNames.length > 0 && (
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-neutral-500">{L.posts}</dt>
            <dd className="font-medium">{posting.postNames.join(", ")}</dd>
          </div>
        )}
        <div>
          <dt className="text-neutral-500">{L.employmentType}</dt>
          <dd className="font-medium">{EMPLOYMENT_TYPE_LABELS[posting.employmentType]}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">{L.workMode}</dt>
          <dd className="font-medium">{WORKPLACE_TYPE_LABELS[posting.workplaceType]}</dd>
        </div>
        {salaryText && (
          <div>
            <dt className="text-neutral-500">{L.payScale}</dt>
            <dd className="font-medium">{salaryText}</dd>
          </div>
        )}
        {(extraContent?.seo?.ageDisplay || formatAgeRange(posting.ageLimitMin, posting.ageLimitMax, isHi)) && (
          <div>
            <dt className="text-neutral-500">{L.ageLimit}</dt>
            <dd className="font-medium">
              {extraContent?.seo?.ageDisplay ?? formatAgeRange(posting.ageLimitMin, posting.ageLimitMax, isHi)}
              {!extraContent?.seo?.ageDisplay && posting.ageRelaxationNotes && (
                <span className="font-normal text-neutral-500">
                  {" "}
                  {isHi ? "(श्रेणी अनुसार भिन्न)" : "(varies by category)"}
                </span>
              )}
            </dd>
          </div>
        )}
        {formatFee(posting.applicationFeeGeneral, posting.applicationFeeReserved, isHi) && (
          <div>
            <dt className="text-neutral-500">{L.applicationFee}</dt>
            <dd className="font-medium">{formatFee(posting.applicationFeeGeneral, posting.applicationFeeReserved, isHi)}</dd>
          </div>
        )}
        {posting.datePosted && (
          <div>
            <dt className="text-neutral-500">{L.postedOn}</dt>
            <dd className="font-medium">{formatDate(posting.datePosted, dateLocale)}</dd>
          </div>
        )}
        <div>
          <dt className="text-neutral-500">{L.lastDate}</dt>
          <dd className="font-medium">
            {posting.validThrough ? (
              <>
                {formatDate(posting.validThrough, dateLocale)}
                {!isHi && (() => {
                  const diff = Math.ceil((new Date(posting.validThrough).getTime() - Date.now()) / 86400000);
                  if (diff > 0 && diff <= 30) return <span className="ml-1.5 text-xs font-normal text-amber-700">({diff} day{diff === 1 ? "" : "s"} left)</span>;
                  return null;
                })()}
              </>
            ) : L.notAvailable}
          </dd>
        </div>
        {posting.examDate && (
          <div>
            <dt className="text-neutral-500">{L.examDate}</dt>
            <dd className="font-medium">{formatDate(posting.examDate, dateLocale)}</dd>
          </div>
        )}
        {posting.lastVerifiedAt && (
          <div>
            <dt className="text-neutral-500">{L.lastVerified}</dt>
            <dd className="font-medium">
              {formatDate(posting.lastVerifiedAt, dateLocale)}
            </dd>
          </div>
        )}
      </dl>

      {(() => {
        if (siblingPosts.length > 0 && (posting as any).canonicalRecruitment) {
          return (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-neutral-500">
                {isHi ? `इस नोटिस के पद (${siblingPosts.length})` : `Posts in This Notice (${siblingPosts.length})`}
              </h2>
              <div className="space-y-3">
                {siblingPosts.map((p: any, i: number) => (
                  <CanonicalPostCard
                    key={p.id}
                    name={p.name}
                    slug={p.slug}
                    recruitmentSlug={(posting as any).canonicalRecruitment!.slug}
                    vacancyTotal={p.vacancyTotal}
                    vacancyDetails={p.vacancyDetails}
                    salaryMin={p.salaryMin}
                    salaryMax={p.salaryMax}
                    positionName={p.position?.name}
                    index={i}
                  />
                ))}
              </div>
            </div>
          );
        }
        const legacyNames = ((posting as any).postNames as string[] | null) ?? [];
        if (legacyNames.length > 0) {
          return (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-neutral-500">
                {isHi ? `इस नोटिस के पद (${legacyNames.length})` : `Posts in This Notice (${legacyNames.length})`}
              </h2>
              <div className="space-y-3">
                {legacyNames.map((name: string, i: number) => (
                  <LegacyPostCard key={name} name={name} index={i} />
                ))}
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="mt-6 flex flex-wrap gap-3">
        {publicLink(posting.applyUrl) && hiringOpen && (
          <a
            href={publicLink(posting.applyUrl) as string}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {L.applyNow}
          </a>
        )}
        {publicLink(posting.officialNotificationUrl) && (
          <a
            href={publicLink(posting.officialNotificationUrl) as string}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md border border-black/20 px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50"
          >
            {L.officialNotification}
          </a>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-500">{L.relatedInfo}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {posting.canonicalPosition && (
              <InfoCard
                tone="brand"
                href={`/positions/${posting.canonicalPosition.slug}`}
                title={posting.canonicalPosition.name}
                subtitle={L.viewPositionHub}
              />
            )}

            {posting.canonicalRecruitment && (
              <InfoCard
                tone="success"
                href={`/jobs/${posting.canonicalRecruitment.slug}`}
                title={posting.canonicalRecruitment.name}
                subtitle={L.viewRecruitmentHub}
              />
            )}

            <InfoCard
              tone="neutral"
              href={orgHref}
              title={displayOrgName}
              subtitle={L.viewAllForOrg}
            />

            {posting.exam && (
              <InfoCard
                tone="neutral"
                href={isHi ? `/hi/exams/${posting.exam.slug}` : `/exams/${posting.exam.slug}`}
                title={isHi && posting.exam.labelHi ? posting.exam.labelHi : posting.exam.label}
                subtitle={L.viewExamHub}
              />
            )}
          </div>
      </section>

      {timeline.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{L.timeline}</h2>
          <ol className="mt-3 space-y-3 border-l border-black/10 pl-4">
            {timeline.map((update: any) => (
              <li key={update.id}>
                <p className="text-xs text-neutral-500">{formatDate(update.eventDate, dateLocale)}</p>
                <p className="font-medium">
                  {String(update.id).startsWith("derived-")
                    ? stripAggregatorTag(isHi && update.titleHi ? update.titleHi : update.title)
                    : `${stageLabels[update.stage] ?? update.stage}: ${stripAggregatorTag(isHi && update.titleHi ? update.titleHi : update.title)}`}
                </p>
                {update.description && (
                  <p className="text-sm text-neutral-600">
                    {isHi && update.descriptionHi ? update.descriptionHi : update.description}
                  </p>
                )}
                {publicLink(update.linkUrl) && (
                  <a
                    href={publicLink(update.linkUrl) as string}
                    target="_blank"
                    rel="noopener nofollow"
                    className="text-sm text-neutral-900 underline"
                  >
                    {isHi ? "देखें" : "View"}
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="prose prose-neutral mt-10 max-w-none">
        <h2 className="text-lg font-semibold">{L.overview}</h2>
        <p className="whitespace-pre-line">{displayDescription}</p>

        {(extraContent?.notices ?? []).map((n) => (
          <div key={n.title}>
            <h2 className="text-lg font-semibold">{isHi && n.titleHi ? n.titleHi : n.title}</h2>
            <p className="whitespace-pre-line">{isHi && n.bodyHi ? n.bodyHi : n.body}</p>
          </div>
        ))}

        {(extraContent?.tables ?? []).map((t) => {
          const headers = isHi && t.headersHi ? t.headersHi : t.headers;
          const rows = isHi && t.rowsHi ? t.rowsHi : t.rows;
          return (
            <div key={t.title}>
              <h2 className="text-lg font-semibold">{isHi && t.titleHi ? t.titleHi : t.title}</h2>
              <div className="not-prose overflow-x-auto">
                <table className="w-full min-w-[20rem] border-collapse text-sm">
                  <thead>
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="border border-black/10 bg-neutral-50 px-3 py-2 text-left font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.join("|")}>
                        {r.map((c, i) => (
                          <td key={i} className="border border-black/10 px-3 py-2">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {displayEligibility && (
          <>
            <h2 className="text-lg font-semibold">{L.eligibility}</h2>
            <p className="whitespace-pre-line">{displayEligibility}</p>
          </>
        )}

        {displayResponsibilities && (
          <>
            <h2 className="text-lg font-semibold">{L.responsibilities}</h2>
            <p className="whitespace-pre-line">{displayResponsibilities}</p>
          </>
        )}

        {displayRequirements && (
          <>
            <h2 className="text-lg font-semibold">{L.requirements}</h2>
            <p className="whitespace-pre-line">{displayRequirements}</p>
          </>
        )}

        {posting.ageRelaxationNotes && (
          <>
            <h2 className="text-lg font-semibold">{L.ageDetails}</h2>
            <p className="whitespace-pre-line">
              {isHi && (posting as any).ageRelaxationNotesHi ? (posting as any).ageRelaxationNotesHi : posting.ageRelaxationNotes}
            </p>
          </>
        )}
      </section>

      {faqs.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{L.faq}</h2>
          <div className="mt-3 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <p className="font-medium">{faq.question}</p>
                <p className="text-sm text-neutral-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {relatedArticles.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{L.relatedGuides}</h2>
          <ul className="mt-3 space-y-2">
            {relatedArticles.map((article: any) => (
              <li key={article.id}>
                <Link
                  href={isHi && article.titleHi ? `/hi/articles/${article.slug}` : `/articles/${article.slug}`}
                  className="font-medium text-neutral-900 underline hover:no-underline"
                >
                  {isHi && article.titleHi ? article.titleHi : article.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── REPORT AN ERROR ── */}
      <p className="mt-8 text-xs text-neutral-400">
        {isHi ? (
          <>
            कोई त्रुटि दिखी?{" "}
            <Link href="/contact" className="underline hover:text-neutral-600">
              रिपोर्ट करें
            </Link>
          </>
        ) : (
          <>
            Spotted an error or outdated information?{" "}
            <Link href="/contact" className="underline hover:text-neutral-600">
              Report it
            </Link>
            {" "}and we'll fix it.
          </>
        )}
      </p>
    </div>
  );
}
