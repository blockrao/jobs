import React from "react";

/**
 * Canonical English job detail page — /jobs/[slug]
 *
 * Structure: 5-question model (JobOye Universal Job Page Structure)
 *   Q1 · What is this?   — identity, 8-fact grid, CTAs, provenance
 *   Q2 · Can I apply?    — eligibility summary + interactive checker
 *   Q3 · What do I need? — qualification rules, age table, matrix, docs, fee
 *   Q4 · How does it work? — selection process, how to apply, helpdesk
 *   Q5 · What's next?    — lifecycle timeline, related posts
 *
 * This is the authoritative URL for every JobPosting: buildJobPostingSchema()
 * emits url: absoluteUrl(`/jobs/${slug}`) and @id: `${url}#jobposting`, so
 * Google's job-search crawler must find real content here. The [locale] mirror
 * at /hi/jobs/[slug] is the Hindi-only version; this page handles English only.
 */
import { buildNoticeFaqs, buildNoticeTimeline, type NoticeFacts } from "@/lib/content/notice-faqs";
import { publicLink, stripAggregatorTag } from "@/lib/aggregators";
import { getStateBySlug } from "@/lib/states/states";
import { pageSeo } from "@/lib/seo";
import { cutAtWord, composeJobMetaDescription, composeJobMetaTitle } from "@/lib/seo/meta-title";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostingBySlug, getPostsForRecruitment } from "@/lib/queries";
import { safeQuery } from "@/lib/safe-query";
import {
  buildBreadcrumbSchema,
  buildExamEventSchema,
  buildFAQSchema,
  buildJobPostingSchema,
  isHiringOpen,
  jsonLdGraph,
} from "@/lib/structured-data";
import {
  EMPLOYMENT_TYPE_LABELS,
  KIND_LABELS,
  STAGE_LABELS,
  WORKPLACE_TYPE_LABELS,
  formatAgeRange,
  formatCurrencyRange,
  formatDate,
  formatFee,
  vacanciesPhrase,
} from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { InfoCard } from "@/components/ui/info-card";
import { EligibilityChecker } from "@/components/eligibility-checker";
import {
  Calendar,
  Users,
  Banknote,
  Clock,
  FileText,
  CheckCircle,
  ChevronRight,
  AlertTriangle,
  Info,
  ExternalLink,
  BookOpen,
  Building2,
  MapPin,
  GraduationCap,
  ClipboardList,
  Hash,
} from "lucide-react";
import { CanonicalPostCard, LegacyPostCard } from "@/components/ui/post-card";

// force-dynamic: hub pages need fresh sibling-post data on every request.
// ISR (revalidate=300) caused stale cache to persist after PostCard deployment,
// hiding clickable post links. Hub page count is small; DB read cost is low.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

function plainTextSnippet(html: string, repeatOf: string, maxLen = 155): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const deduped = text.toLowerCase().startsWith(repeatOf.toLowerCase())
    ? text.slice(repeatOf.length).replace(/^[\s.:–-]+/, "")
    : text;
  return cutAtWord(deduped, maxLen);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const posting = await safeQuery(() => getPostingBySlug(slug), null);
  if (!posting) return {};

  const org = posting.organization;
  const extraContent = ((posting as any).extraContent ?? null) as import("@/db/schema").ExtraContent | null;
  const seoOverride = extraContent?.seo;
  const title = seoOverride?.title ?? composeJobMetaTitle(posting.title, [org.name]);
  const factsDescription = composeJobMetaDescription({
    postName: posting.postNames?.[0]?.trim() || null,
    orgName: org.name,
    vacancies: posting.totalVacancies,
    lastDate: posting.validThrough ? formatDate(posting.validThrough, "en-IN") : null,
  });
  const description = seoOverride?.description ?? factsDescription ?? plainTextSnippet(posting.description, posting.title);

  const seo = pageSeo(`/jobs/${slug}`);
  const ogImages = [{ url: "/og-default.png", width: 1200, height: 630, alt: "JobOye government jobs" }];

  return {
    title,
    description,
    alternates: seo.alternates,
    robots: seo.robots,
    openGraph: {
      title,
      description,
      url: `/jobs/${slug}`,
      type: "article",
      images: ogImages,
    },
    twitter: { card: "summary_large_image", title, description, images: ogImages.map((i) => i.url) },
  };
}

function buildFaqs(
  posting: NonNullable<Awaited<ReturnType<typeof getPostingBySlug>>>,
  displayTitle: string,
  displayOrgName: string,
  displayEligibility: string | null,
) {
  const faqs: { question: string; answer: string }[] = [];
  const t = posting.postNames?.[0]?.trim() || displayTitle;

  if (posting.totalVacancies) {
    faqs.push({
      question: `How many vacancies are there for ${t} at ${displayOrgName}?`,
      answer: `${displayOrgName} has announced ${vacanciesPhrase(posting.totalVacancies)} for ${t}.`,
    });
  }
  if (displayEligibility) {
    faqs.push({ question: `What is the eligibility for ${t}?`, answer: displayEligibility });
  }
  if (posting.validThrough) {
    const dateStr = formatDate(posting.validThrough, "en-IN");
    faqs.push({
      question: `What is the last date to apply for ${t}?`,
      answer: `The last date to apply is ${dateStr}. Always confirm on the official notification before the deadline.`,
    });
  }
  if (posting.applicationFeeGeneral != null) {
    faqs.push({
      question: `What is the application fee for ${t}?`,
      answer: `The application fee is ₹${posting.applicationFeeGeneral} for general category${
        posting.applicationFeeReserved != null
          ? ` and ₹${posting.applicationFeeReserved} for reserved categories`
          : ""
      }.`,
    });
  }
  const extra = ((posting as any).extraContent ?? null) as import("@/db/schema").ExtraContent | null;
  for (const f of extra?.faqs ?? []) {
    if (f.q && f.a && !faqs.some((x) => x.question === f.q)) faqs.push({ question: f.q, answer: f.a });
  }
  return faqs;
}

function recruitmentStatusLabel(
  stage: string,
  validThrough: Date | null,
  hiringOpen: boolean,
  applicationStartDate?: Date | null,
): { label: string; color: "green" | "amber" | "red" | "neutral" } {
  if (stage === "APPLICATION_OPEN" && applicationStartDate && new Date() < new Date(applicationStartDate))
    return { label: "Notification Out – Applications Open Soon", color: "amber" };
  if (stage === "APPLICATION_OPEN" && hiringOpen)
    return { label: "Applications Open", color: "green" };
  if (stage === "APPLICATION_CLOSED" || (!hiringOpen && validThrough && new Date() > validThrough))
    return { label: "Applications Closed", color: "red" };
  if (stage === "NOTIFICATION_OUT")
    return { label: "Notification Out", color: "amber" };
  if (["EXAM_SCHEDULED", "EXAM_CONDUCTED", "ADMIT_CARD_RELEASED"].includes(stage))
    return { label: "Exam Stage", color: "amber" };
  if (["RESULT_OUT", "MERIT_LIST_OUT", "FINAL_RESULT_OUT"].includes(stage))
    return { label: "Result Available", color: "green" };
  if (stage === "INTERVIEW_SCHEDULED")
    return { label: "Interview Scheduled", color: "amber" };
  return { label: "Status Unknown", color: "neutral" };
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

/** Full-width card with a titled header */
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
  /** Small badge shown to the right of the title, e.g. "Q1" */
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

/** Thin horizontal separator between sub-sections inside a card */
function SubDivider() {
  return <div className="mx-5 border-t border-black/5" />;
}

/** Sub-section inside a card — own heading + content block */
function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h3>
      {children}
    </div>
  );
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const posting = await safeQuery(() => getPostingBySlug(slug), null);
  if (!posting) notFound();

  // PQ-006 (A-080): Fetch sibling posts when this posting is linked to a canonical
  // recruitment. When sibling posts exist, this page acts as the "notice hub" and
  // we suppress the JobPosting schema (Google's rule: one JobPosting per leaf page).
  const canonicalRecruitmentId: number | null = posting.canonicalRecruitment?.id ?? null;
  const siblingPosts = canonicalRecruitmentId
    ? await safeQuery(
        () => getPostsForRecruitment(canonicalRecruitmentId as number),
        [] as Awaited<ReturnType<typeof getPostsForRecruitment>>,
      )
    : [];
  const isHubPage = siblingPosts.length > 1;

  const org = posting.organization;
  const orgHref = `/organizations/${org.slug}`;
  const stateHub = getStateBySlug((posting as any).stateSlug ?? "");
  const hiringOpen = isHiringOpen(posting.currentStage, posting.validThrough);
  const extraContent = ((posting as any).extraContent ?? null) as import("@/db/schema").ExtraContent | null;
  const faqs = buildFaqs(posting, posting.title, org.name, posting.eligibility);

  const noticeFacts: NoticeFacts = {
    id: posting.id,
    title: posting.title,
    org: org.name,
    vac: posting.totalVacancies ?? null,
    pay_min: posting.salaryMin ?? null,
    pay_max: posting.salaryMax ?? null,
    age_min: posting.ageLimitMin ?? null,
    age_max: posting.ageLimitMax ?? null,
    date_posted: posting.datePosted ? new Date(posting.datePosted).toISOString() : null,
    valid_through: posting.validThrough ? new Date(posting.validThrough).toISOString() : null,
    application_start: posting.canonicalRecruitment?.applicationStartDate
      ? new Date(posting.canonicalRecruitment.applicationStartDate).toISOString()
      : null,
    exam_date: posting.examDate ? new Date(posting.examDate).toISOString() : null,
    has_apply: Boolean(publicLink(posting.applyUrl)),
    post_names: ((posting.postNames as string[] | null) ?? []).filter((n) => typeof n === "string"),
    extra_tables: (extraContent?.tables ?? []).map((t: any) => t.title as string),
    existing_faqs: extraContent?.faqs?.length ?? 0,
    n_updates: (posting.updates ?? []).length,
  };
  if (noticeFacts.existing_faqs === 0) {
    for (const f of buildNoticeFaqs(noticeFacts)) {
      if (!faqs.some((x) => x.question === f.q)) faqs.push({ question: f.q, answer: f.a });
    }
  }

  const derivedTimeline = buildNoticeTimeline(noticeFacts).map((r, i) => ({
    id: `derived-${i}`,
    stage: r.stage,
    title: r.title,
    titleHi: null,
    description: null,
    descriptionHi: null,
    linkUrl: null,
    eventDate: new Date(r.eventDate),
  }));

  const LIFECYCLE_STAGES_IN_ORDER = [
    "NOTIFICATION_OUT",
    "APPLICATION_OPEN",
    "APPLICATION_CLOSED",
    "ADMIT_CARD_RELEASED",
    "EXAM_SCHEDULED",
    "EXAM_CONDUCTED",
    "RESULT_OUT",
    "MERIT_LIST_OUT",
    "INTERVIEW_SCHEDULED",
    "FINAL_RESULT_OUT",
  ] as const;

  const LIFECYCLE_STAGE_LABELS: Record<string, string> = {
    NOTIFICATION_OUT: "Notification Released",
    APPLICATION_OPEN: "Applications Open",
    APPLICATION_CLOSED: "Applications Close",
    ADMIT_CARD_RELEASED: "Admit Card",
    EXAM_SCHEDULED: "Written Exam",
    EXAM_CONDUCTED: "Exam Conducted",
    RESULT_OUT: "Result Declared",
    MERIT_LIST_OUT: "Merit List Published",
    INTERVIEW_SCHEDULED: "Interview / Document Verification",
    FINAL_RESULT_OUT: "Final Selection Result",
  };

  const allUpdates = [...(posting.updates ?? []), ...derivedTimeline];
  const coveredStages = new Set(allUpdates.map((u: any) => u.stage as string));
  const currentStageIdx = LIFECYCLE_STAGES_IN_ORDER.indexOf(
    posting.currentStage as (typeof LIFECYCLE_STAGES_IN_ORDER)[number],
  );

  const lifecyclePlaceholders = LIFECYCLE_STAGES_IN_ORDER
    .slice(Math.max(0, currentStageIdx + 1))
    .filter((stage) => {
      if (coveredStages.has(stage)) return false;
      if (stage === "EXAM_CONDUCTED" && !posting.examDate) return false;
      if (stage === "MERIT_LIST_OUT" && currentStageIdx < 6) return false;
      return true;
    })
    .map((stage, i) => ({
      id: `placeholder-${i}`,
      stage,
      title: LIFECYCLE_STAGE_LABELS[stage] ?? stage,
      titleHi: null,
      description: null,
      descriptionHi: null,
      linkUrl: null,
      eventDate: null as Date | null,
      isPlaceholder: true,
    }));

  const timeline = [
    ...allUpdates.sort((a: any, b: any) => a.eventDate.getTime() - b.eventDate.getTime()),
    ...lifecyclePlaceholders,
  ];

  const relatedArticles = (posting.postingArticles ?? [])
    .map((pa: any) => pa.article)
    .filter((a: any) => a.status === "PUBLISHED");

  const schema = jsonLdGraph(
    // PQ-006: suppress JobPosting on hub pages (multiple sibling posts exist — each
    // has its own leaf at /jobs/{notice-slug}/{post-slug} which carries the JobPosting).
    isHubPage ? null : buildJobPostingSchema(posting as any, org as any, relatedArticles.map((a: any) => a.slug)),
    buildExamEventSchema(posting as any),
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: org.name, path: orgHref },
      { name: posting.title, path: `/jobs/${posting.slug}` },
    ]),
    buildFAQSchema(faqs),
  );

  const salaryText = formatCurrencyRange(
    posting.salaryMin,
    posting.salaryMax,
    posting.salaryCurrency ?? "INR",
    posting.salaryPeriod ?? "MONTH",
    posting.kind === "GOVERNMENT",
  );

  const recruitmentStatus = recruitmentStatusLabel(
    posting.currentStage,
    posting.validThrough,
    hiringOpen,
    posting.canonicalRecruitment?.applicationStartDate,
  );

  const statusStyles = {
    green:   { pill: "bg-green-100 text-green-800 border-green-200",     dot: "bg-green-500" },
    amber:   { pill: "bg-amber-100 text-amber-800 border-amber-200",     dot: "bg-amber-500" },
    red:     { pill: "bg-red-100 text-red-800 border-red-200",           dot: "bg-red-500" },
    neutral: { pill: "bg-neutral-100 text-neutral-700 border-neutral-200", dot: "bg-neutral-400" },
  };

  // Days left counter
  const daysLeft = posting.validThrough
    ? Math.ceil((new Date(posting.validThrough).getTime() - Date.now()) / 86400000)
    : null;

  const notice = !hiringOpen
    ? `This recruitment has moved past the application stage (${
        STAGE_LABELS[posting.currentStage] ?? posting.currentStage
      }). Details below are kept for reference — see Q5 for the latest update.`
    : null;

  const sv = extraContent?.sourceVerification;

  // Q3: check which sub-sections have content
  const hasEligibilityChecker = Boolean(extraContent?.eligibilityRules);
  const hasAgeTable = (extraContent?.ageTable ?? []).length > 0;
  const hasReservationMatrix =
    extraContent?.reservationMatrix && (extraContent.reservationMatrix.rows ?? []).length > 0;
  const hasPwbdMatrix = Boolean(extraContent?.pwbdMatrix);
  const hasDocumentChecklist = (extraContent?.documentChecklist ?? []).length > 0;
  const hasChecklist = (extraContent?.checklist ?? []).length > 0;
  const hasEligibilityText = Boolean(posting.eligibility);
  const hasEvidenceClauses = (extraContent?.evidenceClauses ?? []).length > 0;
  const hasFee =
    formatFee(posting.applicationFeeGeneral, posting.applicationFeeReserved, false) != null ||
    (extraContent?.bankDetails ?? []).length > 0;
  const hasExtraTables = (extraContent?.tables ?? []).length > 0;
  const hasResponsibilities = Boolean(posting.responsibilities);
  const hasRequirements = Boolean(posting.requirements);
  const hasQ3 =
    hasEligibilityChecker || hasAgeTable || hasReservationMatrix || hasPwbdMatrix ||
    hasDocumentChecklist || hasChecklist || hasEligibilityText || hasEvidenceClauses ||
    hasFee || hasExtraTables || hasResponsibilities || hasRequirements;

  // Q4
  const hasSteps = (extraContent?.steps ?? []).length > 0;
  const hasSelectionProcess = (extraContent?.selectionProcess ?? []).length > 0;
  const hasExamPattern =
    extraContent?.examPattern && (extraContent.examPattern.stages ?? []).length > 0;
  const hasImportantLinks = (extraContent?.importantLinks ?? []).length > 0;
  const hasQ4 = hasSteps || hasSelectionProcess || hasExamPattern;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-xs text-neutral-400">
        <Link href="/" className="hover:text-neutral-700 hover:underline">Home</Link>
        <ChevronRight className="h-3 w-3" />
        {posting.canonicalRecruitment && (
          <>
            <Link href={`/jobs/${posting.canonicalRecruitment.slug}`} className="hover:text-neutral-700 hover:underline">
              {posting.canonicalRecruitment.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <Link href={orgHref} className="hover:text-neutral-700 hover:underline">{org.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-neutral-600">{posting.title}</span>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          Q1 · What is this?
          Status · Title · Org/Location · 8-fact grid · CTAs · Provenance
      ══════════════════════════════════════════════════════════════════ */}
      <SectionCard className="mb-4">
        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-5 py-3">
          <Badge tone="brand">{KIND_LABELS[posting.kind]}</Badge>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${statusStyles[recruitmentStatus.color].pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusStyles[recruitmentStatus.color].dot}`} aria-hidden="true" />
            {recruitmentStatus.label}
          </span>
          {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
            <span className={`text-xs font-semibold ${daysLeft <= 7 ? "text-red-600" : "text-amber-600"}`}>
              {daysLeft === 0 ? "Closes today!" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
            </span>
          )}
          <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Q1
          </span>
        </div>

        {/* Title + org/location */}
        <div className="px-5 pt-4 pb-3">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{posting.title}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <Link href={orgHref} className="font-medium text-neutral-700 hover:underline">{org.name}</Link>
            </span>
            {(posting.locationCity || stateHub) && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {posting.locationCity ?? ""}
                  {posting.locationCity && stateHub ? ", " : ""}
                  {stateHub ? (
                    <Link href={`/states/${stateHub.slug}`} className="hover:underline">{stateHub.name}</Link>
                  ) : posting.locationRegion ?? ""}
                </span>
              </span>
            )}
            {(posting as any).titleHi && (
              <Link href={`/hi/jobs/${posting.slug}`} className="text-xs text-neutral-400 underline hover:no-underline" hrefLang="hi">
                हिंदी में पढ़ें
              </Link>
            )}
          </div>

          {relatedArticles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {relatedArticles.map((article: any) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
                >
                  <BookOpen className="h-3 w-3" />
                  {article.title}
                </Link>
              ))}
            </div>
          )}

          {(extraContent?.highlights ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(extraContent!.highlights!).map((h) => (
                <span
                  key={h.text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-medium shadow-sm"
                >
                  <span aria-hidden="true">{h.icon}</span>
                  {h.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        {notice && (
          <div className="mx-5 mb-3 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <span>{notice}</span>
          </div>
        )}
        {(!posting.validThrough || !posting.officialNotificationUrl || posting.totalVacancies == null) && (
          <div className="mx-5 mb-3 flex gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
            <span>This information is derived from a published source and may be incomplete. Check the official notification before applying.</span>
          </div>
        )}

        {/* 8-fact grid */}
        <div className="grid grid-cols-2 gap-px bg-black/5 border-t border-black/5 sm:grid-cols-4">
          {/* Vacancies */}
          <div className="bg-white px-4 py-3">
            <p className="flex items-center gap-1 text-xs font-medium text-indigo-500">
              <Users className="h-3.5 w-3.5" /> Vacancies
            </p>
            <p className="mt-1 text-xl font-bold text-indigo-900">
              {posting.totalVacancies != null ? posting.totalVacancies.toLocaleString("en-IN") : "—"}
            </p>
            {posting.postNames && posting.postNames.length > 1 && (
              <p className="mt-0.5 text-xs text-indigo-400">{posting.postNames.length} posts</p>
            )}
          </div>

          {/* Last Date */}
          <div className={`px-4 py-3 ${
            daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 ? "bg-red-50"
              : daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 ? "bg-amber-50"
              : "bg-white"
          }`}>
            <p className={`flex items-center gap-1 text-xs font-medium ${
              daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 ? "text-red-500"
                : daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 ? "text-amber-600"
                : "text-neutral-500"
            }`}>
              <Calendar className="h-3.5 w-3.5" /> Last Date
            </p>
            <p className={`mt-1 text-sm font-bold ${
              daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 ? "text-red-900"
                : daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 ? "text-amber-900"
                : "text-neutral-900"
            }`}>
              {posting.validThrough ? formatDate(posting.validThrough, "en-IN") : "—"}
            </p>
            {daysLeft !== null && daysLeft < 0 && (
              <p className="mt-0.5 text-xs text-neutral-400">Closed</p>
            )}
          </div>

          {/* Pay Scale */}
          <div className="bg-white px-4 py-3">
            <p className="flex items-center gap-1 text-xs font-medium text-neutral-500">
              <Banknote className="h-3.5 w-3.5" />
              {posting.kind === "GOVERNMENT" ? "Pay Scale" : "Salary"}
            </p>
            <p className="mt-1 text-sm font-bold text-neutral-900 leading-snug">
              {salaryText ?? "—"}
            </p>
          </div>

          {/* Age Limit */}
          <div className="bg-white px-4 py-3">
            <p className="flex items-center gap-1 text-xs font-medium text-neutral-500">
              <GraduationCap className="h-3.5 w-3.5" /> Age Limit
            </p>
            <p className="mt-1 text-sm font-bold text-neutral-900">
              {extraContent?.seo?.ageDisplay ??
                formatAgeRange(posting.ageLimitMin, posting.ageLimitMax, false) ??
                "—"}
            </p>
          </div>

          {/* Application Fee */}
          <div className="bg-white px-4 py-3">
            <p className="flex items-center gap-1 text-xs font-medium text-neutral-500">
              <Banknote className="h-3.5 w-3.5" /> Application Fee
            </p>
            <p className="mt-1 text-sm font-bold text-neutral-900">
              {formatFee(posting.applicationFeeGeneral, posting.applicationFeeReserved, false) ?? "—"}
            </p>
          </div>

          {/* Exam Date */}
          <div className={`px-4 py-3 ${posting.examDate ? "bg-blue-50" : "bg-white"}`}>
            <p className={`flex items-center gap-1 text-xs font-medium ${posting.examDate ? "text-blue-500" : "text-neutral-500"}`}>
              <ClipboardList className="h-3.5 w-3.5" /> Exam Date
            </p>
            <p className={`mt-1 text-sm font-bold ${posting.examDate ? "text-blue-900" : "text-neutral-900"}`}>
              {posting.examDate ? formatDate(posting.examDate, "en-IN") : "TBA"}
            </p>
          </div>

          {/* Notification No. */}
          {sv?.advertisementNo ? (
            <div className="bg-white px-4 py-3">
              <p className="flex items-center gap-1 text-xs font-medium text-neutral-500">
                <Hash className="h-3.5 w-3.5" /> Notification No.
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-neutral-900">{sv.advertisementNo}</p>
            </div>
          ) : (
            <div className="bg-white px-4 py-3">
              <p className="flex items-center gap-1 text-xs font-medium text-neutral-500">
                <FileText className="h-3.5 w-3.5" /> Employment Type
              </p>
              <p className="mt-1 text-sm font-bold text-neutral-900">{EMPLOYMENT_TYPE_LABELS[posting.employmentType]}</p>
            </div>
          )}

          {/* Posted On */}
          <div className="bg-white px-4 py-3">
            <p className="flex items-center gap-1 text-xs font-medium text-neutral-500">
              <Clock className="h-3.5 w-3.5" /> Posted On
            </p>
            <p className="mt-1 text-sm font-bold text-neutral-900">
              {posting.datePosted ? formatDate(posting.datePosted, "en-IN") : "—"}
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2 border-t border-black/5 px-5 py-4 sm:flex-row sm:flex-wrap">
          {publicLink(posting.applyUrl) && hiringOpen && (
            <a
              href={publicLink(posting.applyUrl) as string}
              target="_blank"
              rel="noopener nofollow"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-700 active:scale-[0.98]"
            >
              Apply Now
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {publicLink(posting.officialNotificationUrl) && (
            <a
              href={publicLink(posting.officialNotificationUrl) as string}
              target="_blank"
              rel="noopener nofollow"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 active:scale-[0.98]"
            >
              <FileText className="h-3.5 w-3.5" />
              Official Notification (PDF)
            </a>
          )}
        </div>

        {/* Provenance footer */}
        {(sv || posting.lastVerifiedAt) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/5 bg-neutral-50 px-5 py-3 text-xs text-neutral-400 rounded-b-xl">
            {sv?.sourceType && (
              <span className={sv.sourceType === "official" ? "text-green-600 font-medium" : ""}>
                {sv.sourceType === "official" ? "✅ Officially verified" : "ℹ️ Derived from published source"}
              </span>
            )}
            {sv?.sourceName && <span>Source: {sv.sourceName}</span>}
            {sv?.advertisementNo && <span>Advt. No: {sv.advertisementNo}</span>}
            {sv?.lastChecked && <span>Checked: {formatDate(new Date(sv.lastChecked), "en-IN")}</span>}
            {!sv && posting.lastVerifiedAt && <span>Last verified: {formatDate(posting.lastVerifiedAt, "en-IN")}</span>}
          </div>
        )}
      </SectionCard>

      {/* ── Entity context pill strip (Part of) ── */}
      {(posting.canonicalPosition || posting.canonicalRecruitment || posting.exam) && (
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-black/8 bg-white px-5 py-3 text-sm shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Part of</span>
          {posting.canonicalRecruitment && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 text-xs">Recruitment</span>
              <Link href={`/jobs/${posting.canonicalRecruitment.slug}`} className="font-medium text-indigo-700 hover:underline">
                {posting.canonicalRecruitment.name}
              </Link>
            </div>
          )}
          {posting.canonicalPosition && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 text-xs">Position</span>
              <Link href={`/positions/${posting.canonicalPosition.slug}`} className="font-medium text-indigo-700 hover:underline">
                {posting.canonicalPosition.name}
              </Link>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 text-xs">Organisation</span>
            <Link href={orgHref} className="font-medium text-indigo-700 hover:underline">{org.name}</Link>
          </div>
          {posting.exam && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 text-xs">Exam</span>
              <Link href={`/exams/${posting.exam.slug}`} className="font-medium text-indigo-700 hover:underline">
                {posting.exam.label}
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">

        {/* ══════════════════════════════════════════════════════════════════
            Q2 · Can I apply?
            Eligibility summary + interactive checker
        ══════════════════════════════════════════════════════════════════ */}
        {(hasEligibilityChecker || hasEligibilityText) && (
          <SectionCard>
            <SectionHeader icon={GraduationCap} title="Can I Apply?" label="Q2" />

            {/* Plain-text eligibility summary */}
            {hasEligibilityText && (
              <div className="px-5 pt-4 pb-3 text-sm text-neutral-700 leading-relaxed">
                <p className="font-medium text-neutral-500 text-xs mb-1.5 uppercase tracking-wide">Who is eligible in brief</p>
                <p className="whitespace-pre-line">{posting.eligibility}</p>
              </div>
            )}

            {/* Interactive checker */}
            {hasEligibilityChecker && (
              <>
                {hasEligibilityText && <SubDivider />}
                <div className="px-5 py-4">
                  <EligibilityChecker
                    rules={extraContent!.eligibilityRules!}
                    closingDate={posting.validThrough ? new Date(posting.validThrough).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </>
            )}

            {(!hasEligibilityText && !hasEligibilityChecker) && (
              <p className="px-5 py-4 text-sm italic text-neutral-400">Not mentioned in notification</p>
            )}
          </SectionCard>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            Q3 · What do I need?
            Qualification rules · Age · Vacancy breakdown · Docs · Fee
        ══════════════════════════════════════════════════════════════════ */}
        {hasQ3 && (
          <SectionCard>
            <SectionHeader icon={ClipboardList} title="What Do I Need?" label="Q3" />

            {/* Eligibility rules / checklist / responsibilities */}
            {(hasDocumentChecklist || hasChecklist || hasResponsibilities || hasRequirements || hasEvidenceClauses) && (
              <>
                {/* Document Checklist */}
                {hasDocumentChecklist && (
                  <SubSection title="Documents Required">
                    <ul className="space-y-2">
                      {extraContent!.documentChecklist!.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm">
                          <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            item.required ? "bg-red-100 text-red-600" : "bg-neutral-100 text-neutral-400"
                          }`} aria-hidden="true">
                            {item.required ? "✱" : "○"}
                          </span>
                          <span className="text-neutral-700">
                            {item.text}
                            {(item.requiredFor ?? []).length > 0 && (
                              <span className="ml-1 text-xs text-neutral-400">({item.requiredFor!.join(", ")})</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </SubSection>
                )}

                {/* Checklist groups */}
                {!hasDocumentChecklist && hasChecklist && (
                  <>
                    {(extraContent!.checklist!).map((group) => (
                      <SubSection key={group.heading} title={group.heading}>
                        <ul className="space-y-1.5">
                          {group.items.map((item, idx) => (
                            <li key={idx} className="flex gap-2 text-sm text-neutral-700">
                              <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
                              <span>{item.text}</span>
                            </li>
                          ))}
                        </ul>
                      </SubSection>
                    ))}
                  </>
                )}

                {/* Evidence clauses */}
                {hasEvidenceClauses && (
                  <>
                    <SubDivider />
                    <SubSection title="Key Rules from Notification">
                      <ul className="space-y-2">
                        {extraContent!.evidenceClauses!.map((clause, i) => (
                          <li key={i} className="rounded-lg border border-black/8 bg-neutral-50 px-3 py-2.5 text-sm">
                            <p className="font-semibold text-neutral-800">{clause.label}</p>
                            <p className="mt-0.5 text-neutral-600">{clause.text}</p>
                            <p className="mt-1 text-xs text-neutral-400">Official notification, p.{clause.sourcePage}</p>
                          </li>
                        ))}
                      </ul>
                    </SubSection>
                  </>
                )}

                {/* Responsibilities */}
                {hasResponsibilities && (
                  <>
                    <SubDivider />
                    <SubSection title="Responsibilities">
                      {/^[-•]/m.test(posting.responsibilities!) ? (
                        <ul className="space-y-1.5">
                          {posting.responsibilities!
                            .split("\n")
                            .map((line: string) => line.replace(/^[-•]\s*/, "").trim())
                            .filter(Boolean)
                            .map((line: string, i: number) => (
                              <li key={i} className="flex gap-2 text-sm text-neutral-700">
                                <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
                                <span>{line}</span>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="whitespace-pre-line text-sm text-neutral-700">{posting.responsibilities}</p>
                      )}
                    </SubSection>
                  </>
                )}

                {/* Requirements */}
                {hasRequirements && (
                  <>
                    <SubDivider />
                    <SubSection title="Requirements">
                      <p className="whitespace-pre-line text-sm text-neutral-700">{posting.requirements}</p>
                    </SubSection>
                  </>
                )}
              </>
            )}

            {/* Age Limit */}
            <>
              <SubDivider />
              <SubSection title="Age Limit">
                {hasAgeTable ? (
                  <div className="overflow-x-auto rounded-lg border border-black/8">
                    <table className="w-full min-w-[24rem] border-collapse text-sm">
                      <thead>
                        <tr className="bg-neutral-50">
                          {["Category", "Max Age", "PwBD Relaxation", "PwBD Max", "Note"].map((h) => (
                            <th key={h} className="border-b border-black/8 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {extraContent!.ageTable!.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? "" : "bg-neutral-50/50"}>
                            <td className="border-b border-black/5 px-3 py-2 font-medium text-neutral-800">{row.category}</td>
                            <td className="border-b border-black/5 px-3 py-2 text-neutral-700">{row.baseMax} yrs</td>
                            <td className="border-b border-black/5 px-3 py-2 text-neutral-700">{row.pwbdRelaxation != null ? `+${row.pwbdRelaxation} yrs` : "—"}</td>
                            <td className="border-b border-black/5 px-3 py-2 text-neutral-700">{row.pwbdMax != null ? `${row.pwbdMax} yrs` : "—"}</td>
                            <td className="border-b border-black/5 px-3 py-2 text-neutral-500 text-xs">{row.note ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : posting.ageRelaxationNotes ? (
                  <p className="whitespace-pre-line text-sm text-neutral-700">{posting.ageRelaxationNotes}</p>
                ) : (
                  <p className="text-sm text-neutral-700">
                    {extraContent?.seo?.ageDisplay ??
                      formatAgeRange(posting.ageLimitMin, posting.ageLimitMax, false) ??
                      <span className="italic text-neutral-400">Not mentioned in notification</span>}
                  </p>
                )}
              </SubSection>
            </>

            {/* Vacancy distribution */}
            {hasReservationMatrix && (
              <>
                <SubDivider />
                <SubSection title="Vacancy Distribution by Category">
                  <div className="overflow-x-auto rounded-lg border border-black/8">
                    <table className="w-full min-w-[28rem] border-collapse text-sm">
                      <thead>
                        <tr className="bg-neutral-50">
                          {extraContent!.reservationMatrix!.rows[0]?.post !== undefined && (
                            <th className="border-b border-black/8 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Post</th>
                          )}
                          {["UR", "EWS", "OBC", "SC", "ST", "Total"].map((h) => (
                            <th key={h} className="border-b border-black/8 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">{h}</th>
                          ))}
                          <th className="border-b border-black/8 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">PwBD (H)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extraContent!.reservationMatrix!.rows.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? "" : "bg-neutral-50/50"}>
                            {row.post !== undefined && (
                              <td className="border-b border-black/5 px-3 py-2 font-medium text-neutral-800">{row.post}</td>
                            )}
                            {([row.ur, row.ews, row.obc, row.sc, row.st, row.total] as number[]).map((v, j) => (
                              <td key={j} className="border-b border-black/5 px-3 py-2 text-right font-mono text-neutral-700">{v ?? "—"}</td>
                            ))}
                            <td className="border-b border-black/5 px-3 py-2 text-xs text-neutral-500">
                              {row.pwbdHorizontal != null ? `${row.pwbdHorizontal} (${row.pwbdCategory ?? "—"})` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {extraContent!.reservationMatrix!.sourcePage != null && (
                    <p className="mt-1 text-xs text-neutral-400">Source: official notification, page {extraContent!.reservationMatrix!.sourcePage}</p>
                  )}
                </SubSection>
              </>
            )}

            {/* PwBD suitability */}
            {hasPwbdMatrix && (
              <>
                <SubDivider />
                <SubSection title="PwBD Suitability">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                    {extraContent!.pwbdMatrix!.suitable.length > 0 && (
                      <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                        <p className="mb-1.5 text-xs font-semibold text-green-700 uppercase tracking-wide">Suitable</p>
                        <ul className="space-y-1 text-neutral-700">
                          {extraContent!.pwbdMatrix!.suitable.map((s, i) => (
                            <li key={i} className="flex gap-1.5 text-xs"><span className="text-green-600 font-bold">✓</span>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {extraContent!.pwbdMatrix!.notSuitable.length > 0 && (
                      <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                        <p className="mb-1.5 text-xs font-semibold text-red-700 uppercase tracking-wide">Not Suitable</p>
                        <ul className="space-y-1 text-neutral-700">
                          {extraContent!.pwbdMatrix!.notSuitable.map((s, i) => (
                            <li key={i} className="flex gap-1.5 text-xs"><span className="text-red-500 font-bold">✗</span>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {extraContent!.pwbdMatrix!.sourcePage != null && (
                    <p className="mt-1 text-xs text-neutral-400">Source: official notification, page {extraContent!.pwbdMatrix!.sourcePage}</p>
                  )}
                </SubSection>
              </>
            )}

            {/* Application Fee inline in Q3 */}
            {hasFee && (extraContent?.bankDetails ?? []).length === 0 && (
              <>
                <SubDivider />
                <SubSection title="Application Fee">
                  <p className="text-sm text-neutral-700">
                    {formatFee(posting.applicationFeeGeneral, posting.applicationFeeReserved, false)}
                  </p>
                </SubSection>
              </>
            )}

            {/* Extra tables (vacancy/post breakdown) */}
            {hasExtraTables && (
              <>
                {(extraContent!.tables!).map((t) => (
                  <React.Fragment key={t.title}>
                    <SubDivider />
                    <SubSection title={t.title}>
                      <div className="overflow-x-auto rounded-lg border border-black/8">
                        <table className="w-full min-w-[20rem] border-collapse text-sm">
                          <thead>
                            <tr className="bg-neutral-50">
                              {t.headers.map((h) => (
                                <th key={h} className="border-b border-black/8 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {t.rows.map((r, ri) => (
                              <tr key={r.join("|")} className={ri % 2 === 0 ? "" : "bg-neutral-50/50"}>
                                {r.map((c, i) => (
                                  <td key={i} className="border-b border-black/5 px-4 py-2.5 text-neutral-700">{c}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </SubSection>
                  </React.Fragment>
                ))}
              </>
            )}

            {/* Bank / fee details */}
            {(extraContent?.bankDetails ?? []).length > 0 && (
              <>
                <SubDivider />
                <SubSection title="Fee & Payment Details">
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(extraContent!.bankDetails!).map((row) => (
                      <div key={row.label} className="rounded-lg border border-black/8 bg-neutral-50 px-3 py-2.5">
                        <dt className="text-xs text-neutral-400">{row.label}</dt>
                        <dd className="mt-0.5 font-mono text-sm font-medium text-neutral-900">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </SubSection>
              </>
            )}
          </SectionCard>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            Q4 · How does it work?
            Selection process · How to apply · Exam pattern · Links
        ══════════════════════════════════════════════════════════════════ */}
        {hasQ4 && (
          <SectionCard>
            <SectionHeader icon={CheckCircle} title="How Does It Work?" label="Q4" />

            {/* Selection Process */}
            {hasSelectionProcess && (
              <SubSection title="Selection Process">
                <ol className="space-y-3">
                  {(extraContent!.selectionProcess!).map((s) => (
                    <li key={s.step} className="flex gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-700">
                        {s.step}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{s.title}</p>
                        {s.body && <p className="mt-0.5 text-xs text-neutral-600">{s.body}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </SubSection>
            )}

            {/* How to Apply */}
            {hasSteps && (
              <>
                {hasSelectionProcess && <SubDivider />}
                <SubSection title="How to Apply — Step by Step">
                  <ol className="space-y-4">
                    {(extraContent!.steps!).map((s) => (
                      <li key={s.step} className="flex gap-4">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                          {s.step}
                        </span>
                        <div>
                          <p className="font-semibold text-neutral-900 text-sm">{s.title}</p>
                          <p className="mt-0.5 text-sm text-neutral-600">{s.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </SubSection>
              </>
            )}

            {/* Exam Pattern */}
            {hasExamPattern && (
              <>
                <SubDivider />
                <SubSection title="Exam Pattern">
                  <div className="overflow-x-auto rounded-lg border border-black/8">
                    <table className="w-full min-w-[24rem] border-collapse text-sm">
                      <thead>
                        <tr className="bg-neutral-50">
                          {["Stage", "Marks", "Duration", "Mode"].map((h) => (
                            <th key={h} className={`border-b border-black/8 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 ${h === "Marks" ? "text-right" : "text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {extraContent!.examPattern!.stages.map((s, i) => (
                          <tr key={i} className={i % 2 === 0 ? "" : "bg-neutral-50/50"}>
                            <td className="border-b border-black/5 px-4 py-2.5 font-medium text-neutral-800">{s.name}</td>
                            <td className="border-b border-black/5 px-4 py-2.5 text-right font-mono text-neutral-700">{s.marks}</td>
                            <td className="border-b border-black/5 px-4 py-2.5 text-neutral-700">{s.duration ?? "—"}</td>
                            <td className="border-b border-black/5 px-4 py-2.5 text-neutral-700">{s.mode ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {extraContent!.examPattern!.sourcePage != null && (
                    <p className="mt-2 text-xs text-neutral-400">Source: official notification, page {extraContent!.examPattern!.sourcePage}</p>
                  )}
                </SubSection>
              </>
            )}

            {/* Notices (trap warnings, helpdesk, etc.) */}
            {(extraContent?.notices ?? []).length > 0 && (
              <>
                <SubDivider />
                <div className="px-5 py-4 space-y-3">
                  {(extraContent!.notices!).map((n) => (
                    <div key={n.title} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                      <p className="font-semibold text-amber-900 mb-1">{n.title}</p>
                      <p className="whitespace-pre-line text-amber-800">{n.body}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        )}

        {/* Important Links */}
        {hasImportantLinks && (
          <SectionCard>
            <SectionHeader icon={ExternalLink} title="Important Links" />
            <div className="px-5 py-4 flex flex-wrap gap-2">
              {extraContent!.importantLinks!.map((link, i) => {
                const toneMap: Record<string, string> = {
                  apply: "bg-brand-600 text-white hover:bg-brand-700",
                  notification: "border border-black/15 bg-white hover:bg-neutral-50 text-neutral-700",
                  admit_card: "border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
                  result: "border border-green-200 bg-green-50 text-green-800 hover:bg-green-100",
                  answer_key: "border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100",
                  cut_off: "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
                  syllabus: "border border-black/15 bg-white hover:bg-neutral-50 text-neutral-700",
                  other: "border border-black/15 bg-white hover:bg-neutral-50 text-neutral-700",
                };
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener nofollow"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${toneMap[link.linkType] ?? toneMap.other}`}
                  >
                    {link.label}
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </a>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            Q5 · What's next?
            Lifecycle timeline (with placeholders)
        ══════════════════════════════════════════════════════════════════ */}
        {timeline.length > 0 && (
          <SectionCard>
            <SectionHeader icon={Clock} title="What's Next?" label="Q5" />
            <ol className="px-5 py-4 space-y-0">
              {timeline.map((update: any, idx: number) => {
                const isLast = idx === timeline.length - 1;
                return (
                  <li key={update.id} className={`relative flex gap-4 ${!isLast ? "pb-5" : ""}`}>
                    {!isLast && (
                      <div
                        className={`absolute left-[11px] top-6 bottom-0 w-px ${update.isPlaceholder ? "border-l border-dashed border-neutral-200" : "bg-neutral-200"}`}
                        aria-hidden="true"
                      />
                    )}
                    <div className={`relative mt-0.5 h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center ${
                      update.isPlaceholder
                        ? "border-2 border-dashed border-neutral-300 bg-white"
                        : "bg-indigo-600"
                    }`}>
                      {!update.isPlaceholder && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${update.isPlaceholder ? "text-neutral-400" : "text-neutral-500"}`}>
                        {update.isPlaceholder ? "Date TBA" : formatDate(update.eventDate, "en-IN")}
                      </p>
                      <p className={`text-sm font-medium leading-snug ${update.isPlaceholder ? "text-neutral-400" : "text-neutral-900"}`}>
                        {update.isPlaceholder
                          ? update.title
                          : String(update.id).startsWith("derived-")
                            ? stripAggregatorTag(update.title)
                            : `${STAGE_LABELS[update.stage] ?? update.stage}: ${stripAggregatorTag(update.title)}`}
                      </p>
                      {update.description && !update.isPlaceholder && (
                        <p className="mt-0.5 text-xs text-neutral-500">{update.description}</p>
                      )}
                      {publicLink(update.linkUrl) && !update.isPlaceholder && (
                        <a
                          href={publicLink(update.linkUrl) as string}
                          target="_blank"
                          rel="noopener nofollow"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </SectionCard>
        )}

        {/* ── Posts in This Notice (PQ-006, A-080) ────────────────────────────
            Renders a distinct card per post regardless of whether canonical
            post rows exist:
              • Canonical: /jobs/[recruitment-slug]/[post-slug] — clickable
              • Legacy (postNames only): informational card, no sub-page yet
        ──────────────────────────────────────────────────────────────────── */}
        {(() => {
          // Canonical path: posts table rows exist for this recruitment
          if (siblingPosts.length > 0 && posting.canonicalRecruitment) {
            return (
              <SectionCard>
                <SectionHeader icon={Hash} title={`Posts in This Notice (${siblingPosts.length})`} />
                <div className="space-y-3 p-5">
                  {siblingPosts.map((p: any, i: number) => {
                    // Derive age range from post's ageRules rows (same logic as leaf page)
                    const ageRules: any[] = p.ageRules ?? [];
                    const ageMin = ageRules.length > 0
                      ? Math.min(...ageRules.map((r: any) => r.minAge ?? Infinity).filter(isFinite))
                      : null;
                    const ageMax = ageRules.length > 0
                      ? Math.max(...ageRules.map((r: any) => r.maxAge ?? -Infinity).filter(isFinite))
                      : null;
                    return (
                      <CanonicalPostCard
                        key={p.id}
                        name={p.name}
                        slug={p.slug}
                        recruitmentSlug={posting.canonicalRecruitment!.slug}
                        vacancyTotal={p.vacancyTotal}
                        vacancyDetails={p.vacancyDetails}
                        salaryMin={p.salaryMin}
                        salaryMax={p.salaryMax}
                        positionName={p.position?.name}
                        ageMin={ageMin !== Infinity && ageMin !== null ? ageMin : null}
                        ageMax={ageMax !== -Infinity && ageMax !== null ? ageMax : null}
                        applyUrl={publicLink(posting.applyUrl) ?? null}
                        employmentType={posting.employmentType ?? null}
                        index={i}
                      />
                    );
                  })}
                </div>
              </SectionCard>
            );
          }

          // Legacy path: postNames string[] on the posting itself
          const legacyNames = (posting.postNames as string[] | null) ?? [];
          if (legacyNames.length > 0) {
            return (
              <SectionCard>
                <SectionHeader icon={Hash} title={`Posts in This Notice (${legacyNames.length})`} />
                <div className="space-y-3 p-5">
                  {legacyNames.map((name: string, i: number) => (
                    <LegacyPostCard key={name} name={name} index={i} />
                  ))}
                </div>
              </SectionCard>
            );
          }

          return null;
        })()}

        {/* ── FAQ ── */}
        {faqs.length > 0 && (
          <SectionCard>
            <SectionHeader title="Frequently Asked Questions" />
            <div className="divide-y divide-black/5 px-5">
              {faqs.map((faq) => (
                <div key={faq.question} className="py-4">
                  <p className="font-medium text-neutral-900 text-sm">{faq.question}</p>
                  <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Related Guides ── */}
        {relatedArticles.length > 0 && (
          <SectionCard>
            <SectionHeader icon={BookOpen} title="Related Guides" />
            <ul className="divide-y divide-black/5 px-5">
              {relatedArticles.map((article: any) => (
                <li key={article.id} className="py-3">
                  <Link href={`/articles/${article.slug}`} className="flex items-center justify-between gap-2 group">
                    <span className="text-sm font-medium text-neutral-800 group-hover:text-indigo-700">{article.title}</span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-400 group-hover:text-indigo-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

      </div>

      {/* ── Related Canonical Entities ── */}
      <section className="mt-8 border-t border-black/8 pt-8">
        <h2 className="mb-4 text-sm font-semibold text-neutral-400 uppercase tracking-wider">Related Information</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {posting.canonicalPosition && (
            <InfoCard
              tone="brand"
              href={`/positions/${posting.canonicalPosition.slug}`}
              title={posting.canonicalPosition.name}
              subtitle="View all recruitment campaigns for this position"
            />
          )}
          {posting.canonicalRecruitment && (
            <InfoCard
              tone="success"
              href={`/jobs/${posting.canonicalRecruitment.slug}`}
              title={posting.canonicalRecruitment.name}
              subtitle="View recruitment timeline and all posts"
            />
          )}
          <InfoCard
            tone="neutral"
            href={orgHref}
            title={org.name}
            subtitle="View all campaigns and exams"
          />
          {posting.exam && (
            <InfoCard
              tone="neutral"
              href={`/exams/${posting.exam.slug}`}
              title={posting.exam.label}
              subtitle="View exam details and other campaigns"
            />
          )}
        </div>
      </section>

      {/* ── Report Error ── */}
      <p className="mt-8 text-xs text-neutral-400">
        Spotted an error or outdated information?{" "}
        <Link href="/contact" className="underline hover:text-neutral-600">
          Report it
        </Link>
        {" "}and we&apos;ll fix it.
      </p>
    </div>
  );
}
