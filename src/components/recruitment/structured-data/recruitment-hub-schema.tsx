/**
 * Recruitment Hub Structured Data
 *
 * Emits schema.org/WebPage + BreadcrumbList for a Recruitment Hub page.
 *
 * Design principles (Gate 2 / approved spec):
 *   - Recruitment Hub is NOT a JobPosting. It is a WebPage that describes
 *     a recruitment event (a set of openings). Do not use JobPosting here.
 *   - Facts are recruitment-level only (name, organization, totalPosts).
 *   - BreadcrumbList: Jobs → [Org Name] → Recruitment Name (3 nodes when org is known).
 *   - dateModified: emitted ONLY when a genuine content-modification timestamp
 *     exists. Never derived from notificationDate, applicationEndDate, current
 *     date, or any unrelated timestamp.
 *   - expires / validThrough: applicationEndDate is a legitimate temporal bound.
 *   - datePosted: notificationDate is the closest honest proxy for content publication.
 *   - Organization.sameAs: wired to resolvedOfficialSource only when it is an
 *     authoritative domain (.gov.in / .nic.in). Never from raw officialSourceUrl.
 *   - No fabricated/inferred data.
 */

import { SITE_URL } from "@/lib/site";

interface RecruitmentHubSchemaProps {
  recruitment: {
    slug: string;
    name: string;
    organizationName?: string | null;
    applicationEndDate?: Date | string | null;
    notificationDate?: Date | string | null;
  };
  totalPosts: number;
  resolvedEmployer?: string | null;
  /** Resolved official source URL — used for Organization.sameAs when authoritative. */
  resolvedOfficialSource?: string | null;
  /** Resolved vacancy count — enriches WebPage description for GEO signals. */
  resolvedTotalVacancies?: number | null;
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
  resolvedEmployer,
  resolvedOfficialSource,
  resolvedTotalVacancies,
}: RecruitmentHubSchemaProps) {
  const hubUrl = `${SITE_URL}/jobs/${recruitment.slug}`;

  // Use resolvedEmployer (canonical, verified) when available; fall back to
  // raw organizationName only as a last resort. Both may be null.
  const orgName = resolvedEmployer ?? recruitment.organizationName ?? null;

  // BreadcrumbList: Jobs → [Org] → Recruitment (3 nodes when org is known)
  const breadcrumbItems: object[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Jobs",
      item: `${SITE_URL}/jobs`,
    },
  ];

  if (orgName) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: orgName,
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: recruitment.name,
      item: hubUrl,
    });
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: recruitment.name,
      item: hubUrl,
    });
  }

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${hubUrl}#breadcrumb`,
    itemListElement: breadcrumbItems,
  };

  // Enrich WebPage description with vacancy count when resolved — GEO signal.
  const vacancySnippet = resolvedTotalVacancies
    ? `${resolvedTotalVacancies.toLocaleString("en-IN")} vacancies · `
    : "";
  const webPageDescription = `${vacancySnippet}${recruitment.name} — ${totalPosts} open position${totalPosts !== 1 ? "s" : ""}. View important dates and application details.`;

  // WebPage: the hub itself — describes this recruitment as a web document.
  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${hubUrl}#webpage`,
    url: hubUrl,
    name: recruitment.name,
    description: webPageDescription,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: "JobOye",
    },
    breadcrumb: { "@id": `${hubUrl}#breadcrumb` },
  };

  // datePosted: notificationDate is the closest honest proxy for when this
  // recruitment was announced. Schema.org accepts it on WebPage. Helps GEO
  // engines understand content freshness.
  const datePostedIso = toIso(recruitment.notificationDate);
  if (datePostedIso) {
    webPage["datePosted"] = datePostedIso;
  }

  // Organization: identify the entity by name only. A recruitment-specific
  // notice/listing URL is not necessarily the organization's canonical identity
  // page, so never use it as Organization.sameAs.
  if (orgName) {
    webPage["about"] = {
      "@type": "Organization",
      name: orgName,
    };
  }

  // expires / validThrough: applicationEndDate is a legitimate temporal bound
  // for this page — "this page describes an opportunity that expires on this date."
  const expiresIso = toIso(recruitment.applicationEndDate);
  if (expiresIso) {
    webPage["expires"] = expiresIso;
    // validThrough is more widely understood by AI/GEO engines for job content.
    webPage["validThrough"] = expiresIso;
  }

  // dateModified: intentionally omitted.
  // Rule: emit ONLY when a genuine content-modification timestamp exists.
  // notificationDate, applicationEndDate, and current date are all disqualified.

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
