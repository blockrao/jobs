import { entitySeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostingBySlug } from "@/lib/queries";
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
  formatCurrencyRange,
  formatDate,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { InfoCard } from "@/components/ui/info-card";

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
  return deduped.length > maxLen ? `${deduped.slice(0, maxLen - 1).trimEnd()}…` : deduped;
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

  const title = `${displayTitle} — ${posting.organization.name}`;
  const description = plainTextSnippet(displayDescriptionSource, displayTitle);

  // Tier B/C postings stay crawlable and linkable but are kept out of the
  // index until they pass the content-quality gate (src/lib/content-quality/
  // gate.ts) — this is independent of whether Hindi content exists. A
  // Tier-A English page must stay indexable even when no hi translation
  // exists yet; only the /hi/ page itself needs hasHindi to be indexable.
  const seo = entitySeo({
    base: "/jobs",
    slug: posting.slug,
    locale,
    hasHindi,
    eligible: posting.indexTier === "A",
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
    },
  };
}

function buildFaqs(
  posting: NonNullable<Awaited<ReturnType<typeof getPostingBySlug>>>,
  isHi: boolean,
  displayTitle: string,
  displayOrgName: string,
  displayEligibility: string | null,
) {
  const faqs: { question: string; answer: string }[] = [];
  if (posting.totalVacancies) {
    faqs.push(
      isHi
        ? {
            question: `${displayTitle} में कितनी रिक्तियां हैं?`,
            answer: `${displayOrgName} द्वारा घोषित ${displayTitle} में ${posting.totalVacancies} रिक्तियां हैं।`,
          }
        : {
            question: `How many vacancies are there in ${displayTitle}?`,
            answer: `${displayTitle} has ${posting.totalVacancies} vacancies announced by ${displayOrgName}.`,
          },
    );
  }
  if (displayEligibility) {
    faqs.push(
      isHi
        ? { question: `${displayTitle} के लिए पात्रता क्या है?`, answer: displayEligibility }
        : { question: `What is the eligibility for ${displayTitle}?`, answer: displayEligibility },
    );
  }
  if (posting.validThrough) {
    const dateStr = formatDate(posting.validThrough, isHi ? "hi-IN" : "en-IN");
    faqs.push(
      isHi
        ? {
            question: `${displayTitle} हेतु आवेदन की अंतिम तिथि क्या है?`,
            answer: `आवेदन की अंतिम तिथि ${dateStr} है। आवेदन करने से पहले सदैव आधिकारिक अधिसूचना से पुष्टि करें।`,
          }
        : {
            question: `What is the last date to apply for ${displayTitle}?`,
            answer: `The last date to apply is ${dateStr}. Always confirm on the official notification before the deadline.`,
          },
    );
  }
  if (posting.applicationFeeGeneral != null) {
    faqs.push(
      isHi
        ? {
            question: `${displayTitle} हेतु आवेदन शुल्क क्या है?`,
            answer: `सामान्य श्रेणी हेतु आवेदन शुल्क ₹${posting.applicationFeeGeneral} है${
              posting.applicationFeeReserved != null
                ? ` तथा आरक्षित श्रेणियों हेतु ₹${posting.applicationFeeReserved}`
                : ""
            }।`,
          }
        : {
            question: `What is the application fee for ${displayTitle}?`,
            answer: `The application fee is ₹${posting.applicationFeeGeneral} for general category${
              posting.applicationFeeReserved != null
                ? ` and ₹${posting.applicationFeeReserved} for reserved categories`
                : ""
            }.`,
          },
    );
  }
  return faqs;
}

export default async function LocaleJobPage({ params }: Props) {
  const { slug, locale } = await params;
  const posting = await safeQuery(() => getPostingBySlug(slug), null);
  if (!posting) notFound();

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
  const displayRequirements = isHi && requirementsHi ? requirementsHi : posting.requirements;
  const displayResponsibilities =
    isHi && responsibilitiesHi ? responsibilitiesHi : posting.responsibilities;
  const displayLocationCity = isHi && locationCityHi ? locationCityHi : posting.locationCity;

  const org = posting.organization;
  const orgNameHi = (org as any).nameHi as string | null;
  const displayOrgName = isHi && orgNameHi ? orgNameHi : org.name;
  // Only link into the Hindi org page when it actually has Hindi content.
  const orgHref = isHi && orgNameHi ? `/hi/organizations/${org.slug}` : `/organizations/${org.slug}`;
  const hiringOpen = isHiringOpen(posting.currentStage, posting.validThrough);
  const faqs = buildFaqs(posting, isHi, displayTitle, displayOrgName, displayEligibility);
  const timeline = [...(posting.updates ?? [])].sort(
    (a, b) => a.eventDate.getTime() - b.eventDate.getTime(),
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
    checkSource: isHi ? "स्रोत / आधिकारिक अधिसूचना देखें" : "Check source / official notification",
    examDate: isHi ? "परीक्षा तिथि" : "Exam Date",
    lastVerified: isHi ? "अंतिम सत्यापन" : "Last Verified",
    applyNow: isHi ? "अभी आवेदन करें" : "Apply Now",
    officialNotification: isHi ? "आधिकारिक अधिसूचना (PDF)" : "Official Notification (PDF)",
    overview: isHi ? "विवरण" : "Overview",
    eligibility: isHi ? "पात्रता" : "Eligibility",
    responsibilities: isHi ? "जिम्मेदारियां" : "Responsibilities",
    requirements: isHi ? "आवश्यकताएं" : "Requirements",
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
            <Link href={`/recruitments/${posting.canonicalRecruitment.slug}`} className="hover:underline">
              {posting.canonicalRecruitment.name}
            </Link>
            {" / "}
          </>
        )}
        <Link href={isHi ? `/hi/jobs?kind=${kindPath}` : `/jobs?kind=${kindPath}`} className="hover:underline">
          {kindLabels[posting.kind]}
        </Link>{" "}
        / <Link href={orgHref} className="hover:underline">{displayOrgName}</Link>
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
        {posting.locationRegion ? `, ${posting.locationRegion}` : ""}
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
        {(posting.ageLimitMin || posting.ageLimitMax) && (
          <div>
            <dt className="text-neutral-500">{L.ageLimit}</dt>
            <dd className="font-medium">
              {posting.ageLimitMin ?? "—"}–{posting.ageLimitMax ?? "—"} {isHi ? "वर्ष" : "yrs"}
            </dd>
          </div>
        )}
        {posting.applicationFeeGeneral != null && (
          <div>
            <dt className="text-neutral-500">{L.applicationFee}</dt>
            <dd className="font-medium">₹{posting.applicationFeeGeneral}</dd>
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
          <dd className="font-medium">{posting.validThrough ? formatDate(posting.validThrough, dateLocale) : L.notAvailable}</dd>
        </div>
        {posting.examDate && (
          <div>
            <dt className="text-neutral-500">{L.examDate}</dt>
            <dd className="font-medium">{formatDate(posting.examDate, dateLocale)}</dd>
          </div>
        )}
        {(posting.lastVerifiedAt || posting.updatedAt) && (
          <div>
            <dt className="text-neutral-500">{L.lastVerified}</dt>
            <dd className="font-medium">
              {formatDate(posting.lastVerifiedAt ?? posting.updatedAt, dateLocale)}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {posting.applyUrl && hiringOpen && (
          <a
            href={posting.applyUrl}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {L.applyNow}
          </a>
        )}
        {posting.officialNotificationUrl && (
          <a
            href={posting.officialNotificationUrl}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md border border-black/20 px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50"
          >
            {L.officialNotification}
          </a>
        )}
        {!posting.officialNotificationUrl && (posting as any).sourceUrl && (
          <a
            href={(posting as any).sourceUrl}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md border border-black/20 px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50"
          >
            {L.checkSource}
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
                href={`/recruitments/${posting.canonicalRecruitment.slug}`}
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
                  {stageLabels[update.stage] ?? update.stage}: {update.title}
                </p>
                {update.description && (
                  <p className="text-sm text-neutral-600">{update.description}</p>
                )}
                {update.linkUrl && (
                  <a
                    href={update.linkUrl}
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
    </div>
  );
}
