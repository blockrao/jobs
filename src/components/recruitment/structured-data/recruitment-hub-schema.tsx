/**
 * Recruitment Hub Structured Data
 *
 * Emits a schema.org @graph for a Recruitment Hub page:
 *   - WebPage — describes this hub page as a web document
 *   - BreadcrumbList — site hierarchy for rich results
 *   - ItemList — structured list of every Post leaf URL, enabling Google
 *     and LLMs to discover all leaf pages from this hub's JSON-LD
 *
 * Design principles (Gate 2 / approved spec, updated 2026-10-12):
 *   - Recruitment Hub is NOT a JobPosting. It is a WebPage that describes
 *     a recruitment event (a set of openings). Do not use JobPosting here.
 *   - BreadcrumbList: Jobs → [Org Name] → Recruitment Name (3 nodes when org is known).
 *   - ItemList: one ListItem per resolved Post, with @id pointing to the leaf URL.
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

  // ── BreadcrumbList ────────────────────────────────────────────────────────
  // Jobs → [Org] → Recruitment (3 nodes when org is known)
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

  // ── ItemList ──────────────────────────────────────────────────────────────
  // One ListItem per resolved Post slug. This is the primary GEO/LLM discoverability
  // signal: Google and LLMs can resolve every leaf URL from this hub's JSON-LD
  // without a crawl hop, dramatically improving leaf indexing.
  const resolvedPosts = posts.filter((p) => Boolean(p.slug));
  let itemList: object | undefined;
  if (resolvedPosts.length > 0) {
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
    },
    breadcrumb: { "@id": `${hubUrl}#breadcrumb` },
    ...(itemList ? { mainEntity: { "@id": `${hubUrl}#postlist` } } : {}),
  };

  // datePosted — best honest proxy for when this recruitment was announced.
  // Verified hubs: notificationDate. Unverified: sourceListingPublishedDate.
  const datePostedIso = factsVerified
    ? toIso(recruitment.notificationDate)
    : toIso(recruitment.sourceListingPublishedDate);
  if (datePostedIso) {
    webPage["datePosted"] = datePostedIso;
  }

  // dateModified — emit only when a genuine update timestamp exists.
  const dateModifiedIso = toIso(recruitment.updatedAt);
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
  const graphNodes: object[] = [breadcrumb, webPage];
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
