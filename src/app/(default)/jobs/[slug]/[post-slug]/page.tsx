import React from "react";

/**
 * Per-post leaf page — /jobs/[slug]/[post-slug]
 *
 * This is the canonical JobPosting page for a single Post inside a
 * multi-post recruitment notice (PQ-006 / A-080).
 *
 * Structure: 5-question model (JobOye Universal Job Page Structure)
 *   Q1 · What is this?     — identity, 8-fact grid, CTAs, provenance
 *   Q2 · Can I apply?      — eligibility summary (age, qualification, experience)
 *   Q3 · What do I need?   — age table by category, qualification rules, fee
 *   Q4 · How does it work? — selection process (from recruitment), apply steps
 *   Q5 · What's next?      — other posts in this notice, recruitment lifecycle
 *
 * JobPosting structured data is emitted ONLY here — never on the hub page.
 * Values come only from VERIFIED rows; missing values are omitted from markup.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPostsForRecruitment, getPostSlugsForSitemap } from "@/lib/queries";
import { safeQuery } from "@/lib/safe-query";
import { absoluteUrl } from "@/lib/site";
import { pageSeo } from "@/lib/seo";
import { jsonLdGraph, buildBreadcrumbSchema, employmentTypeToSchema } from "@/lib/structured-data";
import { formatDate, formatAgeRange } from "@/lib/labels";
import {
  Calendar,
  Users,
  Banknote,
  ChevronRight,
  ExternalLink,
  FileText,
  Hash,
  GraduationCap,
  Building2,
  ClipboardList,
  CheckCircle,
} from "lucide-react";

// Force dynamic rendering — no ISR/edge caching on this page.
// Post leaf pages are few in number, low in traffic, and were being cached
// as 404 by Vercel's edge (s-maxage from revalidate=300 applied to notFound()
// responses too). Dynamic rendering ensures a fresh DB query every request
// and means a cached-404 can never persist after RLS or data changes.
// Revisit once canonical post data is fully populated and stable.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string; "post-slug": string }> };

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getData(slug: string, postSlug: string) {
  // Call directly — no safeQuery here — so any DB exception propagates to the
  // outer safeQuery in PostLeafPage, which logs it with full detail rather than
  // silently turning it into a 404. A null return (record not found) is not an
  // exception and is handled by the null check below.
  const result = await getPostBySlug(slug, postSlug);
  if (!result) return null;

  const siblings = await safeQuery(
    () => getPostsForRecruitment(result.recruitment.id),
    [] as Awaited<ReturnType<typeof getPostsForRecruitment>>,
  );

  return { ...result, siblings };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, "post-slug": postSlug } = await params;
  const data = await safeQuery(() => getData(slug, postSlug), null);
  if (!data) return {};

  const { post, recruitment } = data;
  const org = recruitment.organization;

  const title = `${post.name} – ${org.name} Recruitment ${new Date(recruitment.createdAt).getFullYear()}`;
  const description =
    post.vacancyTotal
      ? `${org.name} is recruiting for ${post.name}. ${post.vacancyTotal} vacancies. Apply before the closing date.`
      : `${org.name} is recruiting for ${post.name}. Check eligibility and apply on the official site.`;

  const seo = pageSeo(`/jobs/${slug}/${postSlug}`);

  return {
    title,
    description,
    alternates: seo.alternates,
    robots: seo.robots,
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/jobs/${slug}/${postSlug}`),
      type: "article",
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "JobOye government jobs" }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ── Structured data ───────────────────────────────────────────────────────────

/**
 * Builds a rich description from structured data when post.description is absent.
 * Google requires a "full description of the job" — a one-liner is penalised.
 * We compose from vacancy count, eligibility, age rules, salary and apply dates.
 */
function buildFallbackDescription({
  post,
  org,
  recruitment,
}: {
  post: NonNullable<Awaited<ReturnType<typeof getData>>>["post"];
  org: { name: string; websiteUrl?: string | null };
  recruitment: NonNullable<Awaited<ReturnType<typeof getData>>>["recruitment"];
}): string {
  const parts: string[] = [];

  parts.push(`${org.name} invites applications for the post of ${post.name}.`);

  if (post.vacancyTotal) {
    parts.push(`Total vacancies: ${post.vacancyTotal}.`);
  }

  const verifiedElig = post.eligibilities.find((e: { status: string }) => e.status === "VERIFIED");
  if (verifiedElig?.qualificationText) {
    parts.push(`Educational qualification: ${verifiedElig.qualificationText}.`);
  } else if (verifiedElig?.educationCategory) {
    parts.push(`Educational qualification: ${verifiedElig.educationCategory}.`);
  }

  if (verifiedElig?.experienceYearsMin != null) {
    parts.push(`Minimum experience required: ${verifiedElig.experienceYearsMin} year${verifiedElig.experienceYearsMin === 1 ? "" : "s"}.`);
  }

  if (post.ageRules?.length) {
    const ageRule = post.ageRules[0] as { ageMin?: number | null; ageMax?: number | null };
    if (ageRule.ageMin || ageRule.ageMax) {
      const ageStr = ageRule.ageMin && ageRule.ageMax
        ? `${ageRule.ageMin}–${ageRule.ageMax} years`
        : ageRule.ageMax ? `up to ${ageRule.ageMax} years` : `from ${ageRule.ageMin} years`;
      parts.push(`Age requirement: ${ageStr}.`);
    }
  }

  if (post.salaryMin || post.salaryMax) {
    const salaryStr = post.salaryMin && post.salaryMax
      ? `₹${post.salaryMin.toLocaleString("en-IN")} – ₹${post.salaryMax.toLocaleString("en-IN")} per month`
      : post.salaryMax ? `up to ₹${post.salaryMax.toLocaleString("en-IN")} per month` : `₹${post.salaryMin!.toLocaleString("en-IN")} per month`;
    parts.push(`Pay scale: ${salaryStr}.`);
  }

  if (recruitment.applicationEndDate) {
    parts.push(`Last date to apply: ${formatDate(recruitment.applicationEndDate)}.`);
  }

  parts.push("This is a central government / public sector position. Selection is based on written examination and/or interview as per the official notification.");

  return parts.join(" ");
}

function buildLeafJobPosting(data: NonNullable<Awaited<ReturnType<typeof getData>>>) {
  const { post, recruitment } = data;
  const org = recruitment.organization;
  const url = absoluteUrl(`/jobs/${recruitment.slug}/${post.slug}`);

  // Only emit verified eligibility values in markup (ARC-001 rule 5 + PQ-006 §Schema.org)
  const verifiedElig = post.eligibilities.find((e) => e.status === "VERIFIED");

  // baseSalary from post (more precise than recruitment-level)
  const baseSalary =
    post.salaryMin || post.salaryMax
      ? {
          "@type": "MonetaryAmount",
          currency: "INR",
          value: {
            "@type": "QuantitativeValue",
            minValue: post.salaryMin ?? undefined,
            maxValue: post.salaryMax ?? undefined,
            unitText: "MONTH",
          },
        }
      : undefined;

  const educationReq =
    verifiedElig?.educationCategory
      ? { "@type": "EducationalOccupationalCredential", credentialCategory: verifiedElig.educationCategory }
      : undefined;

  const experienceReq =
    verifiedElig?.experienceYearsMin != null
      ? { "@type": "OccupationalExperienceRequirements", monthsOfExperience: verifiedElig.experienceYearsMin * 12 }
      : undefined;

  const hiringOrg = {
    "@type": "GovernmentOrganization",
    "@id": absoluteUrl(`/organizations/${org.slug}#org`),
    name: org.name,
    url: org.websiteUrl ?? absoluteUrl(`/organizations/${org.slug}`),
    // sameAs lets Google disambiguate the hiring entity via its official website
    ...(org.websiteUrl && { sameAs: org.websiteUrl }),
  };

  return {
    "@type": "JobPosting",
    "@id": `${url}#jobposting`,
    url,
    title: post.name,
    description: post.description ?? buildFallbackDescription({ post, org, recruitment }),
    identifier: {
      "@type": "PropertyValue",
      name: org.name,
      value: post.sourcePostCode ?? String(post.id),
    },
    // notificationDate is the actual advertisement/notification date; createdAt is just the DB insert time
    datePosted: (recruitment.notificationDate ?? recruitment.createdAt)?.toISOString(),
    validThrough: recruitment.applicationEndDate?.toISOString() ?? undefined,
    employmentType: employmentTypeToSchema(recruitment.employmentType),
    hiringOrganization: hiringOrg,
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressCountry: "IN" },
    },
    baseSalary,
    totalJobOpenings: post.vacancyTotal ?? undefined,
    directApply: false,
    ...(educationReq && { educationRequirements: educationReq }),
    ...(experienceReq && { experienceRequirements: experienceReq }),
  };
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-black/8 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, label }: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-black/8 px-5 py-4">
      {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-neutral-400" />}
      <h2 className="flex-1 text-base font-semibold text-neutral-900">{title}</h2>
      {label && (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </span>
      )}
    </div>
  );
}

function SubDivider() {
  return <div className="mx-5 border-t border-black/5" />;
}

function FactCell({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`bg-white px-4 py-3 ${accent ? "bg-indigo-50/60" : ""}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${accent ? "text-indigo-700" : "text-neutral-900"}`}>{value}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PostLeafPage({ params }: Props) {
  const { slug, "post-slug": postSlug } = await params;
  const data = await safeQuery(() => getData(slug, postSlug), null);
  if (!data) {
    // If safeQuery caught an exception, it already logged it above.
    // If getData returned null, the record simply doesn't exist.
    console.info("[PostLeafPage] notFound: getData returned null", { slug, postSlug });
    notFound();
  }

  const { post, recruitment, siblings } = data;
  const org = recruitment.organization;
  const exam = recruitment.exam;

  // Option B (owner decision 2026-10-07): always render the leaf page if the
  // post exists. When no structured data has been extracted yet, show a
  // prominent banner directing the user to the official notification.
  const hasOwnFacts =
    post.eligibilities.length > 0 ||
    post.ageRules.length > 0 ||
    post.vacancies.length > 0 ||
    post.salaryMin != null ||
    post.salaryMax != null ||
    post.payLevel != null ||
    post.description != null;

  const verifiedElig = post.eligibilities.find((e) => e.status === "VERIFIED") ?? post.eligibilities[0];
  const otherPosts = siblings.filter((s) => s.slug !== post.slug);

  // Structured data
  const jobPosting = buildLeafJobPosting(data);
  const breadcrumb = buildBreadcrumbSchema([
    { name: "Jobs", path: "/jobs" },
    { name: org.name, path: `/organizations/${org.slug}` },
    { name: recruitment.name ?? "Recruitment", path: `/jobs/${recruitment.slug}` },
    { name: post.name, path: `/jobs/${recruitment.slug}/${post.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdGraph(jobPosting, breadcrumb) }}
      />

      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">

        {/* Breadcrumb */}
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-neutral-500" aria-label="Breadcrumb">
          <Link href="/jobs" className="hover:text-neutral-800">Jobs</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/organizations/${org.slug}`} className="hover:text-neutral-800">{org.name}</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/jobs/${recruitment.slug}`} className="hover:text-neutral-800 line-clamp-1">
            {recruitment.name ?? "Recruitment"}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-neutral-800 font-medium">{post.name}</span>
        </nav>

        {/* ── Data-sparse banner ───────────────────────────────────────── */}
        {!hasOwnFacts && recruitment.notificationUrl && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-medium text-amber-900">
              Detailed information for this post is available in the official notification.
            </p>
            <p className="mt-1 text-xs text-amber-700">
              JobOye has not yet extracted structured eligibility, vacancies, or salary data for this post.
              Visit the official document for complete details.
            </p>
            <a
              href={recruitment.notificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              <FileText className="h-3.5 w-3.5" />
              View Official Notification
            </a>
          </div>
        )}
        {!hasOwnFacts && !recruitment.notificationUrl && (
          <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4">
            <p className="text-sm text-neutral-600">
              Detailed eligibility, vacancy, and salary information for this post has not yet been extracted.
              Check the recruitment page for updates.
            </p>
          </div>
        )}

        {/* ── Q1: What is this? ─────────────────────────────────────────── */}
        <SectionCard className="mb-4">
          {/* Status bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-5 py-3">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {org.name}
            </span>
            {exam && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">
                {exam.label}
              </span>
            )}
            <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Q1
            </span>
          </div>

          {/* Title + post name */}
          <div className="px-5 pt-4 pb-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              {post.name}
            </h1>
            {recruitment.name && (
              <p className="mt-1 text-sm text-neutral-500">
                Part of:{" "}
                <Link href={`/jobs/${recruitment.slug}`} className="text-indigo-600 hover:underline">
                  {recruitment.name}
                </Link>
              </p>
            )}
          </div>

          {/* 8-fact grid */}
          <div className="grid grid-cols-2 gap-px border-t border-black/5 bg-black/5 sm:grid-cols-4">
            <FactCell
              label="Vacancies"
              value={post.vacancyTotal != null ? post.vacancyTotal.toLocaleString("en-IN") : "Not mentioned in notification"}
              accent={post.vacancyTotal != null}
            />
            <FactCell
              label="Pay Level"
              value={
                post.payLevel
                  ? (() => {
                      const pl = post.payLevel as any;
                      if (pl.levelLabel) return pl.levelLabel;
                      const level = pl.level ? `Level ${pl.level}` : null;
                      const scheme = pl.scheme ?? null;
                      if (level && scheme) return `${level} (${scheme})`;
                      return level ?? scheme ?? JSON.stringify(post.payLevel);
                    })()
                  : post.salaryMin != null
                  ? `₹${post.salaryMin.toLocaleString("en-IN")}${post.salaryMax ? "–" + post.salaryMax.toLocaleString("en-IN") : ""}/mo`
                  : "Not mentioned in notification"
              }
            />
            <FactCell
              label="Last Date"
              value={
                recruitment.applicationEndDate
                  ? formatDate(recruitment.applicationEndDate, "en-IN")
                  : "Not mentioned in notification"
              }
            />
            <FactCell
              label="Organization"
              value={
                post.employingOrganization?.name ?? org.name
              }
            />
            <FactCell
              label="Post Code"
              value={post.sourcePostCode ?? "Not mentioned in notification"}
            />
            <FactCell
              label="Age (UR)"
              value={
                post.ageRules.find((r) => r.category === "UR")
                  ? `Max ${post.ageRules.find((r) => r.category === "UR")!.maxAge} years`
                  : verifiedElig?.ageMax
                  ? `Max ${verifiedElig.ageMax} years`
                  : "Not mentioned in notification"
              }
            />
            <FactCell
              label="Qualification"
              value={
                verifiedElig?.qualificationText
                  ? verifiedElig.qualificationText.length > 40
                    ? verifiedElig.qualificationText.slice(0, 40) + "…"
                    : verifiedElig.qualificationText
                  : "Not mentioned in notification"
              }
            />
            <FactCell
              label="Position"
              value={post.position?.name ?? "Not mentioned in notification"}
            />
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-2 border-t border-black/5 px-5 py-3">
            {recruitment.notificationUrl && (
              <a
                href={recruitment.notificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <FileText className="h-3.5 w-3.5" />
                Official Notification
              </a>
            )}
          </div>

          {/* Provenance footer */}
          <div className="flex items-center gap-2 rounded-b-xl border-t border-black/5 bg-neutral-50 px-5 py-2">
            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
            <p className="text-xs text-neutral-500">
              Facts from official notification.{" "}
              {post.eligibilities.some((e) => e.status === "VERIFIED")
                ? "Verified by JobOye editors."
                : "Pending editorial review."}
            </p>
          </div>
        </SectionCard>

        {/* ── Q2: Can I apply? ──────────────────────────────────────────── */}
        {verifiedElig && (
          <SectionCard className="mb-4">
            <SectionHeader icon={GraduationCap} title="Can I Apply?" label="Q2" />
            <div className="px-5 py-4 space-y-3">
              {verifiedElig.ageMax != null && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Age Limit</span>
                  <p className="mt-0.5 text-sm text-neutral-800">
                    {formatAgeRange(verifiedElig.ageMin, verifiedElig.ageMax)}
                    {verifiedElig.ageAsOnDate
                      ? ` as on ${formatDate(verifiedElig.ageAsOnDate, "en-IN")}`
                      : " (as on closing date)"}
                  </p>
                </div>
              )}
              {verifiedElig.qualificationText && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Qualification</span>
                  <p className="mt-0.5 text-sm text-neutral-800">{verifiedElig.qualificationText}</p>
                  {verifiedElig.status === "PENDING" && (
                    <p className="mt-1 text-xs text-amber-600">Pending verification — confirm from official notification.</p>
                  )}
                </div>
              )}
              {verifiedElig.experienceText && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Experience</span>
                  <p className="mt-0.5 text-sm text-neutral-800">{verifiedElig.experienceText}</p>
                </div>
              )}
              {!verifiedElig.ageMax && !verifiedElig.qualificationText && (
                <p className="text-sm text-neutral-500">
                  Eligibility details not yet extracted. Check the{" "}
                  {recruitment.notificationUrl ? (
                    <a href={recruitment.notificationUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      official notification
                    </a>
                  ) : "official notification"}.
                </p>
              )}
            </div>
          </SectionCard>
        )}

        {/* ── Q3: What do I need? ───────────────────────────────────────── */}
        {post.ageRules.length > 0 && (
          <SectionCard className="mb-4">
            <SectionHeader icon={Users} title="Age Limits by Category" label="Q3" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-neutral-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-600">Category</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Max Age</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Relaxation</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-600">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {post.ageRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-5 py-2.5 font-medium">{rule.category}</td>
                      <td className="px-5 py-2.5 text-right">{rule.maxAge != null ? `${rule.maxAge} years` : "—"}</td>
                      <td className="px-5 py-2.5 text-right text-neutral-500">
                        {rule.relaxationYears != null ? `+${rule.relaxationYears} years` : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-neutral-500 text-xs">{rule.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2 text-xs text-neutral-400 border-t border-black/5">
              Source: official notification. Age as on closing date unless stated otherwise.
            </div>
          </SectionCard>
        )}

        {/* Vacancy breakdown */}
        {post.vacancies.length > 0 && (
          <SectionCard className="mb-4">
            <SectionHeader icon={Users} title="Vacancy Breakdown" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-neutral-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-600">Category</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-600">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {post.vacancies.map((v) => (
                    <tr key={v.id}>
                      <td className="px-5 py-2.5">{v.categoryType}</td>
                      <td className="px-5 py-2.5 text-right font-medium">{v.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ── Q4: How does it work? ─────────────────────────────────────── */}
        <SectionCard className="mb-4">
          <SectionHeader icon={ClipboardList} title="How to Apply" label="Q4" />
          <div className="px-5 py-4 space-y-2 text-sm text-neutral-700">
            <p>Applications are submitted through the official online portal. Only the{" "}
              <strong>{org.name}</strong> official website should be used — do not use third-party services.</p>
          </div>
          {recruitment.notificationUrl && (
            <>
              <SubDivider />
              <div className="px-5 py-3">
                <a
                  href={recruitment.notificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
                >
                  <FileText className="h-4 w-4" />
                  Read the official notification for full instructions
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Q5: What's next? ──────────────────────────────────────────── */}
        {otherPosts.length > 0 && (
          <SectionCard className="mb-4">
            <SectionHeader icon={Hash} title={`Other Posts in This Notice (${otherPosts.length})`} label="Q5" />
            <ul className="divide-y divide-black/5">
              {otherPosts.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/jobs/${recruitment.slug}/${p.slug}`}
                    className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-neutral-50"
                  >
                    <div>
                      <span className="text-sm font-medium text-neutral-900">{p.name}</span>
                      {p.position?.name && (
                        <span className="ml-2 text-xs text-neutral-400">{p.position.name}</span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-black/5 px-5 py-2">
              <Link href={`/jobs/${recruitment.slug}`} className="text-xs text-indigo-600 hover:underline">
                ← Back to notice hub
              </Link>
            </div>
          </SectionCard>
        )}

      </main>
    </>
  );
}

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  // Return empty array — all paths are rendered on-demand and cached via ISR
  // (revalidate = 300). This is required in this Next.js version: a non-empty
  // generateStaticParams only pre-builds the listed slugs; any path not in the
  // list 404s even with dynamicParams = true. An empty array + dynamicParams =
  // true renders every valid slug on first request and serves it from cache
  // thereafter. The sitemap generates its own list directly from the DB.
  return [];
}
