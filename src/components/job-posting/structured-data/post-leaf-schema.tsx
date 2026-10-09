/**
 * Post Leaf Structured Data
 *
 * Emits schema.org/JobPosting + BreadcrumbList for an individual Post Leaf page.
 *
 * Design principles (architecture freeze 2026-10-09):
 *   - JobPosting belongs ONLY on Leaf pages (/jobs/{recruitment-slug}/{post-slug}).
 *     Never emit JobPosting on Hub pages — Google's guidelines forbid it on
 *     listing/aggregation pages.
 *   - All monetary and vacancy facts are resolver-gated: only values that passed
 *     the Gate 4C/4D resolver pipeline (resolvedSalary, resolvedVacancy) are
 *     emitted. Raw DB columns are never accessed directly here.
 *   - Eligibility facts (qualification, experience) are Phase 2 territory and
 *     intentionally omitted from JSON-LD per ELIG-001 deferral.
 *   - hiringOrganization: uses post.organizationName (display-quality) because
 *     the resolver for employer (resolveEmployer) requires an explicit
 *     organizationVerified flag that does not exist yet. The name is real; only
 *     the verification flag is absent. We emit as-is rather than omit entirely,
 *     consistent with resolveRecruitmentEmployer's Phase 1 behaviour.
 *   - directApply: always false — JobOye links to official portals and never
 *     processes applications on-site.
 *   - No fabricated/inferred facts. Null = omit, never substitute.
 */

import { SITE_URL } from "@/lib/site";
import type { ResolvedDeadline, ResolvedSalary } from "@/lib/resolvers/fact-resolvers";

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACTOR",
  CONTRACTUAL: "CONTRACTOR",
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

interface PostLeafSchemaProps {
  post: {
    id: number | string;
    title: string;
    slug: string;
    description?: string | null;
    organizationName?: string | null;
    recruitmentSlug: string;
    recruitmentName?: string | null;
    employmentType?: string | null;
    locationCity?: string | null;
    locationState?: string | null;
    notificationPublicationDate?: Date | null;
    postedAt?: Date | null;
    updatedAt?: Date | null;
  };
  /** Vacancy count from resolvePostVacancy — null means omit. */
  resolvedVacancy: number | null;
  /** Salary from resolveSalary — null means omit. */
  resolvedSalary: ResolvedSalary | null;
  /** Deadline from resolveDeadline — state UNKNOWN means no validThrough. */
  resolvedDeadline: ResolvedDeadline;
}

function toIso(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  try {
    const ts = new Date(d);
    if (isNaN(ts.getTime())) return undefined;
    return ts.toISOString();
  } catch {
    return undefined;
  }
}

export default function PostLeafStructuredData({
  post,
  resolvedVacancy,
  resolvedSalary,
  resolvedDeadline,
}: PostLeafSchemaProps) {
  const leafUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`;
  const hubUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}`;

  // ── BreadcrumbList ─────────────────────────────────────────────────────────
  // Jobs → [Org Name] → Recruitment → Post title
  const breadcrumbItems: object[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Jobs",
      item: `${SITE_URL}/jobs`,
    },
  ];

  // Only include breadcrumb nodes with a canonical destination URL.
  // Organization has no URL in this component's contract yet, so keep it in
  // hiringOrganization rather than emitting an unlinked breadcrumb item.
  let position = 2;

  if (post.recruitmentName) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: position++,
      name: post.recruitmentName,
      item: hubUrl,
    });
  }

  breadcrumbItems.push({
    "@type": "ListItem",
    position: position,
    name: post.title,
    item: leafUrl,
  });

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${leafUrl}#breadcrumb`,
    itemListElement: breadcrumbItems,
  };

  // ── JobPosting ─────────────────────────────────────────────────────────────
  const jobPosting: Record<string, unknown> = {
    "@type": "JobPosting",
    "@id": `${leafUrl}#jobposting`,
    url: leafUrl,
    title: post.title,
    directApply: false,
    identifier: {
      "@type": "PropertyValue",
      name: post.organizationName ?? "JobOye",
      value: String(post.id),
    },
  };

  // description — required by Google for rich results; omit when absent
  if (post.description) {
    jobPosting["description"] = post.description;
  }

  // datePosted — prefer notificationPublicationDate (when this role was announced),
  // fall back to postedAt (when we first listed it on JobOye)
  const datePostedIso =
    toIso(post.notificationPublicationDate) ?? toIso(post.postedAt);
  if (datePostedIso) {
    jobPosting["datePosted"] = datePostedIso;
  }

  // dateModified — last update we know about
  const dateModifiedIso = toIso(post.updatedAt);
  if (dateModifiedIso) {
    jobPosting["dateModified"] = dateModifiedIso;
  }

  // validThrough — only when a verified deadline exists (OPEN or CLOSED states
  // both have a real date; UNKNOWN has none and must not be emitted as anything)
  if (resolvedDeadline.state !== "UNKNOWN" && resolvedDeadline.date) {
    const vtIso = toIso(resolvedDeadline.date);
    if (vtIso) jobPosting["validThrough"] = vtIso;
  }

  // employmentType — emit only recognized, explicitly mapped values.
  // Never guess FULL_TIME for an unknown or missing value.
  const employmentType =
    EMPLOYMENT_TYPE_MAP[post.employmentType?.trim().toUpperCase() ?? ""];
  if (employmentType) {
    jobPosting["employmentType"] = employmentType;
  }

  // hiringOrganization — emit when name is present; omit sameAs (no verified URL yet)
  if (post.organizationName) {
    jobPosting["hiringOrganization"] = {
      "@type": "GovernmentOrganization",
      name: post.organizationName,
    };
  }

  // jobLocation — India-specific: addressCountry always "IN"
  // Only emit when at least one location field is present
  if (post.locationCity || post.locationState) {
    jobPosting["jobLocation"] = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(post.locationCity ? { addressLocality: post.locationCity } : {}),
        ...(post.locationState ? { addressRegion: post.locationState } : {}),
        addressCountry: "IN",
      },
    };
  }

  // baseSalary — resolver-gated: only when resolveSalary returned a value
  if (resolvedSalary) {
    jobPosting["baseSalary"] = {
      "@type": "MonetaryAmount",
      currency: resolvedSalary.currency,
      value: {
        "@type": "QuantitativeValue",
        minValue: resolvedSalary.min,
        maxValue: resolvedSalary.max,
        unitText: resolvedSalary.period,
      },
    };
  }

  // totalJobOpenings — resolver-gated: only when resolvePostVacancy returned a value
  if (resolvedVacancy != null) {
    jobPosting["totalJobOpenings"] = resolvedVacancy;
  }

  const graph = {
    "@context": "https://schema.org",
    "@graph": [breadcrumb, jobPosting],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
