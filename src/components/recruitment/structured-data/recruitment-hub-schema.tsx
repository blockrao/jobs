/**
 * Recruitment Hub Structured Data
 *
 * Emits schema.org/WebPage + BreadcrumbList for a Recruitment Hub page.
 *
 * Design principles (Gate 2):
 *   - Recruitment Hub is NOT a JobPosting. It is a WebPage that describes
 *     a recruitment event (a set of openings). Do not use JobPosting here.
 *   - Facts are recruitment-level only (name, dates, organization, totalPosts).
 *   - BreadcrumbList: Home → Jobs → Recruitment Hub.
 *   - No fabricated/inferred data.
 */

import { SITE_URL } from "@/lib/site";

interface RecruitmentHubSchemaProps {
  recruitment: {
    slug: string;
    name: string;
    organizationName?: string | null;
    notificationDate?: Date | string | null;
    applicationStartDate?: Date | string | null;
    applicationEndDate?: Date | string | null;
  };
  totalPosts: number;
}

function toIso(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  try {
    return new Date(d).toISOString();
  } catch {
    return undefined;
  }
}

export default function RecruitmentHubStructuredData({
  recruitment,
  totalPosts,
}: RecruitmentHubSchemaProps) {
  const hubUrl = `${SITE_URL}/jobs/${recruitment.slug}`;

  // BreadcrumbList: Jobs → this hub
  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${hubUrl}#breadcrumb`,
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
        name: recruitment.name,
        item: hubUrl,
      },
    ],
  };

  // WebPage: the hub itself — describes this recruitment as a web document.
  // Use SpecialAnnouncement or CollectionPage where applicable;
  // WebPage is the safest base type for a recruitment overview.
  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${hubUrl}#webpage`,
    url: hubUrl,
    name: recruitment.name,
    description: `${recruitment.name} — ${totalPosts} open position${totalPosts !== 1 ? "s" : ""}. View eligibility, important dates, and application details.`,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: "JobOye",
    },
  };

  // Optional: link to the organization if we have its name
  if (recruitment.organizationName) {
    webPage["about"] = {
      "@type": "Organization",
      name: recruitment.organizationName,
    };
  }

  // Optional: temporal scope (notification / application window)
  if (recruitment.notificationDate) {
    webPage["datePublished"] = toIso(recruitment.notificationDate);
  }
  if (recruitment.applicationEndDate) {
    webPage["expires"] = toIso(recruitment.applicationEndDate);
  }

  const graph = {
    "@context": "https://schema.org",
    "@graph": [breadcrumb, webPage],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
