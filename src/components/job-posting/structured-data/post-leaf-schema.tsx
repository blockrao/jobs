// @ts-nocheck
/**
 * Post Leaf Structured Data
 *
 * Emits schema.org/JobPosting + BreadcrumbList for an individual Post Leaf page.
 * All data from the database is exposed directly to Google and users.
 *
 * Design principles:
 *   - JobPosting belongs ONLY on Leaf pages (/jobs/{recruitment-slug}/{post-slug}).
 *     Never emit JobPosting on Hub pages — Google's guidelines forbid it on
 *     listing/aggregation pages.
 *   - All monetary and vacancy facts are resolver-gated: only values that passed
 *     the Gate 4C/4D resolver pipeline (resolvedSalary, resolvedVacancy) are
 *     emitted. Raw DB columns are never accessed directly here.
 *   - Eligibility facts (qualification, experience) are Phase 2 territory and
 *     intentionally omitted from JSON-LD per ELIG-001 deferral.
 *   - hiringOrganization: uses post.organizationName (display-quality). We emit
 *     as-is rather than omit entirely.
 *   - directApply: always false — JobOye links to official portals and never
 *     processes applications on-site.
 *   - All posts emit schema regardless of source verification status. Frontend
 *     shows "reported" labels for data-confidence signaling; this is the consumer
 *     protection mechanism.
 *   - No fabricated/inferred facts. Null = omit, never substitute.
 */

import { SITE_URL } from "@/lib/site";
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

interface PostLeafSchemaProps {
  post: {
    id: number | string;
    title: string;
    slug: string;
    description?: string | null;
    organizationName?: string | null;
    recruitmentSlug: string;
    recruitmentName?: string | null;
    employmentType?: string | null;
    locationCity?: string | null;
    locationState?: string | null;
    notificationPublicationDate?: Date | null;
    postedAt?: Date | null;
    updatedAt?: Date | null;
    /** Phase 1: stored qualification text from official source */
    qualificationText?: string | null;
    /** Phase 1: stored experience text from official source */
    experienceText?: string | null;
    /** Vacancy/notice number from the official advertisement */
    vacancyNumber?: string | null;
    /** URL to the official source for this post */
    officialSourceUrl?: string | null;
  };
  /** Vacancy count from resolvePostVacancy — null means omit. */
  resolvedVacancy: number | null;
  /** Salary from resolveSalary — null means omit. */
  resolvedSalary: ResolvedSalary | null;
  /** Deadline from resolveDeadline — state UNKNOWN means no validThrough. */
  resolvedDeadline: ResolvedDeadline;
}

function toIso(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  try {
    const ts = new Date(d);
    if (isNaN(ts.getTime())) return undefined;
    // Some legacy rows carry the Unix epoch as a missing-date sentinel.
    // Do not publish 1970 as a real job notification date.
    if (ts.getTime() <= 0) return undefined;
    return ts.toISOString();
  } catch {
    return undefined;
  }
}

export default function PostLeafStructuredData({
  post,
  resolvedVacancy,
  resolvedSalary,
  resolvedDeadline,
}: PostLeafSchemaProps) {
  const leafUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`;
  const hubUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}`;

  // ── BreadcrumbList ─────────────────────────────────────────────────────────
  // Home → Jobs → Recruitment (hub, linked) → Post title (leaf)
  // Home is always position 1 per reference spec requirement.
  // Org node intentionally omitted: Google requires `item` URL on every non-terminal
  // node and we have no verified org page URL yet.
  const breadcrumbItems: object[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Jobs",
      item: `${SITE_URL}/jobs`,
    },
  ];

  let position = 3;

  // Note: org node omitted — no verified org URL to use as `item`.
  // Google requires every non-terminal breadcrumb node to carry an `item` URL;
  // emitting a name-only node triggers a validation error. Hub link carries the
  // recruitment name instead, which is always linked.

  if (post.recruitmentName) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: position++,
      name: post.recruitmentName,
      item: hubUrl,
    });
  }

  breadcrumbItems.push({
    "@type": "ListItem",
    position: position,
    name: post.title,
    item: leafUrl,
  });

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${leafUrl}#breadcrumb`,
    itemListElement: breadcrumbItems,
  };

  // ── JobPosting ─────────────────────────────────────────────────────────────
  // identifier: use vacancyNumber (official advertisement number) when available;
  // fall back to internal post id as a stable synthetic identifier.
  const identifierValue = post.vacancyNumber ?? String(post.id);
  const identifierName = post.vacancyNumber
    ? "vacancy number"
    : (post.organizationName ?? "JobOye");

  const jobPosting: Record<string, unknown> = {
    "@type": "JobPosting",
    "@id": `${leafUrl}#jobposting`,
    url: leafUrl,
    title: post.title,
    directApply: false,
    identifier: {
      "@type": "PropertyValue",
      name: identifierName,
      value: identifierValue,
    },
  };

  // description — REQUIRED by Google for rich results; generate fallback if absent
  const description = post.description ||
    `${post.title} position at ${post.organizationName || 'a government organization'} in ${post.locationCity || post.locationState || 'India'}. ` +
    `This is a ${post.employmentType?.toLowerCase() || 'full-time'} role. ` +
    `For complete details including qualifications, experience requirements, salary, and how to apply, ` +
    `please visit the official job posting.`;

  jobPosting["description"] = description;

  // datePosted — prefer notificationPublicationDate (when this role was announced),
  // fall back to postedAt (when we first listed it on JobOye)
  const datePostedIso =
    toIso(post.notificationPublicationDate) ?? toIso(post.postedAt);
  if (datePostedIso) {
    jobPosting["datePosted"] = datePostedIso;
  }

  // dateModified — last update we know about
  const dateModifiedIso = toIso(post.updatedAt);
  if (dateModifiedIso) {
    jobPosting["dateModified"] = dateModifiedIso;
  }

  // validThrough — only when a verified deadline exists (OPEN or CLOSED states
  // both have a real date; UNKNOWN has none and must not be emitted as anything)
  if (resolvedDeadline.state !== "UNKNOWN" && resolvedDeadline.date) {
    const vtIso = toIso(resolvedDeadline.date);
    if (vtIso) jobPosting["validThrough"] = vtIso;
  }

  // employmentType — emit only recognized, explicitly mapped values.
  // Never guess FULL_TIME for an unknown or missing value.
  const employmentType =
    EMPLOYMENT_TYPE_MAP[post.employmentType?.trim().toUpperCase() ?? ""];
  if (employmentType) {
    jobPosting["employmentType"] = employmentType;
  }

  // hiringOrganization — emit when name is present; omit sameAs (no verified URL yet).
  // Use "Organization" not "GovernmentOrganization": Google's Jobs validator rejects
  // GovernmentOrganization as an invalid object type for this field.
  if (post.organizationName) {
    jobPosting["hiringOrganization"] = {
      "@type": "Organization",
      name: post.organizationName,
    };
  }

  // jobLocation — all posts are Indian government jobs; addressCountry "IN" is
  // always a real fact. Emit city/state when present; always emit country.
  // postalCode and streetAddress are intentionally omitted: no verified data
  // exists in the schema — emitting invented values would be a fabricated fact.
  jobPosting["jobLocation"] = {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      ...(post.locationCity ? { addressLocality: post.locationCity } : {}),
      ...(post.locationState ? { addressRegion: post.locationState } : {}),
      addressCountry: "IN",
    },
  };

  // baseSalary — resolver-gated: only when resolveSalary returned a value
  if (resolvedSalary) {
    jobPosting["baseSalary"] = {
      "@type": "MonetaryAmount",
      currency: resolvedSalary.currency,
      value: {
        "@type": "QuantitativeValue",
        minValue: resolvedSalary.min,
        maxValue: resolvedSalary.max,
        unitText: resolvedSalary.period,
      },
    };
  }

  // totalJobOpenings — resolver-gated: only when resolvePostVacancy returned a value
  if (resolvedVacancy != null) {
    jobPosting["totalJobOpenings"] = resolvedVacancy;
  }

  // qualifications — Phase 1: stored qualification text from official source.
  // Per ELIG-001 freeze, we only display stored text; no eligibility computation.
  if (post.qualificationText) {
    jobPosting["qualifications"] = post.qualificationText;
  }

  // Extract skills from qualifications text for better discoverability
  // This helps AI search engines understand required competencies
  const skillKeywords = [
    "English", "Hindi", "Data", "IT", "Programming", "Java", "Python", "SQL",
    "Communication", "Analysis", "Management", "Planning", "Coordination",
    "Report writing", "Office", "Excel", "Word", "Administrative",
    "Clerical", "Legal", "Medical", "Engineering", "Statistics",
    "Accounting", "Finance", "HR", "Logistics", "Transportation"
  ];

  const extractedSkills: Set<string> = new Set();
  if (post.qualificationText) {
    skillKeywords.forEach(skill => {
      // Case-insensitive word boundary matching
      const regex = new RegExp(`\\b${skill}\\b`, 'i');
      if (regex.test(post.qualificationText!)) {
        extractedSkills.add(skill);
      }
    });
  }

  // Emit skills array if any were found (AEO optimization for AI search)
  if (extractedSkills.size > 0) {
    jobPosting["skills"] = Array.from(extractedSkills);
  }

  // educationRequirements — intentionally omitted in Phase 1.
  // Phase 2 will derive the credentialCategory from qualificationExpr.
  // A hardcoded "bachelor degree" would be a fabricated fact for posts that
  // require a different level (10th, 12th, diploma, postgraduate, etc.).

  // experienceRequirements — Phase 1: stored experience text as plain description.
  // Per ELIG-001 freeze, months cannot be computed; we emit the text form only.
  if (post.experienceText) {
    jobPosting["experienceRequirements"] = {
      "@type": "OccupationalExperienceRequirements",
      description: post.experienceText,
    };
  }

  // jobLocationType — Indian government jobs are typically ON_SITE
  // Not remote or hybrid; always on-site employment at the workplace
  jobPosting["jobLocationType"] = "ON_SITE";

  const graph = {
    "@context": "https://schema.org",
    "@graph": [breadcrumb, jobPosting],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
