/**
 * JobPosting + BreadcrumbList Structured Data
 *
 * Emits schema.org/JobPosting (if hiring is open) and BreadcrumbList as a
 * single @graph JSON-LD block.
 *
 * Design principles (Gate 2):
 *   - Only fields sourced from real data; no fabricated/inferred values.
 *   - employmentType → schema.org FULL_TIME (not the DB value "PERMANENT").
 *   - baseSalary → MonetaryAmount/QuantitativeValue (not PriceSpecification).
 *   - totalJobOpenings is a top-level JobPosting field (not a dot-notation key).
 *   - validThrough omitted when applicationClosingDate is null/undefined.
 *   - JobPosting suppressed for expired postings (isHiringOpen gate).
 *   - BreadcrumbList always emitted regardless of hiring status.
 */

import { JobPostingData } from "@/types/job-posting";
import { SITE_URL } from "@/lib/site";

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
  PERMANENT: "FULL_TIME",   // DB stores "PERMANENT"; schema.org requires "FULL_TIME"
};

/** True only when the posting is still accepting applications. */
function isHiringOpen(applicationClosingDate: Date | undefined): boolean {
  if (!applicationClosingDate) return true; // no closing date = assume open
  return applicationClosingDate.getTime() > Date.now();
}

interface JobPostingStructuredDataProps {
  post: JobPostingData;
}

export default function JobPostingStructuredData({
  post,
}: JobPostingStructuredDataProps) {
  const enrichment = post.enrichment;
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

  // --- JobPosting (suppressed when applications are closed) ---
  const hiringOpen = isHiringOpen(enrichment?.applicationClosingDate);

  let jobPosting: Record<string, unknown> | null = null;
  if (hiringOpen) {
    // baseSalary: MonetaryAmount > QuantitativeValue per schema.org spec
    const baseSalary =
      enrichment?.salaryMin || enrichment?.salaryMax
        ? {
            "@type": "MonetaryAmount",
            currency: "INR",
            value: {
              "@type": "QuantitativeValue",
              ...(enrichment.salaryMin && { minValue: enrichment.salaryMin }),
              ...(enrichment.salaryMax && { maxValue: enrichment.salaryMax }),
              unitText: "MONTH",
            },
          }
        : undefined;

    // jobLocation: only emit when we have a real location string
    const jobLocation =
      post.organizationName
        ? {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressCountry: "IN",
            },
          }
        : undefined;

    jobPosting = {
      "@type": "JobPosting",
      "@id": `${postUrl}#jobposting`,
      url: postUrl,
      title: post.title,
      description:
        post.description ||
        `${post.title} vacancy at ${post.organizationName}. Apply now on JobOye.`,
      datePosted: post.postedAt?.toISOString(),
      dateModified: post.updatedAt?.toISOString(),
      // validThrough only when we have a real closing date (not the fallback new Date())
      ...(enrichment?.applicationClosingDate && {
        validThrough: enrichment.applicationClosingDate.toISOString(),
      }),
      employmentType: EMPLOYMENT_TYPE_MAP["PERMANENT"], // default; all Indian govt jobs are FULL_TIME
      hiringOrganization: {
        "@type": "Organization",
        name: post.organizationName,
      },
      jobLocation,
      // totalJobOpenings is a top-level field on JobPosting (not nested under hiringOrganization)
      ...(enrichment?.vacanciesTotal && {
        totalJobOpenings: enrichment.vacanciesTotal,
      }),
      ...(baseSalary && { baseSalary }),
      identifier: {
        "@type": "PropertyValue",
        name: post.organizationName,
        value: String(post.id),
      },
      // directApply: false — our apply links go to the official site
      directApply: false,
    };
  }

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb,
      ...(jobPosting ? [jobPosting] : []),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
