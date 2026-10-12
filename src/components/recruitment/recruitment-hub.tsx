'use client';

/**
 * Recruitment Hub — thin orchestrator
 *
 * Route: /jobs/[recruitment-slug]
 *
 * This component computes HubData once from props, then delegates all
 * rendering to modular section components in ./sections/. Each section
 * is self-contained and only receives the fields it needs from HubData.
 *
 * Architecture (approved spec, 2026-10-09):
 *   Breadcrumb → Header (hero) → TOC → Quick Answers → Details →
 *   Dates → Posts → Eligibility → Selection → Apply → Documents →
 *   Conditions → Links → Source → FAQ
 *
 * Rules in force:
 *   - No raw SQL fallbacks; no Hub→Leaf data inheritance.
 *   - ELIG-001 Phase 1: display text only, no "Can I apply?" logic.
 *   - Source verification gates all authoritative display claims.
 *   - Data track (DATA-000 → GATE-001) on hold — do not touch.
 */

import type {
  RecruitmentHubRecruitment,
  RecruitmentHubPost,
  HubData,
  PostTableRow,
  SelectionRow,
} from './sections/types';

import HubBreadcrumb from './sections/hub-breadcrumb';
import HubHeader from './sections/hub-header';
import HubToc from './sections/hub-toc';
import HubQuickAnswers from './sections/hub-quick-answers';
import HubDetails from './sections/hub-details';
import HubDates from './sections/hub-dates';
import HubPosts from './sections/hub-posts';
import HubEligibility from './sections/hub-eligibility';
import HubSelection from './sections/hub-selection';
import HubApply from './sections/hub-apply';
import HubDocuments from './sections/hub-documents';
import HubConditions from './sections/hub-conditions';
import HubLinks from './sections/hub-links';
import HubSource from './sections/hub-source';
import HubFaq from './sections/hub-faq';

import styles from './recruitment-hub.module.css';

// Re-export types for external consumers
export type { RecruitmentHubRecruitment, RecruitmentHubPost };

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
// Helpers (pure functions; not exported)
// ---------------------------------------------------------------------------

const formatDate = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return null; }
};

const daysUntil = (date: Date | string | null | undefined): number | null => {
  if (!date) return null;
  try {
    const ms = new Date(date).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  } catch { return null; }
};

const isRecruitmentClosed = (status: string | null | undefined): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'closed' || s === 'expired' || s === 'completed';
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const parseReportedVacancyCount = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const normalized = value.replace(/,/g, '').trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const formatEmploymentType = (et: string | null): string | null => {
  if (!et) return null;
  if (et === 'Mixed') return 'Mixed';
  return et.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

// ---------------------------------------------------------------------------
// Build HubData
// ---------------------------------------------------------------------------

function buildHubData(props: Required<RecruitmentHubProps>): HubData {
  const {
    recruitment, posts,
    resolvedTotalVacancies, resolvedApplicationUrl, resolvedOfficialSource,
    resolvedEmployer, resolvedSelectionProcess, orgSlug, locale,
  } = props;

  const localePrefix = locale === 'hi' ? '/hi' : '';
  const displayOrg = resolvedEmployer ?? recruitment.organizationName ?? null;

  const sourceFactsUnverified = Boolean(
    recruitment.sourceExtract &&
    recruitment.sourceVerificationStatus !== 'VERIFIED'
  );

  // Dates
  const notificationDate = formatDate(
    sourceFactsUnverified ? recruitment.sourceListingPublishedDate : recruitment.notificationDate
  );
  const notificationDateLabel = sourceFactsUnverified
    ? 'Source listing published' : 'Notification published';
  const appStart = formatDate(sourceFactsUnverified
    ? recruitment.sourceExtract?.applicationStartDate
    : recruitment.applicationStartDate);
  const appEndRaw = sourceFactsUnverified
    ? (recruitment.sourceExtract?.applicationEndDate ?? recruitment.applicationEndDate ?? null)
    : (recruitment.applicationEndDate ?? null);
  const appEnd = formatDate(appEndRaw);
  const appEndLabel = sourceFactsUnverified ? 'Application deadline (reported)' : 'Application closes';

  // Status
  const closed = sourceFactsUnverified ? false : isRecruitmentClosed(recruitment.status);
  const sourceStatusLabel = typeof recruitment.sourceExtract?.sourceStatus === 'string'
    ? recruitment.sourceExtract.sourceStatus.toLowerCase().replace(/^./, (l) => l.toUpperCase())
    : null;

  // Description
  const descriptionIsInternal = /seeded from .*sample article|ui\/db validation|sample listing seeded/i.test(
    String(recruitment.description ?? '')
  );
  const descriptionIsProvisionalGrouping = sourceFactsUnverified &&
    /provisional|grouped|individual official notices/i.test(String(recruitment.description ?? ''));
  const displayDescription = descriptionIsProvisionalGrouping
    ? 'This page brings together roles reported in source material. Confirm the exact role, eligibility, vacancy count and deadline in each official notice before applying.'
    : recruitment.description ?? null;

  // Vacancy
  const extractedVacancies = sourceFactsUnverified
    ? (recruitment.sourceExtract?.vacancyCount ?? null) : null;
  const displayTotalVacancies =
    extractedVacancies ?? resolvedTotalVacancies ?? recruitment.totalVacancies ?? null;

  // URLs
  const displayApplicationUrl = resolvedApplicationUrl ?? null;
  const displayOfficialSource = resolvedOfficialSource ?? null;

  // Source details
  const sourceDetails = asRecord(recruitment.sourceExtract?.details);
  const sourceOtherInfo = asRecord(recruitment.sourceExtract?.otherInfoRaw);
  const sourceLocation = typeof sourceDetails?.location === 'string' ? sourceDetails.location : null;
  const sourceApplicationMode = typeof sourceDetails?.application_mode === 'string'
    ? sourceDetails.application_mode : null;
  const sourcePayRange = typeof sourceDetails?.pay_range === 'string' ? sourceDetails.pay_range : null;
  const tentativeInterviewDate = sourceFactsUnverified &&
    typeof sourceDetails?.interview_date_tentative === 'string'
    ? formatDate(sourceDetails.interview_date_tentative) : null;

  // Email
  const postEmails = Array.from(new Set(
    posts.map((p: RecruitmentHubPost) => p.application_email ?? p.applicationEmail).filter(Boolean)
  ));
  const sharedApplicationEmail: string | null = postEmails.length === 1 ? (postEmails[0] as string) : null;

  // Documents
  const sourceDocuments: string[] = Array.isArray(sourceOtherInfo?.application_documents)
    ? (sourceOtherInfo.application_documents as unknown[]).filter((d): d is string => typeof d === 'string')
    : [];

  // Selection summary
  const sourceSelectionSummary = typeof sourceOtherInfo?.interview === 'string'
    ? sourceOtherInfo.interview : null;
  const displaySelectionProcess =
    resolvedSelectionProcess ?? recruitment.selectionProcess ??
    (sourceFactsUnverified ? sourceSelectionSummary : null) ?? null;

  // Urgency
  const daysLeft = sourceFactsUnverified ? null : daysUntil(appEndRaw);
  const isClosingSoon = !sourceFactsUnverified && daysLeft !== null && daysLeft >= 0 && daysLeft <= 14 && !closed;
  const isLastDay = daysLeft === 0;

  // Timeline
  const hasTimeline = !!(notificationDate || appStart || appEnd || tentativeInterviewDate);

  // Posts
  const hasPosts = posts.length > 0;
  const isSinglePost = posts.length === 1;

  // Metadata
  const examName = recruitment.exam?.name ?? recruitment.exam?.title ?? null;
  const notificationNumber = recruitment.officialNotificationNumber ?? recruitment.official_notification_number
    ?? recruitment.advertisementNumber ?? recruitment.advertisement_number ?? null;

  // Fee
  const feeRows = Array.isArray(recruitment.recruitmentFees) ? recruitment.recruitmentFees as Record<string, unknown>[] : [];
  const feeGeneral = recruitment.feeGeneral ?? recruitment.fee_general ?? null;
  const feeReserved = recruitment.feeReserved ?? recruitment.fee_reserved ?? null;
  const feeNote = recruitment.feeNote ?? recruitment.fee_note ?? null;
  const hasFeeDetails = feeRows.length > 0 || feeGeneral != null || feeReserved != null || Boolean(feeNote);

  // Selection display rows
  const selectionRows = Array.isArray(recruitment.selectionProcesses) ? recruitment.selectionProcesses : [];
  const selectionDisplayRows: SelectionRow[] = (selectionRows as Record<string, unknown>[]).map((row) => {
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
    return {
      title: typeof processName === 'string' ? processName.replace(/_/g, ' ') : null,
      detail: (typeof stages === 'string' ? stages : null) || details,
    };
  }).filter((row) => Boolean(row.title || row.detail));

  // Employment type
  const postEmploymentTypes = posts.map((p) => {
    const et = (p as typeof p & { employmentType?: string | null }).employmentType ?? null;
    return et;
  }).filter((et): et is string => Boolean(et));
  const uniqueEmploymentTypes = Array.from(new Set(postEmploymentTypes));
  const hubEmploymentType: string | null = uniqueEmploymentTypes.length === 1
    ? uniqueEmploymentTypes[0]
    : uniqueEmploymentTypes.length > 1 ? 'Mixed' : null;
  const displayEmploymentType = formatEmploymentType(hubEmploymentType);

  // Posts table rows
  const postsTableRows: PostTableRow[] = posts.map((post) => {
    const postAny = post as typeof post & {
      employmentType?: string | null;
      payLevel?: Record<string, unknown> | null;
      vacancyTotal?: number | null;
    };
    const payRaw = typeof postAny.payLevel?.raw === 'string' ? postAny.payLevel.raw : null;
    const salaryFromFja = post.fjaExtract?.salaryRaw ?? null;
    const payDisplay = payRaw ?? salaryFromFja ?? null;
    const et = formatEmploymentType(postAny.employmentType ?? null);
    const vacancies = post.resolvedVacancyCount
      ?? parseReportedVacancyCount(post.fjaExtract?.vacancyCountRaw)
      ?? postAny.vacancyTotal
      ?? null;
    const vacanciesVerified = post.resolvedVacancyCount != null
      && post.fjaExtract?.verificationStatus === 'VERIFIED';
    return {
      id: post.id,
      name: post.name ?? post.position?.name ?? null,
      slug: post.slug ?? null,
      vacancies,
      vacanciesLabel: vacanciesVerified
        ? `${post.resolvedVacancyCount!.toLocaleString('en-IN')}`
        : vacancies != null ? `${vacancies.toLocaleString('en-IN')}*` : null,
      payDisplay,
      employmentType: et,
    };
  });
  const hasPostsTable = posts.length > 1 && postsTableRows.some((r) => r.vacanciesLabel || r.payDisplay || r.employmentType);

  // Eligibility
  const hasEligibilityData = posts.some((p) => p.eligibilities && p.eligibilities.length > 0);

  // FAQ items
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

  if (examName) {
    faqItems.push({
      q: 'Is there an exam or test involved?',
      a: `Yes — this recruitment is conducted through the ${examName}. Check the selection process section for details on stages.`,
    });
  }

  if (displayOfficialSource) {
    faqItems.push({
      q: 'Where can I check the official recruitment notice?',
      a: 'Use the official notification link in the "Official Links" section below to download or view the original recruitment notice.',
    });
  }

  return {
    // Raw records
    recruitment,
    posts,
    // Resolved props
    resolvedTotalVacancies: resolvedTotalVacancies ?? null,
    resolvedApplicationUrl: resolvedApplicationUrl ?? null,
    resolvedOfficialSource: resolvedOfficialSource ?? null,
    resolvedEmployer: resolvedEmployer ?? null,
    resolvedSelectionProcess: resolvedSelectionProcess ?? null,
    orgSlug: orgSlug ?? null,
    localePrefix,
    // Computed
    sourceFactsUnverified,
    displayOrg,
    displayTotalVacancies,
    displayApplicationUrl,
    displayOfficialSource,
    displayDescription,
    descriptionIsInternal,
    // Dates
    notificationDate,
    notificationDateLabel,
    appStart,
    appEnd,
    appEndLabel,
    appEndRaw,
    // Status
    closed,
    sourceStatusLabel,
    // Urgency
    daysLeft,
    isClosingSoon,
    isLastDay,
    // Metadata
    examName,
    notificationNumber,
    displayEmploymentType,
    displaySelectionProcess,
    // Source details
    sourcePayRange,
    sourceLocation,
    sourceApplicationMode,
    sharedApplicationEmail,
    sourceDocuments,
    tentativeInterviewDate,
    // Fee
    feeRows,
    feeGeneral,
    feeReserved,
    feeNote,
    hasFeeDetails,
    // Selection
    selectionDisplayRows,
    // Posts
    hasPosts,
    isSinglePost,
    hasPostsTable,
    postsTableRows,
    hasEligibilityData,
    // Timeline
    hasTimeline,
    // FAQ
    faqItems,
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RecruitmentHub({
  recruitment,
  posts,
  resolvedTotalVacancies = null,
  resolvedApplicationUrl = null,
  resolvedOfficialSource = null,
  resolvedEmployer = null,
  resolvedSelectionProcess = null,
  orgSlug = null,
  locale = 'en',
}: RecruitmentHubProps) {
  const data = buildHubData({
    recruitment,
    posts,
    resolvedTotalVacancies,
    resolvedApplicationUrl,
    resolvedOfficialSource,
    resolvedEmployer,
    resolvedSelectionProcess,
    orgSlug,
    locale,
  });

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        {/* Breadcrumb */}
        <HubBreadcrumb data={data} />

        <article
          className={styles.article}
          data-start={data.appStart ?? undefined}
          data-end={data.appEndRaw ? new Date(data.appEndRaw).toISOString() : undefined}
        >
          {/* 1 — Hero header card */}
          <HubHeader data={data} />

          {/* 2 — TOC pill strip */}
          <HubToc data={data} />

          {/* 3 — Quick Answers */}
          <HubQuickAnswers data={data} />

          {/* 4 — Recruitment Details */}
          <HubDetails data={data} />

          {/* 5 — Important Dates */}
          <HubDates data={data} />

          {/* 6 — Posts & Compare table */}
          <HubPosts data={data} />

          {/* 7 — Eligibility at a glance (ELIG-001 Phase 1: display text only) */}
          <HubEligibility data={data} />

          {/* 8 — Selection process + fee */}
          <HubSelection data={data} />

          {/* 9 — How to Apply */}
          <HubApply data={data} />

          {/* 10 — Document checklist (client only) */}
          <HubDocuments data={data} />

          {/* 11 — Age & Conditions */}
          <HubConditions data={data} />

          {/* 12 — Official Links */}
          <HubLinks data={data} />

          {/* 13 — Source & Verification */}
          <HubSource data={data} />

          {/* 14 — FAQ */}
          <HubFaq data={data} />
        </article>
      </div>
    </div>
  );
}
