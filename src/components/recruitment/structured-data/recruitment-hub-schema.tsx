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
 *   - expires: applicationEndDate is a legitimate temporal bound for the WebPage.
 *   - No fabricated/inferred data.
 */

import { SITE_URL } from "@/lib/site";

interface RecruitmentHubSchemaProps {
  recruitment: {
    slug: string;
    name: string;
    organizationName?: string | null;
    applicationEndDate?: Date | string | null;
  };
  totalPosts: number;
  resolvedEmployer?: string | null;
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

  // WebPage: the hub itself — describes this recruitment as a web document.
  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${hubUrl}#webpage`,
    url: hubUrl,
    name: recruitment.name,
    description: `${recruitment.name} — ${totalPosts} open position${totalPosts !== 1 ? "s" : ""}. View important dates and application details.`,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: "JobOye",
    },
    breadcrumb: { "@id": `${hubUrl}#breadcrumb` },
  };

  // Organization: link only when we have a canonical name.
  if (orgName) {
    webPage["about"] = {
      "@type": "Organization",
      name: orgName,
    };
  }

  // expires: applicationEndDate is a legitimate temporal bound for this page —
  // it is semantically "this page describes an opportunity that expires on this date."
  // Not dateModified — that would be semantically wrong per the approved spec.
  const expiresIso = toIso(recruitment.applicationEndDate);
  if (expiresIso) {
    webPage["expires"] = expiresIso;
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
