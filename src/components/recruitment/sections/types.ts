/**
 * Shared types for recruitment hub section components.
 * All sections receive a HubData object built once by the orchestrator
 * (recruitment-hub.tsx). Every field is a display-ready value or null; a
 * section renders only what is non-null and never substitutes a default.
 */

import type { recruitments, posts, positions } from '@/db/schema';
import type { LifecycleState } from '@/lib/lifecycle';

export type EligibilityRow = {
  id?: number;
  postId?: number;
  qualificationText?: string | null;
  experienceText?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  educationLevel?: string | null;
  physicalRequirements?: string | null;
  qualification_record?: unknown;
  [key: string]: unknown;
};

export type RecruitmentHubRecruitment = typeof recruitments.$inferSelect & {
  organizationName?: string | null;
  organizationSlug?: string | null;
  /** Raw organizations row loaded by the hub query (snake_case columns). */
  organization?: { website_url?: string | null; websiteUrl?: string | null } | null;
  exam?: { name?: string | null; title?: string | null } | null;
  recruitmentFees?: unknown;
  feeGeneral?: number | string | null;
  feeReserved?: number | string | null;
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

export type RecruitmentHubPost = typeof posts.$inferSelect & {
  position?: typeof positions.$inferSelect | null;
  resolvedVacancyCount?: number | null;
  employmentType?: string | null;
  eligibilities?: EligibilityRow[];
  vacancies?: unknown[];
  ageRules?: Array<{
    postId: number;
    category: string;
    maxAge: number | null;
    relaxationYears: number | null;
    note: string | null;
    ruleType: string | null;
    conditionText: string | null;
  }>;
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

export interface PostTableRow {
  id: number | string;
  name: string;
  /** Leaf page path (/jobs/{recruitment}/{post}); null when the post has no slug. */
  href: string | null;
  vacanciesLabel: string | null;
  vacanciesUnverified: boolean;
  qualification: string | null;
  experience: string | null;
  pay: string | null;
  /** Category-wise vacancy breakdown (SC/ST/OBC/EWS/General/PwBD). */
  vacancyBreakdown?: {
    categoryName: string;
    count: number;
  }[];
  /** Category-wise age limits and relaxations. */
  ageBreakdown?: {
    categoryName: string;
    maxAge: number | null;
    relaxation?: number | null;
  }[];
}

export interface SelectionRow {
  title: string | null;
  detail: string | null;
}

export interface FeeRow {
  category: string;
  amount: string;
}

export interface GlanceRow {
  label: string;
  /** Display text; null means "Not stated in this notification". */
  value: string | null;
  href?: string | null;
  /** Optional verification note: "from notification", "not yet verified", "verified", etc. */
  verificationNote?: string | null;
}

export interface TimelineStep {
  id: 'notified' | 'open' | 'close' | 'exam' | 'result' | 'interview';
  label: string;
  /** Formatted date or null (not announced). */
  date: string | null;
  iso: string | null;
  note?: string;
  state: 'past' | 'current' | 'future' | 'unknown';
}

export interface LinkRow {
  label: string;
  href: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Pill {
  label: string;
  href: string;
}

export type HubSectionId =
  | 'overview' | 'posts' | 'eligibility' | 'pay' | 'fee' | 'dates'
  | 'selection' | 'apply' | 'links' | 'source' | 'faq';

export interface HubData {
  recruitment: RecruitmentHubRecruitment;
  posts: RecruitmentHubPost[];

  // Identity
  slug: string;
  heading: string;
  /** Full <title> text including the "Apply by" suffix. */
  title: string;
  description: string;
  orgName: string | null;
  orgHref: string | null;
  state: { name: string; slug: string; href: string } | null;
  notificationNumber: string | null;

  // Verification + status
  sourceFactsUnverified: boolean;
  verified: boolean;
  lifecycleState: LifecycleState | null;
  /** Reported status from the source listing (shown only while lifecycle is suppressed). */
  sourceStatusLabel: string | null;
  closed: boolean;
  daysLeft: number | null;
  updatedAtLabel: string | null;

  // Dates (display)
  notificationDate: string | null;
  notificationDateLabel: string;
  appStart: string | null;
  appEnd: string | null;
  appEndLabel: string;
  appEndRaw: Date | string | null;
  timeline: TimelineStep[];

  // Hero
  summary: string | null;
  applyUrl: string | null;
  notificationUrl: string | null;
  officialWebsiteUrl: string | null;
  whatsappUrl: string;
  noticeLine: string | null;

  // Facts
  totalVacancies: number | null;
  postNames: string[];
  jobType: string | null;
  applicationMode: string | null;
  locationText: string | null;
  glance: GlanceRow[];

  // Posts
  postRows: PostTableRow[];
  anyVacancyUnverified: boolean;
  /** Per-post age rules by category (from postAgeRules table). */
  postAgeBreakdown?: {
    postId: number;
    categories: {
      categoryName: string;
      maxAge: number | null;
      relaxation?: number | null;
      relaxationPwbd?: number | null;
    }[];
  }[];

  // Eligibility
  educationTexts: string[];
  physicalTexts: string[];
  ageTexts: string[];

  // Pay & fee
  payLines: { label: string | null; value: string; verified?: boolean }[];
  feeRows: FeeRow[];
  feeSummary: string | null;
  feeNote: string | null;

  // Selection + apply
  selectionRows: SelectionRow[];
  selectionText: string | null;
  howToApply: string[];
  sourceDocuments: string[];

  // Links + source
  links: LinkRow[];
  verificationLine: string;
  discoverySourceUrl: string | null;

  // FAQ + explore
  faqItems: FaqItem[];
  explore: Pill[];

  // Phase 3-5 features
  postingLocations: string[]; // ["Delhi", "Mumbai", "Bangalore"]
  cutoffMarks: Array<{
    category: string; // "UR", "OBC", "SC", "ST", "EWS"
    marks: string | null;
  }>;

  /** Sections that will render, in page order. */
  sections: HubSectionId[];
}
