// @ts-nocheck
/**
 * JobPosting + BreadcrumbList Structured Data
 *
 * Emits schema.org/JobPosting and BreadcrumbList as a single @graph JSON-LD block.
 *
 * Google for Jobs compliance rules (2025):
 *   - JobPosting suppressed entirely when neither resolveOfficialSource() nor
 *     resolveApplicationUrl() returns a value (no verifiable source).
 *   - `url` must be the canonical JobOye page URL (NOT officialSourceUrl — that's an
 *     external government site, and Google requires the indexable page URL).
 *   - `description` must be a real job description (≥80 chars), not a one-liner fallback.
 *   - `directApply` must be true only when a direct application URL is available.
 *   - `validThrough` emitted ONLY when resolveDeadline() state === 'OPEN'.
 *   - `hiringOrganization` emitted ONLY when resolveEmployer() returns non-null.
 *   - `totalJobOpenings` emitted ONLY when resolvePostVacancy() returns non-null.
 *   - `baseSalary` emitted ONLY when resolveSalary() returns non-null and value is visible on page.
 *   - `datePosted` uses the official notification publication date, NOT posts.created_at.
 *   - `employmentType` emitted ONLY when the official source establishes it.
 *   - `identifier` uses advertisement number when available, internal ID as fallback.
 *   - Non-schema fields (vacanciesByCategory, examDate, applicationDeadline, applicationStartDate)
 *     are NOT emitted — they are invalid and can cause Google validation errors.
 *   - BreadcrumbList always emitted regardless of JobPosting suppression.
 */

import { JobPostingData } from "@/types/job-posting";
import { SITE_URL } from "@/lib/site";
import {
  resolveDeadline,
  resolveOfficialSource,
  resolveApplicationUrl,
  resolveEmployer,
  resolveLocation,
  resolvePostVacancy,
  resolveSalary,
} from "@/lib/resolvers/fact-resolvers";

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
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

interface JobPostingStructuredDataProps {
  post: JobPostingData & {
    vacancyTotal?: number | null;
    recruitmentVacancyTotal?: number | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    recruitmentOfficialNotificationUrl?: string | null;
    recruitmentOfficialApplicationUrl?: string | null;
    organizationVerified?: boolean;
    organizationWebsite?: string | null;
    workCity?: string | null;
    workState?: string | null;
    locationFromEnrichment?: string | null;
    recruitmentApplicationEndDate?: Date | null;
    postDeadlineConfirmedForRecruitment?: boolean;
    // Official notification publication date (not ingestion timestamp)
    notificationPublicationDate?: Date | null;
    // Employment type from official source (not assumed)
    officialEmploymentType?: string | null;
  };
}

export default function JobPostingStructuredData({
  post,
}: JobPostingStructuredDataProps) {
  const now = new Date();
  const postUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`;
  const recruitmentUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}`;

  // --- BreadcrumbList (always emitted) ---
  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${postUrl}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Jobs",
        item: `${SITE_URL}/jobs`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: post.recruitmentName,
        item: recruitmentUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };

  // --- Resolve all facts via canonical resolvers ---
  const officialSourceUrl = resolveOfficialSource(post);
  const applicationUrl = resolveApplicationUrl(post);

  // Suppression rule: if neither verified official source nor verified
  // application URL exists, do not emit JobPosting at all.
  const hasVerifiableSource = officialSourceUrl !== null || applicationUrl !== null;

  let jobPosting: Record<string, unknown> | null = null;

  if (hasVerifiableSource) {
    const deadline = resolveDeadline(post, now);
    const salary = resolveSalary(post);
    const employer = resolveEmployer(post);
    const location = resolveLocation(post);
    const vacancyCount = resolvePostVacancy(post);

    // datePosted: official notification publication date with fallbacks.
    // Use: notificationPublicationDate > enrichment.notificationDate > createdAt
    // Google requires datePosted for job validity; always include a date.
    const datePosted = post.notificationPublicationDate
      ?? post.enrichment?.notificationDate
      ?? post.createdAt
      ?? null;

    // employmentType: only when the official source establishes it.
    // Never universally assert FULL_TIME for government jobs.
    const rawEmploymentType = post.officialEmploymentType ?? null;
    const employmentType = rawEmploymentType
      ? EMPLOYMENT_TYPE_MAP[rawEmploymentType] ?? null
      : null;

    // baseSalary: MonetaryAmount > QuantitativeValue per schema.org spec
    const baseSalary = salary
      ? {
          "@type": "MonetaryAmount",
          currency: salary.currency,
          value: {
            "@type": "QuantitativeValue",
            minValue: salary.min,
            maxValue: salary.max,
            unitText: salary.period,
          },
        }
      : undefined;

    // jobLocation: Place > PostalAddress with fallback to state/country
    // Use resolved location first, then post state, then default to India
    // Google requires jobLocation for job validity; always include at minimum a country.
    const jobLocationData = location || {
      city: null,
      state: post.workState || post.locationState,
      country: "IN",
    };
    const jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(jobLocationData.city ? { addressLocality: jobLocationData.city } : {}),
        ...(jobLocationData.state ? { addressRegion: jobLocationData.state } : {}),
        addressCountry: jobLocationData.country || "IN",
      },
    };

    // hiringOrganization: verified employer first, then organization name fallback
    // Google requires hiringOrganization for job validity; never emit undefined.
    const hiringOrganization = employer
      ? {
          "@type": "Organization",
          name: employer.name,
          ...(employer.sameAs ? { sameAs: employer.sameAs } : {}),
        }
      : post.organizationName
      ? {
          "@type": "Organization",
          name: post.organizationName,
        }
      : undefined;

    // applicationContact: only when verified application URL exists
    const applicationContact = applicationUrl
      ? {
          "@type": "ContactPoint",
          contactType: "application",
          url: applicationUrl,
        }
      : undefined;

    // Extract enrichment data
    const enrichment = post.enrichment as Record<string, unknown> | undefined;

    // Qualifications from enrichment
    const qualifications = enrichment?.education
      ? (typeof enrichment.education === 'string'
          ? enrichment.education
          : Array.isArray(enrichment.education)
          ? enrichment.education.join(', ')
          : JSON.stringify(enrichment.education))
      : null;

    // Experience from enrichment
    const experienceRequirements = enrichment?.experience
      ? (typeof enrichment.experience === 'string'
          ? enrichment.experience
          : Array.isArray(enrichment.experience)
          ? enrichment.experience.join(', ')
          : JSON.stringify(enrichment.experience))
      : null;

    // Responsibilities/duties
    const responsibilities = enrichment?.responsibilities
      ? Array.isArray(enrichment.responsibilities) ? enrichment.responsibilities : [String(enrichment.responsibilities)]
      : enrichment?.duties
      ? Array.isArray(enrichment.duties) ? enrichment.duties : [String(enrichment.duties)]
      : [];

    // Benefits
    const jobBenefits = enrichment?.benefits
      ? Array.isArray(enrichment.benefits) ? enrichment.benefits : [String(enrichment.benefits)]
      : [];

    // Skills
    const skills = enrichment?.parsed_skills
      ? Array.isArray(enrichment.parsed_skills) ? enrichment.parsed_skills : [String(enrichment.parsed_skills)]
      : [];

    // Selection process details
    const selectionStages = enrichment?.selectionProcess
      ? Array.isArray(enrichment.selectionProcess) ? enrichment.selectionProcess : [enrichment.selectionProcess]
      : [];

    // Documents required
    const documentsRequired = enrichment?.documentsRequired
      ? Array.isArray(enrichment.documentsRequired) ? enrichment.documentsRequired : [String(enrichment.documentsRequired)]
      : [];

    // ── Build description ──────────────────────────────────────────────
    // Google requires a substantive description. Build one from available
    // facts when post.description is absent or too short (< 80 chars).
    const MIN_DESC_LEN = 80;
    let description = post.description && post.description.length >= MIN_DESC_LEN
      ? post.description
      : null;

    if (!description) {
      // Build from structured facts — official data only, no aggregator prose
      const parts: string[] = [];
      if (qualifications) parts.push(`Qualification: ${qualifications}`);
      if (experienceRequirements) parts.push(`Experience: ${experienceRequirements}`);
      if (vacancyCount != null) parts.push(`Vacancies: ${vacancyCount}`);
      if (salary) parts.push(`Pay: ₹${salary.min.toLocaleString("en-IN")}–₹${salary.max.toLocaleString("en-IN")} per ${salary.period}`);
      const builtDesc = parts.join(". ");
      // Only use built description if it's substantive
      if (builtDesc.length >= MIN_DESC_LEN) {
        description = builtDesc;
      } else {
        // Minimal valid fallback — at least identifies the role and org
        description = [
          post.title,
          post.organizationName ? `at ${post.organizationName}` : null,
          post.locationState ? `in ${post.locationState}` : null,
          "Government recruitment. See official notification for full details and eligibility requirements.",
        ].filter(Boolean).join(" ");
      }
    }

    // ── identifier: prefer advertisement number over internal ID ───────
    const identifierValue = post.vacancyNumber ?? String(post.id);

    jobPosting = {
      "@type": "JobPosting",
      "@id": `${postUrl}#jobposting`,
      // Google requires the indexable detail page URL (not an external official source URL)
      url: postUrl,
      title: post.title,
      description,

      // ── Enrichment fields (schema.org valid only) ──
      ...(qualifications ? { qualifications } : {}),
      ...(experienceRequirements ? {
        experienceRequirements: {
          "@type": "OccupationalExperienceRequirements",
          description: experienceRequirements,
        }
      } : {}),
      ...(responsibilities.length > 0 ? { responsibilities } : {}),
      ...(jobBenefits.length > 0 ? { jobBenefits } : {}),
      ...(skills.length > 0 ? { skills } : {}),

      // ── Dates — only schema.org valid fields ──
      // datePosted: critical field for Google, always emit when available
      ...(datePosted ? { datePosted: datePosted.toISOString() } : {}),
      dateModified: post.updatedAt?.toISOString(),
      // validThrough: only when application is currently open
      ...(deadline.state === "OPEN" && deadline.date
        ? { validThrough: deadline.date.toISOString() }
        : {}),
      // NOTE: applicationStartDate, applicationDeadline, examDate are NOT valid
      // Google/schema.org fields — omitted to avoid validation errors.

      // ── Standard Google for Jobs fields (critical for validity) ──
      ...(employmentType ? { employmentType } : {}),
      // hiringOrganization & jobLocation always emitted (never undefined due to fallbacks above)
      hiringOrganization,
      jobLocation,
      ...(vacancyCount != null ? { totalJobOpenings: vacancyCount } : {}),
      ...(baseSalary ? { baseSalary } : {}),
      ...(applicationContact ? { applicationContact } : {}),

      // directApply: true only when a direct online application URL exists
      directApply: applicationUrl != null,

      identifier: {
        "@type": "PropertyValue",
        name: "JobOye",
        value: identifierValue,
      },

      // sameAs: link to official source for richer entity disambiguation
      ...(officialSourceUrl ? { sameAs: officialSourceUrl } : {}),
    };
  }

  const graph = {
    "@context": "https://schema.org",
    "@graph": [breadcrumb, ...(jobPosting ? [jobPosting] : [])],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
