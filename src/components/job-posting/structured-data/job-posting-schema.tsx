/**
 * JobPosting Schema.org Structured Data
 * Generates JSON-LD for search engine indexing
 */

import { JobPostingData } from "@/types/job-posting";

interface JobPostingStructuredDataProps {
  post: JobPostingData;
}

export default function JobPostingStructuredData({
  post,
}: JobPostingStructuredDataProps) {
  const enrichment = post.enrichment;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.joboye.com";
  const postUrl = `${siteUrl}/jobs/${post.recruitmentSlug}/${post.slug}`;

  const schema = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: post.title,
    description: post.description || `${post.title} at ${post.organizationName}`,
    datePosted: post.postedAt,
    validThrough: enrichment?.applicationClosingDate,
    employmentType: "PERMANENT",
    hiringOrganization: {
      "@type": "Organization",
      name: post.organizationName,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "IN",
      },
    },
    baseSalary:
      enrichment?.salaryMin || enrichment?.salaryMax
        ? {
            "@type": "PriceSpecification",
            priceCurrency: "INR",
            price: enrichment?.salaryMin || enrichment?.salaryMax,
            ...(enrichment?.salaryMax && {
              maxPrice: enrichment.salaryMax,
            }),
          }
        : undefined,
    jobBenefits:
      enrichment?.benefits && enrichment.benefits.length > 0
        ? enrichment.benefits
        : undefined,
    applicantLocationRequirements: {
      "@type": "Country",
      name: "IN",
    },
    url: postUrl,
    ...(enrichment?.vacanciesTotal && {
      "hiringOrganization.numberOfEmployees": enrichment.vacanciesTotal,
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
