import React from "react";

/**
 * Per-post leaf page — /jobs/[slug]/[post-slug]
 *
 * This is the canonical JobPosting page for a single Post inside a
 * multi-post recruitment notice (PQ-006 / A-080).
 *
 * Structure: candidate-question order
 *   Hero   — identity, status, last date hero, CTAs, trust badge
 *   Anchor nav — Dates · Vacancies · Fees · Age · Eligibility · Selection · Apply
 *   §dates       — important dates table (most-scanned, always above fold)
 *   §vacancies   — category-wise vacancy breakdown
 *   §fees        — application fee by category
 *   §eligibility — qualification + experience
 *   §age         — age limits by category table
 *   §selection   — selection process stages
 *   §apply       — how to apply steps
 *   §other       — other posts in this notice
 *   Sticky mobile CTA bar — Apply + Notification
 *
 * JobPosting structured data is emitted ONLY here — never on the hub page.
 * Values come only from VERIFIED rows; missing values are omitted from markup.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPostsForRecruitment } from "@/lib/queries";
import { resolveRoleForPost, getRoleBySlug } from "@/lib/roles";
import { safeQuery } from "@/lib/safe-query";
import { absoluteUrl } from "@/lib/site";
import { pageSeo } from "@/lib/seo";
import { jsonLdGraph, buildBreadcrumbSchema, employmentTypeToSchema, isOnSiteUrl } from "@/lib/structured-data";
import { formatDate, formatAgeRange } from "@/lib/labels";
import { CanonicalPostCard } from "@/components/ui/post-card";
import {
  Users,
  ChevronRight,
  ExternalLink,
  FileText,
  Hash,
  GraduationCap,
  ClipboardList,
  CheckCircle,
  ArrowUpRight,
  Calendar,
  Banknote,
  Shield,
  Share2,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string; "post-slug": string }> };

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getData(slug: string, postSlug: string) {
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

function buildFallbackDescription({
  post,
  org,
  recruitment,
  selectionProcesses,
  fees,
  officialNotificationUrl,
}: {
  post: NonNullable<Awaited<ReturnType<typeof getData>>>["post"];
  org: { name: string; websiteUrl?: string | null };
  recruitment: NonNullable<Awaited<ReturnType<typeof getData>>>["recruitment"];
  selectionProcesses: NonNullable<Awaited<ReturnType<typeof getData>>>["selectionProcesses"];
  fees: NonNullable<Awaited<ReturnType<typeof getData>>>["fees"];
  officialNotificationUrl?: string | null;
}): string {
  const parts: string[] = [];

  parts.push(`${org.name} invites applications from eligible Indian citizens for the post of ${post.name}.`);

  if (post.vacancyTotal) {
    parts.push(`A total of ${post.vacancyTotal} ${post.vacancyTotal === 1 ? "vacancy is" : "vacancies are"} available.`);
    if (post.vacancyDetails) {
      const vd = post.vacancyDetails;
      const breakdownParts: string[] = [];
      if (vd.ur && vd.ur > 0) breakdownParts.push(`UR: ${vd.ur}`);
      if (vd.ews && vd.ews > 0) breakdownParts.push(`EWS: ${vd.ews}`);
      if (vd.obc && vd.obc > 0) breakdownParts.push(`OBC: ${vd.obc}`);
      if (vd.sc && vd.sc > 0) breakdownParts.push(`SC: ${vd.sc}`);
      if (vd.st && vd.st > 0) breakdownParts.push(`ST: ${vd.st}`);
      if (breakdownParts.length > 0) {
        parts.push(`Category-wise breakdown: ${breakdownParts.join(", ")}.`);
      }
    }
  }

  if (post.salaryMin || post.salaryMax) {
    const salaryStr = post.salaryMin && post.salaryMax && post.salaryMin !== post.salaryMax
      ? `₹${post.salaryMin.toLocaleString("en-IN")} to ₹${post.salaryMax.toLocaleString("en-IN")} per month`
      : post.salaryMax
        ? `up to ₹${post.salaryMax.toLocaleString("en-IN")} per month`
        : `₹${post.salaryMin!.toLocaleString("en-IN")} per month`;
    parts.push(`The pay scale for this post is ${salaryStr}.`);
  } else if (post.payLevel) {
    const pl = post.payLevel as Record<string, unknown>;
    const levelStr = pl.levelLabel ?? (pl.level ? `Level ${pl.level}` : null);
    if (levelStr) parts.push(`Pay is at ${levelStr} of the Pay Matrix.`);
  }

  const verifiedElig = post.eligibilities.find((e: { status: string }) => e.status === "VERIFIED")
    ?? post.eligibilities[0];
  if (verifiedElig?.qualificationText) {
    parts.push(`Educational qualification required: ${verifiedElig.qualificationText}.`);
  } else if (verifiedElig?.educationCategory) {
    const catMap: Record<string, string> = {
      "DOCTORATE": "doctoral degree",
      "MASTERS": "master's degree",
      "BACHELORS": "bachelor's degree",
      "ASSOCIATE": "associate degree or diploma",
      "HIGH_SCHOOL": "high school certificate (10+2 or equivalent)",
    };
    const catLabel = catMap[verifiedElig.educationCategory] ?? verifiedElig.educationCategory;
    parts.push(`The minimum educational qualification required is a ${catLabel}.`);
  }
  if (verifiedElig?.experienceText) {
    parts.push(`Experience requirement: ${verifiedElig.experienceText}.`);
  } else if (verifiedElig?.experienceYearsMin != null) {
    parts.push(`A minimum of ${verifiedElig.experienceYearsMin} year${verifiedElig.experienceYearsMin === 1 ? "" : "s"} of relevant experience is required.`);
  }

  const urRule = post.ageRules?.find((r: { category: string }) => r.category === "UR");
  if (urRule?.maxAge != null) {
    parts.push(`The upper age limit for general (UR) candidates is ${urRule.maxAge} years. Relaxation in the upper age limit is provided to SC/ST, OBC, PwBD, Ex-Servicemen and other reserved categories as per government norms.`);
  } else if (verifiedElig?.ageMax != null) {
    parts.push(`The upper age limit is ${verifiedElig.ageMax} years${verifiedElig.ageMin ? ` (minimum ${verifiedElig.ageMin} years)` : ""}. Age relaxation as per government rules applies to reserved categories.`);
  }

  if (selectionProcesses.length > 0) {
    const sp = selectionProcesses[0];
    if (sp.stages && sp.stages.length > 0) {
      parts.push(`The selection process consists of: ${sp.stages.join(", ")}.`);
    } else {
      const typeLabel: Record<string, string> = {
        EXAM: "written examination",
        INTERVIEW: "interview",
        DIRECT: "direct recruitment based on merit",
        PHYSICAL_TEST: "physical efficiency test",
        SKILL_TEST: "skill test",
        MERIT: "merit list",
        MEDICAL: "medical examination",
        DOCUMENT_VERIFICATION: "document verification",
        HYBRID: "written examination followed by interview",
      };
      const label = typeLabel[sp.processType] ?? "screening as per official notification";
      parts.push(`The selection method is ${label}.`);
    }
  } else {
    parts.push("Selection will be made through a process as described in the official notification, which may include written examination, interview, or document verification.");
  }

  if (fees.length > 0) {
    const general = fees.find((f: { category: string }) =>
      ["General", "UR", "All", "GEN", "OBC"].includes(f.category)
    );
    const scSt = fees.find((f: { category: string }) =>
      ["SC/ST", "SC", "ST", "PwBD", "EWS"].includes(f.category)
    );
    if (general?.amount != null) {
      parts.push(
        `Application fee: ₹${general.amount.toLocaleString("en-IN")} for General/OBC candidates` +
        (scSt?.amount != null ? `; ₹${scSt.amount.toLocaleString("en-IN")} for SC/ST/PwBD candidates` : "; SC/ST/PwBD/women candidates may be exempt — refer to official notification") +
        "."
      );
    }
  }

  const dateLines: string[] = [];
  if (recruitment.applicationStartDate) {
    dateLines.push(`Online applications open from ${formatDate(recruitment.applicationStartDate, "en-IN")}`);
  }
  if (recruitment.applicationEndDate) {
    dateLines.push(`last date to apply is ${formatDate(recruitment.applicationEndDate, "en-IN")}`);
  }
  if (recruitment.examDate) {
    dateLines.push(`written examination is scheduled on ${formatDate(recruitment.examDate, "en-IN")}`);
  }
  if (dateLines.length > 0) {
    parts.push(`Important dates: ${dateLines.join("; ")}.`);
  }

  if (officialNotificationUrl) {
    parts.push(
      `Eligible candidates should read the official notification carefully before applying. ` +
      `All details including the application procedure, required documents, and eligibility criteria are specified in the official advertisement.`
    );
  }
  parts.push(
    `This is a government of India / public sector position. Candidates must fulfil all eligibility conditions as on the closing date. ` +
    `JobOye displays information compiled from official sources; candidates are advised to verify details from the official notification before applying.`
  );

  return parts.join(" ");
}

function buildLeafJobPosting(data: NonNullable<Awaited<ReturnType<typeof getData>>>) {
  const { post, recruitment } = data;
  const org = recruitment.organization;
  const url = absoluteUrl(`/jobs/${recruitment.slug}/${post.slug}`);

  const verifiedElig = post.eligibilities.find((e) => e.status === "VERIFIED");

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
    ...(org.websiteUrl && { url: org.websiteUrl }),
    ...(org.websiteUrl && { sameAs: org.websiteUrl }),
  };

  return {
    "@type": "JobPosting",
    "@id": `${url}#jobposting`,
    url,
    title: post.name,
    description: post.description ?? buildFallbackDescription({
      post,
      org,
      recruitment,
      selectionProcesses: data.selectionProcesses,
      fees: data.fees,
      officialNotificationUrl: data.officialNotificationUrl,
    }),
    identifier: {
      "@type": "PropertyValue",
      name: org.name,
      value: post.sourcePostCode ?? String(post.id),
    },
    datePosted: (recruitment.notificationDate ?? recruitment.createdAt)?.toISOString(),
    dateModified: (post.updatedAt ?? recruitment.updatedAt)?.toISOString(),
    validThrough: recruitment.applicationEndDate?.toISOString() ?? undefined,
    employmentType: employmentTypeToSchema(data.postingEmploymentType),
    hiringOrganization: hiringOrg,
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "IN",
        ...(data.locationStateCode && { addressRegion: data.locationStateCode }),
      },
    },
    baseSalary,
    totalJobOpenings: post.vacancyTotal ?? undefined,
    ...(data.applyUrl && { apply: data.applyUrl }),
    directApply: isOnSiteUrl(data.applyUrl),
    ...(educationReq && { educationRequirements: educationReq }),
    ...(experienceReq && { experienceRequirements: experienceReq }),
  };
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function Card({ children, id, className = "" }: { children: React.ReactNode; id?: string; className?: string }) {
  return (
    <div id={id} className={`rounded-xl border border-black/8 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title }: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-black/8 px-5 py-3.5">
      {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-neutral-400" />}
      <h2 className="flex-1 text-sm font-semibold text-neutral-900">{title}</h2>
    </div>
  );
}

function Divider() {
  return <div className="mx-5 border-t border-black/5" />;
}

function InfoTable({ rows }: { rows: { label: string; value: React.ReactNode; highlight?: boolean }[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={`border-b border-black/5 last:border-0 ${row.highlight ? "bg-indigo-50/40" : ""}`}>
            <td className="px-5 py-2.5 text-xs font-medium text-neutral-500 w-40">{row.label}</td>
            <td className={`px-5 py-2.5 font-medium ${row.highlight ? "text-indigo-800" : "text-neutral-900"}`}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PostLeafPage({ params }: Props) {
  const { slug, "post-slug": postSlug } = await params;
  const data = await safeQuery(() => getData(slug, postSlug), null);
  if (!data) {
    console.info("[PostLeafPage] notFound: getData returned null", { slug, postSlug });
    notFound();
  }

  const { post, recruitment, siblings, applyUrl, officialNotificationUrl, postingEmploymentType, selectionProcesses, fees } = data;
  const org = recruitment.organization;
  const exam = recruitment.exam;

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

  const roleSlug = resolveRoleForPost(post.name);
  const roleDefinition = roleSlug ? getRoleBySlug(roleSlug) : null;

  // Dates
  const applicationEnd = recruitment.applicationEndDate ? new Date(recruitment.applicationEndDate) : null;
  const applicationStart = recruitment.applicationStartDate ? new Date(recruitment.applicationStartDate) : null;
  const examDate = recruitment.examDate ? new Date(recruitment.examDate) : null;
  const daysLeft = applicationEnd
    ? Math.ceil((applicationEnd.getTime() - Date.now()) / 86400000)
    : null;
  const isOpen = applicationEnd ? applicationEnd.getTime() >= Date.now() : true;

  // Pay display
  const payDisplay = (() => {
    if (post.payLevel) {
      const pl = post.payLevel as any;
      if (pl.levelLabel) return pl.levelLabel;
      const level = pl.level ? `Level ${pl.level}` : null;
      const scheme = pl.scheme ?? null;
      if (level && scheme) return `${level} (${scheme})`;
      return level ?? scheme ?? null;
    }
    if (post.salaryMin != null) {
      const min = `₹${post.salaryMin.toLocaleString("en-IN")}`;
      const max = post.salaryMax && post.salaryMax !== post.salaryMin
        ? `–₹${post.salaryMax.toLocaleString("en-IN")}`
        : "";
      return `${min}${max}/mo`;
    }
    return null;
  })();

  // Age display (UR)
  const urRule = post.ageRules.find((r: { category: string }) => r.category === "GENERAL" || r.category === "UR");
  const ageDisplay = urRule?.maxAge != null
    ? `Up to ${urRule.maxAge} yrs`
    : verifiedElig?.ageMax != null
    ? `Up to ${verifiedElig.ageMax} yrs`
    : null;

  // Selection stages
  const allStages: string[] = selectionProcesses.flatMap((sp) => sp.stages ?? []);

  // ── Enrichment data extraction ────────────────────────────────────
  /**
   * Extract fee amount from fee note.
   * Example: "SC/ST: NIL; Others: ₹500" → "₹500"
   */
  function extractFeeAmount(feeNote: string | null | undefined): string | null {
    if (!feeNote) return null;
    const match = feeNote.match(/₹\s*(\d+)/);
    if (match) return `₹${match[1]}`;
    if (feeNote.toLowerCase().includes("nil")) return "NIL";
    return null;
  }

  /**
   * Extract age range from age note.
   * Example: "20-28 years; SC/ST/OBC: 5 years relaxation" → "20–28 yrs"
   */
  function extractAgeRange(ageNote: string | null | undefined): string | null {
    if (!ageNote) return null;
    const match = ageNote.match(/(\d+)\s*[-–]\s*(\d+)\s*years?/i);
    if (match) return `${match[1]}–${match[2]} yrs`;
    return null;
  }

  /**
   * Extract first stage from selection process.
   * Example: "Written Test → Interview → Document Verification" → "Written Test"
   */
  function extractFirstStage(selectionProcess: string | null | undefined): string | null {
    if (!selectionProcess) return null;
    const firstStage = selectionProcess.split("→")[0]?.trim();
    return firstStage && firstStage.length > 0 ? firstStage : null;
  }

  const enrichmentFee = extractFeeAmount(recruitment.enrichmentFeeNote);
  const enrichmentAge = extractAgeRange(recruitment.enrichmentAgeNote);
  const enrichmentStage = extractFirstStage(recruitment.enrichmentSelectionProcess);
  const hasEnrichment = enrichmentFee || enrichmentAge || enrichmentStage;

  // Structured data
  const recruitmentIsOpen =
    (recruitment.status === "ACTIVE" || recruitment.status === "UPCOMING") &&
    (!recruitment.applicationEndDate ||
      new Date(recruitment.applicationEndDate).getTime() >= Date.now());
  const rawJobPosting = buildLeafJobPosting(data);
  const jobPosting = recruitmentIsOpen ? rawJobPosting : null;

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Jobs", path: "/jobs" },
    { name: recruitment.name ?? "Recruitment", path: `/jobs/${recruitment.slug}` },
    { name: post.name, path: `/jobs/${recruitment.slug}/${post.slug}` },
  ]);

  // Anchor nav items — only show sections that have content
  const anchorItems: { id: string; label: string }[] = [];
  if (applicationEnd || applicationStart || examDate) anchorItems.push({ id: "dates", label: "Dates" });
  if (post.vacancies.length > 0) anchorItems.push({ id: "vacancies", label: "Vacancies" });
  if (fees.length > 0) anchorItems.push({ id: "fees", label: "Fees" });
  if (verifiedElig) anchorItems.push({ id: "eligibility", label: "Eligibility" });
  if (post.ageRules.length > 0) anchorItems.push({ id: "age", label: "Age" });
  if (allStages.length > 0) anchorItems.push({ id: "selection", label: "Selection" });
  anchorItems.push({ id: "apply", label: "Apply" });

  // WhatsApp share text
  const pageUrl = absoluteUrl(`/jobs/${recruitment.slug}/${post.slug}`);
  const whatsappText = encodeURIComponent(
    `${post.name} – ${org.name}\n` +
    (applicationEnd ? `Last Date: ${formatDate(applicationEnd, "en-IN")}\n` : "") +
    (post.vacancyTotal ? `Vacancies: ${post.vacancyTotal}\n` : "") +
    pageUrl
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph(jobPosting, breadcrumb)) }}
      />

      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8 pb-24 sm:pb-8">

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

        {/* ── Hero card ──────────────────────────────────────────────── */}
        <Card className="mb-3">
          {/* Org + exam badge strip */}
          <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-5 py-2.5">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {org.name}
            </span>
            {exam && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">
                {exam.label}
              </span>
            )}
            {!isOpen && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                Closed
              </span>
            )}
            {isOpen && daysLeft !== null && daysLeft <= 7 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                {daysLeft === 0 ? "Closes today!" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
              </span>
            )}
            {isOpen && daysLeft !== null && daysLeft > 7 && daysLeft <= 30 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {daysLeft} days left
              </span>
            )}
          </div>

          {/* Title */}
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

          {/* Key facts strip — Last Date prominent */}
          <div className="grid grid-cols-2 gap-px border-t border-black/5 bg-black/5 md:grid-cols-5">
            {/* Last Date — hero position */}
            <div className={`px-4 py-3 ${
              daysLeft !== null && isOpen && daysLeft <= 7 ? "bg-red-50"
                : daysLeft !== null && isOpen && daysLeft <= 30 ? "bg-amber-50"
                : "bg-white"
            }`}>
              <div className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${
                daysLeft !== null && isOpen && daysLeft <= 7 ? "text-red-500"
                  : daysLeft !== null && isOpen && daysLeft <= 30 ? "text-amber-600"
                  : "text-neutral-400"
              }`}>
                <Calendar className="h-3 w-3" />
                Last Date
              </div>
              <div className={`mt-0.5 text-sm font-bold ${
                daysLeft !== null && isOpen && daysLeft <= 7 ? "text-red-900"
                  : daysLeft !== null && isOpen && daysLeft <= 30 ? "text-amber-900"
                  : applicationEnd ? "text-neutral-900" : "text-neutral-400"
              }`}>
                {applicationEnd ? formatDate(applicationEnd, "en-IN") : "—"}
              </div>
            </div>

            {/* Vacancies */}
            <div className="bg-white px-4 py-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                <Users className="h-3 w-3" />
                Vacancies
              </div>
              <div className={`mt-0.5 text-sm font-bold ${post.vacancyTotal != null ? "text-indigo-700" : "text-neutral-400"}`}>
                {post.vacancyTotal != null ? post.vacancyTotal.toLocaleString("en-IN") : "—"}
              </div>
            </div>

            {/* Pay */}
            <div className="bg-white px-4 py-3 hidden md:block">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                <Banknote className="h-3 w-3" />
                Pay Scale
              </div>
              <div className={`mt-0.5 text-sm font-bold ${payDisplay ? "text-neutral-900" : "text-neutral-400"}`}>
                {payDisplay ?? "—"}
              </div>
            </div>

            {/* Fee */}
            <div className="bg-white px-4 py-3 hidden md:block">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                <Banknote className="h-3 w-3" />
                Fee
              </div>
              <div className={`mt-0.5 text-sm font-bold ${enrichmentFee ? "text-amber-700" : "text-neutral-400"}`}>
                {enrichmentFee ?? "—"}
              </div>
            </div>

            {/* Age UR */}
            <div className="bg-white px-4 py-3 hidden md:block">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                <GraduationCap className="h-3 w-3" />
                Age (UR)
              </div>
              <div className={`mt-0.5 text-sm font-bold ${ageDisplay ? "text-neutral-900" : "text-neutral-400"}`}>
                {ageDisplay ?? "—"}
              </div>
            </div>

            {/* Post Code */}
            {post.sourcePostCode && (
              <div className="col-span-2 bg-white px-4 py-3 md:col-span-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Post Code</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-neutral-900">{post.sourcePostCode}</div>
              </div>
            )}

            {/* Qualification snippet */}
            {verifiedElig?.qualificationText && (
              <div className="col-span-2 bg-white px-4 py-3 md:col-span-5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Qualification</div>
                <div className="mt-0.5 text-sm text-neutral-900 leading-snug">
                  {verifiedElig.qualificationText.length > 80
                    ? verifiedElig.qualificationText.slice(0, 80) + "…"
                    : verifiedElig.qualificationText}
                </div>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-2 border-t border-black/5 px-5 py-3">
            {applyUrl && isOpen && (
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Apply Now
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
            {officialNotificationUrl && (
              <a
                href={officialNotificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <FileText className="h-3.5 w-3.5" />
                Official Notification
              </a>
            )}
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              aria-label="Share on WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </a>
            <Link
              href={`/jobs/${recruitment.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              All posts
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Enrichment badge strip */}
          {hasEnrichment && (
            <div className="flex flex-wrap gap-2 border-t border-black/5 px-5 py-3 bg-white">
              {enrichmentFee && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-medium border border-amber-200"
                  title={recruitment.enrichmentFeeNote || undefined}
                >
                  Fee: {enrichmentFee}
                </span>
              )}
              {enrichmentAge && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-medium border border-blue-200"
                  title={recruitment.enrichmentAgeNote || undefined}
                >
                  Age: {enrichmentAge}
                </span>
              )}
              {enrichmentStage && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-50 text-purple-900 text-xs font-medium border border-purple-200 truncate"
                  title={recruitment.enrichmentSelectionProcess || undefined}
                >
                  {enrichmentStage}
                </span>
              )}
            </div>
          )}

          {/* Trust badge / provenance */}
          <div className="flex items-center gap-2 rounded-b-xl border-t border-black/5 bg-neutral-50 px-5 py-2.5">
            <Shield className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
            <p className="text-xs text-neutral-500">
              {post.eligibilities.some((e) => e.status === "VERIFIED")
                ? "Verified from official notification"
                : "Sourced from official notification. Some details may be pending verification."}
            </p>
          </div>
        </Card>

        {/* ── Data-sparse banner ─────────────────────────────────────── */}
        {!hasOwnFacts && officialNotificationUrl && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-medium text-amber-900">
              Detailed information for this post is in the official notification.
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Structured eligibility, vacancies, and salary data have not yet been extracted for this post.
            </p>
            <a
              href={officialNotificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              <FileText className="h-3.5 w-3.5" />
              View Official Notification
            </a>
          </div>
        )}
        {!hasOwnFacts && !officialNotificationUrl && (
          <div className="mb-3 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4">
            <p className="text-sm text-neutral-600">
              Detailed eligibility, vacancy, and salary information for this post has not yet been extracted.
            </p>
            <Link
              href={`/jobs/${recruitment.slug}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
            >
              View full recruitment details →
            </Link>
          </div>
        )}

        {/* ── Anchor navigation ──────────────────────────────────────── */}
        {anchorItems.length > 0 && (
          <div className="mb-4 -mx-4 px-4 overflow-x-auto">
            <div className="flex gap-2 whitespace-nowrap pb-1">
              {anchorItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Important Dates ────────────────────────────────────────── */}
        {(applicationStart || applicationEnd || examDate) && (
          <Card id="dates" className="mb-3">
            <CardHeader icon={Calendar} title="Important Dates" />
            <InfoTable rows={[
              ...(applicationStart ? [{ label: "Apply from", value: formatDate(applicationStart, "en-IN") }] : []),
              ...(applicationEnd ? [{
                label: "Last date to apply",
                value: formatDate(applicationEnd, "en-IN"),
                highlight: isOpen && daysLeft !== null && daysLeft <= 30,
              }] : []),
              ...(examDate ? [{ label: "Written exam", value: formatDate(examDate, "en-IN") }] : []),
            ]} />
          </Card>
        )}

        {/* ── Vacancy breakdown ──────────────────────────────────────── */}
        {post.vacancies.length > 0 && (
          <Card id="vacancies" className="mb-3">
            <CardHeader icon={Users} title="Vacancy Breakdown" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-neutral-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-500">Category</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-500">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {post.vacancies.map((v) => (
                    <tr key={v.id}>
                      <td className="px-5 py-2.5 text-neutral-800">{v.categoryType}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-neutral-900">{v.count}</td>
                    </tr>
                  ))}
                  {post.vacancyTotal != null && post.vacancies.length > 0 && (
                    <tr className="bg-neutral-50 font-semibold">
                      <td className="px-5 py-2.5 text-neutral-700">Total</td>
                      <td className="px-5 py-2.5 text-right text-neutral-900">{post.vacancyTotal.toLocaleString("en-IN")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Application Fee ────────────────────────────────────────── */}
        {fees.length > 0 && (
          <Card id="fees" className="mb-3">
            <CardHeader icon={Banknote} title="Application Fee" />
            {recruitment.enrichmentFeeNote && (
              <div className="px-5 py-3 bg-amber-50 border-b border-black/5">
                <p className="text-sm text-amber-900">{recruitment.enrichmentFeeNote}</p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-neutral-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-500">Category</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-500">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {fees.map((fee) => (
                    <tr key={fee.id}>
                      <td className="px-5 py-2.5 text-neutral-800">{fee.category ?? "General"}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-neutral-900">
                        {fee.amount != null ? (Number(fee.amount) === 0 ? "Nil" : `₹${Number(fee.amount).toLocaleString("en-IN")}`) : "Nil"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fees.some((f) => f.note) && (
                <div className="px-5 py-2.5 text-xs text-neutral-500 border-t border-black/5">
                  {fees.find((f) => f.note)?.note}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Eligibility ────────────────────────────────────────────── */}
        {verifiedElig && (
          <Card id="eligibility" className="mb-3">
            <CardHeader icon={GraduationCap} title="Eligibility" />
            <div className="px-5 py-4 space-y-4">
              {verifiedElig.qualificationText && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Qualification</p>
                  <p className="text-sm text-neutral-800 leading-relaxed">{verifiedElig.qualificationText}</p>
                  {verifiedElig.status === "PENDING" && (
                    <p className="mt-1.5 text-xs text-amber-600">Pending verification — confirm from official notification.</p>
                  )}
                </div>
              )}
              {verifiedElig.experienceText && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Experience</p>
                  <p className="text-sm text-neutral-800">{verifiedElig.experienceText}</p>
                </div>
              )}
              {verifiedElig.ageMax != null && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Age Limit</p>
                  <p className="text-sm text-neutral-800">
                    {formatAgeRange(verifiedElig.ageMin, verifiedElig.ageMax)}
                    {verifiedElig.ageAsOnDate
                      ? ` as on ${formatDate(verifiedElig.ageAsOnDate, "en-IN")}`
                      : " (as on closing date)"}
                  </p>
                </div>
              )}
              {!verifiedElig.qualificationText && !verifiedElig.experienceText && !verifiedElig.ageMax && (
                <p className="text-sm text-neutral-500">
                  Eligibility details not yet extracted. Check the{" "}
                  {officialNotificationUrl ? (
                    <a href={officialNotificationUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      official notification
                    </a>
                  ) : "official notification"}.
                </p>
              )}
            </div>
          </Card>
        )}

        {/* ── Age limits by category ─────────────────────────────────── */}
        {post.ageRules.length > 0 && (
          <Card id="age" className="mb-3">
            <CardHeader icon={Users} title="Age Limits by Category" />
            {recruitment.enrichmentAgeNote && (
              <div className="px-5 py-3 bg-blue-50 border-b border-black/5">
                <p className="text-sm text-blue-900">{recruitment.enrichmentAgeNote}</p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-neutral-50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-500">Category</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-500">Max Age</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-neutral-500">Relaxation</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-neutral-500">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {post.ageRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-5 py-2.5 font-medium text-neutral-800">{rule.category}</td>
                      <td className="px-5 py-2.5 text-right text-neutral-900">{rule.maxAge != null ? `${rule.maxAge} years` : "—"}</td>
                      <td className="px-5 py-2.5 text-right text-neutral-500">
                        {rule.relaxationYears != null ? `+${rule.relaxationYears} years` : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-neutral-500 text-xs">{rule.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2.5 text-xs text-neutral-400 border-t border-black/5">
              Age as on closing date unless stated otherwise. Source: official notification.
            </div>
          </Card>
        )}

        {/* ── Selection Process ──────────────────────────────────────── */}
        {allStages.length > 0 && (
          <Card id="selection" className="mb-3">
            <CardHeader icon={ClipboardList} title="Selection Process" />
            {recruitment.enrichmentSelectionProcess && (
              <div className="px-5 py-3 bg-purple-50 border-b border-black/5">
                <p className="text-sm text-purple-900">{recruitment.enrichmentSelectionProcess}</p>
              </div>
            )}
            <ol className="px-5 py-4 space-y-3">
              {allStages.map((stage, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-700">
                    {i + 1}
                  </span>
                  <p className="text-sm text-neutral-800 pt-0.5">{stage}</p>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* ── How to Apply ───────────────────────────────────────────── */}
        <Card id="apply" className="mb-3">
          <CardHeader icon={CheckCircle} title="How to Apply" />
          <div className="px-5 py-4 space-y-4">
            {(postingEmploymentType as string | null) === "DEPUTATION" ? (
              <p className="text-sm text-neutral-700">
                This is a <strong>deputation post</strong>. Applications must be forwarded through proper channel
                by the applicant&apos;s parent department/organisation. Direct applications are not accepted.
                Refer to the official notification for the prescribed format and submission address.
              </p>
            ) : applyUrl ? (
              <div className="space-y-2">
                <p className="text-sm text-neutral-700">
                  Apply online at the official application portal. Verify the link matches the official notification before submitting.
                </p>
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Apply on Official Portal
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-neutral-700">
                Refer to the official notification for application instructions and submission details.
              </p>
            )}

            {officialNotificationUrl && (
              <>
                <Divider />
                <a
                  href={officialNotificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
                >
                  <FileText className="h-4 w-4" />
                  Read the official notification for full instructions
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </>
            )}
          </div>
        </Card>

        {/* ── Other Posts in This Notice ─────────────────────────────── */}
        {otherPosts.length > 0 && (
          <Card className="mb-3">
            <CardHeader icon={Hash} title={`Other Posts in This Notice (${otherPosts.length})`} />
            <div className="space-y-3 p-5">
              {otherPosts.map((p, i) => (
                <CanonicalPostCard
                  key={p.id}
                  name={p.name}
                  slug={p.slug}
                  recruitmentSlug={recruitment.slug}
                  vacancyTotal={p.vacancyTotal}
                  vacancyDetails={p.vacancyDetails}
                  salaryMin={p.salaryMin}
                  salaryMax={p.salaryMax}
                  positionName={p.position?.name}
                  index={i}
                />
              ))}
            </div>
            <div className="border-t border-black/5 px-5 py-2.5">
              <Link href={`/jobs/${recruitment.slug}`} className="text-xs text-indigo-600 hover:underline">
                ← Back to notice hub
              </Link>
            </div>
          </Card>
        )}

        {/* ── Role Hub discovery ─────────────────────────────────────── */}
        {roleDefinition && (
          <Card className="mb-3">
            <div className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                Browse by Role
              </p>
              <Link
                href={`/posts/${roleDefinition.slug}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{roleDefinition.name} Jobs</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    See all active and historical {roleDefinition.name} recruitments
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-400" />
              </Link>
            </div>
          </Card>
        )}

      </main>

      {/* ── Sticky mobile CTA bar ──────────────────────────────────────────
          Shown only on mobile (hidden on sm+). Stays pinned to the bottom
          while the user scrolls through the page content.
      ─────────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/10 bg-white px-4 py-3 shadow-lg sm:hidden">
        <div className="flex gap-2">
          {applyUrl && isOpen ? (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white"
            >
              Apply Now
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-200 py-2.5 text-sm font-semibold text-neutral-500 cursor-not-allowed">
              Applications Closed
            </span>
          )}
          {officialNotificationUrl && (
            <a
              href={officialNotificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700"
            >
              <FileText className="h-4 w-4" />
              PDF
            </a>
          )}
        </div>
      </div>
    </>
  );
}

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return [];
}
