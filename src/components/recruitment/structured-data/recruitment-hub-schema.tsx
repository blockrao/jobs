/**
 * Recruitment Hub Structured Data
 *
 * One schema.org @graph for /jobs/[recruitment-slug]:
 *   - Organization   — site identity (JobOye), referenced as publisher
 *   - BreadcrumbList — Home › Jobs › Org (only when an org page URL exists) › Recruitment
 *   - Article        — headline = page H1; datePublished / dateModified; about; isBasedOn
 *   - WebPage        — the hub page itself
 *   - FAQPage        — exactly the FAQ items rendered on the page
 *   - JobPosting     — ONLY when the recruitment has exactly one post
 *
 * Nothing is emitted that is not visible on the page. Every value is taken
 * from the same HubData the renderer uses, so the markup cannot drift from
 * the visible facts. dateModified is emitted only from a genuine updatedAt.
 * datePosted keys on source verification (notificationDate when verified,
 * sourceListingPublishedDate when not); the JobPosting datePosted falls back
 * to createdAt (first published on JobOye), and no JobPosting is emitted once
 * the application end date has passed. baseSalary is emitted only when numeric bounds exist on the
 * post AND the pay period is stated on the post's payLevel record
 * (posts.salary_min/max carry no unit column); a free-text pay level never
 * becomes a MonetaryAmount.
 */

import { SITE_URL } from "@/lib/site";
import { jsonLdGraph } from "@/lib/structured-data";
import type { HubData } from "../sections/types";

interface RecruitmentHubSchemaProps {
  data: HubData;
}

function toIso(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  try {
    const ts = new Date(d);
    if (isNaN(ts.getTime()) || ts.getTime() <= 0) return undefined;
    const y = ts.getUTCFullYear();
    if (y < 1900 || y >= 2090) return undefined;
    return ts.toISOString();
  } catch {
    return undefined;
  }
}

function isAuthoritativeDomain(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".gov.in") || host.endsWith(".nic.in");
  } catch {
    return false;
  }
}

const EMPLOYMENT_TYPE_SCHEMA: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACTOR: "CONTRACTOR",
  TEMPORARY: "TEMPORARY",
  INTERN: "INTERN",
  INTERNSHIP: "INTERN",
  APPRENTICESHIP: "INTERN",
  PERMANENT: "FULL_TIME",
};

const SALARY_UNITS: Record<string, string> = {
  MONTH: "MONTH", MONTHLY: "MONTH", PM: "MONTH", "PER MONTH": "MONTH",
  YEAR: "YEAR", YEARLY: "YEAR", ANNUAL: "YEAR", "PER ANNUM": "YEAR", PA: "YEAR",
  DAY: "DAY", DAILY: "DAY", HOUR: "HOUR", HOURLY: "HOUR", WEEK: "WEEK",
};

/** Google-valid unitText only when the stored pay-level record states a period. */
function salaryUnit(payLevel: Record<string, unknown> | null | undefined): string | null {
  const raw = payLevel?.period ?? payLevel?.unit ?? payLevel?.salaryPeriod;
  if (typeof raw !== "string") return null;
  return SALARY_UNITS[raw.trim().toUpperCase()] ?? null;
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default function RecruitmentHubStructuredData({ data }: RecruitmentHubSchemaProps) {
  const { recruitment, posts } = data;
  const hubUrl = `${SITE_URL}/jobs/${data.slug}`;
  const factsVerified = recruitment.sourceVerificationStatus === "VERIFIED";
  const orgName = data.orgName;
  const orgUrl = data.orgHref ? `${SITE_URL}${data.orgHref}` : null;
  const officialSite = data.officialWebsiteUrl ?? data.notificationUrl ?? null;

  // ── Organization (site identity) ─────────────────────────────────────────
  const siteOrg = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: "JobOye",
    url: SITE_URL,
  };

  // ── BreadcrumbList ───────────────────────────────────────────────────────
  const crumbs: Array<{ name: string; item: string }> = [
    { name: "Home", item: SITE_URL },
    { name: "Jobs", item: `${SITE_URL}/jobs` },
  ];
  if (orgName && orgUrl) crumbs.push({ name: orgName, item: orgUrl });
  crumbs.push({ name: recruitment.name, item: hubUrl });
  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${hubUrl}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
  };

  // ── Dates ────────────────────────────────────────────────────────────────
  // Verified: the notification date. Unverified: the source listing's own
  // publish date. Neither on record: the date this hub record was created,
  // which is a genuine publication date for the page itself.
  const datePostedIso = factsVerified
    ? toIso(recruitment.notificationDate)
    : toIso(recruitment.sourceListingPublishedDate) ?? toIso(recruitment.createdAt);
  const dateModifiedIso = toIso(recruitment.updatedAt);

  // ── Employer organization (about) ────────────────────────────────────────
  const employer: Record<string, unknown> | null = orgName
    ? {
        "@type": "Organization",
        name: orgName,
        ...(isAuthoritativeDomain(officialSite) ? { sameAs: officialSite } : {}),
      }
    : null;

  // ── Article ──────────────────────────────────────────────────────────────
  const article: Record<string, unknown> = {
    "@type": "Article",
    "@id": `${hubUrl}#article`,
    mainEntityOfPage: `${hubUrl}#webpage`,
    headline: data.heading,
    description: data.description,
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}/#org` },
    isPartOf: { "@id": `${hubUrl}#webpage` },
  };
  if (datePostedIso) article.datePublished = datePostedIso;
  if (dateModifiedIso) article.dateModified = dateModifiedIso;
  if (employer) article.about = employer;
  if (data.notificationUrl) {
    article.isBasedOn = {
      "@type": "CreativeWork",
      url: data.notificationUrl,
      ...(orgName ? { publisher: { "@type": "Organization", name: orgName } } : {}),
    };
  }

  // ── WebPage ──────────────────────────────────────────────────────────────
  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${hubUrl}#webpage`,
    url: hubUrl,
    name: data.title,
    description: data.description,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: "JobOye",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    breadcrumb: { "@id": `${hubUrl}#breadcrumb` },
  };
  if (datePostedIso) webPage.datePublished = datePostedIso;
  if (dateModifiedIso) webPage.dateModified = dateModifiedIso;
  if (employer) webPage.about = employer;
  const expiresIso = factsVerified ? toIso(recruitment.applicationEndDate) : undefined;
  if (expiresIso) webPage.expires = expiresIso;

  // ── FAQPage (exactly the visible FAQ) ────────────────────────────────────
  const faqPage = data.faqItems.length > 0
    ? {
        "@type": "FAQPage",
        "@id": `${hubUrl}#faq`,
        mainEntity: data.faqItems.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }
    : null;

  // ── JobPosting (single-post recruitments only) ───────────────────────────
  let jobPosting: Record<string, unknown> | null = null;
  if (posts.length === 1 && data.postRows.length === 1) {
    const post = posts[0];
    const row = data.postRows[0];
    const paragraphs: string[] = [];
    if (row.qualification) paragraphs.push(`<p>Qualification: ${escapeHtml(row.qualification)}</p>`);
    if (row.experience) paragraphs.push(`<p>Experience: ${escapeHtml(row.experience)}</p>`);
    for (const t of data.ageTexts) paragraphs.push(`<p>Age: ${escapeHtml(t)}</p>`);
    if (row.pay) paragraphs.push(`<p>Pay: ${escapeHtml(row.pay)}</p>`);
    if (data.feeRows.length > 0) {
      paragraphs.push(`<p>Application fee: ${escapeHtml(data.feeRows.map((f) => `${f.category}: ${f.amount}`).join("; "))}</p>`);
    } else if (data.feeSummary ?? data.feeNote) {
      paragraphs.push(`<p>Application fee: ${escapeHtml((data.feeSummary ?? data.feeNote) as string)}</p>`);
    }
    if (data.howToApply.length > 0) {
      paragraphs.push(`<p>How to apply: ${escapeHtml(data.howToApply.join(" "))}</p>`);
    }
    // datePosted: the notification's publication date when known, otherwise
    // the date this page was first published on JobOye (same rule as post pages).
    const jobDatePosted = toIso(recruitment.notificationDate) ?? toIso(recruitment.createdAt);
    const validThrough = toIso(recruitment.applicationEndDate);
    const postingClosed = validThrough != null && new Date(validThrough).getTime() < Date.now();
    const employmentType = EMPLOYMENT_TYPE_SCHEMA[(recruitment.employmentType ?? "").toUpperCase()];

    if (paragraphs.length > 0 && jobDatePosted && orgName && !postingClosed) {
      jobPosting = {
        "@type": "JobPosting",
        "@id": `${hubUrl}#jobposting`,
        mainEntityOfPage: { "@id": `${hubUrl}#webpage` },
        title: row.name,
        description: paragraphs.join(""),
        datePosted: jobDatePosted,
        hiringOrganization: {
          "@type": "Organization",
          name: orgName,
          ...(isAuthoritativeDomain(officialSite) ? { sameAs: officialSite } : {}),
        },
        jobLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            ...(data.state ? { addressRegion: data.state.name } : {}),
            addressCountry: "IN",
          },
        },
        directApply: false,
      };
      if (validThrough) jobPosting.validThrough = validThrough;
      if (employmentType) jobPosting.employmentType = employmentType;
      if (data.totalVacancies != null) jobPosting.totalJobOpenings = data.totalVacancies;
      if (data.notificationNumber) {
        jobPosting.identifier = { "@type": "PropertyValue", name: "Advertisement number", value: data.notificationNumber };
      }
      const unit = salaryUnit(post.payLevel);
      if (unit && (post.salaryMin != null || post.salaryMax != null)) {
        const value: Record<string, unknown> = { "@type": "QuantitativeValue", unitText: unit };
        if (post.salaryMin != null) value.minValue = post.salaryMin;
        if (post.salaryMax != null) value.maxValue = post.salaryMax;
        jobPosting.baseSalary = { "@type": "MonetaryAmount", currency: "INR", value };
      }
    }
  }

  const graph = jsonLdGraph(siteOrg, breadcrumb, article, webPage, faqPage, jobPosting);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
