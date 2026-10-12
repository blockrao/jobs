'use client';

/**
 * Recruitment Hub Component
 *
 * Route: /jobs/[recruitment-slug]
 *
 * Spec: Recruitment-level discovery and navigation page.
 * This is NOT a Post Leaf. It does not duplicate Post-specific facts.
 *
 * Architecture (approved spec, 2026-10-09):
 *   - Recruitment Header: identity, status badge, key stats hero (vacancy + deadline)
 *   - Recruitment Snapshot: key resolver-gated facts only
 *   - Dated milestone timeline: Notification → Application Opens → Application Closes
 *   - Posts / Opportunities: single-column list with per-row vacancy + status colour
 *   - FAQ: conditional — only questions whose answer is a non-null resolver output
 *   - Trust / Source: official notification + apply links
 *
 * Competitor improvements (2026-10-09):
 *   - Vacancy count is a large hero stat, not a table row (YuvaResult pattern)
 *   - "Closing in N days" urgency countdown when deadline ≤ 14 days
 *   - Per-post status colour badges: Open / Closing Soon / Closed (JobOne.in pattern)
 *   - Stats row beneath title: vacancies + deadline + post count as scannable chips
 *
 * Excluded (by spec):
 *   - Salary / pay level (Post-specific; Phase 1 exclusion)
 *   - Eligibility, qualification, age, experience (Post Leaf only / Phase 2)
 *   - "Am I eligible?" checker
 *   - Generic fabricated FAQ answers
 *   - Enrichment fields as authoritative facts
 *   - Filter chips, pagination (Phase 1)
 *   - Summing Post vacancies for Recruitment total
 */

import React from 'react';
import type { recruitments, posts, positions } from '@/db/schema';

type RecruitmentHubRecruitment = typeof recruitments.$inferSelect & {
  organizationName?: string | null;
  exam?: { name?: string | null; title?: string | null } | null;
  officialNotificationNumber?: string | null;
  official_notification_number?: string | null;
  advertisementNumber?: string | null;
  advertisement_number?: string | null;
  recruitmentFees?: unknown;
  feeGeneral?: number | string | null;
  fee_general?: number | string | null;
  feeReserved?: number | string | null;
  fee_reserved?: number | string | null;
  feeNote?: string | null;
  fee_note?: string | null;
  selectionProcesses?: unknown;
  sourceVerificationStatus?: string | null;
  sourceListingPublishedDate?: Date | string | null;
  sourceExtract?: {
    title?: string | null;
    sourceUrl?: string | null;
    applicationStartDate?: Date | string | null;
    applicationEndDate?: Date | string | null;
    vacancyCount?: number | null;
    qualification?: string | null;
    details?: unknown;
    otherInfoRaw?: unknown;
    sourceStatus?: string | null;
    detailStatus?: string | null;
  } | null;
};

type RecruitmentHubPost = typeof posts.$inferSelect & {
  position?: typeof positions.$inferSelect | null;
  resolvedVacancyCount?: number | null;
  status?: string | null;
  lifecycle_status?: string | null;
  // application_email may exist in the DB but not yet in the generated Drizzle schema type
  application_email?: string | null;
  applicationEmail?: string | null;
  fjaExtract?: {
    inventoryId?: number | string;
    vacancyCountRaw?: string | null;
    qualificationRaw?: string | null;
    experienceRaw?: string | null;
    salaryRaw?: string | null;
    tenureRaw?: string | null;
    locationRaw?: string | null;
    employmentTypeRaw?: string | null;
    verificationStatus?: string | null;
    otherInfoRaw?: unknown;
  } | null;
};
import Link from 'next/link';
import {
  ChevronRight,
  Briefcase,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Globe,
  ExternalLink,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface RecruitmentHubProps {
  recruitment: RecruitmentHubRecruitment;
  posts: RecruitmentHubPost[];
  /** Resolved total vacancies from resolveRecruitmentVacancy() — null means unknown */
  resolvedTotalVacancies?: number | null;
  /** Resolved application URL from resolveApplicationUrl() */
  resolvedApplicationUrl?: string | null;
  /** Resolved official source URL from resolveOfficialSource() */
  resolvedOfficialSource?: string | null;
  /** Resolved employer name from resolveEmployer() */
  resolvedEmployer?: string | null;
  /** Resolved selection process from resolveSelectionProcess() */
  resolvedSelectionProcess?: string | null;
  /** Org slug for breadcrumb link — from organizations.slug */
  orgSlug?: string | null;
  /** Preserve locale-prefixed navigation for the supported Hindi route. */
  locale?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
};

/** Days remaining until a date. Negative = already past. */
const daysUntil = (date: Date | string | null | undefined): number | null => {
  if (!date) return null;
  try {
    const ms = new Date(date).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

/** Returns true only when the status string explicitly means closed/expired */
const isRecruitmentClosed = (status: string | null | undefined): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'closed' || s === 'expired' || s === 'completed';
};

const isRecruitmentActive = (status: string | null | undefined): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'active' || s === 'open';
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const parseReportedVacancyCount = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const isRecruitmentUpcoming = (status: string | null | undefined): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'upcoming' || s === 'announced';
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;

  if (isRecruitmentClosed(status)) {
    return (
      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full border border-gray-300">
        Closed
      </span>
    );
  }
  if (isRecruitmentActive(status)) {
    return (
      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full border border-green-300">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        Active
      </span>
    );
  }
  if (isRecruitmentUpcoming(status)) {
    return (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full border border-blue-300">
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200">
      {status}
    </span>
  );
}

/** Per-post status badge with colour coding (JobOne.in pattern) */
function PostStatusBadge({ post, appEndDate }: { post: RecruitmentHubPost; appEndDate?: Date | string | null }) {
  const status = post.status ?? post.lifecycle_status ?? null;

  // If post has explicit closed/expired status
  if (status) {
    const s = String(status).toLowerCase();
    if (s === 'closed' || s === 'expired') {
      return (
        <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
          Closed
        </span>
      );
    }
  }

  // Use recruitment deadline for "Closing Soon" signal when post has no individual status
  if (appEndDate) {
    const days = daysUntil(appEndDate);
    if (days !== null && days >= 0 && days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full border border-orange-200">
          <Clock size={10} />
          {days === 0 ? 'Last Day' : `${days}d left`}
        </span>
      );
    }
  }

  if (status) {
    const s = String(status).toLowerCase();
    if (s === 'active' || s === 'open') {
      return (
        <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full border border-green-200">
          Open
        </span>
      );
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RecruitmentHub({
  recruitment,
  posts,
  resolvedTotalVacancies,
  resolvedApplicationUrl,
  resolvedOfficialSource,
  resolvedEmployer,
  resolvedSelectionProcess,
  orgSlug,
  locale = "en",
}: RecruitmentHubProps) {
  const localePrefix = locale === "hi" ? "/hi" : "";
  const displayOrg = resolvedEmployer ?? recruitment.organizationName ?? null;
  // A linked extracted inventory record is unverified unless it explicitly
  // carries VERIFIED status. Null/missing status must never imply verification.
  const sourceFactsUnverified = Boolean(
    recruitment.sourceExtract &&
    recruitment.sourceVerificationStatus !== "VERIFIED"
  );
  const notificationDate = formatDate(
    sourceFactsUnverified ? recruitment.sourceListingPublishedDate : recruitment.notificationDate
  );
  const notificationDateLabel = sourceFactsUnverified ? "Source listing published" : "Notification Published";
  const appStart = formatDate(sourceFactsUnverified
    ? recruitment.sourceExtract?.applicationStartDate
    : recruitment.applicationStartDate);
  const appEnd = formatDate(sourceFactsUnverified
    ? recruitment.sourceExtract?.applicationEndDate ?? recruitment.applicationEndDate
    : recruitment.applicationEndDate);
  const appEndLabel = sourceFactsUnverified ? "Application deadline reported" : "Application Closes";
  const closed = sourceFactsUnverified ? false : isRecruitmentClosed(recruitment.status);
  const sourceStatusLabel = typeof recruitment.sourceExtract?.sourceStatus === "string"
    ? recruitment.sourceExtract.sourceStatus.toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
    : null;
  // Internal pilot/seed notes are operational metadata, not candidate-facing copy.
  const descriptionIsInternal = /seeded from .*sample article|ui\/db validation|sample listing seeded/i.test(
    String(recruitment.description ?? '')
  );
  const descriptionIsProvisionalGrouping = sourceFactsUnverified &&
    /provisional|grouped|individual official notices/i.test(String(recruitment.description ?? ""));
  const displayDescription = descriptionIsProvisionalGrouping
    ? "This page brings together roles reported in source material. Confirm the exact role, eligibility, vacancy count and deadline in each official notice before applying."
    : recruitment.description;

  // Render values already maintained by the admin/data pipeline. Resolvers may
  // enrich these values, but a missing resolver result must not hide stored data.
  // Recruitment-level vacancy total is shown only when explicitly stored; never
  // derive it by summing post-level vacancy records.
  const extractedRecruitmentVacancies = sourceFactsUnverified
    ? recruitment.sourceExtract?.vacancyCount ?? null
    : null;
  const displayTotalVacancies =
    extractedRecruitmentVacancies ?? resolvedTotalVacancies ?? recruitment.totalVacancies ?? null;
  // External source/apply links must pass the authoritative URL resolvers.
  // If no verified URL is available, omit the link rather than exposing a discovery source.
  const displayApplicationUrl = resolvedApplicationUrl ?? null;
  const displayOfficialSource = resolvedOfficialSource ?? null;
  const sourceDetails = asRecord(recruitment.sourceExtract?.details);
  const sourceOtherInfo = asRecord(recruitment.sourceExtract?.otherInfoRaw);
  const sourceLocation = typeof sourceDetails?.location === "string" ? sourceDetails.location : null;
  const sourceApplicationMode = typeof sourceDetails?.application_mode === "string"
    ? sourceDetails.application_mode
    : null;
  // pay_range: hub-level salary range from inventory (e.g. "₹15,000-₹37,000 per month")
  const sourcePayRange = typeof sourceDetails?.pay_range === "string" ? sourceDetails.pay_range : null;
  // application_email: if all posts share the same email, surface it at hub level
  const postEmails = Array.from(new Set(posts.map((p: RecruitmentHubPost) => p.application_email ?? p.applicationEmail).filter(Boolean)));
  const sharedApplicationEmail: string | null = postEmails.length === 1 ? (postEmails[0] as string) : null;
  // application_documents: checklist from sourceOtherInfo
  const sourceDocuments: string[] = Array.isArray(sourceOtherInfo?.application_documents)
    ? (sourceOtherInfo.application_documents as unknown[]).filter((d): d is string => typeof d === "string")
    : [];
  const sourceSelectionSummary = typeof sourceOtherInfo?.interview === "string"
    ? sourceOtherInfo.interview
    : null;
  const tentativeInterviewDate = sourceFactsUnverified &&
    typeof sourceDetails?.interview_date_tentative === "string"
    ? formatDate(sourceDetails.interview_date_tentative)
    : null;
  const displaySelectionProcess =
    resolvedSelectionProcess ?? recruitment.selectionProcess ??
    (sourceFactsUnverified ? sourceSelectionSummary : null);

  // Urgency: days remaining for deadline
  const daysLeft = sourceFactsUnverified ? null : daysUntil(recruitment.applicationEndDate);
  const isClosingSoon = !sourceFactsUnverified && daysLeft !== null && daysLeft >= 0 && daysLeft <= 14 && !closed;
  const isLastDay = daysLeft === 0;

  // Determine if the dated timeline has anything to show
  const hasTimeline = !!(notificationDate || appStart || appEnd || tentativeInterviewDate);

  // Posts: single-column comparison list
  const hasPosts = posts.length > 0;
  const isSinglePost = posts.length === 1;

  const examName = recruitment.exam?.name ?? recruitment.exam?.title ?? null;
  const notificationNumber = recruitment.officialNotificationNumber ?? recruitment.official_notification_number
    ?? recruitment.advertisementNumber ?? recruitment.advertisement_number ?? null;
  const feeRows = Array.isArray(recruitment.recruitmentFees) ? recruitment.recruitmentFees : [];
  const feeGeneral = recruitment.feeGeneral ?? recruitment.fee_general;
  const feeReserved = recruitment.feeReserved ?? recruitment.fee_reserved;
  const feeNote = recruitment.feeNote ?? recruitment.fee_note ?? null;
  const hasFeeDetails = feeRows.length > 0 || feeGeneral != null || feeReserved != null || Boolean(feeNote);
  const selectionRows = Array.isArray(recruitment.selectionProcesses) ? recruitment.selectionProcesses : [];
  const selectionDisplayRows = selectionRows.map((row: Record<string, unknown>) => {
    const processName = row.process_type ?? row.processType ?? null;
    const stages = Array.isArray(row.stages)
      ? row.stages.map((stage: unknown) => {
          if (typeof stage === 'string') return stage;
          if (stage && typeof stage === 'object') {
            const item = stage as Record<string, unknown>;
            return item.name ?? item.title ?? item.stage ?? null;
          }
          return null;
        }).filter((stage): stage is string => typeof stage === 'string').join(' → ')
      : typeof row.stages === 'string' ? row.stages : null;
    const details = typeof row.details === 'string' ? row.details : null;
    return { title: typeof processName === 'string' ? processName.replace(/_/g, ' ') : null, detail: stages || details };
  }).filter((row: { title: string | null; detail: unknown }) => Boolean(row.title || row.detail));

  // FAQ: only questions with non-null answers
  const faqItems: { q: string; a: string }[] = [];

  if (recruitment.name && displayOrg) {
    faqItems.push({
      q: `What is ${recruitment.name}?`,
      a: `${recruitment.name} is a recruitment conducted by ${displayOrg}${recruitment.year ? ` for the year ${recruitment.year}` : ''}.`,
    });
  }

  if (displayTotalVacancies != null) {
    faqItems.push({
      q: 'How many vacancies are available?',
      a: sourceFactsUnverified
        ? `The source listing reports ${displayTotalVacancies.toLocaleString('en-IN')} vacancies across ${posts.length} listed post${posts.length !== 1 ? 's' : ''}. Confirm each role and vacancy count in the specific official notice.`
        : `A total of ${displayTotalVacancies.toLocaleString('en-IN')} vacancies are available across ${posts.length} post${posts.length !== 1 ? 's' : ''}.`,
    });
  }

  if (appEnd) {
    faqItems.push({
      q: 'When does the application close?',
      a: sourceFactsUnverified
        ? `The source listing reports a deadline of ${appEnd}. Confirm the date in the specific official notice before applying.`
        : `The last date to apply is ${appEnd}.`,
    });
  }

  if (hasPosts && posts.length > 1) {
    const postNames = posts.slice(0, 5).map((p) => p.name ?? p.position?.name).filter(Boolean);
    if (postNames.length > 0) {
      faqItems.push({
        q: 'Which posts are included in this recruitment?',
        a: `This recruitment includes ${posts.length} posts, including: ${postNames.join(', ')}${posts.length > 5 ? ', and more' : ''}.`,
      });
    }
  }

  if (displaySelectionProcess) {
    faqItems.push({
      q: 'What is the selection process?',
      a: displaySelectionProcess,
    });
  }

  if (displayOfficialSource) {
    faqItems.push({
      q: 'Where can I check the recruitment source?',
      a: `Use the recruitment source link below to review the available source information. Check that it is the specific notice for this recruitment before applying.`,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky breadcrumb bar ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-600">
            <Link href={`${localePrefix}/jobs`} className="text-slate-700 hover:text-slate-900 font-medium">
              Jobs
            </Link>
            {displayOrg && (
              <>
                <ChevronRight size={14} className="text-gray-400" />
                {orgSlug ? (
                  <Link href={`${localePrefix}/organizations/${orgSlug}`} className="text-slate-700 hover:text-slate-900 truncate max-w-[120px] md:max-w-xs hidden sm:inline">
                    {displayOrg}
                  </Link>
                ) : (
                  <span className="text-gray-500 truncate max-w-[120px] md:max-w-xs hidden sm:inline">
                    {displayOrg}
                  </span>
                )}
              </>
            )}
            <ChevronRight size={14} className="text-gray-400" />
            <span className="text-gray-900 font-medium truncate max-w-[180px] md:max-w-md">
              {recruitment.name}
            </span>
          </nav>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* ═══════════════════════════════════════════
            SECTION 1 — RECRUITMENT HEADER
            Hero card: title + stat chips + CTAs
            ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-6 md:px-8 md:py-8">

          {/* Lifecycle and source verification are separate states. */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {sourceFactsUnverified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                Listing status reported{sourceStatusLabel ? `: ${sourceStatusLabel}` : ""}
              </span>
            ) : <StatusBadge status={recruitment.status} />}
            {recruitment.sourceVerificationStatus && recruitment.sourceVerificationStatus !== "VERIFIED" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                Official verification pending
              </span>
            )}
          </div>

          {recruitment.sourceVerificationStatus && recruitment.sourceVerificationStatus !== "VERIFIED" && (
            <aside
              role="note"
              aria-label="Recruitment verification notice"
              className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
            >
              Information on this page is sourced from{" "}
              <a href={typeof recruitment.sourceExtract?.sourceUrl === "string" ? recruitment.sourceExtract.sourceUrl : undefined}
                 target="_blank" rel="noopener noreferrer"
                 className="underline text-amber-900 hover:text-amber-700">
                an aggregator listing
              </a>
              {" "}— an independent check against the institution&apos;s official notice is pending.
              Dates, vacancy counts and application instructions shown here are likely accurate but
              should be confirmed in the official notice before you apply.
            </aside>
          )}

          {/* Recruitment name (h1) */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">
            {recruitment.name}
          </h1>

          {/* Organization */}
          {displayOrg && (
            <p className="text-base text-gray-600 mb-4 font-medium">{displayOrg}</p>
          )}

          {/* ── Hero stat row (YuvaResult pattern) ── */}
          {/* Vacancy count, deadline, post count as scannable chips */}
          <div className="flex flex-wrap gap-3 mb-6">
            {displayTotalVacancies != null && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5">
                <Users size={18} className="text-amber-700 flex-shrink-0" />
                <div>
                  <div className="text-xl font-bold text-slate-900 leading-none">
                    {displayTotalVacancies.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-amber-700 mt-0.5">{sourceFactsUnverified ? "Reported vacancies" : "Total Vacancies"}</div>
                </div>
              </div>
            )}

            {appEnd && (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 border ${
                closed || sourceFactsUnverified
                  ? 'bg-gray-50 border-gray-200'
                  : isLastDay
                  ? 'bg-red-50 border-red-300'
                  : isClosingSoon
                  ? 'bg-orange-50 border-orange-300'
                  : 'bg-white border-gray-200'
              }`}>
                <Clock size={18} className={
                  closed || sourceFactsUnverified ? 'text-gray-400' :
                  isLastDay ? 'text-red-600' :
                  isClosingSoon ? 'text-orange-600' :
                  'text-gray-500'
                } />
                <div>
                  <div className={`text-base font-bold leading-none ${
                    closed || sourceFactsUnverified ? 'text-gray-500' :
                    isLastDay ? 'text-red-700' :
                    isClosingSoon ? 'text-orange-700' :
                    'text-gray-900'
                  }`}>
                    {closed
                      ? 'Closed'
                      : isLastDay
                      ? 'Last Day!'
                      : isClosingSoon
                      ? `${daysLeft} days left`
                      : appEnd}
                  </div>
                  <div className={`text-xs mt-0.5 ${
                    closed ? 'text-gray-400' :
                    isLastDay ? 'text-red-600' :
                    isClosingSoon ? 'text-orange-600' :
                    'text-gray-500'
                  }`}>
                    {closed ? 'Application closed' : sourceFactsUnverified ? 'Reported deadline · confirm official notice' : isClosingSoon || isLastDay ? `Closes ${appEnd}` : 'Last date'}
                  </div>
                </div>
              </div>
            )}

            {hasPosts && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
                <Briefcase size={18} className="text-gray-500 flex-shrink-0" />
                <div>
                  <div className="text-xl font-bold text-gray-900 leading-none">{posts.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Post{posts.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Facts at a glance (scannable dl, above CTAs) ── */}
          {/* Reference: discoverability-framework § 3 "Quick answers block" + reference hub template <dl class="facts"> */}
          {(displayOrg || appStart || appEnd || sourceApplicationMode || hasFeeDetails || displaySelectionProcess || posts.length > 0) && (
            <dl className="mb-5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0 text-sm border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-100">
              {displayOrg && (
                <div className="col-span-2 sm:col-span-3 flex gap-2 px-3 py-2 bg-gray-50">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Organisation</dt>
                  <dd className="text-gray-900 font-medium">{displayOrg}</dd>
                </div>
              )}
              {displayTotalVacancies != null && (
                <div className="flex gap-2 px-3 py-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Total posts</dt>
                  <dd className="text-gray-900 font-semibold">
                    {displayTotalVacancies.toLocaleString('en-IN')}
                    {sourceFactsUnverified && <span className="ml-1 text-xs text-gray-400 font-normal">reported</span>}
                  </dd>
                </div>
              )}
              {appStart && (
                <div className="flex gap-2 px-3 py-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Apply from</dt>
                  <dd className="text-gray-900">{appStart}</dd>
                </div>
              )}
              {appEnd && (
                <div className="flex gap-2 px-3 py-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Last date</dt>
                  <dd className={`font-semibold ${closed || sourceFactsUnverified ? 'text-gray-600' : isClosingSoon ? 'text-orange-700' : 'text-red-700'}`}>
                    {appEnd}
                    {sourceFactsUnverified && <span className="ml-1 text-xs text-gray-400 font-normal">reported</span>}
                  </dd>
                </div>
              )}
              {sourceApplicationMode && (
                <div className="flex gap-2 px-3 py-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Mode</dt>
                  <dd className="text-gray-900">{sourceApplicationMode}</dd>
                </div>
              )}
              {sourcePayRange && (
                <div className="flex gap-2 px-3 py-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Pay range{sourceFactsUnverified ? " †" : ""}</dt>
                  <dd className="text-gray-900 font-medium">{sourcePayRange}</dd>
                </div>
              )}
              {sharedApplicationEmail && (
                <div className="col-span-2 sm:col-span-3 flex gap-2 px-3 py-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Apply by email</dt>
                  <dd className="text-gray-900"><a href={`mailto:${sharedApplicationEmail}`} className="text-slate-700 hover:text-slate-900 underline">{sharedApplicationEmail}</a></dd>
                </div>
              )}
              {hasFeeDetails && (
                <div className="flex gap-2 px-3 py-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Fee</dt>
                  <dd className="text-gray-900">
                    {feeGeneral != null
                      ? (Number(feeGeneral) === 0 ? 'No fee' : `₹${Number(feeGeneral).toLocaleString('en-IN')} (General)`)
                      : feeNote ?? 'See details'}
                  </dd>
                </div>
              )}
              {(displaySelectionProcess || selectionDisplayRows.length > 0) && (
                <div className="flex gap-2 px-3 py-2">
                  <dt className="text-gray-500 w-28 flex-shrink-0">Selection</dt>
                  <dd className="text-gray-900">
                    {displaySelectionProcess ?? (selectionDisplayRows[0]?.title ? String(selectionDisplayRows[0].title) : null) ?? 'See details'}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {/* One-sentence description — only from authoritative source */}
          {displayDescription && !descriptionIsInternal && (
            <p className="text-gray-600 mb-5 leading-relaxed text-sm">{displayDescription}</p>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            {isSinglePost ? (
              <Link
                href={`${localePrefix}/jobs/${recruitment.slug}/${posts[0].slug}`}
                className="inline-flex items-center gap-2 bg-[#0f172a] text-[#ffd60a] font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm"
              >
                View Post Details
                <ArrowRight size={16} />
              </Link>
            ) : hasPosts ? (
              <a
                href="#posts"
                className="inline-flex items-center gap-2 bg-[#0f172a] text-[#ffd60a] font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm"
              >
                View All Posts ({posts.length})
                <ArrowRight size={16} />
              </a>
            ) : null}

            {displayApplicationUrl && !closed && (
              <a
                href={displayApplicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition text-sm"
              >
                Apply Online
                <ExternalLink size={15} />
              </a>
            )}

            {displayOfficialSource && (
              <a
                href={displayOfficialSource}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white border-2 border-[#0f172a] text-[#0f172a] font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-50 transition text-sm"
              >
                Notification / source link
                <ExternalLink size={15} />
              </a>
            )}
          </div>
        </div>

        {/* Closed warning */}
        {closed && (
          <div className="bg-gray-50 border border-gray-300 rounded-xl px-5 py-4 flex gap-3">
            <AlertCircle size={18} className="text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">
              This recruitment is closed. Application submission is no longer available.
              Verify the current status on the official notification.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 2 — RECRUITMENT OVERVIEW TABLE
            Compact details: org, selection process, official links
            ═══════════════════════════════════════════ */}
        {(displayOrg || displaySelectionProcess || displayOfficialSource || displayApplicationUrl || appStart || examName || notificationNumber || hasFeeDetails || selectionDisplayRows.length > 0 || sourceLocation || sourceApplicationMode || sourcePayRange || sharedApplicationEmail || sourceDocuments.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
            <h2 className="text-base font-bold text-gray-900 mb-3">Recruitment Details</h2>
            <dl className="divide-y divide-gray-100">

              {displayOrg && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Organization</dt>
                  <dd className="text-sm text-gray-900 font-medium">{displayOrg}</dd>
                </div>
              )}

              {recruitment.year && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Year</dt>
                  <dd className="text-sm text-gray-900">{recruitment.year}</dd>
                </div>
              )}

              {examName && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Exam</dt>
                  <dd className="text-sm text-gray-900">{examName}</dd>
                </div>
              )}

              {notificationNumber && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Notification No.</dt>
                  <dd className="text-sm text-gray-900">{notificationNumber}</dd>
                </div>
              )}

              {appStart && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Apply From</dt>
                  <dd className="text-sm text-gray-900">{appStart}</dd>
                </div>
              )}

              {sourceLocation && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Location{sourceFactsUnverified ? " reported" : ""}</dt>
                  <dd className="text-sm text-gray-900">{sourceLocation}</dd>
                </div>
              )}

              {sourceApplicationMode && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Application method{sourceFactsUnverified ? " reported" : ""}</dt>
                  <dd className="text-sm text-gray-900">{sourceApplicationMode}</dd>
                </div>
              )}

              {sharedApplicationEmail && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Application email</dt>
                  <dd className="text-sm">
                    <a href={`mailto:${sharedApplicationEmail}`} className="text-slate-700 hover:text-slate-900 underline">{sharedApplicationEmail}</a>
                  </dd>
                </div>
              )}

              {sourcePayRange && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Pay range{sourceFactsUnverified ? " reported" : ""}</dt>
                  <dd className="text-sm text-gray-900 font-medium">{sourcePayRange}</dd>
                </div>
              )}

              {appEnd && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">{sourceFactsUnverified ? "Reported Last Date" : "Last Date"}</dt>
                  <dd className={`text-sm font-semibold ${closed || sourceFactsUnverified ? 'text-gray-500' : isClosingSoon ? 'text-orange-700' : 'text-red-700'}`}>
                    {appEnd}
                    {!closed && isClosingSoon && daysLeft !== null && (
                      <span className="ml-2 text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                        {isLastDay ? 'Last Day' : `${daysLeft} days left`}
                      </span>
                    )}
                    {closed && <span className="ml-2 text-xs font-normal text-gray-400">(Closed)</span>}
                  </dd>
                </div>
              )}

              {displaySelectionProcess && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">{sourceFactsUnverified && !resolvedSelectionProcess && !recruitment.selectionProcess ? "Selection reported" : "Selection"}</dt>
                  <dd className="text-sm text-gray-900">{displaySelectionProcess}</dd>
                </div>
              )}

              {!displaySelectionProcess && selectionDisplayRows.length > 0 && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Selection Process</dt>
                  <dd className="text-sm text-gray-900">
                    <ul className="space-y-1">
                      {selectionDisplayRows.map((row: { title: string | null; detail: unknown }, index: number) => (
                        <li key={index}>
                          {row.title && <span className="font-medium capitalize">{row.title}</span>}
                          {Boolean(row.detail) && <span>{row.title ? ': ' : ''}{String(row.detail)}</span>}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}

              {hasFeeDetails && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Application Fee</dt>
                  <dd className="text-sm text-gray-900">
                    {feeRows.length > 0 ? (
                      <ul className="space-y-1">
                        {feeRows.map((fee: Record<string, unknown>, index: number) => (
                          <li key={index}>
                            <span className="font-medium">{String(fee.category ?? 'Category')}</span>
                            {fee.amount != null && <span>: {Number(fee.amount) === 0 ? 'No fee' : '₹' + Number(fee.amount).toLocaleString('en-IN')}</span>}
                            {Boolean(fee.note) && <span> — {String(fee.note)}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="space-y-1">
                        {feeGeneral != null && <li>General: {Number(feeGeneral) === 0 ? 'No fee' : '₹' + Number(feeGeneral).toLocaleString('en-IN')}</li>}
                        {feeReserved != null && <li>Reserved categories: {Number(feeReserved) === 0 ? 'No fee' : '₹' + Number(feeReserved).toLocaleString('en-IN')}</li>}
                      </ul>
                    )}
                    {feeNote && <p className="mt-1 text-gray-600">{String(feeNote)}</p>}
                  </dd>
                </div>
              )}

              {sourceDocuments.length > 0 && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Documents required{sourceFactsUnverified ? " reported" : ""}</dt>
                  <dd className="text-sm text-gray-900">
                    <ul className="space-y-1 list-disc list-inside">
                      {sourceDocuments.map((doc, i) => (
                        <li key={i}>{doc}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}

              {displayOfficialSource && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Notification</dt>
                  <dd className="text-sm">
                    <a href={displayOfficialSource} target="_blank" rel="noopener noreferrer"
                      className="text-slate-700 hover:text-slate-900 underline inline-flex items-center gap-1">
                      View official recruitment notices <ExternalLink size={12} />
                    </a>
                  </dd>
                </div>
              )}

              {displayApplicationUrl && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Apply Portal</dt>
                  <dd className="text-sm">
                    <a href={displayApplicationUrl} target="_blank" rel="noopener noreferrer"
                      className="text-green-700 hover:text-green-800 font-semibold inline-flex items-center gap-1">
                      Official Apply Link <ExternalLink size={12} />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 3 — IMPORTANT DATES TIMELINE
            ═══════════════════════════════════════════ */}
        {hasTimeline && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={17} className="text-amber-500" />
              Important Dates
            </h2>
            <ol className="relative border-l-2 border-gray-100 ml-3 space-y-5">
              {notificationDate && (
                <li className="pl-5 relative">
                  <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center" />
                  <div className="text-sm font-semibold text-gray-900">{notificationDate}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{notificationDateLabel}</div>
                </li>
              )}
              {appStart && (
                <li className="pl-5 relative">
                  <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center" />
                  <div className="text-sm font-semibold text-gray-900">{appStart}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Application Opens</div>
                </li>
              )}
              {appEnd && (
                <li className="pl-5 relative">
                  <span className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    closed || sourceFactsUnverified
                      ? 'bg-gray-100 border-gray-400'
                      : isClosingSoon
                      ? 'bg-orange-100 border-orange-400'
                      : 'bg-red-100 border-red-400'
                  }`} />
                  <div className={`text-sm font-semibold ${
                    closed || sourceFactsUnverified ? 'text-gray-500' : isClosingSoon ? 'text-orange-800' : 'text-red-800'
                  }`}>
                    {appEnd}
                    {!closed && isClosingSoon && daysLeft !== null && (
                      <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${
                        isLastDay ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {isLastDay ? 'Last Day!' : `${daysLeft} days left`}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{appEndLabel}</div>
                </li>
              )}
              {tentativeInterviewDate && (
                <li className="pl-5 relative">
                  <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-400" />
                  <div className="text-sm font-semibold text-gray-600">{tentativeInterviewDate}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Tentative interview (reported; confirm in official notice)</div>
                </li>
              )}
            </ol>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 4 — POSTS / OPPORTUNITIES
            Core navigation component
            ═══════════════════════════════════════════ */}
        {hasPosts && (
          <div id="posts" className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Briefcase size={17} className="text-amber-500" />
              {isSinglePost ? 'Available Post' : `Available Posts (${posts.length})`}
            </h2>
            {!isSinglePost && (
              <p className="text-sm text-gray-500 mb-4">
                Select the post you are interested in to view full details.
              </p>
            )}

            {isSinglePost ? (
              /* Single Post: prominent entry point */
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-5">
                <Link href={`${localePrefix}/jobs/${recruitment.slug}/${posts[0].slug}`} className="group block">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition mb-2">
                        {posts[0].name ?? posts[0].position?.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        {(posts[0].resolvedVacancyCount ?? parseReportedVacancyCount(posts[0].fjaExtract?.vacancyCountRaw)) != null && (
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Users size={14} className="text-amber-600" />
                            {(posts[0].resolvedVacancyCount ?? parseReportedVacancyCount(posts[0].fjaExtract?.vacancyCountRaw))!.toLocaleString('en-IN')}
                            {posts[0].resolvedVacancyCount == null || posts[0].fjaExtract?.verificationStatus !== "VERIFIED" ? " reported vacancies" : " vacancies"}
                          </span>
                        )}
                        <PostStatusBadge post={posts[0]} appEndDate={sourceFactsUnverified ? null : recruitment.applicationEndDate} />
                      </div>
                    </div>
                    <ArrowRight size={20} className="text-blue-600 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <Link
                    href={`${localePrefix}/jobs/${recruitment.slug}/${posts[0].slug}`}
                    className="inline-flex items-center gap-2 bg-[#0f172a] text-[#ffd60a] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 transition"
                  >
                    View Full Post Details
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            ) : (
              /* Multi-Post: single-column list with per-row vacancy + status colour */
              <div className="mt-3 space-y-2">
                {posts.map((post) => {
                  const reportedPostVacancies = parseReportedVacancyCount(post.fjaExtract?.vacancyCountRaw);
                  const postVacancies = post.resolvedVacancyCount ?? reportedPostVacancies;
                  const postName = post.name ?? post.position?.name ?? 'View Post';

                  return (
                    <Link
                      key={post.id}
                      href={`${localePrefix}/jobs/${recruitment.slug}/${post.slug}`}
                      className="flex items-center justify-between gap-4 px-4 py-3.5 bg-white border border-gray-200 rounded-lg hover:border-slate-700 hover:shadow-sm transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <div className="font-semibold text-gray-900 group-hover:text-slate-700 transition text-sm truncate mb-1">
                          {postName}
                        </div>
                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {postVacancies != null && (
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Users size={11} className="text-amber-600" />
                              {sourceFactsUnverified || post.resolvedVacancyCount == null || post.fjaExtract?.verificationStatus !== "VERIFIED"
                                ? `${postVacancies.toLocaleString('en-IN')} reported ${postVacancies === 1 ? 'vacancy' : 'vacancies'}`
                                : `${postVacancies.toLocaleString('en-IN')} ${postVacancies === 1 ? 'vacancy' : 'vacancies'}`}
                            </span>
                          )}
                          <PostStatusBadge post={post} appEndDate={sourceFactsUnverified ? null : recruitment.applicationEndDate} />
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-slate-700 flex-shrink-0 transition" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 5 — QUICK ANSWERS (with stable IDs for AI deep-linking)
            Each answer gets a stable id so ChatGPT, Perplexity, and Google AI Mode
            can cite and deep-link to the exact answer. Reference: discoverability-framework § 3.
            Conditional — only render questions with non-null authoritative answers.
            ═══════════════════════════════════════════ */}
        {faqItems.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
            <h2 className="text-base font-bold text-gray-900 mb-4">Quick Answers</h2>
            <div className="space-y-0 divide-y divide-gray-100">
              {/* Each item has a stable id derived from its question index for AI citability */}
              {appEnd && (
                <div id="qa-last-date" className="py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Last date to apply</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {sourceFactsUnverified
                      ? `${appEnd} (reported — confirm in official notice)`
                      : closed
                      ? `${appEnd} (applications closed)`
                      : isClosingSoon
                      ? `${appEnd} — ${isLastDay ? 'last day today' : `${daysLeft} days remaining`}`
                      : appEnd}
                  </p>
                </div>
              )}
              {displayTotalVacancies != null && (
                <div id="qa-posts" className="py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Vacancies / posts</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {sourceFactsUnverified
                      ? `${displayTotalVacancies.toLocaleString('en-IN')} vacancies reported across ${posts.length} post${posts.length !== 1 ? 's' : ''}. Verify each in the official notice.`
                      : `${displayTotalVacancies.toLocaleString('en-IN')} ${displayTotalVacancies === 1 ? 'vacancy' : 'vacancies'} across ${posts.length} post${posts.length !== 1 ? 's' : ''}.`}
                  </p>
                </div>
              )}
              {hasFeeDetails && (
                <div id="qa-fee" className="py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Application fee</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {feeGeneral != null
                      ? (Number(feeGeneral) === 0
                          ? 'No application fee.'
                          : `General category: ₹${Number(feeGeneral).toLocaleString('en-IN')}${feeReserved != null ? `; Reserved: ₹${Number(feeReserved).toLocaleString('en-IN')}` : ''}.`)
                      : feeNote ?? 'See recruitment details for fee breakdown.'}
                  </p>
                </div>
              )}
              {(displayApplicationUrl || displayOfficialSource || sharedApplicationEmail) && (
                <div id="qa-apply" className="py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">How to apply</p>
                  <p className="text-sm text-gray-900">
                    {displayApplicationUrl
                      ? <>Apply via the <a href={displayApplicationUrl} target="_blank" rel="noopener noreferrer" className="text-slate-700 underline hover:text-slate-900">official application portal</a>.</>
                      : sharedApplicationEmail
                      ? <>Send your application to <a href={`mailto:${sharedApplicationEmail}`} className="text-slate-700 underline hover:text-slate-900">{sharedApplicationEmail}</a>{sourceApplicationMode ? ` (${sourceApplicationMode.toLowerCase()})` : ''}. Confirm instructions in the official notice.</>
                      : sourceApplicationMode
                      ? `Apply ${sourceApplicationMode.toLowerCase()}. Confirm application instructions in the official notice.`
                      : <>Check the <a href={displayOfficialSource ?? '#'} target="_blank" rel="noopener noreferrer" className="text-slate-700 underline hover:text-slate-900">official notification</a> for application instructions.</>}
                  </p>
                </div>
              )}
              {displayOrg && (
                <div id="qa-who" className="py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Recruiting organisation</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {displayOrg}{recruitment.year ? ` (${recruitment.year})` : ''}.
                    {notificationNumber ? ` Advertisement No. ${notificationNumber}.` : ''}
                  </p>
                </div>
              )}
              {displaySelectionProcess && (
                <div id="qa-selection" className="py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Selection process</p>
                  <p className="text-sm text-gray-900">{displaySelectionProcess}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 6 — OFFICIAL SOURCES
            ═══════════════════════════════════════════ */}
        {(displayOfficialSource || displayApplicationUrl) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Official Sources
            </h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <p className="text-xs text-green-700">
                Check the linked source carefully and confirm the specific recruitment notice and application instructions before applying.
              </p>
              {displayOfficialSource && (
                <div className="flex items-start gap-3">
                  <FileText size={15} className="text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-green-700 font-medium mb-0.5">Notification / source link</div>
                    <a href={displayOfficialSource} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-slate-700 hover:text-slate-900 underline break-all inline-flex items-center gap-1">
                      {displayOfficialSource}
                      <ExternalLink size={12} className="flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
              {displayApplicationUrl && (
                <div className="flex items-start gap-3">
                  <Globe size={15} className="text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-green-700 font-medium mb-0.5">Official Apply Portal</div>
                    <a href={displayApplicationUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-green-800 hover:text-green-900 font-semibold break-all inline-flex items-center gap-1">
                      Apply on Official Website
                      <ExternalLink size={12} className="flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 7 — CHANGE LOG
            Trust signal + Google freshness signal.
            Logs when the page was first published (from sourceListingPublishedDate or notificationDate)
            and any subsequent updates. Reference: discoverability-framework § 3 ("visible corrections log").
            ═══════════════════════════════════════════ */}
        {(recruitment.sourceListingPublishedDate || recruitment.notificationDate || recruitment.updatedAt) && (() => {
          // Build a minimal log from available dates. Human-authored change log entries
          // will be added once an editorial workflow exists (deferred to Step 2).
          const logEntries: { date: string; note: string }[] = [];
          const firstSeen = formatDate(
            recruitment.sourceListingPublishedDate ?? recruitment.notificationDate
          );
          if (firstSeen) {
            logEntries.push({
              date: firstSeen,
              note: sourceFactsUnverified
                ? 'Page first published from aggregator source listing.'
                : 'Official notification date.',
            });
          }
          const updatedAt = formatDate(recruitment.updatedAt);
          if (updatedAt && updatedAt !== firstSeen) {
            logEntries.push({
              date: updatedAt,
              note: 'Record last updated.',
            });
          }
          if (logEntries.length === 0) return null;
          return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
              <h2 className="text-sm font-bold text-gray-700 mb-3">Page history</h2>
              <table className="w-full text-xs text-gray-600 border-collapse">
                <caption className="sr-only">Change history for this recruitment page</caption>
                <thead>
                  <tr className="border-b border-gray-100">
                    <th scope="col" className="text-left pb-1 pr-4 font-semibold text-gray-500 w-32">Date</th>
                    <th scope="col" className="text-left pb-1 font-semibold text-gray-500">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {logEntries.map((entry, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-1.5 pr-4 align-top whitespace-nowrap">{entry.date}</td>
                      <td className="py-1.5 align-top">{entry.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* Candidate-facing verification guidance. Internal inventory and raw database diagnostics belong in admin tools, not public pages. */}
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 md:px-6">
          <h2 className="text-sm font-bold text-amber-950">Before you apply</h2>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">
            Recruitment details can change. Review the linked notice and confirm the eligibility rules, post-specific vacancies, fees, dates, and application instructions before submitting an application. Unknown or unverified details are not a confirmation of eligibility.
          </p>
        </section>

        <div className="h-4" />
      </div>
    </div>
  );
}
