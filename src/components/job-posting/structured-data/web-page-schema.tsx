// @ts-nocheck
/**
 * WebPage Schema for Publication Metadata
 *
 * Signals to search engines:
 * - Page publication and modification dates
 * - Content type and description
 * - Breadcrumb navigation
 * - Author/Publisher information
 * - Content freshness (impacts ranking)
 *
 * Impact: Enables "freshness" ranking factor,
 * helps crawlers understand content structure,
 * powers "Last updated" SERP snippets
 */

import { JobPostingData } from "@/types/job-posting";
import { SITE_URL } from "@/lib/site";

interface WebPageSchemaProps {
  post: JobPostingData;
}

export default function WebPageSchema({ post }: WebPageSchemaProps) {
  const postUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`;
  const publishDate = post.postedAt ? new Date(post.postedAt).toISOString() : new Date().toISOString();
  const modifiedDate = post.updatedAt ? new Date(post.updatedAt).toISOString() : publishDate;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": postUrl,

    // ===== BASIC METADATA =====
    name: `${post.title} - Apply for ${post.organizationName}`,
    description: generatePageDescription(post),
    url: postUrl,

    // ===== PUBLICATION & MODIFICATION DATES =====
    datePublished: publishDate,
    dateModified: modifiedDate,

    // ===== CONTENT FRESHNESS =====
    // This impacts how often Google re-crawls the page
    ...(new Date(modifiedDate).getTime() > new Date().getTime() - 7 * 24 * 60 * 60 * 1000 && {
      isAccessibleForFree: true,
    }),

    // ===== AUTHOR & PUBLISHER =====
    author: {
      "@type": "Organization",
      name: "JobOye",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },

    publisher: {
      "@type": "Organization",
      name: "JobOye - Government Job Discovery Platform",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
        width: 250,
        height: 60,
      },
    },

    // ===== BREADCRUMB TRAIL =====
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
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
        {
          "@type": "ListItem",
          position: 3,
          name: post.organizationName,
          item: `${SITE_URL}/organizations/${post.organizationSlug || post.organizationId}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: post.title,
          item: postUrl,
        },
      ],
    },

    // ===== PAGE CONTENT QUALITY SIGNALS =====
    inLanguage: {
      "@type": "Language",
      name: "English",
      alternateName: "en",
    },

    isPartOf: {
      "@type": "Website",
      name: "JobOye - Government Job Discovery",
      url: SITE_URL,
    },

    // ===== MAIN ENTITY (the job posting) =====
    mainEntity: {
      "@type": "JobPosting",
      "@id": postUrl,
      title: post.title,
      hiringOrganization: {
        "@type": "Organization",
        name: post.organizationName,
      },
    },

    // ===== CONTENT FEATURES =====
    // Indicates what special features the page has
    ...(post.enrichment?.documents && post.enrichment.documents.length > 0 && {
      hasPart: {
        "@type": "Thing",
        name: "Document Requirements",
        description: "List of required documents for application",
      },
    }),

    ...(post.enrichment?.selectionProcess && post.enrichment.selectionProcess.length > 0 && {
      hasPart: [
        {
          "@type": "Thing",
          name: "Selection Process",
          description: "Multi-stage selection process details",
        },
      ],
    }),

    // ===== INTERACTION STATISTICS =====
    // Helps Google understand if page is relevant (if data available)
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/ViewAction",
      userInteractionCount: "0", // Will be updated dynamically if analytics available
    },

    // ===== LANGUAGE VARIANTS =====
    availableLanguage: ["en", "hi", "mr", "gu"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(webPageSchema, null, 2),
      }}
    />
  );
}

/**
 * HELPER: Generate compelling page description
 */
function generatePageDescription(post: JobPostingData): string {
  const vacancies = post.enrichment?.vacanciesByCategory
    ? Object.values(post.enrichment.vacanciesByCategory).reduce(
        (a: any, b: any) => (a as number) + (b as number),
        0
      )
    : "Multiple";

  const deadline = post.recruitmentApplicationEndDate
    ? new Date(post.recruitmentApplicationEndDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "See notification";

  const salary = post.legacySalaryMin
    ? `₹${post.legacySalaryMin}-${post.legacySalaryMax}/month`
    : "As per government norms";

  return (
    `Apply for ${post.title} position at ${post.organizationName}. ` +
    `${vacancies} vacancies in ${post.locationCity}, ${post.locationState}. ` +
    `Salary: ${salary}. Application deadline: ${deadline}. ` +
    `Check eligibility, documents, and selection process on this page.`
  );
}
