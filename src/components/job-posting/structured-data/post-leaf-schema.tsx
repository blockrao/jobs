/**
 * Post Leaf Structured Data
 *
 * One schema.org @graph for /jobs/{recruitment-slug}/{post-slug}:
 *   - Organization   — site identity (JobOye), referenced as publisher
 *   - BreadcrumbList — Home › Jobs › Recruitment hub › Post title
 *   - WebPage        — the leaf itself; datePublished/dateModified; mainEntity → JobPosting
 *   - JobPosting     — the ONLY place on the site that emits JobPosting
 *   - FAQPage        — exactly the FAQ items rendered on the page (passed in)
 *
 * Rules (unchanged from the original builder):
 *   - JobPosting belongs ONLY on leaf pages. Never on hubs or listings.
 *   - Monetary and vacancy facts are resolver-gated (resolvedSalary / resolvedVacancy).
 *   - No fabricated facts: null = omit. educationRequirements is not emitted
 *     because credentialCategory cannot be derived safely yet (ELIG-001).
 *   - directApply is always false: JobOye links to official portals only.
 *   - `description` is HTML (<p>, <ul>/<li>) composed from stored facts, as
 *     Google requires; it mirrors the visible sections of the page.
 *   - baseSalary.unitText comes from the resolver's period and is always one
 *     of Google's case-sensitive values (HOUR/DAY/WEEK/MONTH/YEAR).
 */

import { SITE_URL } from "@/lib/site";
import { isUnresolvedOrganization } from "@/lib/organizations/unresolved";
import { jsonLdGraph } from "@/lib/structured-data";
import type { ResolvedDeadline, ResolvedSalary } from "@/lib/resolvers/fact-resolvers";

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACTOR",
  CONTRACTUAL: "CONTRACTOR",
  CONTRACTOR: "CONTRACTOR",
  INTERN: "INTERN",
  TEMPORARY: "TEMPORARY",
  OTHER: "OTHER",
  APPRENTICESHIP: "OTHER",
  DEPUTATION: "OTHER",
  FELLOWSHIP: "INTERN",
  INTERNSHIP: "INTERN",
  PERMANENT: "FULL_TIME",
};

const SALARY_UNITS: Record<string, string> = {
  MONTH: "MONTH", MONTHLY: "MONTH", "PER MONTH": "MONTH",
  YEAR: "YEAR", YEARLY: "YEAR", ANNUAL: "YEAR", "PER ANNUM": "YEAR",
  DAY: "DAY", DAILY: "DAY", HOUR: "HOUR", HOURLY: "HOUR", WEEK: "WEEK", WEEKLY: "WEEK",
};

export interface LeafFaq {
  q: string;
  a: string;
}

/** A visible fact line that also goes into the JobPosting description. */
export interface LeafFact {
  label: string;
  text: string;
}

export interface PostLeafSchemaProps {
  post: {
    id: number | string;
    title: string;
    slug: string;
    description?: string | null;
    organizationName?: string | null;
    organizationWebsite?: string | null;
    recruitmentSlug: string;
    recruitmentName?: string | null;
    employmentType?: string | null;
    locationCity?: string | null;
    locationState?: string | null;
    notificationPublicationDate?: Date | null;
    updatedAt?: Date | null;
    qualificationText?: string | null;
    experienceText?: string | null;
    vacancyNumber?: string | null;
    officialSourceUrl?: string | null;
  };
  /** Page <title> / meta description, so WebPage never disagrees with <head>. */
  pageTitle?: string;
  pageDescription?: string;
  /** One-paragraph intro rendered under the H1. */
  intro?: string | null;
  /** Fact lines rendered on the page; become the JobPosting description. */
  facts?: LeafFact[];
  /** Visible FAQ items; mirrored 1:1 into FAQPage. */
  faqs?: LeafFaq[];
  resolvedVacancy: number | null;
  resolvedSalary: ResolvedSalary | null;
  resolvedDeadline: ResolvedDeadline;
  /** Suppress JobPosting when the leaf is not eligible for indexing. */
  emitJobPosting?: boolean;
}

function toIso(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  try {
    const ts = new Date(d);
    if (isNaN(ts.getTime()) || ts.getTime() <= 0) return undefined;
    const y = ts.getUTCFullYear();
    if (y < 1900 || y >= 2090) return undefined;
    return ts.toISOString();
  } catch {
    return undefined;
  }
}

function isAuthoritativeDomain(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".gov.in") || host.endsWith(".nic.in");
  } catch {
    return false;
  }
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Extract the hiring organisation name from a post title when organizationName
 * is not available from the FK join.
 *
 * Titles for posts without an organizationId follow the pattern:
 *   "Other - {Org Name}"          → "Org Name"
 *   "{Post Name} - {Org Name}"    → "Org Name"  (last segment after " - ")
 *
 * We take the last " - " segment only when it looks like an organisation name
 * (i.e. it doesn't look like a plain post-name suffix such as "Recruitment 2024").
 * If no usable segment is found, returns null so we don't emit a fabricated value.
 */
function extractOrgFromTitle(title: string): string | null {
  if (!title) return null;
  const parts = title.split(" - ");
  if (parts.length < 2) return null;
  const candidate = parts[parts.length - 1].trim();
  // Reject if empty or looks like a year/round suffix rather than an org name.
  if (!candidate || /^\d{4}$/.test(candidate)) return null;
  return candidate;
}

export default function PostLeafStructuredData({
  post,
  pageTitle = post.title,
  pageDescription = post.description ?? post.title,
  intro = post.description ?? null,
  facts = [],
  faqs = [],
  resolvedVacancy,
  resolvedSalary,
  resolvedDeadline,
  emitJobPosting = true,
}: PostLeafSchemaProps) {
  const leafUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`;
  const hubUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}`;
  const officialSite = post.organizationWebsite ?? post.officialSourceUrl ?? null;

  // ── Organization (site identity) ─────────────────────────────────────────
  const siteOrg = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: "JobOye",
    url: SITE_URL,
  };

  // ── BreadcrumbList ───────────────────────────────────────────────────────
  // Every non-terminal node carries an item URL (Google validation rule).
  const crumbs: Array<Record<string, unknown>> = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Jobs", item: `${SITE_URL}/jobs` },
  ];
  if (post.recruitmentName) {
    crumbs.push({ "@type": "ListItem", position: 3, name: post.recruitmentName, item: hubUrl });
  }
  crumbs.push({ "@type": "ListItem", position: crumbs.length + 1, name: post.title });
  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${leafUrl}#breadcrumb`,
    itemListElement: crumbs,
  };

  // ── Dates ────────────────────────────────────────────────────────────────
  const candidateDatePosted = post.notificationPublicationDate
    ? new Date(post.notificationPublicationDate)
    : null;
  const datePostedIso = candidateDatePosted
    && Number.isFinite(candidateDatePosted.getTime())
    && candidateDatePosted.getTime() <= Date.now()
    ? toIso(candidateDatePosted)
    : undefined;
  // Google JobPosting requires datePosted. Never substitute a database
  // creation/ingestion timestamp for the issuer's notification publication date.
  const shouldEmitJobPosting = emitJobPosting && Boolean(datePostedIso);
  const dateModifiedIso = toIso(post.updatedAt);

  // ── WebPage ──────────────────────────────────────────────────────────────
  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${leafUrl}#webpage`,
    url: leafUrl,
    name: pageTitle,
    description: pageDescription,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: "JobOye",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    breadcrumb: { "@id": `${leafUrl}#breadcrumb` },
    ...(shouldEmitJobPosting ? { mainEntity: { "@id": `${leafUrl}#jobposting` } } : {}),
  };
  if (datePostedIso) webPage.datePublished = datePostedIso;
  if (dateModifiedIso) webPage.dateModified = dateModifiedIso;
  if (post.officialSourceUrl) {
    webPage.citation = { "@type": "CreativeWork", url: post.officialSourceUrl };
  }

  // ── JobPosting ───────────────────────────────────────────────────────────
  // description: HTML paragraphs from the same facts the page renders.
  const descriptionParts: string[] = [];
  if (intro) descriptionParts.push(`<p>${escapeHtml(intro)}</p>`);
  if (facts.length > 0) {
    descriptionParts.push(
      `<ul>${facts.map((f) => `<li>${escapeHtml(f.label)}: ${escapeHtml(f.text)}</li>`).join("")}</ul>`,
    );
  }
  if (descriptionParts.length === 0) {
    descriptionParts.push(
      `<p>${escapeHtml(post.title)} at ${escapeHtml(post.organizationName ?? "a government organisation")}. See the official notification for eligibility, pay and how to apply.</p>`,
    );
  }

  const identifierValue = post.vacancyNumber ?? String(post.id);
  const identifierName = post.vacancyNumber ? "Advertisement number" : (post.organizationName ?? "JobOye");

  const jobPosting: Record<string, unknown> = {
    "@type": "JobPosting",
    "@id": `${leafUrl}#jobposting`,
    mainEntityOfPage: { "@id": `${leafUrl}#webpage` },
    url: leafUrl,
    title: post.title,
    description: descriptionParts.join(""),
    directApply: false,
    identifier: { "@type": "PropertyValue", name: identifierName, value: identifierValue },
  };

  if (datePostedIso) jobPosting.datePosted = datePostedIso;

  // validThrough only when a verified deadline exists (OPEN or CLOSED); never for UNKNOWN.
  if (resolvedDeadline.state !== "UNKNOWN" && resolvedDeadline.date) {
    const vtIso = toIso(resolvedDeadline.date);
    if (vtIso) jobPosting.validThrough = vtIso;
  }

  const employmentType = EMPLOYMENT_TYPE_MAP[post.employmentType?.trim().toUpperCase() ?? ""];
  if (employmentType) jobPosting.employmentType = employmentType;

  // Use the joined org name if present; fall back to extracting from the title
  // for the ~1,600 posts whose organizationId is null (title pattern: "Other - Org Name").
  // Never publish the "Unclassified" placeholder as an employer.
  const knownOrgName = isUnresolvedOrganization(post.organizationName) ? null : post.organizationName;
  const hiringOrgName = knownOrgName ?? extractOrgFromTitle(post.title);
  if (hiringOrgName) {
    jobPosting.hiringOrganization = {
      "@type": "Organization",
      name: hiringOrgName,
      ...(isAuthoritativeDomain(officialSite) ? { sameAs: officialSite } : {}),
    };
  }

  jobPosting.jobLocation = {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      ...(post.locationCity ? { addressLocality: post.locationCity } : {}),
      ...(post.locationState ? { addressRegion: post.locationState } : {}),
      addressCountry: "IN",
    },
  };
  jobPosting.applicantLocationRequirements = { "@type": "Country", name: "India" };

  if (resolvedSalary) {
    const unit = SALARY_UNITS[String(resolvedSalary.period ?? "").trim().toUpperCase()];
    if (unit) {
      jobPosting.baseSalary = {
        "@type": "MonetaryAmount",
        currency: resolvedSalary.currency,
        value: {
          "@type": "QuantitativeValue",
          minValue: resolvedSalary.min,
          maxValue: resolvedSalary.max,
          unitText: unit,
        },
      };
    }
  }

  if (resolvedVacancy != null) jobPosting.totalJobOpenings = resolvedVacancy;
  if (post.qualificationText) jobPosting.qualifications = post.qualificationText;
  if (post.experienceText) {
    jobPosting.experienceRequirements = {
      "@type": "OccupationalExperienceRequirements",
      description: post.experienceText,
    };
  }
  if (post.officialSourceUrl) jobPosting.sameAs = post.officialSourceUrl;

  // ── FAQPage (exactly the visible FAQ) ────────────────────────────────────
  const faqPage = faqs.length > 0
    ? {
        "@type": "FAQPage",
        "@id": `${leafUrl}#faq`,
        mainEntity: faqs.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }
    : null;

  // A closed job is no longer an open position: Google's JobPosting policy
  // requires expired postings to drop the markup (validThrough alone is not
  // enough). The page itself stays, labelled closed, with no JobPosting.
  const postingClosed = resolvedDeadline.state === "CLOSED";
  if (postingClosed || !shouldEmitJobPosting) delete webPage.mainEntity;

  // One @graph: site org, breadcrumb, web page, the JobPosting (open/unknown
  // deadline only), visible FAQ.
  const graph = jsonLdGraph(siteOrg, breadcrumb, webPage, postingClosed || !shouldEmitJobPosting ? null : jobPosting, faqPage);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
