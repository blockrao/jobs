/**
 * Recruitment Hub Structured Data
 *
 * Emits a schema.org @graph for a Recruitment Hub page:
 *   - Organization — site identity node (JobOye)
 *   - BreadcrumbList — Home → Jobs → [Org] → Recruitment
 *   - Article — describes this hub as an editorial article about the recruitment
 *   - WebPage — describes this hub page as a web document
 *   - ItemList — structured list of every Post leaf URL, enabling Google
 *     and LLMs to discover all leaf pages from this hub's JSON-LD
 *
 * Design principles (Gate 2 / approved spec, updated 2026-10-12):
 *   - Recruitment Hub is NOT a JobPosting. It is a WebPage that describes
 *     a recruitment event (a set of openings). Do not use JobPosting here.
 *   - BreadcrumbList: Home → Jobs → [Org Name] → Recruitment Name (4 nodes when
 *     org is known, 3 nodes otherwise). Home must be position 1 per reference spec.
 *   - Article: editorial content node; isBasedOn = official notification.
 *     Enables Google to surface rich article results for recruitment coverage.
 *   - ItemList: one ListItem per resolved Post, with url ONLY for posts that have
 *     a confirmed post slug. Items without a leaf page omit url entirely.
 *     This is the highest-impact GEO/LLM signal — makes every leaf discoverable
 *     from hub JSON-LD without a crawl hop.
 *   - dateModified: emitted ONLY when a genuine content-modification timestamp
 *     exists. Never derived from notificationDate, applicationEndDate, current
 *     date, or any unrelated timestamp.
 *   - expires / validThrough: applicationEndDate is a legitimate temporal bound.
 *   - datePosted: notificationDate (verified) or sourceListingPublishedDate
 *     (unverified) — the closest honest proxy for content publication date.
 *   - Organization.sameAs: wired to resolvedOfficialSource only when it is an
 *     authoritative domain (.gov.in / .nic.in). Never from raw officialSourceUrl.
 *   - No fabricated/inferred data.
 */

import { SITE_URL } from "@/lib/site";

/** Minimal post shape needed for structured data — name + slug only. */
interface PostForSchema {
  slug: string | null | undefined;
  name?: string | null;
}

interface RecruitmentHubSchemaProps {
  recruitment: {
    slug: string;
    name: string;
    organizationName?: string | null;
    applicationEndDate?: Date | string | null;
    notificationDate?: Date | string | null;
    sourceVerificationStatus?: string | null;
    sourceListingPublishedDate?: Date | string | null;
    updatedAt?: Date | string | null;
  };
  /** All posts belonging to this recruitment — used to build ItemList. */
  posts?: PostForSchema[];
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
    const ts = new Date(d);
    if (isNaN(ts.getTime()) || ts.getTime() <= 0) return undefined;
    return ts.toISOString();
  } catch {
    return undefined;
  }
}

/** Returns true when the URL points to an authoritative Indian government domain. */
function isAuthoritativeDomain(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".gov.in") || host.endsWith(".nic.in");
  } catch {
    return false;
  }
}

export default function RecruitmentHubStructuredData({
  recruitment,
  posts = [],
  totalPosts,
  resolvedEmployer,
  resolvedOfficialSource,
  resolvedTotalVacancies,
}: RecruitmentHubSchemaProps) {
  const hubUrl = `${SITE_URL}/jobs/${recruitment.slug}`;

  // Use resolvedEmployer (canonical, verified) when available; fall back to
  // raw organizationName only as a last resort. Both may be null.
  const orgName = resolvedEmployer ?? recruitment.organizationName ?? null;

  const factsVerified = recruitment.sourceVerificationStatus === "VERIFIED";

  // ── Organization site-identity node ──────────────────────────────────────
  // Identifies JobOye as the publisher. Referenced by Article.publisher.
  const siteOrg = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: "JobOye",
    url: SITE_URL,
  };

  // ── BreadcrumbList ────────────────────────────────────────────────────────
  // Home → Jobs → [Org] → Recruitment (4 nodes when org is known, 3 otherwise)
  // Home is always position 1 per reference spec requirement.
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

  if (orgName) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: orgName,
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 4,
      name: recruitment.name,
      item: hubUrl,
    });
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: recruitment.name,
      item: hubUrl,
    });
  }

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${hubUrl}#breadcrumb`,
    itemListElement: breadcrumbItems,
  };

  // ── datePosted — best honest proxy ────────────────────────────────────────
  // Verified hubs: notificationDate. Unverified: sourceListingPublishedDate.
  const datePostedIso = factsVerified
    ? toIso(recruitment.notificationDate)
    : toIso(recruitment.sourceListingPublishedDate);

  // dateModified — emit only when a genuine update timestamp exists.
  const dateModifiedIso = toIso(recruitment.updatedAt);

  // ── Article node ──────────────────────────────────────────────────────────
  // Describes this hub page as an editorial article about a recruitment.
  // This enables Google to surface article-rich results for recruitment coverage.
  const article: Record<string, unknown> = {
    "@type": "Article",
    "@id": `${hubUrl}#article`,
    mainEntityOfPage: `${hubUrl}#webpage`,
    headline: recruitment.name,
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}/#org` },
    isPartOf: { "@id": `${hubUrl}#webpage` },
  };

  if (datePostedIso) {
    article["datePublished"] = datePostedIso;
  }
  if (dateModifiedIso && dateModifiedIso !== datePostedIso) {
    article["dateModified"] = dateModifiedIso;
  }

  // about — the employer organization
  if (orgName) {
    const aboutOrg: Record<string, unknown> = {
      "@type": "Organization",
      name: orgName,
    };
    if (isAuthoritativeDomain(resolvedOfficialSource)) {
      aboutOrg["sameAs"] = resolvedOfficialSource;
    }
    article["about"] = aboutOrg;
  }

  // isBasedOn — official notification, when we have an authoritative source URL
  if (resolvedOfficialSource) {
    article["isBasedOn"] = {
      "@type": "CreativeWork",
      url: resolvedOfficialSource,
      ...(orgName ? { publisher: { "@type": "Organization", name: orgName } } : {}),
    };
  }

  // ── ItemList ──────────────────────────────────────────────────────────────
  // One ListItem per resolved Post slug. ONLY posts with a confirmed slug get a
  // url field — posts without a leaf page must not have a url in ItemList.
  const resolvedPosts = posts.filter((p) => Boolean(p.slug));
  const allPosts = posts; // includes unresolved ones for name-only entries
  let itemList: object | undefined;

  if (allPosts.length > 0) {
    itemList = {
      "@type": "ItemList",
      "@id": `${hubUrl}#postlist`,
      name: `${recruitment.name} — Available Posts`,
      numberOfItems: allPosts.length,
      itemListElement: allPosts.map((post, i) => {
        const item: Record<string, unknown> = {
          "@type": "ListItem",
          position: i + 1,
          name: post.name ?? post.slug ?? `Post ${i + 1}`,
        };
        // Only add url when the post has a confirmed slug (leaf page exists)
        if (post.slug) {
          item["url"] = `${SITE_URL}/jobs/${recruitment.slug}/${post.slug}`;
        }
        return item;
      }),
    };
  } else if (resolvedPosts.length > 0) {
    // Fallback: only resolved posts if allPosts was empty but resolvedPosts is not
    itemList = {
      "@type": "ItemList",
      "@id": `${hubUrl}#postlist`,
      name: `${recruitment.name} — Available Posts`,
      numberOfItems: resolvedPosts.length,
      itemListElement: resolvedPosts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: post.name ?? post.slug,
        url: `${SITE_URL}/jobs/${recruitment.slug}/${post.slug}`,
      })),
    };
  }

  // ── WebPage ───────────────────────────────────────────────────────────────
  // Enrich description with vacancy count — GEO signal.
  const vacancySnippet = resolvedTotalVacancies
    ? `${resolvedTotalVacancies.toLocaleString("en-IN")} ${factsVerified ? "vacancies" : "reported vacancies"} · `
    : "";
  const positionsSnippet = factsVerified
    ? `${totalPosts} open position${totalPosts !== 1 ? "s" : ""}`
    : `${totalPosts} listed position${totalPosts !== 1 ? "s" : ""}`;
  const webPageDescription = `${vacancySnippet}${recruitment.name} — ${positionsSnippet}. View available details and official-source status.`;

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
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    breadcrumb: { "@id": `${hubUrl}#breadcrumb` },
    ...(itemList ? { mainEntity: { "@id": `${hubUrl}#postlist` } } : {}),
  };

  if (datePostedIso) {
    webPage["datePublished"] = datePostedIso;
  }

  if (dateModifiedIso && dateModifiedIso !== datePostedIso) {
    webPage["dateModified"] = dateModifiedIso;
  }

  // about.Organization — identify the employer by name.
  // Organization.sameAs: only when resolvedOfficialSource points to a
  // government domain — those are organizational identity URLs, not notices.
  if (orgName) {
    const orgNode: Record<string, unknown> = {
      "@type": "Organization",
      name: orgName,
    };
    if (isAuthoritativeDomain(resolvedOfficialSource)) {
      orgNode["sameAs"] = resolvedOfficialSource;
    }
    webPage["about"] = orgNode;
  }

  // expires / validThrough — applicationEndDate is a legitimate temporal bound.
  // Only emit on verified hubs to avoid surfacing inaccurate reported dates in SERP.
  const expiresIso = factsVerified ? toIso(recruitment.applicationEndDate) : undefined;
  if (expiresIso) {
    webPage["expires"] = expiresIso;
    webPage["validThrough"] = expiresIso;
  }

  // ── @graph ────────────────────────────────────────────────────────────────
  const graphNodes: object[] = [siteOrg, breadcrumb, article, webPage];
  if (itemList) graphNodes.push(itemList);

  const graph = {
    "@context": "https://schema.org",
    "@graph": graphNodes,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
