import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostingBySlug } from "@/lib/queries";
import {
  buildBreadcrumbSchema,
  buildJobPostingSchema,
  isHiringOpen,
  jsonLdGraph,
} from "@/lib/structured-data";
import { absoluteUrl } from "@/lib/site";
import { formatCurrencyRange, formatDate } from "@/lib/labels";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string; locale: string }> };

// Scraped descriptions are HTML; strip tags for a readable snippet.
function plainTextSnippet(html: string, maxLen = 155): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > maxLen ? `${text.slice(0, maxLen - 1).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const posting = await getPostingBySlug(slug);
  if (!posting) return {};

  const titleHi = (posting as any).titleHi as string | null;
  const descriptionHi = (posting as any).descriptionHi as string | null;
  // Only "hi" ever shows translated text — "en" on this locale-prefixed
  // route is the same English content the plain /jobs/[slug] page serves.
  const hasHindi = Boolean(titleHi);
  const displayTitle = locale === "hi" && titleHi ? titleHi : posting.title;
  const displayDescriptionSource =
    locale === "hi" && descriptionHi ? descriptionHi : posting.description;

  const title = `${displayTitle} — ${posting.organization.name}`;
  const description = plainTextSnippet(displayDescriptionSource);
  const indexable = posting.indexTier === "A";

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/jobs/${posting.slug}`,
      // Only advertise the Hindi alternate when real Hindi content exists —
      // otherwise /hi/jobs/[slug] would just be a duplicate of the English
      // page under a Hindi URL, which misleads search engines rather than
      // helping Hindi searches find this listing.
      ...(hasHindi && {
        languages: {
          en: absoluteUrl(`/en/jobs/${posting.slug}`),
          hi: absoluteUrl(`/hi/jobs/${posting.slug}`),
        },
      }),
    },
    robots: indexable && hasHindi ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/${locale}/jobs/${posting.slug}`),
      type: "article",
    },
  };
}

export default async function LocaleJobPage({ params }: Props) {
  const { slug, locale } = await params;
  const posting = await getPostingBySlug(slug);
  if (!posting) notFound();

  const isHi = locale === "hi";
  const titleHi = (posting as any).titleHi as string | null;
  const descriptionHi = (posting as any).descriptionHi as string | null;
  const eligibilityHi = (posting as any).eligibilityHi as string | null;
  const requirementsHi = (posting as any).requirementsHi as string | null;
  const responsibilitiesHi = (posting as any).responsibilitiesHi as string | null;
  const locationCityHi = (posting as any).locationCityHi as string | null;

  // Per-field fallback: show the Hindi text where it exists, English
  // otherwise, rather than an all-or-nothing switch — a posting can have a
  // translated title but no translated eligibility text yet.
  const displayTitle = isHi && titleHi ? titleHi : posting.title;
  const displayDescription = isHi && descriptionHi ? descriptionHi : posting.description;
  const displayEligibility = isHi && eligibilityHi ? eligibilityHi : posting.eligibility;
  const displayRequirements = isHi && requirementsHi ? requirementsHi : posting.requirements;
  const displayResponsibilities =
    isHi && responsibilitiesHi ? responsibilitiesHi : posting.responsibilities;
  const displayLocationCity = isHi && locationCityHi ? locationCityHi : posting.locationCity;

  const org = posting.organization;
  const hiringOpen = isHiringOpen(posting.currentStage, posting.validThrough);

  const schema = jsonLdGraph(
    buildJobPostingSchema(posting as any, org as any),
    buildBreadcrumbSchema([
      { name: isHi ? "होम" : "Home", path: `/${locale}` },
      { name: org.name, path: `/organizations/${org.slug}` },
      { name: displayTitle, path: `/${locale}/jobs/${posting.slug}` },
    ]),
  );

  const salaryText = formatCurrencyRange(
    posting.salaryMin,
    posting.salaryMax,
    posting.salaryCurrency ?? "INR",
    posting.salaryPeriod ?? "MONTH",
  );

  const L = {
    vacancies: isHi ? "रिक्तियां" : "Vacancies",
    employmentType: isHi ? "रोजगार प्रकार" : "Employment Type",
    payScale: isHi ? "वेतनमान" : "Pay Scale",
    postedOn: isHi ? "प्रकाशित तिथि" : "Posted On",
    lastDate: isHi ? "अंतिम तिथि" : "Last Date to Apply",
    applyNow: isHi ? "अभी आवेदन करें" : "Apply Now",
    officialNotification: isHi ? "आधिकारिक अधिसूचना (PDF)" : "Official Notification (PDF)",
    overview: isHi ? "विवरण" : "Overview",
    eligibility: isHi ? "पात्रता" : "Eligibility",
    responsibilities: isHi ? "जिम्मेदारियां" : "Responsibilities",
    requirements: isHi ? "आवश्यकताएं" : "Requirements",
    home: isHi ? "होम" : "Home",
    notTranslatedNotice: isHi
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
        <Link href={`/${locale}`} className="hover:underline">
          {L.home}
        </Link>{" "}
        / {org.name}
      </nav>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{displayTitle}</h1>
      <p className="mt-1 text-neutral-600">
        <Link href={`/organizations/${org.slug}`} className="hover:underline">
          {org.name}
        </Link>
        {displayLocationCity ? ` · ${displayLocationCity}` : ""}
      </p>

      {isHi && !titleHi && L.notTranslatedNotice && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {L.notTranslatedNotice}
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-black/10 p-4 text-sm sm:grid-cols-3">
        {posting.totalVacancies != null && (
          <div>
            <dt className="text-neutral-500">{L.vacancies}</dt>
            <dd className="font-medium">{posting.totalVacancies}</dd>
          </div>
        )}
        {salaryText && (
          <div>
            <dt className="text-neutral-500">{L.payScale}</dt>
            <dd className="font-medium">{salaryText}</dd>
          </div>
        )}
        {posting.datePosted && (
          <div>
            <dt className="text-neutral-500">{L.postedOn}</dt>
            <dd className="font-medium">{formatDate(posting.datePosted)}</dd>
          </div>
        )}
        {posting.validThrough && (
          <div>
            <dt className="text-neutral-500">{L.lastDate}</dt>
            <dd className="font-medium">{formatDate(posting.validThrough)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {posting.applyUrl && hiringOpen && (
          <a
            href={posting.applyUrl}
            target="_blank"
            rel="noopener nofollow"
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
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
      </div>

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
    </div>
  );
}
