import { SITE_NAME, SITE_URL, absoluteUrl } from "./site";
import { stripAggregatorTag } from "@/lib/aggregators";
import type {
  articles,
  organizations,
  postingUpdates,
  postings,
} from "@/db/schema";
import { evaluateJobPostingEligibility } from "./content-quality/gate";
import { parseQualification, educationToSchema, experienceToSchema } from "./parsers/qualification-parser";

type Posting = typeof postings.$inferSelect;
/** Optional fields some callers attach to a posting (e.g. getPostingBySlug). */
type PostingWithExtras = Posting & {
  canonicalRecruitment?: { locationStateCode?: string | null; officialNotificationNumber?: string | null } | null;
  locationStateCode?: string | null;
};
type Organization = typeof organizations.$inferSelect;
type PostingUpdate = typeof postingUpdates.$inferSelect;
type Article = typeof articles.$inferSelect;

// Stages that represent an actual open hiring/application opportunity —
// safe to emit JobPosting markup and show an "Apply" CTA. Once applications
// close (APPLICATION_CLOSED onward: admit card, exam, result, merit list...)
// the page is informational, not a live opening, so Google's JobPosting
// guidelines say to stop emitting markup rather than mislead job-search
// crawlers. A stage can also lag reality — e.g. still "APPLICATION_OPEN" in
// our data after the deadline has passed — so this also checks validThrough
// directly rather than trusting the stage alone.
const HIRING_OPEN_STAGES = new Set(["NOTIFICATION_OUT", "APPLICATION_OPEN", "ACTIVE"]);

export function isHiringOpen(stage: string, validThrough?: Date | null) {
  if (!HIRING_OPEN_STAGES.has(stage)) return false;
  if (validThrough && validThrough.getTime() < Date.now()) return false;
  return true;
}

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACTOR: "CONTRACTOR",
  INTERN: "INTERN",
  TEMPORARY: "TEMPORARY",
  OTHER: "OTHER",
  // Extended values (A-042 — correct classification of Indian govt recruitment types)
  APPRENTICESHIP: "OTHER",   // schema.org has no APPRENTICESHIP; OTHER is most accurate
  DEPUTATION: "OTHER",
  FELLOWSHIP: "INTERN",      // closest schema.org equivalent
  INTERNSHIP: "INTERN",
  PERMANENT: "FULL_TIME",
};

/** Maps a DB employmentType value to the schema.org string used in JobPosting markup.
 * Returns undefined if no value is provided - only real data should be rendered.
 */
export function employmentTypeToSchema(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return EMPLOYMENT_TYPE_MAP[value] ?? undefined;
}

export function buildOrganizationSchema(org: Organization, kind?: string | null) {
  // Government jobs use the more specific GovernmentOrganization type so that
  // Google's JobPosting enrichment can surface correct sitelinks and entity cards.
  const type = kind === "GOVERNMENT" ? "GovernmentOrganization" : "Organization";
  return {
    "@type": type,
    "@id": absoluteUrl(`/organizations/${org.slug}#org`),
    name: org.name,
    url: org.websiteUrl ?? absoluteUrl(`/organizations/${org.slug}`),
    logo: org.logoUrl ?? undefined,
    description: org.description ?? undefined,
    ...(org.websiteUrl && { sameAs: org.websiteUrl }),
  };
}

// Organization node for the organization's own page. Same @id as
// buildOrganizationSchema (one node per entity, the same identifier in every
// language), with the page-language name/description and the page URL.
// Phase 2A: Canonical org pages are now /organizations/[slug] (pillar pages).
export function buildOrganizationPageSchema(
  org: {
    slug: string;
    name: string;
    nameHi?: string | null;
    description?: string | null;
    descriptionHi?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
  },
  locale: string,
) {
  const hi = locale === "hi";
  const name = hi ? org.nameHi || org.name : org.name;
  const description = hi ? org.descriptionHi || org.description : org.description;
  return {
    "@type": "Organization",
    "@id": absoluteUrl(`/organizations/${org.slug}#org`),
    name,
    description: description || `Government recruitment organization: ${name}`,
    url: absoluteUrl(hi ? `/hi/organizations/${org.slug}` : `/organizations/${org.slug}`),
    ...(org.logoUrl && { logo: org.logoUrl }),
    ...(org.websiteUrl && { sameAs: org.websiteUrl }),
    inLanguage: hi ? "hi-IN" : "en-IN",
  };
}

// Exam node for the exam's own page. The conducting body links to its real,
// non-localized /commissions page.
export function buildExamSchema(
  exam: {
    slug: string;
    label: string;
    labelHi?: string | null;
    description?: string | null;
    descriptionHi?: string | null;
  },
  commission: { slug: string; name: string; nameHi?: string | null },
  locale: string,
) {
  const hi = locale === "hi";
  const name = hi ? exam.labelHi || exam.label : exam.label;
  const description = hi ? exam.descriptionHi || exam.description : exam.description;
  return {
    "@type": "EducationalOccupationalCredential",
    name,
    description: description || `${name} government exam`,
    url: absoluteUrl(hi ? `/hi/organizations/${exam.slug}` : `/organizations/${exam.slug}`),
    provider: {
      "@type": "Organization",
      name: hi ? commission.nameHi || commission.name : commission.name,
      url: absoluteUrl(`/commissions/${commission.slug}`),
    },
    inLanguage: hi ? "hi-IN" : "en-IN",
  };
}

export function buildJobPostingSchema(
  posting: Posting,
  org: Organization,
  linkedArticleSlugs: string[] = [],
): Record<string, unknown> | null {
  if (!isHiringOpen(posting.currentStage, posting.validThrough)) return null;

  // A generic recruitment page is not an individual job when it contains
  // multiple post titles. Until each post is resolved to its own canonical
  // leaf URL, suppress JobPosting markup rather than misrepresent the first
  // title as the entire recruitment. The leaf-page builder owns per-Post data.
  if (posting.postNames?.length !== 1) return null;

  // Minimum conditions for a valid JobPosting node:
  // - Approved, not expired, hiring is open (checked above)
  // - Tier A (all required content fields present)
  // - A real, resolved organization name (not a bucket name)
  // - A description (Google required field)
  const { eligible, reasons } = evaluateJobPostingEligibility(posting as never, org);
  if (reasons.length > 0) return null;

  // JobPosting.title must be the job title (e.g. "Research Associate III"),
  // never the scraped headline ("...Recruitment 2026 – Apply Online for 1
  // Post") — Google is explicit about this. We only have a trustworthy job
  // title once it's been extracted into postNames; if it hasn't, we do not
  // guess at one by trimming the headline, we skip JobPosting markup
  // entirely rather than publish a mislabeled title.
  const extractedTitle = posting.postNames?.[0]?.trim();
  if (!extractedTitle) return null;
  void eligible; // kept for reference; schemaReasons is the actual gate

  const url = absoluteUrl(`/jobs/${posting.slug}`);

  const baseSalary =
    posting.salaryMin || posting.salaryMax
      ? {
          "@type": "MonetaryAmount",
          currency: posting.salaryCurrency ?? "INR",
          value: {
            "@type": "QuantitativeValue",
            minValue: posting.salaryMin ?? undefined,
            maxValue: posting.salaryMax ?? undefined,
            unitText: posting.salaryPeriod ?? "MONTH",
          },
        }
      : undefined;

  // Prefer ISO 3166-2:IN state code from the canonical recruitment when available
  // (e.g. "IN-CH") — plain text region names like "Chandigarh" fail schema.org
  // validation. addressCountry is always the ISO-3166-1 alpha-2 code "IN".
  const isoRegion =
    (posting as PostingWithExtras).canonicalRecruitment?.locationStateCode ??
    (posting as PostingWithExtras).locationStateCode ??
    undefined;
  const jobLocation =
    posting.workplaceType === "REMOTE"
      ? undefined
      : {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: posting.locationCity ?? undefined,
            addressRegion: isoRegion,
            addressCountry: "IN",
          },
        };

  const applicantLocationRequirements =
    posting.workplaceType === "REMOTE"
      ? { "@type": "Country", name: "IN" }
      : undefined;

  // Phase 2: Parse qualifications and extract education/experience requirements
  // Uses posting.eligibility + posting.requirements combined for comprehensive parsing
  const qualificationText = [posting.eligibility, posting.requirements]
    .filter(Boolean)
    .join(" ");

  const parsedQualification = qualificationText
    ? parseQualification(qualificationText)
    : { educations: [], experience: undefined, skills: [] };

  const educationRequirements = parsedQualification.educations.length > 0
    ? parsedQualification.educations.map(educationToSchema)
    : undefined;

  const experienceRequirements = parsedQualification.experience
    ? experienceToSchema(parsedQualification.experience)
    : undefined;

  // Phase 2: Job benefits (from extraContent when available)
  const extraContent = posting.extraContent as any;
  const jobBenefits = extraContent?.benefits?.length
    ? extraContent.benefits.map((benefit: string) => ({
        "@type": "JobBenefit",
        name: benefit,
      }))
    : undefined;

  // Phase 2: Job start date (mapped from extraContent appointmentDate when available)
  const jobStartDate = extraContent?.appointmentDate
    ? new Date(extraContent.appointmentDate).toISOString()
    : undefined;

  // Enhance hiringOrganization with entity linking
  const hiringOrg = buildOrganizationSchema(org, posting.kind);

  return {
    "@type": "JobPosting",
    "@id": `${url}#jobposting`,
    url,
    title: extractedTitle,
    description: posting.description,
    // identifier.value priority:
    //   1. Official government advertisement number from the canonical
    //      recruitment record (e.g. "12/2026" for "Advt. No. 12/2026") —
    //      the most stable, cross-site-matchable identifier.
    //   2. externalId scraped from the source aggregator — less authoritative
    //      but still unique per source, better than a DB serial.
    //   3. DB id as a last resort (no semantic meaning to Google, but valid).
    identifier: {
      "@type": "PropertyValue",
      name: org.name,
      value:
        (posting as PostingWithExtras).canonicalRecruitment?.officialNotificationNumber ??
        posting.externalId ??
        String(posting.id),
    },
    datePosted: posting.datePosted?.toISOString(),
    // contentChangedAt = last meaningful reader-visible change (PQ-004).
    // Falls back to updatedAt so Google always sees a fresh signal.
    dateModified: (posting.contentChangedAt ?? posting.updatedAt)?.toISOString(),
    validThrough: posting.validThrough?.toISOString(),
    // Only include employmentType if real data exists.
    // Do not default to FULL_TIME for jobs without explicit employment type data.
    ...(posting.employmentType ? { employmentType: employmentTypeToSchema(posting.employmentType) } : {}),
    hiringOrganization: hiringOrg,
    jobLocation,
    jobLocationType:
      posting.workplaceType === "REMOTE" ? "TELECOMMUTE" : undefined,
    applicantLocationRequirements,
    baseSalary,
    totalJobOpenings: posting.totalVacancies ?? undefined,
    // directApply means the application can be completed on this page. Our
    // apply links go to the official site, so it is true only for a link on
    // this site (PQ-004).
    directApply: isOnSiteUrl(posting.applyUrl),
    // Phase 2 fields: Education, experience, benefits, and job start date
    ...(educationRequirements && { educationRequirements }),
    ...(experienceRequirements && { experienceRequirements }),
    ...(jobBenefits && { jobBenefits }),
    ...(jobStartDate && { jobStartDate }),
    // Reciprocal graph link: articles that cover this posting reference the
    // JobPosting @id above; this closes the loop so crawlers can walk both
    // directions. Uses canonical (non-locale) article URLs to match the
    // Article @id minted in buildArticleSchema.
    ...(linkedArticleSlugs.length > 0 && {
      mentions: linkedArticleSlugs.map((slug) => ({
        "@type": "Article",
        "@id": absoluteUrl(`/articles/${slug}#article`),
      })),
    }),
  };
}

export function isOnSiteUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    return new URL(url).hostname.replace(/^www\./, "") === new URL(absoluteUrl("/")).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
}

export function buildExamEventSchema(posting: Posting) {
  if (!posting.examDate) return null;
  const url = absoluteUrl(`/jobs/${posting.slug}`);
  return {
    "@type": "Event",
    "@id": `${url}#examevent`,
    name: `${posting.title} — Exam`,
    startDate: posting.examDate.toISOString(),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: posting.locationCity ?? undefined,
        addressRegion: posting.locationRegion ?? undefined,
        addressCountry: posting.locationCountry ?? "IN",
      },
    },
  };
}

export function buildBreadcrumbSchema(
  items: { name: string; path: string }[],
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildFAQSchema(input: { question: string; answer: string }[]) {
  // Defence in depth: a question or answer that is empty is never emitted (SEM-001).
  const qas = input.filter((qa) => qa.question?.trim() && qa.answer?.trim());
  if (qas.length === 0) return null;
  return {
    "@type": "FAQPage",
    mainEntity: qas.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.answer,
      },
    })),
  };
}

export function buildArticleSchema(
  article: Article,
  aboutPostingUrls: string[] = [],
) {
  const url = absoluteUrl(`/articles/${article.slug}`);
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: article.title,
    description: article.dek ?? undefined,
    image: article.coverImageUrl ?? undefined,
    author: article.authorName
      ? { "@type": "Person", name: article.authorName }
      : { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    mainEntityOfPage: url,
    about: aboutPostingUrls.map((u) => ({ "@type": "JobPosting", "@id": `${u}#jobposting` })),
  };
}

export function buildWebSiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    name: "JobOye — India's Best Job Portal For Govt Job Seekers",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/jobs?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

// Wraps any set of schema.org node objects into a single JSON-LD @graph,
// dropping nulls so callers can pass optional builders inline.
export function jsonLdGraph(...nodes: (Record<string, unknown> | null)[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}

/**
 * JobCollection Schema for hub pages (qualifications, salary-guides, comparisons, etc.)
 * Tells Google "this page is about multiple job opportunities"
 * Improves SERP visibility for "government jobs by [category]"
 */
export function buildJobCollectionSchema(
  pageTitle: string,
  jobTitles: string[],
  pageUrl: string,
  description?: string,
) {
  return {
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    name: pageTitle,
    description: description || pageTitle,
    url: pageUrl,
    hasPart: jobTitles.map((title) => ({
      "@type": "JobPosting",
      title,
      hiringOrganization: {
        "@type": "GovernmentOrganization",
        name: SITE_NAME,
      },
    })),
  };
}

/**
 * Enhanced Organization Schema for site-wide use
 * Includes logo, social profiles, and jobPosting search action
 */
export function buildSiteOrganizationSchema() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: "India's largest government job discovery platform - UPSC, SSC, banking, railway, state PSC jobs",
    sameAs: [
      "https://twitter.com/joboye",
      "https://linkedin.com/company/joboye",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: "support@joboye.com",
    },
  };
}

/**
 * LocalBusiness Schema for state-specific pages
 * Improves visibility for location-based searches
 */
export function buildStateLandingPageSchema(
  stateName: string,
  stateCode: string,
  pageUrl: string,
  description?: string,
) {
  return {
    "@type": "WebPage",
    "@id": `${pageUrl}#page`,
    name: `Government Jobs in ${stateName}`,
    description: description || `Government job opportunities in ${stateName}`,
    url: pageUrl,
    image: undefined,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
    },
  };
}

export function postingTimelineToText(updates: PostingUpdate[]) {
  return updates
    .slice()
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
    .map((u) => `${u.eventDate.toDateString()}: ${stripAggregatorTag(u.title)}`)
    .join("\n");
}
