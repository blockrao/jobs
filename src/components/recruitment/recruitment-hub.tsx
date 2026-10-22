/**
 * Recruitment Hub — server-rendered orchestrator
 *
 * Route: /jobs/[recruitment-slug]
 *
 * Computes HubData once from the recruitment record and its posts, then
 * delegates rendering to the section components in ./sections/. Every value
 * in HubData is read from stored data; nothing is defaulted or templated.
 * A section renders only when it has data, and the three "At a glance" rows
 * that may say "Not stated in this notification" (age limit, fee, apply-from)
 * are the only place an unknown is rendered at all.
 *
 * Rules in force:
 *   - Lifecycle (open / closed / upcoming, days left) comes from
 *     src/lib/lifecycle.ts and nothing else.
 *   - Source verification gates authoritative wording: while the recruitment's
 *     own source-verification status is not VERIFIED and an extracted source
 *     record exists, extracted facts are labelled "reported" and lifecycle
 *     claims (closed state, countdown) are suppressed.
 *   - No Hub -> Leaf data inheritance: the hub never reads facts from a leaf.
 *     Post rows DO link to their leaf page (/jobs/{slug}/{post-slug}) — the
 *     hub is the only page that links every leaf, and that internal link is
 *     what gets the leaves crawled and ranked (2026-10-21).
 *   - ELIG-001 Phase 1: display stored eligibility text only.
 */

import type {
  RecruitmentHubRecruitment,
  RecruitmentHubPost,
  HubData,
  HubSectionId,
  PostTableRow,
  SelectionRow,
  FeeRow,
  GlanceRow,
  TimelineStep,
  LinkRow,
  FaqItem,
  Pill,
} from './sections/types';

import { deriveLifecycle, lifecycleLabel } from '@/lib/lifecycle';
import { toPlausibleRecruitmentDate } from '@/lib/recruitment-dates';
import { stateFromIsoCode } from '@/lib/india-states';
import { getQualification } from '@/lib/qualifications';
import { publicLink } from '@/lib/aggregators';
import { SITE_URL } from '@/lib/site';
import {
  composeRecruitmentDescription,
  composeRecruitmentTitle,
  formatTitleDate,
} from '@/lib/seo/recruitment-title';

import HubBreadcrumb from './sections/hub-breadcrumb';
import HubHeader from './sections/hub-header';
import HubToc from './sections/hub-toc';
import HubDetails from './sections/hub-details';
import HubKeyMetrics from './sections/hub-key-metrics';
import HubDates from './sections/hub-dates';
import HubVacancyBreakdown from './sections/hub-vacancy-breakdown';
import HubAgeByCategory from './sections/hub-age-by-category';
import HubEligibilityDetailed from './sections/hub-eligibility-detailed';
import HubEligibility from './sections/hub-eligibility';
import HubPayFee from './sections/hub-pay-fee';
import HubSelection from './sections/hub-selection';
import HubApply from './sections/hub-apply';
import HubDocuments from './sections/hub-documents';
import HubLinks from './sections/hub-links';
import HubSource from './sections/hub-source';
import HubFaq from './sections/hub-faq';
import HubExplore from './sections/hub-explore';
import HubPostsExpandable from './sections/hub-posts-expandable';
import HubPostingLocations from './sections/hub-posting-locations';
import HubCutoffMarks from './sections/hub-cutoff-marks';
import HubJobDescriptions from './sections/hub-job-descriptions';
import RelatedOpportunities from './sections/related-opportunities';
import HubFaqEnhanced from './sections/hub-faq-enhanced';

// Outfit for headings (Inter for body is loaded by the root shell). Loaded
// through @fontsource like Inter, not through a Google Fonts link.
import '@fontsource-variable/outfit';
import styles from './recruitment-hub.module.css';

export type { RecruitmentHubRecruitment, RecruitmentHubPost };

export interface RecruitmentHubProps {
  /** Pre-computed hub data (shared with the structured-data component). */
  data: HubData;
}

// ---------------------------------------------------------------------------
// Helpers (pure; shared with the structured-data component via buildHubData)
// ---------------------------------------------------------------------------

const formatDate = (date: Date | string | null | undefined): string | null => formatTitleDate(date);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const str = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\s+/g, ' ').trim();
  return t.length > 0 ? t : null;
};

const strList = (value: unknown): string[] => {
  if (typeof value === 'string') return str(value) ? [str(value) as string] : [];
  if (Array.isArray(value)) return value.map(str).filter((s): s is string => Boolean(s));
  return [];
};

const unique = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = str(v);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
};

const parseReportedVacancyCount = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const normalized = value.replace(/,/g, '').trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contract',
  INTERN: 'Internship',
  INTERNSHIP: 'Internship',
  TEMPORARY: 'Temporary',
  APPRENTICESHIP: 'Apprenticeship',
  DEPUTATION: 'Deputation',
  FELLOWSHIP: 'Fellowship',
  PERMANENT: 'Permanent',
};

/** Human label for an employment_type enum value; null for OTHER/unknown (never a raw enum). */
export function formatJobType(value: string | null | undefined): string | null {
  if (!value) return null;
  return JOB_TYPE_LABELS[value.toUpperCase()] ?? null;
}

const EDUCATION_LEVEL_TO_QUALIFICATION_SLUG: Record<string, string> = {
  SECONDARY: '10th-pass',
  SENIOR_SECONDARY: '12th-pass',
  ITI: 'iti',
  DIPLOMA: 'diploma',
  BACHELOR: 'graduate',
  MASTER: 'post-graduate',
};

const inr = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

/** "SC/ST/PwBD: NIL; All Others: Rs. 500" → rows; null when the note is free text. */
export function parseFeeNote(note: string | null | undefined): FeeRow[] {
  if (!note) return [];
  const parts = note.split(/\s*[;|\n]\s*/).map((p) => p.trim()).filter(Boolean);
  const rows: FeeRow[] = [];
  for (const part of parts) {
    const m = part.match(/^([^:]{2,60}):\s*(.+)$/);
    if (!m) return [];
    rows.push({ category: m[1].trim(), amount: m[2].trim() });
  }
  return rows.length > 0 ? rows : [];
}

const money = (value: number | string | null | undefined): string | null => {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return str(value);
  return n === 0 ? 'No fee' : inr(n);
};

function postDisplayName(post: RecruitmentHubPost): string | null {
  return str(post.name) ?? str(post.position?.name) ?? null;
}

function postPay(post: RecruitmentHubPost): string | null {
  const payRaw = str(post.payLevel?.raw);
  if (payRaw) return payRaw;
  if (post.salaryMin != null && post.salaryMax != null && post.salaryMax >= post.salaryMin) {
    return post.salaryMin === post.salaryMax ? inr(post.salaryMin) : `${inr(post.salaryMin)} – ${inr(post.salaryMax)}`;
  }
  if (post.salaryMin != null) return `From ${inr(post.salaryMin)}`;
  if (post.salaryMax != null) return `Up to ${inr(post.salaryMax)}`;
  return str(post.fjaExtract?.salaryRaw);
}

function postQualification(post: RecruitmentHubPost): string | null {
  const fromRows = post.eligibilities?.map((e) => str(e.qualificationText)).find(Boolean) ?? null;
  return fromRows ?? str(post.fjaExtract?.qualificationRaw);
}

function postExperience(post: RecruitmentHubPost): string | null {
  const fromRows = post.eligibilities?.map((e) => str(e.experienceText)).find(Boolean) ?? null;
  return fromRows ?? str(post.fjaExtract?.experienceRaw);
}

function ageText(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min != null && max != null) return `${min}–${max} years`;
  if (min != null) return `Minimum ${min} years`;
  if (max != null) return `Maximum ${max} years`;
  return null;
}

const HOW_TO_APPLY_KEYS = [
  'how_to_apply', 'howToApply', 'how_to_apply_raw', 'application_process',
  'application_procedure', 'application_steps', 'apply_steps', 'application_instructions',
];

// ---------------------------------------------------------------------------
// Build HubData
// ---------------------------------------------------------------------------

export function buildHubData(
  recruitment: RecruitmentHubRecruitment, 
  posts: RecruitmentHubPost[], 
  now = new Date(),
  postingLocationsData: Array<{ city: string; state: string | null }> = [],
  cutoffMarksData: Array<{ category: string; cutoffMarks: string | null }> = [],
): HubData {
  const slug = recruitment.slug;
  const orgName = str(recruitment.organizationName);
  const orgSlug = str(recruitment.organizationSlug);
  const orgHref = orgSlug ? `/organizations/${orgSlug}` : null;
  const orgWebsite = publicLink(
    str(recruitment.organization?.website_url) ?? str(recruitment.organization?.websiteUrl),
  );

  const sourceFactsUnverified = Boolean(
    recruitment.sourceExtract &&
    recruitment.sourceVerificationStatus !== 'VERIFIED'
  );
  const verified = recruitment.sourceVerificationStatus === 'VERIFIED';

  // ── State ────────────────────────────────────────────────────────────────
  const stateRef = stateFromIsoCode(recruitment.locationStateCode);
  const state = stateRef ? { ...stateRef, href: `/states/${stateRef.slug}` } : null;

  // ── Extracted source details ─────────────────────────────────────────────
  const sourceDetails = asRecord(recruitment.sourceExtract?.details);
  const sourceOtherInfo = asRecord(recruitment.sourceExtract?.otherInfoRaw);
  const sourceLocation = typeof sourceDetails?.location === 'string' ? sourceDetails.location : null;
  const sourceApplicationMode = typeof sourceDetails?.application_mode === 'string'
    ? sourceDetails.application_mode : null;
  const sourcePayRange = typeof sourceDetails?.pay_range === 'string' ? sourceDetails.pay_range : null;
  const tentativeInterviewDate = sourceFactsUnverified &&
    typeof sourceDetails?.interview_date_tentative === 'string'
    ? sourceDetails.interview_date_tentative : null;
  const sourceStatusLabel = typeof recruitment.sourceExtract?.sourceStatus === 'string'
    ? recruitment.sourceExtract.sourceStatus.toLowerCase().replace(/^./, (l) => l.toUpperCase())
    : null;

  // ── Dates ────────────────────────────────────────────────────────────────
  const notificationRaw = sourceFactsUnverified ? recruitment.sourceListingPublishedDate : recruitment.notificationDate;
  const notificationDate = formatDate(notificationRaw);
  const notificationDateLabel = sourceFactsUnverified
    ? 'Source listing published' : 'Notification published';
  const appStartRaw = sourceFactsUnverified
    ? recruitment.sourceExtract?.applicationStartDate
    : recruitment.applicationStartDate;
  const appStart = formatDate(appStartRaw);
  const appEndRaw = sourceFactsUnverified
    ? (recruitment.sourceExtract?.applicationEndDate ?? recruitment.applicationEndDate ?? null)
    : (recruitment.applicationEndDate ?? null);
  const appEnd = formatDate(appEndRaw);
  const appEndLabel = sourceFactsUnverified ? 'Application deadline (reported)' : 'Application closes';

  // ── Lifecycle (src/lib/lifecycle.ts is the only source of open/closed) ───
  const lifecycle = deriveLifecycle(recruitment.status, recruitment.applicationEndDate, now);
  const lifecycleState = sourceFactsUnverified ? null : lifecycle.state;
  const closed = sourceFactsUnverified ? false : lifecycle.state === 'closed';
  const daysLeft = sourceFactsUnverified ? null : lifecycle.daysLeft;
  const updatedAtLabel = formatDate(recruitment.updatedAt);

  // ── Vacancies and post names ─────────────────────────────────────────────
  const extractedVacancies = sourceFactsUnverified
    ? (recruitment.sourceExtract?.vacancyCount ?? null) : null;
  let summed = 0;
  let anySummed = false;
  for (const p of posts) {
    if (typeof p.vacancyTotal === 'number' && p.vacancyTotal > 0) { summed += p.vacancyTotal; anySummed = true; }
  }
  const totalVacancies = extractedVacancies
    ?? (recruitment.totalVacancies && recruitment.totalVacancies > 0 ? recruitment.totalVacancies : null)
    ?? (anySummed ? summed : null);
  const postNames = unique(posts.map(postDisplayName));

  // ── Title / heading / description ────────────────────────────────────────
  const year = recruitment.year
    ?? (toPlausibleRecruitmentDate(recruitment.notificationDate)?.getUTCFullYear() ?? null);
  const composed = composeRecruitmentTitle({
    organizationName: orgName,
    recruitmentName: recruitment.name,
    year,
    totalVacancies,
    postNames,
    lastDate: closed ? null : appEnd,
  });

  // ── Fee ──────────────────────────────────────────────────────────────────
  const feeNote = str(recruitment.feeNote);
  const feeRowsFromNote = parseFeeNote(feeNote);
  const feeRowsFromTable: FeeRow[] = Array.isArray(recruitment.recruitmentFees)
    ? (recruitment.recruitmentFees as unknown[]).map((row) => {
        const r = asRecord(row);
        const category = str(r?.category) ?? str(r?.cat);
        const amount = money((r?.amount ?? r?.fee ?? r?.amt) as number | string | null | undefined);
        return category && amount ? { category, amount } : null;
      }).filter((r): r is FeeRow => r !== null)
    : [];
  const feeGeneral = money(recruitment.feeGeneral);
  const feeReserved = money(recruitment.feeReserved);
  const feeRows: FeeRow[] = feeRowsFromTable.length > 0
    ? feeRowsFromTable
    : feeRowsFromNote.length > 0
    ? feeRowsFromNote
    : [
        ...(feeGeneral ? [{ category: 'General', amount: feeGeneral }] : []),
        ...(feeReserved ? [{ category: 'Reserved categories', amount: feeReserved }] : []),
      ];
  const generalRow = feeRows.find((r) => /general|all others|^ur\b|unreserved/i.test(r.category)) ?? feeRows[0] ?? null;
  const feeSummary = feeGeneral
    ? (feeReserved && feeReserved !== feeGeneral ? `${feeGeneral} (General), ${feeReserved} (Reserved)` : `${feeGeneral} (General)`)
    : generalRow
    ? (feeRows.length > 1 ? `${generalRow.amount} (${generalRow.category})` : generalRow.amount)
    : null;
  const feeDisplayNote = feeRowsFromNote.length > 0 ? null : feeNote;
  const hasFee = feeRows.length > 0 || Boolean(feeNote);

  // ── Pay ──────────────────────────────────────────────────────────────────
  const payLines: { label: string | null; value: string; verified?: boolean }[] = [];
  for (const post of posts) {
    const pay = postPay(post);
    if (pay) {
      // Salary is verified if the post has a resolvedVacancyCount (from verified source)
      // or if recruitment.sourceVerificationStatus is VERIFIED
      const isSalaryVerified = verified || post.resolvedVacancyCount != null;
      payLines.push({
        label: posts.length > 1 ? postDisplayName(post) : null,
        value: pay,
        verified: isSalaryVerified,
      });
    }
  }
  // PHASE 3: Add recruitment-level salary note if available
  const salaryNote = str(recruitment.salaryNote);
  if (payLines.length === 0 && salaryNote) {
    payLines.push({
      label: null,
      value: salaryNote,
      verified: verified,
    });
  }
  if (payLines.length === 0 && sourcePayRange) {
    payLines.push({
      label: null,
      value: sourceFactsUnverified ? `${sourcePayRange} (reported)` : sourcePayRange,
      verified: verified,
    });
  }

  // ── Posts table ──────────────────────────────────────────────────────────
  const postRows: PostTableRow[] = posts.flatMap((post) => {
    const name = postDisplayName(post);
    if (!name) return [];
    const vacancies = post.resolvedVacancyCount
      ?? parseReportedVacancyCount(post.fjaExtract?.vacancyCountRaw)
      ?? post.vacancyTotal
      ?? null;
    const vacanciesVerified = post.vacancyTotal != null
      || (post.resolvedVacancyCount != null && post.fjaExtract?.verificationStatus === 'VERIFIED');
    const vacanciesUnverified = vacancies != null && !vacanciesVerified;
    const postSlug = str(post.slug);

    // Compute vacancy breakdown by category from vacancies table
    const vacancyBreakdown: PostTableRow['vacancyBreakdown'] = [];
    if (post.vacancies && Array.isArray(post.vacancies)) {
      const vacancyMap = new Map<string, number>();
      for (const vacRow of post.vacancies) {
        const vacRecord = asRecord(vacRow);
        const category = vacRecord?.category ?? vacRecord?.categoryType;
        const count = Number(vacRecord?.category_count ?? vacRecord?.count);
        if (typeof category === 'string' && Number.isFinite(count) && count > 0) {
          vacancyMap.set(category, (vacancyMap.get(category) ?? 0) + count);
        }
      }
      // Sort categories in a standard order
      const categoryOrder = ['UR', 'OBC', 'SC', 'ST', 'EWS', 'PwBD'];
      const sortedEntries = Array.from(vacancyMap.entries()).sort(([catA], [catB]) => {
        const indexA = categoryOrder.indexOf(catA);
        const indexB = categoryOrder.indexOf(catB);
        return (indexA >= 0 ? indexA : 999) - (indexB >= 0 ? indexB : 999);
      });
      for (const [categoryName, count] of sortedEntries) {
        vacancyBreakdown.push({ categoryName, count });
      }
    }

    // Compute age breakdown by category from postAgeRules table
    const ageBreakdown: PostTableRow['ageBreakdown'] = [];
    if (post.ageRules && Array.isArray(post.ageRules)) {
      for (const rule of post.ageRules) {
        const ruleRecord = asRecord(rule);
        if (!ruleRecord) continue;
        const categoryName = str(ruleRecord.category);
        const maxAge = Number.isFinite(Number(ruleRecord.max_age)) ? Number(ruleRecord.max_age) : null;
        const relaxation = Number.isFinite(Number(ruleRecord.relaxation_years)) ? Number(ruleRecord.relaxation_years) : undefined;
        if (categoryName) {
          ageBreakdown.push({ categoryName, maxAge, ...(relaxation !== undefined && { relaxation }) });
        }
      }
    }

    return [{
      id: post.id,
      name,
      href: postSlug ? `/jobs/${slug}/${postSlug}` : null,
      vacanciesLabel: vacancies != null ? `${vacancies.toLocaleString('en-IN')}${vacanciesUnverified ? '*' : ''}` : null,
      vacanciesUnverified,
      qualification: postQualification(post),
      experience: postExperience(post),
      pay: postPay(post),
      ...(vacancyBreakdown.length > 0 && { vacancyBreakdown }),
      ...(ageBreakdown.length > 0 && { ageBreakdown }),
    }];
  });
  const anyVacancyUnverified = postRows.some((r) => r.vacanciesUnverified);

  // ── Eligibility cards ────────────────────────────────────────────────────
  const multi = posts.length > 1;
  const prefixed = (post: RecruitmentHubPost, text: string | null): string | null => {
    if (!text) return null;
    const name = postDisplayName(post);
    return multi && name ? `${name}: ${text}` : text;
  };
  const educationTexts = unique([
    ...posts.flatMap((post) => [prefixed(post, postQualification(post)), prefixed(post, postExperience(post))]),
    ...(posts.every((p) => !postQualification(p)) ? [str(recruitment.sourceExtract?.qualification)] : []),
  ]);
  const physicalTexts = unique(
    posts.flatMap((post) => (post.eligibilities ?? []).map((e) => prefixed(post, str(e.physicalRequirements)))),
  );
  const ageNote = str(recruitment.ageNote);
  // The recruitment-level age note already carries the limits and relaxations;
  // per-post numeric ranges are shown only when no note exists.
  const ageTexts = ageNote
    ? [ageNote]
    : unique(posts.flatMap((post) => (post.eligibilities ?? []).map((e) => prefixed(post, ageText(e.ageMin, e.ageMax)))));

  // ── Selection ────────────────────────────────────────────────────────────
  const selectionRowsRaw = Array.isArray(recruitment.selectionProcesses) ? recruitment.selectionProcesses as unknown[] : [];
  const selectionRows: SelectionRow[] = selectionRowsRaw.map((row) => {
    const r = asRecord(row) ?? {};
    const processName = str(r.process_type) ?? str(r.processType);
    const stages = Array.isArray(r.stages)
      ? r.stages.map((stage: unknown) => {
          if (typeof stage === 'string') return stage;
          const item = asRecord(stage);
          return item ? (str(item.name) ?? str(item.title) ?? str(item.stage)) : null;
        }).filter((s): s is string => typeof s === 'string').join(' → ')
      : str(r.stages);
    const details = str(r.details);
    return {
      title: processName ? processName.replace(/_/g, ' ') : null,
      detail: stages || details,
    };
  }).filter((row) => Boolean(row.title || row.detail));
  const sourceSelectionSummary = str(sourceOtherInfo?.interview);
  const selectionText = str(recruitment.selectionProcess)
    ?? (sourceFactsUnverified && sourceSelectionSummary ? `${sourceSelectionSummary} (reported)` : null);

  // ── How to apply (extracted only) + documents ────────────────────────────
  const howToApply = unique(HOW_TO_APPLY_KEYS.flatMap((k) => strList(sourceOtherInfo?.[k])));
  const sourceDocuments = strList(sourceOtherInfo?.application_documents);

  // ── URLs ─────────────────────────────────────────────────────────────────
  const notificationUrl = publicLink(
    str(recruitment.officialNotificationUrl) ?? str(recruitment.notificationUrl),
  );
  const applyCandidate = publicLink(str(recruitment.officialApplicationUrl) ?? str(recruitment.applyUrl));
  const applyUrl = applyCandidate && applyCandidate !== notificationUrl ? applyCandidate : null;
  const officialWebsiteUrl = orgWebsite && orgWebsite !== notificationUrl && orgWebsite !== applyUrl ? orgWebsite : null;

  const links: LinkRow[] = [];
  if (applyUrl && !closed) links.push({ label: 'Apply online', href: applyUrl });
  if (notificationUrl) links.push({ label: 'Notification PDF', href: notificationUrl });
  if (officialWebsiteUrl) links.push({ label: 'Official website', href: officialWebsiteUrl });

  const waText = encodeURIComponent(
    `${composed.heading}${appEnd ? ` — Last date: ${appEnd}` : ''}\n${SITE_URL}/jobs/${slug}`,
  );
  const whatsappUrl = `https://wa.me/?text=${waText}`;

  // ── Identity line ────────────────────────────────────────────────────────
  const notificationNumber = str(recruitment.officialNotificationNumber) ?? str(recruitment.advertisementNumber);
  const officialNoticeDate = sourceFactsUnverified ? null : formatDate(recruitment.notificationDate);
  const noticeSource = notificationNumber
    ? `notification ${notificationNumber}${officialNoticeDate ? ` dated ${officialNoticeDate}` : ''}`
    : officialNoticeDate
    ? `the official notification dated ${officialNoticeDate}`
    : null;
  const noticeLine = noticeSource
    ? `Facts on this page are read from ${noticeSource}. Always confirm on the official site before applying.`
    : null;

  // ── Hero summary (known facts only) ──────────────────────────────────────
  const summarySentences: string[] = [];
  if (orgName && (totalVacancies != null || postNames.length > 0)) {
    const what = [
      totalVacancies != null ? `${totalVacancies.toLocaleString('en-IN')} ${totalVacancies === 1 ? 'vacancy' : 'vacancies'}` : null,
      postNames.length > 0 ? `for ${postNames.slice(0, 3).join(', ')}${postNames.length > 3 ? ' and more' : ''}` : null,
    ].filter(Boolean).join(' ');
    summarySentences.push(`${orgName} has notified ${what}${sourceFactsUnverified ? ' (as reported in the source listing)' : ''}.`);
  }
  if (appStart && appEnd) summarySentences.push(`Applications open on ${appStart} and close on ${appEnd}.`);
  else if (appEnd) summarySentences.push(closed ? `Applications closed on ${appEnd}.` : `Applications close on ${appEnd}.`);
  const summary = summarySentences.length > 0 ? summarySentences.join(' ') : null;

  // ── Job type / mode / location ───────────────────────────────────────────
  const jobType = formatJobType(recruitment.employmentType);
  const applicationMode = sourceApplicationMode ? str(sourceApplicationMode) : null;
  const locationText = state ? null : str(sourceLocation);

  // ── At a glance ──────────────────────────────────────────────────────────
  const glance: (GlanceRow & { verificationNote?: string })[] = [];
  if (orgName) glance.push({ label: 'Organisation', value: orgName, href: orgHref });
  if (notificationNumber) glance.push({ label: 'Advertisement no.', value: notificationNumber });
  if (postNames.length > 0) glance.push({ label: 'Posts', value: postNames.join(', ') });
  if (totalVacancies != null) {
    glance.push({
      label: 'Total vacancies',
      value: `${totalVacancies.toLocaleString('en-IN')}${sourceFactsUnverified ? ' (reported)' : ''}`,
      verificationNote: sourceFactsUnverified ? 'not yet verified' : undefined,
    });
  }
  glance.push({ label: 'Apply from', value: appStart });
  if (appEnd) glance.push({
    label: 'Last date',
    value: `${appEnd}${sourceFactsUnverified ? ' (reported)' : ''}`,
    verificationNote: sourceFactsUnverified ? 'not yet verified' : undefined,
  });
  glance.push({
    label: 'Application fee',
    value: feeSummary ?? feeNote,
    verificationNote: feeSummary && !verified ? 'from notification' : undefined,
  });
  if (applicationMode) glance.push({ label: 'Mode', value: applicationMode });
  if (jobType) glance.push({ label: 'Job type', value: jobType });
  if (state) glance.push({ label: 'Location', value: state.name, href: state.href });
  else if (locationText) glance.push({ label: 'Location', value: locationText });

  // PHASE 2: Display official application URL if it exists
  // (Show even when closed so candidates know where to apply next time)
  const officialApplicationUrlValue = publicLink(str(recruitment.officialApplicationUrl));
  if (officialApplicationUrlValue && officialApplicationUrlValue !== notificationUrl) {
    glance.push({
      label: 'Official portal',
      value: officialApplicationUrlValue,
      href: officialApplicationUrlValue,
      verificationNote: recruitment.officialLinkSource === 'MANUAL_VERIFIED' ? 'verified' : undefined,
    });
  }

  glance.push({
    label: 'Age limit',
    value: ageNote,
    verificationNote: ageNote && !verified ? 'from notification' : undefined,
  });

  // ── Timeline ─────────────────────────────────────────────────────────────
  const stepDefs: Array<{ id: TimelineStep['id']; label: string; raw: Date | string | null | undefined; note?: string }> = [
    { id: 'notified', label: notificationDateLabel, raw: notificationRaw },
    { id: 'open', label: 'Applications open', raw: appStartRaw },
    { id: 'close', label: appEndLabel, raw: appEndRaw },
    { id: 'exam', label: 'Exam / test', raw: recruitment.examDate },
    { id: 'result', label: 'Result', raw: recruitment.resultDate },
  ];
  // PHASE 3: Add admit card date if available
  if (recruitment.admitCardDate) {
    stepDefs.push({ id: 'result', label: 'Admit card release', raw: recruitment.admitCardDate });
  }
  // PHASE 3: Add interview date (use existing or fall back to tentative)
  const interviewDateToShow = recruitment.interviewDate || tentativeInterviewDate;
  if (interviewDateToShow) {
    const note = recruitment.interviewDate ? undefined : 'tentative';
    stepDefs.push({ id: 'interview', label: 'Interview', raw: interviewDateToShow, note });
  }
  let currentMarked = false;
  const timeline: TimelineStep[] = stepDefs.map((s) => {
    const d = toPlausibleRecruitmentDate(s.raw);
    if (!d) return { id: s.id, label: s.label, date: null, iso: null, note: s.note, state: 'unknown' };
    const past = d.getTime() < now.getTime();
    let stateOf: TimelineStep['state'] = past ? 'past' : 'future';
    if (!past && !currentMarked) { stateOf = 'current'; currentMarked = true; }
    return { id: s.id, label: s.label, date: formatDate(d), iso: d.toISOString(), note: s.note, state: stateOf };
  });
  const hasTimeline = timeline.some((t) => t.date);

  // ── Source & verification ────────────────────────────────────────────────
  const verificationLine = verified
    ? 'Verified against the official notification PDF.'
    : sourceFactsUnverified
    ? 'Facts marked "reported" come from the source listing and have not been verified against the official notification.'
    : notificationUrl
    ? 'Facts read from the official notification. Not yet independently verified.'
    : 'Official notification link not on record for this recruitment.';
  const discoverySourceUrl = publicLink(recruitment.sourceExtract?.sourceUrl ?? null);

  // ── FAQ (comprehensive SEO/AEO coverage) ────────────────────────────────────
  // Covers: deadlines, vacancies, fee, salary, eligibility, age, selection,
  // how-to-apply, job type, location, posts (for long-tail discovery).
  const faqItems: FaqItem[] = [];
  const subject = composed.heading;
  const postList = postNames.length > 0 ? postNames.join(', ') : null;

  // Q1: Application deadline (critical long-tail query)
  if (appEnd) {
    faqItems.push({
      q: `What is the last date to apply for ${subject}?`,
      a: sourceFactsUnverified
        ? `The source listing reports a deadline of ${appEnd}. Confirm the date in the official notice before applying.`
        : `The last date to apply is ${appEnd}.`,
    });
  }

  // Q2: Total vacancies (critical discovery query)
  if (totalVacancies != null) {
    faqItems.push({
      q: `How many ${postList ? postList : 'jobs'} are there in ${subject}?`,
      a: sourceFactsUnverified
        ? `The source listing reports ${totalVacancies.toLocaleString('en-IN')} vacancies. Confirm the count in the official notice.`
        : `There are ${totalVacancies.toLocaleString('en-IN')} vacancies${postList ? ` for ${postList}` : ''}.`,
    });
  }

  // Q3: Salary (high-value long-tail: "{org} {post} salary")
  if (payLines.length > 0) {
    faqItems.push({
      q: `What is the ${orgName ? `${orgName} ` : ''}salary for ${postList && postList.length < 50 ? `${postList}` : 'this job'}?`,
      a: payLines.map((l) => (l.label ? `${l.label}: ${l.value}` : l.value)).join('; ') + '.',
    });
  }

  // Q4: Application fee
  if (feeSummary || feeNote) {
    faqItems.push({
      q: `What is the application fee for ${subject}?`,
      a: feeRows.length > 1
        ? `Application fee: ${feeRows.map((r) => `${r.category}: ${r.amount}`).join('; ')}.`
        : `${feeSummary ?? feeNote}.`,
    });
  }

  // Q5: Eligibility / Qualification (long-tail: "{org} {post} eligibility")
  if (educationTexts.length > 0) {
    faqItems.push({
      q: `What is the eligibility/qualification for ${postList && postList.length < 60 ? `${orgName ? `${orgName} ` : ''}${postList}` : subject}?`,
      a: educationTexts.join(' '),
    });
  }

  // Q6: Age limit (long-tail: "{org} {post} age limit")
  if (ageTexts.length > 0) {
    faqItems.push({
      q: `What is the age limit for ${postList && postList.length < 60 ? `${orgName ? `${orgName} ` : ''}${postList}` : subject}?`,
      a: ageTexts.join(' '),
    });
  }

  // Q7: Selection process (long-tail: "{org} {post} selection process")
  if (selectionText || selectionRows.length > 0) {
    faqItems.push({
      q: `What is the selection process for ${subject}?`,
      a: selectionText
        ?? selectionRows.map((r) => [r.title, r.detail].filter(Boolean).join(': ')).join('; ') + '.',
    });
  }

  // Q8: How to apply (procedural long-tail)
  if (howToApply.length > 0) {
    faqItems.push({
      q: `How do I apply for ${subject}?`,
      a: `Steps to apply: ${howToApply.join(' → ')}.`,
    });
  }

  // Q9: Job type / nature of appointment
  if (jobType) {
    faqItems.push({
      q: `What is the job type for ${subject}?`,
      a: `This is a ${jobType.toLowerCase()} position.`,
    });
  }

  // Q10: Location / posting state (geo-discovery long-tail)
  if (state) {
    faqItems.push({
      q: `Where is ${subject} posted? Which state?`,
      a: `The recruitment is posted for ${state.name}.`,
    });
  }

  // Q11: Posts / positions available (when multiple)
  if (postRows.length > 1) {
    faqItems.push({
      q: `What are the available posts in ${subject}?`,
      a: `Available posts: ${postRows.map((r) => r.name).join(', ')}.`,
    });
  }

  // Q12: Application mode (online/offline)
  if (applicationMode) {
    faqItems.push({
      q: `What is the application mode for ${subject}?`,
      a: `Application mode: ${applicationMode}.`,
    });
  }

  // ── Explore pills ────────────────────────────────────────────────────────
  const explore: Pill[] = [];
  if (orgName && orgHref) explore.push({ label: `All ${orgName} jobs`, href: orgHref });
  if (state) explore.push({ label: `Jobs in ${state.name}`, href: state.href });
  const levels = unique(posts.flatMap((p) => (p.eligibilities ?? []).map((e) => str(e.educationLevel))));
  if (levels.length === 1) {
    const qSlug = EDUCATION_LEVEL_TO_QUALIFICATION_SLUG[levels[0].toUpperCase()];
    const q = qSlug ? getQualification(qSlug) : undefined;
    if (q) explore.push({ label: q.label, href: `/qualifications/${q.slug}` });
  }
  explore.push({ label: 'Jobs closing this week', href: '/closing-soon' });

  // ── Section list ─────────────────────────────────────────────────────────
  const sections: HubSectionId[] = ['overview'];
  if (hasTimeline) sections.push('dates');
  if (postRows.length > 0) sections.push('posts');
  if (educationTexts.length > 0 || physicalTexts.length > 0 || ageTexts.length > 0) sections.push('eligibility');
  if (payLines.length > 0) sections.push('pay');
  if (hasFee) sections.push('fee');
  if (selectionText || selectionRows.length > 0) sections.push('selection');
  if (howToApply.length > 0) sections.push('apply');
  if (links.length > 0) sections.push('links');
  sections.push('source');
  if (faqItems.length > 0) sections.push('faq');

  const description = composeRecruitmentDescription({
    orgName: orgName ?? composed.heading.replace(/ Recruitment.*$/, ''),
    totalVacancies,
    postNames,
    lastDate: closed ? null : appEnd,
    fee: feeSummary,
  });

  // ── Post age breakdown (from postAgeRules) ──────────────────────────────────
  const postAgeBreakdown = posts
    .filter((post) => post.ageRules && post.ageRules.length > 0)
    .map((post) => ({
      postId: post.id,
      categories: post.ageRules!.map((rule) => ({
        categoryName: str(rule.category) ?? 'Unknown',
        maxAge: Number.isFinite(rule.maxAge) ? rule.maxAge : null,
        ...(Number.isFinite(rule.relaxationYears) && { relaxation: rule.relaxationYears }),
        // Future: add relaxationPwbd when available in schema
      })),
    }));

  // Convert to plain JSON to remove Drizzle ORM metadata and all non-serializable properties
  // JSON.stringify automatically removes functions, undefined, symbols, etc.
  // Use a replacer to preserve Date objects as ISO strings
  const toPlainJSON = (value: unknown): unknown => {
    try {
      return JSON.parse(
        JSON.stringify(value, (key, val) => {
          // Convert Date objects to ISO strings so they survive JSON round-trip
          if (val instanceof Date) {
            return val.toISOString();
          }
          // Return everything else as-is; JSON.stringify naturally filters functions, undefined, etc.
          return val;
        })
      );
    } catch (error) {
      console.warn('Failed to serialize value to JSON:', error);
      return value;
    }
  };

  const sanitizedRecruitment = toPlainJSON(recruitment) as typeof recruitment;
  const sanitizedPosts = toPlainJSON(posts) as typeof posts;

  // Phase 3-5: Process posting locations and cutoff marks
  // Sanitize posting locations data to ensure it's serializable
  const sanitizedPostingLocationsData = toPlainJSON(postingLocationsData) as typeof postingLocationsData;
  const postingLocations = Array.from(
    new Set(
      sanitizedPostingLocationsData
        .map((loc) => loc.city)
        .filter((city): city is string => Boolean(city))
    )
  ).sort();

  // Sanitize cutoff marks data and process
  const sanitizedCutoffMarksData = toPlainJSON(cutoffMarksData) as typeof cutoffMarksData;
  const cutoffMarks = sanitizedCutoffMarksData
    .map((cm) => ({
      category: str(cm.category) || 'Unknown',
      marks: str(cm.cutoffMarks),
    }))
    .filter((cm) => cm.category !== 'Unknown');

  return {
    recruitment: sanitizedRecruitment,
    posts: sanitizedPosts,
    slug,
    heading: composed.heading,
    title: composed.title,
    description,
    orgName,
    orgHref,
    state,
    notificationNumber,
    sourceFactsUnverified,
    verified,
    lifecycleState,
    sourceStatusLabel,
    closed,
    daysLeft,
    updatedAtLabel,
    notificationDate,
    notificationDateLabel,
    appStart,
    appEnd,
    appEndLabel,
    appEndRaw,
    timeline,
    summary,
    applyUrl,
    notificationUrl,
    officialWebsiteUrl,
    whatsappUrl,
    noticeLine,
    totalVacancies,
    postNames,
    jobType,
    applicationMode,
    locationText,
    glance,
    postRows,
    anyVacancyUnverified,
    postAgeBreakdown: postAgeBreakdown.length > 0 ? postAgeBreakdown : undefined,
    educationTexts,
    physicalTexts,
    ageTexts,
    payLines,
    feeRows,
    feeSummary,
    feeNote: feeDisplayNote,
    selectionRows,
    selectionText,
    howToApply,
    sourceDocuments,
    links,
    verificationLine,
    discoverySourceUrl,
    faqItems,
    explore,
    postingLocations,
    cutoffMarks,
    sections,
  };
}

/**
 * Sanitize hub data for client component serialization.
 * Removes Drizzle ORM metadata and converts Date objects to ISO strings.
 * Exported for use in page.tsx when passing hub data to client components.
 */
export function toPlainJSON(value: unknown): unknown {
  try {
    return JSON.parse(
      JSON.stringify(value, (key, val) => {
        if (val instanceof Date) {
          return val.toISOString();
        }
        return val;
      })
    );
  } catch (error) {
    console.warn('Failed to serialize value to JSON:', error);
    return value;
  }
}

/** Status chip for the hero; null while lifecycle claims are suppressed and no reported status exists. */
export function lifecycleChip(data: HubData): { text: string; tone: 'open' | 'closed' | 'upcoming' | 'neutral' } | null {
  if (data.lifecycleState) {
    if (data.lifecycleState === 'upcoming') return { text: 'Upcoming', tone: 'upcoming' };
    if (data.lifecycleState === 'open') return { text: lifecycleLabel('open'), tone: 'open' };
    return { text: lifecycleLabel(data.lifecycleState), tone: 'closed' };
  }
  return data.sourceStatusLabel ? { text: `${data.sourceStatusLabel} (reported)`, tone: 'neutral' } : null;
}

// ---------------------------------------------------------------------------
// Main component (server)
// ---------------------------------------------------------------------------

export default function RecruitmentHub({ data }: RecruitmentHubProps) {
  const has = (id: HubSectionId) => data.sections.includes(id);
  const isSinglePost = data.postRows.length === 1;

  // Determine application status for HubKeyMetrics
  const applicationStatus: 'open' | 'closed' | 'extended' = data.closed ? 'closed' : 'open';

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <HubBreadcrumb data={data} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
          <article className={styles.article}>
            <HubHeader data={data} />
            <HubToc data={data} />

            {/* Key metrics at the top (critical info first) */}
            {data.postRows.length > 0 && (
              <HubKeyMetrics
                applicationDeadline={data.appEnd}
                daysUntilDeadline={data.daysLeft}
                postsCount={data.postRows.length}
                vacanciesCount={data.totalVacancies}
                examDate={data.recruitment?.examDate ? formatDate(data.recruitment.examDate) : undefined}
                applicationStatus={applicationStatus}
              />
            )}

            <HubDetails data={data} />
            {has('dates') && <HubDates data={data} />}

          {/* Posts section - consolidated expandable table */}
          {has('posts') && data.postRows.length > 0 && (
            <section id="posts" aria-labelledby="posts-heading" className={styles.card}>
              <h2 id="posts-heading" className={styles.sectionTitle}>
                Posts &amp; vacancies <span className={styles.count}>({data.postRows.length})</span>
              </h2>

              <HubPostsExpandable postRows={data.postRows} posts={data.posts} />

              <p style={{ fontSize: 12, color: 'var(--hub-ink3)', marginTop: 12, marginBottom: 0 }}>
                💡 Click the expand icon or post name to view full eligibility criteria, vacancy breakdown by category (UR/OBC/SC/ST/EWS/PwBD), and age limits.
              </p>

              {data.anyVacancyUnverified && (
                <p className={styles.note} style={{ marginTop: 12 }}>
                  * Vacancy count reported by the source listing, not yet confirmed against the official notification.
                </p>
              )}
            </section>
          )}

          <HubPostingLocations data={data} />
          <HubJobDescriptions posts={data.posts} />
          <HubCutoffMarks data={data} />

          {has('eligibility') && <HubEligibility data={data} />}
          {(has('pay') || has('fee')) && <HubPayFee data={data} />}
          {has('selection') && <HubSelection data={data} />}
          {has('apply') && <HubApply data={data} />}
          {data.sourceDocuments.length > 0 && (
            <HubDocuments documents={data.sourceDocuments} storageKey={`hub-docs-${data.slug}`} />
          )}
          {has('links') && <HubLinks data={data} />}
          <HubSource data={data} />
          {has('faq') && <HubFaqEnhanced items={data.faqItems} />}
          <HubExplore data={data} />
          </article>

          {/* Sidebar */}
          <RelatedOpportunities data={data} />
        </div>
      </div>
    </div>
  );
}
