// @ts-nocheck
/**
 * JobPosting + BreadcrumbList Structured Data
 *
 * Emits schema.org/JobPosting and BreadcrumbList as a single @graph JSON-LD block.
 *
 * Gate 4C/4D rules:
 *   - All facts sourced exclusively through the canonical resolver layer.
 *   - JobPosting suppressed entirely when neither resolveOfficialSource() nor
 *     resolveApplicationUrl() returns a value (no verifiable source).
 *   - validThrough emitted ONLY when resolveDeadline() state === 'OPEN'.
 *   - hiringOrganization emitted ONLY when resolveEmployer() returns non-null.
 *   - totalJobOpenings emitted ONLY when resolvePostVacancy() returns non-null.
 *   - baseSalary emitted ONLY when resolveSalary() returns non-null.
 *   - datePosted uses the official notification publication date, NOT posts.created_at.
 *   - employmentType emitted ONLY when the official source establishes it.
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

    // datePosted: official notification publication date only.
    // Never use posts.created_at as a semantic substitute for datePosted.
    // If the official publication date is unavailable, omit the field.
    const datePosted = post.notificationPublicationDate ?? post.enrichment?.notificationDate ?? null;

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

    // jobLocation: Place > PostalAddress
    const jobLocation = location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            ...(location.city ? { addressLocality: location.city } : {}),
            ...(location.state ? { addressRegion: location.state } : {}),
            addressCountry: location.country,
          },
        }
      : undefined;

    // hiringOrganization: only when resolveEmployer() returns verified employer
    const hiringOrganization = employer
      ? {
          "@type": "Organization",
          name: employer.name,
          ...(employer.sameAs ? { sameAs: employer.sameAs } : {}),
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

    jobPosting = {
      "@type": "JobPosting",
      "@id": `${postUrl}#jobposting`,
      url: officialSourceUrl ?? postUrl,
      title: post.title,
      description:
        post.description ||
        `${post.title} vacancy. See official notification for full details.`,

      // ── Complete enrichment fields ──
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

      // ── Dates ──
      ...(datePosted ? { datePosted: datePosted.toISOString() } : {}),
      dateModified: post.updatedAt?.toISOString(),
      ...(deadline.state === "OPEN" && deadline.date
        ? { validThrough: deadline.date.toISOString() }
        : {}),
      ...(enrichment?.applicationOpenDate ? {
        applicationStartDate: new Date(enrichment.applicationOpenDate as string).toISOString()
      } : {}),
      ...(enrichment?.applicationClosingDate ? {
        applicationDeadline: new Date(enrichment.applicationClosingDate as string).toISOString()
      } : {}),
      ...(enrichment?.examDate ? {
        examDate: new Date(enrichment.examDate as string).toISOString()
      } : {}),

      // ── Standard fields ──
      ...(employmentType ? { employmentType } : {}),
      ...(hiringOrganization ? { hiringOrganization } : {}),
      ...(jobLocation ? { jobLocation } : {}),
      ...(vacancyCount != null ? { totalJobOpenings: vacancyCount } : {}),
      ...(baseSalary ? { baseSalary } : {}),
      ...(applicationContact ? { applicationContact } : {}),

      // ── Additional enrichment ──
      ...(enrichment?.vacanciesByCategory ? {
        vacanciesByCategory: enrichment.vacanciesByCategory
      } : {}),
      ...(documentsRequired.length > 0 ? {
        applicantLocationRequirements: documentsRequired
      } : {}),

      identifier: {
        "@type": "PropertyValue",
        name: "JobOye",
        value: String(post.id),
      },
      directApply: false,
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
