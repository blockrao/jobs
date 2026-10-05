import { SITE_NAME, SITE_URL, absoluteUrl } from "./site";
import { stripAggregatorTag } from "@/lib/aggregators";
import type {
  articles,
  organizations,
  postingUpdates,
  postings,
} from "@/db/schema";
import { evaluateJobPostingEligibility } from "./content-quality/gate";

type Posting = typeof postings.$inferSelect;
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
};

export function buildOrganizationSchema(org: Organization) {
  return {
    "@type": "Organization",
    "@id": absoluteUrl(`/organizations/${org.slug}#org`),
    name: org.name,
    url: org.websiteUrl ?? absoluteUrl(`/organizations/${org.slug}`),
    logo: org.logoUrl ?? undefined,
    description: org.description ?? undefined,
  };
}

// Organization node for the organization's own page. Same @id as
// buildOrganizationSchema (one node per entity, the same identifier in every
// language), with the page-language name/description and the page URL.
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
    url: absoluteUrl(hi ? `/hi/exams/${exam.slug}` : `/exams/${exam.slug}`),
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
): Record<string, unknown> | null {
  if (!isHiringOpen(posting.currentStage, posting.validThrough)) return null;
  // SEO-001 freeze (G1, G3): Tier A, approved, not expired, a real hiring
  // organization, one resolved Post, a complete description. Otherwise the
  // page may exist but carries no JobPosting.
  if (!evaluateJobPostingEligibility(posting as never, org).eligible) return null;

  // JobPosting.title must be the job title (e.g. "Research Associate III"),
  // never the scraped headline ("...Recruitment 2026 – Apply Online for 1
  // Post") — Google is explicit about this. We only have a trustworthy job
  // title once it's been extracted into postNames; if it hasn't, we do not
  // guess at one by trimming the headline, we skip JobPosting markup
  // entirely rather than publish a mislabeled title.
  const extractedTitle = posting.postNames?.[0]?.trim();
  if (!extractedTitle) return null;

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

  const jobLocation =
    posting.workplaceType === "REMOTE"
      ? undefined
      : {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: posting.locationCity ?? undefined,
            addressRegion: posting.locationRegion ?? undefined,
            addressCountry: posting.locationCountry ?? "IN",
          },
        };

  const applicantLocationRequirements =
    posting.workplaceType === "REMOTE"
      ? { "@type": "Country", name: posting.locationCountry ?? "IN" }
      : undefined;

  return {
    "@type": "JobPosting",
    "@id": `${url}#jobposting`,
    url,
    title: extractedTitle,
    description: posting.description,
    identifier: {
      "@type": "PropertyValue",
      name: org.name,
      value: String(posting.id),
    },
    datePosted: posting.datePosted?.toISOString(),
    validThrough: posting.validThrough?.toISOString(),
    employmentType: EMPLOYMENT_TYPE_MAP[posting.employmentType] ?? "OTHER",
    hiringOrganization: buildOrganizationSchema(org),
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

export function buildFAQSchema(qas: { question: string; answer: string }[]) {
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
    name: SITE_NAME,
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

export function postingTimelineToText(updates: PostingUpdate[]) {
  return updates
    .slice()
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
    .map((u) => `${u.eventDate.toDateString()}: ${stripAggregatorTag(u.title)}`)
    .join("\n");
}
